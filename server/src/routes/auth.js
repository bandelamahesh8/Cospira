import express from 'express';
import crypto from 'crypto';
import OTPService from '../services/OTPService.js';
import { supabase } from '../supabase.js';
import logger from '../logger.js';
import { z } from 'zod';

const router = express.Router();

const otpRequestSchema = z.object({
    email: z.string().email(),
    purpose: z.enum(['forgot_login', 'change_password'])
});

const otpVerifySchema = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
    purpose: z.enum(['forgot_login', 'change_password'])
});

const resetPasswordSchema = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
    newPassword: z.string().min(6)
});

const changePasswordSchema = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(6)
});

// Middleware to check if user is authenticated (for change_password via profile)
// But wait, the standard change password options are:
// 1. Current + New (Requires Auth)
// 2. Forgot (OTP) -> No Auth Required initially, or Auth if focused on email ownership
// The requirement for "Profile -> Forgot Password" via OTP implies the user IS logged in 
// but wants to reset via email? Or maybe they forgot the current password?
// Yes, "Forgot Password" from Profile means they are logged in but can't type current password.
// They want to verify it's them via Email OTP.

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, username } = req.body;
        
        if (!supabase) {
            return res.status(503).json({ error: 'Auth service unavailable' });
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username }
            }
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Auto-login (if email confirmation not required)
        if (data.session) {
             return res.json({ 
                 token: data.session.access_token,
                 user: {
                     id: data.user.id,
                     email: data.user.email,
                     username: data.user.user_metadata?.username
                 },
                 refreshToken: data.session.refresh_token
             });
        }

        res.json({ success: true, message: 'Registration successful. Please check your email.' });

    } catch (error) {
        logger.error('Registration Error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

/**
 * POST /api/auth/login
 */
// Rate Limiting Logic
// Using in-memory store for simplicity as requested. Consider Redis for production.
const loginAttempts = new Map(); // Key: email/ip -> { count, lockoutUntil, level }
const BACKOFF_MINUTES = [1, 3, 5, 10, 15, 30];

const checkRateLimit = (key) => {
    const entry = loginAttempts.get(key);
    if (!entry) return null;

    if (Date.now() < entry.lockoutUntil) {
        const remaining = Math.ceil((entry.lockoutUntil - Date.now()) / 60000);
        return `Too many failed attempts. Please try again in ${remaining} minute${remaining > 1 ? 's' : ''}.`;
    }

    if (Date.now() > entry.lockoutUntil && entry.lockoutUntil !== 0) {
        // Lockout expired, but we don't fully reset yet, just allow retry.
        // If they fail again, we escalate.
        // Logic handled in recordFail
    }
    return null;
};

const recordFail = (key) => {
    const entry = loginAttempts.get(key) || { count: 0, lockoutUntil: 0, level: 0 };
    
    // If we passed the lockout time significantly (e.g. success or long wait), maybe reset?
    // For now, strict escalation as requested.
    
    entry.count += 1;

    // Check if we hit the limit of 3 attempts for the current level
    if (entry.count >= 3) {
        const minutes = BACKOFF_MINUTES[entry.level] || 30;
        entry.lockoutUntil = Date.now() + (minutes * 60 * 1000);
        
        // Prepare for next level if they fail again after this lockout
        if (entry.level < BACKOFF_MINUTES.length - 1) {
            entry.level += 1;
        }
        
        entry.count = 0; // Reset count for the next cycle (after lockout)
        loginAttempts.set(key, entry);
        return `Too many failed attempts. Locked for ${minutes} minute${minutes > 1 ? 's' : ''}.`;
    } else {
        loginAttempts.set(key, entry);
        return null; // Just a fail, no lockout yet
    }
};

const clearFail = (key) => {
    loginAttempts.delete(key);
};

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
    try {
        let { email, password } = req.body;
        // Use a consistent key for rate limiting (Email or IP)
        // Here we use email (or username input) as the primary key.
        const rateLimitKey = (email || 'unknown').toLowerCase();
        
        // 1. Check Rate Limit
        const lockoutMsg = checkRateLimit(rateLimitKey);
        if (lockoutMsg) {
            return res.status(429).json({ error: lockoutMsg });
        }

        if (!supabase) {
            return res.status(503).json({ error: 'Auth service unavailable' });
        }

        // 2. Validate User Existence (Specific Error Message)
        let resolvedEmail = email;
        let isUsername = false;

        if (email && !email.includes('@')) {
            isUsername = true;
            // Username Login Logic
            // Ensure case-insensitive match (usernames are stored lowercase)
            const usernameInput = email.toLowerCase();
            
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', usernameInput)
                .maybeSingle();

            if (profile) {
                // Happy path: Profile found, get email from ID
                const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
                if (userData?.user) {
                    resolvedEmail = userData.user.email;
                } else {
                     return res.status(404).json({ error: 'Account not found' });
                }
            } else {
                // Fallback: Search in auth.users metadata (for legacy/desynced users)
                const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
                if (listError || !users) {
                     return res.status(404).json({ error: 'Username not found' });
                }

                const userMatch = users.find(u => 
                    u.user_metadata?.username?.toLowerCase() === usernameInput
                );

                if (userMatch) {
                    resolvedEmail = userMatch.email;
                    // Optional: repair profile here? Skipping for now to keep login fast.
                } else {
                    return res.status(404).json({ error: 'Username not found' });
                }
            }
        } else {
             // Email Login Check - Check if email exists in profiles/users
             // Note: profiles table might not have email, so we skip direct DB check if not reliable.
             // But we can infer validation failure later. OR check admin API if allowed.
             // IMPORTANT: To give "Email not registered" safely, we assume we want this UX over strict security.
             // We can use listUsers with filter? Or getUserById if we had ID.
             // `signInWithPassword` returns "Invalid login credentials" for both.
             
             // Trick: Try to see if we can find a profile with this email? 
             // Unreliable if profiles doesn't sync email.
             // Let's rely on the Supabase error behavior or assume standard 'Invalid credentials'
             // implies one of them.
             
             // However, user EXPLICITLY requested "Email is registered signup".
             // We can try to use Admin API to peek.
        }

        // 3. Attempt Login
        const { data, error } = await supabase.auth.signInWithPassword({
            email: resolvedEmail,
            password
        });

        if (error) {
            // Handle Failure
            const limitMsg = recordFail(rateLimitKey);
            let finalError = 'Incorrect password';
            let status = 401;

            // Diagnosis: Distinguished "Wrong Password" vs "User Not Found"
            if (!isUsername && error.message === 'Invalid login credentials') {
                 // Fetch list of users to see if this email actually exists
                 // Note: Ideally, use a search enabled admin function or database check if scaling.
                 const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
                 
                 if (!listError && users) {
                     const userExists = users.find(u => u.email === resolvedEmail);
                     if (!userExists) {
                         finalError = 'Your email is not registered. Please sign up.'; // Exact wording requested
                         status = 404;
                     }
                 }
            } else if (isUsername && error.message === 'Invalid login credentials') {
                 // We already checked profile existence, so if we are here, it's definitely the password
                 // finalError remains 'Incorrect password'
            }

            // Return Error with Attempts info
            const attempts = loginAttempts.get(rateLimitKey)?.count || 0;
            const attemptsLeft = 3 - attempts;
            
            if (limitMsg) {
                return res.status(429).json({ error: limitMsg });
            }
            
            // Don't show attempts count if user not found (security/usability balance)
            if (status === 404) {
                 return res.status(status).json({ error: finalError });
            }

            return res.status(status).json({ 
                error: `${finalError}. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.` 
            });
        }

        // 4. Success
        clearFail(rateLimitKey);

        // Fetch profile to get avatar
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

        // Prioritize Metadata (New) over Profile Table (Potentially Stale)
        const avatar = data.user.user_metadata?.avatar_url || profile?.avatar_url;

        res.json({
            token: data.session.access_token,
            user: {
                id: data.user.id,
                email: data.user.email,
                username: data.user.user_metadata?.username || profile?.username,
                profileImage: avatar 
            },
            refreshToken: data.session.refresh_token
        });
    } catch (error) {
        logger.error('Login Error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

        const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
        
        if (error || !data.session) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        res.json({
            token: data.session.access_token,
            refreshToken: data.session.refresh_token,
            user: {
                id: data.user.id,
                email: data.user.email,
                username: data.user.user_metadata?.username
            }
        });

    } catch (error) {
        logger.error('Refresh Token Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/auth/me
 * Protected Route
 */
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
        
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            // Explicitly return 'Invalid session' so client knows to logout
            return res.status(401).json({ error: 'Invalid session' });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        // Prioritize Metadata
        const avatar = user.user_metadata?.avatar_url || profile?.avatar_url;
        const username = user.user_metadata?.username || profile?.username;

        res.json({
            user: {
                id: user.id,
                email: user.email,
                username: username,
                handle: profile?.handle || username,
                profileImage: avatar,
                avatar: avatar
            }
        });

    } catch (error) {
        logger.error('Profile Fetch Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/auth/me
 */
router.patch('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
        
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid session' });
        }

        const { name, profileImage, username } = req.body;
        
        // Pre-validate Username Uniqueness (prevent partial updates)
        if (username) {
            const { data: existing } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', username)
                .neq('id', user.id)
                .maybeSingle();
            
            if (existing) {
                return res.status(409).json({ error: 'Username already taken' });
            }
        }

        const updates = {};
        if (name) updates.name = name; 
        if (profileImage) updates.avatar_url = profileImage;
        if (username) updates.username = username;
        
        const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
            data: updates
        });

        if (updateError) throw updateError;

        try {
            const profileUpdates = {};
            if (name) profileUpdates.full_name = name;
            if (profileImage) profileUpdates.avatar_url = profileImage;
            if (username) profileUpdates.username = username;
            
            if (Object.keys(profileUpdates).length > 0) {
                await supabase.from('profiles').update(profileUpdates).eq('id', user.id);
            }
        } catch (syncError) {
            logger.warn('Failed to sync profile update to table:', syncError);
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: updates.name || user.user_metadata?.name,
                avatar: updates.avatar_url || user.user_metadata?.avatar_url,
                profileImage: updates.avatar_url || user.user_metadata?.avatar_url, // Explicit return
                username: updates.username || user.user_metadata?.username,
                ...updates
            }
        });

    } catch (error) {
        logger.error('Profile Update Error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

/**
 * GET /api/auth/check-username
 */
const SAFE_USERNAME_MAX = 50;
const usernameRegex = /^[a-zA-Z0-9_.-]+$/;

router.get('/check-username', async (req, res) => {
    try {
        const raw = req.query.username;
        const username = typeof raw === 'string' ? raw.trim().slice(0, SAFE_USERNAME_MAX) : '';
        if (!username || !usernameRegex.test(username)) return res.status(400).json({ error: 'Username required' });

        if (!supabase) {
            return res.status(503).json({ error: 'Auth service unavailable' });
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .maybeSingle();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({ available: !data });

    } catch (error) {
        logger.error('Username Check Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


/**
 * POST /api/auth/otp/request
 * Body: { email, purpose }
 */
router.post('/otp/request', async (req, res) => {
    try {
        const { email, purpose } = otpRequestSchema.parse(req.body);
        await OTPService.requestOTP(email, purpose);
        res.json({ success: true, message: 'OTP sent if account exists' });
    } catch (error) {
        if (error instanceof z.ZodError) {
             return res.status(400).json({ error: error.errors });
        }
        logger.error('Full OTP Request details:', error);
        // Generic error to prevent enumeration/leaks if internal
        res.status(500).json({ error: 'Failed to process request' });
    }
});

/**
 * POST /api/auth/otp/verify
 * Body: { email, otp, purpose }
 * Returns: { success: true, token: 'temporary-reset-token' } OR just success if we trust client?
 * SECURITY: If we just return success: true, a malicious client could skip this step and call reset directly?
 * We should probably verify inside the reset endpoint OR issue a signed token.
 * For simplicity in this stack, we will verify OTP *AGAIN* in the reset endpoint 
 * OR -- actually, OTPService deletes it on success. 
 * So:
 * 1. Verify Endpoint: Just checks if it's valid without consuming it? 
 *    NO, OTP should be one-time use.
 *    
 * BETTER FLOW:
 * 1. /otp/request -> Sends Email
 * 2. /password/reset -> Takes (email, otp, newPassword). Verifies OTP, consumes it, updates password.
 * 
 * So /otp/verify is optional? Maybe just for UI "Green Checkmark"?
 * If /otp/verify consumes it, then /password/reset fails.
 * 
 * Strategy:
 * - /otp/verify -> Checks if valid WITHOUT consuming (peek). 
 *   Wait, `verifyOTP` in Service consumes it.
 *   Let's modify Service or just rely on /password/reset.
 *   
 *   Requirement says: "check otp if it matches , user can enter password".
 *   Implies UI step: Enter OTP -> Success -> Show Password Input.
 *   
 *   So we need a way to say "OTP is correct" without destroying it yet.
 *   OR we issue a short-lived JWT on verify that allows password reset.
 */

// Let's implement /otp/verify as a "Dry Run" or "Exchange".
// Realistically, to be stateless and secure:
// Client sends OTP + Email. Server verifies, if correct -> returns a signed JWT "reset_token".
// Client sends "reset_token" + NewPassword to /password/reset.
// This is robust.

import jwt from 'jsonwebtoken';
const RESET_SECRET = process.env.JWT_SECRET || process.env.RESET_TOKEN_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_SECRET or RESET_TOKEN_SECRET required in production'); })() : 'temp-reset-secret');

router.post('/otp/verify', async (req, res) => {
    try {
        const { email, otp, purpose } = otpVerifySchema.parse(req.body);
        
        // Use a specialized verify that DOES consume.
        // Return a token that authorizes the next step.
        const result = await OTPService.verifyOTP(email, otp, purpose);
        
        if (!result.valid) {
            return res.status(400).json({ error: result.reason });
        }

        // Generate a short-lived token for the reset action
        const resetToken = jwt.sign(
            { sub: result.userId, purpose, email }, 
            RESET_SECRET, 
            { expiresIn: '15m' }
        );

        res.json({ success: true, resetToken });
    } catch (error) {
        if (error instanceof z.ZodError) {
             return res.status(400).json({ error: error.errors });
        }
        logger.error('OTP Verify Error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

/**
 * POST /api/auth/password/reset
 * Body: { resetToken, newPassword }
 * For "Forgot Login" OR "Profile -> Forgot (OTP)"
 */
router.post('/password/reset', async (req, res) => {
    try {
        // Validate Inputs
        const { resetToken, newPassword } = req.body;
        if (!resetToken || !newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'Invalid input' });
        }

        // Verify Token
        let decoded;
        try {
            decoded = jwt.verify(resetToken, RESET_SECRET);
        } catch (e) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const { sub: userId } = decoded;

        // Update Password in Supabase
        const { error } = await supabase.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        );

        if (error) {
            logger.error('Supabase Password Update Error:', error);
            return res.status(500).json({ error: 'Failed to update password' });
        }

        res.json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        logger.error('Reset Password Error:', error);
        res.status(500).json({ error: 'Internal Error' });
    }
});

/**
 * POST /api/auth/password/change
 * Body: { currentPassword, newPassword }
 * Protected Route (Headers: Authorization 'Bearer ...')
 * Implementing manual check here or relying on Supabase client?
 * Since we are in the backend proxy, we should verify the user's session from the request.
 * 
 * The client usually sends the session token.
 * We can pass that token to Supabase client to act as the user?
 * Or we can use `signInWithPassword` to verify Current, then Admin Update.
 */
router.post('/password/change', async (req, res) => {
    try {
        const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
        
        // We need to know WHICH user is asking.
        // We can get user from the Bearer token in header.
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
        
        const token = authHeader.replace('Bearer ', '');
        
        // Get User from Token
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (userError || !user) {
            return res.status(401).json({ error: 'Invalid session' });
        }

        // Verify Current Password
        // Supabase doesn't have a "verifyPassword" function directly exposed easily?
        // We simulate a sign-in.
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: currentPassword
        });

        if (signInError) {
             return res.status(400).json({ error: 'Current password incorrect' });
        }

        // Update to New Password
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { password: newPassword }
        );
        
        if (updateError) {
             return res.status(500).json({ error: 'Failed to set new password' });
        }

        res.json({ success: true });

    } catch (error) {
        if (error instanceof z.ZodError) {
             return res.status(400).json({ error: error.errors });
        }
        logger.error('Change Password Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * POST /api/auth/email/change
 * Body: { newEmail }
 * Protected Route
 */
router.post('/email/change', async (req, res) => {
    try {
        const { newEmail } = req.body;
        if (!newEmail) return res.status(400).json({ error: 'New email required' });

        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
        
        const token = authHeader.replace('Bearer ', '');
        const sanitizedEmail = newEmail.trim().toLowerCase();
        
        // 1. Verify the requester's session
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            return res.status(401).json({ error: 'Invalid session' });
        }

        if (sanitizedEmail === user.email.toLowerCase()) {
            return res.status(400).json({ error: 'New email must be different from current email' });
        }

        // 2. Generate a secure change token (6 digits to fit potential VARCHAR(6) constraints)
        const changeToken = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

        // 3. Store the pending change in our OTP table (reusing it for email changes)
        // Clean up any old pending email changes for this user/email first to avoid constraint errors
        await supabase
            .from('password_otp')
            .delete()
            .eq('user_id', user.id)
            .eq('purpose', 'email_change');

        // We use 'otp' column to store the longer hex token for link flow
        const { error: insertError } = await supabase
            .from('password_otp')
            .insert({
                user_id: user.id,
                email: sanitizedEmail, // Target email
                otp: changeToken,
                purpose: 'email_change',
                expires_at: expiresAt.toISOString(),
                attempts: 0
            });

        if (insertError) {
            console.error('FULL INSERT ERROR:', JSON.stringify(insertError, null, 2));
            logger.error('Failed to store email change token:', insertError);
            return res.status(500).json({ error: 'Database synchronization failed', details: insertError });
        }

        // 4. Send the verification email via OUR reliable SMTP (MailService)
        const confirmLink = `${process.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/email/confirm?token=${changeToken}`;
        
        const MailService = (await import('../services/MailService.js')).default;
        const result = await MailService.sendEmail(
            sanitizedEmail,
            'Confirm Your New Cospira Email',
            `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <h2 style="color: #6366f1;">Email Update Request</h2>
                <p>Hello,</p>
                <p>We received a request to change your Cospira account email to this address. Please click the button below to confirm the change:</p>
                <div style="margin: 30px 0;">
                    <a href="${confirmLink}" style="padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Confirm Email Change</a>
                </div>
                <p style="font-size: 14px; color: #64748b;">This link will expire in 15 minutes.</p>
                <p style="font-size: 14px; color: #64748b;">If you did not request this change, please ignore this email.</p>
            </div>
            `
        );

        if (!result.success) {
            // Clean up the token if email fails
            await supabase.from('password_otp').delete().eq('otp', changeToken);
            return res.status(500).json({ error: 'Failed to send verification email: ' + result.error });
        }

        res.json({ success: true, message: 'Verification links sent' });

    } catch (error) {
        logger.error('Email Change Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * GET /api/auth/email/confirm
 * Query: { token }
 * Public Route (Link clicked from email)
 */
router.get('/email/confirm', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).send('Invalid confirmation link.');

        // 1. Verify token
        const { data: record, error: findError } = await supabase
            .from('password_otp')
            .select('*')
            .eq('otp', token)
            .eq('purpose', 'email_change')
            .single();

        if (findError || !record) {
            return res.status(400).send('Invalid or expired confirmation link.');
        }

        if (new Date(record.expires_at) < new Date()) {
            await supabase.from('password_otp').delete().eq('id', record.id);
            return res.status(400).send('This confirmation link has expired.');
        }

        // 2. Finalize change using Admin API (Bypassing SMTP issues)
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            record.user_id,
            { email: record.email, email_confirm: true }
        );

        if (updateError) {
            logger.error('Admin Email Update Failed:', updateError);
            return res.status(500).send('Could not update email at this time.');
        }

        // 3. Cleanup
        await supabase.from('password_otp').delete().eq('id', record.id);

        // 4. Return Success Page
        res.send(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px; color: #1e293b;">
                <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
                <h1 style="color: #6366f1;">Email Confirmed!</h1>
                <p>Your email address has been successfully updated.</p>
                <p>You can now return to the Cospira app.</p>
            </div>
        `);

    } catch (error) {
        logger.error('Confirm Email Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

export default router;

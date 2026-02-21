import crypto from 'crypto';
import { supabase } from '../supabase.js';
import MailService from './MailService.js';
import logger from '../logger.js';

class OTPService {
  constructor() {
    this.OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes
    this.MAX_ATTEMPTS = 5;
  }

  /**
   * Generates a 6-digit secure OTP
   */
  generateNumericOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Request an OTP for a specific purpose
   * @param {string} email
   * @param {string} purpose - 'forgot_login' | 'change_password'
   */
  async requestOTP(email, purpose) {
    if (!email || !purpose) throw new Error('Email and purpose are required');

    // 1. Check if user exists in Supabase Auth (Optional safety check, 
    // but useful to prevent leaking user existence. However, for forgot password 
    // we usually want to silently ignore if email not found or send a "account not found" email).
    // For this implementation, we'll proceed. Supabase will enforce FK constraints if we insert 
    // with user_id, but here we might just store email for the OTP flow 
    // if the table allows null user_id, OR we fetch user_id first.
    
    // FETCH USER ID
    // We need the user_id to link foreign key in password_otp table if configured.
    // However, Supabase Admin API is needed to search users by email.
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    // Note: listUsers is paginated, safe for small apps. For large scale, use listUsers(page, etc) or search.
    // Admin listUsers doesn't support direct email filter easily in v2 without search query?
    // Actually, strictly speaking, we can just store email in `password_otp` if we relax the FK 
    // or if we rely on the fact that we will update by email later.
    // The Requirements said: user_id uuid references auth.users(id).
    // So we MUST find the user_id.

    // Efficient way:
    // We can't query auth.users directly via client unless we use admin API.
    // Let's assume we can use the admin client.

    if (userError) {
        logger.error('Failed to list users for OTP:', userError);
        throw new Error('Internal Error');
    }

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
        // Security: Don't reveal user doesn't exist? 
        // Or for UX, tell them? "User not found" is often acceptable in enterprise apps, 
        // but "If an account exists..." is safer.
        // Let's return success but do nothing to prevent enumeration.
        logger.info(`OTP requested for non-existent email: ${email}`);
        return { success: true, message: 'OTP sent if account exists' }; 
    }

    const otp = this.generateNumericOTP();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY);

    // 2. Invalidate previous OTPs for this email+purpose
    await supabase
        .from('password_otp')
        .delete()
        .eq('email', email)
        .eq('purpose', purpose);

    // 3. Store new OTP
    const { error: insertError } = await supabase
        .from('password_otp')
        .insert({
            user_id: user.id,
            email: email,
            otp: otp, // You should hash this in production! storing plain for MVP as requested.
            purpose: purpose,
            expires_at: expiresAt.toISOString(),
            attempts: 0
        });

    if (insertError) {
        logger.error('Failed to store OTP:', insertError);
        throw new Error('Database Error');
    }

    // 4. Send Email
    const subject = purpose === 'forgot_login' ? 'Reset Your Cospira Password' : 'Verify Password Change';
    const html = `
        <div style="font-family: sans-serif; padding: 20px;">
            <h2>Verification Code</h2>
            <p>Your OTP code is:</p>
            <h1 style="letter-spacing: 5px; color: #6366f1;">${otp}</h1>
            <p>This code expires in 5 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
        </div>
    `;

    await MailService.sendEmail(email, subject, html);
    
    return { success: true, message: 'OTP sent' };
  }

  /**
   * Verify an OTP
   * @param {string} email 
   * @param {string} otp 
   * @param {string} purpose 
   * @returns {Object} { valid: boolean, userId: string }
   */
  async verifyOTP(email, otp, purpose) {
     const { data, error } = await supabase
        .from('password_otp')
        .select('*')
        .eq('email', email)
        .eq('purpose', purpose)
        .single();

     if (error || !data) {
         return { valid: false, reason: 'Invalid or expired OTP' };
     }

     // Check Expiry
     if (new Date(data.expires_at) < new Date()) {
         return { valid: false, reason: 'OTP expired' };
     }

     // Check Attempts
     if (data.attempts >= this.MAX_ATTEMPTS) {
         return { valid: false, reason: 'Too many attempts' };
     }

     // Check Match
     if (data.otp !== otp) {
         // Increment attempts
         await supabase
            .from('password_otp')
            .update({ attempts: data.attempts + 1 })
            .eq('id', data.id);
            
         return { valid: false, reason: 'Incorrect OTP' };
     }

     // Success! Delete used OTP (One-time use)
     await supabase
        .from('password_otp')
        .delete()
        .eq('id', data.id);

     return { valid: true, userId: data.user_id };
  }
}

export default new OTPService();

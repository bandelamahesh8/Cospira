import express from 'express';
import { z } from 'zod';
import logger from '../logger.js';
import { supabase } from '../supabase.js';

const router = express.Router();

const uuidLike = z.string().min(1).max(128).regex(/^[a-f0-9-]{36}$|^[a-zA-Z0-9_-]+$/);
const friendRequestSchema = z.object({ targetUserId: uuidLike, message: z.string().max(500).optional() });
const requestIdSchema = z.object({ requestId: uuidLike });
const friendIdSchema = z.object({ friendId: uuidLike });

// Helper: get authenticated Supabase user from Bearer token
const getAuthUser = async (req, res) => {
    try {
        if (!supabase) {
            if (!res.headersSent) {
                res.status(503).json({ error: 'Friends service unavailable' });
            }
            return null;
        }

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            if (!res.headersSent) {
                res.status(401).json({ error: 'Unauthorized' });
            }
            return null;
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            if (!res.headersSent) {
                res.status(401).json({ error: 'Invalid session' });
            }
            return null;
        }

        return user;
    } catch (err) {
        logger.error('[FriendsAuth] Error:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Auth Error' });
        }
        return null;
    }
};

/**
 * GET /api/friends
 * Get current user's friends list
 */
router.get('/', async (req, res) => {
    try {
        const user = await getAuthUser(req, res);
        if (!user) return;

        const { data: friendRows, error: friendsError } = await supabase
            .from('friends')
            .select('friend_id')
            .eq('user_id', user.id);

        if (friendsError) {
            logger.error('[FriendsAPI] Failed to fetch friends:', friendsError.message);
            return res.status(500).json({ error: 'Failed to fetch friends' });
        }

        const friendIds = (friendRows || []).map((row) => row.friend_id);
        if (friendIds.length === 0) {
            return res.json({ friends: [] });
        }

        // Fetch basic profile info
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', friendIds);

        if (profileError) {
            logger.error('[FriendsAPI] Failed to fetch friend profiles:', profileError.message);
            return res.status(500).json({ error: 'Failed to fetch friends' });
        }

        // Presence integration can be added by reading Redis presence keys
        const friends = (profiles || []).map((p) => ({
            id: p.id,
            name: p.username,
            avatar: p.avatar_url,
            online: false,
            lastSeen: null
        }));

        res.json({ friends });
    } catch (error) {
        logger.error('[FriendsAPI] GET /api/friends error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/friends/requests
 * Get incoming friend requests for current user
 */
router.get('/requests', async (req, res) => {
    try {
        const user = await getAuthUser(req, res);
        if (!user) return;

        const { data: rows, error } = await supabase
            .from('friend_requests')
            .select('id, from_user_id, message, created_at, status')
            .eq('to_user_id', user.id)
            .eq('status', 'pending');

        if (error) {
            logger.error('[FriendsAPI] Failed to fetch friend requests:', error.message);
            return res.status(500).json({ error: 'Failed to fetch friend requests' });
        }

        // Optionally enrich with sender profile
        const senderIds = Array.from(new Set((rows || []).map((r) => r.from_user_id)));
        let profilesById = {};
        if (senderIds.length > 0) {
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .in('id', senderIds);

            if (!profileError && profiles) {
                profilesById = profiles.reduce((acc, p) => {
                    acc[p.id] = p;
                    return acc;
                }, {});
            }
        }

        const requests = (rows || []).map((r) => {
            const sender = profilesById[r.from_user_id];
            return {
                id: r.id,
                sender: sender
                    ? { id: sender.id, name: sender.username, avatar: sender.avatar_url }
                    : { id: r.from_user_id },
                message: r.message || null,
                createdAt: r.created_at
            };
        });

        res.json({ requests });
    } catch (error) {
        logger.error('[FriendsAPI] GET /api/friends/requests error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/friends/request
 * Body: { targetUserId, message? }
 */
router.post('/request', async (req, res) => {
    try {
        const user = await getAuthUser(req, res);
        if (!user) return;

        const parsed = friendRequestSchema.safeParse(req.body || {});
        if (!parsed.success) {
            return res.status(400).json({ error: 'targetUserId is required and must be valid' });
        }
        const { targetUserId, message } = parsed.data;

        if (targetUserId === user.id) {
            return res.status(400).json({ error: 'Cannot add yourself as a friend' });
        }

        // Check if already friends
        const { data: existingFriends, error: friendsError } = await supabase
            .from('friends')
            .select('user_id')
            .eq('user_id', user.id)
            .eq('friend_id', targetUserId)
            .limit(1);

        if (friendsError) {
            logger.error('[FriendsAPI] Failed to check existing friendship:', friendsError.message);
        } else if (existingFriends && existingFriends.length > 0) {
            return res.status(409).json({ error: 'Already friends' });
        }

        // Upsert pending request
        const { data, error } = await supabase
            .from('friend_requests')
            .insert({
                from_user_id: user.id,
                to_user_id: targetUserId,
                status: 'pending',
                message: message || null
            })
            .select()
            .single();

        if (error) {
            // Unique constraint will surface as error, handle gracefully
            logger.error('[FriendsAPI] Failed to create friend request:', error.message);
            return res.status(400).json({ error: 'Could not create friend request' });
        }

        res.status(201).json({
            requestId: data.id,
            status: data.status
        });
    } catch (error) {
        logger.error('[FriendsAPI] POST /api/friends/request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/friends/accept
 * Body: { requestId }
 */
router.post('/accept', async (req, res) => {
    try {
        const user = await getAuthUser(req, res);
        if (!user) return;

        const parsed = requestIdSchema.safeParse(req.body || {});
        if (!parsed.success) {
            return res.status(400).json({ error: 'requestId is required' });
        }
        const { requestId } = parsed.data;

        const { data: requestRow, error: requestError } = await supabase
            .from('friend_requests')
            .select('*')
            .eq('id', requestId)
            .eq('to_user_id', user.id)
            .eq('status', 'pending')
            .maybeSingle();

        if (requestError) {
            logger.error('[FriendsAPI] Failed to fetch friend request:', requestError.message);
            return res.status(500).json({ error: 'Failed to accept request' });
        }

        if (!requestRow) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const fromId = requestRow.from_user_id;
        const toId = requestRow.to_user_id;

        const now = new Date().toISOString();

        // Use transaction-like behavior: update request then insert friendships
        const { error: updateError } = await supabase
            .from('friend_requests')
            .update({ status: 'accepted', responded_at: now })
            .eq('id', requestId);

        if (updateError) {
            logger.error('[FriendsAPI] Failed to update friend request:', updateError.message);
            return res.status(500).json({ error: 'Failed to accept request' });
        }

        const { error: insertError } = await supabase
            .from('friends')
            .insert([
                { user_id: fromId, friend_id: toId },
                { user_id: toId, friend_id: fromId }
            ]);

        if (insertError) {
            logger.error('[FriendsAPI] Failed to create friendship:', insertError.message);
            return res.status(500).json({ error: 'Failed to create friendship' });
        }

        res.json({ success: true });
    } catch (error) {
        logger.error('[FriendsAPI] POST /api/friends/accept error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/friends/decline
 * Body: { requestId }
 */
router.post('/decline', async (req, res) => {
    try {
        const user = await getAuthUser(req, res);
        if (!user) return;

        const parsed = requestIdSchema.safeParse(req.body || {});
        if (!parsed.success) {
            return res.status(400).json({ error: 'requestId is required' });
        }
        const { requestId } = parsed.data;

        const { error } = await supabase
            .from('friend_requests')
            .update({ status: 'declined', responded_at: new Date().toISOString() })
            .eq('id', requestId)
            .eq('to_user_id', user.id)
            .eq('status', 'pending');

        if (error) {
            logger.error('[FriendsAPI] Failed to decline friend request:', error.message);
            return res.status(500).json({ error: 'Failed to decline request' });
        }

        res.json({ success: true });
    } catch (error) {
        logger.error('[FriendsAPI] POST /api/friends/decline error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/friends/remove
 * Body: { friendId }
 */
router.delete('/remove', async (req, res) => {
    try {
        const user = await getAuthUser(req, res);
        if (!user) return;

        const parsed = friendIdSchema.safeParse(req.body || {});
        if (!parsed.success) {
            return res.status(400).json({ error: 'friendId is required' });
        }
        const { friendId } = parsed.data;

        const { error: err1 } = await supabase.from('friends').delete().eq('user_id', user.id).eq('friend_id', friendId);
        const { error: err2 } = await supabase.from('friends').delete().eq('user_id', friendId).eq('friend_id', user.id);
        const error = err1 || err2;

        if (error) {
            logger.error('[FriendsAPI] Failed to remove friend:', error.message);
            return res.status(500).json({ error: 'Failed to remove friend' });
        }

        res.json({ success: true });
    } catch (error) {
        logger.error('[FriendsAPI] DELETE /api/friends/remove error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/friends/presence
 * NOTE: Presence is backed by Redis; this endpoint can be wired to Redis keys.
 * For now, it returns an empty map that can be extended.
 */
router.get('/presence', async (req, res) => {
    try {
        // Placeholder; real implementation should query Redis presence for current user's friends.
        res.json({ presence: {} });
    } catch (error) {
        logger.error('[FriendsAPI] GET /api/friends/presence error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/friends/sync
 * Sync friends data for mobile app
 */
router.post('/sync', async (req, res) => {
    try {
        const user = await getAuthUser(req, res);
        if (!user) return;

        const { lastSync } = req.body || {};
        logger.info(`[FriendsAPI] Sync request from ${user.id} since ${lastSync}`);

        // Fetch friends
        const { data: friendRows, error: friendsError } = await supabase
            .from('friends')
            .select('friend_id')
            .eq('user_id', user.id);

        let friends = [];
        if (!friendsError && friendRows && friendRows.length > 0) {
            const friendIds = friendRows.map((row) => row.friend_id);
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .in('id', friendIds);

            if (!profileError && profiles) {
                friends = profiles.map((p) => ({
                    id: p.id,
                    name: p.username,
                    avatar: p.avatar_url,
                    online: false, // Wire to Redis if available
                    lastSeen: null
                }));
            }
        }

        // Fetch requests
        const { data: requestRows, error: requestsError } = await supabase
            .from('friend_requests')
            .select('id, from_user_id, message, created_at, status')
            .eq('to_user_id', user.id)
            .eq('status', 'pending');

        let requests = [];
        if (!requestsError && requestRows && requestRows.length > 0) {
            const senderIds = Array.from(new Set(requestRows.map((r) => r.from_user_id)));
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .in('id', senderIds);

            const profilesById = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

            requests = requestRows.map((r) => {
                const sender = profilesById[r.from_user_id];
                return {
                    id: r.id,
                    sender: sender
                        ? { id: sender.id, name: sender.username, avatar: sender.avatar_url }
                        : { id: r.from_user_id },
                    message: r.message,
                    createdAt: r.created_at
                };
            });
        }

        res.json({
            friends,
            requests,
            presence: {} // Stub for now
        });
    } catch (error) {
        logger.error('[FriendsAPI] POST /api/friends/sync error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;

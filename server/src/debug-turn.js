const crypto = require('crypto');

const getTurnCredentials = () => {
    try {
        const secret = process.env.TURN_SECRET || 'shareus-secret-key-change-me';
        console.log('Secret:', secret);
        const username = `user:${Math.floor(Date.now() / 1000)}`;
        const ttl = 24 * 3600; // 24 hours

        const hmac = crypto.createHmac('sha1', secret);
        hmac.update(`${username}:${Math.floor(Date.now() / 1000) + ttl}`);
        const password = hmac.digest('base64');

        return {
            username,
            credential: password,
            urls: [
                'stun:stun.l.google.com:19302',
                `turn:${process.env.TURN_URL || 'localhost'}:3478`
            ]
        };
    } catch (error) {
        console.error('Error in getTurnCredentials:', error);
        throw error;
    }
};

try {
    console.log(getTurnCredentials());
} catch (e) {
    console.error(e);
}

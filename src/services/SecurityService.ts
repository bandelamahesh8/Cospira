export class SecurityService {
    
    // --- Rate Limiting (Token Bucket) ---
    private static limits: Record<string, { tokens: number; lastRefill: number }> = {};
    private static readonly MAX_TOKENS = 10;
    private static readonly REFILL_RATE_MS = 1000; // 1 second
    private static readonly TOKENS_PER_REFILL = 2; // +2 tokens per second

    static canPerformAction(actionType: string): boolean {
        const now = Date.now();
        if (!this.limits[actionType]) {
            this.limits[actionType] = { tokens: this.MAX_TOKENS, lastRefill: now };
        }

        const bucket = this.limits[actionType];
        
        // Refill
        const timePassed = now - bucket.lastRefill;
        if (timePassed > this.REFILL_RATE_MS) {
            const tokensToAdd = Math.floor(timePassed / this.REFILL_RATE_MS) * this.TOKENS_PER_REFILL;
            bucket.tokens = Math.min(this.MAX_TOKENS, bucket.tokens + tokensToAdd);
            bucket.lastRefill = now;
        }

        // Consume
        if (bucket.tokens >= 1) {
            bucket.tokens -= 1;
            return true;
        }

        return false;
    }

    // --- Input Sanitization ---
    static sanitizeInput(input: string): string {
        if (!input) return '';
        return input
            .trim()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
            .slice(0, 500); // Max length
    }

    // --- Move Speed Check ---
    private static lastMoveTime: Record<string, number> = {};
    private static readonly MIN_MOVE_INTERVAL_MS = 200; // Impossible to move faster than 200ms consistently manually

    static validateMoveSpeed(gameId: string): boolean {
        const now = Date.now();
        const lastTime = this.lastMoveTime[gameId] || 0;
        
        // Exception: If it's the first move or significantly later
        if (now - lastTime < this.MIN_MOVE_INTERVAL_MS) {
            console.warn(`[Security] Suspicious move speed detection for game ${gameId}`);
            return false;
        }

        this.lastMoveTime[gameId] = now;
        return true;
    }
}

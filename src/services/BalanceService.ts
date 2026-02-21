import { supabase } from '@/integrations/supabase/client';

export interface ChessConfig {
    modes: {
        blitz: { time: number; increment: number };
        rapid: { time: number; increment: number };
        bullet: { time: number; increment: number };
    };
    points: { win: number; draw: number; loss: number };
}

export interface LudoConfig {
    dice: { six_probability: number; weighted_mode: boolean };
    board: { safe_spots: number[]; star_bonus_xp: number };
}

export class BalanceService {

    static async getConfig<T>(gameId: string): Promise<T | null> {
        const { data, error } = await supabase
            .from('game_balance_configs')
            .select('config')
            .eq('game_id', gameId)
            .single();
            
        if (error) {
            console.error(`Failed to load config for ${gameId}`, error);
            return null;
        }
        return data.config as T;
    }

    static async updateConfig(gameId: string, newConfig: any) {
        const { error } = await supabase
            .from('game_balance_configs')
            .update({ 
                config: newConfig,
                updated_at: new Date().toISOString() 
            })
            .eq('game_id', gameId);

        if (error) throw error;
        return true;
    }
}

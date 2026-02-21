import { supabase } from '@/integrations/supabase/client';

export interface UserSettings {
    volume: number;
    theme: 'dark' | 'light' | 'system';
    notifications: boolean;
    streamer_mode: boolean;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'reward';
    is_read: boolean;
    created_at: string;
}

export class SettingsService {

    // Settings
    static async getSettings(userId: string): Promise<UserSettings | null> {
        const { data, error } = await supabase
            .from('player_profiles')
            .select('settings')
            .eq('id', userId)
            .single();

        if (error) return null;
        return data.settings as UserSettings;
    }

    static async updateSettings(userId: string, newSettings: Partial<UserSettings>) {
        // First get current to merge
        const current = await this.getSettings(userId) || {};
        const merged = { ...current, ...newSettings };

        const { error } = await supabase
            .from('player_profiles')
            .update({ settings: merged })
            .eq('id', userId);
        
        if (error) throw error;
        return merged;
    }

    // Notifications
    static async getNotifications(userId: string) {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) return [];
        return data as Notification[];
    }

    static async markRead(id: string) {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);
    }

    static async markAllRead(userId: string) {
         await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);
    }
}

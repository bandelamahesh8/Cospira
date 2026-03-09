export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      player_profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          level: number;
          xp: number;
          coins: number;
          is_online: boolean;
          created_at: string;
          updated_at: string;
          equipped_avatar_id: string | null;
          equipped_frame_id: string | null;
          equipped_banner_id: string | null;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          level?: number;
          xp?: number;
          coins?: number;
          is_online?: boolean;
          created_at?: string;
          updated_at?: string;
          equipped_avatar_id?: string | null;
          equipped_frame_id?: string | null;
          equipped_banner_id?: string | null;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          level?: number;
          xp?: number;
          coins?: number;
          is_online?: boolean;
          created_at?: string;
          updated_at?: string;
          equipped_avatar_id?: string | null;
          equipped_frame_id?: string | null;
          equipped_banner_id?: string | null;
        };
        Relationships: [];
      };
      assets: {
        Row: {
          id: string;
          type: string;
          name: string;
          description: string | null;
          rarity: string;
          image_url: string | null;
          price_coins: number;
          is_purchasable: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          name: string;
          description?: string | null;
          rarity: string;
          image_url?: string | null;
          price_coins?: number;
          is_purchasable?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          name?: string;
          description?: string | null;
          rarity?: string;
          image_url?: string | null;
          price_coins?: number;
          is_purchasable?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      user_assets: {
        Row: {
          id: string;
          user_id: string;
          asset_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          asset_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          asset_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_assets_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'assets';
            referencedColumns: ['id'];
          },
        ];
      };
      match_history: {
        Row: {
          id: string;
          game_type: string;
          players: Json;
          winner_id: string | null;
          move_history: Json | null;
          initial_state: Json | null;
          final_state: Json | null;
          created_at: string;
          org_id: string | null;
        };
        Insert: {
          id?: string;
          game_type: string;
          players: Json;
          winner_id?: string | null;
          move_history?: Json | null;
          initial_state?: Json | null;
          final_state?: Json | null;
          created_at?: string;
          org_id?: string | null;
        };
        Update: {
          id?: string;
          game_type?: string;
          players?: Json;
          winner_id?: string | null;
          move_history?: Json | null;
          initial_state?: Json | null;
          final_state?: Json | null;
          created_at?: string;
          org_id?: string | null;
        };
        Relationships: [];
      };
      elo_history: {
        Row: {
          id: string;
          player_id: string;
          game_type: string;
          old_elo: number;
          new_elo: number;
          match_id: string | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          game_type: string;
          old_elo: number;
          new_elo: number;
          match_id?: string | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          game_type?: string;
          old_elo?: number;
          new_elo?: number;
          match_id?: string | null;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      breakout_audit_events: {
        Row: {
          id: string;
          org_id: string;
          breakout_id: string | null;
          actor_id: string;
          action: string;
          payload_hash: string;
          payload: Json;
          mode: string;
          audit_code: string | null;
          denial_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          breakout_id?: string | null;
          actor_id: string;
          action: string;
          payload_hash: string;
          payload: Json;
          mode: string;
          audit_code?: string | null;
          denial_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          breakout_id?: string | null;
          actor_id?: string;
          action?: string;
          payload_hash?: string;
          payload?: Json;
          mode?: string;
          audit_code?: string | null;
          denial_reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      game_balance_configs: {
        Row: {
          game_id: string;
          config: Json;
          updated_at: string;
        };
        Insert: {
          game_id: string;
          config: Json;
          updated_at?: string;
        };
        Update: {
          game_id?: string;
          config?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      game_stats: {
        Row: {
          id: string;
          player_id: string;
          game_type: string;
          elo: number;
          rank: string;
          peak_elo: number;
          wins: number;
          losses: number;
          draws: number;
          total_matches: number;
          current_win_streak: number;
          longest_win_streak: number;
          avg_match_duration: number;
          last_played_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          game_type: string;
          elo?: number;
          rank?: string;
          peak_elo?: number;
          wins?: number;
          losses?: number;
          draws?: number;
          total_matches?: number;
          current_win_streak?: number;
          longest_win_streak?: number;
          avg_match_duration?: number;
          last_played_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          game_type?: string;
          elo?: number;
          rank?: string;
          peak_elo?: number;
          wins?: number;
          losses?: number;
          draws?: number;
          total_matches?: number;
          current_win_streak?: number;
          longest_win_streak?: number;
          avg_match_duration?: number;
          last_played_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'game_stats_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'player_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      achievements: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string;
          image_url: string | null;
          xp_reward: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description: string;
          image_url?: string | null;
          xp_reward: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          xp_reward?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      player_achievements: {
        Row: {
          id: string;
          player_id: string;
          achievement_id: string;
          unlocked_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          achievement_id: string;
          unlocked_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          achievement_id?: string;
          unlocked_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'player_achievements_achievement_id_fkey';
            columns: ['achievement_id'];
            isOneToOne: false;
            referencedRelation: 'achievements';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

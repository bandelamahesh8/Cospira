export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  public: {
    Tables: {
      messages: {
        Row: {
          content: string;
          created_at: string | null;
          id: string;
          room_id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          id?: string;
          room_id: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          id?: string;
          room_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_user_id_fkey_profiles';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      feedback: {
        Row: {
          id: number;
          type: string;
          rating: number | null;
          message: string;
          name: string | null;
          email: string | null;
          subject: string | null;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          type: string;
          rating?: number | null;
          message: string;
          name?: string | null;
          email?: string | null;
          subject?: string | null;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          type?: string;
          rating?: number | null;
          message?: string;
          name?: string | null;
          email?: string | null;
          subject?: string | null;
          user_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          biometric_enabled: boolean | null;
          created_at: string | null;
          display_name: string | null;
          id: string;
          is_enterprise: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          biometric_enabled?: boolean | null;
          created_at?: string | null;
          display_name?: string | null;
          id: string;
          is_enterprise?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          biometric_enabled?: boolean | null;
          created_at?: string | null;
          display_name?: string | null;
          id?: string;
          is_enterprise?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string | null;
          id: string;
          role: Database['public']['Enums']['app_role'];
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          role?: Database['public']['Enums']['app_role'];
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          role?: Database['public']['Enums']['app_role'];
          user_id?: string;
        };
        Relationships: [];
      };

      organizations: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
          slug: string;
          status?: 'active' | 'suspended' | 'deleted';
          domain?: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          owner_id: string;
          slug: string;
          status?: 'active' | 'suspended' | 'deleted';
          domain?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          slug?: string;
          status?: 'active' | 'suspended' | 'deleted';
          domain?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      organization_members: {
        Row: {
          created_at: string;
          organization_id: string;
          role_id: string;
          user_id: string;
          status: 'active' | 'invited' | 'blocked';
        };
        Insert: {
          created_at?: string;
          organization_id: string;
          role_id: string;
          user_id: string;
          status?: 'active' | 'invited' | 'blocked';
        };
        Update: {
          created_at?: string;
          organization_id?: string;
          role_id?: string;
          user_id?: string;
          status?: 'active' | 'invited' | 'blocked';
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "organization_roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organization_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      organization_roles: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          priority: number;
          is_system_role: boolean;
          is_deletable: boolean;
          is_editable: boolean;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          priority?: number;
          is_system_role?: boolean;
          is_deletable?: boolean;
          is_editable?: boolean;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          priority?: number;
          is_system_role?: boolean;
          is_deletable?: boolean;
          is_editable?: boolean;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_roles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      permissions: {
        Row: {
            id: string;
            key: string;
            description: string;
            category: string | null;
        };
        Insert: {
            id?: string;
            key: string;
            description: string;
            category?: string | null;
        };
        Update: {
            id?: string;
            key?: string;
            description?: string;
            category?: string | null;
        };
        Relationships: [];
      };
      role_permissions: {
          Row: {
              role_id: string;
              permission_id: string;
          };
          Insert: {
              role_id: string;
              permission_id: string;
          };
          Update: {
              role_id?: string;
              permission_id?: string;
          };
          Relationships: [
            {
                foreignKeyName: "role_permissions_role_id_fkey";
                columns: ["role_id"];
                isOneToOne: false;
                referencedRelation: "organization_roles";
                referencedColumns: ["id"];
            },
            {
                foreignKeyName: "role_permissions_permission_id_fkey";
                columns: ["permission_id"];
                isOneToOne: false;
                referencedRelation: "permissions";
                referencedColumns: ["id"];
            }
          ];
      };
      organization_invites: {
          Row: {
              id: string;
              organization_id: string;
              email: string;
              role_id: string;
              token_hash: string;
              expires_at: string;
              status: 'pending' | 'accepted' | 'expired' | 'revoked';
              invite_type: string;
              created_at: string;
          };
          Insert: {
              id?: string;
              organization_id: string;
              email: string;
              role_id: string;
              token_hash: string;
              expires_at: string;
              status?: 'pending' | 'accepted' | 'expired' | 'revoked';
              invite_type?: string;
              created_at?: string;
          };
          Update: {
              id?: string;
              organization_id?: string;
              email?: string;
              role_id?: string;
              token_hash?: string;
              expires_at?: string;
              status?: 'pending' | 'accepted' | 'expired' | 'revoked';
              invite_type?: string;
              created_at?: string;
          };
          Relationships: [
             {
                 foreignKeyName: "organization_invites_organization_id_fkey";
                 columns: ["organization_id"];
                 isOneToOne: false;
                 referencedRelation: "organizations";
                 referencedColumns: ["id"];
             },
             {
                 foreignKeyName: "organization_invites_role_id_fkey";
                 columns: ["role_id"];
                 isOneToOne: false;
                 referencedRelation: "organization_roles";
                 referencedColumns: ["id"];
             }
          ];
      };
      activity_logs: {
          Row: {
              id: string;
              organization_id: string;
              actor_id: string | null;
              action: string;
              target_id: string | null;
              target_type: string | null;
              metadata: Json | null;
              created_at: string;
          };
          Insert: {
              id?: string;
              organization_id: string;
              actor_id?: string | null;
              action: string;
              target_id?: string | null;
              target_type?: string | null;
              metadata?: Json | null;
              created_at?: string;
          };
          Update: {
            id?: string;
            organization_id?: string;
            actor_id?: string | null;
            action?: string;
            target_id?: string | null;
            target_type?: string | null;
            metadata?: Json | null;
            created_at?: string;
          };
          Relationships: [
             {
                 foreignKeyName: "activity_logs_organization_id_fkey";
                 columns: ["organization_id"];
                 isOneToOne: false;
                 referencedRelation: "organizations";
                 referencedColumns: ["id"];
             },
             {
                 foreignKeyName: "activity_logs_actor_id_fkey";
                 columns: ["actor_id"];
                 isOneToOne: false;
                 referencedRelation: "users";
                 referencedColumns: ["id"];
             }
          ];
      };
      projects: {
          Row: {
              id: string;
              organization_id: string;
              name: string;
              description: string | null;
              status: 'active' | 'archived' | 'deleted';
              created_by: string | null;
              created_at: string;
              updated_at: string | null;
          };
          Insert: {
              id?: string;
              organization_id: string;
              name: string;
              description?: string | null;
              status?: 'active' | 'archived' | 'deleted';
              created_by?: string | null;
              created_at?: string;
              updated_at?: string | null;
          };
          Update: {
              id?: string;
              organization_id?: string;
              name?: string;
              description?: string | null;
              status?: 'active' | 'archived' | 'deleted';
              created_by?: string | null;
              created_at?: string;
              updated_at?: string | null;
          };
          Relationships: [
            {
                 foreignKeyName: "projects_organization_id_fkey";
                 columns: ["organization_id"];
                 isOneToOne: false;
                 referencedRelation: "organizations";
                 referencedColumns: ["id"];
             }
          ];
      };
      teams: {
          Row: {
              id: string;
              organization_id: string;
              name: string;
              description: string | null;
              created_at: string;
          };
          Insert: {
              id?: string;
              organization_id: string;
              name: string;
              description?: string | null;
              created_at?: string;
          };
          Update: {
              id?: string;
              organization_id?: string;
              name?: string;
              description?: string | null;
              created_at?: string;
          };
          Relationships: [
             {
                 foreignKeyName: "teams_organization_id_fkey";
                 columns: ["organization_id"];
                 isOneToOne: false;
                 referencedRelation: "organizations";
                 referencedColumns: ["id"];
             }
          ];
      };
      project_teams: {
          Row: {
              project_id: string;
              team_id: string;
              assigned_by: string | null;
              created_at: string;
          };
          Insert: {
              project_id: string;
              team_id: string;
              assigned_by?: string | null;
              created_at?: string;
          };
          Update: {
              project_id?: string;
              team_id?: string;
              assigned_by?: string | null;
              created_at?: string;
          };
          Relationships: [
            {
                 foreignKeyName: "project_teams_project_id_fkey";
                 columns: ["project_id"];
                 isOneToOne: false;
                 referencedRelation: "projects";
                 referencedColumns: ["id"];
             },
             {
                 foreignKeyName: "project_teams_team_id_fkey";
                 columns: ["team_id"];
                 isOneToOne: false;
                 referencedRelation: "teams";
                 referencedColumns: ["id"];
             }
          ];
      };
      team_members: {
          Row: {
              team_id: string;
              user_id: string;
              added_by: string | null;
              created_at: string;
          };
          Insert: {
              team_id: string;
              user_id: string;
              added_by?: string | null;
              created_at?: string;
          };
          Update: {
              team_id?: string;
              user_id?: string;
              added_by?: string | null;
              created_at?: string;
          };
          Relationships: [
            {
                 foreignKeyName: "team_members_team_id_fkey";
                 columns: ["team_id"];
                 isOneToOne: false;
                 referencedRelation: "teams";
                 referencedColumns: ["id"];
             },
             {
                 foreignKeyName: "team_members_user_id_fkey";
                 columns: ["user_id"];
                 isOneToOne: false;
                 referencedRelation: "users";
                 referencedColumns: ["id"];
             }
          ];
      };
    };

    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database['public']['Enums']['app_role'];
          _user_id: string;
        };
        Returns: boolean;
      };
      create_role_secure: {
          Args: {
              p_org_id: string;
              p_name: string;
              p_priority: number;
              p_actor_id: string;
          };
          Returns: { success: boolean; error?: string };
      };
      delete_role_safe: {
          Args: {
              p_role_id: string;
              p_actor_id: string;
          };
          Returns: { success: boolean; error?: string };
      };
      accept_invite_secure: {
          Args: {
              p_token_hash: string;
              p_user_id: string;
          };
          Returns: { success: boolean; error?: string };
      };
    };
    Enums: {
      app_role: 'admin' | 'moderator' | 'user' | 'enterprise';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
  ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
    Row: infer R;
  }
  ? R
  : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema['Tables']
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
    Insert: infer I;
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
  ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I;
  }
  ? I
  : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema['Tables']
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
    Update: infer U;
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
  ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U;
  }
  ? U
  : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema['Enums']
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
  ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema['CompositeTypes']
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
  ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ['admin', 'moderator', 'user', 'enterprise'],
    },
  },
} as const;

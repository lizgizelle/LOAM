export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      event_participants: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registration_answers: {
        Row: {
          answer_value: string
          created_at: string
          event_id: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          answer_value: string
          created_at?: string
          event_id: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          answer_value?: string
          created_at?: string
          event_id?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registration_answers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registration_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "event_registration_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registration_questions: {
        Row: {
          created_at: string
          display_order: number
          event_id: string
          id: string
          is_required: boolean
          options: Json | null
          question_text: string
          question_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          event_id: string
          id?: string
          is_required?: boolean
          options?: Json | null
          question_text: string
          question_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          event_id?: string
          id?: string
          is_required?: boolean
          options?: Json | null
          question_text?: string
          question_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registration_questions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reports: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          cover_image_url: string | null
          created_at: string
          currency: string
          description: string | null
          end_date: string | null
          hide_location_until_approved: boolean
          host_id: string | null
          id: string
          is_unlimited_capacity: boolean
          location: string | null
          name: string
          requires_approval: boolean
          show_participants: boolean
          start_date: string
          status: string
          ticket_price: number | null
          updated_at: string
          visibility: string
        }
        Insert: {
          capacity?: number | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          end_date?: string | null
          hide_location_until_approved?: boolean
          host_id?: string | null
          id?: string
          is_unlimited_capacity?: boolean
          location?: string | null
          name: string
          requires_approval?: boolean
          show_participants?: boolean
          start_date: string
          status?: string
          ticket_price?: number | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          capacity?: number | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          end_date?: string | null
          hide_location_until_approved?: boolean
          host_id?: string | null
          id?: string
          is_unlimited_capacity?: boolean
          location?: string | null
          name?: string
          requires_approval?: boolean
          show_participants?: boolean
          start_date?: string
          status?: string
          ticket_price?: number | null
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      game_access_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      game_bucket_rules: {
        Row: {
          answer_value: string
          bucket_id: string
          created_at: string
          id: string
          survey_question_id: string
        }
        Insert: {
          answer_value: string
          bucket_id: string
          created_at?: string
          id?: string
          survey_question_id: string
        }
        Update: {
          answer_value?: string
          bucket_id?: string
          created_at?: string
          id?: string
          survey_question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_bucket_rules_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "game_buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_bucket_rules_survey_question_id_fkey"
            columns: ["survey_question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_buckets: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      game_questions: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          is_active: boolean
          question_text: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          question_text: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          question_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_questions_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "game_buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      game_ratings: {
        Row: {
          created_at: string
          id: string
          question_id: string
          rating: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          rating: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_ratings_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "game_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_unlocks: {
        Row: {
          id: string
          is_locked: boolean
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          is_locked?: boolean
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          is_locked?: boolean
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          status: string
          updated_at: string
          user_1_id: string
          user_2_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_1_id: string
          user_2_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_1_id?: string
          user_2_id?: string
        }
        Relationships: []
      }
      matchmaker_answers: {
        Row: {
          answer_value: string
          created_at: string
          id: string
          question_id: string
          question_text_snapshot: string
          question_type_snapshot: string
          session_id: string
          user_id: string
        }
        Insert: {
          answer_value: string
          created_at?: string
          id?: string
          question_id: string
          question_text_snapshot: string
          question_type_snapshot: string
          session_id: string
          user_id: string
        }
        Update: {
          answer_value?: string
          created_at?: string
          id?: string
          question_id?: string
          question_text_snapshot?: string
          question_type_snapshot?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchmaker_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "matchmaker_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchmaker_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "matchmaker_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      matchmaker_questions: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          options: Json | null
          question_text: string
          question_type: string
          scale_label_high: string | null
          scale_label_low: string | null
          set_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          options?: Json | null
          question_text: string
          question_type: string
          scale_label_high?: string | null
          scale_label_low?: string | null
          set_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          options?: Json | null
          question_text?: string
          question_type?: string
          scale_label_high?: string | null
          scale_label_low?: string | null
          set_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchmaker_questions_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "matchmaker_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      matchmaker_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          set_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          set_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          set_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matchmaker_sessions_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "matchmaker_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      matchmaker_sets: {
        Row: {
          created_at: string
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_notes: string | null
          avatar_url: string | null
          children: string | null
          country_of_birth: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          game_bucket_id: string | null
          gender: string | null
          id: string
          is_shadow_blocked: boolean
          phone_number: string | null
          relationship_status: string | null
          updated_at: string
          work_industry: string | null
        }
        Insert: {
          admin_notes?: string | null
          avatar_url?: string | null
          children?: string | null
          country_of_birth?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          game_bucket_id?: string | null
          gender?: string | null
          id: string
          is_shadow_blocked?: boolean
          phone_number?: string | null
          relationship_status?: string | null
          updated_at?: string
          work_industry?: string | null
        }
        Update: {
          admin_notes?: string | null
          avatar_url?: string | null
          children?: string | null
          country_of_birth?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          game_bucket_id?: string | null
          gender?: string | null
          id?: string
          is_shadow_blocked?: boolean
          phone_number?: string | null
          relationship_status?: string | null
          updated_at?: string
          work_industry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_game_bucket_id_fkey"
            columns: ["game_bucket_id"]
            isOneToOne: false
            referencedRelation: "game_buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          options: Json | null
          question_text: string
          question_type: string
          scale_label_high: string | null
          scale_label_low: string | null
          survey_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          options?: Json | null
          question_text: string
          question_type: string
          scale_label_high?: string | null
          scale_label_low?: string | null
          survey_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          options?: Json | null
          question_text?: string
          question_type?: string
          scale_label_high?: string | null
          scale_label_low?: string | null
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          answer_value: string
          created_at: string
          id: string
          question_id: string
          question_text_snapshot: string
          question_type_snapshot: string
          survey_id: string | null
          survey_title_snapshot: string | null
          user_id: string
        }
        Insert: {
          answer_value: string
          created_at?: string
          id?: string
          question_id: string
          question_text_snapshot: string
          question_type_snapshot: string
          survey_id?: string | null
          survey_title_snapshot?: string | null
          user_id: string
        }
        Update: {
          answer_value?: string
          created_at?: string
          id?: string
          question_id?: string
          question_text_snapshot?: string
          question_type_snapshot?: string
          survey_id?: string | null
          survey_title_snapshot?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "event_host" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "event_host", "user"],
    },
  },
} as const

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assessments: {
        Row: {
          case_id: string
          closed_at: string | null
          created_at: string
          id: string
          knowledge_version_id: string
          organization_id: string
          started_at: string | null
          type: Database["public"]["Enums"]["assessment_type"]
          updated_at: string
        }
        Insert: {
          case_id: string
          closed_at?: string | null
          created_at?: string
          id?: string
          knowledge_version_id: string
          organization_id: string
          started_at?: string | null
          type?: Database["public"]["Enums"]["assessment_type"]
          updated_at?: string
        }
        Update: {
          case_id?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          knowledge_version_id?: string
          organization_id?: string
          started_at?: string | null
          type?: Database["public"]["Enums"]["assessment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_knowledge_version_id_fkey"
            columns: ["knowledge_version_id"]
            isOneToOne: false
            referencedRelation: "knowledge_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_runs: {
        Row: {
          assessment_id: string
          completed_at: string | null
          created_at: string
          engine_version: string
          id: string
          knowledge_version_id: string
          organization_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["evaluation_run_status"]
          trigger: Database["public"]["Enums"]["evaluation_run_trigger"]
        }
        Insert: {
          assessment_id: string
          completed_at?: string | null
          created_at?: string
          engine_version: string
          id?: string
          knowledge_version_id: string
          organization_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["evaluation_run_status"]
          trigger: Database["public"]["Enums"]["evaluation_run_trigger"]
        }
        Update: {
          assessment_id?: string
          completed_at?: string | null
          created_at?: string
          engine_version?: string
          id?: string
          knowledge_version_id?: string
          organization_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["evaluation_run_status"]
          trigger?: Database["public"]["Enums"]["evaluation_run_trigger"]
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_runs_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_runs_knowledge_version_id_fkey"
            columns: ["knowledge_version_id"]
            isOneToOne: false
            referencedRelation: "knowledge_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      information_need_states: {
        Row: {
          assessment_id: string
          created_at: string
          detail: Json | null
          evaluation_run_id: string | null
          id: string
          need_ref: string
          organization_id: string
          state: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          detail?: Json | null
          evaluation_run_id?: string | null
          id?: string
          need_ref: string
          organization_id: string
          state: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          detail?: Json | null
          evaluation_run_id?: string | null
          id?: string
          need_ref?: string
          organization_id?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "information_need_states_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "information_need_states_evaluation_run_id_fkey"
            columns: ["evaluation_run_id"]
            isOneToOne: false
            referencedRelation: "evaluation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "information_need_states_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_versions: {
        Row: {
          checksum: string
          created_at: string
          id: string
          identifier: string
          published_at: string | null
          status: Database["public"]["Enums"]["knowledge_version_status"]
          updated_at: string
          version: string
        }
        Insert: {
          checksum: string
          created_at?: string
          id?: string
          identifier: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["knowledge_version_status"]
          updated_at?: string
          version: string
        }
        Update: {
          checksum?: string
          created_at?: string
          id?: string
          identifier?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["knowledge_version_status"]
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["membership_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["membership_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      observations: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          organization_id: string
          source_response_id: string | null
          updated_at: string
          value: Json
          variable_ref: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          organization_id: string
          source_response_id?: string | null
          updated_at?: string
          value: Json
          variable_ref: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          source_response_id?: string | null
          updated_at?: string
          value?: Json
          variable_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "observations_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observations_source_response_id_fkey"
            columns: ["source_response_id"]
            isOneToOne: false
            referencedRelation: "responses"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      responses: {
        Row: {
          acquisition_ref: string
          assessment_id: string
          created_at: string
          id: string
          organization_id: string
          payload: Json
          submitted_by: string | null
        }
        Insert: {
          acquisition_ref: string
          assessment_id: string
          created_at?: string
          id?: string
          organization_id: string
          payload: Json
          submitted_by?: string | null
        }
        Update: {
          acquisition_ref?: string
          assessment_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          payload?: Json
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "responses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      variable_evaluations: {
        Row: {
          created_at: string
          detail: Json | null
          evaluation_run_id: string
          id: string
          organization_id: string
          state: string
          variable_ref: string
        }
        Insert: {
          created_at?: string
          detail?: Json | null
          evaluation_run_id: string
          id?: string
          organization_id: string
          state: string
          variable_ref: string
        }
        Update: {
          created_at?: string
          detail?: Json | null
          evaluation_run_id?: string
          id?: string
          organization_id?: string
          state?: string
          variable_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "variable_evaluations_evaluation_run_id_fkey"
            columns: ["evaluation_run_id"]
            isOneToOne: false
            referencedRelation: "evaluation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variable_evaluations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_organization_role: {
        Args: {
          _organization_id: string
          _roles: Database["public"]["Enums"]["membership_role"][]
        }
        Returns: boolean
      }
      is_organization_member: {
        Args: { _organization_id: string }
        Returns: boolean
      }
    }
    Enums: {
      assessment_type: "BASELINE" | "REASSESSMENT" | "FOLLOW_UP"
      evaluation_run_status:
        | "PENDING"
        | "PROCESSING"
        | "PROCESSED"
        | "FAILED"
        | "NEEDS_REVIEW"
      evaluation_run_trigger:
        | "RESPONSE_ACCEPTED"
        | "EVIDENCE_ADDED"
        | "OBSERVATION_UPDATED"
        | "CONTRADICTION_RESOLVED"
        | "MANUAL_REEVALUATION"
        | "REASSESSMENT_STARTED"
        | "VALIDATION_COMPLETED"
      knowledge_version_status:
        | "DRAFT"
        | "VALIDATED"
        | "PUBLISHED"
        | "SUPERSEDED"
      membership_role: "OWNER" | "ADMIN" | "MEMBER"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      assessment_type: ["BASELINE", "REASSESSMENT", "FOLLOW_UP"],
      evaluation_run_status: [
        "PENDING",
        "PROCESSING",
        "PROCESSED",
        "FAILED",
        "NEEDS_REVIEW",
      ],
      evaluation_run_trigger: [
        "RESPONSE_ACCEPTED",
        "EVIDENCE_ADDED",
        "OBSERVATION_UPDATED",
        "CONTRADICTION_RESOLVED",
        "MANUAL_REEVALUATION",
        "REASSESSMENT_STARTED",
        "VALIDATION_COMPLETED",
      ],
      knowledge_version_status: [
        "DRAFT",
        "VALIDATED",
        "PUBLISHED",
        "SUPERSEDED",
      ],
      membership_role: ["OWNER", "ADMIN", "MEMBER"],
    },
  },
} as const

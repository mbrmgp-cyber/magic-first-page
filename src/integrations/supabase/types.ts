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
      committee_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          member_id: string
          org_id: string
          position_number: number
          qualifications: string | null
          responsibilities: string | null
          role: Database["public"]["Enums"]["committee_role"]
          term_end_date: string
          term_start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          member_id: string
          org_id: string
          position_number?: number
          qualifications?: string | null
          responsibilities?: string | null
          role: Database["public"]["Enums"]["committee_role"]
          term_end_date: string
          term_start_date?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          member_id?: string
          org_id?: string
          position_number?: number
          qualifications?: string | null
          responsibilities?: string | null
          role?: Database["public"]["Enums"]["committee_role"]
          term_end_date?: string
          term_start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "committee_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      member_loan_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          loan_id: string
          notes: string | null
          org_id: string
          payment_date: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          loan_id: string
          notes?: string | null
          org_id: string
          payment_date?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          loan_id?: string
          notes?: string | null
          org_id?: string
          payment_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_loan_payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "member_loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_loan_payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      member_loan_requests: {
        Row: {
          approved_loan_id: string | null
          created_at: string
          id: string
          interest_rate_monthly: number
          member_id: string
          org_id: string
          payment_date: string | null
          reason: string
          reject_reason: string | null
          requested_amount: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          surety_member_code: string | null
          surety_member_id: string | null
          updated_at: string
          utr_number: string | null
        }
        Insert: {
          approved_loan_id?: string | null
          created_at?: string
          id?: string
          interest_rate_monthly?: number
          member_id: string
          org_id: string
          payment_date?: string | null
          reason: string
          reject_reason?: string | null
          requested_amount: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          surety_member_code?: string | null
          surety_member_id?: string | null
          updated_at?: string
          utr_number?: string | null
        }
        Update: {
          approved_loan_id?: string | null
          created_at?: string
          id?: string
          interest_rate_monthly?: number
          member_id?: string
          org_id?: string
          payment_date?: string | null
          reason?: string
          reject_reason?: string | null
          requested_amount?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          surety_member_code?: string | null
          surety_member_id?: string | null
          updated_at?: string
          utr_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_loan_requests_approved_loan_id_fkey"
            columns: ["approved_loan_id"]
            isOneToOne: false
            referencedRelation: "member_loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_loan_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_loan_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_loan_requests_surety_member_id_fkey"
            columns: ["surety_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_loans: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          interest_rate_monthly: number
          member_id: string
          org_id: string
          principal: number
          purpose: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          interest_rate_monthly?: number
          member_id: string
          org_id: string
          principal: number
          purpose?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          interest_rate_monthly?: number
          member_id?: string
          org_id?: string
          principal?: number
          purpose?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_loans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_loans_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          bank_name: string | null
          blood_group: string | null
          committee_fee_paid: number | null
          created_at: string
          email: string
          father_name: string | null
          first_name: string | null
          id: string
          introducer_member_id: string | null
          is_active: boolean
          is_committee: boolean
          joined_date: string | null
          last_name: string | null
          member_code: string | null
          name: string
          org_id: string
          phone: string | null
          photo_url: string | null
          pin_code: string | null
          preferred_lang: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string | null
          village: string | null
        }
        Insert: {
          address?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          blood_group?: string | null
          committee_fee_paid?: number | null
          created_at?: string
          email: string
          father_name?: string | null
          first_name?: string | null
          id?: string
          introducer_member_id?: string | null
          is_active?: boolean
          is_committee?: boolean
          joined_date?: string | null
          last_name?: string | null
          member_code?: string | null
          name: string
          org_id: string
          phone?: string | null
          photo_url?: string | null
          pin_code?: string | null
          preferred_lang?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string | null
          village?: string | null
        }
        Update: {
          address?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          blood_group?: string | null
          committee_fee_paid?: number | null
          created_at?: string
          email?: string
          father_name?: string | null
          first_name?: string | null
          id?: string
          introducer_member_id?: string | null
          is_active?: boolean
          is_committee?: boolean
          joined_date?: string | null
          last_name?: string | null
          member_code?: string | null
          name?: string
          org_id?: string
          phone?: string | null
          photo_url?: string | null
          pin_code?: string | null
          preferred_lang?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string | null
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_introducer_member_id_fkey"
            columns: ["introducer_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_expenses: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          entry_date: string
          expense_type: Database["public"]["Enums"]["expense_type"]
          id: string
          org_id: string
          recipient_name: string
          remarks: string | null
          updated_at: string
          wallet: Database["public"]["Enums"]["wallet_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          expense_type: Database["public"]["Enums"]["expense_type"]
          id?: string
          org_id: string
          recipient_name: string
          remarks?: string | null
          updated_at?: string
          wallet?: Database["public"]["Enums"]["wallet_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          expense_type?: Database["public"]["Enums"]["expense_type"]
          id?: string
          org_id?: string
          recipient_name?: string
          remarks?: string | null
          updated_at?: string
          wallet?: Database["public"]["Enums"]["wallet_type"]
        }
        Relationships: [
          {
            foreignKeyName: "org_expenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_income: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          entry_date: string
          id: string
          income_type: Database["public"]["Enums"]["income_type"]
          org_id: string
          payer_email: string | null
          payer_name: string
          payer_phone: string | null
          receipt_no: string | null
          remarks: string | null
          updated_at: string
          wallet: Database["public"]["Enums"]["wallet_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          income_type: Database["public"]["Enums"]["income_type"]
          org_id: string
          payer_email?: string | null
          payer_name: string
          payer_phone?: string | null
          receipt_no?: string | null
          remarks?: string | null
          updated_at?: string
          wallet?: Database["public"]["Enums"]["wallet_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          income_type?: Database["public"]["Enums"]["income_type"]
          org_id?: string
          payer_email?: string | null
          payer_name?: string
          payer_phone?: string | null
          receipt_no?: string | null
          remarks?: string | null
          updated_at?: string
          wallet?: Database["public"]["Enums"]["wallet_type"]
        }
        Relationships: [
          {
            foreignKeyName: "org_income_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_milestones: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          id: string
          org_id: string
          photo_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          id?: string
          org_id: string
          photo_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          id?: string
          org_id?: string
          photo_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_milestones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_rules: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          position: number
          text: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          position?: number
          text: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          position?: number
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          admin_aadhaar_url: string | null
          admin_designation: string | null
          admin_name: string | null
          admin_user_id: string
          approval_notes: string | null
          approval_status: Database["public"]["Enums"]["org_approval_status"]
          approved_at: string | null
          approved_by: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          committee_term_years: number
          created_at: string
          email: string
          founders: Json
          gov_reg_number: string | null
          id: string
          is_gov_registered: boolean
          letter_code: string | null
          logo_url: string | null
          name: string
          org_code: string
          pan_card_url: string | null
          phone: string | null
          president_name: string | null
          president_signature_url: string | null
          registration_certificate_url: string | null
          slogan: string | null
          theme_color: string
          theme_font: string
          theme_settings: Json
          updated_at: string
        }
        Insert: {
          admin_aadhaar_url?: string | null
          admin_designation?: string | null
          admin_name?: string | null
          admin_user_id: string
          approval_notes?: string | null
          approval_status?: Database["public"]["Enums"]["org_approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          committee_term_years?: number
          created_at?: string
          email: string
          founders?: Json
          gov_reg_number?: string | null
          id?: string
          is_gov_registered?: boolean
          letter_code?: string | null
          logo_url?: string | null
          name: string
          org_code: string
          pan_card_url?: string | null
          phone?: string | null
          president_name?: string | null
          president_signature_url?: string | null
          registration_certificate_url?: string | null
          slogan?: string | null
          theme_color?: string
          theme_font?: string
          theme_settings?: Json
          updated_at?: string
        }
        Update: {
          admin_aadhaar_url?: string | null
          admin_designation?: string | null
          admin_name?: string | null
          admin_user_id?: string
          approval_notes?: string | null
          approval_status?: Database["public"]["Enums"]["org_approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          committee_term_years?: number
          created_at?: string
          email?: string
          founders?: Json
          gov_reg_number?: string | null
          id?: string
          is_gov_registered?: boolean
          letter_code?: string | null
          logo_url?: string | null
          name?: string
          org_code?: string
          pan_card_url?: string | null
          phone?: string | null
          president_name?: string | null
          president_signature_url?: string | null
          registration_certificate_url?: string | null
          slogan?: string | null
          theme_color?: string
          theme_font?: string
          theme_settings?: Json
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
      can_edit_accounts: { Args: { _org_id: string }; Returns: boolean }
      can_edit_events: { Args: { _org_id: string }; Returns: boolean }
      can_edit_org: { Args: { _org_id: string }; Returns: boolean }
      can_edit_rules: { Args: { _org_id: string }; Returns: boolean }
      can_manage_committee: { Args: { _org_id: string }; Returns: boolean }
      get_committee_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["committee_role"]
      }
      get_loan_summary: {
        Args: { _loan_id: string }
        Returns: {
          accrued_interest: number
          balance: number
          interest_rate_monthly: number
          loan_id: string
          months_elapsed: number
          principal: number
          total_due: number
          total_paid: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      int_to_letters: { Args: { n: number }; Returns: string }
      is_approved_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "mbr_admin"
      committee_role:
        | "president"
        | "vice_president"
        | "advisor"
        | "treasurer"
        | "executive"
        | "worker"
      expense_type: "charity" | "office" | "meeting" | "misc"
      income_type: "registration_fee" | "donation" | "other"
      member_status: "pending" | "approved" | "rejected"
      org_approval_status: "pending" | "approved" | "rejected"
      wallet_type: "bank" | "accountant" | "president"
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
      app_role: ["mbr_admin"],
      committee_role: [
        "president",
        "vice_president",
        "advisor",
        "treasurer",
        "executive",
        "worker",
      ],
      expense_type: ["charity", "office", "meeting", "misc"],
      income_type: ["registration_fee", "donation", "other"],
      member_status: ["pending", "approved", "rejected"],
      org_approval_status: ["pending", "approved", "rejected"],
      wallet_type: ["bank", "accountant", "president"],
    },
  },
} as const

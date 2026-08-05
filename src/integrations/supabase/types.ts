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
      admin_module_access: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          modules: string[]
          org_id: string
          preset: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          modules?: string[]
          org_id: string
          preset?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          modules?: string[]
          org_id?: string
          preset?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_module_access_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_month_archives: {
        Row: {
          archived_by: string | null
          auction_id: string
          bids: Json
          chit_value: number
          closed_at: string
          commission_pct: number
          consents: Json
          created_at: string
          group_name: string
          id: string
          month_no: number
          org_id: string
          participants: Json
          total_months: number
          turn_end: string | null
          turn_start: string | null
          winner: Json | null
        }
        Insert: {
          archived_by?: string | null
          auction_id: string
          bids?: Json
          chit_value?: number
          closed_at?: string
          commission_pct?: number
          consents?: Json
          created_at?: string
          group_name: string
          id?: string
          month_no: number
          org_id: string
          participants?: Json
          total_months?: number
          turn_end?: string | null
          turn_start?: string | null
          winner?: Json | null
        }
        Update: {
          archived_by?: string | null
          auction_id?: string
          bids?: Json
          chit_value?: number
          closed_at?: string
          commission_pct?: number
          consents?: Json
          created_at?: string
          group_name?: string
          id?: string
          month_no?: number
          org_id?: string
          participants?: Json
          total_months?: number
          turn_end?: string | null
          turn_start?: string | null
          winner?: Json | null
        }
        Relationships: []
      }
      auction_payments: {
        Row: {
          amount: number
          auction_id: string
          created_at: string
          id: string
          member_id: string
          month_no: number
          note: string | null
          org_id: string
          receipt_url: string | null
          status: string
          updated_at: string
          uploaded_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount?: number
          auction_id: string
          created_at?: string
          id?: string
          member_id: string
          month_no: number
          note?: string | null
          org_id: string
          receipt_url?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          auction_id?: string
          created_at?: string
          id?: string
          member_id?: string
          month_no?: number
          note?: string | null
          org_id?: string
          receipt_url?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_payments_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auction_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_sessions: {
        Row: {
          auction_closed: boolean
          chit_value: number
          close_at: string | null
          commission_pct: number
          consents: Json
          created_at: string
          current_month: number
          foreman_free_month: number | null
          foreman_included: boolean
          foreman_mode: string
          group_name: string
          id: string
          live_group_name: string | null
          org_id: string
          participants: Json
          past_winners: Json
          start_date: string | null
          status: string
          terms: string | null
          total_members: number | null
          total_months: number
          turn_end: string | null
          turn_start: string | null
          updated_at: string
          updated_by: string | null
          winner_amount: number | null
          winner_bid_id: string | null
          winner_dividend: number | null
          winner_member_code: string | null
          winner_member_id: string | null
          winner_member_name: string | null
          winner_net: number | null
        }
        Insert: {
          auction_closed?: boolean
          chit_value?: number
          close_at?: string | null
          commission_pct?: number
          consents?: Json
          created_at?: string
          current_month?: number
          foreman_free_month?: number | null
          foreman_included?: boolean
          foreman_mode?: string
          group_name: string
          id?: string
          live_group_name?: string | null
          org_id: string
          participants?: Json
          past_winners?: Json
          start_date?: string | null
          status?: string
          terms?: string | null
          total_members?: number | null
          total_months?: number
          turn_end?: string | null
          turn_start?: string | null
          updated_at?: string
          updated_by?: string | null
          winner_amount?: number | null
          winner_bid_id?: string | null
          winner_dividend?: number | null
          winner_member_code?: string | null
          winner_member_id?: string | null
          winner_member_name?: string | null
          winner_net?: number | null
        }
        Update: {
          auction_closed?: boolean
          chit_value?: number
          close_at?: string | null
          commission_pct?: number
          consents?: Json
          created_at?: string
          current_month?: number
          foreman_free_month?: number | null
          foreman_included?: boolean
          foreman_mode?: string
          group_name?: string
          id?: string
          live_group_name?: string | null
          org_id?: string
          participants?: Json
          past_winners?: Json
          start_date?: string | null
          status?: string
          terms?: string | null
          total_members?: number | null
          total_months?: number
          turn_end?: string | null
          turn_start?: string | null
          updated_at?: string
          updated_by?: string | null
          winner_amount?: number | null
          winner_bid_id?: string | null
          winner_dividend?: number | null
          winner_member_code?: string | null
          winner_member_id?: string | null
          winner_member_name?: string | null
          winner_net?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_sessions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_sessions_winner_member_id_fkey"
            columns: ["winner_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          auction_id: string
          created_at: string
          id: string
          member_code: string | null
          member_id: string
          member_name: string
          org_id: string
          submitted_at: string
          submitted_by: string | null
        }
        Insert: {
          amount: number
          auction_id: string
          created_at?: string
          id?: string
          member_code?: string | null
          member_id: string
          member_name: string
          org_id: string
          submitted_at?: string
          submitted_by?: string | null
        }
        Update: {
          amount?: number
          auction_id?: string
          created_at?: string
          id?: string
          member_code?: string | null
          member_id?: string
          member_name?: string
          org_id?: string
          submitted_at?: string
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auction_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_announcements: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          id: string
          org_id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          id?: string
          org_id: string
          title: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          org_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_announcements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_interactions: {
        Row: {
          created_at: string
          id: string
          message_en: string
          message_te: string
          org_id: string
          recipient_member_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          sender_member_id: string | null
          sender_user_id: string
          status: string
          template_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_en: string
          message_te: string
          org_id: string
          recipient_member_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_member_id?: string | null
          sender_user_id: string
          status?: string
          template_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_en?: string
          message_te?: string
          org_id?: string
          recipient_member_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_member_id?: string | null
          sender_user_id?: string
          status?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_interactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_interactions_recipient_member_id_fkey"
            columns: ["recipient_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_interactions_sender_member_id_fkey"
            columns: ["sender_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      chit_auctions: {
        Row: {
          org_id: string
          state: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          org_id: string
          state?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          org_id?: string
          state?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chit_auctions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      disciplinary_committee_members: {
        Row: {
          appointed_at: string
          created_at: string
          id: string
          is_active: boolean
          member_id: string
          notes: string | null
          org_id: string
          role: string
          updated_at: string
        }
        Insert: {
          appointed_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          member_id: string
          notes?: string | null
          org_id: string
          role: string
          updated_at?: string
        }
        Update: {
          appointed_at?: string
          created_at?: string
          id?: string
          is_active?: boolean
          member_id?: string
          notes?: string | null
          org_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinary_committee_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinary_committee_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinary_president_nominations: {
        Row: {
          candidate_member_id: string
          created_at: string
          decided_at: string | null
          id: string
          nominated_by: string | null
          notes: string | null
          org_id: string
          status: string
          updated_at: string
          votes_against: number
          votes_for: number
        }
        Insert: {
          candidate_member_id: string
          created_at?: string
          decided_at?: string | null
          id?: string
          nominated_by?: string | null
          notes?: string | null
          org_id: string
          status?: string
          updated_at?: string
          votes_against?: number
          votes_for?: number
        }
        Update: {
          candidate_member_id?: string
          created_at?: string
          decided_at?: string | null
          id?: string
          nominated_by?: string | null
          notes?: string | null
          org_id?: string
          status?: string
          updated_at?: string
          votes_against?: number
          votes_for?: number
        }
        Relationships: [
          {
            foreignKeyName: "disciplinary_president_nominations_candidate_member_id_fkey"
            columns: ["candidate_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinary_president_nominations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinary_suspensions: {
        Row: {
          category: string | null
          created_at: string
          effective_from: string
          effective_until: string | null
          id: string
          issued_by: string | null
          notes: string | null
          org_id: string
          reason: string
          revoked_at: string | null
          revoked_by: string | null
          status: string
          target_member_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          issued_by?: string | null
          notes?: string | null
          org_id: string
          reason: string
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          target_member_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          issued_by?: string | null
          notes?: string | null
          org_id?: string
          reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          target_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinary_suspensions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinary_suspensions_target_member_id_fkey"
            columns: ["target_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          donation_date: string
          donor_id: string
          id: string
          mode: string
          notes: string | null
          org_id: string
          proof_url: string | null
          receipt_no: string | null
          recorded_by: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          donation_date?: string
          donor_id: string
          id?: string
          mode?: string
          notes?: string | null
          org_id: string
          proof_url?: string | null
          receipt_no?: string | null
          recorded_by?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          donation_date?: string
          donor_id?: string
          id?: string
          mode?: string
          notes?: string | null
          org_id?: string
          proof_url?: string | null
          receipt_no?: string | null
          recorded_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      donors: {
        Row: {
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          linked_member_id: string | null
          momento_issued: boolean
          momento_issued_at: string | null
          notes: string | null
          org_id: string
          phone: string | null
          photo_url: string | null
          status: string
          total_donated: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          linked_member_id?: string | null
          momento_issued?: boolean
          momento_issued_at?: string | null
          notes?: string | null
          org_id: string
          phone?: string | null
          photo_url?: string | null
          status?: string
          total_donated?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          linked_member_id?: string | null
          momento_issued?: boolean
          momento_issued_at?: string | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          photo_url?: string | null
          status?: string
          total_donated?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donors_linked_member_id_fkey"
            columns: ["linked_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donors_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      mbr_global_ads: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      member_leave_requests: {
        Row: {
          created_at: string
          id: string
          member_id: string
          org_id: string
          reason: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          org_id: string
          reason: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          org_id?: string
          reason?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_leave_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_leave_requests_org_id_fkey"
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
          proof_url: string | null
          reason: string
          reject_reason: string | null
          requested_amount: number
          reviewed_at: string | null
          reviewed_by: string | null
          signature_data_url: string | null
          status: string
          surety_decline_reason: string | null
          surety_member_code: string | null
          surety_member_id: string | null
          surety_responded_at: string | null
          surety_signature_url: string | null
          surety_status: string
          tenure_months: number | null
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
          proof_url?: string | null
          reason: string
          reject_reason?: string | null
          requested_amount: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature_data_url?: string | null
          status?: string
          surety_decline_reason?: string | null
          surety_member_code?: string | null
          surety_member_id?: string | null
          surety_responded_at?: string | null
          surety_signature_url?: string | null
          surety_status?: string
          tenure_months?: number | null
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
          proof_url?: string | null
          reason?: string
          reject_reason?: string | null
          requested_amount?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature_data_url?: string | null
          status?: string
          surety_decline_reason?: string | null
          surety_member_code?: string | null
          surety_member_id?: string | null
          surety_responded_at?: string | null
          surety_signature_url?: string | null
          surety_status?: string
          tenure_months?: number | null
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
          borrower_signature_url: string | null
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
          surety_code: string | null
          surety_name: string | null
          surety_phone: string | null
          surety_signature_url: string | null
          updated_at: string
        }
        Insert: {
          borrower_signature_url?: string | null
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
          surety_code?: string | null
          surety_name?: string | null
          surety_phone?: string | null
          surety_signature_url?: string | null
          updated_at?: string
        }
        Update: {
          borrower_signature_url?: string | null
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
          surety_code?: string | null
          surety_name?: string | null
          surety_phone?: string | null
          surety_signature_url?: string | null
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
          introduced_by_name: string | null
          introducer_id: string | null
          introducer_member_id: string | null
          is_active: boolean
          is_committee: boolean
          joined_date: string | null
          last_name: string | null
          member_code: string | null
          member_code_locked: boolean
          membership_receipt_url: string | null
          name: string
          org_id: string
          phone: string | null
          photo_url: string | null
          pin_code: string | null
          preferred_lang: string | null
          reviewed_at: string | null
          signature_url: string | null
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
          introduced_by_name?: string | null
          introducer_id?: string | null
          introducer_member_id?: string | null
          is_active?: boolean
          is_committee?: boolean
          joined_date?: string | null
          last_name?: string | null
          member_code?: string | null
          member_code_locked?: boolean
          membership_receipt_url?: string | null
          name: string
          org_id: string
          phone?: string | null
          photo_url?: string | null
          pin_code?: string | null
          preferred_lang?: string | null
          reviewed_at?: string | null
          signature_url?: string | null
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
          introduced_by_name?: string | null
          introducer_id?: string | null
          introducer_member_id?: string | null
          is_active?: boolean
          is_committee?: boolean
          joined_date?: string | null
          last_name?: string | null
          member_code?: string | null
          member_code_locked?: boolean
          membership_receipt_url?: string | null
          name?: string
          org_id?: string
          phone?: string | null
          photo_url?: string | null
          pin_code?: string | null
          preferred_lang?: string | null
          reviewed_at?: string | null
          signature_url?: string | null
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
      org_activities: {
        Row: {
          actual_expense: number
          allocated_budget: number
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_name: string
          id: string
          org_id: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_expense?: number
          allocated_budget?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_name: string
          id?: string
          org_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_expense?: number
          allocated_budget?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_name?: string
          id?: string
          org_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_activities_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_election_nominations: {
        Row: {
          created_at: string
          election_id: string
          id: string
          member_id: string
          org_id: string
          position: string
          review_notes: string | null
          statement: string | null
          status: Database["public"]["Enums"]["nomination_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          election_id: string
          id?: string
          member_id: string
          org_id: string
          position: string
          review_notes?: string | null
          statement?: string | null
          status?: Database["public"]["Enums"]["nomination_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          election_id?: string
          id?: string
          member_id?: string
          org_id?: string
          position?: string
          review_notes?: string | null
          statement?: string | null
          status?: Database["public"]["Enums"]["nomination_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_election_nominations_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "org_elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_election_nominations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_election_nominations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_election_votes: {
        Row: {
          created_at: string
          election_id: string
          id: string
          nominee_id: string
          org_id: string
          position: string
          voter_member_id: string
        }
        Insert: {
          created_at?: string
          election_id: string
          id?: string
          nominee_id: string
          org_id: string
          position: string
          voter_member_id: string
        }
        Update: {
          created_at?: string
          election_id?: string
          id?: string
          nominee_id?: string
          org_id?: string
          position?: string
          voter_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_election_votes_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "org_elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_election_votes_nominee_id_fkey"
            columns: ["nominee_id"]
            isOneToOne: false
            referencedRelation: "org_election_nominations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_election_votes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_election_votes_voter_member_id_fkey"
            columns: ["voter_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      org_elections: {
        Row: {
          created_at: string
          description: string | null
          election_date: string
          id: string
          nomination_deadline: string
          org_id: string
          positions: string[]
          status: Database["public"]["Enums"]["election_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          election_date: string
          id?: string
          nomination_deadline: string
          org_id: string
          positions?: string[]
          status?: Database["public"]["Enums"]["election_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          election_date?: string
          id?: string
          nomination_deadline?: string
          org_id?: string
          positions?: string[]
          status?: Database["public"]["Enums"]["election_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_elections_org_id_fkey"
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
          base_amount: number | null
          created_at: string
          created_by: string | null
          currency: string
          entry_date: string
          exchange_rate: number
          expense_type: Database["public"]["Enums"]["expense_type"]
          id: string
          org_id: string
          recipient_name: string
          remarks: string | null
          updated_at: string
          wallet: Database["public"]["Enums"]["wallet_type"]
          wallet_account_id: string | null
        }
        Insert: {
          amount: number
          base_amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          entry_date?: string
          exchange_rate?: number
          expense_type: Database["public"]["Enums"]["expense_type"]
          id?: string
          org_id: string
          recipient_name: string
          remarks?: string | null
          updated_at?: string
          wallet?: Database["public"]["Enums"]["wallet_type"]
          wallet_account_id?: string | null
        }
        Update: {
          amount?: number
          base_amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          entry_date?: string
          exchange_rate?: number
          expense_type?: Database["public"]["Enums"]["expense_type"]
          id?: string
          org_id?: string
          recipient_name?: string
          remarks?: string | null
          updated_at?: string
          wallet?: Database["public"]["Enums"]["wallet_type"]
          wallet_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_expenses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_expenses_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      org_income: {
        Row: {
          amount: number
          base_amount: number | null
          created_at: string
          created_by: string | null
          currency: string
          entry_date: string
          exchange_rate: number
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
          wallet_account_id: string | null
        }
        Insert: {
          amount: number
          base_amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          entry_date?: string
          exchange_rate?: number
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
          wallet_account_id?: string | null
        }
        Update: {
          amount?: number
          base_amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          entry_date?: string
          exchange_rate?: number
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
          wallet_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_income_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_income_wallet_account_id_fkey"
            columns: ["wallet_account_id"]
            isOneToOne: false
            referencedRelation: "wallet_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      org_meetings: {
        Row: {
          absent_member_ids: string[]
          agenda: string | null
          attended_member_ids: string[]
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          meeting_link: string | null
          meeting_type: string
          notes: string | null
          org_id: string
          scheduled_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          absent_member_ids?: string[]
          agenda?: string | null
          attended_member_ids?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          meeting_type?: string
          notes?: string | null
          org_id: string
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          absent_member_ids?: string[]
          agenda?: string | null
          attended_member_ids?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          meeting_link?: string | null
          meeting_type?: string
          notes?: string | null
          org_id?: string
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_meetings_org_id_fkey"
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
          description_en: string | null
          event_date: string
          id: string
          org_id: string
          photo_url: string | null
          title: string
          title_en: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_en?: string | null
          event_date: string
          id?: string
          org_id: string
          photo_url?: string | null
          title: string
          title_en?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_en?: string | null
          event_date?: string
          id?: string
          org_id?: string
          photo_url?: string | null
          title?: string
          title_en?: string | null
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
      org_resolutions: {
        Row: {
          approved_member_ids: string[]
          created_at: string
          created_by: string | null
          decision_date: string
          description: string | null
          id: string
          meeting_id: string | null
          opposed_member_ids: string[]
          org_id: string
          resolution_no: string
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          approved_member_ids?: string[]
          created_at?: string
          created_by?: string | null
          decision_date?: string
          description?: string | null
          id?: string
          meeting_id?: string | null
          opposed_member_ids?: string[]
          org_id: string
          resolution_no: string
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          approved_member_ids?: string[]
          created_at?: string
          created_by?: string | null
          decision_date?: string
          description?: string | null
          id?: string
          meeting_id?: string | null
          opposed_member_ids?: string[]
          org_id?: string
          resolution_no?: string
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_resolutions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "org_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_resolutions_org_id_fkey"
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
          category_en: string | null
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          position: number
          text: string
          text_en: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          category_en?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          position?: number
          text: string
          text_en?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          category_en?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          position?: number
          text?: string
          text_en?: string | null
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
          ad_banners: Json
          address: string | null
          admin_aadhaar_url: string | null
          admin_designation: string | null
          admin_name: string | null
          admin_user_id: string
          approval_notes: string | null
          approval_status: Database["public"]["Enums"]["org_approval_status"]
          approved_at: string | null
          approved_by: string | null
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_ifsc: string | null
          bank_name: string | null
          committee_term_years: number
          created_at: string
          donor_recognition_threshold: number
          election_mode_enabled: boolean
          email: string
          founders: Json
          gov_reg_number: string | null
          id: string
          id_card_design: Json | null
          is_gov_registered: boolean
          letter_code: string | null
          logo_url: string | null
          name: string
          name_en: string | null
          org_code: string
          pan_card_url: string | null
          phone: string | null
          president_name: string | null
          president_signature_url: string | null
          registration_certificate_url: string | null
          slogan: string | null
          subscription_expires_at: string
          theme_color: string
          theme_font: string
          theme_settings: Json
          updated_at: string
        }
        Insert: {
          ad_banners?: Json
          address?: string | null
          admin_aadhaar_url?: string | null
          admin_designation?: string | null
          admin_name?: string | null
          admin_user_id: string
          approval_notes?: string | null
          approval_status?: Database["public"]["Enums"]["org_approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          committee_term_years?: number
          created_at?: string
          donor_recognition_threshold?: number
          election_mode_enabled?: boolean
          email: string
          founders?: Json
          gov_reg_number?: string | null
          id?: string
          id_card_design?: Json | null
          is_gov_registered?: boolean
          letter_code?: string | null
          logo_url?: string | null
          name: string
          name_en?: string | null
          org_code: string
          pan_card_url?: string | null
          phone?: string | null
          president_name?: string | null
          president_signature_url?: string | null
          registration_certificate_url?: string | null
          slogan?: string | null
          subscription_expires_at?: string
          theme_color?: string
          theme_font?: string
          theme_settings?: Json
          updated_at?: string
        }
        Update: {
          ad_banners?: Json
          address?: string | null
          admin_aadhaar_url?: string | null
          admin_designation?: string | null
          admin_name?: string | null
          admin_user_id?: string
          approval_notes?: string | null
          approval_status?: Database["public"]["Enums"]["org_approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          committee_term_years?: number
          created_at?: string
          donor_recognition_threshold?: number
          election_mode_enabled?: boolean
          email?: string
          founders?: Json
          gov_reg_number?: string | null
          id?: string
          id_card_design?: Json | null
          is_gov_registered?: boolean
          letter_code?: string | null
          logo_url?: string | null
          name?: string
          name_en?: string | null
          org_code?: string
          pan_card_url?: string | null
          phone?: string | null
          president_name?: string | null
          president_signature_url?: string | null
          registration_certificate_url?: string | null
          slogan?: string | null
          subscription_expires_at?: string
          theme_color?: string
          theme_font?: string
          theme_settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          org_id: string
          paid_on: string
          payment_method: string
          period_end: string
          period_start: string | null
          receipt_number: string
          recorded_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          org_id: string
          paid_on?: string
          payment_method?: string
          period_end: string
          period_start?: string | null
          receipt_number: string
          recorded_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          org_id?: string
          paid_on?: string
          payment_method?: string
          period_end?: string
          period_start?: string | null
          receipt_number?: string
          recorded_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      varadhi_admin_requests: {
        Row: {
          aadhaar_url: string | null
          created_at: string
          district: string | null
          email: string | null
          full_name: string
          id: string
          mandal: string | null
          message: string | null
          phone: string | null
          photo_url: string | null
          requested_level: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aadhaar_url?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          full_name: string
          id?: string
          mandal?: string | null
          message?: string | null
          phone?: string | null
          photo_url?: string | null
          requested_level?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aadhaar_url?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          full_name?: string
          id?: string
          mandal?: string | null
          message?: string | null
          phone?: string | null
          photo_url?: string | null
          requested_level?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      varadhi_area_admins: {
        Row: {
          assigned_by: string | null
          created_at: string
          district: string | null
          id: string
          is_active: boolean
          level: string
          mandal: string | null
          parent_admin_id: string | null
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_active?: boolean
          level: string
          mandal?: string | null
          parent_admin_id?: string | null
          state: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_active?: boolean
          level?: string
          mandal?: string | null
          parent_admin_id?: string | null
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "varadhi_area_admins_parent_admin_id_fkey"
            columns: ["parent_admin_id"]
            isOneToOne: false
            referencedRelation: "varadhi_area_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      varadhi_clicks: {
        Row: {
          buyer_id: string | null
          id: string
          target_id: string
          target_type: string
          ts: string
        }
        Insert: {
          buyer_id?: string | null
          id?: string
          target_id: string
          target_type: string
          ts?: string
        }
        Update: {
          buyer_id?: string | null
          id?: string
          target_id?: string
          target_type?: string
          ts?: string
        }
        Relationships: []
      }
      varadhi_listings: {
        Row: {
          blood_group: string | null
          category: string
          city: string | null
          click_count: number
          contact_phone: string | null
          created_at: string
          description: string | null
          district: string | null
          experience: string | null
          house_no: string | null
          id: string
          images: Json
          item_condition: string | null
          lat: number | null
          lng: number | null
          mandal: string | null
          pickup_location: string | null
          pincode: string | null
          post_type: string
          price: number | null
          seller_id: string
          service_area: string | null
          service_mode: string | null
          service_timing: string | null
          state: string | null
          stock_qty: string | null
          stock_status: string
          street: string | null
          sub_category: string | null
          taluk: string | null
          title: string
          unit: string | null
          updated_at: string
          village: string | null
        }
        Insert: {
          blood_group?: string | null
          category: string
          city?: string | null
          click_count?: number
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          experience?: string | null
          house_no?: string | null
          id?: string
          images?: Json
          item_condition?: string | null
          lat?: number | null
          lng?: number | null
          mandal?: string | null
          pickup_location?: string | null
          pincode?: string | null
          post_type?: string
          price?: number | null
          seller_id: string
          service_area?: string | null
          service_mode?: string | null
          service_timing?: string | null
          state?: string | null
          stock_qty?: string | null
          stock_status?: string
          street?: string | null
          sub_category?: string | null
          taluk?: string | null
          title: string
          unit?: string | null
          updated_at?: string
          village?: string | null
        }
        Update: {
          blood_group?: string | null
          category?: string
          city?: string | null
          click_count?: number
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          experience?: string | null
          house_no?: string | null
          id?: string
          images?: Json
          item_condition?: string | null
          lat?: number | null
          lng?: number | null
          mandal?: string | null
          pickup_location?: string | null
          pincode?: string | null
          post_type?: string
          price?: number | null
          seller_id?: string
          service_area?: string | null
          service_mode?: string | null
          service_timing?: string | null
          state?: string | null
          stock_qty?: string | null
          stock_status?: string
          street?: string | null
          sub_category?: string | null
          taluk?: string | null
          title?: string
          unit?: string | null
          updated_at?: string
          village?: string | null
        }
        Relationships: []
      }
      varadhi_point_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          note: string | null
          points: number
          ref_id: string | null
          ref_type: string | null
          user_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          note?: string | null
          points?: number
          ref_id?: string | null
          ref_type?: string | null
          user_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          note?: string | null
          points?: number
          ref_id?: string | null
          ref_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      varadhi_point_settings: {
        Row: {
          enforce_limit: boolean
          free_monthly_points: number
          id: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enforce_limit?: boolean
          free_monthly_points?: number
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enforce_limit?: boolean
          free_monthly_points?: number
          id?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      varadhi_profiles: {
        Row: {
          aadhaar_url: string | null
          address: string | null
          address_type: string | null
          business_name: string | null
          certificates_urls: string[] | null
          city: string | null
          created_at: string
          district: string | null
          experience_years: number | null
          full_name: string
          house_number: string | null
          lat: number | null
          license_url: string | null
          lng: number | null
          mandal: string | null
          occupation: string | null
          phone: string | null
          photo_url: string | null
          primary_role: string
          provider_specialty: string | null
          provider_sub_type: string | null
          shop_name: string | null
          state: string | null
          store_photo_url: string | null
          updated_at: string
          user_id: string
          vehicle_photo_url: string | null
          verification_notes: string | null
          verification_status: string
        }
        Insert: {
          aadhaar_url?: string | null
          address?: string | null
          address_type?: string | null
          business_name?: string | null
          certificates_urls?: string[] | null
          city?: string | null
          created_at?: string
          district?: string | null
          experience_years?: number | null
          full_name: string
          house_number?: string | null
          lat?: number | null
          license_url?: string | null
          lng?: number | null
          mandal?: string | null
          occupation?: string | null
          phone?: string | null
          photo_url?: string | null
          primary_role?: string
          provider_specialty?: string | null
          provider_sub_type?: string | null
          shop_name?: string | null
          state?: string | null
          store_photo_url?: string | null
          updated_at?: string
          user_id: string
          vehicle_photo_url?: string | null
          verification_notes?: string | null
          verification_status?: string
        }
        Update: {
          aadhaar_url?: string | null
          address?: string | null
          address_type?: string | null
          business_name?: string | null
          certificates_urls?: string[] | null
          city?: string | null
          created_at?: string
          district?: string | null
          experience_years?: number | null
          full_name?: string
          house_number?: string | null
          lat?: number | null
          license_url?: string | null
          lng?: number | null
          mandal?: string | null
          occupation?: string | null
          phone?: string | null
          photo_url?: string | null
          primary_role?: string
          provider_specialty?: string | null
          provider_sub_type?: string | null
          shop_name?: string | null
          state?: string | null
          store_photo_url?: string | null
          updated_at?: string
          user_id?: string
          vehicle_photo_url?: string | null
          verification_notes?: string | null
          verification_status?: string
        }
        Relationships: []
      }
      varadhi_providers: {
        Row: {
          availability_status: string
          city: string | null
          click_count: number
          contact_phone: string | null
          created_at: string
          description: string | null
          id: string
          lat: number | null
          lng: number | null
          photo_url: string | null
          price_per_km: number | null
          provider_type: string
          rating_avg: number
          service_areas: string | null
          sub_type: string
          subscription_expires_at: string | null
          title: string
          updated_at: string
          user_id: string
          vehicle_details: string | null
        }
        Insert: {
          availability_status?: string
          city?: string | null
          click_count?: number
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          photo_url?: string | null
          price_per_km?: number | null
          provider_type: string
          rating_avg?: number
          service_areas?: string | null
          sub_type: string
          subscription_expires_at?: string | null
          title: string
          updated_at?: string
          user_id: string
          vehicle_details?: string | null
        }
        Update: {
          availability_status?: string
          city?: string | null
          click_count?: number
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          photo_url?: string | null
          price_per_km?: number | null
          provider_type?: string
          rating_avg?: number
          service_areas?: string | null
          sub_type?: string
          subscription_expires_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          vehicle_details?: string | null
        }
        Relationships: []
      }
      varadhi_rewards: {
        Row: {
          created_at: string
          id: string
          note: string | null
          points: number
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          points: number
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          points?: number
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      varadhi_subscriptions: {
        Row: {
          amount: number
          created_at: string
          expires_at: string
          id: string
          payment_ref: string | null
          plan: string
          starts_at: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          expires_at: string
          id?: string
          payment_ref?: string | null
          plan: string
          starts_at?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string
          id?: string
          payment_ref?: string | null
          plan?: string
          starts_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_accounts: {
        Row: {
          created_at: string
          currency: string
          id: string
          is_active: boolean
          name: string
          org_id: string
          updated_at: string
          wallet_type: Database["public"]["Enums"]["wallet_type"]
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          name: string
          org_id: string
          updated_at?: string
          wallet_type?: Database["public"]["Enums"]["wallet_type"]
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string
          updated_at?: string
          wallet_type?: Database["public"]["Enums"]["wallet_type"]
        }
        Relationships: [
          {
            foreignKeyName: "wallet_accounts_org_id_fkey"
            columns: ["org_id"]
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
      admin_update_member_code: {
        Args: { _member_id: string; _new_code: string }
        Returns: {
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
          introduced_by_name: string | null
          introducer_id: string | null
          introducer_member_id: string | null
          is_active: boolean
          is_committee: boolean
          joined_date: string | null
          last_name: string | null
          member_code: string | null
          member_code_locked: boolean
          membership_receipt_url: string | null
          name: string
          org_id: string
          phone: string | null
          photo_url: string | null
          pin_code: string | null
          preferred_lang: string | null
          reviewed_at: string | null
          signature_url: string | null
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string | null
          village: string | null
        }
        SetofOptions: {
          from: "*"
          to: "members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_leave_request: {
        Args: { _notes?: string; _request_id: string }
        Returns: undefined
      }
      can_edit_accounts: { Args: { _org_id: string }; Returns: boolean }
      can_edit_events: { Args: { _org_id: string }; Returns: boolean }
      can_edit_org: { Args: { _org_id: string }; Returns: boolean }
      can_edit_rules: { Args: { _org_id: string }; Returns: boolean }
      can_manage_committee: { Args: { _org_id: string }; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      finalize_chit_auction: {
        Args: { _auction_id: string; _org_id: string }
        Returns: {
          auction_closed: boolean
          chit_value: number
          close_at: string | null
          commission_pct: number
          consents: Json
          created_at: string
          current_month: number
          foreman_free_month: number | null
          foreman_included: boolean
          foreman_mode: string
          group_name: string
          id: string
          live_group_name: string | null
          org_id: string
          participants: Json
          past_winners: Json
          start_date: string | null
          status: string
          terms: string | null
          total_members: number | null
          total_months: number
          turn_end: string | null
          turn_start: string | null
          updated_at: string
          updated_by: string | null
          winner_amount: number | null
          winner_bid_id: string | null
          winner_dividend: number | null
          winner_member_code: string | null
          winner_member_id: string | null
          winner_member_name: string | null
          winner_net: number | null
        }
        SetofOptions: {
          from: "*"
          to: "auction_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      is_disciplinary_member: { Args: { _org_id: string }; Returns: boolean }
      is_org_admin: { Args: { _org_id: string }; Returns: boolean }
      is_org_committee: { Args: { _org_id: string }; Returns: boolean }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      org_admin_update_member_code: {
        Args: { _member_id: string; _new_code: string }
        Returns: {
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
          introduced_by_name: string | null
          introducer_id: string | null
          introducer_member_id: string | null
          is_active: boolean
          is_committee: boolean
          joined_date: string | null
          last_name: string | null
          member_code: string | null
          member_code_locked: boolean
          membership_receipt_url: string | null
          name: string
          org_id: string
          phone: string | null
          photo_url: string | null
          pin_code: string | null
          preferred_lang: string | null
          reviewed_at: string | null
          signature_url: string | null
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string | null
          village: string | null
        }
        SetofOptions: {
          from: "*"
          to: "members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reject_leave_request: {
        Args: { _notes?: string; _request_id: string }
        Returns: undefined
      }
      reset_chit_month: {
        Args: { _auction_id: string; _org_id: string }
        Returns: {
          auction_closed: boolean
          chit_value: number
          close_at: string | null
          commission_pct: number
          consents: Json
          created_at: string
          current_month: number
          foreman_free_month: number | null
          foreman_included: boolean
          foreman_mode: string
          group_name: string
          id: string
          live_group_name: string | null
          org_id: string
          participants: Json
          past_winners: Json
          start_date: string | null
          status: string
          terms: string | null
          total_members: number | null
          total_months: number
          turn_end: string | null
          turn_start: string | null
          updated_at: string
          updated_by: string | null
          winner_amount: number | null
          winner_bid_id: string | null
          winner_dividend: number | null
          winner_member_code: string | null
          winner_member_id: string | null
          winner_member_name: string | null
          winner_net: number | null
        }
        SetofOptions: {
          from: "*"
          to: "auction_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_chit_bid: {
        Args: { _amount: number; _auction_id?: string; _org_id: string }
        Returns: Json
      }
      submit_chit_consent: {
        Args: { _org_id: string; _signature_tag: string }
        Returns: {
          auction_closed: boolean
          chit_value: number
          close_at: string | null
          commission_pct: number
          consents: Json
          created_at: string
          current_month: number
          foreman_free_month: number | null
          foreman_included: boolean
          foreman_mode: string
          group_name: string
          id: string
          live_group_name: string | null
          org_id: string
          participants: Json
          past_winners: Json
          start_date: string | null
          status: string
          terms: string | null
          total_members: number | null
          total_months: number
          turn_end: string | null
          turn_start: string | null
          updated_at: string
          updated_by: string | null
          winner_amount: number | null
          winner_bid_id: string | null
          winner_dividend: number | null
          winner_member_code: string | null
          winner_member_id: string | null
          winner_member_name: string | null
          winner_net: number | null
        }
        SetofOptions: {
          from: "*"
          to: "auction_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      varadhi_award_point: {
        Args: {
          _event_type: string
          _ref_id?: string
          _ref_type?: string
          _user_id: string
        }
        Returns: undefined
      }
      varadhi_log_click: {
        Args: { _target_id: string; _target_type: string }
        Returns: undefined
      }
      varadhi_month_points: { Args: { _user_id: string }; Returns: number }
    }
    Enums: {
      app_role: "mbr_admin" | "varadhi_admin"
      committee_role:
        | "president"
        | "vice_president"
        | "advisor"
        | "treasurer"
        | "executive"
        | "worker"
      election_status:
        | "scheduled"
        | "nominations_open"
        | "voting_open"
        | "completed"
        | "cancelled"
      expense_type: "charity" | "office" | "meeting" | "misc"
      income_type:
        | "registration_fee"
        | "donation"
        | "other"
        | "loan_principal"
        | "loan_interest"
      member_status: "pending" | "approved" | "rejected"
      nomination_status: "pending" | "approved" | "rejected" | "withdrawn"
      org_approval_status: "pending" | "approved" | "rejected" | "suspended"
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
      app_role: ["mbr_admin", "varadhi_admin"],
      committee_role: [
        "president",
        "vice_president",
        "advisor",
        "treasurer",
        "executive",
        "worker",
      ],
      election_status: [
        "scheduled",
        "nominations_open",
        "voting_open",
        "completed",
        "cancelled",
      ],
      expense_type: ["charity", "office", "meeting", "misc"],
      income_type: [
        "registration_fee",
        "donation",
        "other",
        "loan_principal",
        "loan_interest",
      ],
      member_status: ["pending", "approved", "rejected"],
      nomination_status: ["pending", "approved", "rejected", "withdrawn"],
      org_approval_status: ["pending", "approved", "rejected", "suspended"],
      wallet_type: ["bank", "accountant", "president"],
    },
  },
} as const

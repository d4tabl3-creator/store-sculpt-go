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
      commerce_event_log: {
        Row: {
          created_at: string
          detail: Json
          direction: string
          event: string
          id: string
          level: string
          provider: string | null
          store_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: Json
          direction?: string
          event: string
          id?: string
          level?: string
          provider?: string | null
          store_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: Json
          direction?: string
          event?: string
          id?: string
          level?: string
          provider?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commerce_event_log_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_order_bindings: {
        Row: {
          created_at: string
          external_order_id: string | null
          fulfillment_status: string
          id: string
          last_synced_at: string | null
          order_id: string
          provider: string
          store_id: string
          sync_error: string | null
          sync_status: string
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_order_id?: string | null
          fulfillment_status?: string
          id?: string
          last_synced_at?: string | null
          order_id: string
          provider: string
          store_id: string
          sync_error?: string | null
          sync_status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_order_id?: string | null
          fulfillment_status?: string
          id?: string
          last_synced_at?: string | null
          order_id?: string
          provider?: string
          store_id?: string
          sync_error?: string | null
          sync_status?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_order_bindings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_order_bindings_provider_fkey"
            columns: ["provider"]
            isOneToOne: false
            referencedRelation: "commerce_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_order_bindings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_product_bindings: {
        Row: {
          created_at: string
          external_inventory_item_id: string | null
          external_product_id: string | null
          external_variant_id: string | null
          id: string
          last_synced_at: string | null
          product_id: string
          provider: string
          store_id: string
          sync_error: string | null
          sync_hash: string | null
          sync_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_inventory_item_id?: string | null
          external_product_id?: string | null
          external_variant_id?: string | null
          id?: string
          last_synced_at?: string | null
          product_id: string
          provider: string
          store_id: string
          sync_error?: string | null
          sync_hash?: string | null
          sync_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_inventory_item_id?: string | null
          external_product_id?: string | null
          external_variant_id?: string | null
          id?: string
          last_synced_at?: string | null
          product_id?: string
          provider?: string
          store_id?: string
          sync_error?: string | null
          sync_hash?: string | null
          sync_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_product_bindings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "store_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_product_bindings_provider_fkey"
            columns: ["provider"]
            isOneToOne: false
            referencedRelation: "commerce_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_product_bindings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_providers: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          label: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id: string
          label: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string
        }
        Relationships: []
      }
      commerce_store_bindings: {
        Row: {
          attempts: number
          created_at: string
          external_domain: string | null
          external_store_id: string | null
          id: string
          last_synced_at: string | null
          owner_id: string
          provider: string
          provisioning_error: string | null
          provisioning_progress: number
          provisioning_status: string
          provisioning_step: string
          ready_at: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          external_domain?: string | null
          external_store_id?: string | null
          id?: string
          last_synced_at?: string | null
          owner_id: string
          provider?: string
          provisioning_error?: string | null
          provisioning_progress?: number
          provisioning_status?: string
          provisioning_step?: string
          ready_at?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          external_domain?: string | null
          external_store_id?: string | null
          id?: string
          last_synced_at?: string | null
          owner_id?: string
          provider?: string
          provisioning_error?: string | null
          provisioning_progress?: number
          provisioning_status?: string
          provisioning_step?: string
          ready_at?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_store_bindings_provider_fkey"
            columns: ["provider"]
            isOneToOne: false
            referencedRelation: "commerce_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_store_bindings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_store_credentials: {
        Row: {
          admin_token: string | null
          api_version: string | null
          created_at: string
          extra: Json
          provider: string
          store_id: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          admin_token?: string | null
          api_version?: string | null
          created_at?: string
          extra?: Json
          provider: string
          store_id: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          admin_token?: string | null
          api_version?: string | null
          created_at?: string
          extra?: Json
          provider?: string
          store_id?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commerce_store_credentials_provider_fkey"
            columns: ["provider"]
            isOneToOne: false
            referencedRelation: "commerce_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_store_credentials_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_sync_jobs: {
        Row: {
          attempts: number
          created_at: string
          id: string
          kind: string
          last_error: string | null
          max_attempts: number
          payload: Json
          provider: string
          run_after: string
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          kind: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json
          provider: string
          run_after?: string
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          kind?: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json
          provider?: string
          run_after?: string
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_sync_jobs_provider_fkey"
            columns: ["provider"]
            isOneToOne: false
            referencedRelation: "commerce_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commerce_sync_jobs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_ledger: {
        Row: {
          commission_cents: number
          created_at: string
          gross_cents: number
          id: string
          net_owed_cents: number
          order_id: string
          owner_id: string
          paid_at: string | null
          payout_ref: string | null
          status: string
          store_id: string
        }
        Insert: {
          commission_cents: number
          created_at?: string
          gross_cents: number
          id?: string
          net_owed_cents: number
          order_id: string
          owner_id: string
          paid_at?: string | null
          payout_ref?: string | null
          status?: string
          store_id: string
        }
        Update: {
          commission_cents?: number
          created_at?: string
          gross_cents?: number
          id?: string
          net_owed_cents?: number
          order_id?: string
          owner_id?: string
          paid_at?: string | null
          payout_ref?: string | null
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "demo_coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_coupons: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          days_valid: number
          expires_at: string | null
          id: string
          max_uses: number
          notes: string | null
          plan: string
          updated_at: string
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          days_valid?: number
          expires_at?: string | null
          id?: string
          max_uses?: number
          notes?: string | null
          plan: string
          updated_at?: string
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          days_valid?: number
          expires_at?: string | null
          id?: string
          max_uses?: number
          notes?: string | null
          plan?: string
          updated_at?: string
          uses?: number
        }
        Relationships: []
      }
      merchant_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          source: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan: string
          source?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          source?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      processed_stripe_events: {
        Row: {
          id: string
          received_at: string
        }
        Insert: {
          id: string
          received_at?: string
        }
        Update: {
          id?: string
          received_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bank_name: string | null
          beneficiary_name: string | null
          clabe: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          bank_name?: string | null
          beneficiary_name?: string | null
          clabe?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          bank_name?: string | null
          beneficiary_name?: string | null
          clabe?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      store_orders: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          items: Json
          notes: string | null
          payment_status: string
          shipping_address: string | null
          status: string
          store_id: string
          stripe_session_id: string | null
          total_cents: number
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          payment_status?: string
          shipping_address?: string | null
          status?: string
          store_id: string
          stripe_session_id?: string | null
          total_cents?: number
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          payment_status?: string
          shipping_address?: string | null
          status?: string
          store_id?: string
          stripe_session_id?: string | null
          total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_payment_settings: {
        Row: {
          created_at: string
          payment_email: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          payment_email?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          payment_email?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_payment_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price_cents: number
          sort_order: number
          source_product_id: string | null
          source_provider: string | null
          source_variant_id: string | null
          stock: number
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price_cents?: number
          sort_order?: number
          source_product_id?: string | null
          source_provider?: string | null
          source_variant_id?: string | null
          stock?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price_cents?: number
          sort_order?: number
          source_product_id?: string | null
          source_provider?: string | null
          source_variant_id?: string | null
          stock?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          id: string
          kit_id: string | null
          logo_url: string | null
          name: string
          niche: string
          owner_id: string
          primary_color: string
          shipping_options: Json
          slug: string
          status: string
          theme: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kit_id?: string | null
          logo_url?: string | null
          name: string
          niche: string
          owner_id: string
          primary_color?: string
          shipping_options?: Json
          slug: string
          status?: string
          theme?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kit_id?: string | null
          logo_url?: string | null
          name?: string
          niche?: string
          owner_id?: string
          primary_color?: string
          shipping_options?: Json
          slug?: string
          status?: string
          theme?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      active_plan_for: { Args: { _user_id: string }; Returns: string }
      apply_paid_order: {
        Args: { _commission_bps?: number; _order_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const

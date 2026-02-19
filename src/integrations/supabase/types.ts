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
      challenge_goals: {
        Row: {
          created_at: string
          deadline: string
          id: string
          monthly_sales_needed: number | null
          pct_ahorro: number | null
          pct_ganancia: number | null
          pct_reposicion: number | null
          target_amount: number
          target_name: string | null
          target_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline: string
          id?: string
          monthly_sales_needed?: number | null
          pct_ahorro?: number | null
          pct_ganancia?: number | null
          pct_reposicion?: number | null
          target_amount?: number
          target_name?: string | null
          target_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline?: string
          id?: string
          monthly_sales_needed?: number | null
          pct_ahorro?: number | null
          pct_ganancia?: number | null
          pct_reposicion?: number | null
          target_amount?: number
          target_name?: string | null
          target_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          id: string
          last_purchase_date: string | null
          name: string
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_purchase_date?: string | null
          name: string
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_purchase_date?: string | null
          name?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          paid: boolean
          paid_date: string | null
          payment_number: number
          purchase_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          paid?: boolean
          paid_date?: string | null
          payment_number: number
          purchase_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          paid?: boolean
          paid_date?: string | null
          payment_number?: number
          purchase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          partner_price: number
          quantity: number
          sale_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          partner_price?: number
          quantity?: number
          sale_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          partner_price?: number
          quantity?: number
          sale_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_goals: {
        Row: {
          created_at: string
          id: string
          month: number
          target_income: number
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          target_income?: number
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          target_income?: number
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          compra_tipo: string | null
          created_at: string
          id: string
          metodologia: string | null
          msg_cobranza: string | null
          msg_saludo: string | null
          msg_venta: string | null
          name: string
          partner_number: string | null
          pct_ahorro: number | null
          pct_ganancia: number | null
          pct_reposicion: number | null
          phone: string | null
          tour_completed: boolean
          updated_at: string
          user_id: string
          visited_finanzas: boolean
          visited_reto: boolean
        }
        Insert: {
          avatar_url?: string | null
          compra_tipo?: string | null
          created_at?: string
          id?: string
          metodologia?: string | null
          msg_cobranza?: string | null
          msg_saludo?: string | null
          msg_venta?: string | null
          name: string
          partner_number?: string | null
          pct_ahorro?: number | null
          pct_ganancia?: number | null
          pct_reposicion?: number | null
          phone?: string | null
          tour_completed?: boolean
          updated_at?: string
          user_id: string
          visited_finanzas?: boolean
          visited_reto?: boolean
        }
        Update: {
          avatar_url?: string | null
          compra_tipo?: string | null
          created_at?: string
          id?: string
          metodologia?: string | null
          msg_cobranza?: string | null
          msg_saludo?: string | null
          msg_venta?: string | null
          name?: string
          partner_number?: string | null
          pct_ahorro?: number | null
          pct_ganancia?: number | null
          pct_reposicion?: number | null
          phone?: string | null
          tour_completed?: boolean
          updated_at?: string
          user_id?: string
          visited_finanzas?: boolean
          visited_reto?: boolean
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount: number
          client_id: string | null
          cost_price: number | null
          created_at: string
          credit_due_date: string | null
          credit_paid: boolean | null
          credit_paid_amount: number | null
          description: string | null
          id: string
          is_credit: boolean
          purchase_date: string
          user_id: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          cost_price?: number | null
          created_at?: string
          credit_due_date?: string | null
          credit_paid?: boolean | null
          credit_paid_amount?: number | null
          description?: string | null
          id?: string
          is_credit?: boolean
          purchase_date?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          cost_price?: number | null
          created_at?: string
          credit_due_date?: string | null
          credit_paid?: boolean | null
          credit_paid_amount?: number | null
          description?: string | null
          id?: string
          is_credit?: boolean
          purchase_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reto_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          day: number
          id: string
          user_id: string
          week: number
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          day: number
          id?: string
          user_id: string
          week: number
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          day?: number
          id?: string
          user_id?: string
          week?: number
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          category: string
          created_at: string
          id: string
          purchase_id: string
          quantity: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          purchase_id: string
          quantity?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          purchase_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_finances: {
        Row: {
          created_at: string
          id: string
          month: number
          product_cost: number
          total_sales: number
          updated_at: string
          user_id: string
          week: number
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          product_cost?: number
          total_sales?: number
          updated_at?: string
          user_id: string
          week: number
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          product_cost?: number
          total_sales?: number
          updated_at?: string
          user_id?: string
          week?: number
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reset_tester_account: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

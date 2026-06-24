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
      cars: {
        Row: {
          brand: string
          color: string | null
          created_at: string
          description: string | null
          fuel_type: string | null
          gallery: Json | null
          id: string
          image_url: string | null
          name: string
          selling_price: number
          status: string
          stock: number
          transmission: string | null
          updated_at: string
          year: number
        }
        Insert: {
          brand: string
          color?: string | null
          created_at?: string
          description?: string | null
          fuel_type?: string | null
          gallery?: Json | null
          id?: string
          image_url?: string | null
          name: string
          selling_price: number
          status?: string
          stock?: number
          transmission?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          brand?: string
          color?: string | null
          created_at?: string
          description?: string | null
          fuel_type?: string | null
          gallery?: Json | null
          id?: string
          image_url?: string | null
          name?: string
          selling_price?: number
          status?: string
          stock?: number
          transmission?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          dealer_address: string | null
          dealer_email: string | null
          dealer_logo: string | null
          dealer_name: string
          dealer_phone: string | null
          dealer_wallet: string | null
          dealer_website: string | null
          id: string
          idr_per_usdc: number
          solana_network: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dealer_address?: string | null
          dealer_email?: string | null
          dealer_logo?: string | null
          dealer_name?: string
          dealer_phone?: string | null
          dealer_wallet?: string | null
          dealer_website?: string | null
          id?: string
          idr_per_usdc?: number
          solana_network?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dealer_address?: string | null
          dealer_email?: string | null
          dealer_logo?: string | null
          dealer_name?: string
          dealer_phone?: string | null
          dealer_wallet?: string | null
          dealer_website?: string | null
          id?: string
          idr_per_usdc?: number
          solana_network?: string
          updated_at?: string
        }
        Relationships: []
      }
      transaction_items: {
        Row: {
          car_id: string
          car_name: string | null
          created_at: string
          id: string
          quantity: number
          transaction_id: string
          unit_price: number
        }
        Insert: {
          car_id: string
          car_name?: string | null
          created_at?: string
          id?: string
          quantity?: number
          transaction_id: string
          unit_price: number
        }
        Update: {
          car_id?: string
          car_name?: string | null
          created_at?: string
          id?: string
          quantity?: number
          transaction_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          created_at: string
          id: string
          invoice_number: string
          payment_status: string
          total_idr: number
          total_usdc: number
          tx_signature: string | null
          updated_at: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_number: string
          payment_status?: string
          total_idr: number
          total_usdc: number
          tx_signature?: string | null
          updated_at?: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_number?: string
          payment_status?: string
          total_idr?: number
          total_usdc?: number
          tx_signature?: string | null
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      wallet_users: {
        Row: {
          created_at: string
          id: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

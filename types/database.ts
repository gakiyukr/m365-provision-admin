export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export interface Database {
  public: {
    Tables: {
      admins: {
        Row: {
          id: string;
          username: string;
          password_hash: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
        };
        Insert: {
          id?: string;
          username: string;
          password_hash: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
        Update: {
          id?: string;
          username?: string;
          password_hash?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
        Relationships: [];
      };
      feature_definitions: {
        Row: {
          id: string;
          key: string;
          name: string;
          description: string;
          is_enabled: boolean;
          is_frontend_visible: boolean;
          is_default_selected: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          description?: string;
          is_enabled?: boolean;
          is_frontend_visible?: boolean;
          is_default_selected?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          name?: string;
          description?: string;
          is_enabled?: boolean;
          is_frontend_visible?: boolean;
          is_default_selected?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      feature_match_rules: {
        Row: {
          id: string;
          feature_id: string;
          match_type: "servicePlanId" | "servicePlanName";
          match_value: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          feature_id: string;
          match_type: "servicePlanId" | "servicePlanName";
          match_value: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          feature_id?: string;
          match_type?: "servicePlanId" | "servicePlanName";
          match_value?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feature_match_rules_feature_id_fkey";
            columns: ["feature_id"];
            isOneToOne: false;
            referencedRelation: "feature_definitions";
            referencedColumns: ["id"];
          },
        ];
      };
      license_templates: {
        Row: {
          id: string;
          key: string;
          name: string;
          description: string;
          is_enabled: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          description?: string;
          is_enabled?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          name?: string;
          description?: string;
          is_enabled?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      license_template_features: {
        Row: {
          id: string;
          template_id: string;
          feature_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          feature_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          feature_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "license_template_features_feature_id_fkey";
            columns: ["feature_id"];
            isOneToOne: false;
            referencedRelation: "feature_definitions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "license_template_features_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "license_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_policies: {
        Row: {
          id: string;
          sku_id: string;
          sku_part_number: string;
          is_assignable: boolean;
          priority: number;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sku_id: string;
          sku_part_number: string;
          is_assignable?: boolean;
          priority?: number;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sku_id?: string;
          sku_part_number?: string;
          is_assignable?: boolean;
          priority?: number;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      service_plan_policies: {
        Row: {
          id: string;
          sku_id: string;
          service_plan_id: string;
          service_plan_name: string;
          is_frontend_selectable: boolean;
          is_forced_keep: boolean;
          is_forbidden: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sku_id: string;
          service_plan_id: string;
          service_plan_name: string;
          is_frontend_selectable?: boolean;
          is_forced_keep?: boolean;
          is_forbidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sku_id?: string;
          service_plan_id?: string;
          service_plan_name?: string;
          is_frontend_selectable?: boolean;
          is_forced_keep?: boolean;
          is_forbidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      graph_subscriptions: {
        Row: {
          id: string;
          sku_id: string;
          sku_part_number: string;
          capability_status: string;
          applies_to: string;
          enabled_units: number;
          warning_units: number;
          consumed_units: number;
          available_units: number;
          raw_payload: Json;
          synced_at: string;
        };
        Insert: {
          id?: string;
          sku_id: string;
          sku_part_number: string;
          capability_status: string;
          applies_to: string;
          enabled_units?: number;
          warning_units?: number;
          consumed_units?: number;
          available_units?: number;
          raw_payload: Json;
          synced_at?: string;
        };
        Update: {
          id?: string;
          sku_id?: string;
          sku_part_number?: string;
          capability_status?: string;
          applies_to?: string;
          enabled_units?: number;
          warning_units?: number;
          consumed_units?: number;
          available_units?: number;
          raw_payload?: Json;
          synced_at?: string;
        };
        Relationships: [];
      };
      graph_service_plans: {
        Row: {
          id: string;
          sku_id: string;
          service_plan_id: string;
          service_plan_name: string;
          provisioning_status: string | null;
          applies_to: string | null;
          raw_payload: Json;
          synced_at: string;
        };
        Insert: {
          id?: string;
          sku_id: string;
          service_plan_id: string;
          service_plan_name: string;
          provisioning_status?: string | null;
          applies_to?: string | null;
          raw_payload: Json;
          synced_at?: string;
        };
        Update: {
          id?: string;
          sku_id?: string;
          service_plan_id?: string;
          service_plan_name?: string;
          provisioning_status?: string | null;
          applies_to?: string | null;
          raw_payload?: Json;
          synced_at?: string;
        };
        Relationships: [];
      };
      graph_sync_jobs: {
        Row: {
          id: string;
          status: string;
          started_at: string;
          finished_at: string | null;
          error_message: string | null;
          stats_payload: Json;
        };
        Insert: {
          id?: string;
          status: string;
          started_at?: string;
          finished_at?: string | null;
          error_message?: string | null;
          stats_payload?: Json;
        };
        Update: {
          id?: string;
          status?: string;
          started_at?: string;
          finished_at?: string | null;
          error_message?: string | null;
          stats_payload?: Json;
        };
        Relationships: [];
      };
      provision_records: {
        Row: {
          id: string;
          admin_id: string | null;
          display_name: string;
          user_name: string;
          mail_nickname: string;
          user_principal_name: string;
          usage_location: string;
          template_id: string | null;
          selected_feature_ids: Json;
          resolved_feature_snapshot: Json;
          selected_sku_id: string | null;
          selected_sku_part_number: string | null;
          kept_service_plans: Json;
          disabled_service_plans: Json;
          graph_user_id: string | null;
          status: string;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          display_name: string;
          user_name: string;
          mail_nickname: string;
          user_principal_name: string;
          usage_location: string;
          template_id?: string | null;
          selected_feature_ids: Json;
          resolved_feature_snapshot: Json;
          selected_sku_id?: string | null;
          selected_sku_part_number?: string | null;
          kept_service_plans?: Json;
          disabled_service_plans?: Json;
          graph_user_id?: string | null;
          status: string;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string | null;
          display_name?: string;
          user_name?: string;
          mail_nickname?: string;
          user_principal_name?: string;
          usage_location?: string;
          template_id?: string | null;
          selected_feature_ids?: Json;
          resolved_feature_snapshot?: Json;
          selected_sku_id?: string | null;
          selected_sku_part_number?: string | null;
          kept_service_plans?: Json;
          disabled_service_plans?: Json;
          graph_user_id?: string | null;
          status?: string;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provision_records_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "admins";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "provision_records_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "license_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          admin_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "admins";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type TableName = keyof Database["public"]["Tables"];

export type TableRow<TName extends TableName> = Database["public"]["Tables"][TName]["Row"];
export type TableInsert<TName extends TableName> = Database["public"]["Tables"][TName]["Insert"];
export type TableUpdate<TName extends TableName> = Database["public"]["Tables"][TName]["Update"];
export type TableRelationships<TName extends TableName> = Database["public"]["Tables"][TName]["Relationships"];

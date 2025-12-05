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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_config: {
        Row: {
          app_domain: string | null
          app_name: string | null
          bkash_app_key: string | null
          bkash_app_password: string | null
          bkash_app_secret: string | null
          bkash_app_username: string | null
          bkash_sandbox_mode: boolean | null
          created_at: string
          data_deletion_callback_url: string | null
          default_currency: string | null
          favicon_url: string | null
          fb_app_id: string | null
          fb_app_secret: string | null
          google_maps_api_key: string | null
          id: string
          ig_app_id: string | null
          ig_app_secret: string | null
          ig_redirect_uri: string | null
          ig_webhook_verify_token: string | null
          logo_url: string | null
          max_image_size_mb: number | null
          paperfly_api_key: string | null
          pathao_client_id: string | null
          pathao_client_secret: string | null
          pathao_password: string | null
          pathao_username: string | null
          piprapay_api_key: string | null
          piprapay_base_url: string | null
          piprapay_create_charge_url: string | null
          piprapay_verify_webhook_url: string | null
          privacy_policy_url: string | null
          redex_api_key: string | null
          site_url: string | null
          steadfast_api_key: string | null
          steadfast_api_secret: string | null
          system_sms_additional_params: Json | null
          system_sms_api_key: string | null
          system_sms_api_key_param: string | null
          system_sms_enabled: boolean | null
          system_sms_gateway_endpoint: string | null
          system_sms_gateway_preset: string | null
          system_sms_gateway_type: string | null
          system_sms_message_param: string | null
          system_sms_phone_param: string | null
          system_sms_sender_id: string | null
          system_sms_sender_id_param: string | null
          system_sms_success_response: string | null
          system_smtp_enabled: boolean | null
          system_smtp_from_email: string | null
          system_smtp_from_name: string | null
          system_smtp_host: string | null
          system_smtp_password: string | null
          system_smtp_port: number | null
          system_smtp_secure: boolean | null
          system_smtp_username: string | null
          terms_of_service_url: string | null
          updated_at: string
          waha_api_key: string | null
          waha_url: string | null
          waha_webhook_secret: string | null
          webhook_callback_url: string | null
          webhook_verify_token: string | null
          whatsapp_access_token: string | null
          whatsapp_app_id: string | null
          whatsapp_app_secret: string | null
          whatsapp_business_account_id: string | null
          whatsapp_config_id: string | null
          whatsapp_phone_number_id: string | null
          whatsapp_webhook_verify_token: string | null
        }
        Insert: {
          app_domain?: string | null
          app_name?: string | null
          bkash_app_key?: string | null
          bkash_app_password?: string | null
          bkash_app_secret?: string | null
          bkash_app_username?: string | null
          bkash_sandbox_mode?: boolean | null
          created_at?: string
          data_deletion_callback_url?: string | null
          default_currency?: string | null
          favicon_url?: string | null
          fb_app_id?: string | null
          fb_app_secret?: string | null
          google_maps_api_key?: string | null
          id?: string
          ig_app_id?: string | null
          ig_app_secret?: string | null
          ig_redirect_uri?: string | null
          ig_webhook_verify_token?: string | null
          logo_url?: string | null
          max_image_size_mb?: number | null
          paperfly_api_key?: string | null
          pathao_client_id?: string | null
          pathao_client_secret?: string | null
          pathao_password?: string | null
          pathao_username?: string | null
          piprapay_api_key?: string | null
          piprapay_base_url?: string | null
          piprapay_create_charge_url?: string | null
          piprapay_verify_webhook_url?: string | null
          privacy_policy_url?: string | null
          redex_api_key?: string | null
          site_url?: string | null
          steadfast_api_key?: string | null
          steadfast_api_secret?: string | null
          system_sms_additional_params?: Json | null
          system_sms_api_key?: string | null
          system_sms_api_key_param?: string | null
          system_sms_enabled?: boolean | null
          system_sms_gateway_endpoint?: string | null
          system_sms_gateway_preset?: string | null
          system_sms_gateway_type?: string | null
          system_sms_message_param?: string | null
          system_sms_phone_param?: string | null
          system_sms_sender_id?: string | null
          system_sms_sender_id_param?: string | null
          system_sms_success_response?: string | null
          system_smtp_enabled?: boolean | null
          system_smtp_from_email?: string | null
          system_smtp_from_name?: string | null
          system_smtp_host?: string | null
          system_smtp_password?: string | null
          system_smtp_port?: number | null
          system_smtp_secure?: boolean | null
          system_smtp_username?: string | null
          terms_of_service_url?: string | null
          updated_at?: string
          waha_api_key?: string | null
          waha_url?: string | null
          waha_webhook_secret?: string | null
          webhook_callback_url?: string | null
          webhook_verify_token?: string | null
          whatsapp_access_token?: string | null
          whatsapp_app_id?: string | null
          whatsapp_app_secret?: string | null
          whatsapp_business_account_id?: string | null
          whatsapp_config_id?: string | null
          whatsapp_phone_number_id?: string | null
          whatsapp_webhook_verify_token?: string | null
        }
        Update: {
          app_domain?: string | null
          app_name?: string | null
          bkash_app_key?: string | null
          bkash_app_password?: string | null
          bkash_app_secret?: string | null
          bkash_app_username?: string | null
          bkash_sandbox_mode?: boolean | null
          created_at?: string
          data_deletion_callback_url?: string | null
          default_currency?: string | null
          favicon_url?: string | null
          fb_app_id?: string | null
          fb_app_secret?: string | null
          google_maps_api_key?: string | null
          id?: string
          ig_app_id?: string | null
          ig_app_secret?: string | null
          ig_redirect_uri?: string | null
          ig_webhook_verify_token?: string | null
          logo_url?: string | null
          max_image_size_mb?: number | null
          paperfly_api_key?: string | null
          pathao_client_id?: string | null
          pathao_client_secret?: string | null
          pathao_password?: string | null
          pathao_username?: string | null
          piprapay_api_key?: string | null
          piprapay_base_url?: string | null
          piprapay_create_charge_url?: string | null
          piprapay_verify_webhook_url?: string | null
          privacy_policy_url?: string | null
          redex_api_key?: string | null
          site_url?: string | null
          steadfast_api_key?: string | null
          steadfast_api_secret?: string | null
          system_sms_additional_params?: Json | null
          system_sms_api_key?: string | null
          system_sms_api_key_param?: string | null
          system_sms_enabled?: boolean | null
          system_sms_gateway_endpoint?: string | null
          system_sms_gateway_preset?: string | null
          system_sms_gateway_type?: string | null
          system_sms_message_param?: string | null
          system_sms_phone_param?: string | null
          system_sms_sender_id?: string | null
          system_sms_sender_id_param?: string | null
          system_sms_success_response?: string | null
          system_smtp_enabled?: boolean | null
          system_smtp_from_email?: string | null
          system_smtp_from_name?: string | null
          system_smtp_host?: string | null
          system_smtp_password?: string | null
          system_smtp_port?: number | null
          system_smtp_secure?: boolean | null
          system_smtp_username?: string | null
          terms_of_service_url?: string | null
          updated_at?: string
          waha_api_key?: string | null
          waha_url?: string | null
          waha_webhook_secret?: string | null
          webhook_callback_url?: string | null
          webhook_verify_token?: string | null
          whatsapp_access_token?: string | null
          whatsapp_app_id?: string | null
          whatsapp_app_secret?: string | null
          whatsapp_business_account_id?: string | null
          whatsapp_config_id?: string | null
          whatsapp_phone_number_id?: string | null
          whatsapp_webhook_verify_token?: string | null
        }
        Relationships: []
      }
      admin_impersonations: {
        Row: {
          admin_user_id: string
          created_at: string
          ended_at: string | null
          expires_at: string
          id: string
          impersonated_user_id: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          ended_at?: string | null
          expires_at: string
          id?: string
          impersonated_user_id: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          impersonated_user_id?: string
        }
        Relationships: []
      }
      backups: {
        Row: {
          backup_date: string
          created_at: string
          created_by: string | null
          file_size: number | null
          filename: string
          id: string
          notes: string | null
          tables_count: number | null
        }
        Insert: {
          backup_date?: string
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          filename: string
          id?: string
          notes?: string | null
          tables_count?: number | null
        }
        Update: {
          backup_date?: string
          created_at?: string
          created_by?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          notes?: string | null
          tables_count?: number | null
        }
        Relationships: []
      }
      canned_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          name: string
          store_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          name: string
          store_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_invoices: {
        Row: {
          advance_amount: number | null
          conversation_id: string
          conversation_type: string
          created_at: string | null
          customer_name: string
          customer_phone: string | null
          customer_platform: string | null
          customer_platform_id: string | null
          discount_amount: number | null
          due_amount: number | null
          id: string
          items: Json
          order_id: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_id: string | null
          payment_type: string
          shipping_address: Json | null
          shipping_charge: number | null
          status: string | null
          store_id: string
          subtotal: number
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          advance_amount?: number | null
          conversation_id: string
          conversation_type: string
          created_at?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_platform?: string | null
          customer_platform_id?: string | null
          discount_amount?: number | null
          due_amount?: number | null
          id?: string
          items?: Json
          order_id?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_id?: string | null
          payment_type?: string
          shipping_address?: Json | null
          shipping_charge?: number | null
          status?: string | null
          store_id: string
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          advance_amount?: number | null
          conversation_id?: string
          conversation_type?: string
          created_at?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_platform?: string | null
          customer_platform_id?: string | null
          discount_amount?: number | null
          due_amount?: number | null
          id?: string
          items?: Json
          order_id?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_id?: string | null
          payment_type?: string
          shipping_address?: Json | null
          shipping_charge?: number | null
          status?: string | null
          store_id?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_flows: {
        Row: {
          created_at: string
          description: string | null
          flow_data: Json
          id: string
          is_active: boolean
          match_type: string
          name: string
          page_id: string
          trigger_keyword: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          flow_data?: Json
          id?: string
          is_active?: boolean
          match_type?: string
          name: string
          page_id: string
          trigger_keyword?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          flow_data?: Json
          id?: string
          is_active?: boolean
          match_type?: string
          name?: string
          page_id?: string
          trigger_keyword?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_flows_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "facebook_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      co_browse_events: {
        Row: {
          created_at: string | null
          event_data: Json
          event_type: string
          id: string
          session_id: string
        }
        Insert: {
          created_at?: string | null
          event_data: Json
          event_type: string
          id?: string
          session_id: string
        }
        Update: {
          created_at?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "co_browse_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "co_browse_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      co_browse_sessions: {
        Row: {
          conversation_id: string
          created_at: string | null
          ended_at: string | null
          id: string
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string
          visitor_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          visitor_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          visitor_id?: string
        }
        Relationships: []
      }
      comment_replies: {
        Row: {
          action_taken: string | null
          comment_id: string
          comment_text: string
          commenter_name: string | null
          commenter_psid: string | null
          created_at: string
          id: string
          page_id: string
          post_id: string
          reply_text: string
          template_id: string | null
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          comment_id: string
          comment_text: string
          commenter_name?: string | null
          commenter_psid?: string | null
          created_at?: string
          id?: string
          page_id: string
          post_id: string
          reply_text: string
          template_id?: string | null
          user_id: string
        }
        Update: {
          action_taken?: string | null
          comment_id?: string
          comment_text?: string
          commenter_name?: string | null
          commenter_psid?: string | null
          created_at?: string
          id?: string
          page_id?: string
          post_id?: string
          reply_text?: string
          template_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      comment_reply_templates: {
        Row: {
          ai_enabled: boolean | null
          ai_prompt: string | null
          blacklist_users: string[] | null
          censored_keywords: string[] | null
          created_at: string
          dm_conditions: Json | null
          dm_delay_seconds: number | null
          dm_message_text: string | null
          exclude_keywords: string[] | null
          full_page_reply_message: string | null
          generic_message: string | null
          id: string
          is_active: boolean
          keyword_filters: Json | null
          keyword_reply_message: string | null
          link_detection_enabled: boolean | null
          match_type: string | null
          max_comment_length: number | null
          min_comment_length: number | null
          moderation_action: string | null
          name: string
          no_match_reply_message: string | null
          page_id: string
          post_id: string | null
          profanity_level: string | null
          reply_mode: string | null
          reply_to_replies: boolean | null
          send_dm_after_reply: boolean | null
          spam_detection_enabled: boolean | null
          template_type: string
          trigger_keywords: string[] | null
          updated_at: string
          user_id: string
          whitelist_users: string[] | null
        }
        Insert: {
          ai_enabled?: boolean | null
          ai_prompt?: string | null
          blacklist_users?: string[] | null
          censored_keywords?: string[] | null
          created_at?: string
          dm_conditions?: Json | null
          dm_delay_seconds?: number | null
          dm_message_text?: string | null
          exclude_keywords?: string[] | null
          full_page_reply_message?: string | null
          generic_message?: string | null
          id?: string
          is_active?: boolean
          keyword_filters?: Json | null
          keyword_reply_message?: string | null
          link_detection_enabled?: boolean | null
          match_type?: string | null
          max_comment_length?: number | null
          min_comment_length?: number | null
          moderation_action?: string | null
          name: string
          no_match_reply_message?: string | null
          page_id: string
          post_id?: string | null
          profanity_level?: string | null
          reply_mode?: string | null
          reply_to_replies?: boolean | null
          send_dm_after_reply?: boolean | null
          spam_detection_enabled?: boolean | null
          template_type: string
          trigger_keywords?: string[] | null
          updated_at?: string
          user_id: string
          whitelist_users?: string[] | null
        }
        Update: {
          ai_enabled?: boolean | null
          ai_prompt?: string | null
          blacklist_users?: string[] | null
          censored_keywords?: string[] | null
          created_at?: string
          dm_conditions?: Json | null
          dm_delay_seconds?: number | null
          dm_message_text?: string | null
          exclude_keywords?: string[] | null
          full_page_reply_message?: string | null
          generic_message?: string | null
          id?: string
          is_active?: boolean
          keyword_filters?: Json | null
          keyword_reply_message?: string | null
          link_detection_enabled?: boolean | null
          match_type?: string | null
          max_comment_length?: number | null
          min_comment_length?: number | null
          moderation_action?: string | null
          name?: string
          no_match_reply_message?: string | null
          page_id?: string
          post_id?: string | null
          profanity_level?: string | null
          reply_mode?: string | null
          reply_to_replies?: boolean | null
          send_dm_after_reply?: boolean | null
          spam_detection_enabled?: boolean | null
          template_type?: string
          trigger_keywords?: string[] | null
          updated_at?: string
          user_id?: string
          whitelist_users?: string[] | null
        }
        Relationships: []
      }
      conversation_label_assignments: {
        Row: {
          conversation_id: string
          conversation_type: string
          created_at: string | null
          id: string
          label_id: string
        }
        Insert: {
          conversation_id: string
          conversation_type: string
          created_at?: string | null
          id?: string
          label_id: string
        }
        Update: {
          conversation_id?: string
          conversation_type?: string
          created_at?: string | null
          id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_label_assignments_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "conversation_labels"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_labels: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          last_message_text: string | null
          page_id: string
          preferred_message_tag: string | null
          subscriber_id: string
          unread_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_text?: string | null
          page_id: string
          preferred_message_tag?: string | null
          subscriber_id: string
          unread_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_text?: string | null
          page_id?: string
          preferred_message_tag?: string | null
          subscriber_id?: string
          unread_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: true
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applies_to: Database["public"]["Enums"]["coupon_applies_to"]
          bogo_buy_quantity: number | null
          bogo_get_discount_percentage: number | null
          bogo_get_quantity: number | null
          category_ids: string[] | null
          code: string
          created_at: string
          description: string | null
          discount_tiers: Json | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          minimum_purchase: number | null
          name: string
          product_ids: string[] | null
          store_id: string
          updated_at: string
          uses_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applies_to?: Database["public"]["Enums"]["coupon_applies_to"]
          bogo_buy_quantity?: number | null
          bogo_get_discount_percentage?: number | null
          bogo_get_quantity?: number | null
          category_ids?: string[] | null
          code: string
          created_at?: string
          description?: string | null
          discount_tiers?: Json | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          minimum_purchase?: number | null
          name: string
          product_ids?: string[] | null
          store_id: string
          updated_at?: string
          uses_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applies_to?: Database["public"]["Enums"]["coupon_applies_to"]
          bogo_buy_quantity?: number | null
          bogo_get_discount_percentage?: number | null
          bogo_get_quantity?: number | null
          category_ids?: string[] | null
          code?: string
          created_at?: string
          description?: string | null
          discount_tiers?: Json | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          minimum_purchase?: number | null
          name?: string
          product_ids?: string[] | null
          store_id?: string
          updated_at?: string
          uses_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          created_at: string | null
          customer_profile_id: string
          id: string
          is_default: boolean | null
          postal_code: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country: string
          created_at?: string | null
          customer_profile_id: string
          id?: string
          is_default?: boolean | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          created_at?: string | null
          customer_profile_id?: string
          id?: string
          is_default?: boolean | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          guest_session_id: string | null
          id: string
          is_guest: boolean | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          guest_session_id?: string | null
          id?: string
          is_guest?: boolean | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          guest_session_id?: string | null
          id?: string
          is_guest?: boolean | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      data_deletion_requests: {
        Row: {
          completed_at: string | null
          confirmation_code: string
          created_at: string
          deletion_details: Json | null
          facebook_user_id: string
          id: string
          requested_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          confirmation_code: string
          created_at?: string
          deletion_details?: Json | null
          facebook_user_id: string
          id?: string
          requested_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          confirmation_code?: string
          created_at?: string
          deletion_details?: Json | null
          facebook_user_id?: string
          id?: string
          requested_at?: string
          status?: string
        }
        Relationships: []
      }
      facebook_pages: {
        Row: {
          connected_at: string
          followers_count: number | null
          id: string
          page_access_token: string
          page_id: string
          page_logo_url: string | null
          page_name: string
          status: string
          token_expires_at: string | null
          user_id: string
        }
        Insert: {
          connected_at?: string
          followers_count?: number | null
          id?: string
          page_access_token: string
          page_id: string
          page_logo_url?: string | null
          page_name: string
          status?: string
          token_expires_at?: string | null
          user_id: string
        }
        Update: {
          connected_at?: string
          followers_count?: number | null
          id?: string
          page_access_token?: string
          page_id?: string
          page_logo_url?: string | null
          page_name?: string
          status?: string
          token_expires_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feature_announcements: {
        Row: {
          created_at: string
          created_by: string
          feature_id: string | null
          id: string
          message: string
          sent_at: string | null
          target_roles: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          feature_id?: string | null
          id?: string
          message: string
          sent_at?: string | null
          target_roles?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          feature_id?: string | null
          id?: string
          message?: string
          sent_at?: string | null
          target_roles?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_announcements_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          name: string
          retire_date: string | null
          stage: Database["public"]["Enums"]["feature_stage"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          name: string
          retire_date?: string | null
          stage?: Database["public"]["Enums"]["feature_stage"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          retire_date?: string | null
          stage?: Database["public"]["Enums"]["feature_stage"]
          updated_at?: string | null
        }
        Relationships: []
      }
      flow_executions: {
        Row: {
          completed_at: string | null
          error_message: string | null
          flow_id: string
          id: string
          page_id: string
          status: string
          subscriber_psid: string
          triggered_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          flow_id: string
          id?: string
          page_id: string
          status?: string
          subscriber_psid: string
          triggered_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          flow_id?: string
          id?: string
          page_id?: string
          status?: string
          subscriber_psid?: string
          triggered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "chatbot_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_executions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "facebook_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_user_inputs: {
        Row: {
          collected_at: string
          created_at: string
          flow_execution_id: string
          id: string
          input_node_id: string
          user_response: string
          variable_name: string
        }
        Insert: {
          collected_at?: string
          created_at?: string
          flow_execution_id: string
          id?: string
          input_node_id: string
          user_response: string
          variable_name: string
        }
        Update: {
          collected_at?: string
          created_at?: string
          flow_execution_id?: string
          id?: string
          input_node_id?: string
          user_response?: string
          variable_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_user_inputs_flow_execution_id_fkey"
            columns: ["flow_execution_id"]
            isOneToOne: false
            referencedRelation: "flow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_versions: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          flow_data: Json
          flow_id: string
          id: string
          user_id: string
          version_name: string | null
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          flow_data?: Json
          flow_id: string
          id?: string
          user_id: string
          version_name?: string | null
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          flow_data?: Json
          flow_id?: string
          id?: string
          user_id?: string
          version_name?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "flow_versions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "chatbot_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          conditional_logic: Json | null
          created_at: string
          field_type: string
          form_id: string
          help_text: string | null
          id: string
          label: string
          options: Json | null
          placeholder: string | null
          position: number
          required: boolean
          validation: Json | null
        }
        Insert: {
          conditional_logic?: Json | null
          created_at?: string
          field_type: string
          form_id: string
          help_text?: string | null
          id?: string
          label: string
          options?: Json | null
          placeholder?: string | null
          position?: number
          required?: boolean
          validation?: Json | null
        }
        Update: {
          conditional_logic?: Json | null
          created_at?: string
          field_type?: string
          form_id?: string
          help_text?: string | null
          id?: string
          label?: string
          options?: Json | null
          placeholder?: string | null
          position?: number
          required?: boolean
          validation?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          data: Json
          form_id: string
          id: string
          read: boolean
          submitted_at: string
          visitor_info: Json | null
        }
        Insert: {
          data?: Json
          form_id: string
          id?: string
          read?: boolean
          submitted_at?: string
          visitor_info?: Json | null
        }
        Update: {
          data?: Json
          form_id?: string
          id?: string
          read?: boolean
          submitted_at?: string
          visitor_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          settings: Json | null
          slug: string
          status: string
          styling: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
          status?: string
          styling?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          status?: string
          styling?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fraud_check_cache: {
        Row: {
          checked_at: string
          courier_service: string
          expires_at: string
          id: string
          phone_number: string
          raw_response: Json | null
          success_rate: number
          total_delivered: number
          total_orders: number
          total_returned: number
        }
        Insert: {
          checked_at?: string
          courier_service: string
          expires_at?: string
          id?: string
          phone_number: string
          raw_response?: Json | null
          success_rate?: number
          total_delivered?: number
          total_orders?: number
          total_returned?: number
        }
        Update: {
          checked_at?: string
          courier_service?: string
          expires_at?: string
          id?: string
          phone_number?: string
          raw_response?: Json | null
          success_rate?: number
          total_delivered?: number
          total_orders?: number
          total_returned?: number
        }
        Relationships: []
      }
      fraud_reports: {
        Row: {
          created_at: string
          description: string
          evidence_url: string | null
          id: string
          order_id: string | null
          phone_number: string
          report_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          evidence_url?: string | null
          id?: string
          order_id?: string | null
          phone_number: string
          report_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          evidence_url?: string | null
          id?: string
          order_id?: string | null
          phone_number?: string
          report_type?: string
          user_id?: string
        }
        Relationships: []
      }
      instagram_accounts: {
        Row: {
          access_token: string
          account_name: string
          connected_at: string
          followers_count: number | null
          id: string
          instagram_account_id: string
          instagram_username: string
          profile_picture_url: string | null
          status: string
          token_expires_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          account_name: string
          connected_at?: string
          followers_count?: number | null
          id?: string
          instagram_account_id: string
          instagram_username: string
          profile_picture_url?: string | null
          status?: string
          token_expires_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          account_name?: string
          connected_at?: string
          followers_count?: number | null
          id?: string
          instagram_account_id?: string
          instagram_username?: string
          profile_picture_url?: string | null
          status?: string
          token_expires_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      instagram_chatbot_flows: {
        Row: {
          created_at: string
          description: string | null
          flow_data: Json
          id: string
          instagram_account_id: string
          is_active: boolean
          match_type: string
          name: string
          trigger_keyword: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          flow_data?: Json
          id?: string
          instagram_account_id: string
          is_active?: boolean
          match_type?: string
          name: string
          trigger_keyword?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          flow_data?: Json
          id?: string
          instagram_account_id?: string
          is_active?: boolean
          match_type?: string
          name?: string
          trigger_keyword?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_chatbot_flows_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_comment_replies: {
        Row: {
          comment_id: string
          comment_text: string
          commenter_instagram_id: string
          created_at: string
          dm_sent: boolean | null
          id: string
          instagram_account_id: string
          post_id: string
          public_reply_sent: boolean | null
          trigger_id: string | null
          user_id: string
        }
        Insert: {
          comment_id: string
          comment_text: string
          commenter_instagram_id: string
          created_at?: string
          dm_sent?: boolean | null
          id?: string
          instagram_account_id: string
          post_id: string
          public_reply_sent?: boolean | null
          trigger_id?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string
          comment_text?: string
          commenter_instagram_id?: string
          created_at?: string
          dm_sent?: boolean | null
          id?: string
          instagram_account_id?: string
          post_id?: string
          public_reply_sent?: boolean | null
          trigger_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_comment_replies_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_comment_replies_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "instagram_comment_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_comment_triggers: {
        Row: {
          ai_enabled: boolean | null
          ai_prompt: string | null
          blacklist_users: string[] | null
          censored_keywords: string[] | null
          created_at: string
          description: string | null
          dm_conditions: Json | null
          dm_delay_seconds: number | null
          dm_message: string | null
          dm_message_text: string | null
          exclude_keywords: string[] | null
          generic_message: string | null
          id: string
          instagram_account_id: string
          is_active: boolean
          keyword_filters: Json | null
          keyword_reply_message: string | null
          link_detection_enabled: boolean | null
          match_type: string
          max_comment_length: number | null
          min_comment_length: number | null
          moderation_action: string | null
          name: string
          no_match_reply_message: string | null
          post_id: string | null
          profanity_level: string | null
          public_reply_message: string | null
          reply_mode: string | null
          reply_to_replies: boolean | null
          send_dm_after_reply: boolean | null
          spam_detection_enabled: boolean | null
          trigger_keywords: string[] | null
          trigger_type: string
          updated_at: string
          user_id: string
          whitelist_users: string[] | null
        }
        Insert: {
          ai_enabled?: boolean | null
          ai_prompt?: string | null
          blacklist_users?: string[] | null
          censored_keywords?: string[] | null
          created_at?: string
          description?: string | null
          dm_conditions?: Json | null
          dm_delay_seconds?: number | null
          dm_message?: string | null
          dm_message_text?: string | null
          exclude_keywords?: string[] | null
          generic_message?: string | null
          id?: string
          instagram_account_id: string
          is_active?: boolean
          keyword_filters?: Json | null
          keyword_reply_message?: string | null
          link_detection_enabled?: boolean | null
          match_type?: string
          max_comment_length?: number | null
          min_comment_length?: number | null
          moderation_action?: string | null
          name: string
          no_match_reply_message?: string | null
          post_id?: string | null
          profanity_level?: string | null
          public_reply_message?: string | null
          reply_mode?: string | null
          reply_to_replies?: boolean | null
          send_dm_after_reply?: boolean | null
          spam_detection_enabled?: boolean | null
          trigger_keywords?: string[] | null
          trigger_type?: string
          updated_at?: string
          user_id: string
          whitelist_users?: string[] | null
        }
        Update: {
          ai_enabled?: boolean | null
          ai_prompt?: string | null
          blacklist_users?: string[] | null
          censored_keywords?: string[] | null
          created_at?: string
          description?: string | null
          dm_conditions?: Json | null
          dm_delay_seconds?: number | null
          dm_message?: string | null
          dm_message_text?: string | null
          exclude_keywords?: string[] | null
          generic_message?: string | null
          id?: string
          instagram_account_id?: string
          is_active?: boolean
          keyword_filters?: Json | null
          keyword_reply_message?: string | null
          link_detection_enabled?: boolean | null
          match_type?: string
          max_comment_length?: number | null
          min_comment_length?: number | null
          moderation_action?: string | null
          name?: string
          no_match_reply_message?: string | null
          post_id?: string | null
          profanity_level?: string | null
          public_reply_message?: string | null
          reply_mode?: string | null
          reply_to_replies?: boolean | null
          send_dm_after_reply?: boolean | null
          spam_detection_enabled?: boolean | null
          trigger_keywords?: string[] | null
          trigger_type?: string
          updated_at?: string
          user_id?: string
          whitelist_users?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_comment_triggers_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_conversations: {
        Row: {
          created_at: string
          id: string
          instagram_account_id: string
          last_message_at: string
          last_message_text: string | null
          subscriber_id: string
          unread_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instagram_account_id: string
          last_message_at?: string
          last_message_text?: string | null
          subscriber_id: string
          unread_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instagram_account_id?: string
          last_message_at?: string
          last_message_text?: string | null
          subscriber_id?: string
          unread_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_conversations_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_conversations_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "instagram_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_flow_executions: {
        Row: {
          completed_at: string | null
          error_message: string | null
          flow_id: string
          id: string
          instagram_account_id: string
          status: string
          subscriber_instagram_id: string
          triggered_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          flow_id: string
          id?: string
          instagram_account_id: string
          status?: string
          subscriber_instagram_id: string
          triggered_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          flow_id?: string
          id?: string
          instagram_account_id?: string
          status?: string
          subscriber_instagram_id?: string
          triggered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_flow_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "instagram_chatbot_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_flow_executions_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_flow_user_inputs: {
        Row: {
          collected_at: string
          created_at: string
          flow_execution_id: string
          id: string
          input_node_id: string
          user_response: string
          variable_name: string
        }
        Insert: {
          collected_at?: string
          created_at?: string
          flow_execution_id: string
          id?: string
          input_node_id: string
          user_response: string
          variable_name: string
        }
        Update: {
          collected_at?: string
          created_at?: string
          flow_execution_id?: string
          id?: string
          input_node_id?: string
          user_response?: string
          variable_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_flow_user_inputs_flow_execution_id_fkey"
            columns: ["flow_execution_id"]
            isOneToOne: false
            referencedRelation: "instagram_flow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_follow_dms: {
        Row: {
          created_at: string
          dm_message: string
          dm_sent: boolean | null
          follower_instagram_id: string
          follower_username: string | null
          id: string
          instagram_account_id: string
          trigger_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          dm_message: string
          dm_sent?: boolean | null
          follower_instagram_id: string
          follower_username?: string | null
          id?: string
          instagram_account_id: string
          trigger_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          dm_message?: string
          dm_sent?: boolean | null
          follower_instagram_id?: string
          follower_username?: string | null
          id?: string
          instagram_account_id?: string
          trigger_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_follow_dms_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_follow_dms_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "instagram_follow_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_follow_triggers: {
        Row: {
          created_at: string
          description: string | null
          dm_message: string
          id: string
          instagram_account_id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          dm_message: string
          id?: string
          instagram_account_id: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          dm_message?: string
          id?: string
          instagram_account_id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_follow_triggers_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          conversation_id: string
          created_at: string
          id: string
          instagram_message_id: string | null
          message_text: string
          sender_type: string
          sent_at: string
          status: string | null
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          instagram_message_id?: string | null
          message_text: string
          sender_type: string
          sent_at?: string
          status?: string | null
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          instagram_message_id?: string | null
          message_text?: string
          sender_type?: string
          sent_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "instagram_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_node_executions: {
        Row: {
          error_message: string | null
          executed_at: string
          execution_time_ms: number | null
          flow_execution_id: string
          id: string
          node_id: string
          node_type: string
          status: string
        }
        Insert: {
          error_message?: string | null
          executed_at?: string
          execution_time_ms?: number | null
          flow_execution_id: string
          id?: string
          node_id: string
          node_type: string
          status: string
        }
        Update: {
          error_message?: string | null
          executed_at?: string
          execution_time_ms?: number | null
          flow_execution_id?: string
          id?: string
          node_id?: string
          node_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_node_executions_flow_execution_id_fkey"
            columns: ["flow_execution_id"]
            isOneToOne: false
            referencedRelation: "instagram_flow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_story_replies: {
        Row: {
          created_at: string
          dm_sent: boolean | null
          id: string
          instagram_account_id: string
          replier_instagram_id: string
          reply_text: string | null
          reply_type: string
          sticker_response: string | null
          sticker_type: string | null
          story_id: string
          trigger_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          dm_sent?: boolean | null
          id?: string
          instagram_account_id: string
          replier_instagram_id: string
          reply_text?: string | null
          reply_type: string
          sticker_response?: string | null
          sticker_type?: string | null
          story_id: string
          trigger_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          dm_sent?: boolean | null
          id?: string
          instagram_account_id?: string
          replier_instagram_id?: string
          reply_text?: string | null
          reply_type?: string
          sticker_response?: string | null
          sticker_type?: string | null
          story_id?: string
          trigger_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_story_replies_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_story_replies_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "instagram_story_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_story_triggers: {
        Row: {
          created_at: string
          description: string | null
          dm_message: string
          id: string
          instagram_account_id: string
          is_active: boolean
          name: string
          sticker_types: string[] | null
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          dm_message: string
          id?: string
          instagram_account_id: string
          is_active?: boolean
          name: string
          sticker_types?: string[] | null
          trigger_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          dm_message?: string
          id?: string
          instagram_account_id?: string
          is_active?: boolean
          name?: string
          sticker_types?: string[] | null
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_story_triggers_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_subscribers: {
        Row: {
          created_at: string
          id: string
          instagram_account_id: string
          last_interaction_time: string | null
          profile_pic_url: string | null
          subscriber_instagram_id: string
          subscriber_name: string | null
          subscriber_username: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instagram_account_id: string
          last_interaction_time?: string | null
          profile_pic_url?: string | null
          subscriber_instagram_id: string
          subscriber_name?: string | null
          subscriber_username?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instagram_account_id?: string
          last_interaction_time?: string | null
          profile_pic_url?: string | null
          subscriber_instagram_id?: string
          subscriber_name?: string | null
          subscriber_username?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_subscribers_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_unsent_messages: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          instagram_account_id: string
          message_text: string
          original_message_id: string | null
          sender_instagram_id: string
          sender_name: string | null
          unsent_at: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          instagram_account_id: string
          message_text: string
          original_message_id?: string | null
          sender_instagram_id: string
          sender_name?: string | null
          unsent_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          instagram_account_id?: string
          message_text?: string
          original_message_id?: string | null
          sender_instagram_id?: string
          sender_name?: string | null
          unsent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_unsent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "instagram_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_unsent_messages_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_unsent_reply_templates: {
        Row: {
          created_at: string
          id: string
          instagram_account_id: string
          is_active: boolean
          name: string
          reply_message: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instagram_account_id: string
          is_active?: boolean
          name: string
          reply_message: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instagram_account_id?: string
          is_active?: boolean
          name?: string
          reply_message?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_unsent_reply_templates_instagram_account_id_fkey"
            columns: ["instagram_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_elements: {
        Row: {
          created_at: string
          element_type: string
          id: string
          landing_page_id: string
          parent_id: string | null
          position: number
          properties: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          element_type: string
          id?: string
          landing_page_id: string
          parent_id?: string | null
          position?: number
          properties?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          element_type?: string
          id?: string
          landing_page_id?: string
          parent_id?: string | null
          position?: number
          properties?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_elements_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_elements_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "landing_page_elements"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          created_at: string
          id: string
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          message_tag: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_tag: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_tag?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          conversation_id: string
          created_at: string
          facebook_message_id: string | null
          id: string
          message_text: string
          sender_type: string
          sent_at: string
          status: string | null
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id: string
          created_at?: string
          facebook_message_id?: string | null
          id?: string
          message_text: string
          sender_type: string
          sent_at?: string
          status?: string | null
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id?: string
          created_at?: string
          facebook_message_id?: string | null
          id?: string
          message_text?: string
          sender_type?: string
          sent_at?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderated_comments: {
        Row: {
          action_taken: string
          comment_id: string
          comment_text: string
          commenter_name: string | null
          commenter_psid: string | null
          created_at: string | null
          flagged_keywords: string[] | null
          id: string
          page_id: string
          post_id: string
          template_id: string | null
          user_id: string
          violation_type: string
        }
        Insert: {
          action_taken: string
          comment_id: string
          comment_text: string
          commenter_name?: string | null
          commenter_psid?: string | null
          created_at?: string | null
          flagged_keywords?: string[] | null
          id?: string
          page_id: string
          post_id: string
          template_id?: string | null
          user_id: string
          violation_type: string
        }
        Update: {
          action_taken?: string
          comment_id?: string
          comment_text?: string
          commenter_name?: string | null
          commenter_psid?: string | null
          created_at?: string | null
          flagged_keywords?: string[] | null
          id?: string
          page_id?: string
          post_id?: string
          template_id?: string | null
          user_id?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderated_comments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "comment_reply_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      node_executions: {
        Row: {
          error_message: string | null
          executed_at: string
          execution_time_ms: number | null
          flow_execution_id: string
          id: string
          node_id: string
          node_type: string
          status: string
        }
        Insert: {
          error_message?: string | null
          executed_at?: string
          execution_time_ms?: number | null
          flow_execution_id: string
          id?: string
          node_id: string
          node_type: string
          status: string
        }
        Update: {
          error_message?: string | null
          executed_at?: string
          execution_time_ms?: number | null
          flow_execution_id?: string
          id?: string
          node_id?: string
          node_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "node_executions_flow_execution_id_fkey"
            columns: ["flow_execution_id"]
            isOneToOne: false
            referencedRelation: "flow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
          variation_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
          variation_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          courier_consignment_id: string | null
          courier_service: string | null
          courier_tracking_code: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          customer_profile_id: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          paid_amount: number | null
          payment_method: string | null
          shipping_address: string | null
          shipping_charge: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          store_id: string
          stripe_payment_id: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          coupon_code?: string | null
          courier_consignment_id?: string | null
          courier_service?: string | null
          courier_tracking_code?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_profile_id?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          shipping_address?: string | null
          shipping_charge?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          store_id: string
          stripe_payment_id?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          coupon_code?: string | null
          courier_consignment_id?: string | null
          courier_service?: string | null
          courier_tracking_code?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_profile_id?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          shipping_address?: string | null
          shipping_charge?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          store_id?: string
          stripe_payment_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "customer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          charge_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          order_id: string | null
          payment_id: string | null
          payment_method: string
          plan_id: string | null
          status: string
          store_id: string | null
          transaction_type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          charge_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          payment_id?: string | null
          payment_method: string
          plan_id?: string | null
          status?: string
          store_id?: string | null
          transaction_type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          charge_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          payment_id?: string | null
          payment_method?: string
          plan_id?: string | null
          status?: string
          store_id?: string | null
          transaction_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attribute_values: {
        Row: {
          attribute_id: string
          attribute_value: string
          created_at: string | null
          id: string
          price_modifier: number | null
          product_id: string
        }
        Insert: {
          attribute_id: string
          attribute_value: string
          created_at?: string | null
          id?: string
          price_modifier?: number | null
          product_id: string
        }
        Update: {
          attribute_id?: string
          attribute_value?: string
          created_at?: string | null
          id?: string
          price_modifier?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "product_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_values_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_attributes: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          multi_select: boolean | null
          name: string
          optional: boolean | null
          store_id: string
          updated_at: string | null
          value_prices: Json | null
          values: string[]
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          multi_select?: boolean | null
          name: string
          optional?: boolean | null
          store_id: string
          updated_at?: string | null
          value_prices?: Json | null
          values?: string[]
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          multi_select?: boolean | null
          name?: string
          optional?: boolean | null
          store_id?: string
          updated_at?: string | null
          value_prices?: Json | null
          values?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "product_attributes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          attribute_combination: Json | null
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string
          is_primary: boolean | null
          product_id: string
          updated_at: string | null
        }
        Insert: {
          attribute_combination?: Json | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          product_id: string
          updated_at?: string | null
        }
        Update: {
          attribute_combination?: Json | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          price_modifier: number | null
          product_id: string
          sku: string | null
          stock_quantity: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          price_modifier?: number | null
          product_id: string
          sku?: string | null
          stock_quantity?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          price_modifier?: number | null
          product_id?: string
          sku?: string | null
          stock_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allows_cod: boolean | null
          category_id: string | null
          created_at: string | null
          description: string | null
          digital_file_url: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          landing_page_url: string | null
          minimum_payment_percentage: number | null
          name: string
          price: number
          product_type: Database["public"]["Enums"]["product_type"]
          requires_full_payment: boolean | null
          return_charge: number | null
          shipping_inside_dhaka: number | null
          shipping_outside_dhaka: number | null
          stock_quantity: number | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          allows_cod?: boolean | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          digital_file_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          landing_page_url?: string | null
          minimum_payment_percentage?: number | null
          name: string
          price: number
          product_type?: Database["public"]["Enums"]["product_type"]
          requires_full_payment?: boolean | null
          return_charge?: number | null
          shipping_inside_dhaka?: number | null
          shipping_outside_dhaka?: number | null
          stock_quantity?: number | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          allows_cod?: boolean | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          digital_file_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          landing_page_url?: string | null
          minimum_payment_percentage?: number | null
          name?: string
          price?: number
          product_type?: Database["public"]["Enums"]["product_type"]
          requires_full_payment?: boolean | null
          return_charge?: number | null
          shipping_inside_dhaka?: number | null
          shipping_outside_dhaka?: number | null
          stock_quantity?: number | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          audio_model: string | null
          avatar_url: string | null
          created_at: string
          default_message_tag: string | null
          email: string
          full_name: string | null
          gemini_api_key: string | null
          id: string
          image_model: string | null
          max_tokens: number | null
          openai_api_key: string | null
          otp_code: string | null
          otp_expires_at: string | null
          phone_number: string | null
          phone_verified: boolean | null
          preferred_ai_model: string | null
          preferred_ai_provider: string | null
          shipping_address: string | null
          subscriber_id: string | null
          subscriber_platform: string | null
          text_model: string | null
          token_usage_count: number | null
          updated_at: string
          video_model: string | null
          vision_model: string | null
        }
        Insert: {
          audio_model?: string | null
          avatar_url?: string | null
          created_at?: string
          default_message_tag?: string | null
          email: string
          full_name?: string | null
          gemini_api_key?: string | null
          id: string
          image_model?: string | null
          max_tokens?: number | null
          openai_api_key?: string | null
          otp_code?: string | null
          otp_expires_at?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          preferred_ai_model?: string | null
          preferred_ai_provider?: string | null
          shipping_address?: string | null
          subscriber_id?: string | null
          subscriber_platform?: string | null
          text_model?: string | null
          token_usage_count?: number | null
          updated_at?: string
          video_model?: string | null
          vision_model?: string | null
        }
        Update: {
          audio_model?: string | null
          avatar_url?: string | null
          created_at?: string
          default_message_tag?: string | null
          email?: string
          full_name?: string | null
          gemini_api_key?: string | null
          id?: string
          image_model?: string | null
          max_tokens?: number | null
          openai_api_key?: string | null
          otp_code?: string | null
          otp_expires_at?: string | null
          phone_number?: string | null
          phone_verified?: boolean | null
          preferred_ai_model?: string | null
          preferred_ai_provider?: string | null
          shipping_address?: string | null
          subscriber_id?: string | null
          subscriber_platform?: string | null
          text_model?: string | null
          token_usage_count?: number | null
          updated_at?: string
          video_model?: string | null
          vision_model?: string | null
        }
        Relationships: []
      }
      quota_topup_packages: {
        Row: {
          created_at: string | null
          credits: number
          currency: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credits: number
          currency?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credits?: number
          currency?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      quota_topup_purchases: {
        Row: {
          amount_paid: number
          created_at: string | null
          credits_purchased: number
          credits_remaining: number
          currency: string
          expires_at: string
          id: string
          package_id: string
          payment_transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string | null
          credits_purchased: number
          credits_remaining: number
          currency: string
          expires_at: string
          id?: string
          package_id: string
          payment_transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string | null
          credits_purchased?: number
          credits_remaining?: number
          currency?: string
          expires_at?: string
          id?: string
          package_id?: string
          payment_transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quota_topup_purchases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "quota_topup_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quota_topup_purchases_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_broadcasts: {
        Row: {
          account_id: string
          account_type: string
          active_recipients_count: number
          created_at: string
          error_message: string | null
          failed_count: number | null
          id: string
          message: string
          scheduled_for: string
          sent_count: number | null
          status: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          account_type: string
          active_recipients_count?: number
          created_at?: string
          error_message?: string | null
          failed_count?: number | null
          id?: string
          message: string
          scheduled_for: string
          sent_count?: number | null
          status?: string
          timezone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          account_type?: string
          active_recipients_count?: number
          created_at?: string
          error_message?: string | null
          failed_count?: number | null
          id?: string
          message?: string
          scheduled_for?: string
          sent_count?: number | null
          status?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_customer_addresses: {
        Row: {
          area: string | null
          city_corporation: string | null
          created_at: string | null
          customer_id: string
          delivery_location: string | null
          district: string | null
          id: string
          is_default: boolean | null
          label: string | null
          receiver_name: string | null
          receiver_phone: string | null
          store_id: string
          street_address: string | null
          sub_area: string | null
          upazila: string | null
          updated_at: string | null
        }
        Insert: {
          area?: string | null
          city_corporation?: string | null
          created_at?: string | null
          customer_id: string
          delivery_location?: string | null
          district?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          store_id: string
          street_address?: string | null
          sub_area?: string | null
          upazila?: string | null
          updated_at?: string | null
        }
        Update: {
          area?: string | null
          city_corporation?: string | null
          created_at?: string | null
          customer_id?: string
          delivery_location?: string | null
          district?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          store_id?: string
          street_address?: string | null
          sub_area?: string | null
          upazila?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "store_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_customer_addresses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_customers: {
        Row: {
          area: string | null
          city_corporation: string | null
          created_at: string | null
          delivery_location: string | null
          district: string | null
          email: string | null
          facebook_psid: string | null
          first_order_at: string | null
          full_name: string | null
          id: string
          instagram_id: string | null
          last_order_at: string | null
          notes: string | null
          phone: string | null
          profile_pic_url: string | null
          store_id: string
          street_address: string | null
          sub_area: string | null
          tags: string[] | null
          total_orders: number | null
          total_spent: number | null
          upazila: string | null
          updated_at: string | null
          web_visitor_id: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          area?: string | null
          city_corporation?: string | null
          created_at?: string | null
          delivery_location?: string | null
          district?: string | null
          email?: string | null
          facebook_psid?: string | null
          first_order_at?: string | null
          full_name?: string | null
          id?: string
          instagram_id?: string | null
          last_order_at?: string | null
          notes?: string | null
          phone?: string | null
          profile_pic_url?: string | null
          store_id: string
          street_address?: string | null
          sub_area?: string | null
          tags?: string[] | null
          total_orders?: number | null
          total_spent?: number | null
          upazila?: string | null
          updated_at?: string | null
          web_visitor_id?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          area?: string | null
          city_corporation?: string | null
          created_at?: string | null
          delivery_location?: string | null
          district?: string | null
          email?: string | null
          facebook_psid?: string | null
          first_order_at?: string | null
          full_name?: string | null
          id?: string
          instagram_id?: string | null
          last_order_at?: string | null
          notes?: string | null
          phone?: string | null
          profile_pic_url?: string | null
          store_id?: string
          street_address?: string | null
          sub_area?: string | null
          tags?: string[] | null
          total_orders?: number | null
          total_spent?: number | null
          upazila?: string | null
          updated_at?: string | null
          web_visitor_id?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_shipping_config: {
        Row: {
          carrybee_api_key: string | null
          created_at: string
          id: string
          paperfly_api_key: string | null
          pathao_access_token: string | null
          pathao_store_id: string | null
          redex_api_key: string | null
          steadfast_api_key: string | null
          steadfast_secret_key: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          carrybee_api_key?: string | null
          created_at?: string
          id?: string
          paperfly_api_key?: string | null
          pathao_access_token?: string | null
          pathao_store_id?: string | null
          redex_api_key?: string | null
          steadfast_api_key?: string | null
          steadfast_secret_key?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          carrybee_api_key?: string | null
          created_at?: string
          id?: string
          paperfly_api_key?: string | null
          pathao_access_token?: string | null
          pathao_store_id?: string | null
          redex_api_key?: string | null
          steadfast_api_key?: string | null
          steadfast_secret_key?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_shipping_config_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_sms_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string | null
          failed_count: number | null
          filters: Json | null
          id: string
          message: string
          name: string
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number | null
          status: string | null
          store_id: string
          total_recipients: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          failed_count?: number | null
          filters?: Json | null
          id?: string
          message: string
          name: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          store_id: string
          total_recipients?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          failed_count?: number | null
          filters?: Json | null
          id?: string
          message?: string
          name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string | null
          store_id?: string
          total_recipients?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_sms_campaigns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_sms_logs: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          customer_id: string | null
          gateway_response: Json | null
          id: string
          message: string
          phone: string
          sent_at: string | null
          status: string | null
          store_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          gateway_response?: Json | null
          id?: string
          message: string
          phone: string
          sent_at?: string | null
          status?: string | null
          store_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          gateway_response?: Json | null
          id?: string
          message?: string
          phone?: string
          sent_at?: string | null
          status?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_sms_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "store_sms_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_sms_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "store_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_sms_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address_confirmation_message: string | null
          address_request_button_text: string | null
          address_request_instruction: string | null
          bkash_app_key: string | null
          bkash_app_password: string | null
          bkash_app_secret: string | null
          bkash_app_username: string | null
          bkash_sandbox_mode: boolean | null
          carousel_buy_now_text: string | null
          carousel_see_details_text: string | null
          carrybee_api_key: string | null
          carrybee_enabled: boolean | null
          carrybee_secret_key: string | null
          category_view_type: string | null
          city: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          custom_domain: string | null
          custom_domain_verified: boolean | null
          custom_domain_verified_at: string | null
          default_return_charge: number | null
          default_shipping_inside_dhaka: number | null
          default_shipping_outside_dhaka: number | null
          delivery_area_type: string | null
          delivery_countries: string[] | null
          delivery_zone_coordinates: Json | null
          delivery_zone_method: string | null
          delivery_zone_polygon: Json | null
          delivery_zone_radius: number | null
          description: string | null
          desktop_featured_per_row: number | null
          desktop_products_per_row: number | null
          email: string | null
          enable_sub_area_selection: boolean | null
          facebook_pixel_id: string | null
          favicon_url: string | null
          google_analytics_id: string | null
          id: string
          is_active: boolean | null
          locale: string | null
          logo_url: string | null
          mobile_featured_per_row: number | null
          mobile_products_per_row: number | null
          name: string
          paperfly_api_key: string | null
          paperfly_enabled: boolean | null
          paperfly_merchant_id: string | null
          pathao_client_id: string | null
          pathao_client_secret: string | null
          pathao_enabled: boolean | null
          pathao_password: string | null
          pathao_username: string | null
          phone: string | null
          postal_code: string | null
          products_per_row: number | null
          redex_api_key: string | null
          redex_enabled: boolean | null
          redex_merchant_id: string | null
          refund_policy: string | null
          require_location: boolean | null
          rtl_enabled: boolean | null
          shipping_area_mode: string | null
          shipping_calculation_method: string | null
          show_decimals: boolean | null
          slug: string
          sms_gateway_additional_params: Json | null
          sms_gateway_api_key: string | null
          sms_gateway_api_key_param: string | null
          sms_gateway_enabled: boolean | null
          sms_gateway_endpoint: string | null
          sms_gateway_message_param: string | null
          sms_gateway_name: string | null
          sms_gateway_phone_param: string | null
          sms_gateway_sender_id: string | null
          sms_gateway_success_response: string | null
          sms_gateway_type: string | null
          sms_gateway_username: string | null
          state: string | null
          steadfast_api_key: string | null
          steadfast_enabled: boolean | null
          steadfast_secret_key: string | null
          street_address: string | null
          terms_of_service: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_confirmation_message?: string | null
          address_request_button_text?: string | null
          address_request_instruction?: string | null
          bkash_app_key?: string | null
          bkash_app_password?: string | null
          bkash_app_secret?: string | null
          bkash_app_username?: string | null
          bkash_sandbox_mode?: boolean | null
          carousel_buy_now_text?: string | null
          carousel_see_details_text?: string | null
          carrybee_api_key?: string | null
          carrybee_enabled?: boolean | null
          carrybee_secret_key?: string | null
          category_view_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          custom_domain?: string | null
          custom_domain_verified?: boolean | null
          custom_domain_verified_at?: string | null
          default_return_charge?: number | null
          default_shipping_inside_dhaka?: number | null
          default_shipping_outside_dhaka?: number | null
          delivery_area_type?: string | null
          delivery_countries?: string[] | null
          delivery_zone_coordinates?: Json | null
          delivery_zone_method?: string | null
          delivery_zone_polygon?: Json | null
          delivery_zone_radius?: number | null
          description?: string | null
          desktop_featured_per_row?: number | null
          desktop_products_per_row?: number | null
          email?: string | null
          enable_sub_area_selection?: boolean | null
          facebook_pixel_id?: string | null
          favicon_url?: string | null
          google_analytics_id?: string | null
          id?: string
          is_active?: boolean | null
          locale?: string | null
          logo_url?: string | null
          mobile_featured_per_row?: number | null
          mobile_products_per_row?: number | null
          name: string
          paperfly_api_key?: string | null
          paperfly_enabled?: boolean | null
          paperfly_merchant_id?: string | null
          pathao_client_id?: string | null
          pathao_client_secret?: string | null
          pathao_enabled?: boolean | null
          pathao_password?: string | null
          pathao_username?: string | null
          phone?: string | null
          postal_code?: string | null
          products_per_row?: number | null
          redex_api_key?: string | null
          redex_enabled?: boolean | null
          redex_merchant_id?: string | null
          refund_policy?: string | null
          require_location?: boolean | null
          rtl_enabled?: boolean | null
          shipping_area_mode?: string | null
          shipping_calculation_method?: string | null
          show_decimals?: boolean | null
          slug: string
          sms_gateway_additional_params?: Json | null
          sms_gateway_api_key?: string | null
          sms_gateway_api_key_param?: string | null
          sms_gateway_enabled?: boolean | null
          sms_gateway_endpoint?: string | null
          sms_gateway_message_param?: string | null
          sms_gateway_name?: string | null
          sms_gateway_phone_param?: string | null
          sms_gateway_sender_id?: string | null
          sms_gateway_success_response?: string | null
          sms_gateway_type?: string | null
          sms_gateway_username?: string | null
          state?: string | null
          steadfast_api_key?: string | null
          steadfast_enabled?: boolean | null
          steadfast_secret_key?: string | null
          street_address?: string | null
          terms_of_service?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_confirmation_message?: string | null
          address_request_button_text?: string | null
          address_request_instruction?: string | null
          bkash_app_key?: string | null
          bkash_app_password?: string | null
          bkash_app_secret?: string | null
          bkash_app_username?: string | null
          bkash_sandbox_mode?: boolean | null
          carousel_buy_now_text?: string | null
          carousel_see_details_text?: string | null
          carrybee_api_key?: string | null
          carrybee_enabled?: boolean | null
          carrybee_secret_key?: string | null
          category_view_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          custom_domain?: string | null
          custom_domain_verified?: boolean | null
          custom_domain_verified_at?: string | null
          default_return_charge?: number | null
          default_shipping_inside_dhaka?: number | null
          default_shipping_outside_dhaka?: number | null
          delivery_area_type?: string | null
          delivery_countries?: string[] | null
          delivery_zone_coordinates?: Json | null
          delivery_zone_method?: string | null
          delivery_zone_polygon?: Json | null
          delivery_zone_radius?: number | null
          description?: string | null
          desktop_featured_per_row?: number | null
          desktop_products_per_row?: number | null
          email?: string | null
          enable_sub_area_selection?: boolean | null
          facebook_pixel_id?: string | null
          favicon_url?: string | null
          google_analytics_id?: string | null
          id?: string
          is_active?: boolean | null
          locale?: string | null
          logo_url?: string | null
          mobile_featured_per_row?: number | null
          mobile_products_per_row?: number | null
          name?: string
          paperfly_api_key?: string | null
          paperfly_enabled?: boolean | null
          paperfly_merchant_id?: string | null
          pathao_client_id?: string | null
          pathao_client_secret?: string | null
          pathao_enabled?: boolean | null
          pathao_password?: string | null
          pathao_username?: string | null
          phone?: string | null
          postal_code?: string | null
          products_per_row?: number | null
          redex_api_key?: string | null
          redex_enabled?: boolean | null
          redex_merchant_id?: string | null
          refund_policy?: string | null
          require_location?: boolean | null
          rtl_enabled?: boolean | null
          shipping_area_mode?: string | null
          shipping_calculation_method?: string | null
          show_decimals?: boolean | null
          slug?: string
          sms_gateway_additional_params?: Json | null
          sms_gateway_api_key?: string | null
          sms_gateway_api_key_param?: string | null
          sms_gateway_enabled?: boolean | null
          sms_gateway_endpoint?: string | null
          sms_gateway_message_param?: string | null
          sms_gateway_name?: string | null
          sms_gateway_phone_param?: string | null
          sms_gateway_sender_id?: string | null
          sms_gateway_success_response?: string | null
          sms_gateway_type?: string | null
          sms_gateway_username?: string | null
          state?: string | null
          steadfast_api_key?: string | null
          steadfast_enabled?: boolean | null
          steadfast_secret_key?: string | null
          street_address?: string | null
          terms_of_service?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          id: string
          last_interaction_time: string | null
          page_id: string
          profile_pic_url: string | null
          subscriber_name: string | null
          subscriber_psid: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_interaction_time?: string | null
          page_id: string
          profile_pic_url?: string | null
          subscriber_name?: string | null
          subscriber_psid: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_interaction_time?: string | null
          page_id?: string
          profile_pic_url?: string | null
          subscriber_name?: string | null
          subscriber_psid?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "facebook_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_coupons: {
        Row: {
          applies_to: string
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          min_purchase: number | null
          name: string
          plan_ids: string[] | null
          updated_at: string
          uses_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applies_to?: string
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase?: number | null
          name: string
          plan_ids?: string[] | null
          updated_at?: string
          uses_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applies_to?: string
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase?: number | null
          name?: string
          plan_ids?: string[] | null
          updated_at?: string
          uses_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          currency: string | null
          display_order: number
          features: Json
          id: string
          is_active: boolean
          max_broadcast_recipients: number
          max_connected_pages: number
          max_flows: number
          max_instagram_accounts: number
          max_tiktok_accounts: number
          monthly_price: number
          plan_name: string
          replies_quota: number
          trial_days: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          display_order?: number
          features?: Json
          id?: string
          is_active?: boolean
          max_broadcast_recipients?: number
          max_connected_pages?: number
          max_flows?: number
          max_instagram_accounts?: number
          max_tiktok_accounts?: number
          monthly_price?: number
          plan_name: string
          replies_quota?: number
          trial_days?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          display_order?: number
          features?: Json
          id?: string
          is_active?: boolean
          max_broadcast_recipients?: number
          max_connected_pages?: number
          max_flows?: number
          max_instagram_accounts?: number
          max_tiktok_accounts?: number
          monthly_price?: number
          plan_name?: string
          replies_quota?: number
          trial_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          quota_reset_at: string
          replies_quota: number
          replies_used: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          topup_credits_remaining: number | null
          trial_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          quota_reset_at?: string
          replies_quota?: number
          replies_used?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          topup_credits_remaining?: number | null
          trial_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          quota_reset_at?: string
          replies_quota?: number
          replies_used?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          topup_credits_remaining?: number | null
          trial_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          closed_at: string | null
          created_at: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_email_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          html_content: string
          id: string
          is_active: boolean | null
          name: string
          subject: string
          template_key: string
          text_content: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          html_content: string
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          template_key: string
          text_content?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          template_key?: string
          text_content?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      system_error_logs: {
        Row: {
          component: string | null
          created_at: string | null
          error_code: string | null
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message: string
          error_stack?: string | null
          error_type: string
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_sms_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          template_key: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          template_key: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          template_key?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          message_id: string | null
          ticket_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          message_id?: string | null
          ticket_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          message_id?: string | null
          ticket_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ticket_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_internal: boolean
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      token_usage_history: {
        Row: {
          created_at: string | null
          id: string
          model_used: string
          task_type: string
          tokens_consumed: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          model_used: string
          task_type: string
          tokens_consumed: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          model_used?: string
          task_type?: string
          tokens_consumed?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_usage_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_history: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          platform: string
          quota_consumed: number
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          platform: string
          quota_consumed?: number
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          platform?: string
          quota_consumed?: number
          user_id?: string
        }
        Relationships: []
      }
      user_feature_announcements: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feature_announcements_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "feature_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reputation: {
        Row: {
          created_at: string | null
          id: string
          last_violation_at: string | null
          page_id: string
          platform_user_id: string
          platform_username: string | null
          profanity_count: number | null
          spam_count: number | null
          status: string | null
          updated_at: string | null
          user_id: string
          violation_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_violation_at?: string | null
          page_id: string
          platform_user_id: string
          platform_username?: string | null
          profanity_count?: number | null
          spam_count?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          violation_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_violation_at?: string | null
          page_id?: string
          platform_user_id?: string
          platform_username?: string | null
          profanity_count?: number | null
          spam_count?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          violation_count?: number | null
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
      user_settings: {
        Row: {
          compact_mode: boolean
          created_at: string
          dark_mode: boolean
          data_sharing: boolean
          email_notifications: boolean
          flow_execution_alerts: boolean
          id: string
          new_subscriber_alerts: boolean
          order_notifications: boolean
          profile_visibility: boolean
          push_notifications: boolean
          sidebar_analysis: boolean | null
          sidebar_broadcast: boolean | null
          sidebar_chat: boolean | null
          sidebar_comment_replies: boolean | null
          sidebar_flow: boolean | null
          sidebar_menu_order: string[] | null
          sidebar_pages: boolean | null
          sidebar_store: boolean | null
          sidebar_subscribers: boolean | null
          sidebar_subscription: boolean | null
          sidebar_templates: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          compact_mode?: boolean
          created_at?: string
          dark_mode?: boolean
          data_sharing?: boolean
          email_notifications?: boolean
          flow_execution_alerts?: boolean
          id?: string
          new_subscriber_alerts?: boolean
          order_notifications?: boolean
          profile_visibility?: boolean
          push_notifications?: boolean
          sidebar_analysis?: boolean | null
          sidebar_broadcast?: boolean | null
          sidebar_chat?: boolean | null
          sidebar_comment_replies?: boolean | null
          sidebar_flow?: boolean | null
          sidebar_menu_order?: string[] | null
          sidebar_pages?: boolean | null
          sidebar_store?: boolean | null
          sidebar_subscribers?: boolean | null
          sidebar_subscription?: boolean | null
          sidebar_templates?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          compact_mode?: boolean
          created_at?: string
          dark_mode?: boolean
          data_sharing?: boolean
          email_notifications?: boolean
          flow_execution_alerts?: boolean
          id?: string
          new_subscriber_alerts?: boolean
          order_notifications?: boolean
          profile_visibility?: boolean
          push_notifications?: boolean
          sidebar_analysis?: boolean | null
          sidebar_broadcast?: boolean | null
          sidebar_chat?: boolean | null
          sidebar_comment_replies?: boolean | null
          sidebar_flow?: boolean | null
          sidebar_menu_order?: string[] | null
          sidebar_pages?: boolean | null
          sidebar_store?: boolean | null
          sidebar_subscribers?: boolean | null
          sidebar_subscription?: boolean | null
          sidebar_templates?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_call_sessions: {
        Row: {
          call_type: string
          conversation_id: string
          created_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string
          visitor_id: string
        }
        Insert: {
          call_type?: string
          conversation_id: string
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          visitor_id: string
        }
        Update: {
          call_type?: string
          conversation_id?: string
          created_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          visitor_id?: string
        }
        Relationships: []
      }
      webrtc_signals: {
        Row: {
          call_session_id: string
          created_at: string | null
          id: string
          sender_type: string
          signal_data: Json
          signal_type: string
        }
        Insert: {
          call_session_id: string
          created_at?: string | null
          id?: string
          sender_type: string
          signal_data: Json
          signal_type: string
        }
        Update: {
          call_session_id?: string
          created_at?: string | null
          id?: string
          sender_type?: string
          signal_data?: Json
          signal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webrtc_signals_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "video_call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      website_conversations: {
        Row: {
          agent_typing_at: string | null
          assigned_to: string | null
          created_at: string | null
          id: string
          last_message_at: string | null
          last_message_text: string | null
          status: string | null
          unread_count: number | null
          updated_at: string | null
          user_id: string
          visitor_id: string
          visitor_typing_at: string | null
          widget_id: string
        }
        Insert: {
          agent_typing_at?: string | null
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          status?: string | null
          unread_count?: number | null
          updated_at?: string | null
          user_id: string
          visitor_id: string
          visitor_typing_at?: string | null
          widget_id: string
        }
        Update: {
          agent_typing_at?: string | null
          assigned_to?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          status?: string | null
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string
          visitor_id?: string
          visitor_typing_at?: string | null
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_conversations_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "website_visitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_conversations_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "website_widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      website_messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          conversation_id: string
          created_at: string | null
          id: string
          message_text: string
          read_at: string | null
          sender_type: string
          sent_at: string | null
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          message_text: string
          read_at?: string | null
          sender_type: string
          sent_at?: string | null
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          message_text?: string
          read_at?: string | null
          sender_type?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "website_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "website_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      website_visitors: {
        Row: {
          current_page_url: string | null
          first_seen_at: string | null
          id: string
          last_seen_at: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
          visitor_email: string | null
          visitor_ip: string | null
          visitor_location: Json | null
          visitor_name: string | null
          visitor_token: string
          widget_id: string
        }
        Insert: {
          current_page_url?: string | null
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
          visitor_email?: string | null
          visitor_ip?: string | null
          visitor_location?: Json | null
          visitor_name?: string | null
          visitor_token: string
          widget_id: string
        }
        Update: {
          current_page_url?: string | null
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
          visitor_email?: string | null
          visitor_ip?: string | null
          visitor_location?: Json | null
          visitor_name?: string | null
          visitor_token?: string
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_visitors_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "website_widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      website_widgets: {
        Row: {
          auto_response_enabled: boolean | null
          auto_response_message: string | null
          avatar_url: string | null
          business_name: string
          created_at: string | null
          domain_whitelist: string[] | null
          id: string
          is_active: boolean | null
          offline_message: string | null
          position: string | null
          primary_color: string | null
          updated_at: string | null
          user_id: string
          welcome_message: string | null
          widget_name: string
          widget_token: string
        }
        Insert: {
          auto_response_enabled?: boolean | null
          auto_response_message?: string | null
          avatar_url?: string | null
          business_name: string
          created_at?: string | null
          domain_whitelist?: string[] | null
          id?: string
          is_active?: boolean | null
          offline_message?: string | null
          position?: string | null
          primary_color?: string | null
          updated_at?: string | null
          user_id: string
          welcome_message?: string | null
          widget_name: string
          widget_token?: string
        }
        Update: {
          auto_response_enabled?: boolean | null
          auto_response_message?: string | null
          avatar_url?: string | null
          business_name?: string
          created_at?: string | null
          domain_whitelist?: string[] | null
          id?: string
          is_active?: boolean | null
          offline_message?: string | null
          position?: string | null
          primary_color?: string | null
          updated_at?: string | null
          user_id?: string
          welcome_message?: string | null
          widget_name?: string
          widget_token?: string
        }
        Relationships: []
      }
      whatsapp_accounts: {
        Row: {
          access_token: string
          business_account_id: string
          connected_at: string | null
          connection_type: string | null
          created_at: string | null
          display_phone_number: string
          gateway_api_key: string | null
          gateway_session_id: string | null
          gateway_type: string | null
          gateway_url: string | null
          gateway_webhook_url: string | null
          id: string
          phone_number: string
          phone_number_id: string
          quality_rating: string | null
          status: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
          verified_name: string | null
        }
        Insert: {
          access_token: string
          business_account_id: string
          connected_at?: string | null
          connection_type?: string | null
          created_at?: string | null
          display_phone_number: string
          gateway_api_key?: string | null
          gateway_session_id?: string | null
          gateway_type?: string | null
          gateway_url?: string | null
          gateway_webhook_url?: string | null
          id?: string
          phone_number: string
          phone_number_id: string
          quality_rating?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
          verified_name?: string | null
        }
        Update: {
          access_token?: string
          business_account_id?: string
          connected_at?: string | null
          connection_type?: string | null
          created_at?: string | null
          display_phone_number?: string
          gateway_api_key?: string | null
          gateway_session_id?: string | null
          gateway_type?: string | null
          gateway_url?: string | null
          gateway_webhook_url?: string | null
          id?: string
          phone_number?: string
          phone_number_id?: string
          quality_rating?: string | null
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
          verified_name?: string | null
        }
        Relationships: []
      }
      whatsapp_ai_context: {
        Row: {
          created_at: string
          enabled: boolean | null
          handoff_keywords: string[] | null
          id: string
          instructions: string
          knowledge_base: string | null
          updated_at: string
          user_id: string
          whatsapp_account_id: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean | null
          handoff_keywords?: string[] | null
          id?: string
          instructions?: string
          knowledge_base?: string | null
          updated_at?: string
          user_id: string
          whatsapp_account_id?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean | null
          handoff_keywords?: string[] | null
          id?: string
          instructions?: string
          knowledge_base?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_ai_context_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_broadcast_recipients: {
        Row: {
          broadcast_id: string | null
          created_at: string
          error_message: string | null
          id: string
          sent_at: string | null
          status: string
          subscriber_id: string | null
        }
        Insert: {
          broadcast_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          subscriber_id?: string | null
        }
        Update: {
          broadcast_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_broadcast_recipients_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_broadcasts: {
        Row: {
          created_at: string
          failed_count: number | null
          id: string
          media_url: string | null
          message_text: string | null
          message_type: string
          name: string
          scheduled_at: string | null
          sent_count: number | null
          status: string
          target_tags: string[] | null
          target_type: string
          template_name: string | null
          total_recipients: number | null
          updated_at: string
          user_id: string
          whatsapp_account_id: string | null
        }
        Insert: {
          created_at?: string
          failed_count?: number | null
          id?: string
          media_url?: string | null
          message_text?: string | null
          message_type?: string
          name: string
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string
          target_tags?: string[] | null
          target_type?: string
          template_name?: string | null
          total_recipients?: number | null
          updated_at?: string
          user_id: string
          whatsapp_account_id?: string | null
        }
        Update: {
          created_at?: string
          failed_count?: number | null
          id?: string
          media_url?: string | null
          message_text?: string | null
          message_type?: string
          name?: string
          scheduled_at?: string | null
          sent_count?: number | null
          status?: string
          target_tags?: string[] | null
          target_type?: string
          template_name?: string | null
          total_recipients?: number | null
          updated_at?: string
          user_id?: string
          whatsapp_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_broadcasts_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_button_responses: {
        Row: {
          button_id: string
          button_text: string
          id: string
          message_id: string
          responded_at: string
          subscriber_id: string | null
        }
        Insert: {
          button_id: string
          button_text: string
          id?: string
          message_id: string
          responded_at?: string
          subscriber_id?: string | null
        }
        Update: {
          button_id?: string
          button_text?: string
          id?: string
          message_id?: string
          responded_at?: string
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_button_responses_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_chatbot_flows: {
        Row: {
          created_at: string | null
          description: string | null
          flow_data: Json | null
          id: string
          is_active: boolean | null
          match_type: string | null
          name: string
          trigger_keyword: string | null
          updated_at: string | null
          user_id: string
          whatsapp_account_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          flow_data?: Json | null
          id?: string
          is_active?: boolean | null
          match_type?: string | null
          name: string
          trigger_keyword?: string | null
          updated_at?: string | null
          user_id: string
          whatsapp_account_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          flow_data?: Json | null
          id?: string
          is_active?: boolean | null
          match_type?: string | null
          name?: string
          trigger_keyword?: string | null
          updated_at?: string | null
          user_id?: string
          whatsapp_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_chatbot_flows_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          last_message_text: string | null
          subscriber_id: string
          unread_count: number | null
          updated_at: string | null
          user_id: string
          whatsapp_account_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          subscriber_id: string
          unread_count?: number | null
          updated_at?: string | null
          user_id: string
          whatsapp_account_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_text?: string | null
          subscriber_id?: string
          unread_count?: number | null
          updated_at?: string | null
          user_id?: string
          whatsapp_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_subscribers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_custom_fields: {
        Row: {
          created_at: string
          field_name: string
          field_type: string
          id: string
          is_required: boolean | null
          options: Json | null
          updated_at: string
          user_id: string
          whatsapp_account_id: string | null
        }
        Insert: {
          created_at?: string
          field_name: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          updated_at?: string
          user_id: string
          whatsapp_account_id?: string | null
        }
        Update: {
          created_at?: string
          field_name?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          updated_at?: string
          user_id?: string
          whatsapp_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_custom_fields_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_flow_executions: {
        Row: {
          completed_at: string | null
          error_message: string | null
          flow_id: string
          id: string
          status: string | null
          subscriber_phone: string
          triggered_at: string | null
          user_id: string
          whatsapp_account_id: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          flow_id: string
          id?: string
          status?: string | null
          subscriber_phone: string
          triggered_at?: string | null
          user_id: string
          whatsapp_account_id: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          flow_id?: string
          id?: string
          status?: string | null
          subscriber_phone?: string
          triggered_at?: string | null
          user_id?: string
          whatsapp_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_flow_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_chatbot_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_flow_executions_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_interactive_messages: {
        Row: {
          body_text: string
          buttons: Json | null
          conversation_id: string | null
          created_at: string
          footer_text: string | null
          header_text: string | null
          id: string
          interactive_type: string
          message_id: string
          sections: Json | null
        }
        Insert: {
          body_text: string
          buttons?: Json | null
          conversation_id?: string | null
          created_at?: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          interactive_type: string
          message_id: string
          sections?: Json | null
        }
        Update: {
          body_text?: string
          buttons?: Json | null
          conversation_id?: string | null
          created_at?: string
          footer_text?: string | null
          header_text?: string | null
          id?: string
          interactive_type?: string
          message_id?: string
          sections?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_interactive_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          interactive_type: string | null
          media_type: string | null
          media_url: string | null
          message_text: string
          message_type: string | null
          sender_type: string
          sent_at: string | null
          status: string | null
          template_name: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          interactive_type?: string | null
          media_type?: string | null
          media_url?: string | null
          message_text: string
          message_type?: string | null
          sender_type: string
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          interactive_type?: string | null
          media_type?: string | null
          media_url?: string | null
          message_text?: string
          message_type?: string | null
          sender_type?: string
          sent_at?: string | null
          status?: string | null
          template_name?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_qr_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          phone_number: string | null
          qr_data: Json | null
          scanned_at: string | null
          session_id: string
          status: string
          updated_at: string
          user_id: string
          verified_name: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          phone_number?: string | null
          qr_data?: Json | null
          scanned_at?: string | null
          session_id: string
          status?: string
          updated_at?: string
          user_id: string
          verified_name?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          phone_number?: string | null
          qr_data?: Json | null
          scanned_at?: string | null
          session_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          verified_name?: string | null
        }
        Relationships: []
      }
      whatsapp_subscriber_field_values: {
        Row: {
          field_id: string | null
          field_value: string | null
          id: string
          subscriber_id: string | null
          updated_at: string
        }
        Insert: {
          field_id?: string | null
          field_value?: string | null
          id?: string
          subscriber_id?: string | null
          updated_at?: string
        }
        Update: {
          field_id?: string | null
          field_value?: string | null
          id?: string
          subscriber_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_subscriber_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_subscriber_field_values_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_subscribers: {
        Row: {
          created_at: string | null
          id: string
          last_interaction_time: string | null
          phone_number: string
          profile_name: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
          whatsapp_account_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_interaction_time?: string | null
          phone_number: string
          profile_name?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          whatsapp_account_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_interaction_time?: string | null
          phone_number?: string
          profile_name?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          whatsapp_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_subscribers_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_template_messages: {
        Row: {
          category: string
          components: Json | null
          created_at: string | null
          id: string
          status: string | null
          template_language: string | null
          template_name: string
          updated_at: string | null
          user_id: string
          whatsapp_account_id: string
        }
        Insert: {
          category: string
          components?: Json | null
          created_at?: string | null
          id?: string
          status?: string | null
          template_language?: string | null
          template_name: string
          updated_at?: string | null
          user_id: string
          whatsapp_account_id: string
        }
        Update: {
          category?: string
          components?: Json | null
          created_at?: string | null
          id?: string
          status?: string | null
          template_language?: string | null
          template_name?: string
          updated_at?: string | null
          user_id?: string
          whatsapp_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_template_messages_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      whatsapp_analytics_daily: {
        Row: {
          conversation_count: number | null
          date: string | null
          message_count: number | null
          messages_received: number | null
          messages_sent: number | null
          user_id: string | null
          whatsapp_account_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_whatsapp_account_id_fkey"
            columns: ["whatsapp_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_and_consume_quota: {
        Args: {
          p_action_type?: string
          p_platform?: string
          p_quota_amount?: number
          p_user_id: string
        }
        Returns: Json
      }
      expire_old_qr_sessions: { Args: never; Returns: undefined }
      find_or_create_store_customer: {
        Args: {
          p_email?: string
          p_facebook_psid?: string
          p_full_name?: string
          p_instagram_id?: string
          p_phone?: string
          p_profile_pic_url?: string
          p_store_id: string
          p_web_visitor_id?: string
          p_whatsapp_phone?: string
        }
        Returns: string
      }
      get_subscription_limits: { Args: { p_user_id: string }; Returns: Json }
      get_user_accessible_features: {
        Args: { p_user_id: string }
        Returns: {
          description: string
          display_order: number
          id: string
          name: string
          retire_date: string
          stage: Database["public"]["Enums"]["feature_stage"]
        }[]
      }
      has_feature_access: {
        Args: { p_feature_name: string; p_user_id: string }
        Returns: boolean
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
      app_role: "admin" | "user" | "test_user" | "staff" | "beta_user"
      coupon_applies_to: "all" | "specific_products" | "categories"
      discount_type:
        | "percentage"
        | "fixed"
        | "bogo"
        | "tiered"
        | "free_shipping"
      feature_stage:
        | "coming_soon"
        | "development"
        | "beta_launch"
        | "stable"
        | "retire_soon"
        | "retired"
      order_status:
        | "pending"
        | "paid"
        | "partially_paid"
        | "processing"
        | "shipped"
        | "completed"
        | "cancelled"
      product_type: "digital" | "physical" | "both"
      subscription_plan: "free" | "starter" | "creator" | "pro"
      ticket_category:
        | "bug_report"
        | "feature_request"
        | "general_support"
        | "technical_support"
        | "billing_management"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status:
        | "open"
        | "in_progress"
        | "waiting_customer"
        | "resolved"
        | "closed"
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
      app_role: ["admin", "user", "test_user", "staff", "beta_user"],
      coupon_applies_to: ["all", "specific_products", "categories"],
      discount_type: ["percentage", "fixed", "bogo", "tiered", "free_shipping"],
      feature_stage: [
        "coming_soon",
        "development",
        "beta_launch",
        "stable",
        "retire_soon",
        "retired",
      ],
      order_status: [
        "pending",
        "paid",
        "partially_paid",
        "processing",
        "shipped",
        "completed",
        "cancelled",
      ],
      product_type: ["digital", "physical", "both"],
      subscription_plan: ["free", "starter", "creator", "pro"],
      ticket_category: [
        "bug_report",
        "feature_request",
        "general_support",
        "technical_support",
        "billing_management",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: [
        "open",
        "in_progress",
        "waiting_customer",
        "resolved",
        "closed",
      ],
    },
  },
} as const

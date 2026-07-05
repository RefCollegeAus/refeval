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
      clip_goal_links: {
        Row: {
          clip_id: string
          goal_def_id: string
          id: string
          linked_at: string
          linked_by: string | null
          organisation_id: string
          referee_id: string
          review_id: string
        }
        Insert: {
          clip_id: string
          goal_def_id: string
          id?: string
          linked_at?: string
          linked_by?: string | null
          organisation_id: string
          referee_id: string
          review_id: string
        }
        Update: {
          clip_id?: string
          goal_def_id?: string
          id?: string
          linked_at?: string
          linked_by?: string | null
          organisation_id?: string
          referee_id?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clip_goal_links_clip_id_fkey"
            columns: ["clip_id"]
            isOneToOne: false
            referencedRelation: "clips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_goal_links_goal_def_id_fkey"
            columns: ["goal_def_id"]
            isOneToOne: false
            referencedRelation: "development_goal_defs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_goal_links_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clip_goal_links_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_playlist_items: {
        Row: {
          created_at: string
          creator_note: string | null
          id: string
          playlist_id: string
          position: number
          review_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          creator_note?: string | null
          id?: string
          playlist_id: string
          position?: number
          review_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          creator_note?: string | null
          id?: string
          playlist_id?: string
          position?: number
          review_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clip_playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "clip_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_playlists: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          organisation_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          organisation_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          organisation_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clip_playlists_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      clips: {
        Row: {
          adjusted_seconds: number | null
          adjusted_time: string | null
          category: string | null
          clip_officials: Json | null
          coverage: string | null
          created_at: string | null
          extra_review_officials: Json | null
          id: string
          mode: string | null
          notes: string | null
          organisation_id: string | null
          outcome: string | null
          position: string | null
          referee_target: string | null
          review_id: string
          seconds: number | null
          time: string | null
          timestamp_link: string | null
          timestamp_seconds: number | null
        }
        Insert: {
          adjusted_seconds?: number | null
          adjusted_time?: string | null
          category?: string | null
          clip_officials?: Json | null
          coverage?: string | null
          created_at?: string | null
          extra_review_officials?: Json | null
          id?: string
          mode?: string | null
          notes?: string | null
          organisation_id?: string | null
          outcome?: string | null
          position?: string | null
          referee_target?: string | null
          review_id: string
          seconds?: number | null
          time?: string | null
          timestamp_link?: string | null
          timestamp_seconds?: number | null
        }
        Update: {
          adjusted_seconds?: number | null
          adjusted_time?: string | null
          category?: string | null
          clip_officials?: Json | null
          coverage?: string | null
          created_at?: string | null
          extra_review_officials?: Json | null
          id?: string
          mode?: string | null
          notes?: string | null
          organisation_id?: string | null
          outcome?: string | null
          position?: string | null
          referee_target?: string | null
          review_id?: string
          seconds?: number | null
          time?: string | null
          timestamp_link?: string | null
          timestamp_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clips_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clips_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      development_goal_assignment_referees: {
        Row: {
          assignment_id: string
          referee_id: string
        }
        Insert: {
          assignment_id: string
          referee_id: string
        }
        Update: {
          assignment_id?: string
          referee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_goal_assignment_referees_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "development_goal_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      development_goal_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignment_type: string
          goal_id: string
          id: string
          organisation_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_type: string
          goal_id: string
          id?: string
          organisation_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_type?: string
          goal_id?: string
          id?: string
          organisation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_goal_assignments_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "development_goal_defs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_goal_assignments_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      development_goal_defs: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          id: string
          organisation_id: string
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          organisation_id: string
          priority: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          id?: string
          organisation_id?: string
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_goal_defs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      development_notes: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          linked_goal_id: string | null
          note_type: string
          organisation_id: string
          referee_id: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          linked_goal_id?: string | null
          note_type: string
          organisation_id: string
          referee_id: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          linked_goal_id?: string | null
          note_type?: string
          organisation_id?: string
          referee_id?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_notes_linked_goal_id_fkey"
            columns: ["linked_goal_id"]
            isOneToOne: false
            referencedRelation: "development_goal_defs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_notes_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          colour: string
          created_at: string
          description: string | null
          id: string
          name: string
          organisation_id: string
          updated_at: string
        }
        Insert: {
          colour?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organisation_id: string
          updated_at?: string
        }
        Update: {
          colour?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organisation_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_assignment_users: {
        Row: {
          assigned_at: string
          assignment_id: string
          completed_at: string | null
          id: string
          reflection_responses: Json | null
          reflection_submitted_at: string | null
          started_at: string | null
          status: string
          user_id: string
          watched_clip_ids: Json
        }
        Insert: {
          assigned_at?: string
          assignment_id: string
          completed_at?: string | null
          id?: string
          reflection_responses?: Json | null
          reflection_submitted_at?: string | null
          started_at?: string | null
          status?: string
          user_id: string
          watched_clip_ids?: Json
        }
        Update: {
          assigned_at?: string
          assignment_id?: string
          completed_at?: string | null
          id?: string
          reflection_responses?: Json | null
          reflection_submitted_at?: string | null
          started_at?: string | null
          status?: string
          user_id?: string
          watched_clip_ids?: Json
        }
        Relationships: [
          {
            foreignKeyName: "learning_assignment_users_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "learning_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          due_date: string | null
          id: string
          instructions: string | null
          organisation_id: string
          playlist_id: string
          questions: Json
          required: boolean
          title: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          instructions?: string | null
          organisation_id: string
          playlist_id: string
          questions?: Json
          required?: boolean
          title: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          instructions?: string | null
          organisation_id?: string
          playlist_id?: string
          questions?: Json
          required?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_assignments_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_assignments_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "clip_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          assignment_notifications: boolean
          development_goal_notifications: boolean
          in_app_enabled: boolean
          learning_notifications: boolean
          organisation_notifications: boolean
          review_notifications: boolean
          system_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_notifications?: boolean
          development_goal_notifications?: boolean
          in_app_enabled?: boolean
          learning_notifications?: boolean
          organisation_notifications?: boolean
          review_notifications?: boolean
          system_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_notifications?: boolean
          development_goal_notifications?: boolean
          in_app_enabled?: boolean
          learning_notifications?: boolean
          organisation_notifications?: boolean
          review_notifications?: boolean
          system_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_label: string | null
          action_route: string | null
          created_at: string
          created_by: string | null
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          organisation_id: string
          priority: string
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_route?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          organisation_id: string
          priority?: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_route?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          organisation_id?: string
          priority?: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_members: {
        Row: {
          created_at: string | null
          id: string
          organisation_id: string
          role: Database["public"]["Enums"]["organisation_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organisation_id: string
          role: Database["public"]["Enums"]["organisation_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organisation_id?: string
          role?: Database["public"]["Enums"]["organisation_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_settings: {
        Row: {
          branding: Json
          learning_settings: Json
          notification_settings: Json
          organisation_id: string
          preferences: Json
          profile: Json
          resource_settings: Json
          review_settings: Json
          security_settings: Json
          updated_at: string
        }
        Insert: {
          branding?: Json
          learning_settings?: Json
          notification_settings?: Json
          organisation_id: string
          preferences?: Json
          profile?: Json
          resource_settings?: Json
          review_settings?: Json
          security_settings?: Json
          updated_at?: string
        }
        Update: {
          branding?: Json
          learning_settings?: Json
          notification_settings?: Json
          organisation_id?: string
          preferences?: Json
          profile?: Json
          resource_settings?: Json
          review_settings?: Json
          security_settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_settings_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_user_permissions: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          organisation_id: string
          permission_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          organisation_id: string
          permission_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          organisation_id?: string
          permission_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisation_user_permissions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          onboarding_dismissed: boolean
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          onboarding_dismissed?: boolean
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          onboarding_dismissed?: boolean
        }
        Relationships: []
      }
      referee_goals: {
        Row: {
          archived_at: string | null
          completed_at: string | null
          created_at: string
          goal_id: string
          id: string
          notes: string
          organisation_id: string
          referee_id: string
          status: string
          target_review_date: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          goal_id: string
          id?: string
          notes?: string
          organisation_id: string
          referee_id: string
          status?: string
          target_review_date?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          goal_id?: string
          id?: string
          notes?: string
          organisation_id?: string
          referee_id?: string
          status?: string
          target_review_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referee_goals_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "development_goal_defs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referee_goals_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      review_comment_reads: {
        Row: {
          created_at: string
          id: string
          last_read_at: string
          review_id: string
          tag_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_read_at?: string
          review_id: string
          tag_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_read_at?: string
          review_id?: string
          tag_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_comment_reads_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_comments: {
        Row: {
          author_name: string
          created_at: string
          id: string
          message: string
          review_id: string
          tag_id: string | null
          user_id: string
        }
        Insert: {
          author_name?: string
          created_at?: string
          id?: string
          message: string
          review_id: string
          tag_id?: string | null
          user_id: string
        }
        Update: {
          author_name?: string
          created_at?: string
          id?: string
          message?: string
          review_id?: string
          tag_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_comments_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      review_goal_links: {
        Row: {
          created_goal_from_review: boolean
          goal_def_id: string
          id: string
          linked_at: string
          linked_by: string | null
          organisation_id: string
          referee_id: string
          review_id: string
        }
        Insert: {
          created_goal_from_review?: boolean
          goal_def_id: string
          id?: string
          linked_at?: string
          linked_by?: string | null
          organisation_id: string
          referee_id: string
          review_id: string
        }
        Update: {
          created_goal_from_review?: boolean
          goal_def_id?: string
          id?: string
          linked_at?: string
          linked_by?: string | null
          organisation_id?: string
          referee_id?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_goal_links_goal_def_id_fkey"
            columns: ["goal_def_id"]
            isOneToOne: false
            referencedRelation: "development_goal_defs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_goal_links_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_goal_links_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string | null
          educator_id: string | null
          educator_name: string | null
          game: string | null
          game_date: string | null
          id: string
          official_summaries: Json | null
          organisation_id: string | null
          referee1_id: string | null
          referee1_name: string | null
          referee2_id: string | null
          referee2_name: string | null
          referee3_id: string | null
          referee3_name: string | null
          status: string
          submitted_at: string | null
          timestamp_offset: number | null
          video_link: string | null
        }
        Insert: {
          created_at?: string | null
          educator_id?: string | null
          educator_name?: string | null
          game?: string | null
          game_date?: string | null
          id?: string
          official_summaries?: Json | null
          organisation_id?: string | null
          referee1_id?: string | null
          referee1_name?: string | null
          referee2_id?: string | null
          referee2_name?: string | null
          referee3_id?: string | null
          referee3_name?: string | null
          status?: string
          submitted_at?: string | null
          timestamp_offset?: number | null
          video_link?: string | null
        }
        Update: {
          created_at?: string | null
          educator_id?: string | null
          educator_name?: string | null
          game?: string | null
          game_date?: string | null
          id?: string
          official_summaries?: Json | null
          organisation_id?: string | null
          referee1_id?: string | null
          referee1_name?: string | null
          referee2_id?: string | null
          referee2_name?: string | null
          referee3_id?: string | null
          referee3_name?: string | null
          status?: string
          submitted_at?: string | null
          timestamp_offset?: number | null
          video_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      sent_reminders: {
        Row: {
          fired_at: string
          id: string
          reminder_key: string
          user_id: string
        }
        Insert: {
          fired_at?: string
          id?: string
          reminder_key: string
          user_id: string
        }
        Update: {
          fired_at?: string
          id?: string
          reminder_key?: string
          user_id?: string
        }
        Relationships: []
      }
      user_thread_state: {
        Row: {
          dismissed: boolean
          review_id: string
          seen_at: string | null
          starred: boolean
          thread_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          dismissed?: boolean
          review_id: string
          seen_at?: string | null
          starred?: boolean
          thread_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          dismissed?: boolean
          review_id?: string
          seen_at?: string | null
          starred?: boolean
          thread_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_thread_state_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      view_only_game_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          game_id: string
          id: string
          viewer_user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          game_id: string
          id?: string
          viewer_user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          game_id?: string
          id?: string
          viewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "view_only_game_assignments_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "view_only_games"
            referencedColumns: ["id"]
          },
        ]
      }
      view_only_games: {
        Row: {
          category: string
          created_at: string
          created_by: string
          game_date: string | null
          id: string
          organisation_id: string
          title: string
          video_url: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          game_date?: string | null
          id?: string
          organisation_id: string
          title: string
          video_url?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          game_date?: string | null
          id?: string
          organisation_id?: string
          title?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "view_only_games_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dga_org_id: { Args: { p_assignment_id: string }; Returns: string }
      grp_org_id: { Args: { p_group_id: string }; Returns: string }
      has_org_role: {
        Args: {
          org_id: string
          roles: Database["public"]["Enums"]["organisation_role"][]
        }
        Returns: boolean
      }
      is_org_member: { Args: { org_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      la_org_id: { Args: { p_assignment_id: string }; Returns: string }
      user_is_assigned_playlist: {
        Args: { p_playlist_id: string }
        Returns: boolean
      }
    }
    Enums: {
      organisation_role: "super_admin" | "admin" | "educator" | "referee"
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
      organisation_role: ["super_admin", "admin", "educator", "referee"],
    },
  },
} as const

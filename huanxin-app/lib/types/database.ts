export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          phone: string
          username: string | null
          password_hash: string | null
          nickname: string
          avatar_url: string | null
          bio: string | null
          gender: 'male' | 'female' | 'other' | null
          birthday: string | null
          location: string | null
          following_count: number
          followers_count: number
          likes_received_count: number
          works_count: number
          energy_balance: number
          status: 'active' | 'banned' | 'deleted'
          is_verified: boolean
          verified_type: 'official' | 'creator' | null
          settings: any
          created_at: string
          updated_at: string
          last_login_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          phone: string
          username?: string | null
          password_hash?: string | null
          nickname?: string
          avatar_url?: string | null
          bio?: string | null
          gender?: 'male' | 'female' | 'other' | null
          birthday?: string | null
          location?: string | null
          following_count?: number
          followers_count?: number
          likes_received_count?: number
          works_count?: number
          energy_balance?: number
          status?: 'active' | 'banned' | 'deleted'
          is_verified?: boolean
          verified_type?: 'official' | 'creator' | null
          settings?: any
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          phone?: string
          username?: string | null
          password_hash?: string | null
          nickname?: string
          avatar_url?: string | null
          bio?: string | null
          gender?: 'male' | 'female' | 'other' | null
          birthday?: string | null
          location?: string | null
          following_count?: number
          followers_count?: number
          likes_received_count?: number
          works_count?: number
          energy_balance?: number
          status?: 'active' | 'banned' | 'deleted'
          is_verified?: boolean
          verified_type?: 'official' | 'creator' | null
          settings?: any
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
          deleted_at?: string | null
        }
      }
      works: {
        Row: {
          id: string
          user_id: string
          title: string | null
          description: string | null
          type: 'video' | 'image'
          media_url: string
          thumbnail_url: string | null
          cover_url: string | null
          duration: number | null
          video_width: number | null
          video_height: number | null
          audio_url: string | null
          audio_name: string | null
          audio_author: string | null
          category: string | null
          sub_category: string | null
          tags: string[]
          is_ai_generated: boolean
          template_id: string | null
          generation_params: any | null
          views_count: number
          likes_count: number
          comments_count: number
          shares_count: number
          uses_count: number
          status: 'draft' | 'published' | 'reviewing' | 'rejected' | 'pending' | 'failed'
          visibility: 'public' | 'private' | 'followers'
          location: string | null
          published_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          description?: string | null
          type: 'video' | 'image'
          media_url: string
          thumbnail_url?: string | null
          cover_url?: string | null
          duration?: number | null
          video_width?: number | null
          video_height?: number | null
          audio_url?: string | null
          audio_name?: string | null
          audio_author?: string | null
          category?: string | null
          sub_category?: string | null
          tags?: string[]
          is_ai_generated?: boolean
          template_id?: string | null
          generation_params?: any | null
          views_count?: number
          likes_count?: number
          comments_count?: number
          shares_count?: number
          uses_count?: number
          status?: 'draft' | 'published' | 'reviewing' | 'rejected' | 'pending' | 'failed'
          visibility?: 'public' | 'private' | 'followers'
          location?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          description?: string | null
          type?: 'video' | 'image'
          media_url?: string
          thumbnail_url?: string | null
          cover_url?: string | null
          duration?: number | null
          video_width?: number | null
          video_height?: number | null
          audio_url?: string | null
          audio_name?: string | null
          audio_author?: string | null
          category?: string | null
          sub_category?: string | null
          tags?: string[]
          is_ai_generated?: boolean
          template_id?: string | null
          generation_params?: any | null
          views_count?: number
          likes_count?: number
          comments_count?: number
          shares_count?: number
          uses_count?: number
          status?: 'draft' | 'published' | 'reviewing' | 'rejected' | 'pending' | 'failed'
          visibility?: 'public' | 'private' | 'followers'
          location?: string | null
          published_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          parent_id: string | null
          type: 'content' | 'template'
          icon_url: string | null
          cover_url: string | null
          is_active: boolean
          sort_order: number
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          parent_id?: string | null
          type: 'content' | 'template'
          icon_url?: string | null
          cover_url?: string | null
          is_active?: boolean
          sort_order?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          parent_id?: string | null
          type?: 'content' | 'template'
          icon_url?: string | null
          cover_url?: string | null
          is_active?: boolean
          sort_order?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          tags: string[] | null
          zodiac_sign: string | null
          age_group: string | null
          social_links: any
          privacy_settings: any
          location: string | null
          website: string | null
          profession: string | null
          education: string | null
          relationship_status: string | null
          height: number | null
          weight: number | null
          blood_type: string | null
          mbti: string | null
          personality_description: string | null
          life_motto: string | null
          favorite_quote: string | null
          hobbies: string[] | null
          languages: string[] | null
          achievements: any
          badges: any
          theme_preference: string | null
          notification_settings: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tags?: string[] | null
          zodiac_sign?: string | null
          age_group?: string | null
          social_links?: any
          privacy_settings?: any
          location?: string | null
          website?: string | null
          profession?: string | null
          education?: string | null
          relationship_status?: string | null
          height?: number | null
          weight?: number | null
          blood_type?: string | null
          mbti?: string | null
          personality_description?: string | null
          life_motto?: string | null
          favorite_quote?: string | null
          hobbies?: string[] | null
          languages?: string[] | null
          achievements?: any
          badges?: any
          theme_preference?: string | null
          notification_settings?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tags?: string[] | null
          zodiac_sign?: string | null
          age_group?: string | null
          social_links?: any
          privacy_settings?: any
          location?: string | null
          website?: string | null
          profession?: string | null
          education?: string | null
          relationship_status?: string | null
          height?: number | null
          weight?: number | null
          blood_type?: string | null
          mbti?: string | null
          personality_description?: string | null
          life_motto?: string | null
          favorite_quote?: string | null
          hobbies?: string[] | null
          languages?: string[] | null
          achievements?: any
          badges?: any
          theme_preference?: string | null
          notification_settings?: any
          created_at?: string
          updated_at?: string
        }
      }
      ai_avatars: {
        Row: {
          id: string
          user_id: string
          name: string
          avatar_url: string
          front_face_url: string | null
          side_face_url: string | null
          outfit_photo_1: string | null
          outfit_photo_2: string | null
          version: string | null
          training_images: string[] | null
          training_params: any | null
          is_active: boolean
          status: 'training' | 'active' | 'failed'
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          avatar_url: string
          front_face_url?: string | null
          side_face_url?: string | null
          outfit_photo_1?: string | null
          outfit_photo_2?: string | null
          version?: string | null
          training_images?: string[] | null
          training_params?: any | null
          is_active?: boolean
          status?: 'training' | 'active' | 'failed'
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          avatar_url?: string
          front_face_url?: string | null
          side_face_url?: string | null
          outfit_photo_1?: string | null
          outfit_photo_2?: string | null
          version?: string | null
          training_images?: string[] | null
          training_params?: any | null
          is_active?: boolean
          status?: 'training' | 'active' | 'failed'
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      avatar_outfits: {
        Row: {
          id: string
          avatar_id: string
          user_id: string
          image_url: string
          title: string | null
          tags: string[]
          created_at: string
        }
        Insert: {
          id?: string
          avatar_id: string
          user_id: string
          image_url: string
          title?: string | null
          tags?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          avatar_id?: string
          user_id?: string
          image_url?: string
          title?: string | null
          tags?: string[]
          created_at?: string
        }
      }
      user_assets: {
        Row: {
          id: string
          user_id: string
          image_url: string
          title: string | null
          tags: string[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          image_url: string
          title?: string | null
          tags?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          image_url?: string
          title?: string | null
          tags?: string[]
          created_at?: string
        }
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          status: 'active' | 'blocked'
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          status?: 'active' | 'blocked'
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          status?: 'active' | 'blocked'
          created_at?: string
        }
      }
      likes: {
        Row: {
          id: string
          user_id: string
          work_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          work_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          work_id?: string
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          user_id: string
          work_id: string
          parent_id: string | null
          root_id: string
          reply_to_user_id: string | null
          content: string
          images: string[]
          location: string | null
          likes_count: number
          replies_count: number
          status: 'published' | 'hidden' | 'deleted'
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          work_id: string
          parent_id?: string | null
          root_id?: string
          reply_to_user_id?: string | null
          content: string
          images?: string[]
          location?: string | null
          likes_count?: number
          replies_count?: number
          status?: 'published' | 'hidden' | 'deleted'
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          work_id?: string
          parent_id?: string | null
          root_id?: string
          reply_to_user_id?: string | null
          content?: string
          images?: string[]
          location?: string | null
          likes_count?: number
          replies_count?: number
          status?: 'published' | 'hidden' | 'deleted'
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      comment_likes: {
        Row: {
          id: string
          user_id: string
          comment_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          comment_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          comment_id?: string
          created_at?: string
        }
      }
      shares: {
        Row: {
          id: string
          user_id: string
          work_id: string
          platform: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          work_id: string
          platform?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          work_id?: string
          platform?: string | null
          created_at?: string
        }
      }
      ai_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          thumbnail_url: string
          preview_urls: string[]
          category: 'image' | 'video'
          sub_category: string | null
          tags: string[]
          difficulty: 'easy' | 'medium' | 'hard'
          energy_cost: number
          duration_range: string | null
          style_tags: string[]
          template_data: any
          is_active: boolean
          is_featured: boolean
          usage_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          thumbnail_url: string
          preview_urls?: string[]
          category: 'image' | 'video'
          sub_category?: string | null
          tags?: string[]
          difficulty?: 'easy' | 'medium' | 'hard'
          energy_cost?: number
          duration_range?: string | null
          style_tags?: string[]
          template_data: any
          is_active?: boolean
          is_featured?: boolean
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          thumbnail_url?: string
          preview_urls?: string[]
          category?: 'image' | 'video'
          sub_category?: string | null
          tags?: string[]
          difficulty?: 'easy' | 'medium' | 'hard'
          energy_cost?: number
          duration_range?: string | null
          style_tags?: string[]
          template_data?: any
          is_active?: boolean
          is_featured?: boolean
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      system_configs: {
        Row: {
          id: string
          key: string
          value: string
          value_type: 'string' | 'number' | 'boolean' | 'json'
          description: string | null
          group_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: string
          value_type?: 'string' | 'number' | 'boolean' | 'json'
          description?: string | null
          group_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string
          value_type?: 'string' | 'number' | 'boolean' | 'json'
          description?: string | null
          group_name?: string | null
          created_at?: string
          updated_at?: string
        }
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
  }
}

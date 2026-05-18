-- =============================================
-- 焕星 (HuanXing) 数据库初始化脚本
-- 版本: v1.0
-- 创建日期: 2025-10-28
-- 说明: 此脚本用于初始化完整的数据库表结构
-- 注意: 使用逻辑外键，不创建物理外键约束
-- =============================================

-- =============================================
-- 1. 启用必要的扩展
-- =============================================

-- UUID生成
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 全文搜索（中文）
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================
-- 2. 创建基础表（无依赖）
-- =============================================

-- 2.1 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 账户信息
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  
  -- 基本信息
  nickname VARCHAR(50) NOT NULL DEFAULT '新用户',
  avatar_url TEXT,
  bio TEXT,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  birthday DATE,
  location VARCHAR(100),
  
  -- 统计数据
  following_count INTEGER DEFAULT 0 CHECK (following_count >= 0),
  followers_count INTEGER DEFAULT 0 CHECK (followers_count >= 0),
  likes_received_count INTEGER DEFAULT 0 CHECK (likes_received_count >= 0),
  works_count INTEGER DEFAULT 0 CHECK (works_count >= 0),
  
  -- 能量系统
  energy_balance INTEGER DEFAULT 60 CHECK (energy_balance >= 0),
  
  -- 账户状态
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'banned', 'deleted')),
  is_verified BOOLEAN DEFAULT false,
  verified_type VARCHAR(20) CHECK (verified_type IN ('official', 'creator')),
  
  -- 设置项
  settings JSONB DEFAULT '{"no_watermark": false, "privacy": {"show_following": true, "show_followers": true, "show_likes": true, "allow_messages": "everyone"}}',
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE users IS '用户基础信息表';
COMMENT ON COLUMN users.energy_balance IS '能量值余额，用于AI生成功能';

-- 2.2 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  value_type VARCHAR(20) DEFAULT 'string' CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  group_name VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE system_configs IS '系统配置表';

-- 2.3 分类表
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  parent_id UUID,
  type VARCHAR(50) NOT NULL CHECK (type IN ('content', 'template')),
  icon_url TEXT,
  cover_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE categories IS '内容分类表';
COMMENT ON COLUMN categories.parent_id IS '父分类ID（逻辑外键，自关联）';

-- =============================================
-- 3. 创建用户扩展表
-- =============================================

-- 3.1 用户资料扩展表
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tags TEXT[],
  zodiac_sign VARCHAR(20),
  age_group VARCHAR(20),
  social_links JSONB DEFAULT '{}',
  privacy_settings JSONB DEFAULT '{"show_following": true, "show_followers": true, "show_likes": true, "allow_messages": "everyone"}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

COMMENT ON TABLE user_profiles IS '用户扩展资料表';
COMMENT ON COLUMN user_profiles.user_id IS '关联users.id（逻辑外键）';

-- =============================================
-- 4. 创建内容表
-- =============================================

-- 4.1 作品表
CREATE TABLE IF NOT EXISTS works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  title VARCHAR(200),
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('video', 'image')),
  
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  cover_url TEXT,
  
  duration INTEGER CHECK (duration > 0),
  video_width INTEGER,
  video_height INTEGER,
  
  audio_url TEXT,
  audio_name VARCHAR(100),
  audio_author VARCHAR(100),
  
  category VARCHAR(50),
  sub_category VARCHAR(50),
  tags TEXT[] DEFAULT '{}',
  
  is_ai_generated BOOLEAN DEFAULT false,
  template_id UUID,
  generation_params JSONB,
  
  views_count INTEGER DEFAULT 0 CHECK (views_count >= 0),
  likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
  comments_count INTEGER DEFAULT 0 CHECK (comments_count >= 0),
  shares_count INTEGER DEFAULT 0 CHECK (shares_count >= 0),
  uses_count INTEGER DEFAULT 0 CHECK (uses_count >= 0),
  
  status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'published', 'reviewing', 'rejected')),
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'followers')),
  
  location VARCHAR(100),
  
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE works IS '作品表（视频和图片）';
COMMENT ON COLUMN works.user_id IS '关联users.id（逻辑外键）';
COMMENT ON COLUMN works.template_id IS '关联ai_templates.id（逻辑外键）';

-- =============================================
-- 5. 创建社交互动表
-- =============================================

-- 5.1 关注表
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

COMMENT ON TABLE follows IS '用户关注关系表';
COMMENT ON COLUMN follows.follower_id IS '关注者ID（逻辑外键）';
COMMENT ON COLUMN follows.following_id IS '被关注者ID（逻辑外键）';

-- 5.2 点赞表
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  work_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, work_id)
);

COMMENT ON TABLE likes IS '作品点赞表';

-- 5.3 评论表
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  work_id UUID NOT NULL,
  parent_id UUID,
  
  content TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  location VARCHAR(100),
  
  likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
  replies_count INTEGER DEFAULT 0 CHECK (replies_count >= 0),
  
  status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'deleted')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE comments IS '作品评论表';

-- 5.4 评论点赞表
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  comment_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, comment_id)
);

COMMENT ON TABLE comment_likes IS '评论点赞表';

-- 5.5 分享记录表
CREATE TABLE IF NOT EXISTS shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  work_id UUID NOT NULL,
  platform VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE shares IS '作品分享记录表';

-- =============================================
-- 6. 创建AI系统表
-- =============================================

-- 6.1 AI模板表
CREATE TABLE IF NOT EXISTS ai_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name VARCHAR(100) NOT NULL,
  description TEXT,
  thumbnail_url TEXT NOT NULL,
  preview_urls TEXT[] DEFAULT '{}',
  
  category VARCHAR(50) NOT NULL CHECK (category IN ('image', 'video')),
  sub_category VARCHAR(50) NOT NULL,
  template_type VARCHAR(50) NOT NULL,
  
  tags TEXT[] DEFAULT '{}',
  is_new BOOLEAN DEFAULT true,
  is_hot BOOLEAN DEFAULT false,
  
  uses_count INTEGER DEFAULT 0 CHECK (uses_count >= 0),
  energy_cost INTEGER DEFAULT 20 CHECK (energy_cost >= 0),
  
  config JSONB NOT NULL DEFAULT '{}',
  
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE ai_templates IS 'AI生成模板表';

-- 6.2 AI生成记录表
CREATE TABLE IF NOT EXISTS ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_id UUID,
  
  input_type VARCHAR(50) NOT NULL CHECK (input_type IN ('image', 'text', 'audio')),
  input_data JSONB NOT NULL DEFAULT '{}',
  source_urls TEXT[] DEFAULT '{}',
  
  generation_params JSONB,
  prompt TEXT,
  
  output_url TEXT,
  output_type VARCHAR(20) CHECK (output_type IN ('image', 'video')),
  
  work_id UUID,
  
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_message TEXT,
  
  energy_cost INTEGER DEFAULT 20,
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE ai_generations IS 'AI生成任务记录表';

-- 6.3 AI分身表
CREATE TABLE IF NOT EXISTS ai_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  name VARCHAR(100) NOT NULL,
  avatar_url TEXT NOT NULL,
  -- 新增：形象管理所需人脸与穿搭占位字段
  front_face_url TEXT, -- 正脸照片
  side_face_url TEXT,  -- 侧脸照片
  outfit_photo_1 TEXT, -- 穿搭照片一（占位）
  outfit_photo_2 TEXT, -- 穿搭照片二（占位）
  version VARCHAR(20),
  
  training_images TEXT[] DEFAULT '{}',
  training_params JSONB,
  
  is_active BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('training', 'active', 'failed')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE ai_avatars IS 'AI数字分身表';

-- 6.4 用户形象-穿搭表（一个形象对应多套穿搭）
CREATE TABLE IF NOT EXISTS avatar_outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avatar_id UUID NOT NULL,      -- 关联 ai_avatars.id（逻辑外键）
  user_id UUID NOT NULL,        -- 冗余用户ID，便于RLS与筛选
  image_url TEXT NOT NULL,      -- 穿搭图片
  title VARCHAR(100),           -- 可选标题
  tags TEXT[] DEFAULT '{}',     -- 可选标签
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE avatar_outfits IS '用户形象的穿搭图片集合表';
CREATE INDEX IF NOT EXISTS idx_avatar_outfits_avatar_id ON avatar_outfits(avatar_id);
CREATE INDEX IF NOT EXISTS idx_avatar_outfits_user_id ON avatar_outfits(user_id);

-- 启用并配置RLS策略
ALTER TABLE IF EXISTS ai_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS avatar_outfits ENABLE ROW LEVEL SECURITY;

-- ai_avatars RLS：仅本人可访问与管理
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_avatars' AND policyname = 'ai_avatars_select_own'
  ) THEN
    CREATE POLICY ai_avatars_select_own ON ai_avatars FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_avatars' AND policyname = 'ai_avatars_insert_own'
  ) THEN
    CREATE POLICY ai_avatars_insert_own ON ai_avatars FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_avatars' AND policyname = 'ai_avatars_update_own'
  ) THEN
    CREATE POLICY ai_avatars_update_own ON ai_avatars FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_avatars' AND policyname = 'ai_avatars_delete_own'
  ) THEN
    CREATE POLICY ai_avatars_delete_own ON ai_avatars FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- avatar_outfits RLS：仅本人可访问与管理
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'avatar_outfits' AND policyname = 'avatar_outfits_select_own'
  ) THEN
    CREATE POLICY avatar_outfits_select_own ON avatar_outfits FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'avatar_outfits' AND policyname = 'avatar_outfits_insert_own'
  ) THEN
    CREATE POLICY avatar_outfits_insert_own ON avatar_outfits FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'avatar_outfits' AND policyname = 'avatar_outfits_update_own'
  ) THEN
    CREATE POLICY avatar_outfits_update_own ON avatar_outfits FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'avatar_outfits' AND policyname = 'avatar_outfits_delete_own'
  ) THEN
    CREATE POLICY avatar_outfits_delete_own ON avatar_outfits FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- =============================================
-- 7. 创建消息系统表
-- =============================================

-- 7.1 会话表
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  participant_1_id UUID NOT NULL,
  participant_2_id UUID NOT NULL,
  
  last_message_content TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_sender_id UUID,
  
  unread_count_p1 INTEGER DEFAULT 0 CHECK (unread_count_p1 >= 0),
  unread_count_p2 INTEGER DEFAULT 0 CHECK (unread_count_p2 >= 0),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(participant_1_id, participant_2_id),
  CHECK (participant_1_id < participant_2_id)
);

COMMENT ON TABLE conversations IS '一对一聊天会话表';

-- 7.2 消息表
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  
  content TEXT,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('text', 'image', 'file', 'system')),
  
  media_url TEXT,
  media_type VARCHAR(50),
  media_size INTEGER,
  media_name VARCHAR(255),
  
  is_read BOOLEAN DEFAULT false,
  is_recalled BOOLEAN DEFAULT false,
  recalled_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE messages IS '聊天消息表';

-- 7.3 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  type VARCHAR(50) NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'system', 'official')),
  title VARCHAR(200),
  content TEXT NOT NULL,
  
  sender_id UUID,
  work_id UUID,
  comment_id UUID,
  
  thumbnail_url TEXT,
  extra_data JSONB,
  
  is_read BOOLEAN DEFAULT false,
  is_official BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE notifications IS '通知表（包含系统通知和互动通知）';

-- =============================================
-- 8. 创建辅助表
-- =============================================

-- 8.1 作品分类关联表
CREATE TABLE IF NOT EXISTS work_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL,
  category_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(work_id, category_id)
);

COMMENT ON TABLE work_categories IS '作品与分类关联表';

-- 8.2 浏览记录表
CREATE TABLE IF NOT EXISTS work_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  work_id UUID NOT NULL,
  view_duration INTEGER,
  is_completed BOOLEAN DEFAULT false,
  device_info JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE work_views IS '作品浏览记录表（用于推荐算法）';

-- 8.3 用户兴趣表
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tag VARCHAR(50) NOT NULL,
  weight DECIMAL(5,2) DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, tag)
);

COMMENT ON TABLE user_interests IS '用户兴趣标签表（推荐系统）';

-- 8.4 能量交易记录表
CREATE TABLE IF NOT EXISTS energy_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  
  type VARCHAR(50) NOT NULL CHECK (type IN ('generation', 'purchase', 'reward', 'refund')),
  source VARCHAR(100),
  
  related_id UUID,
  related_type VARCHAR(50),
  
  description TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE energy_transactions IS '能量值交易流水表';

-- 8.5 搜索历史表
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  keyword VARCHAR(200) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE search_history IS '用户搜索历史表';

-- 8.6 热门搜索表
CREATE TABLE IF NOT EXISTS trending_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword VARCHAR(200) UNIQUE NOT NULL,
  search_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE trending_searches IS '热门搜索关键词表';

-- 8.7 举报表
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('work', 'comment', 'user')),
  target_id UUID NOT NULL,
  
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  evidence_urls TEXT[] DEFAULT '{}',
  
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'handled', 'rejected')),
  handler_id UUID,
  handle_result TEXT,
  handled_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE reports IS '内容举报表';

-- =============================================
-- 9. 创建索引
-- =============================================

-- 用户表索引
CREATE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_nickname ON users(nickname);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;

-- 作品表索引
CREATE INDEX idx_works_user_id ON works(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_works_type ON works(type);
CREATE INDEX idx_works_category ON works(category);
CREATE INDEX idx_works_status ON works(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_works_published_at ON works(published_at DESC NULLS LAST);
CREATE INDEX idx_works_template_id ON works(template_id);
CREATE INDEX idx_works_views_count ON works(views_count DESC);
CREATE INDEX idx_works_likes_count ON works(likes_count DESC);

-- 关注表索引
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_follows_created_at ON follows(created_at DESC);

-- 点赞表索引
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_work_id ON likes(work_id);
CREATE INDEX idx_likes_created_at ON likes(created_at DESC);

-- 评论表索引
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_work_id ON comments(work_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- 消息表索引
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_is_read ON messages(is_read);

-- 会话表索引
CREATE INDEX idx_conversations_p1 ON conversations(participant_1_id);
CREATE INDEX idx_conversations_p2 ON conversations(participant_2_id);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC NULLS LAST);

-- 通知表索引
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- AI模板表索引
CREATE INDEX idx_ai_templates_category ON ai_templates(category);
CREATE INDEX idx_ai_templates_sub_category ON ai_templates(sub_category);
CREATE INDEX idx_ai_templates_status ON ai_templates(status);
CREATE INDEX idx_ai_templates_sort_order ON ai_templates(sort_order DESC);

-- AI生成表索引
CREATE INDEX idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX idx_ai_generations_template_id ON ai_generations(template_id);
CREATE INDEX idx_ai_generations_status ON ai_generations(status);
CREATE INDEX idx_ai_generations_created_at ON ai_generations(created_at DESC);

-- 其他索引
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_ai_avatars_user_id ON ai_avatars(user_id);
CREATE INDEX idx_work_categories_work_id ON work_categories(work_id);
CREATE INDEX idx_work_categories_category_id ON work_categories(category_id);
CREATE INDEX idx_work_views_work_id ON work_views(work_id);
CREATE INDEX idx_energy_transactions_user_id ON energy_transactions(user_id);
CREATE INDEX idx_search_history_user_id ON search_history(user_id);

-- 全文搜索索引
CREATE INDEX idx_works_search ON works USING gin(to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(description, '')));
CREATE INDEX idx_users_nickname_search ON users USING gin(to_tsvector('simple', nickname));

-- =============================================
-- 10. 创建触发器函数
-- =============================================

-- 10.1 自动更新updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10.2 同步点赞数
CREATE OR REPLACE FUNCTION sync_work_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE works SET likes_count = likes_count + 1 WHERE id = NEW.work_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE works SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.work_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 10.3 同步评论数
CREATE OR REPLACE FUNCTION sync_work_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE works SET comments_count = comments_count + 1 WHERE id = NEW.work_id;
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN
    UPDATE works SET comments_count = GREATEST(comments_count - 1, 0) 
    WHERE id = COALESCE(NEW.work_id, OLD.work_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 10.4 同步关注/粉丝数
CREATE OR REPLACE FUNCTION sync_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE users SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 10.5 同步评论点赞数
CREATE OR REPLACE FUNCTION sync_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 11. 绑定触发器
-- =============================================

-- updated_at触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_works_updated_at BEFORE UPDATE ON works 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_templates_updated_at BEFORE UPDATE ON ai_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_generations_updated_at BEFORE UPDATE ON ai_generations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_avatars_updated_at BEFORE UPDATE ON ai_avatars 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 统计数据同步触发器
CREATE TRIGGER sync_likes_count AFTER INSERT OR DELETE ON likes 
  FOR EACH ROW EXECUTE FUNCTION sync_work_likes_count();

CREATE TRIGGER sync_comments_count AFTER INSERT OR UPDATE OR DELETE ON comments 
  FOR EACH ROW EXECUTE FUNCTION sync_work_comments_count();

CREATE TRIGGER sync_follows_count AFTER INSERT OR DELETE ON follows 
  FOR EACH ROW EXECUTE FUNCTION sync_follow_counts();

CREATE TRIGGER sync_comment_likes_count AFTER INSERT OR DELETE ON comment_likes 
  FOR EACH ROW EXECUTE FUNCTION sync_comment_likes_count();

-- =============================================
-- 12. 创建视图
-- =============================================

-- 12.1 用户统计视图
CREATE OR REPLACE VIEW user_stats_view AS
SELECT 
  u.id,
  u.nickname,
  u.avatar_url,
  u.bio,
  u.location,
  u.energy_balance,
  u.following_count,
  u.followers_count,
  u.likes_received_count,
  u.works_count,
  COUNT(DISTINCT w.id) as actual_works_count,
  COALESCE(SUM(w.likes_count), 0) as total_likes_received
FROM users u
LEFT JOIN works w ON u.id = w.user_id AND w.deleted_at IS NULL AND w.status = 'published'
WHERE u.deleted_at IS NULL
GROUP BY u.id;

COMMENT ON VIEW user_stats_view IS '用户统计信息视图';

-- 12.2 作品详情视图
CREATE OR REPLACE VIEW work_details_view AS
SELECT 
  w.*,
  u.nickname as author_nickname,
  u.avatar_url as author_avatar,
  u.is_verified as author_verified
FROM works w
LEFT JOIN users u ON w.user_id = u.id
WHERE w.deleted_at IS NULL;

COMMENT ON VIEW work_details_view IS '作品详情视图（包含作者信息）';

-- =============================================
-- 13. 初始化默认数据
-- =============================================

-- 13.1 创建官方账号
INSERT INTO users (
  id,
  phone, 
  nickname, 
  avatar_url, 
  bio, 
  is_verified, 
  verified_type,
  status
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'official',
  '焕星官方',
  '/placeholder-logo.png',
  '焕星官方账号',
  true,
  'official',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- 13.2 初始化系统配置
INSERT INTO system_configs (key, value, value_type, description, group_name) VALUES
  ('default_energy_balance', '60', 'number', '新用户默认能量值', 'energy'),
  ('daily_energy_reward', '10', 'number', '每日签到能量奖励', 'energy'),
  ('max_energy_balance', '1000', 'number', '能量值上限', 'energy'),
  ('video_max_duration', '60', 'number', '视频最大时长（秒）', 'content'),
  ('image_max_size', '10485760', 'number', '图片最大大小（字节，10MB）', 'content'),
  ('video_max_size', '104857600', 'number', '视频最大大小（字节，100MB）', 'content')
ON CONFLICT (key) DO NOTHING;

-- 13.3 初始化内容分类
INSERT INTO categories (name, slug, type, sort_order) VALUES
  ('发现', 'discover', 'content', 1000),
  ('网感照', 'aesthetic', 'content', 900),
  ('证件照', 'id-photo', 'content', 800),
  ('海报', 'poster', 'content', 700),
  ('萌宠', 'pet', 'content', 600),
  ('复古', 'vintage', 'content', 500),
  ('艺术', 'art', 'content', 400),
  ('时尚', 'fashion', 'content', 300)
ON CONFLICT (slug) DO NOTHING;

-- 13.4 初始化模板分类
INSERT INTO categories (name, slug, type, parent_id, sort_order) VALUES
  ('图片', 'image', 'template', NULL, 1000),
  ('视频', 'video', 'template', NULL, 900)
ON CONFLICT (slug) DO NOTHING;

-- 图片子分类
DO $$
DECLARE
  image_parent_id UUID;
BEGIN
  SELECT id INTO image_parent_id FROM categories WHERE slug = 'image' AND type = 'template';
  
  IF image_parent_id IS NOT NULL THEN
    INSERT INTO categories (name, slug, type, parent_id, sort_order) VALUES
      ('AI换脸（写真）', 'ai-face-swap', 'template', image_parent_id, 1000),
      ('AI换人', 'ai-person-swap', 'template', image_parent_id, 900),
      ('AI换背景', 'ai-background', 'template', image_parent_id, 800),
      ('趣味玩法', 'fun-features', 'template', image_parent_id, 700),
      ('一键出片', 'one-click', 'template', image_parent_id, 600),
      ('图片动起来', 'animate-photo', 'template', image_parent_id, 500)
    ON CONFLICT (slug) DO NOTHING;
  END IF;
END $$;

-- 13.5 初始化热门搜索
INSERT INTO trending_searches (keyword, search_count, is_active, sort_order) VALUES
  ('万圣节', 12000, true, 1000),
  ('证件照', 10000, true, 900),
  ('山的后面是什么', 8000, true, 800),
  ('又是一年冬', 6000, true, 700),
  ('撕拉片', 5000, true, 600),
  ('Love pray for me', 4000, true, 500)
ON CONFLICT (keyword) DO NOTHING;

-- 13.6 初始化示例模板
INSERT INTO ai_templates (
  name, 
  description, 
  thumbnail_url, 
  category, 
  sub_category, 
  template_type,
  tags,
  is_new,
  is_hot,
  energy_cost,
  config,
  sort_order
) VALUES
  (
    '蓝调天使',
    '方圣古限定 - 梦幻蓝色主题天使写真',
    '/blue-angel-ethereal.jpg',
    'image',
    'ai-face-swap',
    'portrait',
    ARRAY['梦幻', '天使', '蓝色'],
    true,
    true,
    20,
    '{"model_version": "2.0", "style": "fantasy"}',
    1000
  ),
  (
    '蓝调骑士',
    '方圣古限定 - 蓝色主题骑士风格',
    '/blue-knight-fantasy.jpg',
    'image',
    'ai-face-swap',
    'portrait',
    ARRAY['骑士', '蓝色', '奇幻'],
    true,
    true,
    20,
    '{"model_version": "2.0", "style": "fantasy"}',
    900
  )
ON CONFLICT DO NOTHING;

-- =============================================
-- 14. 启用行级安全策略 (RLS)
-- =============================================

-- 启用RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 用户表策略
CREATE POLICY "Users are viewable by everyone" 
  ON users FOR SELECT 
  USING (deleted_at IS NULL);

CREATE POLICY "Users can update own profile" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);

-- 作品表策略
CREATE POLICY "Public works are viewable by everyone" 
  ON works FOR SELECT 
  USING (
    deleted_at IS NULL 
    AND status = 'published'
    AND (
      visibility = 'public' 
      OR user_id = auth.uid()
      OR (visibility = 'followers' AND EXISTS (
        SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = works.user_id
      ))
    )
  );

CREATE POLICY "Authenticated users can create works" 
  ON works FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own works" 
  ON works FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own works" 
  ON works FOR UPDATE 
  USING (auth.uid() = user_id);

-- 消息表策略
CREATE POLICY "Users can view own messages" 
  ON messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.participant_1_id = auth.uid() 
           OR conversations.participant_2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in own conversations" 
  ON messages FOR INSERT 
  WITH CHECK (
    sender_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = conversation_id 
      AND (conversations.participant_1_id = auth.uid() 
           OR conversations.participant_2_id = auth.uid())
    )
  );

-- 会话表策略
CREATE POLICY "Users can view own conversations" 
  ON conversations FOR SELECT 
  USING (
    participant_1_id = auth.uid() 
    OR participant_2_id = auth.uid()
  );

-- 通知表策略
CREATE POLICY "Users can view own notifications" 
  ON notifications FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" 
  ON notifications FOR UPDATE 
  USING (user_id = auth.uid());

-- =============================================
-- 15. 完成
-- =============================================

-- 显示所有表
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 显示所有索引
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;


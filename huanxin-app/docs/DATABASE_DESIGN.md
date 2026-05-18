# 焕星 (HuanXing) - 数据库设计文档

## 文档信息
- **版本**: v1.0
- **创建日期**: 2025-10-28
- **数据库类型**: PostgreSQL (Supabase)
- **外键策略**: 逻辑外键（不使用物理外键约束）

---

## 1. 数据库概述

### 1.1 设计原则
- **逻辑外键**: 在应用层维护数据关系，不使用数据库物理外键约束
- **软删除**: 重要数据采用软删除策略（deleted_at字段）
- **时间戳**: 所有表包含created_at和updated_at字段
- **UUID主键**: 使用UUID作为主键，避免ID可预测性
- **索引优化**: 为常用查询字段添加索引

### 1.2 命名规范
- 表名：小写+下划线（snake_case）
- 字段名：小写+下划线（snake_case）
- 索引名：`idx_表名_字段名`
- 约束名：`constraint_类型_表名_字段名`

---

## 2. 核心表设计

### 2.1 用户相关表

#### users (用户表)
存储用户基本信息和账户数据。

```sql
CREATE TABLE users (
  -- 主键
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 账户信息
  phone VARCHAR(20) UNIQUE NOT NULL,           -- 手机号（登录凭证）
  password_hash VARCHAR(255),                  -- 密码哈希（可选，支持密码登录）
  
  -- 基本信息
  nickname VARCHAR(50) NOT NULL,               -- 昵称
  avatar_url TEXT,                             -- 头像URL
  bio TEXT,                                    -- 个人简介
  gender VARCHAR(10),                          -- 性别：male/female/other
  birthday DATE,                               -- 生日
  location VARCHAR(100),                       -- 位置（如：四川成都）
  
  -- 统计数据（冗余字段，提高查询性能）
  following_count INTEGER DEFAULT 0,           -- 关注数
  followers_count INTEGER DEFAULT 0,           -- 粉丝数
  likes_received_count INTEGER DEFAULT 0,      -- 获赞总数
  works_count INTEGER DEFAULT 0,               -- 作品数
  
  -- 能量系统
  energy_balance INTEGER DEFAULT 60,           -- 能量余额
  
  -- 账户状态
  status VARCHAR(20) DEFAULT 'active',         -- 账户状态：active/banned/deleted
  is_verified BOOLEAN DEFAULT false,           -- 是否认证
  verified_type VARCHAR(20),                   -- 认证类型：official/creator
  
  -- 设置项
  settings JSONB DEFAULT '{}',                 -- 用户设置（JSON格式）
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,      -- 最后登录时间
  deleted_at TIMESTAMP WITH TIME ZONE          -- 软删除时间戳
);

-- 索引
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_nickname ON users(nickname);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;

-- 注释
COMMENT ON TABLE users IS '用户基础信息表';
COMMENT ON COLUMN users.energy_balance IS '用量值余额，用于AI生成功能';
COMMENT ON COLUMN users.settings IS '用户设置JSON，如：{"no_watermark": false, "privacy": {...}}';
```

#### user_profiles (用户扩展资料表)
存储用户的扩展信息和个性化数据。

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                       -- 关联users.id（逻辑外键）
  
  -- 个性化信息
  tags TEXT[],                                 -- 个人标签数组
  zodiac_sign VARCHAR(20),                     -- 星座
  constellation VARCHAR(20),                   -- 星座（中文）
  age_group VARCHAR(20),                       -- 年龄段：00后/90后等
  
  -- 社交链接
  social_links JSONB DEFAULT '{}',             -- 社交媒体链接
  
  -- 隐私设置
  privacy_settings JSONB DEFAULT '{
    "show_following": true,
    "show_followers": true,
    "show_likes": true,
    "allow_messages": "everyone"
  }',
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

COMMENT ON TABLE user_profiles IS '用户扩展资料表';
```

---

### 2.2 内容相关表

#### works (作品表)
存储用户发布的视频和图片作品。

```sql
CREATE TABLE works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                       -- 作者ID（逻辑外键）
  
  -- 内容基本信息
  title VARCHAR(200),                          -- 标题
  description TEXT,                            -- 描述/文案
  type VARCHAR(20) NOT NULL,                   -- 类型：video/image
  
  -- 媒体资源
  media_url TEXT NOT NULL,                     -- 主媒体URL（视频或图片）
  thumbnail_url TEXT,                          -- 缩略图URL
  cover_url TEXT,                              -- 封面图URL
  
  -- 视频特有字段
  duration INTEGER,                            -- 视频时长（秒）
  video_width INTEGER,                         -- 视频宽度
  video_height INTEGER,                        -- 视频高度
  
  -- 音频信息
  audio_url TEXT,                              -- 背景音乐URL
  audio_name VARCHAR(100),                     -- 音乐名称
  audio_author VARCHAR(100),                   -- 音乐作者
  
  -- 分类和标签
  category VARCHAR(50),                        -- 分类：ai-photo/fun-mode等
  sub_category VARCHAR(50),                    -- 子分类：portrait/landscape等
  tags TEXT[],                                 -- 标签数组
  
  -- AI生成相关
  is_ai_generated BOOLEAN DEFAULT false,       -- 是否AI生成
  template_id UUID,                            -- 使用的模板ID（逻辑外键）
  generation_params JSONB,                     -- 生成参数
  
  -- 统计数据（冗余）
  views_count INTEGER DEFAULT 0,               -- 浏览次数
  likes_count INTEGER DEFAULT 0,               -- 点赞数
  comments_count INTEGER DEFAULT 0,            -- 评论数
  shares_count INTEGER DEFAULT 0,              -- 分享数
  uses_count INTEGER DEFAULT 0,                -- 使用次数（被用作模板）
  
  -- 状态和审核
  status VARCHAR(20) DEFAULT 'published',      -- 状态：draft/published/reviewing/rejected
  visibility VARCHAR(20) DEFAULT 'public',     -- 可见性：public/private/followers
  
  -- 位置信息
  location VARCHAR(100),                       -- 发布位置
  
  -- 时间戳
  published_at TIMESTAMP WITH TIME ZONE,       -- 发布时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 索引
CREATE INDEX idx_works_user_id ON works(user_id);
CREATE INDEX idx_works_type ON works(type);
CREATE INDEX idx_works_category ON works(category);
CREATE INDEX idx_works_status ON works(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_works_published_at ON works(published_at DESC);
CREATE INDEX idx_works_template_id ON works(template_id);
CREATE INDEX idx_works_views_count ON works(views_count DESC);

COMMENT ON TABLE works IS '作品表（视频和图片）';
COMMENT ON COLUMN works.uses_count IS '作品被使用次数，用于"574人用过"展示';
```

---

### 2.3 社交互动表

#### follows (关注关系表)
存储用户之间的关注关系。

```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL,                   -- 关注者ID（逻辑外键）
  following_id UUID NOT NULL,                  -- 被关注者ID（逻辑外键）
  
  -- 状态
  status VARCHAR(20) DEFAULT 'active',         -- 状态：active/blocked
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 唯一约束
  UNIQUE(follower_id, following_id)
);

CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_follows_created_at ON follows(created_at);

COMMENT ON TABLE follows IS '用户关注关系表';
```

#### likes (点赞表)
存储用户对作品的点赞记录。

```sql
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                       -- 用户ID（逻辑外键）
  work_id UUID NOT NULL,                       -- 作品ID（逻辑外键）
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 唯一约束
  UNIQUE(user_id, work_id)
);

CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_work_id ON likes(work_id);
CREATE INDEX idx_likes_created_at ON likes(created_at DESC);

COMMENT ON TABLE likes IS '作品点赞表';
```

#### comments (评论表)
存储用户对作品的评论。

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                       -- 评论者ID（逻辑外键）
  work_id UUID NOT NULL,                       -- 作品ID（逻辑外键）
  parent_id UUID,                              -- 父评论ID（回复功能，逻辑外键）
  root_id UUID NOT NULL,                       -- 根评论ID（顶级=自身），用于线程查询
  reply_to_user_id UUID,                       -- 被回复用户ID（辅助 @ 展示）
  
  -- 评论内容
  content TEXT NOT NULL,                       -- 评论文本
  images TEXT[],                               -- 评论图片URL数组
  
  -- 位置信息
  location VARCHAR(100),                       -- 评论位置
  
  -- 统计数据
  likes_count INTEGER DEFAULT 0,               -- 点赞数
  replies_count INTEGER DEFAULT 0,             -- 回复数
  
  -- 状态
  status VARCHAR(20) DEFAULT 'published',      -- 状态：published/hidden/deleted
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_work_id ON comments(work_id);
CREATE INDEX idx_comments_work_parent_created ON comments(work_id, parent_id, created_at DESC);
CREATE INDEX idx_comments_root_created ON comments(root_id, created_at DESC);
CREATE INDEX idx_comments_parent_created ON comments(parent_id, created_at ASC);

COMMENT ON TABLE comments IS '作品评论表';

-- 触发器 & 规则：
-- 1) trg_comment_set_defaults: 自动填充 root_id / reply_to_user_id / likes_count / replies_count / timestamps。
-- 2) trg_comment_counts_sync: 在 insert/update/delete 时同步 works.comments_count 与父评论 replies_count。
-- 3) trg_comment_likes_sync: 在 comment_likes insert/delete 时同步 comments.likes_count。
```

#### comment_likes (评论点赞表)
存储用户对评论的点赞。

```sql
CREATE TABLE comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                       -- 用户ID（逻辑外键）
  comment_id UUID NOT NULL,                    -- 评论ID（逻辑外键）
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, comment_id)
);

CREATE INDEX idx_comment_likes_user_id ON comment_likes(user_id);
CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);

COMMENT ON TABLE comment_likes IS '评论点赞表';
```

#### shares (分享记录表)
存储作品分享记录。

```sql
CREATE TABLE shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                       -- 分享者ID（逻辑外键）
  work_id UUID NOT NULL,                       -- 作品ID（逻辑外键）
  
  -- 分享平台
  platform VARCHAR(50),                        -- 分享平台：wechat/weibo/link等
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shares_user_id ON shares(user_id);
CREATE INDEX idx_shares_work_id ON shares(work_id);
CREATE INDEX idx_shares_created_at ON shares(created_at DESC);

COMMENT ON TABLE shares IS '作品分享记录表';
```

---

### 2.4 消息系统表

#### conversations (会话表)
存储一对一聊天会话，支持无互关直接发起，按 uuid 排序去重。
`sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id UUID NOT NULL,          -- 参与者A（uuid 较小的一侧）
  participant_2_id UUID NOT NULL,          -- 参与者B
  type TEXT NOT NULL DEFAULT 'direct',     -- direct / system
  status TEXT NOT NULL DEFAULT 'active',   -- active / archived / blocked
  initiator_id UUID,

  direct_key TEXT GENERATED ALWAYS AS (
    LEAST(participant_1_id, participant_2_id)::text || ':' || GREATEST(participant_1_id, participant_2_id)::text
  ) STORED,

  last_message_id UUID,
  last_message_type VARCHAR(20),
  last_message_media_url TEXT,
  last_message_content TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_sender_id UUID,
  unread_count_p1 INTEGER NOT NULL DEFAULT 0,
  unread_count_p2 INTEGER NOT NULL DEFAULT 0,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  archived_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT conversations_no_self CHECK (participant_1_id <> participant_2_id),
  CONSTRAINT conversations_status_check CHECK (status IN ('active','archived','blocked')),
  CONSTRAINT conversations_type_check CHECK (type IN ('direct','system'))
);

CREATE UNIQUE INDEX conversations_direct_key_unique
  ON conversations(direct_key) WHERE type = 'direct';
CREATE INDEX idx_conversations_p1 ON conversations(participant_1_id);
CREATE INDEX idx_conversations_p2 ON conversations(participant_2_id);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC NULLS LAST, updated_at DESC NULLS LAST);
`

#### messages (消息表)
存储聊天消息内容，支持文本/图片/视频/语音/文件，补充发送状态字段。
`sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,

  content TEXT,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text', -- text/image/video/audio/file/system
  media_url TEXT,
  media_type VARCHAR(50),
  media_size INTEGER,
  media_name VARCHAR(255),
  reply_to_message_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  client_message_id TEXT,

  status TEXT NOT NULL DEFAULT 'sent',             -- sent/delivered/read
  delivered_at TIMESTAMP WITH TIME ZONE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  is_recalled BOOLEAN NOT NULL DEFAULT false,
  recalled_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT messages_message_type_check CHECK (message_type IN ('text','image','video','audio','file','system')),
  CONSTRAINT messages_status_check CHECK (status IN ('sent','delivered','read'))
);

CREATE INDEX idx_messages_conversation_created_desc ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_unread_receiver ON messages(conversation_id, is_read, sender_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
`

#### notifications (通知表)
存储系统通知和互动通知。

`sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                       -- 接收者ID（逻辑外键）

  type VARCHAR(50) NOT NULL,                   -- 类型：like/comment/follow/system/official
  title VARCHAR(200),                          -- 通知标题
  content TEXT NOT NULL,                       -- 通知内容

  sender_id UUID,                              -- 发送者ID（逻辑外键）
  work_id UUID,                                -- 关联作品ID（逻辑外键）
  comment_id UUID,                             -- 关联评论ID（逻辑外键）

  thumbnail_url TEXT,
  extra_data JSONB,

  is_read BOOLEAN DEFAULT false,
  is_official BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

COMMENT ON TABLE notifications IS '通知表（包含系统通知和互动通知）';
`
### 2.5 AI生成相关表

#### ai_templates (AI模板表)
存储AI生成的模板。

```sql
CREATE TABLE ai_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 模板信息
  name VARCHAR(100) NOT NULL,                  -- 模板名称
  description TEXT,                            -- 模板描述
  thumbnail_url TEXT NOT NULL,                 -- 模板缩略图
  preview_urls TEXT[],                         -- 预览图数组
  
  -- 分类
  category VARCHAR(50) NOT NULL,               -- 大类：image/video
  sub_category VARCHAR(50) NOT NULL,           -- 子类：ai-photo/fun-features等
  template_type VARCHAR(50) NOT NULL,          -- 具体类型：face-swap/outfit-change等
  
  -- 模板标签
  tags TEXT[],                                 -- 标签数组
  is_new BOOLEAN DEFAULT true,                 -- 是否新模板
  is_hot BOOLEAN DEFAULT false,                -- 是否热门
  
  -- 使用统计
  uses_count INTEGER DEFAULT 0,                -- 使用次数
  
  -- 能量消耗
  energy_cost INTEGER DEFAULT 20,              -- 使用消耗的能量值
  
  -- 模板配置
  config JSONB NOT NULL,                       -- 模板配置参数
  
  -- 状态
  status VARCHAR(20) DEFAULT 'active',         -- 状态：active/inactive
  sort_order INTEGER DEFAULT 0,                -- 排序权重
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_templates_category ON ai_templates(category);
CREATE INDEX idx_ai_templates_sub_category ON ai_templates(sub_category);
CREATE INDEX idx_ai_templates_status ON ai_templates(status);
CREATE INDEX idx_ai_templates_sort_order ON ai_templates(sort_order DESC);
CREATE INDEX idx_ai_templates_uses_count ON ai_templates(uses_count DESC);

COMMENT ON TABLE ai_templates IS 'AI生成模板表';
```

#### ai_generations (AI生成记录表)
存储用户的AI生成历史记录。

```sql
CREATE TABLE ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                       -- 用户ID（逻辑外键）
  template_id UUID,                            -- 模板ID（逻辑外键）
  
  -- 输入参数
  input_type VARCHAR(50) NOT NULL,             -- 输入类型：image/text/audio
  input_data JSONB NOT NULL,                   -- 输入数据
  source_urls TEXT[],                          -- 源文件URL数组
  
  -- 生成参数
  generation_params JSONB,                     -- 生成参数
  prompt TEXT,                                 -- 文本提示词
  
  -- 输出结果
  output_url TEXT,                             -- 生成结果URL
  output_type VARCHAR(20),                     -- 输出类型：image/video
  
  -- 关联作品
  work_id UUID,                                -- 如果发布为作品，关联的作品ID
  
  -- 生成状态
  status VARCHAR(20) DEFAULT 'pending',        -- 状态：pending/processing/completed/failed
  progress INTEGER DEFAULT 0,                  -- 进度百分比
  error_message TEXT,                          -- 错误信息
  
  -- 能量消耗
  energy_cost INTEGER DEFAULT 20,              -- 消耗的能量值
  
  -- 时间戳
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX idx_ai_generations_template_id ON ai_generations(template_id);
CREATE INDEX idx_ai_generations_status ON ai_generations(status);
CREATE INDEX idx_ai_generations_created_at ON ai_generations(created_at DESC);

COMMENT ON TABLE ai_generations IS 'AI生成任务记录表';
```

#### ai_avatars (AI分身表)
存储用户创建的AI分身。

```sql
CREATE TABLE ai_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                       -- 用户ID（逻辑外键）
  
  -- 分身信息
  name VARCHAR(100) NOT NULL,                  -- 分身名称
  avatar_url TEXT NOT NULL,                    -- 分身头像URL
  version VARCHAR(20),                         -- 模型版本：2.0/3.0
  
  -- 训练数据
  training_images TEXT[],                      -- 训练图片URL数组
  training_params JSONB,                       -- 训练参数
  
  -- 状态
  is_active BOOLEAN DEFAULT false,             -- 是否当前使用
  status VARCHAR(20) DEFAULT 'active',         -- 状态：training/active/failed
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_ai_avatars_user_id ON ai_avatars(user_id);
CREATE INDEX idx_ai_avatars_is_active ON ai_avatars(is_active);
CREATE INDEX idx_ai_avatars_created_at ON ai_avatars(created_at DESC);

COMMENT ON TABLE ai_avatars IS 'AI数字分身表';
```

---

### 2.6 能量系统表

#### energy_transactions (能量交易记录表)
记录用户能量值的增减流水。

```sql
CREATE TABLE energy_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                       -- 用户ID（逻辑外键）
  
  -- 交易信息
  amount INTEGER NOT NULL,                     -- 变动数量（正数为增加，负数为减少）
  balance_after INTEGER NOT NULL,              -- 交易后余额
  
  -- 交易类型
  type VARCHAR(50) NOT NULL,                   -- 类型：generation/purchase/reward/refund等
  source VARCHAR(100),                         -- 来源说明
  
  -- 关联对象
  related_id UUID,                             -- 关联对象ID（如generation_id）
  related_type VARCHAR(50),                    -- 关联对象类型
  
  -- 描述
  description TEXT,                            -- 交易描述
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_energy_transactions_user_id ON energy_transactions(user_id);
CREATE INDEX idx_energy_transactions_type ON energy_transactions(type);
CREATE INDEX idx_energy_transactions_created_at ON energy_transactions(created_at DESC);

COMMENT ON TABLE energy_transactions IS '能量值交易流水表';
```

---

### 2.7 内容推荐表

#### work_views (作品浏览记录表)
记录用户浏览作品的历史。

```sql
CREATE TABLE work_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,                                -- 用户ID（可为空，支持未登录浏览）
  work_id UUID NOT NULL,                       -- 作品ID（逻辑外键）
  
  -- 浏览信息
  view_duration INTEGER,                       -- 观看时长（秒）
  is_completed BOOLEAN DEFAULT false,          -- 是否看完
  
  -- 设备和位置
  device_info JSONB,                           -- 设备信息
  ip_address VARCHAR(50),                      -- IP地址
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_work_views_user_id ON work_views(user_id);
CREATE INDEX idx_work_views_work_id ON work_views(work_id);
CREATE INDEX idx_work_views_created_at ON work_views(created_at DESC);

COMMENT ON TABLE work_views IS '作品浏览记录表（用于推荐算法）';
```

#### user_interests (用户兴趣表)
存储用户兴趣标签和权重。

```sql
CREATE TABLE user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                       -- 用户ID（逻辑外键）
  
  -- 兴趣标签
  tag VARCHAR(50) NOT NULL,                    -- 兴趣标签
  weight DECIMAL(5,2) DEFAULT 1.0,             -- 权重（用于推荐算法）
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, tag)
);

CREATE INDEX idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX idx_user_interests_tag ON user_interests(tag);
CREATE INDEX idx_user_interests_weight ON user_interests(weight DESC);

COMMENT ON TABLE user_interests IS '用户兴趣标签表（推荐系统）';
```

---

### 2.8 搜索历史表

#### search_history (搜索历史表)
存储用户的搜索记录。

```sql
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                       -- 用户ID（逻辑外键）
  
  -- 搜索内容
  keyword VARCHAR(200) NOT NULL,               -- 搜索关键词
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_search_history_user_id ON search_history(user_id);
CREATE INDEX idx_search_history_keyword ON search_history(keyword);
CREATE INDEX idx_search_history_created_at ON search_history(created_at DESC);

COMMENT ON TABLE search_history IS '用户搜索历史表';
```

#### trending_searches (热门搜索表)
存储平台热门搜索词。

```sql
CREATE TABLE trending_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 搜索词
  keyword VARCHAR(200) NOT NULL UNIQUE,        -- 热门关键词
  
  -- 统计数据
  search_count INTEGER DEFAULT 0,              -- 搜索次数
  
  -- 展示配置
  is_active BOOLEAN DEFAULT true,              -- 是否展示
  sort_order INTEGER DEFAULT 0,                -- 排序权重
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_trending_searches_is_active ON trending_searches(is_active);
CREATE INDEX idx_trending_searches_sort_order ON trending_searches(sort_order DESC);
CREATE INDEX idx_trending_searches_search_count ON trending_searches(search_count DESC);

COMMENT ON TABLE trending_searches IS '热门搜索关键词表';
```

---

### 2.9 内容分类表

#### categories (分类表)
存储内容分类信息。

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 分类信息
  name VARCHAR(100) NOT NULL,                  -- 分类名称
  slug VARCHAR(100) NOT NULL UNIQUE,           -- URL友好的标识符
  parent_id UUID,                              -- 父分类ID（逻辑外键，支持多级分类）
  
  -- 分类类型
  type VARCHAR(50) NOT NULL,                   -- 类型：content/template
  
  -- 图标和样式
  icon_url TEXT,                               -- 图标URL
  cover_url TEXT,                              -- 封面图URL
  
  -- 展示配置
  is_active BOOLEAN DEFAULT true,              -- 是否启用
  sort_order INTEGER DEFAULT 0,                -- 排序权重
  
  -- 描述
  description TEXT,                            -- 分类描述
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_is_active ON categories(is_active);
CREATE INDEX idx_categories_sort_order ON categories(sort_order DESC);

COMMENT ON TABLE categories IS '内容分类表';
```

#### work_categories (作品分类关联表)
多对多关系：作品可属于多个分类。

```sql
CREATE TABLE work_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id UUID NOT NULL,                       -- 作品ID（逻辑外键）
  category_id UUID NOT NULL,                   -- 分类ID（逻辑外键）
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(work_id, category_id)
);

CREATE INDEX idx_work_categories_work_id ON work_categories(work_id);
CREATE INDEX idx_work_categories_category_id ON work_categories(category_id);

COMMENT ON TABLE work_categories IS '作品与分类关联表';
```

---

### 2.10 系统配置表

#### system_configs (系统配置表)
存储系统级配置参数。

```sql
CREATE TABLE system_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 配置项
  key VARCHAR(100) NOT NULL UNIQUE,            -- 配置键
  value TEXT NOT NULL,                         -- 配置值
  value_type VARCHAR(20) DEFAULT 'string',     -- 值类型：string/number/boolean/json
  
  -- 描述
  description TEXT,                            -- 配置说明
  group_name VARCHAR(50),                      -- 配置分组
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_system_configs_key ON system_configs(key);
CREATE INDEX idx_system_configs_group_name ON system_configs(group_name);

COMMENT ON TABLE system_configs IS '系统配置表';

-- 初始配置示例
INSERT INTO system_configs (key, value, value_type, description, group_name) VALUES
  ('default_energy_balance', '60', 'number', '新用户默认能量值', 'energy'),
  ('daily_energy_reward', '10', 'number', '每日签到能量奖励', 'energy'),
  ('max_energy_balance', '1000', 'number', '能量值上限', 'energy'),
  ('video_max_duration', '60', 'number', '视频最大时长（秒）', 'content'),
  ('image_max_size', '10485760', 'number', '图片最大大小（字节，10MB）', 'content');
```

---

### 2.11 举报和审核表

#### reports (举报表)
存储用户举报内容。

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,                   -- 举报者ID（逻辑外键）
  
  -- 举报对象
  target_type VARCHAR(50) NOT NULL,            -- 目标类型：work/comment/user
  target_id UUID NOT NULL,                     -- 目标ID（逻辑外键）
  
  -- 举报内容
  reason VARCHAR(100) NOT NULL,                -- 举报原因
  description TEXT,                            -- 详细描述
  evidence_urls TEXT[],                        -- 证据图片URL
  
  -- 处理状态
  status VARCHAR(20) DEFAULT 'pending',        -- 状态：pending/reviewing/handled/rejected
  handler_id UUID,                             -- 处理人ID
  handle_result TEXT,                          -- 处理结果
  handled_at TIMESTAMP WITH TIME ZONE,         -- 处理时间
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_target_type ON reports(target_type);
CREATE INDEX idx_reports_target_id ON reports(target_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

COMMENT ON TABLE reports IS '内容举报表';
```

---

## 3. 数据库关系图

```
用户系统:
┌─────────────┐
│   users     │──┐
└─────────────┘  │
                 ├──► user_profiles (1:1)
                 ├──► ai_avatars (1:N)
                 ├──► energy_transactions (1:N)
                 └──► follows (M:N自关联)

内容系统:
┌─────────────┐
│   works     │──┐
└─────────────┘  │
                 ├──► likes (M:N with users)
                 ├──► comments (1:N)
                 ├──► shares (1:N)
                 ├──► work_views (1:N)
                 ├──► work_categories (M:N with categories)
                 └──► ai_generations (1:1)

消息系统:
┌──────────────────┐
│  conversations   │──► messages (1:N)
└──────────────────┘

通知系统:
┌──────────────────┐
│  notifications   │──► users (N:1)
└──────────────────┘

AI系统:
┌──────────────────┐
│  ai_templates    │──┐
└──────────────────┘  │
                      ├──► ai_generations (1:N)
                      └──► works (1:N)
```

---

## 4. 视图定义

### 4.1 用户统计视图
方便查询用户的完整统计信息。

```sql
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
  COUNT(DISTINCT l.id) as actual_likes_count
FROM users u
LEFT JOIN works w ON u.id = w.user_id AND w.deleted_at IS NULL
LEFT JOIN likes l ON u.id = l.user_id
WHERE u.deleted_at IS NULL
GROUP BY u.id;

COMMENT ON VIEW user_stats_view IS '用户统计信息视图';
```

### 4.2 作品详情视图
包含作品的完整信息和作者信息。

```sql
CREATE OR REPLACE VIEW work_details_view AS
SELECT 
  w.*,
  u.nickname as author_nickname,
  u.avatar_url as author_avatar,
  u.is_verified as author_verified,
  COUNT(DISTINCT l.id) as actual_likes_count,
  COUNT(DISTINCT c.id) as actual_comments_count
FROM works w
LEFT JOIN users u ON w.user_id = u.id
LEFT JOIN likes l ON w.id = l.work_id
LEFT JOIN comments c ON w.id = c.work_id AND c.deleted_at IS NULL
WHERE w.deleted_at IS NULL
GROUP BY w.id, u.id;

COMMENT ON VIEW work_details_view IS '作品详情视图（包含作者信息）';
```

---

## 5. 触发器函数

### 5.1 更新updated_at触发器
自动更新表的updated_at字段。

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要的表添加触发器
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_works_updated_at 
  BEFORE UPDATE ON works 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at 
  BEFORE UPDATE ON comments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_templates_updated_at 
  BEFORE UPDATE ON ai_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_generations_updated_at 
  BEFORE UPDATE ON ai_generations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_avatars_updated_at 
  BEFORE UPDATE ON ai_avatars 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at 
  BEFORE UPDATE ON conversations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at 
  BEFORE UPDATE ON messages 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 5.2 统计数据同步触发器
自动同步点赞、评论等统计数据。

```sql
-- 点赞数同步
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

CREATE TRIGGER sync_likes_count 
  AFTER INSERT OR DELETE ON likes 
  FOR EACH ROW EXECUTE FUNCTION sync_work_likes_count();

-- 评论数同步
CREATE OR REPLACE FUNCTION sync_work_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE works SET comments_count = comments_count + 1 WHERE id = NEW.work_id;
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL) THEN
    UPDATE works SET comments_count = GREATEST(comments_count - 1, 0) 
    WHERE id = COALESCE(NEW.work_id, OLD.work_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_comments_count 
  AFTER INSERT OR UPDATE OR DELETE ON comments 
  FOR EACH ROW EXECUTE FUNCTION sync_work_comments_count();

-- 关注数同步
CREATE OR REPLACE FUNCTION sync_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 增加关注数和粉丝数
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- 减少关注数和粉丝数
    UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE users SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_follows_count 
  AFTER INSERT OR DELETE ON follows 
  FOR EACH ROW EXECUTE FUNCTION sync_follow_counts();
```

---

## 6. 行级安全策略 (RLS)

Supabase推荐使用Row Level Security保护数据安全。

### 6.1 用户表RLS策略

```sql
-- 启用RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 查看策略：所有人可以查看未删除的用户
CREATE POLICY "Users are viewable by everyone" 
  ON users FOR SELECT 
  USING (deleted_at IS NULL);

-- 更新策略：用户只能更新自己的信息
CREATE POLICY "Users can update own profile" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);

-- 删除策略：用户只能删除自己（软删除）
CREATE POLICY "Users can delete own account" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);
```

### 6.2 作品表RLS策略

```sql
ALTER TABLE works ENABLE ROW LEVEL SECURITY;

-- 查看策略：公开作品所有人可见，私密作品仅作者和粉丝可见
CREATE POLICY "Public works are viewable by everyone" 
  ON works FOR SELECT 
  USING (
    deleted_at IS NULL 
    AND (
      visibility = 'public' 
      OR user_id = auth.uid()
      OR (visibility = 'followers' AND EXISTS (
        SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = works.user_id
      ))
    )
  );

-- 插入策略：认证用户可以创建作品
CREATE POLICY "Authenticated users can create works" 
  ON works FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 更新策略：用户只能更新自己的作品
CREATE POLICY "Users can update own works" 
  ON works FOR UPDATE 
  USING (auth.uid() = user_id);

-- 删除策略：用户只能删除自己的作品
CREATE POLICY "Users can delete own works" 
  ON works FOR DELETE 
  USING (auth.uid() = user_id);
```

### 6.3 消息表RLS策略

```sql
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 查看策略：只能查看自己参与的会话消息
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

-- 插入策略：只能在自己参与的会话中发送消息
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
```

---

## 7. 数据初始化

### 7.1 默认分类数据

```sql
-- AI写真分类
INSERT INTO categories (name, slug, type, sort_order) VALUES
  ('发现', 'discover', 'content', 1000),
  ('网感照', 'aesthetic', 'content', 900),
  ('证件照', 'id-photo', 'content', 800),
  ('海报', 'poster', 'content', 700),
  ('萌宠', 'pet', 'content', 600),
  ('复古', 'vintage', 'content', 500),
  ('艺术', 'art', 'content', 400),
  ('时尚', 'fashion', 'content', 300);

-- 趣味玩法模板类型
INSERT INTO categories (name, slug, type, parent_id, sort_order) VALUES
  ('图片', 'image', 'template', NULL, 1000),
  ('视频', 'video', 'template', NULL, 900);

-- 图片子分类
WITH image_parent AS (SELECT id FROM categories WHERE slug = 'image' AND type = 'template')
INSERT INTO categories (name, slug, type, parent_id, sort_order) VALUES
  ('AI换脸（写真）', 'ai-face-swap', 'template', (SELECT id FROM image_parent), 1000),
  ('AI换人', 'ai-person-swap', 'template', (SELECT id FROM image_parent), 900),
  ('AI换背景', 'ai-background', 'template', (SELECT id FROM image_parent), 800),
  ('趣味玩法', 'fun-features', 'template', (SELECT id FROM image_parent), 700),
  ('一键出片', 'one-click', 'template', (SELECT id FROM image_parent), 600),
  ('图片动起来', 'animate-photo', 'template', (SELECT id FROM image_parent), 500);
```

### 7.2 官方用户

```sql
-- 创建官方账号
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
  '/official-avatar.png',
  '焕星官方账号',
  true,
  'official',
  'active'
);
```

---

## 8. 性能优化建议

### 8.1 分区表
对于数据量大的表，建议使用分区优化查询性能。

```sql
-- 示例：按时间分区work_views表
CREATE TABLE work_views_2025_01 PARTITION OF work_views
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE work_views_2025_02 PARTITION OF work_views
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

### 8.2 物化视图
对于复杂的统计查询，使用物化视图提升性能。

```sql
-- 热门作品物化视图
CREATE MATERIALIZED VIEW hot_works_mv AS
SELECT 
  w.id,
  w.user_id,
  w.title,
  w.thumbnail_url,
  w.views_count,
  w.likes_count,
  w.comments_count,
  w.uses_count,
  (w.views_count * 0.3 + w.likes_count * 0.4 + w.comments_count * 0.2 + w.uses_count * 0.1) as hot_score
FROM works w
WHERE w.deleted_at IS NULL 
  AND w.status = 'published'
  AND w.published_at > NOW() - INTERVAL '7 days'
ORDER BY hot_score DESC
LIMIT 1000;

-- 创建索引
CREATE INDEX idx_hot_works_mv_hot_score ON hot_works_mv(hot_score DESC);

-- 定期刷新（可通过pg_cron实现）
REFRESH MATERIALIZED VIEW CONCURRENTLY hot_works_mv;
```

---

## 9. 数据迁移注意事项

### 9.1 迁移顺序
1. 创建基础表（无依赖）：users, categories, system_configs
2. 创建关联表：user_profiles, ai_avatars, ai_templates
3. 创建内容表：works, ai_generations
4. 创建互动表：follows, likes, comments, shares
5. 创建消息表：conversations, messages, notifications
6. 创建其他表：work_views, user_interests, search_history等
7. 创建视图和触发器
8. 初始化默认数据

### 9.2 回滚计划
每个迁移文件应包含回滚SQL，方便出错时恢复。

---

## 10. 备份策略

### 10.1 自动备份
- Supabase提供自动备份功能
- 建议启用每日自动备份
- 保留最近30天的备份

### 10.2 手动备份
重要操作前手动创建备份点。

```bash
# 使用Supabase CLI备份
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 11. 监控和维护

### 11.1 需要监控的指标
- 表大小和增长速度
- 索引使用率
- 慢查询日志
- 连接数和并发查询数
- 缓存命中率

### 11.2 定期维护任务
```sql
-- 清理过期数据（示例：删除90天前的浏览记录）
DELETE FROM work_views 
WHERE created_at < NOW() - INTERVAL '90 days';

-- 重建索引
REINDEX TABLE works;

-- 更新统计信息
ANALYZE works;

-- 清理死元组
VACUUM ANALYZE;
```

---

## 12. 数据字典

### 12.1 枚举值定义

#### 用户状态 (users.status)
- `active`: 正常
- `banned`: 封禁
- `deleted`: 已删除

#### 作品类型 (works.type)
- `video`: 视频
- `image`: 图片

#### 作品可见性 (works.visibility)
- `public`: 公开
- `private`: 私密
- `followers`: 仅粉丝可见

#### 消息类型 (messages.message_type)
- `text`: 文本
- `image`: 图片
- `file`: 文件
- `system`: 系统消息

#### 通知类型 (notifications.type)
- `like`: 点赞通知
- `comment`: 评论通知
- `follow`: 关注通知
- `system`: 系统通知
- `official`: 官方通知

#### AI生成状态 (ai_generations.status)
- `pending`: 等待中
- `processing`: 处理中
- `completed`: 已完成
- `failed`: 失败

---

## 13. 数据安全

### 13.1 敏感数据保护
- 密码必须使用bcrypt或argon2哈希
- 手机号部分脱敏展示
- 用户IP地址加密存储

### 13.2 数据访问控制
- 通过Supabase RLS策略控制数据访问
- API层添加权限验证
- 敏感操作需要二次验证

---

## 附录A：完整建表SQL

完整的建表SQL脚本请参见: `migrations/001_initial_schema.sql`

## 附录B：测试数据

测试数据脚本请参见: `migrations/seed_test_data.sql`

---

**文档维护者**: 技术团队  
**最后更新**: 2025-10-28

## 趣味玩法专题（新增）

### fun_series
- `id uuid` 主键
- `title text` 标题
- `slug text` 唯一标识
- `cover_url text` 封面
- `description text` 描述
- `sort_order int` 排序
- `is_active boolean` 是否启用
- `created_at timestamptz`
- `updated_at timestamptz`

索引：`(is_active, sort_order)`

### fun_series_items
- `id uuid` 主键
- `series_id uuid` 关联 fun_series
- `work_id uuid` 关联 works
- `title_override text` 标题覆盖
- `cover_url_override text` 封面覆盖
- `sort_order int` 排序
- `is_active boolean` 是否启用
- `created_at timestamptz`
- `updated_at timestamptz`

索引：`(series_id, sort_order)`
### 2.11 生成页功能管理（generation_features）

```sql
CREATE TABLE generation_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  cover_url TEXT,
  description TEXT,
  visibility VARCHAR(20) DEFAULT 'public',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  parent_id UUID,                -- 目录父子关系（树结构）
  is_directory BOOLEAN DEFAULT false, -- 是否目录（否则为具体功能项）
  config JSONB,                  -- 生成请求的 JSON 配置（同作品同款）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_generation_features_active ON generation_features(is_active);
CREATE INDEX idx_generation_features_sort ON generation_features(sort_order DESC);
CREATE INDEX idx_generation_features_parent ON generation_features(parent_id);
```

### 2.12 用户资产（user_assets）

```sql
CREATE TABLE user_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  title VARCHAR(200),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_assets_user_id ON user_assets(user_id);
CREATE INDEX idx_user_assets_created_at ON user_assets(created_at DESC);
```

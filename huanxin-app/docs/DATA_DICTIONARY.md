# 焕星 (HuanXing) - 数据字典

## 文档信息
- **版本**: v1.0
- **创建日期**: 2025-10-28
- **用途**: 详细说明每个表的字段含义和约束

---

## 1. 用户系统表

### 1.1 users (用户表)

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 用户唯一标识 |
| phone | VARCHAR(20) | NOT NULL, UNIQUE | - | 手机号，用于登录 |
| password_hash | VARCHAR(255) | - | NULL | 密码哈希（可选） |
| nickname | VARCHAR(50) | NOT NULL | '新用户' | 用户昵称 |
| avatar_url | TEXT | - | NULL | 头像URL |
| bio | TEXT | - | NULL | 个人简介 |
| gender | VARCHAR(10) | CHECK | NULL | 性别：male/female/other |
| birthday | DATE | - | NULL | 生日 |
| location | VARCHAR(100) | - | NULL | 位置（如：四川成都） |
| following_count | INTEGER | CHECK >= 0 | 0 | 关注数 |
| followers_count | INTEGER | CHECK >= 0 | 0 | 粉丝数 |
| likes_received_count | INTEGER | CHECK >= 0 | 0 | 获赞总数 |
| works_count | INTEGER | CHECK >= 0 | 0 | 作品数 |
| energy_balance | INTEGER | CHECK >= 0 | 60 | 能量余额 |
| status | VARCHAR(20) | CHECK | 'active' | 账户状态 |
| is_verified | BOOLEAN | - | false | 是否认证 |
| verified_type | VARCHAR(20) | CHECK | NULL | 认证类型 |
| settings | JSONB | - | '{}' | 用户设置JSON |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 创建时间 |
| updated_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 更新时间 |
| last_login_at | TIMESTAMP WITH TIME ZONE | - | NULL | 最后登录时间 |
| deleted_at | TIMESTAMP WITH TIME ZONE | - | NULL | 软删除时间 |

**索引**:
- `idx_users_phone` - 手机号索引
- `idx_users_nickname` - 昵称索引
- `idx_users_created_at` - 创建时间索引
- `idx_users_status` - 状态索引

**业务规则**:
- 手机号必须唯一
- 新用户默认60能量值
- 统计字段通过触发器自动维护
- 软删除不物理删除记录

---

### 1.2 user_profiles (用户扩展资料表)

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| user_id | UUID | NOT NULL, UNIQUE | - | 用户ID（逻辑外键） |
| tags | TEXT[] | - | NULL | 个人标签数组 |
| zodiac_sign | VARCHAR(20) | - | NULL | 星座 |
| age_group | VARCHAR(20) | - | NULL | 年龄段（如：00后） |
| social_links | JSONB | - | '{}' | 社交媒体链接 |
| privacy_settings | JSONB | - | 见说明 | 隐私设置 |
| location | VARCHAR(100) | - | NULL | 所在地 |
| website | VARCHAR(200) | - | NULL | 个人网站 |
| education | VARCHAR(100) | - | NULL | 教育背景 |
| relationship_status | VARCHAR(30) | CHECK | NULL | 感情状态（single/in_relationship/married/complicated/prefer_not_to_say） |
| height | INTEGER | CHECK > 0 AND < 300 | NULL | 身高(cm) |
| weight | INTEGER | CHECK > 0 AND < 500 | NULL | 体重(kg) |
| blood_type | VARCHAR(5) | CHECK | NULL | 血型（A/B/AB/O/+/- 组合） |
| mbti | VARCHAR(4) | CHECK length=4 | NULL | MBTI类型 |
| personality_description | TEXT | - | NULL | 性格描述 |
| favorite_quote | TEXT | - | NULL | 喜爱的名言 |
| hobbies | TEXT[] | - | NULL | 兴趣爱好 |
| languages | TEXT[] | - | NULL | 掌握语言 |
| theme_preference | VARCHAR(10) | CHECK | 'auto' | 主题偏好（light/dark/auto） |
| notification_settings | JSONB | - | 见说明 | 通知设置 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 创建时间 |
| updated_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 更新时间 |

**privacy_settings 结构**:
```json
{
  "show_following": true,
  "show_followers": true,
  "show_likes": true,
  "allow_messages": "everyone"
}
```

**notification_settings 结构**:
```json
{
  "likes": true,
  "system": true,
  "follows": true,
  "comments": true,
  "messages": true,
  "push_notifications": true,
  "email_notifications": false
}
```

---

### 1.3 ai_avatars (AI分身表)

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| user_id | UUID | NOT NULL | - | 用户ID（逻辑外键） |
| name | VARCHAR(100) | NOT NULL | - | 分身名称 |
| avatar_url | TEXT | NOT NULL | - | 分身头像URL |
| version | VARCHAR(20) | - | NULL | 模型版本（2.0/3.0） |
| training_images | TEXT[] | - | '{}' | 训练图片URL数组 |
| training_params | JSONB | - | NULL | 训练参数 |
| is_active | BOOLEAN | - | false | 是否当前使用 |
| status | VARCHAR(20) | CHECK | 'active' | 状态 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 创建时间 |
| updated_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 更新时间 |
| deleted_at | TIMESTAMP WITH TIME ZONE | - | NULL | 删除时间 |

**status 枚举值**:
- `training`: 训练中
- `active`: 可用
- `failed`: 训练失败

---

## 2. 内容系统表

### 2.1 works (作品表)

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 作品ID |
| user_id | UUID | NOT NULL | - | 作者ID（逻辑外键） |
| title | VARCHAR(200) | - | NULL | 标题 |
| description | TEXT | - | NULL | 描述/文案 |
| type | VARCHAR(20) | NOT NULL, CHECK | - | 类型：video/image |
| media_url | TEXT | NOT NULL | - | 主媒体URL |
| thumbnail_url | TEXT | - | NULL | 缩略图URL |
| cover_url | TEXT | - | NULL | 封面图URL |
| duration | INTEGER | CHECK > 0 | NULL | 视频时长（秒） |
| video_width | INTEGER | - | NULL | 视频宽度 |
| video_height | INTEGER | - | NULL | 视频高度 |
| audio_url | TEXT | - | NULL | 背景音乐URL |
| audio_name | VARCHAR(100) | - | NULL | 音乐名称 |
| audio_author | VARCHAR(100) | - | NULL | 音乐作者 |
| category | VARCHAR(50) | - | NULL | 分类 |
| sub_category | VARCHAR(50) | - | NULL | 子分类 |
| tags | TEXT[] | - | '{}' | 标签数组 |
| is_ai_generated | BOOLEAN | - | false | 是否AI生成 |
| template_id | UUID | - | NULL | 模板ID（逻辑外键） |
| generation_params | JSONB | - | NULL | 生成参数 |
| views_count | INTEGER | CHECK >= 0 | 0 | 浏览次数 |
| likes_count | INTEGER | CHECK >= 0 | 0 | 点赞数 |
| comments_count | INTEGER | CHECK >= 0 | 0 | 评论数 |
| shares_count | INTEGER | CHECK >= 0 | 0 | 分享数 |
| uses_count | INTEGER | CHECK >= 0 | 0 | 使用次数 |
| status | VARCHAR(20) | CHECK | 'published' | 状态 |
| visibility | VARCHAR(20) | CHECK | 'public' | 可见性 |
| location | VARCHAR(100) | - | NULL | 发布位置 |
| published_at | TIMESTAMP WITH TIME ZONE | - | NULL | 发布时间 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 创建时间 |
| updated_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 更新时间 |
| deleted_at | TIMESTAMP WITH TIME ZONE | - | NULL | 删除时间 |

**type 枚举值**:
- `video`: 视频
- `image`: 图片

**status 枚举值**:
- `draft`: 草稿
- `published`: 已发布
- `reviewing`: 审核中
- `rejected`: 已拒绝

**visibility 枚举值**:
- `public`: 公开（所有人可见）
- `private`: 私密（仅自己可见）
- `followers`: 粉丝可见

**索引**:
- 10个索引用于优化查询
- 全文搜索索引用于标题和描述搜索

---

### 2.2 categories (分类表)

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 分类ID |
| name | VARCHAR(100) | NOT NULL | - | 分类名称 |
| slug | VARCHAR(100) | NOT NULL, UNIQUE | - | URL友好标识符 |
| parent_id | UUID | - | NULL | 父分类ID（逻辑外键） |
| type | VARCHAR(50) | NOT NULL, CHECK | - | 类型：content/template |
| icon_url | TEXT | - | NULL | 图标URL |
| cover_url | TEXT | - | NULL | 封面图URL |
| is_active | BOOLEAN | - | true | 是否启用 |
| sort_order | INTEGER | - | 0 | 排序权重 |
| description | TEXT | - | NULL | 分类描述 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 创建时间 |
| updated_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 更新时间 |

**type 枚举值**:
- `content`: 内容分类（如：网感照、证件照）
- `template`: 模板分类（如：AI换脸、AI换装）

**业务规则**:
- 支持多级分类（通过parent_id）
- slug用于URL路由
- sort_order越大越靠前

---

## 3. 社交互动表

### 3.1 follows (关注关系表)

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| follower_id | UUID | NOT NULL | - | 关注者ID（逻辑外键） |
| following_id | UUID | NOT NULL | - | 被关注者ID（逻辑外键） |
| status | VARCHAR(20) | CHECK | 'active' | 状态 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 关注时间 |

**约束**:
- UNIQUE(follower_id, following_id) - 防止重复关注
- CHECK(follower_id != following_id) - 不能关注自己

**status 枚举值**:
- `active`: 正常
- `blocked`: 已拉黑

---

### 3.2 likes (点赞表)

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| user_id | UUID | NOT NULL | - | 用户ID（逻辑外键） |
| work_id | UUID | NOT NULL | - | 作品ID（逻辑外键） |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 点赞时间 |

**约束**:
- UNIQUE(user_id, work_id) - 防止重复点赞

**触发器**:
- 插入时自动增加works.likes_count
- 删除时自动减少works.likes_count

---

### 3.3 comments (评论表)

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 评论ID |
| user_id | UUID | NOT NULL | - | 评论者ID（逻辑外键） |
| work_id | UUID | NOT NULL | - | 作品ID（逻辑外键） |
| parent_id | UUID | - | NULL | 父评论ID（回复功能） |
| content | TEXT | NOT NULL | - | 评论文本内容 |
| images | TEXT[] | - | '{}' | 评论图片URL数组 |
| location | VARCHAR(100) | - | NULL | 评论位置 |
| likes_count | INTEGER | CHECK >= 0 | 0 | 点赞数 |
| replies_count | INTEGER | CHECK >= 0 | 0 | 回复数 |
| status | VARCHAR(20) | CHECK | 'published' | 状态 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 创建时间 |
| updated_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 更新时间 |
| deleted_at | TIMESTAMP WITH TIME ZONE | - | NULL | 删除时间 |

**status 枚举值**:
- `published`: 已发布
- `hidden`: 已隐藏
- `deleted`: 已删除

**业务规则**:
- parent_id为NULL表示一级评论
- parent_id不为NULL表示回复评论
- 支持图片评论（最多9张）

---

## 4. AI系统表

### 4.1 ai_templates (AI模板表)

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 模板ID |
| name | VARCHAR(100) | NOT NULL | - | 模板名称 |
| description | TEXT | - | NULL | 模板描述 |
| thumbnail_url | TEXT | NOT NULL | - | 模板缩略图 |
| preview_urls | TEXT[] | - | '{}' | 预览图数组 |
| category | VARCHAR(50) | NOT NULL, CHECK | - | 大类 |
| sub_category | VARCHAR(50) | NOT NULL | - | 子类 |
| template_type | VARCHAR(50) | NOT NULL | - | 具体类型 |
| tags | TEXT[] | - | '{}' | 标签数组 |
| is_new | BOOLEAN | - | true | 是否新模板 |
| is_hot | BOOLEAN | - | false | 是否热门 |
| uses_count | INTEGER | CHECK >= 0 | 0 | 使用次数 |
| energy_cost | INTEGER | CHECK >= 0 | 20 | 能量消耗 |
| config | JSONB | NOT NULL | '{}' | 模板配置参数 |
| status | VARCHAR(20) | CHECK | 'active' | 状态 |
| sort_order | INTEGER | - | 0 | 排序权重 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 创建时间 |
| updated_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 更新时间 |

**category 枚举值**:
- `image`: 图片生成
- `video`: 视频生成

**template_type 示例**:
- `face-swap`: 换脸
- `outfit-change`: 换装
- `background-change`: 换背景
- `animation`: 动画化
- `style-transfer`: 风格迁移

**config 结构示例**:
```json
{
  "model_version": "2.0",
  "style": "fantasy",
  "parameters": {
    "quality": "high",
    "aspect_ratio": "9:16"
  }
}
```

---

### 4.2 ai_generations (AI生成记录表)

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 任务ID |
| user_id | UUID | NOT NULL | - | 用户ID（逻辑外键） |
| template_id | UUID | - | NULL | 模板ID（逻辑外键） |
| input_type | VARCHAR(50) | NOT NULL, CHECK | - | 输入类型 |
| input_data | JSONB | NOT NULL | '{}' | 输入数据 |
| source_urls | TEXT[] | - | '{}' | 源文件URL数组 |
| generation_params | JSONB | - | NULL | 生成参数 |
| prompt | TEXT | - | NULL | 文本提示词 |
| output_url | TEXT | - | NULL | 生成结果URL |
| output_type | VARCHAR(20) | CHECK | NULL | 输出类型 |
| work_id | UUID | - | NULL | 关联作品ID |
| status | VARCHAR(20) | CHECK | 'pending' | 任务状态 |
| progress | INTEGER | CHECK 0-100 | 0 | 进度百分比 |
| error_message | TEXT | - | NULL | 错误信息 |
| energy_cost | INTEGER | - | 20 | 消耗能量值 |
| started_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 开始时间 |
| completed_at | TIMESTAMP WITH TIME ZONE | - | NULL | 完成时间 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 创建时间 |
| updated_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 更新时间 |

**input_type 枚举值**:
- `image`: 图片输入
- `text`: 文本输入
- `audio`: 音频输入

**status 枚举值**:
- `pending`: 等待中
- `processing`: 处理中
- `completed`: 已完成
- `failed`: 失败

**业务流程**:
1. 用户创建任务时扣除能量
2. 任务进入队列等待处理
3. AI服务处理并更新进度
4. 完成后更新output_url
5. 用户可选择发布为作品

---

## 5. 消息系统表

### 5.1 conversations (会话表)

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 会话ID |
| participant_1_id | UUID | NOT NULL | - | 参与者A ID（uuid 较小） |
| participant_2_id | UUID | NOT NULL | - | 参与者B ID（uuid 较大） |
| type | TEXT | NOT NULL, CHECK | 'direct' | 会话类型 direct/system |
| status | TEXT | NOT NULL, CHECK | 'active' | active/archived/blocked |
| initiator_id | UUID | - | NULL | 发起人 |
| direct_key | TEXT | GENERATED | - | 生成列：least(p1,p2)||':'||greatest(p1,p2) |
| last_message_id | UUID | - | NULL | 最新消息ID |
| last_message_type | VARCHAR(20) | - | NULL | 最新消息类型 |
| last_message_media_url | TEXT | - | NULL | 最新消息媒体URL |
| last_message_content | TEXT | - | NULL | 最新消息文案 |
| last_message_at | TIMESTAMP WITH TIME ZONE | - | NULL | 最新消息时间 |
| last_sender_id | UUID | - | NULL | 最新消息发送人 |
| unread_count_p1 | INTEGER | CHECK >= 0 | 0 | 参与者A未读数 |
| unread_count_p2 | INTEGER | CHECK >= 0 | 0 | 参与者B未读数 |
| metadata | JSONB | NOT NULL | '{}' | 扩展信息 |
| archived_at | TIMESTAMP WITH TIME ZONE | - | NULL | 归档时间 |
| deleted_at | TIMESTAMP WITH TIME ZONE | - | NULL | 删除时间 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 创建时间 |
| updated_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 更新时间 |

**约束**:
- UNIQUE(direct_key) WHERE type='direct' - 保证一对用户唯一会话
- CHECK(participant_1_id <> participant_2_id)
- CHECK(status IN ('active','archived','blocked'))
- CHECK(type IN ('direct','system'))

---
### 5.2 messages (消息表)

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 消息ID |
| conversation_id | UUID | NOT NULL | - | 会话ID（逻辑外键） |
| sender_id | UUID | NOT NULL | - | 发送者ID（逻辑外键） |
| content | TEXT | - | NULL | 文本内容 |
| message_type | VARCHAR(20) | NOT NULL, CHECK | 'text' | text/image/video/audio/file/system |
| media_url | TEXT | - | NULL | 媒体URL |
| media_type | VARCHAR(50) | - | NULL | 媒体类型 |
| media_size | INTEGER | - | NULL | 文件大小（字节） |
| media_name | VARCHAR(255) | - | NULL | 文件名 |
| reply_to_message_id | UUID | - | NULL | 回复引用ID |
| metadata | JSONB | - | '{}' | 扩展字段 |
| client_message_id | TEXT | - | NULL | 客户端侧消息ID |
| status | TEXT | NOT NULL, CHECK | 'sent' | sent/delivered/read |
| delivered_at | TIMESTAMP WITH TIME ZONE | - | NULL | 投递时间 |
| is_read | BOOLEAN | - | false | 是否已读 |
| read_at | TIMESTAMP WITH TIME ZONE | - | NULL | 已读时间 |
| is_recalled | BOOLEAN | - | false | 是否已撤回 |
| recalled_at | TIMESTAMP WITH TIME ZONE | - | NULL | 撤回时间 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 创建时间 |
| updated_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 更新时间 |

**约束/枚举**:
- message_type IN (text,image,video,audio,file,system)
- status IN (sent, delivered, read)

**media_type 示例**:
- image/jpeg
- image/png
- application/pdf

---
### 5.3 notifications (通知表)

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 通知ID |
| user_id | UUID | NOT NULL | - | 接收者ID（逻辑外键） |
| type | VARCHAR(50) | NOT NULL, CHECK | - | 通知类型 |
| title | VARCHAR(200) | - | NULL | 通知标题 |
| content | TEXT | NOT NULL | - | 通知内容 |
| sender_id | UUID | - | NULL | 发送者ID（逻辑外键） |
| work_id | UUID | - | NULL | 关联作品ID |
| comment_id | UUID | - | NULL | 关联评论ID |
| thumbnail_url | TEXT | - | NULL | 缩略图 |
| extra_data | JSONB | - | NULL | 额外数据 |
| is_read | BOOLEAN | - | false | 是否已读 |
| is_official | BOOLEAN | - | false | 是否官方通知 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 创建时间 |
| read_at | TIMESTAMP WITH TIME ZONE | - | NULL | 已读时间 |

**type 枚举值**:
- `like`: 点赞通知
- `comment`: 评论通知
- `follow`: 关注通知
- `system`: 系统通知
- `official`: 官方通知

**extra_data 结构示例**:
```json
{
  "activity_id": "uuid",
  "activity_type": "halloween",
  "reward_amount": 100
}
```

---

## 6. 能量系统表

### 6.1 energy_transactions (能量交易记录表)

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 交易ID |
| user_id | UUID | NOT NULL | - | 用户ID（逻辑外键） |
| amount | INTEGER | NOT NULL | - | 变动数量（±） |
| balance_after | INTEGER | NOT NULL | - | 交易后余额 |
| type | VARCHAR(50) | NOT NULL, CHECK | - | 交易类型 |
| source | VARCHAR(100) | - | NULL | 来源说明 |
| related_id | UUID | - | NULL | 关联对象ID |
| related_type | VARCHAR(50) | - | NULL | 关联对象类型 |
| description | TEXT | - | NULL | 交易描述 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 交易时间 |

**type 枚举值**:
- `generation`: AI生成消耗
- `purchase`: 购买充值
- `reward`: 奖励获得
- `refund`: 退款

**amount 规则**:
- 正数表示增加
- 负数表示减少

**示例记录**:
```sql
-- AI生成扣费
INSERT INTO energy_transactions (user_id, amount, balance_after, type, related_id, related_type, description)
VALUES ('user-uuid', -20, 40, 'generation', 'gen-uuid', 'ai_generation', 'AI视频生成');

-- 每日签到奖励
INSERT INTO energy_transactions (user_id, amount, balance_after, type, description)
VALUES ('user-uuid', 10, 70, 'reward', '每日签到奖励');
```

---

## 7. 辅助表

### 7.1 work_views (浏览记录表)

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 记录ID |
| user_id | UUID | - | NULL | 用户ID（可为空） |
| work_id | UUID | NOT NULL | - | 作品ID（逻辑外键） |
| view_duration | INTEGER | - | NULL | 观看时长（秒） |
| is_completed | BOOLEAN | - | false | 是否看完 |
| device_info | JSONB | - | NULL | 设备信息 |
| ip_address | VARCHAR(50) | - | NULL | IP地址 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 浏览时间 |

**用途**:
- 统计作品浏览量
- 推荐算法数据源
- 用户行为分析

**device_info 结构**:
```json
{
  "platform": "iOS",
  "version": "16.0",
  "device": "iPhone 14 Pro"
}
```

---

### 7.2 search_history (搜索历史表)

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 记录ID |
| user_id | UUID | NOT NULL | - | 用户ID（逻辑外键） |
| keyword | VARCHAR(200) | NOT NULL | - | 搜索关键词 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 搜索时间 |

**业务规则**:
- 每次搜索都创建新记录
- 前端显示最近搜索（去重）
- 定期清理过期记录

---

### 7.3 trending_searches (热门搜索表)

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| keyword | VARCHAR(200) | UNIQUE, NOT NULL | - | 热门关键词 |
| search_count | INTEGER | - | 0 | 搜索次数 |
| is_active | BOOLEAN | - | true | 是否展示 |
| sort_order | INTEGER | - | 0 | 排序权重 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 创建时间 |
| updated_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 更新时间 |

**维护策略**:
- 通过定时任务统计搜索热度
- 运营手动设置展示的热搜
- sort_order控制展示顺序

---

## 8. 字段类型说明

### 8.1 常用字段类型

| 类型 | 说明 | 示例 |
|------|------|------|
| UUID | 唯一标识符 | '550e8400-e29b-41d4-a716-446655440000' |
| VARCHAR(n) | 可变长字符串 | '用户昵称' |
| TEXT | 长文本 | '这是一段很长的描述...' |
| INTEGER | 整数 | 42 |
| BOOLEAN | 布尔值 | true/false |
| DATE | 日期 | '2025-01-27' |
| TIMESTAMP WITH TIME ZONE | 带时区时间戳 | '2025-01-27T10:00:00Z' |
| JSONB | JSON二进制 | {"key": "value"} |
| TEXT[] | 文本数组 | ['tag1', 'tag2'] |
| DECIMAL(5,2) | 小数 | 12.34 |

### 8.2 JSONB字段说明

#### users.settings
```json
{
  "no_watermark": false,
  "theme": "light",
  "language": "zh-CN",
  "privacy": {
    "show_following": true,
    "show_followers": true,
    "show_likes": true,
    "allow_messages": "everyone"
  },
  "notifications": {
    "likes": true,
    "comments": true,
    "follows": true,
    "system": true
  }
}
```

#### works.generation_params
```json
{
  "template_id": "uuid",
  "model_version": "2.0",
  "duration": 5,
  "mode": "fast",
  "style": "fantasy",
  "quality": "high",
  "custom_params": {
    "face_enhancement": true,
    "background_blur": 0.5
  }
}
```

---

## 9. 约束和验证

### 9.1 CHECK约束

```sql
-- 性别约束
gender IN ('male', 'female', 'other')

-- 状态约束
status IN ('active', 'banned', 'deleted')

-- 可见性约束
visibility IN ('public', 'private', 'followers')

-- 非负数约束
energy_balance >= 0
likes_count >= 0

-- 进度范围约束
progress >= 0 AND progress <= 100

-- 关注约束（不能关注自己）
follower_id != following_id
```

### 9.2 唯一约束

```sql
-- 防止重复关注
UNIQUE(follower_id, following_id)

-- 防止重复点赞
UNIQUE(user_id, work_id)

-- 防止重复评论点赞
UNIQUE(user_id, comment_id)

-- 会话唯一性
UNIQUE(participant_1_id, participant_2_id)
```

---

## 10. 触发器说明

### 10.1 自动更新触发器

所有包含 `updated_at` 字段的表都有自动更新触发器：
```sql
CREATE TRIGGER update_tablename_updated_at 
  BEFORE UPDATE ON tablename 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

### 10.2 统计同步触发器

#### 点赞数同步
- 表：`likes`
- 触发时机：INSERT/DELETE
- 影响：自动更新 `works.likes_count`

#### 评论数同步
- 表：`comments`
- 触发时机：INSERT/DELETE/UPDATE
- 影响：自动更新 `works.comments_count`

#### 关注数同步
- 表：`follows`
- 触发时机：INSERT/DELETE
- 影响：自动更新 `users.following_count` 和 `users.followers_count`

#### 评论点赞数同步
- 表：`comment_likes`
- 触发时机：INSERT/DELETE
- 影响：自动更新 `comments.likes_count`

---

## 11. 数据生命周期

### 11.1 软删除策略

需要软删除的表：
- `users` - 用户可能需要恢复
- `works` - 作品可能需要恢复
- `comments` - 评论可能需要审核
- `ai_avatars` - 分身可能需要恢复

不需要软删除的表：
- `likes` - 点赞直接删除
- `follows` - 关注直接删除
- `messages` - 消息撤回用is_recalled标记
- `search_history` - 历史记录直接删除

### 11.2 数据清理策略

```sql
-- 清理90天前的浏览记录
DELETE FROM work_views 
WHERE created_at < NOW() - INTERVAL '90 days';

-- 清理30天前的搜索历史
DELETE FROM search_history 
WHERE created_at < NOW() - INTERVAL '30 days';

-- 清理已删除用户的数据（软删除180天后）
DELETE FROM users 
WHERE deleted_at < NOW() - INTERVAL '180 days';
```

---

## 12. 数据迁移规范

### 12.1 迁移文件命名

```
migrations/
├── 001_initial_schema.sql          # 初始表结构
├── 002_add_user_tags.sql           # 添加用户标签
├── 003_add_work_location.sql       # 添加作品位置
└── 004_create_reports_table.sql    # 创建举报表
```

### 12.2 迁移文件模板

```sql
-- Migration: 迁移名称
-- Created: 2025-01-27
-- Description: 迁移描述

-- ===== UP Migration =====
BEGIN;

-- 你的DDL语句
ALTER TABLE users ADD COLUMN new_field VARCHAR(100);

COMMIT;

-- ===== DOWN Migration =====
-- BEGIN;
-- 
-- ALTER TABLE users DROP COLUMN new_field;
-- 
-- COMMIT;
```

---

## 13. 性能基准

### 13.1 查询性能目标

| 查询类型 | P50 | P95 | P99 |
|----------|-----|-----|-----|
| 用户信息查询 | <10ms | <20ms | <50ms |
| 作品列表查询 | <50ms | <100ms | <200ms |
| 作品详情查询 | <20ms | <50ms | <100ms |
| 评论列表查询 | <30ms | <80ms | <150ms |
| 搜索查询 | <100ms | <300ms | <500ms |
| 消息列表查询 | <30ms | <60ms | <120ms |

### 13.2 并发性能目标

- 支持 1000+ 并发用户
- 支持 10000+ QPS
- 数据库连接池：50-100个连接

---

## 14. 备份恢复

### 14.1 备份策略

**全量备份**:
```bash
# 每日凌晨3点自动备份
supabase db dump -f backups/full_$(date +%Y%m%d).sql
```

**增量备份**:
```bash
# WAL归档（每小时）
# Supabase自动处理
```

### 14.2 恢复步骤

```bash
# 1. 停止服务
# 2. 恢复数据库
supabase db reset
psql -d database_name -f backups/full_20250127.sql

# 3. 验证数据
# 4. 重启服务
```

---

## 15. 常见SQL查询

### 15.1 用户相关

```sql
-- 获取用户完整信息
SELECT 
  u.*,
  up.tags,
  up.zodiac_sign
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.id = $1;

-- 获取用户作品
SELECT * FROM works
WHERE user_id = $1 
  AND deleted_at IS NULL 
  AND status = 'published'
ORDER BY published_at DESC;

-- 检查互相关注
SELECT 
  EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2) as is_following,
  EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = $1) as is_followed_by;
```

### 15.2 作品相关

```sql
-- 获取作品详情（含作者信息）
SELECT 
  w.*,
  json_build_object(
    'id', u.id,
    'nickname', u.nickname,
    'avatar_url', u.avatar_url,
    'is_verified', u.is_verified
  ) as author,
  EXISTS(SELECT 1 FROM likes WHERE user_id = $2 AND work_id = w.id) as is_liked
FROM works w
JOIN users u ON w.user_id = u.id
WHERE w.id = $1 AND w.deleted_at IS NULL;

-- 获取热门作品
SELECT 
  w.*,
  (w.views_count * 0.3 + w.likes_count * 0.4 + w.comments_count * 0.2 + w.uses_count * 0.1) as hot_score
FROM works w
WHERE w.status = 'published' 
  AND w.deleted_at IS NULL
  AND w.published_at > NOW() - INTERVAL '7 days'
ORDER BY hot_score DESC
LIMIT 50;
```

### 15.3 推荐算法相关

```sql
-- 基于用户兴趣的推荐
WITH user_tags AS (
  SELECT tag, weight 
  FROM user_interests 
  WHERE user_id = $1
)
SELECT w.*, 
  SUM(
    CASE WHEN ut.tag = ANY(w.tags) 
    THEN ut.weight 
    ELSE 0 
    END
  ) as relevance_score
FROM works w
CROSS JOIN user_tags ut
WHERE w.deleted_at IS NULL 
  AND w.status = 'published'
GROUP BY w.id
ORDER BY relevance_score DESC, w.published_at DESC
LIMIT 20;
```

---

## 16. 数据质量规则

### 16.1 必填字段
- `users.phone` - 登录凭证
- `users.nickname` - 用户标识
- `works.media_url` - 作品主体
- `works.type` - 区分类型
- `comments.content` - 评论内容
- `messages.message_type` - 消息类型

### 16.2 数据范围
- 能量值：0 - 1000
- 视频时长：1 - 60秒
- 图片大小：< 10MB
- 视频大小：< 100MB
- 昵称长度：2 - 50字符
- 简介长度：0 - 500字符

### 16.3 数据格式
- 手机号：中国大陆手机号格式
- 日期：ISO 8601格式
- URL：HTTPS协议
- 标签：每个标签2-10字符，最多10个

---

## 17. 数据统计SQL

### 17.1 平台统计

```sql
-- 总用户数
SELECT COUNT(*) FROM users WHERE deleted_at IS NULL;

-- 活跃用户数（30天内登录）
SELECT COUNT(*) FROM users 
WHERE last_login_at > NOW() - INTERVAL '30 days';

-- 总作品数
SELECT COUNT(*) FROM works WHERE deleted_at IS NULL;

-- 今日新增作品
SELECT COUNT(*) FROM works 
WHERE DATE(created_at) = CURRENT_DATE;

-- 总点赞数
SELECT SUM(likes_count) FROM works;

-- 总评论数
SELECT SUM(comments_count) FROM works;
```

### 17.2 用户统计

```sql
-- 用户作品统计
SELECT 
  u.nickname,
  COUNT(w.id) as works_count,
  SUM(w.views_count) as total_views,
  SUM(w.likes_count) as total_likes
FROM users u
LEFT JOIN works w ON u.id = w.user_id AND w.deleted_at IS NULL
WHERE u.id = $1
GROUP BY u.id;

-- 用户能量使用统计
SELECT 
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_earned,
  SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_spent,
  COUNT(*) as transaction_count
FROM energy_transactions
WHERE user_id = $1;
```

---

## 附录A：完整字段清单

所有表的完整字段定义请参见 `DATABASE_DESIGN.md`

## 附录B：枚举值完整列表

| 表名 | 字段名 | 枚举值 |
|------|--------|--------|
| users | status | active, banned, deleted |
| users | gender | male, female, other |
| users | verified_type | official, creator |
| works | type | video, image |
| works | status | draft, published, reviewing, rejected |
| works | visibility | public, private, followers |
| follows | status | active, blocked |
| comments | status | published, hidden, deleted |
| messages | message_type | text, image, file, system |
| notifications | type | like, comment, follow, system, official |
| ai_templates | category | image, video |
| ai_templates | status | active, inactive |
| ai_generations | input_type | image, text, audio |
| ai_generations | status | pending, processing, completed, failed |
| ai_generations | output_type | image, video |
| ai_avatars | status | training, active, failed |
| energy_transactions | type | generation, purchase, reward, refund |
| categories | type | content, template |
| reports | target_type | work, comment, user |
| reports | status | pending, reviewing, handled, rejected |

---

**文档维护者**: 技术团队  
**最后更新**: 2025-10-28

### generation_features

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| name | VARCHAR(100) | NOT NULL | - | 功能名或目录名 |
| slug | VARCHAR(100) | UNIQUE | - | 唯一标识 |
| cover_url | TEXT | - | NULL | 封面图片 |
| description | TEXT | - | NULL | 说明文案 |
| visibility | VARCHAR(20) | - | 'public' | 可见性 |
| is_active | BOOLEAN | - | true | 是否启用 |
| sort_order | INTEGER | - | 0 | 排序权重 |
| parent_id | UUID | - | NULL | 父级目录ID（树结构） |
| is_directory | BOOLEAN | - | false | 是否目录 |
| config | JSONB | - | NULL | 生成请求配置（同作品同款） |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 创建时间 |
| updated_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 更新时间 |

### user_assets

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | UUID | PK | gen_random_uuid() | 主键 |
| user_id | UUID | NOT NULL | - | 用户ID |
| image_url | TEXT | NOT NULL | - | 资产图片URL |
| title | VARCHAR(200) | - | NULL | 标题 |
| tags | TEXT[] | - | '{}' | 标签 |
| created_at | TIMESTAMP WITH TIME ZONE | - | NOW() | 创建时间 |


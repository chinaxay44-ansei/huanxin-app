# 焕星 (HuanXing) - 数据模型ER图

## 1. 完整ER图

```mermaid
erDiagram
    %% 用户系统
    users ||--o| user_profiles : "has"
    users ||--o{ ai_avatars : "owns"
    users ||--o{ energy_transactions : "has"
    users ||--o{ follows : "follower"
    users ||--o{ follows : "following"
    
    %% 内容系统
    users ||--o{ works : "creates"
    works ||--o{ likes : "receives"
    works ||--o{ comments : "receives"
    works ||--o{ shares : "receives"
    works ||--o{ work_views : "receives"
    works ||--o{ work_categories : "belongs_to"
    categories ||--o{ work_categories : "contains"
    
    %% AI系统
    ai_templates ||--o{ ai_generations : "used_in"
    ai_templates ||--o{ works : "generates"
    users ||--o{ ai_generations : "initiates"
    ai_generations ||--o| works : "produces"
    
    %% 消息系统
    users ||--o{ conversations : "participant_1"
    users ||--o{ conversations : "participant_2"
    conversations ||--o{ messages : "contains"
    users ||--o{ messages : "sends"
    
    %% 通知系统
    users ||--o{ notifications : "receives"
    users ||--o{ notifications : "sends"
    
    %% 搜索系统
    users ||--o{ search_history : "searches"
    
    %% 兴趣系统
    users ||--o{ user_interests : "has"
    
    %% 评论系统
    users ||--o{ comments : "writes"
    users ||--o{ comment_likes : "likes"
    comments ||--o{ comment_likes : "receives"
    comments ||--o{ comments : "replies"
    
    %% 举报系统
    users ||--o{ reports : "reports"

    users {
        uuid id PK
        varchar phone UK
        varchar nickname
        text avatar_url
        text bio
        varchar gender
        date birthday
        varchar location
        int following_count
        int followers_count
        int likes_received_count
        int works_count
        int energy_balance
        varchar status
        boolean is_verified
        jsonb settings
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    user_profiles {
        uuid id PK
        uuid user_id FK
        text_array tags
        varchar zodiac_sign
        varchar age_group
        jsonb social_links
        jsonb privacy_settings
        timestamp created_at
        timestamp updated_at
    }

    works {
        uuid id PK
        uuid user_id FK
        varchar title
        text description
        varchar type
        text media_url
        text thumbnail_url
        text cover_url
        int duration
        text audio_url
        varchar audio_name
        varchar category
        varchar sub_category
        text_array tags
        boolean is_ai_generated
        uuid template_id FK
        jsonb generation_params
        int views_count
        int likes_count
        int comments_count
        int shares_count
        int uses_count
        varchar status
        varchar visibility
        varchar location
        timestamp published_at
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    follows {
        uuid id PK
        uuid follower_id FK
        uuid following_id FK
        varchar status
        timestamp created_at
    }

    likes {
        uuid id PK
        uuid user_id FK
        uuid work_id FK
        timestamp created_at
    }

    comments {
        uuid id PK
        uuid user_id FK
        uuid work_id FK
        uuid parent_id FK
        text content
        text_array images
        varchar location
        int likes_count
        int replies_count
        varchar status
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    comment_likes {
        uuid id PK
        uuid user_id FK
        uuid comment_id FK
        timestamp created_at
    }

    shares {
        uuid id PK
        uuid user_id FK
        uuid work_id FK
        varchar platform
        timestamp created_at
    }

    conversations {
        uuid id PK
        uuid participant_1_id FK
        uuid participant_2_id FK
        text last_message_content
        timestamp last_message_at
        uuid last_sender_id FK
        int unread_count_p1
        int unread_count_p2
        timestamp created_at
        timestamp updated_at
    }

    messages {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id FK
        text content
        varchar message_type
        text media_url
        varchar media_type
        int media_size
        varchar media_name
        uuid reply_to_message_id
        jsonb metadata
        text client_message_id
        timestamp read_at
        boolean is_read
        boolean is_recalled
        timestamp recalled_at
        timestamp created_at
        timestamp updated_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        varchar type
        varchar title
        text content
        uuid sender_id FK
        uuid work_id FK
        uuid comment_id FK
        text thumbnail_url
        jsonb extra_data
        boolean is_read
        boolean is_official
        timestamp created_at
        timestamp read_at
    }

    ai_templates {
        uuid id PK
        varchar name
        text description
        text thumbnail_url
        text_array preview_urls
        varchar category
        varchar sub_category
        varchar template_type
        text_array tags
        boolean is_new
        boolean is_hot
        int uses_count
        int energy_cost
        jsonb config
        varchar status
        int sort_order
        timestamp created_at
        timestamp updated_at
    }

    ai_generations {
        uuid id PK
        uuid user_id FK
        uuid template_id FK
        varchar input_type
        jsonb input_data
        text_array source_urls
        jsonb generation_params
        text prompt
        text output_url
        varchar output_type
        uuid work_id FK
        varchar status
        int progress
        text error_message
        int energy_cost
        timestamp started_at
        timestamp completed_at
        timestamp created_at
        timestamp updated_at
    }

    ai_avatars {
        uuid id PK
        uuid user_id FK
        varchar name
        text avatar_url
        varchar version
        text_array training_images
        jsonb training_params
        boolean is_active
        varchar status
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    energy_transactions {
        uuid id PK
        uuid user_id FK
        int amount
        int balance_after
        varchar type
        varchar source
        uuid related_id
        varchar related_type
        text description
        timestamp created_at
    }

    categories {
        uuid id PK
        varchar name
        varchar slug UK
        uuid parent_id FK
        varchar type
        text icon_url
        text cover_url
        boolean is_active
        int sort_order
        text description
        timestamp created_at
        timestamp updated_at
    }

    work_categories {
        uuid id PK
        uuid work_id FK
        uuid category_id FK
        timestamp created_at
    }

    work_views {
        uuid id PK
        uuid user_id FK
        uuid work_id FK
        int view_duration
        boolean is_completed
        jsonb device_info
        varchar ip_address
        timestamp created_at
    }

    user_interests {
        uuid id PK
        uuid user_id FK
        varchar tag
        decimal weight
        timestamp created_at
        timestamp updated_at
    }

    search_history {
        uuid id PK
        uuid user_id FK
        varchar keyword
        timestamp created_at
    }

    trending_searches {
        uuid id PK
        varchar keyword UK
        int search_count
        boolean is_active
        int sort_order
        timestamp created_at
        timestamp updated_at
    }

    reports {
        uuid id PK
        uuid reporter_id FK
        varchar target_type
        uuid target_id
        varchar reason
        text description
        text_array evidence_urls
        varchar status
        uuid handler_id FK
        text handle_result
        timestamp handled_at
        timestamp created_at
    }
```

---

## 2. 核心模块关系图

### 2.1 用户社交关系
```mermaid
graph TB
    User[用户] --> Profile[用户资料]
    User --> Following[我关注的人]
    User --> Followers[关注我的人]
    User --> Works[我的作品]
    User --> LikedWorks[点赞的作品]
    
    Following -.->|关注关系| OtherUsers[其他用户]
    Followers -.->|被关注| OtherUsers
```

### 2.2 作品互动关系
```mermaid
graph TB
    Work[作品] --> Author[作者]
    Work --> Likes[点赞用户]
    Work --> Comments[评论列表]
    Work --> Views[浏览记录]
    Work --> Shares[分享记录]
    
    Comments --> Replies[评论回复]
    Comments --> CommentLikes[评论点赞]
```

### 2.3 AI生成流程
```mermaid
graph LR
    User[用户] --> SelectTemplate[选择模板]
    SelectTemplate --> Upload[上传素材]
    Upload --> SetParams[设置参数]
    SetParams --> CreateTask[创建生成任务]
    CreateTask --> Processing[AI处理中]
    Processing --> Complete[生成完成]
    Complete --> SaveWork[保存为作品]
    Complete --> Download[直接下载]
    
    CreateTask -.->|扣除能量| EnergyDeduct[能量扣除]
```

### 2.4 消息系统流程
```mermaid
graph TB
    UserA[用户A] --> Conversation[会话]
    UserB[用户B] --> Conversation
    
    Conversation --> Messages[消息列表]
    Messages --> TextMsg[文本消息]
    Messages --> ImageMsg[图片消息]
    Messages --> FileMsg[文件消息]
    Messages --> SystemMsg[系统消息]
    
    UserA -.->|发送| Messages
    UserB -.->|接收| Messages
```

---

## 3. 数据流向图

### 3.1 用户注册登录流程
```mermaid
sequenceDiagram
    participant Client as 客户端
    participant API as API服务
    participant Auth as Supabase Auth
    participant DB as 数据库

    Client->>API: 1. POST /auth/send-code
    API->>Auth: 2. 发送验证码
    Auth-->>Client: 3. 验证码已发送
    
    Client->>API: 4. POST /auth/verify-code
    API->>Auth: 5. 验证码校验
    Auth->>DB: 6. 查询/创建用户
    DB-->>Auth: 7. 用户信息
    Auth-->>API: 8. JWT Token
    API-->>Client: 9. 登录成功 + Token
```

### 3.2 作品发布流程
```mermaid
sequenceDiagram
    participant Client as 客户端
    participant API as API服务
    participant Storage as 文件存储
    participant DB as 数据库
    participant MQ as 消息队列

    Client->>API: 1. POST /upload/media
    API->>Storage: 2. 上传文件
    Storage-->>API: 3. 文件URL
    API-->>Client: 4. 上传成功
    
    Client->>API: 5. POST /works
    API->>DB: 6. 创建作品记录
    DB-->>API: 7. 作品信息
    API->>MQ: 8. 发送通知事件
    API-->>Client: 9. 发布成功
```

### 3.3 AI生成流程
```mermaid
sequenceDiagram
    participant Client as 客户端
    participant API as API服务
    participant AI as AI服务
    participant Storage as 文件存储
    participant DB as 数据库
    participant WS as WebSocket

    Client->>API: 1. POST /ai/generate
    API->>DB: 2. 检查能量余额
    DB-->>API: 3. 余额充足
    API->>DB: 4. 扣除能量 & 创建任务
    API->>AI: 5. 提交生成任务
    API-->>Client: 6. 任务创建成功
    
    AI->>AI: 7. AI处理中...
    AI->>WS: 8. 进度更新 (25%, 50%, 75%)
    WS-->>Client: 9. 实时进度推送
    
    AI->>Storage: 10. 上传生成结果
    Storage-->>AI: 11. 文件URL
    AI->>DB: 12. 更新任务状态
    AI->>WS: 13. 生成完成通知
    WS-->>Client: 14. 完成推送
    
    Client->>API: 15. GET /ai/generations/:id
    API->>DB: 16. 查询结果
    DB-->>API: 17. 结果信息
    API-->>Client: 18. 返回结果URL
```

---

## 4. 关键业务逻辑

### 4.1 点赞作品业务逻辑
```mermaid
graph TD
    Start[开始] --> CheckAuth{用户已登录?}
    CheckAuth -->|否| Error1[返回需要登录]
    CheckAuth -->|是| CheckWork{作品存在?}
    CheckWork -->|否| Error2[返回作品不存在]
    CheckWork -->|是| CheckLiked{已点赞?}
    CheckLiked -->|是| Error3[返回已点赞]
    CheckLiked -->|否| CreateLike[创建点赞记录]
    CreateLike --> UpdateCount[更新点赞数+1]
    UpdateCount --> CreateNotif[创建通知]
    CreateNotif --> Success[返回成功]
```

### 4.2 关注用户业务逻辑
```mermaid
graph TD
    Start[开始] --> CheckAuth{用户已登录?}
    CheckAuth -->|否| Error1[返回需要登录]
    CheckAuth -->|是| CheckSelf{关注自己?}
    CheckSelf -->|是| Error2[不能关注自己]
    CheckSelf -->|否| CheckFollowed{已关注?}
    CheckFollowed -->|是| Error3[已关注过]
    CheckFollowed -->|否| CreateFollow[创建关注记录]
    CreateFollow --> UpdateFollowing[更新关注数+1]
    UpdateFollowing --> UpdateFollowers[更新粉丝数+1]
    UpdateFollowers --> CreateNotif[创建通知]
    CreateNotif --> Success[返回成功]
```

### 4.3 发送消息业务逻辑
```mermaid
graph TD
    Start[开始] --> CheckAuth{用户已登录?}
    CheckAuth -->|否| Error1[返回需要登录]
    CheckAuth -->|是| CheckConv{会话存在?}
    CheckConv -->|否| CreateConv[创建新会话]
    CheckConv -->|是| GetConv[获取会话]
    CreateConv --> SaveMsg[保存消息]
    GetConv --> SaveMsg
    SaveMsg --> UpdateConv[更新会话最后消息]
    UpdateConv --> UpdateUnread[更新未读数]
    UpdateUnread --> SendWS[WebSocket推送]
    SendWS --> CreateNotif[创建通知]
    CreateNotif --> Success[返回成功]
```

### 4.4 AI生成业务逻辑
```mermaid
graph TD
    Start[开始] --> CheckAuth{用户已登录?}
    CheckAuth -->|否| Error1[返回需要登录]
    CheckAuth -->|是| CheckEnergy{能量充足?}
    CheckEnergy -->|否| Error2[能量不足]
    CheckEnergy -->|是| DeductEnergy[扣除能量]
    DeductEnergy --> CreateTask[创建生成任务]
    CreateTask --> QueueTask[加入任务队列]
    QueueTask --> ReturnTask[返回任务ID]
    
    QueueTask -.->|异步处理| AIProcess[AI处理]
    AIProcess --> UpdateProgress[更新进度]
    UpdateProgress --> CheckComplete{处理完成?}
    CheckComplete -->|否| UpdateProgress
    CheckComplete -->|是| SaveResult[保存结果]
    SaveResult --> UpdateStatus[更新任务状态]
    UpdateStatus --> SendNotif[发送完成通知]
```

---

## 5. 索引优化策略

### 5.1 高频查询索引
```sql
-- 首页feed流查询
CREATE INDEX idx_works_feed 
ON works(status, published_at DESC, visibility) 
WHERE deleted_at IS NULL;

-- 用户作品查询
CREATE INDEX idx_works_by_user 
ON works(user_id, published_at DESC) 
WHERE deleted_at IS NULL AND status = 'published';

-- 点赞状态查询
CREATE INDEX idx_likes_check 
ON likes(user_id, work_id);

-- 关注关系查询
CREATE INDEX idx_follows_relation 
ON follows(follower_id, following_id) 
WHERE status = 'active';

-- 会话消息查询
CREATE INDEX idx_messages_by_conversation 
ON messages(conversation_id, created_at DESC);

-- 未读通知查询
CREATE INDEX idx_notifications_unread 
ON notifications(user_id, is_read, created_at DESC);
```

### 5.2 全文搜索索引
```sql
-- 作品全文搜索
CREATE INDEX idx_works_search 
ON works USING gin(to_tsvector('chinese', title || ' ' || description));

-- 用户昵称搜索
CREATE INDEX idx_users_nickname_search 
ON users USING gin(to_tsvector('chinese', nickname));
```

---

## 6. 数据一致性保证

### 6.1 事务操作示例

#### 关注用户（确保原子性）
```sql
BEGIN;
  -- 创建关注记录
  INSERT INTO follows (follower_id, following_id) 
  VALUES ($1, $2);
  
  -- 更新关注数
  UPDATE users SET following_count = following_count + 1 
  WHERE id = $1;
  
  -- 更新粉丝数
  UPDATE users SET followers_count = followers_count + 1 
  WHERE id = $2;
  
  -- 创建通知
  INSERT INTO notifications (user_id, type, sender_id, content) 
  VALUES ($2, 'follow', $1, '关注了你');
COMMIT;
```

#### 点赞作品（确保原子性）
```sql
BEGIN;
  -- 创建点赞记录
  INSERT INTO likes (user_id, work_id) 
  VALUES ($1, $2);
  
  -- 更新点赞数
  UPDATE works SET likes_count = likes_count + 1 
  WHERE id = $2;
  
  -- 更新作者获赞总数
  UPDATE users SET likes_received_count = likes_received_count + 1 
  WHERE id = (SELECT user_id FROM works WHERE id = $2);
  
  -- 创建通知
  INSERT INTO notifications (user_id, type, sender_id, work_id, content) 
  VALUES (
    (SELECT user_id FROM works WHERE id = $2), 
    'like', 
    $1, 
    $2, 
    '赞了您的作品'
  );
COMMIT;
```

---

## 7. 缓存策略

### 7.1 Redis缓存键设计

```
# 用户信息缓存
user:{user_id}                    -> 用户基本信息 (TTL: 1小时)
user:{user_id}:stats              -> 用户统计数据 (TTL: 5分钟)

# 作品信息缓存  
work:{work_id}                    -> 作品详情 (TTL: 30分钟)
work:{work_id}:comments           -> 评论列表 (TTL: 5分钟)

# 关注关系缓存
follow:{user_id}:{target_id}      -> 关注状态 (TTL: 10分钟)

# 点赞状态缓存
like:{user_id}:{work_id}          -> 点赞状态 (TTL: 10分钟)

# feed流缓存
feed:recommend:{user_id}          -> 推荐feed (TTL: 2分钟)
feed:following:{user_id}          -> 关注feed (TTL: 1分钟)

# 热门内容缓存
trending:works                    -> 热门作品 (TTL: 10分钟)
trending:searches                 -> 热门搜索 (TTL: 30分钟)

# 会话缓存
conversation:{conv_id}:messages   -> 消息列表 (TTL: 5分钟)
user:{user_id}:unread_count       -> 未读消息数 (TTL: 1分钟)
```

### 7.2 缓存更新策略
- **主动更新**: 数据变更时立即更新缓存
- **被动失效**: TTL过期后自动失效
- **穿透保护**: 空值也缓存（TTL较短）
- **雪崩保护**: 随机TTL偏移

---

## 8. 数据权限矩阵

### 8.1 作品权限
| 操作 | 作者 | 粉丝 | 普通用户 | 未登录 |
|------|------|------|----------|--------|
| 查看公开作品 | ✓ | ✓ | ✓ | ✓ |
| 查看私密作品 | ✓ | ✗ | ✗ | ✗ |
| 查看粉丝可见作品 | ✓ | ✓ | ✗ | ✗ |
| 编辑作品 | ✓ | ✗ | ✗ | ✗ |
| 删除作品 | ✓ | ✗ | ✗ | ✗ |
| 点赞作品 | ✓ | ✓ | ✓ | ✗ |
| 评论作品 | ✓ | ✓ | ✓ | ✗ |
| 分享作品 | ✓ | ✓ | ✓ | ✓ |

### 8.2 用户资料权限
| 操作 | 本人 | 其他用户 |
|------|------|----------|
| 查看公开资料 | ✓ | ✓ |
| 查看手机号 | ✓ | ✗ |
| 编辑资料 | ✓ | ✗ |
| 查看能量余额 | ✓ | ✗ |
| 查看设置 | ✓ | ✗ |

---

## 9. 性能优化建议

### 9.1 数据库查询优化
1. **使用连接池**: 限制最大连接数
2. **预编译语句**: 防止SQL注入，提升性能
3. **批量操作**: 减少数据库往返次数
4. **读写分离**: 读操作使用只读副本
5. **分页优化**: 使用游标分页而非offset

### 9.2 N+1查询问题解决
```typescript
// 不好的做法（N+1查询）
const works = await db.works.findMany()
for (const work of works) {
  work.author = await db.users.findUnique({ where: { id: work.user_id } })
}

// 好的做法（关联查询）
const works = await supabase
  .from('works')
  .select(`
    *,
    author:users(id, nickname, avatar_url)
  `)
```

### 9.3 热点数据缓存
```typescript
// 缓存热门作品
const cacheKey = 'trending:works'
let hotWorks = await redis.get(cacheKey)

if (!hotWorks) {
  hotWorks = await db.query(`
    SELECT * FROM hot_works_mv
    LIMIT 100
  `)
  await redis.setex(cacheKey, 600, JSON.stringify(hotWorks))
}
```

---

## 10. 数据备份恢复方案

### 10.1 备份策略
- **全量备份**: 每日凌晨3点自动备份
- **增量备份**: 每小时备份WAL日志
- **异地备份**: 备份文件同步到异地存储
- **保留策略**: 保留最近30天备份

### 10.2 恢复测试
定期（每月）进行备份恢复演练，确保备份可用。

---

**文档维护者**: 技术团队  
**最后更新**: 2025-10-28


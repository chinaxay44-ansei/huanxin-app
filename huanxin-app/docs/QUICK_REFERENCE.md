# 焕星 (HuanXing) - 快速参考指南

## 🚀 5分钟快速上手

### 1. 创建Supabase项目
```bash
# 访问 https://supabase.com
# 创建新项目 → 记录项目URL和anon key
```

### 2. 执行数据库迁移
```sql
-- 在Supabase Dashboard → SQL Editor
-- 复制并执行 MIGRATION_TEMPLATE.sql
```

### 3. 配置前端环境变量
```bash
# 在 huanxin-app/.env.local
NEXT_PUBLIC_SUPABASE_URL=你的项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon key
```

### 4. 安装依赖并启动
```bash
cd huanxin-app
pnpm install
pnpm add @supabase/supabase-js
pnpm dev
```

---

## 📊 核心表速查

| 表名 | 用途 | 主要字段 |
|------|------|----------|
| users | 用户信息 | phone, nickname, avatar_url, energy_balance |
| works | 作品 | media_url, type, likes_count, views_count |
| follows | 关注关系 | follower_id, following_id |
| likes | 点赞 | user_id, work_id |
| comments | 评论 | user_id, work_id, content, root_id, reply_to_user_id, likes_count, replies_count |
| ai_templates | AI模板 | name, category, energy_cost |
| ai_generations | 生成任务 | user_id, template_id, status, output_url |
| conversations | 会话 | participant_1_id, participant_2_id, type/status, last_message_at |
| messages | 消息 | conversation_id, sender_id, message_type, status |
| notifications | 通知 | user_id, type, content |

---

## 🔌 常用API速查

### 认证
```typescript
// 发送验证码
POST /auth/send-code { phone }

// 验证登录
POST /auth/verify-code { phone, code }
```

### 作品
```typescript
// 获取feed流
GET /works?category=ai-photo&limit=20

// 作品详情
GET /works/:id

// 点赞
POST /works/:id/like

// 评论（抖音式评论区）
GET  /api/social/comments?work_id=:id&limit=20&offset=0&sort=hot|latest
POST /api/social/comments { work_id, content, parent_id? }
POST /api/social/comments/like { comment_id }
DELETE /api/social/comments/like { comment_id }
GET  /api/social/comments/:commentId/replies?limit=10&offset=0
- Supabase 提示：检查点赞/关注/状态时使用 `maybeSingle()`，避免 0 行时触发 PGRST116 导致 406。
```

### 用户
```typescript
// 当前用户
GET /users/me

// 用户信息
GET /users/:id

// 关注
POST /follows { following_id }

// 取消关注
DELETE /follows/:id
```

### AI生成
```typescript
// 获取模板
GET /ai/templates?category=image

// 创建生成任务
POST /ai/generate {
  template_id,
  source_urls,
  prompt
}

// 查询任务状态
GET /ai/generations/:id
```

---

## 🛡️ 管理后台速查

### 授权请求头
```
x-admin-token: <NEXT_PUBLIC_ADMIN_API_TOKEN 或 ADMIN_API_TOKEN>
```

### 常用端点
- `GET /api/admin/users?search=xxx&status=active&page=1&limit=20`
- `PUT /api/admin/users` `{ id, status?, is_verified?, verified_type?, nickname? }`
- `DELETE /api/admin/users?id=<user_id>`
- `GET /api/admin/works?status=reviewing&visibility=public&search=标题`
- `PUT /api/admin/works` `{ id, title?, description?, status?, visibility? }`
- `DELETE /api/admin/works?id=<work_id>`
- `GET /api/admin/reports?status=pending&search=涉黄`
- `PUT /api/admin/reports` `{ id, status?, handle_result? }`
- `GET /api/admin/categories`
- `POST /api/admin/categories` `{ name, slug, type, sort_order?, is_active? }`
- `PUT /api/admin/categories` `{ id, name?, slug?, type?, sort_order?, is_active? }`
- `DELETE /api/admin/categories` `{ id }`
- `GET /api/admin/trending-searches`
- `POST /api/admin/trending-searches` `{ keyword, sort_order?, is_active? }`
- `PUT /api/admin/trending-searches` `{ id, keyword?, sort_order?, is_active? }`
- `DELETE /api/admin/trending-searches` `{ id }`

### 页面入口
- `/admin`（本地示例：`http://localhost:3004/admin`）

## 💾 常用SQL查询

### 用户查询
```sql
-- 获取用户完整信息
SELECT u.*, up.tags, up.zodiac_sign
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.id = 'user-uuid';

-- 检查是否关注
SELECT EXISTS(
  SELECT 1 FROM follows 
  WHERE follower_id = 'user1-uuid' 
    AND following_id = 'user2-uuid'
);
```

### 作品查询
```sql
-- 获取作品列表（含作者）
SELECT 
  w.*,
  u.nickname, u.avatar_url
FROM works w
JOIN users u ON w.user_id = u.id
WHERE w.status = 'published'
ORDER BY w.published_at DESC
LIMIT 20;

-- 检查是否点赞
SELECT EXISTS(
  SELECT 1 FROM likes 
  WHERE user_id = 'user-uuid' 
    AND work_id = 'work-uuid'
);
```

### 消息查询
```sql
-- 获取会话消息
SELECT * FROM messages
WHERE conversation_id = 'conv-uuid'
ORDER BY created_at DESC
LIMIT 50;

-- 未读消息数
SELECT 
  CASE 
    WHEN participant_1_id = 'user-uuid' THEN unread_count_p1
    ELSE unread_count_p2
  END as unread_count
FROM conversations
WHERE 'user-uuid' IN (participant_1_id, participant_2_id);
```

---

## 🎯 业务逻辑速查

### 点赞作品
```typescript
// 1. 检查是否已点赞
// 2. 创建点赞记录
// 3. 更新作品点赞数+1
// 4. 更新作者获赞总数+1
// 5. 创建通知
```

### 关注用户
```typescript
// 1. 检查是否关注自己
// 2. 检查是否已关注
// 3. 创建关注记录
// 4. 更新双方统计数
// 5. 创建通知
```

### AI生成
```typescript
// 1. 检查能量余额
// 2. 扣除能量
// 3. 创建生成任务
// 4. 加入任务队列
// 5. 返回任务ID
// [异步] AI处理
// [异步] 完成后发送通知
```

### 发送消息
```typescript
// 1. 获取或创建会话
// 2. 创建消息记录
// 3. 更新会话最后消息
// 4. 更新对方未读数+1
// 5. WebSocket推送
// 6. 创建通知
```

---

## 🔒 RLS策略速查

```sql
-- 用户表：所有人可查看
CREATE POLICY "viewable_by_everyone" ON users FOR SELECT
  USING (deleted_at IS NULL);

-- 作品表：公开作品所有人可见
CREATE POLICY "public_works" ON works FOR SELECT
  USING (visibility = 'public' AND deleted_at IS NULL);

-- 消息表：只能看自己的消息
CREATE POLICY "own_messages" ON messages FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM conversations 
      WHERE id = conversation_id 
      AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
    )
  );
```

---

## 🎨 前端集成速查

### Supabase客户端
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### 查询数据
```typescript
// 获取作品列表
const { data, error } = await supabase
  .from('works')
  .select('*, author:users(*)')
  .eq('status', 'published')
  .order('published_at', { ascending: false })
  .limit(20)
```

### 实时订阅
```typescript
// 订阅新消息
supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${convId}`
  }, (payload) => {
    console.log('New message:', payload.new)
  })
  .subscribe()
```

### 文件上传
```typescript
// 上传图片
const { data, error } = await supabase.storage
  .from('huanxin-media')
  .upload(`avatars/${userId}/avatar.jpg`, file)

// 获取公共URL
const { data: { publicUrl } } = supabase.storage
  .from('huanxin-media')
  .getPublicUrl(data.path)
```

---

## 🛠️ 调试技巧

### 查看表结构
```sql
\d+ users
\d+ works
```

### 查看索引
```sql
SELECT * FROM pg_indexes 
WHERE tablename = 'works';
```

### 查看表大小
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 慢查询分析
```sql
EXPLAIN ANALYZE
SELECT * FROM works
WHERE category = 'ai-photo'
ORDER BY published_at DESC
LIMIT 20;
```

---

## 🐛 常见错误解决

### 错误：23505 - 唯一约束冲突
```
原因：尝试插入重复数据
解决：检查唯一字段（如phone、user_id+work_id等）
```

### 错误：23503 - 外键约束违反
```
原因：引用不存在的记录
解决：确保关联记录存在（虽然我们用逻辑外键，但业务逻辑要保证）
```

### 错误：42P01 - 表不存在
```
原因：数据库迁移未执行
解决：执行 MIGRATION_TEMPLATE.sql
```

### 错误：RLS策略阻止
```
原因：行级安全策略限制访问
解决：检查RLS策略或使用service_role key（仅后端）
```

---

## 📝 开发检查清单

### 新增功能时
- [ ] 设计数据表结构
- [ ] 创建迁移脚本
- [ ] 添加索引
- [ ] 配置RLS策略
- [ ] 更新TypeScript类型
- [ ] 实现API接口
- [ ] 编写测试用例
- [ ] 更新文档

### 优化性能时
- [ ] 分析慢查询
- [ ] 添加必要索引
- [ ] 优化查询语句
- [ ] 添加缓存层
- [ ] 检查N+1问题
- [ ] 测试并发性能

### 上线前检查
- [ ] 数据库备份
- [ ] 环境变量配置
- [ ] RLS策略启用
- [ ] 限流规则配置
- [ ] 监控告警配置
- [ ] 错误追踪配置

---

## 🔢 关键数值参考

| 项目 | 数值 | 说明 |
|------|------|------|
| 新用户能量 | 60 | 默认赠送 |
| 每日签到 | 10 | 每日奖励 |
| AI生成消耗 | 20 | 平均消耗 |
| 能量上限 | 1000 | 最大储存 |
| 视频最大时长 | 60秒 | 限制 |
| 图片最大大小 | 10MB | 限制 |
| 视频最大大小 | 100MB | 限制 |
| Feed每页 | 20条 | 分页大小 |
| 评论每页 | 20条 | 分页大小 |
| 消息每页 | 50条 | 分页大小 |

---

## 🎨 UI对应的数据

### 首页瀑布流
```typescript
// 对应表：works
// 查询：category = 'ai-photo'
// 展示：thumbnail_url, views_count, likes_count, author
```

### 视频播放页
```typescript
// 对应表：works (type = 'video')
// 展示：media_url, likes_count, comments_count
// 操作：点赞、评论、分享
```

### 我的页
```typescript
// 对应表：users
// 展示：nickname, avatar_url, bio, location
// 统计：following_count, followers_count, likes_received_count
```

### 消息中心
```typescript
// 对应表：notifications
// 分类：全部、评论、合拍、粉丝、点赞
// 展示：sender info, content, thumbnail, time
```

### 聊天页
```typescript
// 对应表：conversations, messages
// 展示：对方信息、消息列表、在线状态
// 操作：发送文本、图片、文件
```

---

## 🔗 关联查询示例

### 作品 + 作者 + 点赞状态
```typescript
const { data } = await supabase
  .from('works')
  .select(`
    *,
    author:users(id, nickname, avatar_url),
    is_liked:likes!inner(user_id)
  `)
  .eq('likes.user_id', currentUserId)
```

### 评论 + 用户 + 点赞状态
```typescript
const { data } = await supabase
  .from('comments')
  .select(`
    *,
    user:users(id, nickname, avatar_url),
    is_liked:comment_likes!inner(user_id)
  `)
  .eq('work_id', workId)
  .eq('comment_likes.user_id', currentUserId)
```

### 会话 + 对方用户信息
```typescript
const { data } = await supabase
  .from('conversations')
  .select('*')
  .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
  .order('last_message_at', { ascending: false })
```

---

## 📱 移动端适配

### 响应式断点
```typescript
const breakpoints = {
  sm: '640px',   // 小屏手机
  md: '768px',   // 大屏手机/平板
  lg: '1024px',  // 桌面
}
```

### 图片尺寸
```typescript
const imageSizes = {
  avatar: '80x80',
  thumbnail: '300x400',
  cover: '1080x1920',
  preview: '150x200',
}
```

---

## 🎯 性能优化清单

### 数据库层
- [x] 为高频查询字段添加索引
- [x] 使用触发器同步统计数据
- [ ] 实施查询结果缓存
- [ ] 配置连接池
- [ ] 数据分区（大表）

### 应用层
- [ ] Redis缓存热点数据
- [ ] CDN加速静态资源
- [ ] 图片懒加载
- [ ] 虚拟滚动（长列表）
- [ ] 代码分割

### 网络层
- [ ] 启用HTTP/2
- [ ] 启用Gzip压缩
- [ ] 配置CDN
- [ ] 优化图片格式（WebP）

---

## 🔐 安全检查清单

- [x] RLS策略已启用
- [ ] API认证已实现
- [ ] 输入验证已添加
- [ ] SQL注入防护
- [ ] XSS防护
- [ ] CSRF防护
- [ ] 限流规则已配置
- [ ] 敏感数据已加密
- [ ] HTTPS强制使用

---

## 📈 监控指标

### 需要监控的关键指标
```sql
-- DAU（日活用户）
SELECT COUNT(DISTINCT user_id) 
FROM work_views 
WHERE DATE(created_at) = CURRENT_DATE;

-- 今日新增用户
SELECT COUNT(*) FROM users 
WHERE DATE(created_at) = CURRENT_DATE;

-- 今日新增作品
SELECT COUNT(*) FROM works 
WHERE DATE(created_at) = CURRENT_DATE;

-- 今日AI生成量
SELECT COUNT(*) FROM ai_generations 
WHERE DATE(created_at) = CURRENT_DATE;

-- 平均能量消耗
SELECT AVG(energy_cost) FROM ai_generations 
WHERE DATE(created_at) = CURRENT_DATE;
```

---

## 🧪 测试账号

| 用途 | 手机号 | 昵称 | 能量 |
|------|--------|------|------|
| 官方账号 | official | 焕星官方 | 999999 |
| 测试账号1 | test_user_1 | 性活还得继续 | 60 |
| 测试账号2 | test_user_2 | 星海 | 80 |
| 测试账号3 | test_user_3 | 冬季诈爱 | 120 |

---

## 📦 依赖包版本

```json
{
  "@supabase/supabase-js": "^2.x",
  "@supabase/auth-helpers-nextjs": "^0.x",
  "next": "16.0.0",
  "zustand": "latest",
  "swr": "^2.x"
}
```

---

## 🚨 紧急处理

### 数据库故障
```bash
# 1. 检查连接
supabase status

# 2. 查看日志
supabase logs db

# 3. 回滚到最近备份
supabase db reset
```

### API故障
```bash
# 1. 检查健康状态
curl https://api.huanxin.com/health

# 2. 查看错误日志
# 在Vercel Dashboard查看

# 3. 回滚部署
vercel rollback
```

---

## 📞 获取帮助

### 文档资源
- [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) - 完整数据库设计
- [API_DESIGN.md](./API_DESIGN.md) - 完整API文档
- [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md) - 前端集成
- [DATA_DICTIONARY.md](./DATA_DICTIONARY.md) - 数据字典

### 外部资源
- [Supabase文档](https://supabase.com/docs)
- [PostgreSQL文档](https://www.postgresql.org/docs/)
- [Next.js文档](https://nextjs.org/docs)

---

## 💡 最佳实践

### 数据库操作
1. ✅ 使用参数化查询
2. ✅ 使用事务保证原子性
3. ✅ 使用索引优化查询
4. ✅ 定期备份数据
5. ✅ 监控慢查询

### API开发
1. ✅ 统一错误处理
2. ✅ 输入参数验证
3. ✅ 返回格式统一
4. ✅ 添加请求日志
5. ✅ 实施限流策略

### 前端开发
1. ✅ 使用TypeScript类型
2. ✅ 错误边界处理
3. ✅ Loading状态展示
4. ✅ 乐观更新UI
5. ✅ 本地数据缓存

---

## 🎓 学习路径

### 新手开发者
1. 阅读 DATABASE_AND_API_README.md 了解整体架构
2. 查看 ER_DIAGRAM.md 理解数据关系
3. 参考 QUICK_REFERENCE.md 快速上手
4. 实践 seed_test_data.sql 创建测试数据

### 高级开发者
1. 深入学习 DATABASE_DESIGN.md 数据库优化
2. 研究 API_DESIGN.md 接口设计模式
3. 掌握 FRONTEND_INTEGRATION.md 集成技巧
4. 优化性能和安全性

---

**快速参考文档维护者**: 技术团队  
**最后更新**: 2025-10-28

---

## ⚡ 前端性能速查（最新）

- 导航预取：固定跳转优先 `Link prefetch`，减少切页白屏时间。
- 图片优化：统一使用 `next/image`，配置 `sizes` 与懒加载。
- 缓存去重：SWR 设置 `dedupingInterval`、关闭 `revalidateOnFocus`，降低重复请求。
- 轮询降频：生成历史轮询调整为 5s，限制批量探测数量（如最多 10 条）。
- 认证检查：移除根布局的全局认证检查，受保护页面使用 `AuthGuard` 局部检查与跳转。
- 长列表优化：引入虚拟渲染（`react-window`/`@tanstack/react-virtual`）。

### 导航与布局
- 底部导航改为全局持久渲染（`app/layout.tsx`），`/admin` 自动隐藏；路径自动高亮。
- 页面内不要重复渲染 `<BottomNav />`，避免双重挂载与闪烁。

## 生成页管理与动态渲染
- 列表：`GET /api/generation-features`
- 详情：`GET /api/generation-features/:featureId`
- 管理：`GET/POST/PUT/DELETE /api/admin/generation-features`
- 管理JSON：`GET/POST /api/admin/generation-features/json-config/:featureId`
- 提交生成：`POST /api/feature-generate/:featureId`

## 作品同款配置
- 管理JSON：`GET/POST /api/admin/works/json-config/:workId`
- 用户JSON：`GET /api/works/json-config/:workId`
- 提交生成：`POST /api/same-style/generate/:workId`

## 资产
- 列表：`GET /api/assets`
- 新增：`POST /api/assets`
- 删除：`DELETE /api/assets`

## 值来源/令牌
- 值来源：`image_upload/outfit_image/video_upload/prompt_text/custom_value/file_upload/avatar_image/asset_image/work_image`
- 令牌：`__IMAGE_UPLOAD__/__OUTFIT_IMAGE__/__VIDEO_UPLOAD__/__PROMPT_TEXT__/__CUSTOM_VALUE__/__FILE_UPLOAD__/__AVATAR_IMAGE__/__ASSET_IMAGE__/__WORK_IMAGE__`


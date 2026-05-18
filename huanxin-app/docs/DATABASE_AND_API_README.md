# 焕星 (HuanXing) - 数据库与API设计总览

## 📋 文档导航

本目录包含焕星应用的完整数据库和API设计文档：

1. **[DATABASE_DESIGN.md](./DATABASE_DESIGN.md)** - 数据库表结构设计
2. **[API_DESIGN.md](./API_DESIGN.md)** - RESTful API接口设计
3. **[ER_DIAGRAM.md](./ER_DIAGRAM.md)** - 数据模型ER图和关系图
4. **[FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)** - 前端集成指南
5. **[MIGRATION_TEMPLATE.sql](./MIGRATION_TEMPLATE.sql)** - SQL迁移脚本模板
6. **[ADMIN_GUIDE.md](./ADMIN_GUIDE.md)** - 管理后台指南（页面入口、授权、接口总览）

---

## 🎯 设计概览

### 技术栈
- **前端**: Next.js 16 + TypeScript + Tailwind CSS
- **后端**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **部署**: Vercel
- **文件存储**: Supabase Storage
- **实时通信**: Supabase Realtime

### 核心特性
- ✅ 用户认证与授权（手机号验证码登录）
- ✅ 社交功能（关注、点赞、评论、分享）
- ✅ AI内容生成（图片、视频）
- ✅ 实时消息（WebSocket）
- ✅ 推送通知
- ✅ 能量系统
- ✅ 内容推荐算法
- ✅ 全文搜索

---

## 📊 数据库设计要点

### 核心表（13张）

#### 用户系统
- `users` - 用户基础信息
- `user_profiles` - 用户扩展资料
- `ai_avatars` - AI数字分身

#### 内容系统
- `works` - 作品（视频/图片）
- `categories` - 分类管理
- `work_categories` - 作品分类关联

#### 社交互动
- `follows` - 关注关系
- `likes` - 作品点赞
- `comments` - 评论
- `comment_likes` - 评论点赞
- `shares` - 分享记录

#### 消息系统
- `conversations` - 会话
- `messages` - 消息
- `notifications` - 通知

#### AI系统
- `ai_templates` - AI模板
- `ai_generations` - 生成记录

#### 辅助系统
- `energy_transactions` - 能量交易流水
- `work_views` - 浏览记录
- `user_interests` - 用户兴趣
- `search_history` - 搜索历史
- `trending_searches` - 热门搜索
- `reports` - 举报
- `system_configs` - 系统配置

### 设计原则

1. **逻辑外键** - 不使用物理外键约束，在应用层维护数据关系
2. **软删除** - 重要数据使用 `deleted_at` 字段标记删除
3. **数据冗余** - 适当冗余提升查询性能（如统计计数）
4. **索引优化** - 为常用查询字段建立索引
5. **UUID主键** - 使用UUID避免ID可预测
6. **时间戳** - 所有表包含 `created_at` 和 `updated_at`

---

## 🔌 API设计要点

### API分类

#### 1. 认证授权 `/auth`
- 发送验证码
- 验证登录
- 刷新令牌
- 退出登录

#### 2. 用户管理 `/users`
- 获取用户信息
- 更新用户资料
- 上传头像
- 关注/取消关注
- 获取关注/粉丝列表

#### 3. 作品管理 `/works`
- 获取作品列表（feed流）
- 获取作品详情
- 发布作品
- 删除作品
- 点赞/取消点赞
- 评论作品
- 分享作品

#### 4. AI功能 `/ai`
- 获取模板列表
- 获取模板详情
- 创建生成任务
- 查询任务状态
- 获取生成记录
- 管理AI分身

#### 5. 消息系统 `/messages`, `/conversations`, `/notifications`
- 会话管理
- 发送/接收消息
- 消息撤回
- 通知管理

#### 6. 搜索功能 `/search`
- 搜索作品/用户
- 搜索历史
- 热门搜索

#### 7. 能量系统 `/energy`
- 查询余额
- 交易记录
- 每日签到

#### 8. 推荐系统 `/recommend`
- 个性化推荐
- 热门内容

### API特性

- ✅ RESTful设计规范
- ✅ JWT认证
- ✅ 统一响应格式
- ✅ 游标分页
- ✅ 错误码标准化
- ✅ 请求限流
- ✅ WebSocket实时推送

---

## 🚀 快速开始

### 第一步：确认数据库设计

1. 阅读 `DATABASE_DESIGN.md` 了解完整表结构
2. 查看 `ER_DIAGRAM.md` 理解表关系
3. 确认业务需求是否满足

### 第二步：创建Supabase项目

```bash
# 安装Supabase CLI
npm install -g supabase

# 登录Supabase
supabase login

# 初始化项目
supabase init

# 链接到远程项目
supabase link --project-ref your-project-ref
```

### 第三步：执行数据库迁移

```bash
# 创建迁移文件
supabase migration new initial_schema

# 复制MIGRATION_TEMPLATE.sql的内容到迁移文件
# 然后执行迁移
supabase db push

# 或者直接在Supabase Dashboard的SQL Editor中执行
```

### 第四步：配置环境变量

在 `huanxin-app/.env.local` 添加：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 第五步：安装前端依赖

```bash
cd huanxin-app
pnpm add @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 第六步：集成到前端

参考 `FRONTEND_INTEGRATION.md` 进行前端集成。

---

## 📐 数据模型核心关系

```
用户 (users)
  ├── 1:1 → 用户资料 (user_profiles)
  ├── 1:N → 作品 (works)
  ├── 1:N → AI分身 (ai_avatars)
  ├── M:N → 关注关系 (follows)
  └── 1:N → 能量记录 (energy_transactions)

作品 (works)
  ├── N:1 → 作者 (users)
  ├── 1:1 → 生成记录 (ai_generations)
  ├── M:N → 点赞 (likes)
  ├── 1:N → 评论 (comments)
  ├── 1:N → 分享 (shares)
  └── M:N → 分类 (work_categories)

消息 (messages)
  ├── N:1 → 会话 (conversations)
  └── N:1 → 发送者 (users)

AI生成 (ai_generations)
  ├── N:1 → 用户 (users)
  ├── N:1 → 模板 (ai_templates)
  └── 1:1 → 作品 (works)
```

---

## 🔍 关键查询示例

### 获取推荐feed流
```sql
SELECT 
  w.*,
  u.nickname as author_nickname,
  u.avatar_url as author_avatar,
  EXISTS(SELECT 1 FROM likes WHERE user_id = $1 AND work_id = w.id) as is_liked
FROM works w
JOIN users u ON w.user_id = u.id
WHERE w.deleted_at IS NULL 
  AND w.status = 'published'
  AND w.visibility = 'public'
ORDER BY w.published_at DESC
LIMIT 20;
```

### 检查是否关注
```sql
SELECT EXISTS(
  SELECT 1 FROM follows 
  WHERE follower_id = $1 
    AND following_id = $2 
    AND status = 'active'
) as is_following;
```

### 获取未读消息数
```sql
SELECT 
  SUM(
    CASE 
      WHEN participant_1_id = $1 THEN unread_count_p1
      WHEN participant_2_id = $1 THEN unread_count_p2
      ELSE 0
    END
  ) as total_unread
FROM conversations
WHERE participant_1_id = $1 OR participant_2_id = $1;
```

---

## 🎨 前端集成要点

### Supabase客户端初始化
```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### 实时订阅示例
```typescript
// 订阅新消息
const channel = supabase
  .channel('messages')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'messages' }, 
    (payload) => console.log('New message:', payload.new)
  )
  .subscribe()
```

### 文件上传示例
```typescript
const { data, error } = await supabase.storage
  .from('huanxin-media')
  .upload(`avatars/${userId}/avatar.jpg`, file)
```

---

## ⚡ 性能优化策略

### 数据库层面
1. **索引优化** - 为高频查询字段建立索引
2. **物化视图** - 缓存复杂查询结果
3. **分区表** - 按时间分区大数据表
4. **连接池** - 限制数据库连接数
5. **查询优化** - 避免N+1查询

### 应用层面
1. **Redis缓存** - 缓存热点数据
2. **CDN加速** - 静态资源使用CDN
3. **图片优化** - 使用Next.js Image组件
4. **虚拟滚动** - 长列表使用虚拟滚动
5. **代码分割** - 动态导入减少首屏加载

### 缓存策略
```typescript
// 用户信息缓存（1小时）
user:{user_id} -> User对象

// 作品详情缓存（30分钟）
work:{work_id} -> Work对象

// Feed流缓存（2分钟）
feed:recommend:{user_id} -> Work[]

// 关注状态缓存（10分钟）
follow:{follower_id}:{following_id} -> boolean
```

---

## 🔒 安全性考虑

### 数据安全
1. **RLS策略** - 使用Supabase行级安全保护数据
2. **密码加密** - 使用bcrypt加密用户密码
3. **SQL注入** - 使用参数化查询
4. **XSS防护** - 前端输出转义
5. **CSRF防护** - 使用CSRF token

### API安全
1. **JWT认证** - 所有敏感接口需要认证
2. **权限验证** - 检查用户权限
3. **请求限流** - 防止滥用
4. **输入验证** - 严格验证输入参数
5. **HTTPS** - 强制使用HTTPS

---

## 📈 监控指标

### 关键指标
- **DAU/MAU** - 日活/月活用户
- **作品发布量** - 每日新增作品数
- **AI生成量** - AI生成任务数
- **互动率** - 点赞/评论/分享比例
- **留存率** - 次日/7日/30日留存
- **能量消耗** - 平均每用户能量消耗

### 性能指标
- **API响应时间** - P50/P95/P99
- **数据库查询时间**
- **文件上传速度**
- **AI生成耗时**
- **错误率**

---

## 🧪 测试数据

### 创建测试用户
```sql
INSERT INTO users (phone, nickname, avatar_url, bio, location, energy_balance) VALUES
  ('13800000001', '测试用户1', '/placeholder.svg', '这是测试账号1', '北京', 100),
  ('13800000002', '测试用户2', '/placeholder.svg', '这是测试账号2', '上海', 100),
  ('13800000003', '测试用户3', '/placeholder.svg', '这是测试账号3', '广州', 100);
```

### 创建测试作品
```sql
INSERT INTO works (
  user_id, 
  title, 
  description, 
  type, 
  media_url, 
  thumbnail_url,
  category,
  tags,
  status,
  published_at
) 
SELECT 
  u.id,
  '测试作品 ' || i,
  '这是一个测试作品描述',
  'image',
  '/placeholder.jpg',
  '/placeholder.jpg',
  'discover',
  ARRAY['测试', '示例'],
  'published',
  NOW() - (i || ' hours')::INTERVAL
FROM users u
CROSS JOIN generate_series(1, 10) as i
WHERE u.phone LIKE '138000000%';
```

---

## 📝 数据表统计

| 模块 | 表数量 | 核心表 |
|------|--------|--------|
| 用户系统 | 3 | users, user_profiles, ai_avatars |
| 内容系统 | 3 | works, categories, work_categories |
| 社交互动 | 5 | follows, likes, comments, comment_likes, shares |
| 消息系统 | 3 | conversations, messages, notifications |
| AI系统 | 2 | ai_templates, ai_generations |
| 辅助系统 | 7 | energy_transactions, work_views, user_interests 等 |
| **总计** | **23** | - |

---

## 🔧 开发工作流

### 1. 本地开发
```bash
# 启动Supabase本地实例
supabase start

# 查看本地数据库
supabase db reset

# 运行迁移
supabase migration up

# 生成TypeScript类型
supabase gen types typescript --local > types/database.ts
```

### 2. 远程部署
```bash
# 推送迁移到远程
supabase db push

# 生成远程类型
supabase gen types typescript --project-ref your-ref > types/database.ts
```

### 3. 回滚
```bash
# 回滚最后一次迁移
supabase migration down

# 重置数据库（危险操作！）
supabase db reset
```

---

## 📋 实施检查清单

### 数据库阶段 ✓
- [x] 数据库表设计完成
- [x] ER图绘制完成
- [x] SQL迁移脚本准备
- [ ] 设计评审通过
- [ ] 创建Supabase项目
- [ ] 执行数据库迁移
- [ ] 配置RLS策略
- [ ] 初始化默认数据

### API开发阶段
- [x] API接口设计完成
- [ ] API实现开发
- [ ] API测试
- [ ] API文档补充
- [ ] 错误处理完善

### 前端集成阶段
- [x] 前端集成指南完成
- [ ] TypeScript类型定义
- [ ] API Service封装
- [ ] React Hooks封装
- [ ] 状态管理更新
- [ ] 实时功能集成

### 测试阶段
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能测试
- [ ] 安全测试
- [ ] 压力测试

### 部署阶段
- [ ] Supabase配置
- [ ] Vercel部署
- [ ] 环境变量配置
- [ ] CDN配置
- [ ] 监控告警配置

---

## 🐛 常见问题

### Q1: 为什么不使用物理外键？
**A**: 
- 物理外键会增加数据库复杂度和维护成本
- 在高并发场景下可能影响性能
- 逻辑外键在应用层维护更灵活
- Supabase推荐使用逻辑外键

### Q2: 如何处理数据一致性？
**A**: 
- 使用数据库事务保证原子性
- 使用触发器自动同步统计数据
- 应用层增加重试机制
- 定期数据校验和修复

### Q3: 如何优化大数据量查询？
**A**: 
- 使用索引加速查询
- 使用物化视图缓存复杂查询
- 实施数据分区策略
- 使用Redis缓存热点数据

### Q4: 如何实现实时功能？
**A**: 
- 使用Supabase Realtime订阅数据库变化
- WebSocket推送实时消息
- 客户端轮询作为降级方案

### Q5: 如何保护用户隐私？
**A**: 
- 使用RLS策略控制数据访问
- 敏感字段脱敏处理
- 隐私设置尊重用户选择
- 定期安全审计

---

## 📚 参考资料

### Supabase官方文档
- [Supabase文档](https://supabase.com/docs)
- [PostgreSQL文档](https://www.postgresql.org/docs/)
- [Supabase RLS指南](https://supabase.com/docs/guides/auth/row-level-security)

### Next.js集成
- [Next.js + Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

---

## 🤝 贡献指南

### 修改数据库设计
1. 提出设计变更需求
2. 更新对应文档
3. 创建新的迁移脚本
4. 测试验证
5. 提交审核

### 新增API接口
1. 在API_DESIGN.md添加接口文档
2. 实现接口逻辑
3. 添加单元测试
4. 更新前端类型定义
5. 提交代码审查

---

## 📞 联系方式

**技术负责人**: [姓名]  
**架构师**: [姓名]  
**DBA**: [姓名]

---

## 🔄 版本历史

| 版本 | 日期 | 变更说明 | 作者 |
|------|------|----------|------|
| v1.0 | 2025-10-28 | 初始版本 | 技术团队 |

---

## 🎯 下一步计划

### 短期（1-2周）
- [ ] 确认数据库设计
- [ ] 执行数据库迁移
- [ ] 实现核心API接口
- [ ] 前端集成测试

### 中期（1个月）
- [ ] 完善AI生成功能
- [ ] 实现推荐算法
- [ ] 性能优化
- [ ] 安全加固

### 长期（3个月）
- [ ] 数据分析系统
- [ ] 运营后台
- [ ] 移动端适配
- [ ] 国际化支持

---

**文档最后更新**: 2025-10-28  
**文档维护者**: 技术团队


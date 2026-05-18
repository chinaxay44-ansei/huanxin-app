# 焕星（HuanXin）AI 视频社交应用 - 实际实现版 PRD（基于当前代码）

> 基于 2025-11-27 的代码（Next.js 16、Supabase、Tailwind CSS v4、Zustand），同步现有功能与接口，替换早期文档与实现不一致的部分。

## 0. 修订信息
- 适用分支：现有 `app/*`、`app/api/*`、`lib/*`
- 覆盖范围：前端页面、主要 API 行为、管理端入口、待办清单
- 输出目的：给产品/研发/测试一个最新的事实来源

## 1. 产品概述
- **定位**：移动端优先的 AI 图片/视频社区，提供作品浏览、生成入口、基础社交与私信。
- **核心卖点**
  - AI 作品消费：双列瀑布流图片流 + 竖滑视频流。
  - AI 生成入口：目录树驱动的生成功能，支持同款/一键入口。
  - 社交消息：点赞、评论、关注接口已接；站内私信使用 Supabase Realtime。
  - 多种登录：用户名密码为主，短信 OTP / 邮箱登录接口保留可用。
  - 管理后台：热门搜索、趣味玩法、生成功能、分类等基础运营位配置。

## 2. 关键页面与已实现功能
### 2.1 首页 `/`
- AI 写真 Tab：双列瀑布流，IntersectionObserver 无限滚动；分类来自 `/api/categories?type=image`（含默认“发现”）。
- 数据源：`/api/works`（`type=image`，`limit/offset`，返回 `{ data, hasMore }`）。
- 媒体：图片/视频混排，点击调用 `MediaViewerOverlay`，可继续加载更多。
- 趣味玩法 Tab：`/api/fun-series` + `/api/fun-series/[slug]`，网格卡片 + 覆盖层浏览。
- 其它：顶部搜索入口、主题切换、`sessionStorage` 级缓存 `home-feed-cache-v1`。

### 2.2 视频流 `/video`
- 竖滑播放、双击点赞、评论抽屉、关注作者、分享、同款/快速生成占位。
- 数据源：`/api/works?type=video`（分类来自 `/api/categories?type=video`）。
- 互动：`likeWork/unlikeWork`，`/api/works/:id/comments`，`/api/users/follow`。

### 2.3 生成入口 `/generate`
- 目录树由 `/api/generation-features` 提供（目录/叶子节点）。
- 下钻到 `/generate/feature/[id]`；其他入口 `/generate/ai-photo`、`/one-click`、`/same-style`、`/fun` 等共用 `/api/ai/*` 逻辑。
- 历史记录 `/generate/history` 读取 `/api/ai/generate`；个人主页也会轮询生成任务。

### 2.4 搜索 `/search` 与结果页 `/search/results`
- 热搜：`/api/interactions/trending-searches`；最近搜索保存在本地。
- 结果：`/api/search` 综合返回作品/用户/标签，分页参数 `page/limit`。

### 2.5 消息与聊天
- `/messages`：会话列表 `GET /api/messages/conversations?limit=50`，显示未读、搜索占位。
- `/chat/[id]`：消息列表 `GET /api/messages/conversations/{id}/messages`，上拉分页、撤回状态。
- 发送：`POST /api/messages/conversations/{id}/messages`（文件上传控件占位）。
- 实时：Supabase Realtime 订阅 `messages` 表 INSERT/UPDATE（channel `messages-{conversationId}`）。
- 已读：`POST /api/messages/conversations/{id}/read`。

### 2.6 个人主页 `/profile`
- 信息：`/api/users/profile`、`/stats`、`/tags`；编辑资料弹窗。
- Tab：公开作品、私密作品、点赞的作品、进行中的生成任务。
- 列表：`/api/users/works?visibility=public|private`；点赞列表 `getUserLikedWorks`。
- 生成任务：`/api/ai/generate` + `/api/ai/generations/{id}` 轮询 pending/processing。

### 2.7 关注/粉丝 `/following`
- Tab：关注、粉丝、推荐；数据源 `/api/users/following|followers|recommendations`，分页 `page/limit`。

### 2.8 头像管理 `/avatar-management`
- 上传 + 裁剪 UI；走 `/api/upload`、`/api/media/proxy`，保存回用户资料。

### 2.9 设置 `/settings`
- 账户信息展示、主题切换、退出登录（`/api/auth/logout`），手机号绑定为占位。

### 2.10 管理后台 `/admin`
- 导航：热门搜索、趣味玩法、生成功能、作品、分类、用户、举报等入口。
- 已实现：
  - 热门搜索 `/admin/trending` → `/api/admin/trending-searches` CRUD。
  - 趣味玩法 `/admin/fun-series` → `/api/admin/fun-series` 及子项。
  - 生成功能 `/admin/generation-features` → `/api/admin/generation-features` 树结构管理。
- 鉴权：请求头 `x-admin-token`（env: `NEXT_PUBLIC_ADMIN_API_TOKEN` 或 `ADMIN_API_TOKEN`）。

## 3. 接口与数据要点
- 认证：用户名密码登录（主流程），短信 OTP（`/api/auth/send-sms` + `/verify-code`），邮箱登录（Supabase），OAuth 占位（微信位用 Google 代替）。
- 会话：`/api/auth/login|register|logout|me`，前端 token 存 `localStorage` + cookies；API 路由内用 Supabase service client。
- 作品：`/api/works`（`type=image|video`，`limit/offset`，`hasMore`），`/api/works/[id]` 及点赞/评论/分享子路由；`/api/categories`；`/api/fun-series`；`/api/same-style`、`/api/feature-generate`。
- AI 生成：`/api/ai/generate`（列表/创建），`/api/ai/generations/[id]`，`/api/generation-features`，`/api/maintenance/comfyui`，`/api/runninghub/webhook`。
- 消息：`/api/messages/conversations`、`/api/messages/conversations/{id}/messages`、`/read`、`/recall`；表变更靠 Supabase Realtime。
- 搜索/推荐：`/api/search`；`/api/recommendations/works|users`；`/api/interactions/trending-searches`。
- 上传/存储：`/api/upload`（Supabase Storage），`/api/media/proxy`（处理公网地址与跨域）。

## 4. 技术栈与架构
- 前端：Next.js 16 App Router、React 19、Tailwind CSS 4、Zustand、shadcn/ui、Sonner、next-themes。
- 后端：Next.js API Routes + Supabase（Postgres/Storage/Realtime）；少量外部生成服务转发。
- 状态与缓存：`useAuth` 持久化，业务 hooks 在 `lib/hooks/*`；首页使用 `sessionStorage` 简易缓存。

## 5. 权限与安全
- 页面保护：`AuthGuard` 应用于 `/generate/*`、`/messages`、`/chat/[id]`、`/profile` 等。
- 管理端：`x-admin-token` 头；无 UI 登录。
- 上传：统一走后端 `/api/upload`，默认写入 Supabase 公共桶；展示时建议走 `/api/media/proxy`。

## 6. 已知差异与待办
- 尚未落地：能量值/付费、完整内容审核、个性化推荐、举报/封禁流程、聊天多媒体发送、生成任务高级编排。
- 注意：大量分页依赖 `hasMore`，更新接口时请保持返回结构；旧版文档中的字段若与数据库不符，以实际表为准（参考 `DATABASE_DESIGN.md`）。

## 7. 迭代建议
1) 补齐聊天多媒体与生成状态闭环，再做推荐算法。
2) 管理端增加登录与角色控制，替换纯 token 模式。
3) 为 `/api/works`、`/api/ai/generate` 增加自动化测试，避免瀑布流/轮询回归。
4) 首页缓存增加版本号，避免接口字段变更导致旧缓存渲染异常。

— 完 —

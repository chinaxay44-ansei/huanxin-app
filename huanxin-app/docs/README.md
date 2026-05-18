# 焕星（HuanXin）文档索引（与当前代码对齐）

本页同步于 2025-12-02 代码（Next.js 16 + Supabase）。早期规划与实现有差异，请以新版 PRD 与当前仓库为准。

## 快速开始
- 依赖：Node 18+；`.env.local` 需配置 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`，管理端可选 `NEXT_PUBLIC_ADMIN_API_TOKEN`。
- 开发：`npm install`（或复用已有 `node_modules`）后运行 `npm run dev`，访问 `http://localhost:3000`。
- 登录：UI 主要是用户名/密码；短信 OTP 与邮箱登录接口在 `/api/auth/*` 仍可用。

## 核心文档
- `PRD.md`：实际实现版 PRD，功能范围、页面说明、接口要点、待办。
- `DATABASE_DESIGN.md` / `DATA_DICTIONARY.md` / `ER_DIAGRAM.md`：数据库结构（Supabase）。
- `API_DESIGN.md`：REST 接口说明，对照 `app/api/*`。
- `FRONTEND_INTEGRATION.md`：Supabase 客户端、业务 hooks、上传示例。
- `ADMIN_GUIDE.md`：管理端入口与 `x-admin-token` 约定。
- `MIGRATION_TEMPLATE.sql` / `seed_test_data.sql`：建表与测试数据模板。
- `QUICK_REFERENCE.md`：常用操作速查。

## 当前功能概览（简要）
- 首页：图片瀑布流 + 趣味玩法分区，分类筛选，媒体覆盖层预览。
- 视频页：竖滑播放、点赞/评论/关注、同款入口。
- 生成入口：生成功能目录树，历史记录，同款/一键出片入口；RuningHub 改为 webhook 回调（`RUNNINGHUB_WEBHOOK_URL`），成功会写入系统通知，无轮询。
- 社交：关注/粉丝、点赞、评论（API 已接）、搜索（热搜 + 综合搜索）。
- 消息：会话列表与私信，Supabase Realtime；支持 `/chat/new?userId=xxx` 自动建会话。
- 个人主页：公开/私密/点赞作品；生成任务由 webhook 更新状态，成功写系统通知。
- 管理后台：热门搜索、趣味玩法、生成功能等基础运营位。

## 版本差异提醒
- 能量/付费、完整内容审核、推荐算法等尚未落地；聊天多媒体与后台审核流仍有占位或部分实现，详见 `PRD.md` 的“已知差异与待办”。

如需补充或修改，请先更新 PRD，再同步到相关设计与接口文档。

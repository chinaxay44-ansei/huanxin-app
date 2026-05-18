# 焕星管理后台（Admin）使用与接口总览

## 1. 概述
- 管理后台用于站点运营、内容审核与用户管理。
- 本指南汇总 Admin 页面入口、接口、安全配置与数据库关联，便于统一维护与协作。

---

## 2. 页面入口与模块
- 入口：`/admin`
- 模块：
  - 热门搜索：`/admin/trending`
  - 作品管理：`/admin/works`
  - 分类管理：`/admin/categories`
  - 用户管理：`/admin/users`
  - 举报管理：`/admin/reports`
  - 系统配置：`/admin/configs`（预留）

布局说明：Admin 布局已调整为全屏铺满（full‑bleed），仅修改 `app/admin/layout.tsx`，不影响非 Admin 页面。

---

## 3. 安全与环境配置
- 请求头统一使用：`x-admin-token: <TOKEN>`
- 环境变量：
  - `NEXT_PUBLIC_ADMIN_API_TOKEN`（前端可读取，便于 Admin UI 直接调用）
  - `ADMIN_API_TOKEN`（服务端专用，不暴露给浏览器）
- 当前接口授权实现：
  - `/api/admin/works`、`/api/admin/users`、`/api/admin/reports` 支持 `NEXT_PUBLIC_ADMIN_API_TOKEN` 与 `ADMIN_API_TOKEN`（优先前者）。
  - `/api/admin/trending-searches`、`/api/admin/categories` 使用 `ADMIN_API_TOKEN`。
- 本地示例（`huanxin-app/.env.local`）：
  ```env
  NEXT_PUBLIC_ADMIN_API_TOKEN=dev-admin-token-please-change
  # ADMIN_API_TOKEN=server-only-token-if-needed
  ```
- 切记：不要将真实生产密钥提交到仓库。

---

## 4. Admin API 总览

### 4.1 热门搜索 Trending Searches
- 基础路径：`/api/admin/trending-searches`
- 授权：`x-admin-token`
- 表：`trending_searches`
- 接口：
  - `GET`：列表，按 `sort_order`、`search_count` 排序。
  - `POST`：新增 `{ keyword, sort_order?, is_active? }`。
  - `PUT`：更新 `{ id, keyword?, sort_order?, is_active? }`。
  - `DELETE`：删除 `{ id }`。

### 4.2 分类管理 Categories
- 基础路径：`/api/admin/categories`
- 授权：`x-admin-token`
- 表：`categories`
- 接口：
  - `GET`：列表，按 `sort_order`、`name` 排序。
  - `POST`：新增 `{ name, slug, type, parent_id?, icon_url?, cover_url?, description?, sort_order?, is_active? }`。
  - `PUT`：更新 `{ id, name?, slug?, type?, parent_id?, icon_url?, cover_url?, description?, sort_order?, is_active? }`。
  - `DELETE`：删除 `{ id }`。

### 4.3 作品管理 Works
- 基础路径：`/api/admin/works`
- 授权：`x-admin-token`
- 表：`works`
- 接口：
  - `GET`：筛选与分页
    - 查询参数：`status?`（`draft|reviewing|published|rejected`）、`visibility?`（`public|followers|private`）、`search?`（标题模糊）、`page?`、`limit?`（<=200）。
    - 返回：`{ items, page, limit, total }`。
  - `PUT`：更新 `{ id, title?, description?, status?, visibility? }`。
  - `DELETE`：软删除：`/api/admin/works?id=<id>`，将 `deleted_at` 设为当前时间。

### 4.4 用户管理 Users
- 基础路径：`/api/admin/users`
- 授权：`x-admin-token`
- 表：`users`
- 接口：
  - `GET`：筛选与分页
    - 查询参数：`search?`（昵称模糊）、`status?`（`active|banned|deleted`）、`page?`、`limit?`（<=200）。
    - 返回：`{ items, page, limit, total }`。
  - `PUT`：更新 `{ id, status?, is_verified?, verified_type?, nickname? }`。
  - `DELETE`：软删除：`/api/admin/users?id=<id>`，将 `status=deleted` 且记录 `deleted_at`。

### 4.5 举报管理 Reports
- 基础路径：`/api/admin/reports`
- 授权：`x-admin-token`
- 表：`reports`
- 接口：
  - `GET`：筛选与分页
    - 查询参数：`status?`（`pending|reviewing|handled|rejected`）、`search?`（`reason|description` 模糊）、`page?`、`limit?`（<=200）。
    - 返回：`{ items, page, limit, total }`。
  - `PUT`：更新 `{ id, status?, handle_result? }`，当 `status` 为 `handled|rejected` 时自动设定 `handled_at`。

---

## 5. Admin UI 功能清单
- 热门搜索：新增、编辑关键词、排序、启用/停用、删除；快速刷新列表。
- 分类管理：新增/编辑字段、排序、启用/停用、删除；支持父子结构（`parent_id`）。
- 作品管理：搜索标题、筛选状态与可见性、编辑标题/状态/可见性、软删除、分页。
- 用户管理：搜索昵称、筛选状态、封禁/解封、认证标记、软删除、分页。
- 举报管理：筛选状态与搜索原因/描述、编辑处理结果、状态流转（审核中/已处理/已驳回）、分页。

---

## 6. 常见问题（FAQ）
- 管理页打不开？请使用当前开发端口（如 `http://localhost:3004/admin`）。若 3000 端口报锁，请停止旧进程后重启。
- Token 未配置导致 401？确保在 `.env.local` 配置 `NEXT_PUBLIC_ADMIN_API_TOKEN`，并在请求头携带 `x-admin-token`。
- 布局太窄？Admin 布局已改为全屏；若组件宽度固定（如 `w-64`），可在对应 Admin 页面改为更宽或 `w-full`。

---

## 7. 关联文档
- [README.md](./README.md)
- [API_DESIGN.md](./API_DESIGN.md)
- [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)
- [DATABASE_AND_API_README.md](./DATABASE_AND_API_README.md)
- [DATABASE_DESIGN.md](./DATABASE_DESIGN.md)
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- [DATA_DICTIONARY.md](./DATA_DICTIONARY.md)
- [ER_DIAGRAM.md](./ER_DIAGRAM.md)

---

**最后更新**：2025-11-06  
**维护者**：技术团队
## 趣味玩法专题管理（新增）

### 入口
- 管理后台首页增加菜单：`/admin/fun-series`
- 专题作品管理：`/admin/fun-series/{id}/items`

### 授权
- 请求头：`x-admin-token: <NEXT_PUBLIC_ADMIN_API_TOKEN 或 ADMIN_API_TOKEN>`

### 操作
- 创建/编辑/删除专题
- 搜索作品并添加到专题，支持标题与封面覆盖
- 切换专题启用状态与排序
## 7. 生成页管理（新增）

### 7.1 入口
- 左侧导航新增“生成页管理”：`/admin/generation-features`
- 概览页新增卡片入口

### 7.2 功能
- 列表分页、搜索（本地）、排序、启用/可见性
- 新增/编辑：支持“类型（功能/目录）”“父级目录”“封面”“说明”等
- JSON配置：`/admin/generation-features/:id/json-config`
  - 配置结构：`{ apiKey, workflowId, nodeInfoList }`
  - `nodeInfoList` 每项：`{ nodeId, fieldName, fieldValue, valueSource, description }`
  - 值来源与令牌：`image_upload/outfit_image/video_upload/prompt_text/custom_value/file_upload/avatar_image/asset_image/work_image` 对应 `__TOKEN__`

### 7.3 前端渲染与生成
- 入口页 `/generate`：树形展开目录与功能
- 功能页 `/generate/feature/:id`：按配置渲染输入，提交到 `POST /api/feature-generate/:id`
- 作品同款：`/admin/works/:workId/json-config` 与 `/generate/same-style/:workId`

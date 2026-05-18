# HuanXing (HX) - API Design (code synced 2025-12-07)

This document mirrors the current Next.js App Router code under `app/api/*`. Every section links to the underlying implementation so frontend/backend contributors can rely on actual behavior instead of historical plans.

## 0. Shared Contract

- **Base path:** all routes live under `/api`.
- **Authentication:** application-issued JWT stored in the `auth-token` HTTP-only cookie and/or passed as `Authorization: Bearer <token>`. The helper `requireAuth` (see `lib/middleware/auth.ts`) is used everywhere. Expired/missing tokens yield `{ success: false, error: 'UNAUTHORIZED' }` with HTTP 401; the body also carries `expired: true` so clients can clear cookies.
- **Response shape:** every handler returns `{ success, data?, error?, message? }`. Errors never throw HTML-callers should branch on the `success` flag plus status code.
- **Pagination:** `limit` (default 20, capped at 50 unless the handler states otherwise) and `offset` (default 0). Many list APIs also bubble `total` and `hasMore`.
- **File uploads:** authenticated uploads go through `/api/upload/*` (multipart `FormData`) or `/api/storage/upload`. All large media eventually lands in Supabase/COS buckets; read-only clients should prefer `/api/media/proxy?u=<public-url>` to avoid CORS headaches and to reuse shared CDN caching (`max-age=7d` with `stale-while-revalidate`).
- **Caching:** frequently-read anonymous data (works, categories, fun-series) sets `Cache-Control` headers (`s-maxage` between 30-300 seconds). Logged-in reads disable caching.
- **Admin surfaces:** every `/api/admin/**` route enforces the `x-admin-token` header. Non-admin scripts use `x-admin-secret` where explicitly called out (e.g., maintenance jobs).

## 1. Auth & Session

| Path | Method | Purpose | Request requirements | Response / Notes |
| --- | --- | --- | --- | --- |
| `/api/auth` (`app/api/auth/route.ts`) | `POST` | Send Supabase OTP SMS. | JSON `{ phone }` where phone matches `^1[3-9]\d{9}$`. | `{ success: true }` if Supabase accepted the request; validation errors set HTTP 400. |
| `/api/auth` | `GET` | Legacy Supabase session probe. | Relies on Supabase cookies (used by native app). | `{ authenticated: boolean, user?: profile }`. Only used by the OTP flow. |
| `/api/auth/login` | `POST` | Username/password login, issues JWT and sets `auth-token`. | `{ username, password }`, username must be `[a-zA-Z0-9_]{3,20}`. | On success returns `{ data: { user, token } }` and persists cookie for 30 days. |
| `/api/auth/register` | `POST` | Create account, seed profile/avatars/outfits, issue JWT. | `{ username, password (>=6 chars), nickname (2-20 chars) }`. | Returns `{ data: { user, token } }`. Also auto-follows the official account and seeds default AI avatars/outfits. |
| `/api/auth/logout` | `POST` | Clear authentication cookie. | none | Always returns `{ success: true }` and expires `auth-token`. |
| `/api/auth/me` | `GET` | Fetch the latest profile snapshot. | `auth-token` cookie or Authorization header. | Response wraps `getUserInfo`; expired tokens trigger cookie deletion hint (`expired: true`). |

## 2. Users & Profiles

| Path | Method | Purpose | Request highlights | Response highlights |
| --- | --- | --- | --- | --- |
| `/api/users/[userId]` (`app/api/users/[userId]/route.ts`) | `GET` | Public profile + optional stats. | Path param UUID; query `includeStats=true` to also call `/users/stats`. | `{ success, data: { profile, stats? } }`, 404 when user missing. |
| `/api/users/profile` | `PUT` | Update the authenticated user's base profile. | Requires login. Body accepts `nickname`, `bio`, `avatar_url`, `gender('male'|'female'|'other')`, `birthday('YYYY-MM-DD')`, `location`, `settings`. Validates each field before calling Supabase. | Returns updated row from `updateUserProfile`; 401/400 responses use descriptive error codes (`INVALID_NICKNAME`, etc.). |
| `/api/users/works` | `GET` | List works for a user with visibility filtering. | Needs login; query `userId`, `visibility=public|private`, `limit<=100`, `offset`. Only self can request `private`. | Bubbles through `getUserWorks`, preserving `success/data`. |
| `/api/users/stats` | `GET` | Fetch counters (followers, likes, etc.). | Requires login; optional `userId` (defaults to caller). | `{ success, data: { following_count, followers_count, ... } }`. |
| `/api/users/tags` | `GET/PUT` | Manage personal tag preferences. | GET optionally filters by `userId` (only accessible for caller or admins); PUT expects `{ tagIds: string[] }`. | Returns tag list grouped by category. Validation ensures IDs array provided. |
| `/api/users/search` | `GET` | Internal lightweight search (min 2 chars). | `q`, optional `limit<=50`, `offset`. | `searchUsers` result; trimmed query is required, else 400. |

## 3. Works & Discovery

### 3.1 Works CRUD (`app/api/works/*.ts`)

| Path | Method | Highlights |
| --- | --- | --- |
| `/api/works` | `GET` | Filters: `userId`, `categoryId` (UUID or slug), `type=image|video`, `status`, `sortBy=created_at|updated_at|likes_count|views_count|random`, `sortOrder`, `limit<=50`, `offset`. Non-owners only see `visibility='public'`. Random sort rewrites `offset` to keep performance. |
| `/api/works` | `POST` | Validates title (1-100 chars), description (<=1000), media URL/type, tags array (<=10 items, <=20 chars each). Optionally maps category slug to ID. New works default to `status='published'`, `visibility='public'`. |
| `/api/works/[workId]` | `GET` | Allows anonymous reads; if JWT provided the response shows `is_liked`. Also increments `views_count` safely. |
| `/api/works/[workId]` | `PUT` | Owner-only. Accepts partial updates for title/description/thumbnail/tags/status/visibility/generation params. Setting `status='private'` automatically maps to `status='published' + visibility='private'`. |
| `/api/works/[workId]` | `DELETE` | Soft-delete by marking `status='rejected'` and `visibility='private'`. |
| `/api/works/json-config/[workId]` | `GET` | Returns the stored `generation_params.request_json` for Same-Style flows. Accepts path or `workId` query. |

### 3.2 Discovery & Search

| Path | Method | Purpose / Key params |
| --- | --- | --- |
| `/api/categories` | `GET` | Active categories ordered by `sort_order`. Optional `type=image|video`. Sets `Cache-Control: s-maxage=300`. |
| `/api/tags/categories` | `GET` | Lists personal-tag categories for onboarding. No auth required. |
| `/api/fun-series` | `GET` | Returns curated series + top `items_limit` works each (default 6). Fully cached. |
| `/api/fun-series/[slug]` | `GET` | Paginates through series items via slug, includes author info. |
| `/api/recommendations` | `GET` | Logged-in personalized feed. Query `type=works|users|all`, `limit<=50`, `offset`. Uses `getRecommendedWorks`/`getRecommendedUsers`. |
| `/api/search` | `GET` | Multifunction endpoint. `type=suggestions` -> autocomplete, `type=hot` -> trending keywords, otherwise blended search (requires `q`). Optional `limit<=50`. Accepts optional `x-user-id` header to bias results. |
| `/api/search/users` | `GET` | Public user search with `q`, `limit<=50`, `offset`. |
| `/api/search/works` | `GET` | Works search. Supports `q`, `category_id`, `sort_by=relevance|created_at|views|likes`, `limit<=50`, `offset`. |

## 4. AI Generation & Creative Assets

| Path | Method | Purpose / Payload summary |
| --- | --- | --- |
| `/api/ai/generate` (`app/api/ai/generate/route.ts`) | `POST` | Start a generic AI job. Body: `{ template_id?, prompt?, source_urls[], generation_params? }`. Validates source URLs, creates placeholder work, inserts row into `ai_generations`, and triggers RunningHub via `createTask`. |
| `/api/ai/generate` | `GET` | Lists latest generations for caller (`limit` default 50). Also backfills missing works when output finished but DB not yet updated. |
| `/api/ai/generate/[taskId]` | `GET` | Fetch a single generation task, owner-only. |
| `/api/ai/generations/[id]` | `GET` | Raw generation record (service use). |
| `/api/feature-generate/[featureId]` | `POST` | Dynamically renders RunningHub node config for a feature or slug. Body matches generate: `{ resolvedValues[], promptText?, instanceType?, usePersonalQueue? }`. Creates placeholder work + `ai_generations` row. |
| `/api/same-style/generate/[workId]` | `POST` | Same-style workflow based on an existing work's stored JSON config. Accepts `resolvedValues[]`, `promptText`, `instanceType`, `usePersonalQueue`. |
| `/api/ai/templates` / `/api/ai/templates/[templateId]` | `GET` | Public template list/detail with filters `category`, `sub_category`, `is_new`, `limit<=12`. |
| `/api/ai/avatars` | `GET/POST/DELETE` | Manage AI avatars. `POST` expects `{ name, avatar_url }` (validated via HEAD request), fires RunningHub avatar workflow, and writes `ai_generations`. `DELETE` takes query `id`, wipes related outfits. |
| `/api/ai/avatars/[avatarId]` | `PUT/DELETE` | Update fields such as `name`, `description`, `avatar_url`, `voice_id`, `personality_traits`, `is_active`; delete removes avatar + outfits. |
| `/api/outfits` | `GET/POST/DELETE` | Avatar outfit library. Requires login. `GET` needs `avatarId`, `limit`. `POST` takes `{ avatar_id, image_url, title? }` and runs RunningHub outfit workflow. |
| `/api/assets` | `GET/POST/DELETE` | User assets. `POST` accepts `{ image_url, title?, tags? }` and creates `ai_generations` entry to process asset via RunningHub. |
| `/api/runninghub/webhook` | `POST` | RunningHub callback. Validates payload, uploads finished media to COS, updates `ai_generations`, updates/creates final works/avatars/outfits/assets, and inserts notifications. Returns `{ success: true }` even if downstream steps hiccup. |

## 5. Social Graph & Messaging

### 5.1 Social endpoints (`app/api/social/*`)

| Path | Method | Purpose |
| --- | --- | --- |
| `/api/social/follow` | `POST/DELETE` | Follow or unfollow `following_id` (body or query). Prevents self-follow. |
| `/api/social/like` | `POST/DELETE` | Like/unlike works via `work_id`. |
| `/api/social/comments` | `GET/POST` | `GET` requires `work_id`, `limit<=50`, `offset`; optionally authenticates to include `is_liked`. `POST` accepts `{ work_id, content, parent_id? }` with length <=500. |
| `/api/social/comments/[commentId]/replies` | `GET` | Paginates replies for a comment. Adds `is_liked` if caller authenticated. |
| `/api/social/comments/like` | `POST/DELETE` | Like/unlike comments via `comment_id`. |
| `/api/social/share` | `POST` | Records sharing events, body `{ work_id, platform? }` with whitelist `app|wechat|weibo|qq|douyin|other`. |

### 5.2 Messaging (`app/api/messages/*`)

| Path | Method | Purpose |
| --- | --- | --- |
| `/api/messages/conversations` | `GET/POST` | `GET` lists conversations (`limit<=50`). `POST` creates a private conversation with `target_user_id` (rejects self). Both require login and reuse `auth.token`. |
| `/api/messages/conversations/[conversationId]/messages` | `GET/POST` | `GET` paginates messages; `POST` sends message with `{ content?, message_type, media_url?, reply_to? }`. Validates UUID format and ensures membership. |
| `/api/messages/conversations/[conversationId]/read` | `POST` | Marks all messages as read for the participant. |
| `/api/messages/notifications` | `GET` | Lists notifications. Query: `limit<=50`, `offset`, `type`, `unread_only`, `count_only=true` (returns unread count only). |
| `/api/messages/notifications/[notificationId]/read` | `POST` | Mark a single notification as read. |
| `/api/messages/recall/[messageId]` | `POST` | Recall a message if still within allowed window and user is the sender. |

## 6. Upload & Storage

| Path | Method | Purpose |
| --- | --- | --- |
| `/api/upload/media` (`app/api/upload/media/route.ts`) | `POST` | Multipart upload for work media. Fields: `file`, `type=image|video`. Validates MIME (images: jpeg/png/gif/webp up to 10 MB, videos: mp4/webm/ogg/mov up to 100 MB). Returns COS/Supabase URL. |
| `/api/upload/avatar` | `POST` | Upload profile avatar (`FormData` field `avatar`). After upload, automatically updates `users.avatar_url`. |
| `/api/storage/upload` | `POST` | Generic COS upload helper. Accepts `FormData` with `file`, optional `bucket`, `pathPrefix`. Enforces 40 MB limit for videos. |
| `/api/storage/ensure` | `POST` | Placeholder that pretends to provision a COS bucket (always returns success for now). |
| `/api/storage/ingest` | `GET` | Admin task: sync bucket objects into `works`. Query `bucket`, `prefix`. Returns counts of processed objects. |
| `/api/media/proxy` | `GET` | Authenticated proxy for Supabase public storage files. Validates prefix to prevent SSRF. Responses are cached aggressively. |

## 7. Admin & Maintenance

All `/api/admin/**` routes share the token guard implemented in `app/api/admin/users/route.ts`. Provide `x-admin-token` (value taken from `NEXT_PUBLIC_ADMIN_API_TOKEN` or `ADMIN_API_TOKEN`). Highlights:

| Path | Method(s) | Summary |
| --- | --- | --- |
| `/api/admin/users` | GET / PUT / DELETE | List/manage users (`search`, `status`, `page`, `limit`). PUT updates status/verification fields. DELETE soft-deletes. |
| `/api/admin/works` | GET / PUT / DELETE | Inspect works with filters, bulk update status/visibility, soft-delete. |
| `/api/admin/works/bulk-upload` | POST | CSV/JSON bulk import for works. |
| `/api/admin/works/json-config/[workId]` & `/api/admin/works/json-config/bulk` | GET / POST | Read or upsert generation JSON configs for works. |
| `/api/admin/categories` | GET / POST / PUT / DELETE | Manage content categories. |
| `/api/admin/categories/migrate-types` | POST | Utility to rewrite category types en masse. |
| `/api/admin/fun-series` & `/api/admin/fun-series/items` | GET / POST / PUT / DELETE | Manage fun-series definitions plus their work mappings. |
| `/api/admin/generation-features` & `/api/admin/generation-features/json-config/[featureId]` | GET / POST / PUT / DELETE | CRUD for generation features backing `/api/feature-generate`. |
| `/api/admin/generate-nodeinfolist` | POST | Helper to normalize node insight payloads. |
| `/api/admin/trending-searches` | GET / POST / PUT / DELETE | Manage hot keyword lists. |
| `/api/admin/reports` | GET / PUT | Review abuse reports against works/users. |
| `/api/admin/generations` | GET | Monitor AI generation queue. |

Other privileged endpoints:
- `/api/maintenance/backfill-media` (`POST`) requires `x-admin-secret` (env `ADMIN_SECRET`) and runs `backfillWorkTypesByUrlSuffix` to fix missing `type` values.

## 8. Endpoint Index (auto derived from `app/api`)

| Path | Methods | Section |
| --- | --- | --- |
| `/api/admin/categories` | GET / POST / PUT / DELETE | Sec.7 |
| `/api/admin/categories/migrate-types` | POST | Sec.7 |
| `/api/admin/fun-series` | GET / POST / PUT / DELETE | Sec.7 |
| `/api/admin/fun-series/items` | GET / POST / PUT / DELETE | Sec.7 |
| `/api/admin/generate-nodeinfolist` | POST | Sec.7 |
| `/api/admin/generation-features` | GET / POST / PUT / DELETE | Sec.7 |
| `/api/admin/generation-features/json-config/[featureId]` | GET / POST | Sec.7 |
| `/api/admin/generations` | GET | Sec.7 |
| `/api/admin/reports` | GET / PUT | Sec.7 |
| `/api/admin/trending-searches` | GET / POST / PUT / DELETE | Sec.7 |
| `/api/admin/users` | GET / PUT / DELETE | Sec.7 |
| `/api/admin/works` | GET / PUT / DELETE | Sec.7 |
| `/api/admin/works/bulk-upload` | POST | Sec.7 |
| `/api/admin/works/json-config/[workId]` | GET / POST | Sec.7 |
| `/api/admin/works/json-config/bulk` | POST | Sec.7 |
| `/api/ai/avatars` | GET / POST / DELETE | Sec.4 |
| `/api/ai/avatars/[avatarId]` | PUT / DELETE | Sec.4 |
| `/api/ai/generate` | GET / POST | Sec.4 |
| `/api/ai/generate/[taskId]` | GET | Sec.4 |
| `/api/ai/generations/[id]` | GET | Sec.4 |
| `/api/ai/templates` | GET | Sec.4 |
| `/api/ai/templates/[templateId]` | GET | Sec.4 |
| `/api/assets` | GET / POST / DELETE | Sec.4 |
| `/api/auth` | GET / POST | Sec.1 |
| `/api/auth/login` | POST | Sec.1 |
| `/api/auth/logout` | POST | Sec.1 |
| `/api/auth/me` | GET | Sec.1 |
| `/api/auth/register` | POST | Sec.1 |
| `/api/categories` | GET | Sec.3 |
| `/api/feature-generate/[featureId]` | POST | Sec.4 |
| `/api/fun-series` | GET | Sec.3 |
| `/api/fun-series/[slug]` | GET | Sec.3 |
| `/api/generation-features` | GET | Sec.4 (client use) |
| `/api/generation-features/[featureId]` | GET | Sec.4 |
| `/api/maintenance/backfill-media` | POST | Sec.7 |
| `/api/media/proxy` | GET | Sec.6 |
| `/api/messages/conversations` | GET / POST | Sec.5 |
| `/api/messages/conversations/[conversationId]/messages` | GET / POST | Sec.5 |
| `/api/messages/conversations/[conversationId]/read` | POST | Sec.5 |
| `/api/messages/notifications` | GET | Sec.5 |
| `/api/messages/notifications/[notificationId]/read` | POST | Sec.5 |
| `/api/messages/recall/[messageId]` | POST | Sec.5 |
| `/api/outfits` | GET / POST / DELETE | Sec.4 |
| `/api/recommendations` | GET | Sec.3 |
| `/api/runninghub/webhook` | POST | Sec.4 |
| `/api/same-style/generate/[workId]` | POST | Sec.4 |
| `/api/search` | GET | Sec.3 |
| `/api/search/users` | GET | Sec.3 |
| `/api/search/works` | GET | Sec.3 |
| `/api/social/comments` | GET / POST | Sec.5 |
| `/api/social/comments/[commentId]/replies` | GET | Sec.5 |
| `/api/social/comments/like` | POST / DELETE | Sec.5 |
| `/api/social/follow` | POST / DELETE | Sec.5 |
| `/api/social/like` | POST / DELETE | Sec.5 |
| `/api/social/share` | POST | Sec.5 |
| `/api/storage/ensure` | POST | Sec.6 |
| `/api/storage/ingest` | GET | Sec.6/7 |
| `/api/storage/upload` | POST | Sec.6 |
| `/api/tags/categories` | GET | Sec.3 |
| `/api/upload/avatar` | POST | Sec.6 |
| `/api/upload/media` | POST | Sec.6 |
| `/api/users/[userId]` | GET | Sec.2 |
| `/api/users/profile` | PUT | Sec.2 |
| `/api/users/search` | GET | Sec.2 |
| `/api/users/stats` | GET | Sec.2 |
| `/api/users/tags` | GET / PUT | Sec.2 |
| `/api/users/works` | GET | Sec.2 |
| `/api/works` | GET / POST | Sec.3 |
| `/api/works/[workId]` | GET / PUT / DELETE | Sec.3 |
| `/api/works/json-config/[workId]` | GET | Sec.3/4 |

Use this table to confirm whether a route already exists before implementing new features; each row links back to the sections above for required payloads and behaviors.

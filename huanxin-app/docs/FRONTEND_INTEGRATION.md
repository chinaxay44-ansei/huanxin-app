# HuanXing Frontend Integration Guide (2025-12-07)

This playbook explains how the current Next.js 14+ frontend should talk to the backend described in `docs/API_DESIGN.md`. Each section highlights the React/Next entry points, preferred hooks, and the API endpoints you must call. When in doubt, read the API spec for payload details, then come back here for UI wiring patterns.

---

## 1. Environment & Dependencies

| Requirement | Notes |
| --- | --- |
| Node runtime | 18+ with experimental App Router features enabled. |
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ADMIN_API_TOKEN`. The application no longer relies on Supabase session cookies; JWTs issued by `/api/auth/login` are stored in the `auth-token` HTTP-only cookie. |
| Package installs | See `package.json`. For data fetching the project uses native `fetch`, `swr`, and `@tanstack/react-virtual`. Supabase JS is only used for Realtime (messages) and auxiliary storage helpers. |
| ESLint / Prettier / Tailwind | Already configured; follow existing conventions in `app`, `components`, and `hooks`. |

---

## 2. Authentication & Session State

### 2.1 Login + Registration flow
1. Collect credentials.
2. `POST /api/auth/login` or `POST /api/auth/register`.
3. On success the server returns `{ success: true, data: { user, token } }` and sets `auth-token`. Store `data.user` in the `useAuth` Zustand store (`lib/store/auth.ts`).
4. For OTP flows call `POST /api/auth` to send SMS and `POST /api/auth/verify-code` to exchange for a JWT.

### 2.2 Session restoration
```ts
const { setUser } = useAuth.getState();
fetch('/api/auth/me')
  .then(async res => {
    if (!res.ok) throw new Error('UNAUTHORIZED');
    const payload = await res.json();
    if (payload?.success) setUser(payload.data.user);
  })
  .catch(() => setUser(null));
```
Call this from `app/layout.tsx` (client boundary) or hydrate via `cookies().get('auth-token')` in server components.

### 2.3 Logout
`POST /api/auth/logout` then `useAuth.getState().logout()` to clear memory/UI state.

---

## 3. Data Fetching Patterns

| Scenario | Recommendation |
| --- | --- |
| Server-rendered lists | Use `async` Server Components with `fetch('/api/...', { next: { revalidate: 30 } })`. Pass data to client components for interactivity. |
| Client-only data (e.g., scroll pagination) | Use SWR (`hooks/use-swr-works.ts`) or custom hooks under `hooks/`. Deduplicate requests with `dedupingInterval`. |
| Mutations | Use `fetch` or dedicated helper modules in `lib/api/*.ts`. Always handle `{ success: false }` and surface `message` via toast/snackbar. |
| Websocket / Realtime | Supabase Realtime SDK is only used for chat notifications (`useRealtimeMessages`). Every channel must be unsubscribed on unmount. |

---

## 4. Feature Playbooks

### 4.1 Works feed & detail

| View | Implementation notes | API endpoints |
| --- | --- | --- |
| Home / Explore feed | Server component loads first page via `GET /api/works?type=image&limit=20`. Client component uses SWR or intersection observer to call `/api/works?offset=...`. Filter controls push query params (category, type). | `/api/works` |
| Work card actions | Buttons call `/api/social/like` (POST/DELETE) and `/api/social/share`. Use optimistic updates: adjust counters before awaiting response. | `/api/social/like`, `/api/social/share` |
| Work detail page | Server fetch `GET /api/works/[id]`. On client attach watchers: likes, comments, share. Use `<VideoPlayer>` or `<Image>` depending on `media_type`. | `/api/works/[id]` |
| Comments | `GET /api/social/comments?work_id=...` for list, `POST /api/social/comments`. Replies use `/api/social/comments/[commentId]/replies`. | `/api/social/comments`, `/api/social/comments/[commentId]/replies`, `/api/social/comments/like` |

### 4.2 Profile editing & uploads

| Area | Steps | API endpoints |
| --- | --- | --- |
| Profile modal/page | Use `useUserProfile(userId)` hook. Save via `PUT /api/users/profile`. Enforce client-side validation (nickname length 2-20, bio <=200). | `/api/users/profile`, `/api/users/[userId]` |
| Avatar upload | `<input type="file" accept="image/*">` -> preview -> `POST /api/upload/avatar` (multipart field `avatar`). Update local profile with returned `avatar_url`. | `/api/upload/avatar` |
| Personal tags | `GET /api/users/tags` to prefill chips, `PUT /api/users/tags` with `tagIds`. | `/api/users/tags` |
| Works tab | Use `GET /api/users/works?userId=...&visibility=public|private`. Self profile toggles between visibilities; others always use `public`. | `/api/users/works` |

### 4.3 AI creation surfaces

| Flow | Key steps | API endpoints |
| --- | --- | --- |
| Generic generate (`/generate`) | 1) `GET /api/generation-features` for directories. 2) On selection, fetch `GET /api/generation-features/[id]` to render form controls (component types derived from `nodeInfoList`). 3) Submit `resolvedValues`, `promptText`, etc. to `POST /api/feature-generate/[id]`. 4) Show toast and navigate to history list where placeholder works live. | `/api/generation-features`, `/api/generation-features/[id]`, `/api/feature-generate/[featureId]` |
| Same style | Prefill values using `GET /api/works/json-config/[workId]`, then `POST /api/same-style/generate/[workId]`. | `/api/works/json-config/[workId]`, `/api/same-style/generate/[workId]` |
| AI avatars/outfits/assets | Avatars: call `/api/ai/avatars` (list), `POST` to create, `DELETE` to remove. Outfits require existing avatars and use `/api/outfits`. Assets created via `/api/assets`. | `/api/ai/avatars`, `/api/outfits`, `/api/assets` |
| Task history | Read via `GET /api/ai/generate` or `GET /api/ai/generations/[id]`. Poll until `status === 'completed'`. Completed tasks reference a generated work or asset; show CTA to open the work detail. | `/api/ai/generate`, `/api/ai/generations/[id]` |

### 4.4 Social graph & notifications

| Feature | UI guidance | API endpoints |
| --- | --- | --- |
| Follow/unfollow | On profile cards call `/api/social/follow` (POST/DELETE). Buttons should disable while pending and confirm success via toast. | `/api/social/follow` |
| Followers/following lists | Use `/api/users/[userId]?includeStats=true` for counts, then dedicated list endpoints (implement via `/api/search/users?q=` filtering). |
| Notifications | `GET /api/messages/notifications?limit=...`. For unread count use `?count_only=true`. Mark as read via `/api/messages/notifications/[notificationId]/read`. | `/api/messages/notifications`, `/api/messages/notifications/[notificationId]/read` |

### 4.5 Messaging

| Component | Pointers | API endpoints |
| --- | --- | --- |
| Conversation list | Client component fetches `GET /api/messages/conversations?limit=20`. Use `useEffect` polling or Realtime to update `unread_count`. Provide "New chat" FAB that `POST /api/messages/conversations` with `target_user_id`. | `/api/messages/conversations` |
| Chat view | 1) load history `GET /api/messages/conversations/[conversationId]/messages?limit=50&offset=...`. 2) Use `useRealtimeMessages(conversationId)` to push new messages into local state. 3) Send messages via `POST /api/messages/conversations/[conversationId]/messages`. 4) When view mounts or user scrolls to bottom, call `POST /api/messages/conversations/[conversationId]/read`. | `/api/messages/conversations/[conversationId]/messages`, `/api/messages/conversations/[conversationId]/read` |
| Recall | Provide context-menu action calling `POST /api/messages/recall/[messageId]` if within allowed window. |

---

## 5. File Upload Guidelines

| Type | Endpoint | Notes |
| --- | --- | --- |
| Work media | `/api/upload/media` (multipart fields: `file`, `type=image|video`). Images <=10 MB, videos <=100 MB. Server returns `{ success, data: { url, path } }`. | Save `url` to form state before calling `/api/works`. |
| Avatars | `/api/upload/avatar` (field `avatar`). Limit 5 MB. | Response includes new `avatar_url`. |
| Generic COS uploads | `/api/storage/upload` (fields `file`, optional `bucket`, `pathPrefix`). Server enforces 40 MB for video types. Useful for admin tooling or asset builders. |

All uploads must show progress (browser `XMLHttpRequest` or `fetch` + `ReadableStream`). Immediately after upload, display the resulting media in the UI so users can confirm.

---

## 6. Error & Toast Handling

1. Wrap API calls in `try/catch`. When the response is `{ success: false }`, throw `new Error(payload.message ?? payload.error)`.
2. Use `lib/error-handler.ts` or a simple helper:
```ts
import { toast } from 'sonner';

function handleApiError(err: unknown) {
  const message =
    typeof err === 'string'
      ? err
      : err instanceof Error
        ? err.message
        : 'Operation failed, please retry.';
  toast.error(message);
}
```
3. For auth errors (`error === 'UNAUTHORIZED'`), redirect to `/login` and clear state.
4. Display success toasts (`toast.success('Saved')`) after optimistic updates commit.

---

## 7. Performance Checklist

- **Server components**: mark long lists as `async` and pass data to client components instead of fetching again client-side.
- **SWR**: disable `revalidateOnFocus` for heavy feeds, set `dedupingInterval` (5-10 seconds).
- **Virtualized lists**: use `@tanstack/react-virtual` for works grids and chat message panes once length > 50.
- **Media**: always use `next/image` with `sizes` when rendering thumbnails; lazy load video players only when visible.
- **Navigation**: use `<Link prefetch>` for stable routes. Use imperative navigation only when form validation is involved.
- **Placeholder works**: generation flows insert temporary works (status `draft`). While status is pending, overlay cards with "Generating..." text and disable share buttons.

---

## 8. Quick Reference (Feature -> Endpoint)

| Feature | Primary endpoints |
| --- | --- |
| Feed & discovery | `/api/works`, `/api/categories`, `/api/search`, `/api/recommendations` |
| Work detail & stats | `/api/works/[id]`, `/api/social/like`, `/api/social/comments*`, `/api/social/share` |
| Profile edit | `/api/users/profile`, `/api/users/[id]`, `/api/upload/avatar`, `/api/users/tags` |
| Personal works | `/api/users/works`, `/api/works` (POST/PUT/DELETE) |
| AI generation | `/api/generation-features*`, `/api/feature-generate/[id]`, `/api/same-style/generate/[workId]`, `/api/ai/generate`, `/api/runninghub/webhook` |
| Avatars/outfits/assets | `/api/ai/avatars*`, `/api/outfits*`, `/api/assets*` |
| Social graph | `/api/social/follow`, `/api/social/like`, `/api/social/comments*` |
| Notifications | `/api/messages/notifications*` |
| Messaging | `/api/messages/conversations*`, `/api/messages/recall/[messageId]` |
| Uploads | `/api/upload/media`, `/api/upload/avatar`, `/api/storage/upload` |
| Admin (UI) | `/api/admin/**` (requires `x-admin-token`) |

Refer back to `docs/API_DESIGN.md` for request/response schemas and auth flags. This document focuses on how the frontend should orchestrate those endpoints for a consistent user experience.

---

**Maintainer**: FE/BE platform team  
**Last updated**: 2025-12-07

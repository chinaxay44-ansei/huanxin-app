"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Heart, ImageIcon, Smile, X, MessageCircle } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CommentUser = {
  id: string
  nickname: string
  avatar_url?: string
}

type CommentItem = {
  id: string
  work_id: string
  content: string
  created_at: string
  likes_count: number
  replies_count: number
  is_liked?: boolean
  parent_id: string | null
  root_id: string
  user: CommentUser
  reply_to_user?: CommentUser
  replies?: CommentItem[]
}

interface CommentsSheetProps {
  isOpen: boolean
  onClose: () => void
  workId: string
  initialCount?: number
  onCountChange?: (count: number | ((prev: number) => number)) => void
  containerClassName?: string
}

const LIMIT = 20

export function CommentsSheet({ isOpen, onClose, workId, initialCount = 0, onCountChange, containerClassName }: CommentsSheetProps) {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [sort, setSort] = useState<"hot" | "latest">("hot")
  const [comments, setComments] = useState<CommentItem[]>([])
  const [total, setTotal] = useState<number>(initialCount)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [commentText, setCommentText] = useState("")
  const [replyTarget, setReplyTarget] = useState<{ id: string; nickname: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [replyLoadingId, setReplyLoadingId] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const touchStartYRef = useRef<number | null>(null)

  const normalizedTotal = useMemo(() => (typeof total === "number" ? total : 0), [total])

  const formatTime = (value?: string) => {
    if (!value) return ""
    const date = new Date(value)
    const diff = Date.now() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    if (minutes < 1) return "刚刚"
    if (minutes < 60) return `${minutes} 分钟前`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} 小时前`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days} 天前`
    return date.toLocaleDateString()
  }

  const normalizeComment = (raw: any, includeReplies = true): CommentItem => ({
    id: raw.id,
    work_id: raw.work_id,
    content: raw.content || "",
    created_at: raw.created_at,
    likes_count: raw.likes_count || 0,
    replies_count: raw.replies_count || 0,
    is_liked: !!raw.is_liked,
    parent_id: raw.parent_id || null,
    root_id: raw.root_id || raw.id,
    user: {
      id: raw.user?.id || raw.user_id,
      nickname: raw.user?.nickname || "用户",
      avatar_url: raw.user?.avatar_url || "/placeholder.svg"
    },
    reply_to_user: raw.reply_to_user
      ? {
          id: raw.reply_to_user.id,
          nickname: raw.reply_to_user.nickname || "用户",
          avatar_url: raw.reply_to_user.avatar_url || "/placeholder.svg"
        }
      : raw.reply_to_user_id
        ? {
            id: raw.reply_to_user_id,
            nickname: raw.reply_to_user_nickname || "用户",
            avatar_url: raw.reply_to_user_avatar_url || "/placeholder.svg"
          }
        : undefined,
    replies:
      includeReplies && Array.isArray(raw.replies_preview || raw.replies)
        ? (raw.replies_preview || raw.replies || []).map((r: any) => normalizeComment(r, false))
        : raw.replies || []
  })

  const fetchComments = async (reset = false) => {
    if (!isOpen || !workId) return
    if (loading || loadingMore) return
    if (!reset && !hasMore) return

    reset ? setLoading(true) : setLoadingMore(true)
    setErrorText(null)
    try {
      const nextOffset = reset ? 0 : offset
      const res = await fetch(`/api/social/comments?work_id=${workId}&limit=${LIMIT}&offset=${nextOffset}&sort=${sort}`)
      const json = await res.json()
      if (res.ok && json.success) {
        const list = Array.isArray(json.data?.comments) ? json.data.comments.map((c: any) => normalizeComment(c)) : []
        setComments(prev => (reset ? list : [...prev, ...list]))
        setOffset(nextOffset + list.length)
        const count = json.data?.total ?? normalizedTotal
        setTotal(count)
        setHasMore(list.length === LIMIT && (nextOffset + list.length) < (json.data?.total ?? count))
      } else {
        if (reset) setComments([])
        setErrorText(json?.message || "评论加载失败")
      }
    } catch (error) {
      console.error("加载评论失败:", error)
      if (reset) setComments([])
      setErrorText("评论加载失败，请稍后重试")
    } finally {
      reset ? setLoading(false) : setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchComments(true)
    }
  }, [isOpen, sort, workId])

  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 120)
    return () => clearTimeout(timer)
  }, [isOpen, replyTarget])

  const loadReplies = async (commentId: string) => {
    const target = comments.find(c => c.id === commentId)
    const fetched = target?.replies?.length || 0
    if (target && fetched >= (target.replies_count || 0)) return
    setReplyLoadingId(commentId)
    try {
      const res = await fetch(`/api/social/comments/${commentId}/replies?limit=${LIMIT}&offset=${fetched}`)
      const json = await res.json()
      if (res.ok && json.success) {
        const replies = (json.data?.replies || []).map((r: any) => normalizeComment(r))
        setComments(prev =>
          prev.map(c => {
            if (c.id !== commentId) return c
            const existing = c.replies || []
            const merged = [...existing, ...replies]
            return { ...c, replies: merged }
          })
        )
      }
    } catch (error) {
      console.error("加载回复失败:", error)
    } finally {
      setReplyLoadingId(null)
    }
  }

  const toggleLike = async (commentId: string) => {
    if (!isAuthenticated || !user?.id) {
      router.push("/login")
      return
    }
    const findAndUpdate = (list: CommentItem[]) =>
      list.map(item => {
        if (item.id === commentId) {
          const nextLiked = !item.is_liked
          return {
            ...item,
            is_liked: nextLiked,
            likes_count: nextLiked ? item.likes_count + 1 : Math.max(0, item.likes_count - 1)
          }
        }
        if (item.replies?.length) {
          return { ...item, replies: findAndUpdate(item.replies) }
        }
        return item
      })

    setComments(prev => findAndUpdate(prev))

    try {
      const liked = comments.some(c => c.id === commentId && c.is_liked) || comments.some(c => c.replies?.some(r => r.id === commentId && r.is_liked))
      const res = await fetch("/api/social/comments/like", {
        method: liked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: commentId })
      })
      const json = await res.json()
      if (res.ok && json.success) {
        const updatedCount = json.data?.likes_count
        if (typeof updatedCount === "number") {
          setComments(prev =>
            prev.map(item => {
              if (item.id === commentId) return { ...item, likes_count: updatedCount, is_liked: !liked }
              if (item.replies?.length) {
                return {
                  ...item,
                  replies: item.replies.map(r => (r.id === commentId ? { ...r, likes_count: updatedCount, is_liked: !liked } : r))
                }
              }
              return item
            })
          )
        }
      } else {
        setComments(prev => findAndUpdate(prev))
      }
    } catch (error) {
      console.error("切换点赞失败:", error)
      setComments(prev => findAndUpdate(prev))
    }
  }

  const handleSubmit = async () => {
    const content = commentText.trim()
    if (!content || !workId) return
    if (!isAuthenticated || !user?.id) {
      router.push("/login")
      return
    }
    
    // 字数限制检查
    if (content.length > 500) {
      setErrorText("评论内容不能超过500个字符")
      return
    }
    
    setSubmitting(true)
    setErrorText(null)
    try {
      const res = await fetch("/api/social/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work_id: workId, content, parent_id: replyTarget?.id })
      })
      const json = await res.json()
      if (res.ok && json.success && json.data) {
        const newComment = normalizeComment(json.data)
        setCommentText("")
        setReplyTarget(null)
        if (replyTarget) {
          setComments(prev =>
            prev.map(c => {
              if (c.id !== replyTarget.id) return c
              const existingReplies = c.replies || []
              const updatedReplies = [newComment, ...existingReplies]
              return { ...c, replies: updatedReplies, replies_count: (c.replies_count || 0) + 1 }
            })
          )
        } else {
          setComments(prev => [newComment, ...prev])
        }
        setTotal(prev => prev + 1)
        if (onCountChange) onCountChange((prev: any) => (typeof prev === "number" ? prev + 1 : normalizedTotal + 1))
      } else {
        setErrorText(json?.message || "评论发送失败，请重试")
      }
    } catch (error) {
      console.error("发布评论失败:", error)
      setErrorText("网络错误，请检查您的连接")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSheetTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null
    // 阻止所有事件传播
    event.stopPropagation()
  }

  const handleSheetTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    // 始终阻止事件传播
    event.stopPropagation()
    
    const startY = touchStartYRef.current
    const scrollEl = scrollAreaRef.current
    if (startY === null || !scrollEl) return
    
    const currentY = event.touches[0]?.clientY ?? startY
    const deltaY = currentY - startY
    const atTop = scrollEl.scrollTop <= 0
    const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 1
    
    // 在顶部下拉或底部上推时，阻止默认行为（避免触发外层滑动）
    if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
      event.preventDefault()
    }
  }

  const handleSheetTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = null
    // 阻止所有事件传播
    event.stopPropagation()
  }

  const handleSheetWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  const handleSheetPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  if (!isOpen) return null

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 z-[999] animate-in fade-in duration-200" 
        onClick={onClose}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => { e.stopPropagation(); e.preventDefault() }}
        onTouchEnd={(e) => e.stopPropagation()}
      />

      <div
        className={cn(
          "fixed bottom-0 left-1/2 -translate-x-1/2 z-[1000] bg-white rounded-t-3xl h-[50vh] max-h-[50vh] min-h-[50vh] flex flex-col w-full max-w-[520px] md:max-w-[640px] shadow-xl animate-in slide-in-from-bottom duration-300 overflow-hidden",
          containerClassName,
        )}
        onPointerDown={handleSheetPointerDown}
        onTouchStart={handleSheetTouchStart}
        onTouchMove={handleSheetTouchMove}
        onTouchEnd={handleSheetTouchEnd}
        onTouchCancel={handleSheetTouchEnd}
        onWheel={handleSheetWheel}
        style={{ touchAction: 'none' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-base">评论</span>
            <span className="text-xs text-muted-foreground">共{normalizedTotal} 条</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button
              className={cn("px-2 py-1 rounded-full", sort === "hot" ? "bg-muted text-foreground" : "text-muted-foreground")}
              onClick={() => { setSort("hot"); setOffset(0); setHasMore(true) }}
            >
              热门
            </button>
            <button
              className={cn("px-2 py-1 rounded-full", sort === "latest" ? "bg-muted text-foreground" : "text-muted-foreground")}
              onClick={() => { setSort("latest"); setOffset(0); setHasMore(true) }}
            >
              最新
            </button>
          </div>
          <button onClick={onClose} aria-label="关闭">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 顶部输入区，避免被底部遮挡 */}
        <div className="px-4 pt-3 pb-2 border-b bg-white sticky top-0 z-10 space-y-2">
          {replyTarget && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>回复 @{replyTarget.nickname}</span>
              <button className="text-foreground" onClick={() => setReplyTarget(null)}>取消</button>
            </div>
          )}
          {errorText && (
            <div className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
              <span className="flex-1">{errorText}</span>
              <button onClick={() => setErrorText(null)} className="text-red-600">×</button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button className="text-muted-foreground hover:text-foreground transition-colors" title="添加图片（暂未开放）">
              <ImageIcon className="w-5 h-5" />
            </button>
            <button className="text-muted-foreground hover:text-foreground transition-colors" title="添加表情（暂未开放）">
              <Smile className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  replyTarget
                    ? `回复 @${replyTarget.nickname}...`
                    : isAuthenticated
                      ? "留下你的想法..."
                      : "登录后发表评论"
                }
                className="rounded-full bg-muted border-0 pr-12"
                maxLength={500}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                onFocus={() => {
                  if (!isAuthenticated) router.push("/login")
                }}
              />
              {commentText && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {commentText.length}/500
                </span>
              )}
            </div>
            <Button 
              onClick={handleSubmit} 
              disabled={!commentText.trim() || submitting || commentText.length > 500} 
              className="px-4 rounded-full"
            >
              {submitting ? <Spinner className="size-4" /> : "发送"}
            </Button>
          </div>
        </div>

        <div ref={scrollAreaRef} className="flex-1 min-h-0 max-h-full overflow-y-auto px-4 pt-4 pb-16 space-y-5" style={{ touchAction: 'pan-y' }}>
          {loading && (
            <div className="text-center py-10">
              <Spinner className="size-8 mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">加载中...</p>
            </div>
          )}
          {!loading && errorText && !comments.length && (
            <div className="text-center text-muted-foreground py-6 text-sm">
              <p>{errorText}</p>
              <Button variant="ghost" size="sm" onClick={() => fetchComments(true)} className="mt-3">
                重新加载
              </Button>
            </div>
          )}
          {!loading && comments.length === 0 && !errorText && (
            <div className="text-center text-muted-foreground py-10 space-y-2">
              <MessageCircle className="w-12 h-12 mx-auto opacity-30" />
              <p className="text-sm">还没有评论，来聊聊吧~</p>
            </div>
          )}
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-3">
              <button onClick={() => router.push(`/user/${comment.user.id}`)}>
                <img src={comment.user.avatar_url || "/placeholder.svg"} alt={comment.user.nickname} className="w-10 h-10 rounded-full object-cover" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{comment.user.nickname}</span>
                  <span className="text-xs text-muted-foreground">{formatTime(comment.created_at)}</span>
                </div>
                <p className="text-sm mb-2 whitespace-pre-wrap break-words">
                  {comment.reply_to_user ? <span className="text-muted-foreground mr-1">@{comment.reply_to_user.nickname} </span> : null}
                  {comment.content}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <button className="hover:text-foreground" onClick={() => { setReplyTarget({ id: comment.id, nickname: comment.user.nickname }) }}>
                    回复
                  </button>
                  {comment.replies_count > 0 && (
                    <button
                      className="hover:text-foreground inline-flex items-center gap-1"
                      onClick={() => loadReplies(comment.id)}
                    >
                      <MessageCircle className="w-3 h-3" />
                      查看回复 ({comment.replies_count})
                      {replyLoadingId === comment.id && <Spinner className="size-3" />}
                    </button>
                  )}
                </div>
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 space-y-3 border-l pl-3">
                    {comment.replies.map(reply => (
                      <div key={reply.id} className="flex gap-2">
                        <img src={reply.user.avatar_url || "/placeholder.svg"} className="w-8 h-8 rounded-full object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{reply.user.nickname}</span>
                            <span className="text-[11px] text-muted-foreground">{formatTime(reply.created_at)}</span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {reply.reply_to_user ? <span className="text-muted-foreground mr-1">@{reply.reply_to_user.nickname} </span> : null}
                            {reply.content}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <button className="hover:text-foreground" onClick={() => setReplyTarget({ id: comment.id, nickname: reply.user.nickname })}>
                              回复
                            </button>
                          </div>
                        </div>
                        <button onClick={() => toggleLike(reply.id)} className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Heart className={cn("w-4 h-4", reply.is_liked ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                          <span className="text-[11px]">{reply.likes_count}</span>
                        </button>
                      </div>
                    ))}
                    {comment.replies_count > (comment.replies?.length || 0) && (
                      <button
                        className="text-xs text-foreground hover:underline inline-flex items-center gap-1"
                        onClick={() => loadReplies(comment.id)}
                        disabled={replyLoadingId === comment.id}
                      >
                        {replyLoadingId === comment.id && <Spinner className="size-3" />}
                        展开更多回复
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button onClick={() => toggleLike(comment.id)} className="flex flex-col items-center gap-1">
                <Heart className={cn("w-5 h-5", comment.is_liked ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                <span className="text-xs text-muted-foreground">{comment.likes_count}</span>
              </button>
            </div>
          ))}

          {hasMore && !loading && (
            <div className="flex justify-center pt-2">
              <Button variant="ghost" size="sm" onClick={() => fetchComments(false)} disabled={loadingMore}>
                {loadingMore && <Spinner className="size-4 mr-2" />}
                加载更多
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

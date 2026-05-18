"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { X, Heart, MessageCircle, Share2, Sparkles, Play, Plus, Copy, MoreHorizontal, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CommentsSheet } from "./comments-sheet"
import { toast } from "sonner"
import type { WorkWithUser } from "@/lib/api/client-works"
import { likeWork as likeWorkAPI, checkLikeStatus as checkLikeStatusAPI, unlikeWork as unlikeWorkAPI } from "@/lib/api/client-interactions"
import { useAuth } from "@/lib/auth"
import { checkFollowStatus, followUser, unfollowUser } from "@/lib/api/client-users"
import { authFetch } from "@/lib/client-auth-fetch"

interface MediaViewerOverlayProps {
  items: WorkWithUser[]
  initialIndex: number
  onClose: () => void
  onLoadMore?: () => Promise<void>
}

export default function MediaViewerOverlay({ items, initialIndex, onClose, onLoadMore }: MediaViewerOverlayProps) {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const [index, setIndex] = useState(initialIndex || 0)
  const current = items[index]
  const mediaType = useMemo(() => {
    const t: any = current?.media_type ?? (current as any)?.type
    const url = (current?.media_url || (current as any)?.mediaUrl || '' || '').toLowerCase()
    const isVideoHint = t === 'video' || url.includes('/video') || url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') || url.includes('.m4v')
    return isVideoHint ? 'video' : 'image'
  }, [current])
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPaused, setIsPaused] = useState(false)
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null)
  const suppressClickRef = useRef(false)
  
  // 平滑滑动状态
  const [touchStartY, setTouchStartY] = useState<number | null>(null)
  const [touchCurrentY, setTouchCurrentY] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const initialOffset = typeof window !== 'undefined' ? -(initialIndex || 0) * window.innerHeight : 0
  const [translateY, setTranslateY] = useState(initialOffset)
  const [enableAnimation, setEnableAnimation] = useState(false)
  const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const withProxy = (url?: string | null) => {
    if (!url) return '/placeholder.svg'
    const prefix = `${SUPA_URL}/storage/v1/object/public/`
    return SUPA_URL && url.startsWith(prefix) ? `/api/media/proxy?u=${encodeURIComponent(url)}` : url
  }

  const [isLiked, setIsLiked] = useState(false)
  const [loadingLike, setLoadingLike] = useState(false)
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showHeartEffect, setShowHeartEffect] = useState(false)
  
  useEffect(() => {
    setEnableAnimation(true)
  }, [])

  // 切换作品时重置 translateY
  useEffect(() => {
    setTranslateY(-index * window.innerHeight)
  }, [index])
  
  // 关闭覆盖层：Esc快捷键、上下键切换
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown' && index < items.length - 1) setIndex(i => i + 1)
      if (e.key === 'ArrowUp' && index > 0) setIndex(i => i - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, items.length, onClose])

  // 滚轮上下切换
  useEffect(() => {
    if (showComments) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const threshold = 50
      if (e.deltaY > threshold && index < items.length - 1) setIndex(i => i + 1)
      else if (e.deltaY < -threshold && index > 0) setIndex(i => i - 1)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [index, items.length, showComments])

  // 触发无限加载：靠近末尾时调用父级加载更多
  useEffect(() => {
    const threshold = Math.max(0, items.length - 3)
    if (index >= threshold && onLoadMore) {
      onLoadMore().catch(() => {})
    }
  }, [index, items.length, onLoadMore])

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1 || showComments) return
    const touch = event.touches[0]
    setTouchStartY(touch.clientY)
    setTouchCurrentY(touch.clientY)
    setIsDragging(true)
  }

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || touchStartY === null || showComments) return
    event.preventDefault()
    const touch = event.touches[0]
    setTouchCurrentY(touch.clientY)
    
    const deltaY = touch.clientY - touchStartY
    const baseTranslate = -index * window.innerHeight
    
    // 添加阻尼效果
    const damping = 0.5
    if (index === 0 && deltaY > 0) {
      // 第一个作品，向下滑动添加阻尼
      setTranslateY(baseTranslate + deltaY * damping)
    } else if (index === items.length - 1 && deltaY < 0) {
      // 最后一个作品，向上滑动添加阻尼
      setTranslateY(baseTranslate + deltaY * damping)
    } else {
      setTranslateY(baseTranslate + deltaY)
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging || touchStartY === null || touchCurrentY === null || showComments) {
      setIsDragging(false)
      setTouchStartY(null)
      setTouchCurrentY(null)
      return
    }
    
    const deltaY = touchCurrentY - touchStartY
    const threshold = Math.max(30, window.innerHeight * 0.08) // 8% 屏幕高度，最低 30px
    
    let newIndex = index
    
    if (deltaY < -threshold && index < items.length - 1) {
      // 向上滑动，切换到下一个
      newIndex = index + 1
    } else if (deltaY > threshold && index > 0) {
      // 向下滑动，切换到上一个
      newIndex = index - 1
    }
    
    // 如果索引没变，说明未达到阈值，需要回弹到当前位置
    if (newIndex === index) {
      setTranslateY(-index * window.innerHeight)
    } else {
      setIndex(newIndex)
    }
    
    setIsDragging(false)
    setTouchStartY(null)
    setTouchCurrentY(null)
  }

  const handleTouchCancel = () => {
    setIsDragging(false)
    setTouchStartY(null)
    setTouchCurrentY(null)
  }

  // 点赞状态（未登录时忽略错误）
  useEffect(() => {
    let active = true
    const check = async () => {
      if (!current?.id || !isAuthenticated || !user?.id) return
      try {
        const { isLiked, error } = await checkLikeStatusAPI(user.id, current.id)
        if (!active) return
        if (!error) setIsLiked(!!isLiked)
      } catch (_) {}
    }
    check()
    return () => { active = false }
  }, [current?.id, isAuthenticated, user?.id])

  // 关注状态
  useEffect(() => {
    const checkFollow = async () => {
      if (!current?.user?.id || !isAuthenticated || !user?.id) {
        setIsFollowingAuthor(false)
        return
      }
      try {
        const { isFollowing } = await checkFollowStatus(user.id, current.user.id)
        setIsFollowingAuthor(!!isFollowing)
      } catch (_) {
        setIsFollowingAuthor(false)
      }
    }
    checkFollow()
  }, [current?.user?.id, isAuthenticated, user?.id])

  const toggleLike = async (): Promise<boolean | undefined> => {
    if (!current?.id || loadingLike || !isAuthenticated || !user?.id) return isLiked
    setLoadingLike(true)
    try {
      if (isLiked) {
        const { error, likes_count } = await unlikeWorkAPI(user.id, current.id)
        if (!error) {
          setIsLiked(false)
          const prev = (current as any)?.likes_count || 0
          ;(current as any).likes_count = typeof likes_count === 'number' ? likes_count : Math.max(0, prev - 1)
          return false
        }
      } else {
        const { error, likes_count } = await likeWorkAPI(user.id, current.id)
        if (!error) {
          setIsLiked(true)
          const prev = (current as any)?.likes_count || 0
          ;(current as any).likes_count = typeof likes_count === 'number' ? likes_count : prev + 1
          return true
        }
      }
    } finally {
      setLoadingLike(false)
    }
    return isLiked
  }

  const handleFollowToggle = async () => {
    if (!current?.user?.id || !isAuthenticated || !user?.id || followLoading) return
    setFollowLoading(true)
    try {
      if (isFollowingAuthor) {
        const { success } = await unfollowUser(user.id, current.user.id)
        if (success) setIsFollowingAuthor(false)
      } else {
        const { success } = await followUser(user.id, current.user.id)
        if (success) setIsFollowingAuthor(true)
      }
    } catch (_) {
    } finally {
      setFollowLoading(false)
    }
  } 

  const isSelf = !!user?.id && ((current as any)?.user?.id ?? (current as any)?.user_id) === user.id
  const isPrivate = (current as any)?.visibility === 'private'
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)

  const handlePublish = async () => {
    if (!isSelf || !current?.id) return
    router.push(`/works/${current.id}/publish`)
  }

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.classList.add('viewer-open')
    return () => {
      document.body.style.overflow = prev
      document.body.classList.remove('viewer-open')
    }
  }, [])

  const togglePlayPause = () => {
    if (mediaType !== 'video') {
      setIsPaused(p => !p)
      return
    }
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
      setIsPaused(false)
    } else {
      v.pause()
      setIsPaused(true)
    }
  }

  const handleSingleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
      handleDoubleClick()
      return
    }
    clickTimerRef.current = setTimeout(() => {
      togglePlayPause()
      clickTimerRef.current = null
    }, 250)
  }

  const handleDoubleClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }
    toggleLike()
      .then((likedState) => {
        if (likedState) {
          setShowHeartEffect(true)
          setTimeout(() => setShowHeartEffect(false), 700)
        }
      })
      .catch(() => {})
  }

  const videoDoubleTapHandlerRef = useRef(handleDoubleClick)
  useEffect(() => {
    videoDoubleTapHandlerRef.current = handleDoubleClick
  }, [handleDoubleClick])

  useEffect(() => {
    if (mediaType !== 'video') return
    const videoElement = videoRef.current
    if (!videoElement) return

    let lastTapTime = 0
    const handleVideoDoubleClick = (event: MouseEvent) => {
      event.preventDefault()
      videoDoubleTapHandlerRef.current()
    }
    const handleVideoTouchEnd = (event: TouchEvent) => {
      const now = Date.now()
      if (now - lastTapTime < 300) {
        event.preventDefault()
        videoDoubleTapHandlerRef.current()
      }
      lastTapTime = now
    }

    // 自动播放并尝试带声播放，若被阻止提示用户点击播放
    try {
      videoElement.muted = false
      const playPromise = videoElement.play()
      if (playPromise?.catch) playPromise.catch(() => {
        toast.warning('自动播放被阻止，请点击播放并检查音量')
      })
    } catch {
      // ignore
    }

    videoElement.addEventListener('dblclick', handleVideoDoubleClick)
    videoElement.addEventListener('touchend', handleVideoTouchEnd, { passive: false })

    return () => {
      videoElement.removeEventListener('dblclick', handleVideoDoubleClick)
      videoElement.removeEventListener('touchend', handleVideoTouchEnd)
    }
  }, [mediaType, current?.id])

  if (!current) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black overflow-hidden scrollbar-hide"
      style={{ overscrollBehavior: 'contain', touchAction: 'none' }}
    >
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <button onClick={onClose} aria-label="返回" className="text-white">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/search')} aria-label="搜索" className="text-white">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </button>
          {isSelf && (
            <button onClick={() => current?.id && router.push(`/works/${current.id}/publish`)} className="px-3 py-1 rounded-full bg-brand text-brand-foreground text-xs">发布管理</button>
          )}
        </div>
      </div>

      {/* 作品流容器 */}
      <div 
        className="absolute inset-0"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isDragging || !enableAnimation ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          willChange: 'transform'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        {items.map((item, idx) => {
          const isActive = idx === index
          const shouldRender = Math.abs(idx - index) <= 1 // 只渲染当前、上一个、下一个
          
          // 判断媒体类型（直接计算）
          const t: any = item?.media_type ?? (item as any)?.type
          const url = (item?.media_url || (item as any)?.mediaUrl || '' || '').toLowerCase()
          const itemMediaType = t === 'video' || url.includes('/video') || url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') || url.includes('.m4v') ? 'video' : 'image'
          
          return (
            <div
              key={item.id}
              className="absolute inset-0 w-full h-screen"
              style={{
                transform: `translateY(${idx * 100}vh)`,
                display: shouldRender ? 'block' : 'none', // 使用 display 控制渲染
              }}
            >
              {/* 媒体内容 - 始终渲染，用 display 控制 */}
              <div className="absolute inset-0">
                {itemMediaType === 'video' ? (
                  <div className="relative w-full h-full bg-black overflow-hidden">
                    <video
                      src={withProxy(item.media_url)}
                      poster={withProxy(item.thumbnail_url) || '/视频封面.jpg'}
                      className="absolute inset-0 w-full h-full object-contain"
                      playsInline
                      autoPlay={isActive}
                      muted={!isActive}
                      preload={isActive ? 'auto' : 'metadata'}
                      controls
                      ref={isActive ? videoRef : null}
                    />
                  </div>
                ) : (
                  <div className="relative w-full h-full bg-black overflow-hidden">
                    <img
                      src={withProxy(item.thumbnail_url || item.media_url)}
                      alt={item.title || ''}
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  </div>
                )}
                
                {/* 点击交互层 - 只在当前作品显示 */}
                <div
                  className="absolute inset-0 cursor-pointer z-10"
                  onClick={handleSingleClick}
                  aria-label={isPaused ? '播放' : '暂停'}
                  style={{ display: isActive ? 'block' : 'none' }}
                >
                  <div 
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ display: isPaused ? 'flex' : 'none' }}
                  >
                    <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div 
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{ display: showHeartEffect ? 'flex' : 'none' }}
                  >
                    <Heart className="w-24 h-24 text-red-500 fill-red-500 animate-ping" />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* UI层 - 固定在视口 */}
      {current && (
        <>
          {/* 左下角 - 用户名和标题 */}
          <div className="fixed left-4 right-24 bottom-20 z-20 text-white pointer-events-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-base">@{current.user?.nickname}</span>
            </div>
            <p className="text-base font-medium mb-1">{current.title || '作品'}</p>
          </div>

          {/* 右下角 - 操作按钮组 */}
          <div className="fixed right-4 bottom-20 z-20 flex flex-col items-center gap-5 pointer-events-auto">
            <div className="relative">
              <button onClick={() => current?.user?.id && router.push(`/user/${current.user.id}`)}>
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white">
                  <img
                    src={current.user?.avatar_url || "/placeholder.svg"}
                    alt={current.user?.nickname || ''}
                    className="w-full h-full object-cover"
                  />
                </div>
              </button>
              {!isSelf && (
                <button onClick={handleFollowToggle} className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center ${isFollowingAuthor ? 'bg-gray-500' : 'bg-brand'}`} disabled={followLoading}>
                  <Plus className={`w-4 h-4 ${isFollowingAuthor ? 'text-white' : 'text-brand-foreground'}`} />
                </button>
              )}
            </div>

            <button onClick={toggleLike} className="flex flex-col items-center gap-1">
              <Heart className={`w-9 h-9 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
              <span className="text-white text-xs font-medium">{(current as any)?.likes_count || 0}</span>
            </button>

            <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
              <MessageCircle className="w-9 h-9 text-white" />
              <span className="text-white text-xs font-medium">{(current as any)?.comments_count || 0}</span>
            </button>

            <button onClick={async () => {
              try {
                await fetch('/api/social/share', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ work_id: current.id, platform: 'app' })
                })
                toast.success('已分享')
              } catch (_) {
                toast.error('分享失败')
              }
            }} className="flex flex-col items-center gap-1">
              <Share2 className="w-9 h-9 text-white" />
              <span className="text-white text-xs font-medium">{(current as any)?.shares_count || 0}</span>
            </button>

            <button onClick={() => current?.id && router.push(`/generate/same-style/${current.id}`)} className="flex flex-col items-center gap-1">
              <Copy className="w-9 h-9 text-white" />
              <span className="text-white text-xs font-medium">同款</span>
            </button>

            <button onClick={() => setShowMore(true)} className="flex flex-col items-center gap-1">
              <MoreHorizontal className="w-9 h-9 text-white" />
              <span className="text-white text-xs font-medium">更多</span>
            </button>
          </div>
        </>
      )}

      {current && (
        <CommentsSheet
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          workId={current.id}
          initialCount={(current as any)?.comments_count || 0}
          onCountChange={(next: any) => {
            if (typeof next === 'number') {
              (current as any).comments_count = next
            } else if (typeof next === 'function') {
              (current as any).comments_count = next((current as any).comments_count || 0)
            }
          }}
        />
      )}

      <Sheet open={showMore} onOpenChange={setShowMore}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>更多操作</SheetTitle>
          </SheetHeader>
          <div className="p-4 grid grid-cols-3 gap-4 text-sm mx-auto w-full max-w-[480px] md:max-w-[540px]">
            <button onClick={() => { const a = document.createElement('a'); a.href = current.media_url; a.download = current.title || '作品'; a.click(); setShowMore(false) }} className="px-3 py-2 bg-muted rounded">下载</button>
            <button onClick={() => { setShowDetails(true); setShowMore(false) }} className="px-3 py-2 bg-muted rounded">详细信息</button>
            <button onClick={() => { toast.success('感谢支持'); setShowMore(false) }} className="px-3 py-2 bg-muted rounded">赞赏</button>
            <button onClick={() => { setShowMore(false); setShowComments(true) }} className="px-3 py-2 bg-muted rounded">反馈</button>
            {isSelf && (
              <button
                onClick={async () => {
                  const ok = typeof window !== 'undefined' ? window.confirm('确定删除该作品？') : true
                  if (!ok) return
                  try {
                    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
                    const res = await fetch(`/api/works/${current.id}`, {
                      method: 'DELETE',
                      headers: {
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      credentials: 'include',
                    })
                    const json = await res.json().catch(() => null)
                    if (res.ok && json?.success) {
                      toast.success('已删除')
                      setShowMore(false)
                      onClose()
                      try { if (typeof window !== 'undefined') window.location.reload() } catch {}
                    } else {
                      toast.error(json?.message || '删除失败')
                    }
                  } catch {
                    toast.error('删除失败')
                  }
                }}
                className="px-3 py-2 bg-red-600 text-white rounded"
              >
                删除
              </button>
            )}
            {isSelf && isPrivate && (
              <button onClick={async () => {
                try {
                  const detail = await fetch(`/api/works/${current.id}`).then(r => r.json())
                  const cfg = detail?.data?.generation_params?.request_json || null
                  const nodeInfoList = Array.isArray(cfg?.nodeInfoList) ? cfg.nodeInfoList : []
                  const TOKENS = { IMAGE_UPLOAD: '__IMAGE_UPLOAD__', OUTFIT_IMAGE: '__OUTFIT_IMAGE__', VIDEO_UPLOAD: '__VIDEO_UPLOAD__', PROMPT_TEXT: '__PROMPT_TEXT__', CUSTOM_VALUE: '__CUSTOM_VALUE__', FILE_UPLOAD: '__FILE_UPLOAD__', AVATAR_IMAGE: '__AVATAR_IMAGE__', ASSET_IMAGE: '__ASSET_IMAGE__', WORK_IMAGE: '__WORK_IMAGE__' }
                  const resolvedValues = nodeInfoList.map((n: any) => {
                    const raw = String(n.fieldValue || '')
                    if ([TOKENS.IMAGE_UPLOAD, TOKENS.OUTFIT_IMAGE, TOKENS.VIDEO_UPLOAD, TOKENS.FILE_UPLOAD, TOKENS.AVATAR_IMAGE, TOKENS.ASSET_IMAGE, TOKENS.WORK_IMAGE].includes(raw)) return n.defaultValue || ''
                    return ''
                  })
                  const promptText = nodeInfoList.find((n: any) => String(n.fieldValue || '') === TOKENS.PROMPT_TEXT)?.defaultValue || ''
                  await authFetch(`/api/same-style/generate/${current.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolvedValues, promptText }) })
                  toast.success('已提交重新生成')
                  setShowMore(false)
                } catch { toast.error('重新生成失败') }
              }} className="px-3 py-2 bg-brand text-brand-foreground rounded">重新生成</button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>作品详情</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div>作者：{current.user?.nickname}</div>
            <div>作品ID：{current.id}</div>
            <div>标题：{current.title || '未命名'}</div>
            <div>类型：{mediaType}</div>
            <div>创建时间：{current.created_at}</div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

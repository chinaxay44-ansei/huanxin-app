"use client"

import { useEffect, useState, useRef } from "react"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ChevronLeft, Share2, Settings, MapPin, ChevronRight, Heart, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import MediaViewerOverlay from "@/components/media-viewer-overlay"
import { AuthGuard } from "@/components/auth-guard"
import { EditProfileModal } from "@/components/edit-profile-modal"
import { useUserProfile, useUserStats, useUserPersonalTags } from "@/lib/hooks/useUserProfile"
import { useAuth } from "@/lib/auth"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import { getUserLikedWorks } from "@/lib/api/client-users"
import { useToast } from "@/hooks/use-toast"
import PullToRefresh from "@/components/pull-to-refresh"

const getWorkCover = (work: any) => {
  const mediaType = work?.media_type ?? work?.type
  const thumb = work?.thumbnail_url || ""
  if (mediaType === "video") {
    const isImageThumb = /\.(png|jpe?g|webp|gif|bmp)$/i.test(thumb)
    return isImageThumb ? thumb : "/视频封面.jpg"
  }
  return thumb || work?.media_url || "/placeholder.svg"
}

function ProfileContent() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState("works")
  const [showEditProfile, setShowEditProfile] = useState(false)
  const { getCurrentUserId } = useAuth()
  const currentUserId = getCurrentUserId()
  const { toast } = useToast()
  const [works, setWorks] = useState<any[]>([])
  const [privateWorks, setPrivateWorks] = useState<any[]>([])
  const [likedWorks, setLikedWorks] = useState<any[]>([])
  const [worksHasMore, setWorksHasMore] = useState(true)
  const [worksLoadingMore, setWorksLoadingMore] = useState(false)
  const worksLoadMoreRef = useRef<HTMLDivElement | null>(null)
  const [privateHasMore, setPrivateHasMore] = useState(true)
  const [privateLoadingMore, setPrivateLoadingMore] = useState(false)
  const privateLoadMoreRef = useRef<HTMLDivElement | null>(null)
  const [likedHasMore, setLikedHasMore] = useState(true)
  const [likedLoadingMore, setLikedLoadingMore] = useState(false)
  const likedLoadMoreRef = useRef<HTMLDivElement | null>(null)
  const [likedPage, setLikedPage] = useState(1)
  const [listLoading, setListLoading] = useState(false)
  const [pendingGenerations, setPendingGenerations] = useState<any[]>([])
  const [failedGenerations, setFailedGenerations] = useState<any[]>([])
  const pendingCountRef = useRef(0)
  const pollingRef = useRef(false)
  const pollAbortRef = useRef<AbortController | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [viewerItems, setViewerItems] = useState<any[]>([])

  // 主动探测每条生成记录的最新状态，触发后端刷新（成功会写入works表）
  const probeGenerationsStatus = async (gens: any[], signal?: AbortSignal) => {
    try {
      await Promise.all(
        gens.map((g: any) =>
          fetch(`/api/ai/generations/${g.id}`, signal ? { signal } : undefined)
            .then(r => r.json())
            .catch(() => null)
        )
      )
    } catch (e) {
      // 忽略单条失败，整体继续
    }
  }
  
  const { profile, loading: profileLoading, error: profileError } = useUserProfile(currentUserId)
  const { stats, loading: statsLoading } = useUserStats(currentUserId)
  const { tags, loading: tagsLoading } = useUserPersonalTags(currentUserId)
  const worksLimit = 20

  const splitPending = (gens: any[]) => {
    const now = Date.now()
    const twoHours = 2 * 60 * 60 * 1000
    const active: any[] = []
    const failed: any[] = []
    gens.forEach((g) => {
      const created = g?.created_at ? new Date(g.created_at).getTime() : 0
      if ((g?.status === 'pending' || g?.status === 'processing') && created && now - created > twoHours) {
        failed.push({ ...g, status: 'failed' })
      } else if (g?.status === 'failed') {
        failed.push(g)
      } else if (g?.status === 'pending' || g?.status === 'processing') {
        active.push(g)
      }
    })
    return { active, failed }
  }

  const loadMoreWorks = async () => {
    if (!currentUserId || !worksHasMore || worksLoadingMore) return
    setWorksLoadingMore(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      const offset = works.length
      const res = await fetch(`/api/users/works?userId=${currentUserId}&visibility=public&limit=${worksLimit}&offset=${offset}`, { headers }).then(r => r.json())
      if (res?.success) {
        const next = res.data?.works ?? []
        setWorks((prev) => [...prev, ...next])
        const total = res.data?.total
        const hasMore = typeof total === 'number'
          ? offset + next.length < total
          : next.length === worksLimit
        setWorksHasMore(hasMore)
      }
    } catch (e) {
      console.warn('加载更多作品失败', e)
    } finally {
      setWorksLoadingMore(false)
    }
  }

  const loadMorePrivateWorks = async () => {
    if (!currentUserId || !privateHasMore || privateLoadingMore) return
    setPrivateLoadingMore(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      const offset = privateWorks.length
      const res = await fetch(`/api/users/works?userId=${currentUserId}&visibility=private&limit=${worksLimit}&offset=${offset}`, { headers }).then(r => r.json())
      if (res?.success) {
        const next = res.data?.works ?? []
        setPrivateWorks((prev) => [...prev, ...next])
        const total = res.data?.total
        const hasMore = typeof total === 'number'
          ? offset + next.length < total
          : next.length === worksLimit
        setPrivateHasMore(hasMore)
      }
    } catch (e) {
      console.warn('加载更多私密作品失败', e)
    } finally {
      setPrivateLoadingMore(false)
    }
  }

  const loadMoreLikedWorks = async () => {
    if (!currentUserId || !likedHasMore || likedLoadingMore) return
    setLikedLoadingMore(true)
    try {
      const nextPage = likedPage + 1
      const res = await getUserLikedWorks(currentUserId, nextPage, worksLimit)
      if (!res.error) {
        const next = res.data ?? []
        setLikedWorks((prev) => [...prev, ...next])
        setLikedHasMore(res.hasMore)
        setLikedPage(nextPage)
      }
    } catch (e) {
      console.warn('加载更多点赞作品失败', e)
    } finally {
      setLikedLoadingMore(false)
    }
  }

  useEffect(() => {
    if (activeTab !== 'works') return
    const sentinel = worksLoadMoreRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadMoreWorks()
        }
      })
    }, { root: null, rootMargin: '200px', threshold: 0 })
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [activeTab, worksHasMore, works.length, worksLoadingMore])

  useEffect(() => {
    if (activeTab !== 'private') return
    const sentinel = privateLoadMoreRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadMorePrivateWorks()
        }
      })
    }, { root: null, rootMargin: '200px', threshold: 0 })
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [activeTab, privateHasMore, privateWorks.length, privateLoadingMore])

  useEffect(() => {
    if (activeTab !== 'liked') return
    const sentinel = likedLoadMoreRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadMoreLikedWorks()
        }
      })
    }, { root: null, rootMargin: '200px', threshold: 0 })
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [activeTab, likedHasMore, likedWorks.length, likedLoadingMore])
  
  // 作品数据将从API获取（必须在任何条件返回之前调用，确保 Hooks 顺序稳定）
  useEffect(() => {
    if (!currentUserId) return
    let cancelled = false
    const limit = worksLimit

    const loadLists = async () => {
      try {
        setListLoading(true)
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined
        const [pubRes, priRes, likedRes] = await Promise.all([
          fetch(`/api/users/works?userId=${currentUserId}&visibility=public&limit=${limit}`, { headers }).then(r => r.json()),
          fetch(`/api/users/works?userId=${currentUserId}&visibility=private&limit=${limit}`, { headers }).then(r => r.json()),
          getUserLikedWorks(currentUserId, 1, 20)
        ])
        if (!cancelled) {
          if (pubRes.success) {
            const firstBatch = pubRes.data?.works ?? []
            setWorks(firstBatch)
            const total = pubRes.data?.total
            const hasMore = typeof total === 'number'
              ? firstBatch.length < total
              : firstBatch.length === limit
            setWorksHasMore(hasMore)
          }
          if (priRes.success) {
            const firstBatch = priRes.data?.works ?? []
            setPrivateWorks(firstBatch)
            const total = priRes.data?.total
            const hasMore = typeof total === 'number'
              ? firstBatch.length < total
              : firstBatch.length === limit
            setPrivateHasMore(hasMore)
          }
          if (!likedRes.error) {
            setLikedWorks(likedRes.data ?? [])
            setLikedHasMore(likedRes.hasMore)
            setLikedPage(1)
          }
        }
      } catch (e: any) {
        if (cancelled) return
        console.error('加载作品列表失败', e)
        toast({ title: '加载失败', description: '作品列表加载失败，请稍后重试', variant: 'destructive' })
      } finally {
        if (!cancelled) setListLoading(false)
      }
    }
    loadLists()

    // 初次加载生成中任务（队列）
    const loadGenerations = async () => {
      try {
        const res = await fetch(`/api/ai/generate?limit=50`).then(r => r.json())
        if (!cancelled && res.success && Array.isArray(res.data)) {
          const { active, failed } = splitPending(res.data || [])
          // 先探测并触发后端刷新状态
          await probeGenerationsStatus(active)
          // 再次拉取最新列表，确保已完成的任务被剔除并作品写入
          const after = await fetch(`/api/ai/generate?limit=50`).then(r => r.json())
          if (!cancelled && after.success && Array.isArray(after.data)) {
            const { active: active2, failed: failed2 } = splitPending(after.data || [])
            setPendingGenerations(active2)
            setFailedGenerations(failed2)
            pendingCountRef.current = active2.length
          } else if (!cancelled) {
            setPendingGenerations(active)
            setFailedGenerations(failed)
            pendingCountRef.current = active.length
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('加载生成中任务失败', e)
        }
      }
    }
    loadGenerations()

    return () => {
      cancelled = true
    }
  }, [currentUserId])

  // 轮询生成任务进度，并在完成后刷新私密作品
  useEffect(() => {
    if (!currentUserId) return
    let mounted = true
    const interval = setInterval(async () => {
      if (!mounted) return
      if (pollingRef.current) return
      pollingRef.current = true
      if (pollAbortRef.current) pollAbortRef.current.abort()
      const controller = new AbortController()
      pollAbortRef.current = controller
      try {
        const res = await fetch(`/api/ai/generate?limit=50`, { signal: controller.signal }).then(r => r.json())
        if (res.success && Array.isArray(res.data)) {
          const { active, failed } = splitPending(res.data || [])
          const prevLen = pendingCountRef.current
          // 先探测并触发后端刷新状态
          await probeGenerationsStatus(active, controller.signal)
          // 再次拉取最新列表
          const after = await fetch(`/api/ai/generate?limit=50`, { signal: controller.signal }).then(r => r.json())
          if (after.success && Array.isArray(after.data)) {
            const { active: active2, failed: failed2 } = splitPending(after.data || [])
            setPendingGenerations(active2)
            setFailedGenerations(failed2)
            pendingCountRef.current = active2.length
            // 如果数量减少（有任务完成或失败），刷新私密作品
            if (prevLen > active2.length) {
              try {
                const token2 = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
                const headers2 = token2 ? { Authorization: `Bearer ${token2}` } : undefined
                const priRes = await fetch(`/api/users/works?userId=${currentUserId}&visibility=private&limit=20`, { headers: headers2 }).then(r => r.json())
                if (priRes.success) {
                  const firstBatch = priRes.data?.works ?? []
                  setPrivateWorks(firstBatch)
                  const total = priRes.data?.total
                  const hasMore = typeof total === 'number'
                    ? firstBatch.length < total
                    : firstBatch.length === 20
                  setPrivateHasMore(hasMore)
                }
              } catch (e) {
                console.warn('刷新私密作品失败', e)
              }
            }
          } else {
            setPendingGenerations(active)
            setFailedGenerations(failed)
            pendingCountRef.current = active.length
          }
        }
      } catch (e) {
        // 忽略 AbortError（请求被取消是正常行为）
        if (e instanceof DOMException && e.name === 'AbortError') {
          // 静默忽略，不输出任何日志
          return
        }
        // 其他错误才输出警告
        console.warn('轮询生成任务失败', e)
      } finally {
        pollingRef.current = false
      }
    }, 8000)
    return () => {
      mounted = false
      clearInterval(interval)
      pollingRef.current = false
      if (pollAbortRef.current) pollAbortRef.current.abort()
    }
  }, [currentUserId])

  if (profileLoading || statsLoading || tagsLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Spinner className="size-12 mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (profileError) {
    // 如果是登录相关错误，显示登录提示
    if (profileError === '请先登录') {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center px-6">
            <div className="mb-6">
              <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">登录后查看个人资料</h2>
              <p className="text-gray-600">请先登录您的账号，然后就可以查看和编辑个人资料了</p>
            </div>
            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/login')} 
                className="w-full bg-pink-500 hover:bg-pink-600 text-white"
              >
                立即登录
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/register')} 
                className="w-full"
              >
                注册新账号
              </Button>
            </div>
          </div>
        </div>
      )
    }
    
    // 其他错误显示原有的错误处理
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{profileError}</p>
          <Button onClick={() => window.location.reload()}>重试</Button>
        </div>
      </div>
    )
  }

  const user = profile?.user
  const userProfile = profile?.profile

  // 格式化生日显示
  const formatBirthday = (birthday?: string) => {
    if (!birthday) return null
    const date = new Date(birthday)
    const age = new Date().getFullYear() - date.getFullYear()
    return `${age}岁`
  }

  // 格式化注册时间
  const formatJoinDate = (dateString?: string) => {
    if (!dateString) return ''
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true, 
      locale: zhCN 
    })
  }


  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">焕星</h1>
          <div className="flex items-center gap-4">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="切换主题" className="p-2 rounded-full hover:bg-gray-100">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => router.push("/settings")}>
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-6">
        <div className="flex items-start justify-between mb-4">
          <button className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400" onClick={() => setShowEditProfile(true)}>
            <img 
              src={user?.avatar_url || userProfile?.avatar_url || "/placeholder.svg?height=80&width=80"} 
              alt="Profile" 
              className="w-full h-full object-cover" 
            />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
            </svg>
            <span className="text-sm font-medium">想象力</span>
            <span className="text-sm font-medium">100</span>
          </div>
        </div>

        <button className="text-left" onClick={() => setShowEditProfile(true)}>
          <h1 className="text-xl font-bold mb-1">{user?.nickname || '未设置昵称'}</h1>
        </button>
        {(userProfile?.location || user?.location) && (
          <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
            <MapPin className="w-4 h-4" />
            <span>{userProfile?.location || user?.location}</span>
          </div>
        )}

        {(userProfile?.bio || user?.bio) ? (
          <button className="text-left w-full" onClick={() => setShowEditProfile(true)}>
            <p className="text-sm text-gray-600 mb-4">{userProfile?.bio || user?.bio}</p>
          </button>
        ) : (
          <button className="text-left w-full" onClick={() => setShowEditProfile(true)}>
            <p className="text-sm text-gray-400 mb-4">点击添加简介</p>
          </button>
        )}

        <div className="flex items-center gap-6 mb-4">
          <button onClick={() => router.push("/following")} className="flex flex-col items-center">
            <span className="text-lg font-bold">{stats?.following_count || 0}</span>
            <span className="text-xs text-gray-500">关注</span>
          </button>
          <button onClick={() => router.push("/following")} className="flex flex-col items-center">
            <span className="text-lg font-bold">{stats?.followers_count || 0}</span>
            <span className="text-xs text-gray-500">粉丝</span>
          </button>
          <button className="flex flex-col items-center">
            <span className="text-lg font-bold">{stats?.total_likes_received || 0}</span>
            <span className="text-xs text-gray-500">获赞</span>
          </button>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto bg-transparent"
            onClick={() => setShowEditProfile(true)}
          >
            编辑资料
          </Button>
        </div>

        {/* Personal Tags */}
        {tags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span 
                  key={tag.tag_id} 
                  className="px-2 py-1 text-xs rounded-full"
                  style={{ 
                    backgroundColor: `${tag.category_color}20`,
                    color: tag.category_color,
                    border: `1px solid ${tag.category_color}40`
                  }}
                >
                  {tag.category_icon && <span className="mr-1">{tag.category_icon}</span>}
                  {tag.tag_name}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => router.push("/avatar-management")}
          className="w-full flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80"
        >
          <div className="flex items-center gap-3">
            <img
              src="/20251203-154844.jpg"
              alt="AI Avatar"
              className="w-12 h-12 rounded-lg object-cover"
            />
            <span className="font-medium">形象管理</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start h-12 bg-background border-b rounded-none px-4">
          <TabsTrigger
            value="works"
            className="data-[state=active]:border-b-2 data-[state=active]:border-input rounded-none"
          >
            作品
          </TabsTrigger>
          <TabsTrigger
            value="private"
            className="data-[state=active]:border-b-2 data-[state=active]:border-input rounded-none"
          >
            私密
          </TabsTrigger>
          <TabsTrigger
            value="liked"
            className="data-[state=active]:border-b-2 data-[state=active]:border-input rounded-none"
          >
            点赞
          </TabsTrigger>
        </TabsList>

        <TabsContent value="works" className="mt-0">
          <div className="grid grid-cols-2 gap-1 p-1">
            {listLoading ? (
              <div className="col-span-2 p-8 text-center text-gray-400">加载中...</div>
            ) : works.length > 0 ? (
              works.map((w) => (
                <div
                  key={w.id}
                  className="relative aspect-[3/4] bg-muted cursor-pointer"
                  onClick={() => { setViewerItems(works); setViewerIndex(works.findIndex(x => x.id === w.id)); setViewerOpen(true) }}
                >
                  <img src={getWorkCover(w)} alt={w.title || ''} className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-xs">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      {w.views_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3 fill-white" />
                      {w.likes_count ?? 0}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-8 text-center text-gray-400">暂无作品</div>
            )}
            {worksHasMore && (
              <div
                ref={worksLoadMoreRef}
                onClick={() => loadMoreWorks()}
                className="col-span-2 py-3 text-center text-gray-400 text-sm cursor-pointer select-none"
              >
                {worksLoadingMore ? '加载更多...' : '点击加载更多'}
              </div>
            )}
          </div>
      </TabsContent>

        <TabsContent value="private" className="mt-0">
          <div className="grid grid-cols-2 gap-1 p-1">
            {(() => {
              const isPendingStatus = (s: string | null | undefined) => s === 'pending' || s === 'draft'
              const isFailedStatus = (s: string | null | undefined) => s === 'failed' || s === 'rejected'

              const pendingWorkIds = new Set(
                pendingGenerations
                  .map((g: any) => g?.generation_params?.work_id)
                  .filter((id: any) => typeof id === 'string')
              )
              const failedWorkIds = new Set(
                failedGenerations
                  .map((g: any) => g?.generation_params?.work_id)
                  .filter((id: any) => typeof id === 'string')
              )
              const pendingCount = pendingGenerations.length + privateWorks.filter((w) => isPendingStatus(w.status) && !pendingWorkIds.has(w.id)).length
              const failedCount = failedGenerations.length + privateWorks.filter((w) => isFailedStatus(w.status) && !failedWorkIds.has(w.id)).length
              const visiblePrivateWorks = privateWorks.filter((w) => !isPendingStatus(w.status) && !isFailedStatus(w.status))

              if (listLoading) return <div className="col-span-2 p-8 text-center text-gray-400">加载中...</div>
              if (!(pendingCount > 0 || failedCount > 0 || visiblePrivateWorks.length > 0)) {
                return <div className="col-span-2 p-8 text-center text-gray-400">暂无私密作品</div>
              }

              return (
                <>
                  {pendingCount > 0 && (
                    <div className="relative aspect-[3/4] bg-muted overflow-hidden rounded-sm flex items-center justify-center text-gray-700">
                      <img src="/placeholder.svg" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-sm font-semibold bg-white/80 px-2 py-1 rounded">
                          {pendingCount} 个作品生成中
                        </div>
                      </div>
                    </div>
                  )}

                  {failedCount > 0 && (
                    <div className="relative aspect-[3/4] bg-muted overflow-hidden rounded-sm flex items-center justify-center text-gray-700">
                      <img src="/placeholder.svg" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-sm font-semibold bg-white/80 px-2 py-1 rounded">
                          {failedCount} 个作品失败
                        </div>
                      </div>
                    </div>
                  )}

                  {visiblePrivateWorks.map((w) => (
                    <div
                      key={w.id}
                      className="relative aspect-[3/4] bg-muted cursor-pointer group"
                      onClick={() => { setViewerItems(visiblePrivateWorks); setViewerIndex(visiblePrivateWorks.findIndex(x => x.id === w.id)); setViewerOpen(true) }}
                    >
                      <img src={getWorkCover(w)} alt={w.title || ''} className="w-full h-full object-cover" />
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-xs">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          {w.views_count ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3 fill-white" />
                          {w.likes_count ?? 0}
                        </span>
                      </div>
                    </div>
                  ))}
                  {privateHasMore && (
                    <div
                      ref={privateLoadMoreRef}
                      onClick={() => loadMorePrivateWorks()}
                      className="col-span-2 py-3 text-center text-gray-400 text-sm cursor-pointer select-none"
                    >
                      {privateLoadingMore ? '加载更多...' : '点击加载更多'}
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </TabsContent>

        <TabsContent value="liked" className="mt-0">
          <div className="grid grid-cols-2 gap-1 p-1">
            {listLoading ? (
              <div className="col-span-2 p-8 text-center text-gray-400">加载中...</div>
            ) : likedWorks.length > 0 ? (
              <>
                {likedWorks.map((w: any) => (
                  <div
                    key={w.id}
                    className="relative aspect-[3/4] bg-muted cursor-pointer"
                    onClick={() => { setViewerItems(likedWorks); setViewerIndex(likedWorks.findIndex((x: any) => x.id === w.id)); setViewerOpen(true) }}
                  >
                    <img src={getWorkCover(w)} alt={w.title || ''} className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-xs">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        {w.views_count ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-white" />
                        {w.likes ?? w.likes_count ?? 0}
                      </span>
                    </div>
                  </div>
                ))}
                {likedHasMore && (
                  <div
                    ref={likedLoadMoreRef}
                    onClick={() => loadMoreLikedWorks()}
                    className="col-span-2 py-3 text-center text-gray-400 text-sm cursor-pointer select-none"
                  >
                    {likedLoadingMore ? '加载更多...' : '点击加载更多'}
                  </div>
                )}
              </>
            ) : (
              <div className="col-span-2 p-8 text-center text-gray-400">暂无点赞作品</div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {viewerOpen && (
        <MediaViewerOverlay
          items={viewerItems}
          initialIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
          onLoadMore={undefined}
        />
      )}


      <EditProfileModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} />
    </div>
  )
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <PullToRefresh onRefresh={() => Promise.resolve().then(() => window.location.reload())}>
        <ProfileContent />
      </PullToRefresh>
    </AuthGuard>
  )
}

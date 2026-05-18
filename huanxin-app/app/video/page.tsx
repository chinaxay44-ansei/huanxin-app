"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Heart, MessageCircle, Share2, Zap, Copy, Plus, Sparkles, Play, MoreHorizontal, ChevronLeft, Search } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CommentsSheet } from "../../components/comments-sheet"
import { useRouter, useSearchParams } from "next/navigation"
import { getTrendingVideos, Video } from "@/lib/api/client-videos"
import { getWorksList } from "@/lib/api/client-works"
import { checkLikeStatus, shareWork } from "@/lib/api/client-interactions"
import { checkFollowStatus, followUser, unfollowUser } from "@/lib/api/client-users"
import { useAuth } from "@/lib/auth"
import { toast } from "sonner"
import { authFetch } from "@/lib/client-auth-fetch"

export default function VideoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const typeParam = (searchParams.get('type') || 'video').toLowerCase()
  const contentType = (typeParam === 'image' ? 'image' : 'video') as 'video' | 'image'
  const startParam = searchParams.get('start')
  const initialIndex = startParam ? Math.max(0, parseInt(startParam, 10) || 0) : 0
  const workIdParam = searchParams.get('workId')
  const { user, isAuthenticated } = useAuth()
  const [videos, setVideos] = useState<Video[]>([])
  const [videoCategories, setVideoCategories] = useState<Array<{ id: string; name: string; slug?: string }>>([
    { id: 'discover', name: '发现', slug: 'discover' }
  ])
  const [activeVideoCategory, setActiveVideoCategory] = useState<string>('discover')
  const [currentVideoIndex, setCurrentVideoIndex] = useState(initialIndex)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  
  // 已浏览作品ID记录
  const [viewedWorkIds, setViewedWorkIds] = useState<Set<string>>(new Set())
  const [allWorksExhausted, setAllWorksExhausted] = useState(false)
  
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showHeartEffect, setShowHeartEffect] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null)

  
  // 滑动相关状态

  const containerRef = useRef<HTMLDivElement>(null)
  const [touchStartY, setTouchStartY] = useState<number | null>(null)
  const [touchCurrentY, setTouchCurrentY] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [translateY, setTranslateY] = useState(0)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const loadCats = async () => {
      try {
        const cats = await getCategoriesList({ type: 'video', force: true })
        let next = Array.isArray(cats)
          ? cats
              .filter((c: any) => c && (c.is_active === undefined || c.is_active))
              .map((c: any) => ({ id: c.slug || c.id, name: c.name, slug: c.slug }))
          : []
        if (next.length === 0) {
          try {
            const res = await fetch('/api/admin/categories', {
              headers: (process.env.NEXT_PUBLIC_ADMIN_API_TOKEN ? { 'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_API_TOKEN as string } : undefined)
            })
            const json = await res.json()
            const adminCats = Array.isArray(json.data)
              ? json.data
                  .filter((c: any) => String(c.type).toLowerCase() === 'video' && c.is_active)
                  .map((c: any) => ({ id: c.slug || c.id, name: c.name, slug: c.slug }))
              : []
            next = adminCats
          } catch {}
        }
        setVideoCategories([{ id: 'discover', name: '发现', slug: 'discover' }, ...next])
      } catch {}
    }
    loadCats()
  }, [])

  useEffect(() => {
    if (contentType !== 'video') return
    const loadByCategory = async () => {
      try {
        setLoading(true)
        setVideos([]) // 清空现有视频
        setViewedWorkIds(new Set()) // 重置已浏览记录
        setAllWorksExhausted(false)
        setPage(1)
        
        const categoryId = activeVideoCategory === 'discover' ? undefined : activeVideoCategory
        const works = await getWorksList({ type: 'video', limit: 5, offset: 0, sortBy: 'random', sortOrder: 'desc', categoryId })
        const mapped: Video[] = (works?.data || []).map((w: any) => ({
          id: w.id,
          title: w.title,
          description: w.description,
          media_url: w.media_url,
          thumbnail_url: w.thumbnail_url,
          duration: null,
          tags: w.tags || [],
          likes_count: w.likes_count || 0,
          comments_count: w.comments_count || 0,
          shares_count: w.shares_count || 0,
          views_count: w.views_count || 0,
          created_at: w.created_at,
          user_id: w.user?.id || w.user_id,
          user: {
            id: w.user?.id || w.user_id,
            nickname: w.user?.nickname || '未知用户',
            avatar_url: w.user?.avatar_url || '/placeholder.svg?height=48&width=48'
          },
          visibility: w.visibility,
          status: w.status
        }))
        setVideos(mapped)
        
        // 记录初始加载的视频ID
        setViewedWorkIds(new Set(mapped.map(v => v.id)))
        
        setHasMore(works.hasMore || mapped.length >= 5)
        setPage(2) // 下次从offset=5开始
        setCurrentVideoIndex(0)
      } finally {
        setLoading(false)
      }
    }
    loadByCategory()
  }, [contentType, activeVideoCategory])

  // 播放页进入沉浸模式：底部导航纯黑，文字白色
  useEffect(() => {
    document.body.classList.add('viewer-open')
    return () => { document.body.classList.remove('viewer-open') }
  }, [])



  const currentVideo = videos[currentVideoIndex]
  const isSelf = !!(isAuthenticated && user?.id && currentVideo && currentVideo.user_id === user.id)
  const isPrivate = !!(currentVideo && (((currentVideo as any).visibility === 'private') || ((currentVideo as any).status === 'private')))

  // 检查是否关注当前视频作者
  useEffect(() => {
    const checkFollow = async () => {
      if (!currentVideo || !isAuthenticated || !user?.id) {
        setIsFollowingAuthor(false)
        return
      }
      try {
        const { isFollowing } = await checkFollowStatus(user.id, currentVideo.user_id)
        setIsFollowingAuthor(!!isFollowing)
      } catch (err) {
        console.error('检查关注状态失败:', err)
        setIsFollowingAuthor(false)
      }
    }
    checkFollow()
  }, [currentVideo, isAuthenticated, user?.id])

  // 处理关注/取消关注作者
  const handleFollowToggle = async () => {
    if (!currentVideo || !isAuthenticated || !user?.id || followLoading) return
    setFollowLoading(true)
    try {
      if (isFollowingAuthor) {
        const { success } = await unfollowUser(user.id, currentVideo.user_id)
        if (success) setIsFollowingAuthor(false)
      } else {
        const { success } = await followUser(user.id, currentVideo.user_id)
        if (success) setIsFollowingAuthor(true)
      }
    } catch (error) {
      console.error('Failed to toggle follow author:', error)
    } finally {
      setFollowLoading(false)
    }
  }

  // 加载数据（视频或图片）
  useEffect(() => {
    const loadVideos = async () => {
      try {
        setLoading(true)
        setError(null)
        setVideoError(null)
        
        if (contentType === 'video') {
          return // 视频由上面的 useEffect 处理
        }
        
        if (contentType === 'image') {
          // 初始加载5个图片作品
          setVideos([])
          setViewedWorkIds(new Set())
          setAllWorksExhausted(false)
          setPage(1)
          
          const works = await getWorksList({ type: 'image', limit: 5, offset: 0, sortBy: 'random', sortOrder: 'desc' })
          if (works && Array.isArray(works.data)) {
            const mapped: Video[] = works.data.map((w: any) => ({
              id: w.id,
              title: w.title,
              description: w.description,
              media_url: w.media_url,
              thumbnail_url: w.thumbnail_url,
              duration: null,
              tags: w.tags || [],
              likes_count: w.likes_count || 0,
              comments_count: w.comments_count || 0,
              shares_count: w.shares_count || 0,
              views_count: w.views_count || 0,
              created_at: w.created_at,
              user_id: w.user?.id || w.user_id,
              user: {
                id: w.user?.id || w.user_id,
                nickname: w.user?.nickname || '未知用户',
                avatar_url: w.user?.avatar_url || '/placeholder.svg?height=48&width=48'
              },
              visibility: w.visibility,
              status: w.status
            }))
            let nextList = mapped
            
            // 记录初始加载的图片ID
            setViewedWorkIds(new Set(mapped.map(v => v.id)))
            
            setHasMore(works.hasMore || mapped.length >= 5)
            setPage(2) // 下次从offset=5开始
            
            if (workIdParam) {
              const idx = nextList.findIndex(v => v.id === workIdParam)
              if (idx >= 0) {
                setVideos(nextList)
                setCurrentVideoIndex(idx)
              } else {
                try {
                  const detail = await fetch(`/api/works/${workIdParam}`).then(r => r.json())
                  const w = detail?.data?.work ?? detail?.data
                  if (w && (w.type === 'image' || !w.type)) {
                    const v = {
                      id: w.id,
                      title: w.title,
                      description: w.description,
                      media_url: w.media_url,
                      thumbnail_url: w.thumbnail_url,
                      duration: null,
                      tags: w.tags || [],
                      likes_count: w.likes_count || 0,
                      comments_count: w.comments_count || 0,
                      shares_count: w.shares_count || 0,
                      views_count: w.views_count || 0,
                      created_at: w.created_at,
                      user_id: w.user?.id || w.user_id,
                      user: {
                        id: w.user?.id || w.user_id,
                        nickname: w.user?.nickname || '未知用户',
                        avatar_url: w.user?.avatar_url || '/placeholder.svg?height=48&width=48'
                      },
                      visibility: w.visibility,
                      status: w.status
                    } as any
                    nextList = [v, ...nextList]
                    setVideos(nextList)
                    setCurrentVideoIndex(0)
                  } else {
                    setVideos(nextList)
                    setCurrentVideoIndex(initialIndex)
                  }
                } catch {
                  setVideos(nextList)
                  setCurrentVideoIndex(initialIndex)
                }
              }
            } else {
              setVideos(nextList)
              setCurrentVideoIndex(initialIndex)
            }
          } else {
            setError('图片加载失败')
          }
        } else {
          const result = await getTrendingVideos(1, 10)
          if (result.error) {
            // 检查是否是数据库关系错误
            if (result.error.includes('relationship') || result.error.includes('schema cache')) {
              setVideoError('视频加载失败，请稍后再试')
            } else {
              setError(result.error)
            }
            // 使用模拟数据作为后备
            setVideos([
              {
                id: '1',
                title: '@洪兴社25号靓坤',
                description: '#音浮条知识人关连意行为#...',
                media_url: '/girl-with-goldfish-artistic-photo.jpg',
                thumbnail_url: '/girl-with-goldfish-artistic-photo.jpg',
                duration: null,
                tags: [],
                likes_count: 33,
                comments_count: 18,
                shares_count: 5,
                views_count: 120,
                created_at: new Date().toISOString(),
                user_id: '1',
                user: {
                  id: '1',
                  nickname: '星海',
                  avatar_url: '/placeholder.svg?height=48&width=48'
                }
              }
            ])
          } else {
            if (Array.isArray(result.data) && result.data.length > 0) {
              let nextList = result.data
              setHasMore(result.hasMore)
              setPage(result.hasMore ? 2 : 1)
              if (workIdParam) {
                const idx = nextList.findIndex(v => v.id === workIdParam)
                if (idx >= 0) {
                  setVideos(nextList)
                  setCurrentVideoIndex(idx)
                } else {
                  try {
                    const detail = await fetch(`/api/works/${workIdParam}`).then(r => r.json())
                    const w = detail?.data?.work ?? detail?.data
                    if (w && (w.type === 'video' || !w.type)) {
                      const v = {
                        id: w.id,
                        title: w.title,
                        description: w.description,
                        media_url: w.media_url,
                        thumbnail_url: w.thumbnail_url,
                        duration: null,
                        tags: w.tags || [],
                        likes_count: w.likes_count || 0,
                        comments_count: w.comments_count || 0,
                        shares_count: w.shares_count || 0,
                        views_count: w.views_count || 0,
                        created_at: w.created_at,
                        user_id: w.user?.id || w.user_id,
                        user: {
                          id: w.user?.id || w.user_id,
                          nickname: w.user?.nickname || '未知用户',
                          avatar_url: w.user?.avatar_url || '/placeholder.svg?height=48&width=48'
                        },
                        visibility: w.visibility,
                        status: w.status
                      } as any
                      nextList = [v, ...nextList]
                      setVideos(nextList)
                      setCurrentVideoIndex(0)
                    } else {
                      setVideos(nextList)
                      setCurrentVideoIndex(initialIndex)
                    }
                  } catch {
                    setVideos(nextList)
                    setCurrentVideoIndex(initialIndex)
                  }
                }
              } else {
                setVideos(nextList)
                setCurrentVideoIndex(initialIndex)
              }
            } else {
              // 回退到作品表中的视频数据
              const works = await getWorksList({ type: 'video', limit: 10, offset: 0, sortBy: 'random', sortOrder: 'desc' })
              if (works && Array.isArray(works.data) && works.data.length > 0) {
                const mapped: Video[] = works.data.map((w: any) => ({
                  id: w.id,
                  title: w.title,
                  description: w.description,
                  media_url: w.media_url,
                  thumbnail_url: w.thumbnail_url,
                  duration: null,
                  tags: w.tags || [],
                  likes_count: w.likes_count || 0,
                  comments_count: w.comments_count || 0,
                  shares_count: w.shares_count || 0,
                  views_count: w.views_count || 0,
                  created_at: w.created_at,
                  user_id: w.user?.id || w.user_id,
                  user: {
                    id: w.user?.id || w.user_id,
                    nickname: w.user?.nickname || '未知用户',
                    avatar_url: w.user?.avatar_url || '/placeholder.svg?height=48&width=48'
                  },
                  visibility: w.visibility,
                  status: w.status
                }))
                let nextList = mapped
                setHasMore(works.hasMore)
                setPage(works.hasMore ? 2 : 1)
                if (workIdParam) {
                  const idx = nextList.findIndex(v => v.id === workIdParam)
                  if (idx >= 0) {
                    setVideos(nextList)
                    setCurrentVideoIndex(idx)
                  } else {
                    try {
                      const detail = await fetch(`/api/works/${workIdParam}`).then(r => r.json())
                      const w = detail?.data?.work ?? detail?.data
                      if (w && (w.type === 'video' || !w.type)) {
                        const v = {
                          id: w.id,
                          title: w.title,
                          description: w.description,
                          media_url: w.media_url,
                          thumbnail_url: w.thumbnail_url,
                          duration: null,
                          tags: w.tags || [],
                          likes_count: w.likes_count || 0,
                          comments_count: w.comments_count || 0,
                          shares_count: w.shares_count || 0,
                          views_count: w.views_count || 0,
                          created_at: w.created_at,
                          user_id: w.user?.id || w.user_id,
                          user: {
                            id: w.user?.id || w.user_id,
                            nickname: w.user?.nickname || '未知用户',
                            avatar_url: w.user?.avatar_url || '/placeholder.svg?height=48&width=48'
                          },
                          visibility: w.visibility,
                          status: w.status
                        } as any
                        nextList = [v, ...nextList]
                        setVideos(nextList)
                        setCurrentVideoIndex(0)
                      } else {
                        setVideos(nextList)
                        setCurrentVideoIndex(initialIndex)
                      }
                    } catch {
                      setVideos(nextList)
                      setCurrentVideoIndex(initialIndex)
                    }
                  }
                } else {
                  setVideos(nextList)
                  setCurrentVideoIndex(initialIndex)
                }
              } else {
                // 最后回退到本地示例
                setVideos([
                  {
                    id: '1',
                    title: '示例视频',
                    description: '示例占位内容',
                    media_url: '/girl-with-goldfish-artistic-photo.jpg',
                    thumbnail_url: '/girl-with-goldfish-artistic-photo.jpg',
                    duration: null,
                    tags: [],
                    likes_count: 0,
                    comments_count: 0,
                    shares_count: 0,
                    views_count: 0,
                    created_at: new Date().toISOString(),
                    user_id: '1',
                    user: {
                      id: '1',
                      nickname: '示例',
                      avatar_url: '/placeholder.svg?height=48&width=48'
                    }
                  }
                ])
              }
            }
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '加载视频失败'
        // 检查是否是数据库关系错误
        if (errorMessage.includes('relationship') || errorMessage.includes('schema cache')) {
          setVideoError('视频加载失败，请稍后再试')
        } else {
          setError(errorMessage)
        }
          setVideos([
            {
              id: '1',
              title: '@洪兴社25号靓坤',
              description: '#音浮条知识人关连意行为#...',
              media_url: '/girl-with-goldfish-artistic-photo.jpg',
              thumbnail_url: '/girl-with-goldfish-artistic-photo.jpg',
              duration: null,
              tags: [],
              likes_count: 33,
              comments_count: 18,
              shares_count: 5,
              views_count: 120,
              created_at: new Date().toISOString(),
              user_id: '1',
              user: {
                id: '1',
                nickname: '星海',
                avatar_url: '/placeholder.svg?height=48&width=48'
              }
            }
          ])
      } finally {
        setLoading(false)
      }
    }

    loadVideos()
  }, [contentType])

  // 切换视频时重置滑动状态并控制播放
  useEffect(() => {
    setTranslateY(-currentVideoIndex * window.innerHeight)
    
    // 暂停所有非当前视频
    if (contentType === 'video') {
      const allVideos = document.querySelectorAll('video')
      allVideos.forEach((video, index) => {
        if (index !== currentVideoIndex) {
          video.pause()
          video.muted = true
        }
      })
      
      // 确保当前视频播放且有声
      if (videoRef.current) {
        videoRef.current.muted = false
        videoRef.current.play().catch(() => {})
      }
    }
  }, [currentVideoIndex, contentType])



  // 处理触摸滑动
  const handleTouchStart = (e: React.TouchEvent) => {
    // 如果评论区打开，不处理
    if (showComments) return
    
    const touch = e.touches[0]
    setTouchStartY(touch.clientY)
    setTouchCurrentY(touch.clientY)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || touchStartY === null || showComments) return
    e.preventDefault()
    const touch = e.touches[0]
    setTouchCurrentY(touch.clientY)
    
    const deltaY = touch.clientY - touchStartY

    const baseTranslate = -currentVideoIndex * window.innerHeight
    const newTranslate = baseTranslate + deltaY
    
    // 添加阻尼效果
    const damping = 0.5
    if (currentVideoIndex === 0 && deltaY > 0) {
      // 第一个视频，向下滑动添加阻尼
      setTranslateY(baseTranslate + deltaY * damping)
    } else if (currentVideoIndex === videos.length - 1 && deltaY < 0) {
      // 最后一个视频，向上滑动添加阻尼
      setTranslateY(baseTranslate + deltaY * damping)
    } else {
      setTranslateY(newTranslate)
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
    const threshold = Math.max(30, window.innerHeight * 0.08) // 8% 屏幕高度，最低30px

    
    let newIndex = currentVideoIndex
    
    if (deltaY < -threshold && currentVideoIndex < videos.length - 1) {
      // 向上滑动，切换到下一个
      newIndex = currentVideoIndex + 1
    } else if (deltaY > threshold && currentVideoIndex > 0) {
      // 向下滑动，切换到上一个
      newIndex = currentVideoIndex - 1
    }
    
    // 如果索引没变，说明未达到阈值，需要回弹到当前位置
    if (newIndex === currentVideoIndex) {
      setTranslateY(-currentVideoIndex * window.innerHeight)
    } else {
      setCurrentVideoIndex(newIndex)
    }
    
    setIsDragging(false)
    setTouchStartY(null)
    setTouchCurrentY(null)
  }

  // 键盘与滚轮事件
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showComments) return
      if (e.key === 'ArrowUp' && currentVideoIndex > 0) {
        setCurrentVideoIndex(prev => prev - 1)
      }
      if (e.key === 'ArrowDown' && currentVideoIndex < videos.length - 1) {
        setCurrentVideoIndex(prev => prev + 1)
      }
    }
    
    const onWheel = (e: WheelEvent) => {
      if (showComments) return
      e.preventDefault()
      
      if (e.deltaY > 30 && currentVideoIndex < videos.length - 1) {
        setCurrentVideoIndex(prev => prev + 1)
      } else if (e.deltaY < -30 && currentVideoIndex > 0) {
        setCurrentVideoIndex(prev => prev - 1)
      }
    }
    
    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', onWheel, { passive: false })
    
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', onWheel)
    }
  }, [currentVideoIndex, videos.length, showComments])

  // 接近末尾时加载更多视频（剩余2个时加载）
  useEffect(() => {
    const threshold = Math.max(0, videos.length - 2)
    if (currentVideoIndex >= threshold && !allWorksExhausted) {
      loadMoreVideos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideoIndex, videos.length, allWorksExhausted])

  // 加载更多作品（每次5个，排除已看过的）
  const loadMoreVideos = async () => {
    if (loadingMore || allWorksExhausted) return
    
    try {
      setLoadingMore(true)
      
      // 每次尝试获取更多作品，直到找到5个未看过的或没有更多
      const batchSize = 5
      const maxAttempts = 50 // 最多尝试获取50个，防止死循环
      let newVideos: Video[] = []
      let attempts = 0
      let currentOffset = page * 10 // 使用基于page的偏移量
      const existingIds = new Set(videos.map(v => v.id))
      
      while (newVideos.length < batchSize && attempts < maxAttempts) {
        const fetchSize = 10 // 每次获取10个
        
        if (contentType === 'image') {
          const works = await getWorksList({ 
            type: 'image', 
            limit: fetchSize, 
            offset: currentOffset, 
            sortBy: 'random', 
            sortOrder: 'desc' 
          })
          
          if (!Array.isArray(works.data) || works.data.length === 0) {
            // 没有更多作品了
            break
          }
          
          // 过滤掉已看过的作品
          const unseen = works.data.filter((w: any) => !viewedWorkIds.has(w.id) && !existingIds.has(w.id))
          
          if (unseen.length > 0) {
            const mapped: Video[] = unseen.map((w: any) => ({
              id: w.id,
              title: w.title,
              description: w.description,
              media_url: w.media_url,
              thumbnail_url: w.thumbnail_url,
              duration: null,
              tags: w.tags || [],
              likes_count: w.likes_count || 0,
              comments_count: w.comments_count || 0,
              shares_count: w.shares_count || 0,
              views_count: w.views_count || 0,
              created_at: w.created_at,
              user_id: w.user?.id || w.user_id,
              user: {
                id: w.user?.id || w.user_id,
                nickname: w.user?.nickname || '未知用户',
                avatar_url: w.user?.avatar_url || '/placeholder.svg?height=48&width=48'
              },
              visibility: w.visibility,
              status: w.status
            }))
            
            newVideos.push(...mapped.slice(0, batchSize - newVideos.length))
          }
          
          if (!works.hasMore && unseen.length === 0) {
            // 确实没有更多未看过的作品了
            break
          }
          
          currentOffset += fetchSize
          attempts++
        } else {
          // 视频类型
          const categoryId = activeVideoCategory === 'discover' ? undefined : activeVideoCategory
          const works = await getWorksList({ 
            type: 'video', 
            limit: fetchSize, 
            offset: currentOffset, 
            sortBy: 'random', 
            sortOrder: 'desc',
            categoryId 
          })
          
          if (!Array.isArray(works.data) || works.data.length === 0) {
            break
          }
          
          const unseen = works.data.filter((w: any) => !viewedWorkIds.has(w.id) && !existingIds.has(w.id))
          
          if (unseen.length > 0) {
            const mapped: Video[] = unseen.map((w: any) => ({
              id: w.id,
              title: w.title,
              description: w.description,
              media_url: w.media_url,
              thumbnail_url: w.thumbnail_url,
              duration: null,
              tags: w.tags || [],
              likes_count: w.likes_count || 0,
              comments_count: w.comments_count || 0,
              shares_count: w.shares_count || 0,
              views_count: w.views_count || 0,
              created_at: w.created_at,
              user_id: w.user?.id || w.user_id,
              user: {
                id: w.user?.id || w.user_id,
                nickname: w.user?.nickname || '未知用户',
                avatar_url: w.user?.avatar_url || '/placeholder.svg?height=48&width=48'
              },
              visibility: w.visibility,
              status: w.status
            }))
            
            newVideos.push(...mapped.slice(0, batchSize - newVideos.length))
          }
          
          if (!works.hasMore && unseen.length === 0) {
            break
          }
          
          currentOffset += fetchSize
          attempts++
        }
      }
      
      if (newVideos.length > 0) {
        // 添加新作品到列表，保证不重复
        setVideos(prev => {
          const idSet = new Set(prev.map(v => v.id))
          const merged = [...prev, ...newVideos.filter(v => !idSet.has(v.id))]
          return merged
        })
        // 记录这些作品已被浏览
        setViewedWorkIds(prev => {
          const newSet = new Set(prev)
          newVideos.forEach(v => newSet.add(v.id))
          return newSet
        })
        setPage(p => p + 1)
      } else {
        // 没有找到任何未看过的作品
        setAllWorksExhausted(true)
        setHasMore(false)
      }
    } catch (err) {
      console.error('加载更多视频失败:', err)
    } finally {
      setLoadingMore(false)
    }
  }


  // 检查当前视频的点赞状态
  useEffect(() => {
    if (currentVideo) {
      const checkLike = async () => {
        try {
          if (isAuthenticated && user?.id) {
            const result = await checkLikeStatus(user.id, currentVideo.id)
            setLiked(!!result.isLiked)
          } else {
            setLiked(false)
          }
          setLikeCount(currentVideo.likes_count)
        } catch (err) {
          console.error('检查点赞状态失败:', err)
          setLiked(false)
          setLikeCount(currentVideo.likes_count)
        }
      }

      checkLike()
    }
  }, [currentVideo])

  // 处理点赞
  const handleLike = async (): Promise<boolean | undefined> => {
    if (!currentVideo) return liked
    if (!isAuthenticated || !user?.id) {
      toast.error("请先登录后再点赞")
      router.push("/login")
      return liked
    }

    const previousLiked = liked
    try {
      if (liked) {
        const res = await fetch('/api/social/like', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ work_id: currentVideo.id }) })
        const result = await res.json()
        if (res.ok && result.success) {
          setLiked(false)
          const nextCount = typeof result?.data?.likes_count === 'number'
            ? result.data.likes_count
            : Math.max(0, (currentVideo.likes_count || 0) - 1)
          setLikeCount(nextCount)
          setVideos(prev => prev.map(video => 
            video.id === currentVideo.id 
              ? { ...video, likes_count: nextCount }
              : video
          ))
          return false
        }
      } else {
        const res = await fetch('/api/social/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ work_id: currentVideo.id }) })
        const result = await res.json()
        if (res.ok && result.success) {
          setLiked(true)
          const nextCount = typeof result?.data?.likes_count === 'number'
            ? result.data.likes_count
            : (currentVideo.likes_count || 0) + 1
          setLikeCount(nextCount)
          setVideos(prev => prev.map(video => 
            video.id === currentVideo.id 
              ? { ...video, likes_count: nextCount }
              : video
          ))
          return true
        }
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
    }
    return previousLiked
  }



  // 播放/暂停切换
  const togglePlayPause = () => {
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
    handleLike()
      .then((nextLiked) => {
        if (nextLiked) {
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
    if (contentType !== 'video') return
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

    videoElement.addEventListener('dblclick', handleVideoDoubleClick)
    videoElement.addEventListener('touchend', handleVideoTouchEnd, { passive: false })

    return () => {
      videoElement.removeEventListener('dblclick', handleVideoDoubleClick)
      videoElement.removeEventListener('touchend', handleVideoTouchEnd)
    }
  }, [contentType, currentVideo?.id])

  // 处理分享
  const handleShare = async () => {
    if (!currentVideo || !isAuthenticated || !user?.id) return

    try {
      const result = await shareWork(user.id, currentVideo.id)
      if (result.success) {
        setVideos(prev => prev.map(video => 
          video.id === currentVideo.id 
            ? { ...video, shares_count: (video.shares_count || 0) + 1 }
            : video
        ))
        // 这里可以添加分享功能的具体实现
        alert('分享成功！')
      }
    } catch (error) {
      console.error('Failed to share:', error)
    }
  }

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return diffInHours < 1 ? '刚刚' : `${diffInHours}小时前`
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}天前`
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
    }
  }



  // 确保视频有声音播放
  useEffect(() => {
    if (contentType !== 'video') return
    const videoElement = videoRef.current
    if (videoElement) {
      videoElement.muted = false
      videoElement.volume = 1
    }
  }, [contentType, currentVideo?.id])

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    )
  }

  if (error || !currentVideo) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white">{error || '暂无视频'}</div>
      </div>
    )
  }


  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 bg-black overflow-hidden"
      style={{ overscrollBehavior: 'contain', touchAction: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >

      {/* 视频流容器 */}
      <div 
        className="absolute inset-0"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          willChange: 'transform'
        }}
      >
        {videos.map((video, index) => {
          const isActive = index === currentVideoIndex
          const shouldRender = Math.abs(index - currentVideoIndex) <= 1 // 只渲染当前、上一个、下一个
          
          if (!shouldRender) return null
          
          return (
            <div
              key={video.id}
              className="absolute inset-0 w-full h-screen"
              style={{
                transform: `translateY(${index * 100}vh)`,
              }}
            >
              {/* 视频/图片内容 */}
              <div className="absolute inset-0">
                {contentType === 'image' ? (
                  <img
                    src={video.media_url}
                    alt={video.title || ''}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                ) : (
                  <video
                    src={video.media_url}
                    className="absolute inset-0 w-full h-full object-contain"
                    autoPlay={isActive}
                    muted={false}
                    loop
                    playsInline
                    controls={false}
                    ref={isActive ? videoRef : null}
                    onError={() => isActive && setVideoError('视频加载失败，请稍后再试')}
                    onLoadedData={() => {
                      if (!isActive || !videoRef.current) return
                      videoRef.current.muted = false
                      videoRef.current.play().catch(() => {})
                      setVideoError(null)
                    }}

                    onPlay={() => isActive && setIsPaused(false)}
                    onPause={() => isActive && setIsPaused(true)}
                    onEnded={() => {
                      if (!isActive || !videoRef.current) return
                      videoRef.current.currentTime = 0
                      videoRef.current.play().catch(() => {})
                      setIsPaused(false)
                    }}
                  />

                )}
              </div>

              {/* 点击交互层 - 只在当前作品显示 */}
              {isActive && contentType === 'video' && (
                <div
                  className="absolute inset-0 cursor-pointer z-10"
                  onClick={handleSingleClick}
                  aria-label={isPaused ? '播放' : '暂停'}
                >
                  {isPaused && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  )}
                  {showHeartEffect && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Heart className="w-24 h-24 text-red-500 fill-red-500 animate-ping" />
                    </div>
                  )}
                </div>
              )}
              
              {/* 图片双击点赞效果 */}
              {isActive && contentType === 'image' && (
                <div
                  className="absolute inset-0 cursor-pointer z-10"
                  onDoubleClick={handleDoubleClick}
                >
                  {showHeartEffect && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Heart className="w-24 h-24 text-red-500 fill-red-500 animate-ping" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* UI层 - 固定在视口，不跟随视频移动 */}
      {currentVideo && (
        <>
          {/* 顶部工具栏 - 只保留搜索 */}
          <div className="fixed top-0 left-0 right-0 z-20 flex items-center justify-end p-4 pointer-events-none">
            <div className="flex items-center gap-3 pointer-events-auto">
              <button onClick={() => router.push('/search')} aria-label="搜索" className="text-white">
                <Search className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* 左下角 - 用户名和标题 */}
          <div className="fixed left-4 right-24 bottom-20 z-20 text-white pointer-events-auto">
            <div className="flex items-center mb-2">
              <span className="font-semibold text-base">@{currentVideo.user.nickname}</span>
            </div>

            <p className="text-base font-medium mb-1">{currentVideo.title}</p>
            <p className="text-sm text-white/80 line-clamp-2">{currentVideo.description}</p>
          </div>

          {/* 右下角 - 操作按钮组（头像在最上方） */}
          <div className="fixed right-4 bottom-20 z-20 flex flex-col items-center gap-4 pointer-events-auto">
            {/* 作者头像 + 关注按钮 */}
            <div className="relative">
              <button onClick={() => router.push(`/user/${currentVideo.user_id}`)}>
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white">
                  <img
                    src={currentVideo.user?.avatar_url || "/placeholder.svg"}
                    alt={currentVideo.user?.nickname || ''}
                    className="w-full h-full object-cover"
                  />
                </div>
              </button>
              {!isSelf && (
                <button 
                  onClick={handleFollowToggle} 
                  className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center ${isFollowingAuthor ? 'bg-gray-500' : 'bg-brand'}`}
                  disabled={followLoading}
                >
                  <Plus className={`w-4 h-4 ${isFollowingAuthor ? 'text-white' : 'text-brand-foreground'}`} />
                </button>
              )}
            </div>

            <button onClick={handleLike} className="flex flex-col items-center gap-1">
              <Heart className={`w-9 h-9 ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
              <span className="text-white text-xs font-medium">{likeCount}</span>
            </button>

            <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
              <MessageCircle className="w-9 h-9 text-white" />
              <span className="text-white text-xs font-medium">{currentVideo.comments_count}</span>
            </button>

            <button onClick={handleShare} className="flex flex-col items-center gap-1">
              <Share2 className="w-9 h-9 text-white" />
              <span className="text-white text-xs font-medium">{currentVideo.shares_count}</span>
            </button>

            <button onClick={() => currentVideo?.id && router.push(`/generate/same-style/${currentVideo.id}`)} className="flex flex-col items-center gap-1">
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

      {/* 加载更多提示 */}
      {loadingMore && (
        <div className="fixed bottom-20 left-0 right-0 flex justify-center z-30">
          <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs">加载更多...</span>
        </div>
      )}
      
      {/* 已浏览完所有作品提示 */}
      {allWorksExhausted && !loadingMore && (
        <div className="fixed bottom-20 left-0 right-0 flex justify-center z-30">
          <div className="px-4 py-2 rounded-full bg-white/10 text-white text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>您已浏览完所有作品</span>
          </div>
        </div>
      )}

      {!hasMore && allWorksExhausted && (
        <div className="fixed bottom-10 left-0 right-0 flex justify-center z-30 text-xs text-white/70">
          没有更多未看过的视频了
        </div>
      )}



      <Sheet open={showMore} onOpenChange={setShowMore}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>更多操作</SheetTitle>
          </SheetHeader>
          <div className="p-4 grid grid-cols-3 gap-4 text-sm mx-auto w-full max-w-[480px] md:max-w-[540px]">
            <button onClick={() => { const a = document.createElement('a'); a.href = currentVideo.media_url; a.download = currentVideo.title || '作品'; a.click(); setShowMore(false) }} className="px-3 py-2 bg-muted rounded">下载</button>
            <button onClick={() => { setShowDetails(true); setShowMore(false) }} className="px-3 py-2 bg-muted rounded">详细信息</button>
            <button onClick={() => { alert('感谢支持'); setShowMore(false) }} className="px-3 py-2 bg-muted rounded">赞赏</button>
            {isSelf && isPrivate && (
              <button onClick={() => { setShowMore(false); router.push(`/works/${currentVideo.id}/publish`) }} className="px-3 py-2 bg-brand text-brand-foreground rounded">发布</button>
            )}
            {isSelf && (
              <button onClick={async () => { try { await fetch(`/api/works/${currentVideo.id}`, { method: 'DELETE' }); setShowMore(false); router.back() } catch {} }} className="px-3 py-2 bg-red-600 text-white rounded">删除</button>
            )}
            {isSelf && isPrivate && (
              <button onClick={async () => {
                try {
                  const detail = await fetch(`/api/works/${currentVideo.id}`).then(r => r.json())
                  const cfg = detail?.data?.generation_params?.request_json || null
                  const nodeInfoList = Array.isArray(cfg?.nodeInfoList) ? cfg.nodeInfoList : []
                  const TOKENS = { IMAGE_UPLOAD: '__IMAGE_UPLOAD__', OUTFIT_IMAGE: '__OUTFIT_IMAGE__', VIDEO_UPLOAD: '__VIDEO_UPLOAD__', PROMPT_TEXT: '__PROMPT_TEXT__', CUSTOM_VALUE: '__CUSTOM_VALUE__', FILE_UPLOAD: '__FILE_UPLOAD__', AVATAR_IMAGE: '__AVATAR_IMAGE__', ASSET_IMAGE: '__ASSET_IMAGE__', WORK_IMAGE: '__WORK_IMAGE__' }
                  const resolvedValues = nodeInfoList.map((n: any) => {
                    const raw = String(n.fieldValue || '')
                    if ([TOKENS.IMAGE_UPLOAD, TOKENS.OUTFIT_IMAGE, TOKENS.VIDEO_UPLOAD, TOKENS.FILE_UPLOAD, TOKENS.AVATAR_IMAGE, TOKENS.ASSET_IMAGE, TOKENS.WORK_IMAGE].includes(raw)) return n.defaultValue || ''
                    return ''
                  })
                  const promptText = nodeInfoList.find((n: any) => String(n.fieldValue || '') === TOKENS.PROMPT_TEXT)?.defaultValue || ''
                  await authFetch(`/api/same-style/generate/${currentVideo.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resolvedValues, promptText }) })
                  setShowMore(false)
                } catch {}
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
          <div className="space-y-2 text-sm text-white">
            <div>作者：{currentVideo.user?.nickname}</div>
            <div>标题：{currentVideo.title || '未命名'}</div>
            <div>类型：{contentType}</div>
            <div>创建时间：{currentVideo.created_at}</div>
          </div>
        </DialogContent>
      </Dialog>

      {currentVideo && (
        <CommentsSheet
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          workId={currentVideo.id}
          initialCount={currentVideo.comments_count || 0}
          onCountChange={(next) => {
            setVideos(prev =>
              prev.map((video, idx) => {
                if (idx !== currentVideoIndex) return video
                const prevCount = video.comments_count || 0
                const resolved = typeof next === "function" ? (next as (arg: number) => number)(prevCount) : next
                return { ...video, comments_count: resolved }
              })
            )
          }}
        />
      )}
    </div>
  )
}

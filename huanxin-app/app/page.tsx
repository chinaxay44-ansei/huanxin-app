"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Heart, MessageCircle, Share2, Play, ChevronRight, Sparkles, Camera, Video, Zap, Search, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import MediaViewerOverlay from "@/components/media-viewer-overlay"
import PullToRefresh from "@/components/pull-to-refresh"
import { getWorksList, getCategoriesList, WorkWithUser } from "@/lib/api/client-works"
import { useAuth } from "@/lib/auth"

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState("ai-photo")
  const [activeCategory, setActiveCategory] = useState("discover")
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [photos, setPhotos] = useState<WorkWithUser[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const restoredRef = useRef(false)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const withProxy = (url?: string | null) => {
    if (!url) return '/placeholder.svg'
    const prefix = `${SUPA_URL}/storage/v1/object/public/`
    return SUPA_URL && url.startsWith(prefix) ? `/api/media/proxy?u=${encodeURIComponent(url)}` : url
  }
  const [leftPhotos, setLeftPhotos] = useState<WorkWithUser[]>([])
  const [rightPhotos, setRightPhotos] = useState<WorkWithUser[]>([])
  const [leftH, setLeftH] = useState(0)
  const [rightH, setRightH] = useState(0)
  const captionH = 28
  const baseW = 300
  const aspectChoicesImg = ['3 / 4', '1 / 1', '2 / 3', '4 / 5']
  const aspectChoicesVideo = ['9 / 16', '3 / 4']
  const pick = (id: string, arr: string[]) => arr[Math.abs(id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)) % arr.length]
  const getAspect = (p: WorkWithUser) => p.media_type === 'video' ? pick(p.id, aspectChoicesVideo) : pick(p.id, aspectChoicesImg)
  const ratioVal = (ratio: string) => {
    const [w, h] = ratio.split('/').map(s => parseFloat(s.trim()))
    if (!w || !h) return 4 / 3
    return h / w
  }
  const getIndexById = (id: string) => {
    const i = photos.findIndex(p => p.id === id)
    return i >= 0 ? i : 0
  }
  const resetColumns = () => {
    setLeftPhotos([])
    setRightPhotos([])
    setLeftH(0)
    setRightH(0)
  }
  const appendBatch = (items: WorkWithUser[]) => {
    if (!items || items.length === 0) return
    let l = [...leftPhotos]
    let r = [...rightPhotos]
    let lh = leftH
    let rh = rightH
    for (const it of items) {
      const ar = getAspect(it)
      const hOVw = ratioVal(ar)
      const est = baseW * hOVw + captionH
      if (lh <= rh) { l.push(it); lh += est } else { r.push(it); rh += est }
    }
    setLeftPhotos(l)
    setRightPhotos(r)
    setLeftH(lh)
    setRightH(rh)
  }

  const computeColumns = (items: WorkWithUser[]) => {
    let l: WorkWithUser[] = []
    let r: WorkWithUser[] = []
    let lh = 0
    let rh = 0
    for (const it of items) {
      const ar = getAspect(it)
      const hOVw = ratioVal(ar)
      const est = baseW * hOVw + captionH
      if (lh <= rh) { l.push(it); lh += est } else { r.push(it); rh += est }
    }
    return { l, r, lh, rh }
  }

  // 点击网格中的图片，在首页打开覆盖层播放器
  const openMediaViewer = (index: number) => {
    setViewerIndex(index)
    setViewerOpen(true)
  }

  const visibleCategories = showAllCategories ? categories : categories.slice(0, 5)

  // 加载分类数据
  const loadCategories = async () => {
    try {
      const categoriesData = await getCategoriesList({ type: 'image' })
      // 添加默认“发现”分类
      const allCategories = [
        { id: "discover", name: "发现", slug: "discover" },
        ...categoriesData.map(cat => ({ id: cat.id, name: cat.name, slug: cat.slug }))
      ]
      setCategories(allCategories)
      try {
        const cache = JSON.parse(sessionStorage.getItem('home-feed-cache-v1') || 'null')
        if (cache && Array.isArray(cache.categories) && cache.categories.length > 0 && !restoredRef.current) {
          setCategories(cache.categories)
        }
      } catch {}
    } catch (error) {
      console.error('加载分类失败:', error)
      // 使用默认分类作为后备
      setCategories([
        { id: "discover", name: "发现", slug: "discover" },
        { id: "aesthetic", name: "美学照片", slug: "aesthetic" },
        { id: "id-photo", name: "证件照", slug: "id-photo" },
        { id: "poster", name: "海报", slug: "poster" },
        { id: "pet", name: "宠物", slug: "pet" },
        { id: "vintage", name: "复古", slug: "vintage" },
        { id: "art", name: "艺术", slug: "art" },
        { id: "fashion", name: "时尚", slug: "fashion" },
      ])
    }
  }

  // 加载作品数据
  const loadPhotos = async (reset = false) => {
    if (loading) return
    
    setLoading(true)
    setLoadError(null)
    try {
      const currentPage = reset ? 1 : page
      const offset = (currentPage - 1) * 20
      
      // 根据当前分类筛选
      const categoryId = activeCategory === "discover" ? undefined : activeCategory
      
      const response = await getWorksList({
        categoryId,
        type: 'image',
        limit: 20,
        offset,
        sortBy: 'random',
        sortOrder: 'desc'
      })
      
      let appendedItems: WorkWithUser[] = []

      if (reset) {
        const uniqueInitial: WorkWithUser[] = []
        const nextSeen = new Set<string>()
        for (const item of response.data) {
          if (nextSeen.has(item.id)) continue
          nextSeen.add(item.id)
          uniqueInitial.push(item)
        }
        seenIdsRef.current = nextSeen
        setPhotos(uniqueInitial)
        setPage(2)
        appendedItems = uniqueInitial
        const cols = computeColumns(uniqueInitial)
        setLeftPhotos(cols.l)
        setRightPhotos(cols.r)
        setLeftH(cols.lh)
        setRightH(cols.rh)
      } else {
        const uniqueBatch = response.data.filter((item) => {
          if (seenIdsRef.current.has(item.id)) return false
          seenIdsRef.current.add(item.id)
          return true
        })
        appendedItems = uniqueBatch
        if (uniqueBatch.length > 0) {
          setPhotos(prev => [...prev, ...uniqueBatch])
          appendBatch(uniqueBatch)
        }
        setPage(prev => prev + 1)
      }
      
      // 检查是否还有更多数据
      setHasMore(response.hasMore)
      try {
        const cache = {
          photos: reset ? appendedItems : undefined,
          categories,
          page: reset ? 2 : page + 1,
          activeCategory,
          hasMore: response.hasMore
        }
        const existing = JSON.parse(sessionStorage.getItem('home-feed-cache-v1') || 'null')
        const nextCache = {
          ...(existing || {}),
          ...cache,
          photos: reset
            ? appendedItems
            : (existing?.photos ? [...existing.photos, ...appendedItems] : appendedItems)
        }
        sessionStorage.setItem('home-feed-cache-v1', JSON.stringify(nextCache))
      } catch {}
    } catch (error) {
      console.error('加载作品失败:', error)
      setLoadError('作品加载失败，请重试')
      // 如果 API 失败，使用 mock 数据作为后备
      // if (reset || photos.length === 0) {
      //   generateMockPhotos(reset)
      // }
    } finally {
      setLoading(false)
    }
  }

  // 生成模拟数据（作为后备）
  const generateMockPhotos = (reset = false) => {
    const mockPhotos = Array.from({ length: 20 }, (_, i) => ({
      id: `mock-${Date.now()}-${i}`,
      title: `用户还没有给作品取名`,
      description: `这是一组精美的 AI 生成作品`,
      media_url: `https://picsum.photos/400/600?random=${Date.now() + i}`,
      media_type: 'image' as const,
      thumbnail_url: `https://picsum.photos/400/600?random=${Date.now() + i}`,
      category_id: activeCategory === "discover" ? null : activeCategory,
      tags: ['AI生图', '美图'],
      status: 'published' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        id: `user-${i}`,
        nickname: `用户${i + 1}`,
        avatar_url: `https://picsum.photos/100/100?random=${i + 100}`
      },
      category: activeCategory !== "discover" ? {
        id: activeCategory,
        name: categories.find(c => c.id === activeCategory)?.name || '未知分类'
      } : undefined,
      likes_count: Math.floor(Math.random() * 1000),
      comments_count: Math.floor(Math.random() * 100)
    }))

    if (reset) {
      seenIdsRef.current = new Set(mockPhotos.map((item) => item.id))
      setPhotos(mockPhotos)
    } else {
      mockPhotos.forEach(item => seenIdsRef.current.add(item.id))
      setPhotos(prev => [...prev, ...mockPhotos])
    }
  }

  // 初始化数据加载
  useEffect(() => {
    try {
      const cache = JSON.parse(sessionStorage.getItem('home-feed-cache-v1') || 'null')
      if (cache && Array.isArray(cache.photos) && cache.photos.length > 0) {
        setPhotos(cache.photos)
        seenIdsRef.current = new Set(cache.photos.map((p: WorkWithUser) => p.id))
        if (Array.isArray(cache.categories) && cache.categories.length > 0) setCategories(cache.categories)
        if (typeof cache.page === 'number') setPage(cache.page)
        if (typeof cache.hasMore === 'boolean') setHasMore(cache.hasMore)
        if (typeof cache.activeCategory === 'string') setActiveCategory(cache.activeCategory)
        resetColumns()
        appendBatch(cache.photos)
        restoredRef.current = true
      }
    } catch {}
    loadCategories()
  }, [])

  // 分类变化时重新加载数据
  useEffect(() => {
    if (categories.length > 0) {
      loadPhotos(true)
    }
  }, [activeCategory, categories])

  // 无限滚动
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          loadPhotos()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [loading, hasMore])

  const funModes = [
    { id: 1, title: "获取我的emoji小人", image: "/emoji-avatar-character.jpg", users: 574 },
    { id: 2, title: "美学滤镜肖像", image: "/aesthetic-filter-portrait.jpg", users: 892 },
    { id: 3, title: "复古摄影风格", image: "/vintage-polaroid-photo.jpg", users: 1203 },
  ]

  const cortisThemes = [
    { id: 1, image: "/cortis-style-photo-1.jpg" },
    { id: 2, image: "/cortis-style-photo-2.jpg" },
    { id: 3, image: "/cortis-style-photo-3.jpg" },
  ]

  const [funSeries, setFunSeries] = useState<any[]>([])
  const [funLoading, setFunLoading] = useState(true)
  const [funViewerOpen, setFunViewerOpen] = useState(false)
  const [funViewerItems, setFunViewerItems] = useState<any[]>([])
  const [funViewerIndex, setFunViewerIndex] = useState(0)
  const [funViewerSlug, setFunViewerSlug] = useState<string | null>(null)
  const [funOffset, setFunOffset] = useState(0)

  useEffect(() => {
    const loadFun = async () => {
      try {
        const res = await fetch('/api/fun-series?items_limit=3')
        const json = await res.json()
        if (json.success) setFunSeries(json.data || [])
      } finally {
        setFunLoading(false)
      }
    }
    loadFun()
  }, [])

  const onRefresh = async () => {
    setPage(1)
    try { sessionStorage.removeItem('home-feed-cache-v1') } catch {}
    await loadCategories()
    await loadPhotos(true)
  }

  return (
    <PullToRefresh onRefresh={onRefresh}>
    <div className="min-h-screen bg-background pb-20 scrollbar-hide">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">焕星</h1>
          <div className="flex items-center gap-4">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="切换主题" className="p-2 rounded-full hover:bg-muted">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link href="/search" prefetch>
              <Search className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      

      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
        <TabsList className="w-full grid grid-cols-2 h-12 bg-muted rounded-full p-1">
          <TabsTrigger
            value="ai-photo"
            className="rounded-full data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm font-medium"
          >
            写真
          </TabsTrigger>
          <TabsTrigger
            value="fun-mode"
            className="rounded-full data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm font-medium"
          >
            专题
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-photo" className="mt-4">
          <div className="mb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {visibleCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeCategory === category.id
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {category.name}
                </button>
              ))}
              {!showAllCategories && (
                <button
                  onClick={() => setShowAllCategories(true)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap bg-muted text-muted-foreground hover:bg-accent flex items-center gap-1"
                >
                  更多
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {loadError && (
            <div className="mb-4 p-3 border rounded-lg bg-muted/50 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{loadError}</span>
              <Button size="sm" variant="outline" onClick={() => loadPhotos(true)}>重试</Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="break-inside-avoid">
                <div className="relative rounded-lg overflow-hidden aspect-[3/4] bg-muted">
                  <Image src="/轮播图.jpg" alt="轮播占位" fill className="object-cover" sizes="(max-width: 768px) 50vw, 300px" />
                </div>
                <p className="text-sm mt-1 font-semibold truncate">轮播占位</p>
              </div>
              {leftPhotos.map((photo) => (
                <div key={photo.id} className="break-inside-avoid cursor-pointer" onClick={() => openMediaViewer(getIndexById(photo.id))} style={{ contentVisibility: 'auto', containIntrinsicSize: '400px' }}>
                  <div className="relative rounded-lg overflow-hidden bg-muted" style={{ aspectRatio: getAspect(photo) }}>
                    {photo.media_type === 'video' ? (
                      <video src={withProxy(photo.media_url)} className="absolute inset-0 w-full h-full object-cover" preload="metadata" poster={withProxy(photo.thumbnail_url) || '/视频封面.jpg'} playsInline />
                    ) : (
                      <Image src={withProxy(photo.thumbnail_url || photo.media_url)} alt={photo.title || '焕星生成'} fill className="object-cover" sizes="(max-width: 768px) 50vw, 300px" />
                    )}
                  </div>
                  <p className="text-sm mt-1 font-semibold truncate">{photo.title}</p>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {rightPhotos.map((photo) => (
                <div key={photo.id} className="break-inside-avoid cursor-pointer" onClick={() => openMediaViewer(getIndexById(photo.id))} style={{ contentVisibility: 'auto', containIntrinsicSize: '400px' }}>
                  <div className="relative rounded-lg overflow-hidden bg-muted" style={{ aspectRatio: getAspect(photo) }}>
                    {photo.media_type === 'video' ? (
                      <video src={withProxy(photo.media_url)} className="absolute inset-0 w-full h-full object-cover" preload="metadata" poster={withProxy(photo.thumbnail_url) || '/视频封面.jpg'} playsInline />
                    ) : (
                      <Image src={withProxy(photo.thumbnail_url || photo.media_url)} alt={photo.title || '焕星生成'} fill className="object-cover" sizes="(max-width: 768px) 50vw, 300px" />
                    )}
                  </div>
                  <p className="text-sm mt-1 font-semibold truncate">{photo.title}</p>
                </div>
              ))}
            </div>
          </div>
          <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
            {loading && <div className="text-sm text-muted-foreground">加载中..</div>}
          </div>
        </TabsContent>

        <TabsContent value="fun-mode" className="mt-4">
          <div className="space-y-6">
            {funLoading ? (
              <div className="text-center text-muted-foreground">加载中...</div>
            ) : (
              funSeries.map((s) => (
                <section key={s.id}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold">{s.title}</h2>
                    <Link href={`/fun/${s.slug}`} prefetch className="text-sm text-muted-foreground">更多</Link>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {s.items.map((item: any, idx: number) => (
                      <div key={item.id} className="cursor-pointer" onClick={() => {
                        setFunViewerSlug(s.slug)
                        setFunViewerItems(s.items)
                        setFunViewerIndex(idx)
                        setFunOffset(s.items.length)
                        setFunViewerOpen(true)
                      }}>
                        <div className="relative rounded-xl overflow-hidden bg-muted aspect-[3/4] shadow-sm">
                          <Image
                            src={withProxy(item.thumbnail_url || item.media_url || "/placeholder.svg")}
                            alt={item.title}
                            width={300}
                            height={400}
                            className="w-full h-full object-cover"
                            sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 300px"
                          />
                        </div>
                        <p className="text-xs mt-1 line-clamp-2">{item.title}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {viewerOpen && (
        <MediaViewerOverlay
          items={photos}
          initialIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
          onLoadMore={() => loadPhotos()}
        />
      )}
      {funViewerOpen && (
        <MediaViewerOverlay
          items={funViewerItems}
          initialIndex={funViewerIndex}
          onClose={() => setFunViewerOpen(false)}
          onLoadMore={async () => {
            if (!funViewerSlug) return
            const res = await fetch(`/api/fun-series/${funViewerSlug}?limit=20&offset=${funOffset}`)
            const json = await res.json()
            if (json.success) {
              const next = json.data.items || []
              if (next.length > 0) {
                setFunViewerItems(prev => [...prev, ...next])
                setFunOffset(prev => prev + 20)
              }
            }
          }}
        />
      )}
    </div>
    </PullToRefresh>
  )
}

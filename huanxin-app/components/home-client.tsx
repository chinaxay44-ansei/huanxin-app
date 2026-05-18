"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Heart, MessageCircle, Share2, Play, ChevronRight, Sparkles, Camera, Video, Zap, Search } from "lucide-react"
import MediaViewerOverlay from "@/components/media-viewer-overlay"
import type { WorkWithUser } from "@/lib/api/client-works"
import { getWorksList } from "@/lib/api/client-works"
import { useAuth } from "@/lib/auth"

interface HomeClientProps {
  initialCategories: { id: string; name: string; slug: string }[]
  initialPhotos: WorkWithUser[]
}

export default function HomeClient({ initialCategories, initialPhotos }: HomeClientProps) {
  const { isAuthenticated, user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState("ai-photo")
  const [activeCategory, setActiveCategory] = useState("discover")
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [photos, setPhotos] = useState<WorkWithUser[]>(initialPhotos || [])
  const [categories, setCategories] = useState<any[]>(initialCategories || [])
  const [page, setPage] = useState(2)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())

  const openMediaViewer = (index: number) => {
    setViewerIndex(index)
    setViewerOpen(true)
  }

  const visibleCategories = showAllCategories ? categories : categories.slice(0, 5)

  const loadPhotos = async (reset = false) => {
    if (loading) return
    setLoading(true)
    setLoadError(null)
    try {
      const currentPage = reset ? 1 : page
      const offset = (currentPage - 1) * 20
      const categoryId = activeCategory === "discover" ? undefined : activeCategory
      const response = await getWorksList({
        categoryId,
        type: 'image',
        limit: 20,
        offset,
        sortBy: 'random',
        sortOrder: 'desc'
      })
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
      } else {
        const uniqueBatch = response.data.filter(item => {
          if (seenIdsRef.current.has(item.id)) return false
          seenIdsRef.current.add(item.id)
          return true
        })
        if (uniqueBatch.length > 0) {
          setPhotos(prev => [...prev, ...uniqueBatch])
        }
        setPage(prev => prev + 1)
      }
      setHasMore(response.hasMore)
    } catch {
      setLoadError('作品加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (categories.length > 0) {
      loadPhotos(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">焕星</h1>
          <div className="flex items-center gap-4">
            <div className="text-xs text-muted-foreground">
              {authLoading ? "加载中.." : isAuthenticated ? "已登录" : "未登录"}
            </div>
            <div className="flex items-center gap-1 text-sm font-medium">
              <Zap className="w-4 h-4" />
              <span>60</span>
            </div>
            <Link href="/search" prefetch>
              <Search className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 p-4">
        <Link href="/generate" prefetch className="h-28 flex flex-col items-start justify-center gap-2 border-2 bg-card rounded-2xl hover:bg-accent transition-all shadow-sm">
          <span className="text-lg font-bold text-foreground">万能换装</span>
          <span className="text-xs text-muted-foreground font-normal">换脸、换人、换背景</span>
        </Link>
        <Link href="/generate" prefetch className="h-28 flex flex-col items-start justify-center gap-2 border-2 bg-card rounded-2xl hover:bg-accent transition-all shadow-sm">
          <span className="text-lg font-bold text-foreground">一键出片</span>
          <span className="text-xs text-muted-foreground font-normal">AI修图、去水印、高清</span>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
        <TabsList className="w-full grid grid-cols-2 h-12 bg-muted rounded-full p-1">
          <TabsTrigger value="ai-photo" className="rounded-full data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm font-medium">写真</TabsTrigger>
          <TabsTrigger value="fun-mode" className="rounded-full data-[state=active]:bg-brand data-[state=active]:text-brand-foreground data-[state=active]:shadow-sm font-medium">专题</TabsTrigger>
        </TabsList>

        <TabsContent value="ai-photo" className="mt-4">
          <div className="mb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {visibleCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeCategory === category.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent"
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

          <div className="columns-2 gap-4">
            <div className="mb-4 break-inside-avoid">
              <Image src="/placeholder.svg" alt="轮播占位" width={300} height={400} className="w-full h-auto rounded-lg" />
              <p className="text-sm mt-1 font-semibold truncate">轮播占位</p>
            </div>
            {photos.map((photo, index) => (
              <div key={photo.id} className="mb-4 break-inside-avoid cursor-pointer" onClick={() => openMediaViewer(index)}>
                {photo.media_type === 'video' ? (
                  <video src={photo.media_url} className="w-full h-auto rounded-lg" autoPlay muted loop playsInline />
                ) : (
                  <Image src={photo.thumbnail_url || photo.media_url} alt={photo.title || '焕星生成'} width={300} height={400} className="w-full h-auto rounded-lg" />
                )}
                <p className="text-sm mt-1 font-semibold truncate">{photo.title}</p>
              </div>
            ))}
          </div>
          <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
            {loading && <div className="text-sm text-muted-foreground">加载中..</div>}
          </div>
        </TabsContent>

        <TabsContent value="fun-mode" className="mt-4">
          <div className="space-y-6">
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold">为你推荐</h2>
                <button className="text-sm text-muted-foreground">{">"}</button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {funModes.map((mode) => (
                  <Link key={mode.id} href="/video" prefetch className="cursor-pointer">
                    <div className="relative rounded-xl overflow-hidden bg-muted aspect-[3/4] shadow-sm">
                      <Image src={mode.image || "/placeholder.svg"} alt={mode.title} width={300} height={400} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs mt-1 line-clamp-2">{mode.title}</p>
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold">大家都在玩 Cortis 风格？</h2>
                <button className="text-sm text-muted-foreground">{">"}</button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {cortisThemes.map((theme) => (
                  <Link key={theme.id} href="/video" prefetch className="cursor-pointer">
                    <div className="relative rounded-xl overflow-hidden bg-muted aspect-[3/4] shadow-sm">
                      <Image src={theme.image || "/placeholder.svg"} alt="" width={300} height={400} className="w-full h-full object-cover" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
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
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import MediaViewerOverlay from "@/components/media-viewer-overlay"

export default function FunPage() {
  const [series, setSeries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerItems, setViewerItems] = useState<any[]>([])
  const [viewerIndex, setViewerIndex] = useState(0)
  const [currentSlug, setCurrentSlug] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const limit = 20

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/fun-series?items_limit=6')
        const json = await res.json()
        if (json.success) setSeries(json.data || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const openViewer = (slug: string, items: any[], index: number) => {
    setCurrentSlug(slug)
    setViewerItems(items)
    setViewerIndex(index)
    setOffset(items.length)
    setViewerOpen(true)
  }

  const loadMore = async () => {
    if (!currentSlug) return
    const res = await fetch(`/api/fun-series/${currentSlug}?limit=${limit}&offset=${offset}`)
    const json = await res.json()
    if (json.success) {
      const next = json.data.items || []
      if (next.length > 0) {
        setViewerItems(prev => [...prev, ...next])
        setOffset(prev => prev + limit)
      }
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <h1 className="text-lg font-bold">趣味玩法</h1>
      </header>
      <div className="p-4 space-y-8">
        {loading ? (
          <div className="text-center text-muted-foreground">加载中...</div>
        ) : (
          series.map(s => (
            <section key={s.id}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold">{s.title}</h2>
                <Link href={`/fun/${s.slug}`} prefetch className="text-sm text-muted-foreground">更多</Link>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {s.items.map((item: any, idx: number) => (
                  <div key={item.id} className="cursor-pointer" onClick={() => openViewer(s.slug, s.items, idx)}>
                    <div className="relative rounded-xl overflow-hidden bg-muted aspect-[3/4] shadow-sm">
                      <Image src={item.thumbnail_url || item.media_url || '/placeholder.svg'} alt={item.title} width={300} height={400} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-xs mt-1 line-clamp-2">{item.title}</p>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {viewerOpen && (
        <MediaViewerOverlay
          items={viewerItems}
          initialIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
          onLoadMore={loadMore}
        />
      )}
    </div>
  )
}

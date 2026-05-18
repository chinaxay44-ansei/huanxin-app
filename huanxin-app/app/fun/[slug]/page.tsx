"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import MediaViewerOverlay from "@/components/media-viewer-overlay"

export default function FunSeriesDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [series, setSeries] = useState<any | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [offset, setOffset] = useState(0)
  const limit = 20

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/fun-series/${params?.slug}?limit=${limit}&offset=0`)
        const json = await res.json()
        if (json.success) {
          setSeries(json.data.series)
          const initial = json.data.items || []
          setItems(initial)
          setOffset(initial.length)
        } else {
          // fallback: use list endpoint to resolve series by slug
          const res2 = await fetch('/api/fun-series?items_limit=20')
          const json2 = await res2.json()
          if (json2.success) {
            const s = (json2.data || []).find((x: any) => x.slug === params?.slug)
            if (s) {
              setSeries(s)
              setItems(s.items || [])
              setOffset((s.items || []).length)
            }
          }
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params?.slug])

  const openMediaViewer = (index: number) => {
    setViewerIndex(index)
    setViewerOpen(true)
  }

  const loadMore = async () => {
    const res = await fetch(`/api/fun-series/${params?.slug}?limit=${limit}&offset=${offset}`)
    const json = await res.json()
    if (json.success) {
      const next = json.data.items || []
      if (next.length > 0) {
        setItems(prev => [...prev, ...next])
        setOffset(prev => prev + limit)
      }
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} aria-label="返回" className="p-2 -ml-2 rounded-full hover:bg-muted">返回</button>
          <h1 className="text-lg font-bold">{series?.title || '专题'}</h1>
        </div>
      </header>
      <div className="p-4">
        {loading ? (
          <div className="text-center text-muted-foreground">加载中...</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item: any, idx: number) => (
              <div key={item.id} className="cursor-pointer" onClick={() => openMediaViewer(idx)}>
                <div className="relative rounded-xl overflow-hidden bg-muted aspect-[3/4] shadow-sm">
                  <Image src={item.thumbnail_url || item.media_url || '/placeholder.svg'} alt={item.title} width={300} height={400} className="w-full h-full object-cover" />
                </div>
                <p className="text-xs mt-1 line-clamp-2">{item.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewerOpen && (
        <MediaViewerOverlay
          items={items}
          initialIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
          onLoadMore={loadMore}
        />
      )}
    </div>
  )
}

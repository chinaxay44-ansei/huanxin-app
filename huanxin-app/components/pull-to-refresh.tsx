"use client"

import { useRef, useState } from "react"

export default function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void> | void, children: any }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pulling, setPulling] = useState(false)
  const [distance, setDistance] = useState(0)
  const threshold = 60
  const isAtTop = () => {
    const el = ref.current
    const elTop = el ? (el.scrollTop || 0) : 0
    const winTop = typeof window !== 'undefined' ? window.scrollY || 0 : 0
    return elTop <= 1 && winTop <= 1
  }

  const onTouchStart = (e: React.TouchEvent) => {
    // 播放器打开时禁用下拉刷新
    if (document.body.classList.contains('viewer-open')) return

    const t = e.touches?.[0] || e.changedTouches?.[0]
    const y = t ? Number(t.clientY) : 0
    ;(ref.current as any)._startY = y
    // 只有滚动容器在顶部时才允许开始下拉，避免在列表中途误触发刷新
    ;(ref.current as any)._pulling = isAtTop()
  }

  const onTouchMove = (e: React.TouchEvent) => {
    // 播放器打开时禁用下拉刷新
    if (document.body.classList.contains('viewer-open')) return

    const startY = Number((ref.current as any)._startY) || 0
    const t = e.touches?.[0] || e.changedTouches?.[0]
    const y = t ? Number(t.clientY) : 0
    const dy = y - startY
    // 只有在顶部向下拖动时才进入下拉逻辑
    const canPull = (ref.current as any)._pulling && dy > 0 && isAtTop()
    if (!canPull) return
    setPulling(true)
    setDistance(Math.min(dy, 120))
    e.preventDefault()
  }

  const onTouchEnd = async () => {
    // 播放器打开时禁用下拉刷新
    if (document.body.classList.contains('viewer-open')) {
      setPulling(false)
      setDistance(0)
      return
    }

    if (pulling && distance >= threshold) {
      setDistance(0)
      setPulling(false)
      await onRefresh()
    } else {
      setDistance(0)
      setPulling(false)
    }
  }

  return (
    <div
      ref={ref}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      <div style={{ height: pulling ? distance : 0, transition: 'height 150ms' }}>
        {pulling && (
          <div style={{ height: 50 }} className="flex items-center justify-center text-sm text-muted-foreground">释放刷新</div>
        )}
      </div>
      {children}
    </div>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { ChevronRight, ChevronDown } from "lucide-react"
import { useEffect, useState } from "react"
import { AuthGuard } from "@/components/auth-guard"

const INDENT_STEP = 24

type OpenMap = Record<string, boolean>

type DirectoryNodeProps = {
  node: any
  all: any[]
  level?: number
  openMap: OpenMap
  onToggle: (id: string) => void
  onEnter: (id: string) => void
}

export default function GeneratePage() {
  return (
    <AuthGuard>
      <GenerateContent />
    </AuthGuard>
  )
}

function GenerateContent() {
  const router = useRouter()
  const [features, setFeatures] = useState<any[]>([])
  const [openMap, setOpenMap] = useState<OpenMap>({})

  const persistState = () => {
    if (typeof window === 'undefined') return
    sessionStorage.setItem('generateFeatures', JSON.stringify(features))
    sessionStorage.setItem('generateOpen', JSON.stringify(openMap))
    sessionStorage.setItem('generateScroll', String(window.scrollY || 0))
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const cachedFeatures = sessionStorage.getItem('generateFeatures')
    const cachedOpen = sessionStorage.getItem('generateOpen')
    const cachedScroll = sessionStorage.getItem('generateScroll')
    if (cachedFeatures) {
      try {
        setFeatures(JSON.parse(cachedFeatures))
      } catch {}
    }
    if (cachedOpen) {
      try {
        setOpenMap(JSON.parse(cachedOpen))
      } catch {}
    }
    if (cachedScroll) {
      const pos = Number(cachedScroll) || 0
      requestAnimationFrame(() => window.scrollTo(0, pos))
    }
    const load = async () => {
      try {
        const res = await fetch('/api/generation-features')
        const json = await res.json()
        if (json?.success && Array.isArray(json.data)) setFeatures(json.data)
      } catch {}
    }
    load()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    sessionStorage.setItem('generateFeatures', JSON.stringify(features))
  }, [features])

  useEffect(() => {
    if (typeof window === 'undefined') return
    sessionStorage.setItem('generateOpen', JSON.stringify(openMap))
  }, [openMap])

  const handleEnter = (id: string) => {
    persistState()
    router.push(`/generate/feature/${id}`)
  }

  const handleToggle = (id: string) => {
    setOpenMap((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-4">
        <h1 className="text-xl font-bold">生成模式</h1>
      </header>

      <div className="p-4 space-y-3">
        {features.length > 0 && (
          <div className="space-y-2">
            {(() => {
              const active = features.filter((f: any) => f.is_active)
              const roots = active.filter((f: any) => f.is_directory && !f.parent_id)
              const root = roots.length === 1 ? roots[0] : null
              const display = root ? active.filter((f: any) => f.parent_id === root.id) : roots
              const dirs = display.filter((f: any) => f.is_directory)
              const items = display.filter((f: any) => !f.is_directory)
              return (
                <>
                  {dirs.map((dir: any) => (
                    <DirectoryNode
                      key={dir.id}
                      node={dir}
                      all={features}
                      openMap={openMap}
                      onToggle={handleToggle}
                      onEnter={handleEnter}
                    />
                  ))}
                  {items.map((item: any) => (
                    <button
                      key={item.id}
                      onClick={() => handleEnter(item.id)}
                      className="w-full bg-card rounded-2xl p-4 flex items-center gap-3 hover:bg-accent transition-all shadow-[-6px_0_15px_-6px_rgba(34,197,94,0.3)] dark:shadow-[-6px_0_15px_-6px_rgba(34,197,94,0.15)] border border-zinc-200/50 dark:border-zinc-800/50"
                    >
                      <span className="flex-1 text-left text-base text-foreground">{item.name}</span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </>
              )
            })()}
          </div>
        )}
      </div>

    </div>
  )
}

function DirectoryNode({ node, all, level = 0, openMap, onToggle, onEnter }: DirectoryNodeProps) {
  const children = all.filter((x) => x.parent_id === node.id)
  const subDirs = children.filter((x) => x.is_directory)
  const items = children.filter((x) => !x.is_directory)
  const indentStyle = level > 0 ? { paddingLeft: level * INDENT_STEP } : undefined
  const open = !!openMap[node.id]

  return (
    <div className="space-y-2" style={indentStyle}>
      <button 
        onClick={() => onToggle(node.id)} 
        className="w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl p-4 flex items-center gap-3 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all shadow-none border border-zinc-200/50 dark:border-zinc-700/30"
      >
        <span className="flex-1 text-left text-base text-foreground font-medium">{node.name}</span>
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2">
          {subDirs.map((sd: any) => (
            <DirectoryNode
              key={sd.id}
              node={sd}
              all={all}
              level={level + 1}
              openMap={openMap}
              onToggle={onToggle}
              onEnter={onEnter}
            />
          ))}
          {items.map((item: any) => (
            <div key={item.id} style={{ paddingLeft: (level + 1) * INDENT_STEP }}>
              <button 
                onClick={() => onEnter(item.id)} 
                className="w-full bg-card rounded-2xl p-4 flex items-center gap-3 hover:bg-accent transition-all shadow-[-6px_0_15px_-6px_rgba(34,197,94,0.3)] dark:shadow-[-6px_0_15px_-6px_rgba(34,197,94,0.15)] border border-zinc-200/50 dark:border-zinc-800/50"
              >
                <span className="flex-1 text-left text-base text-foreground">{item.name}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

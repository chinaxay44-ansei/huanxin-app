"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Plus, Trash2, Mic } from "lucide-react"
import MediaViewerOverlay from "@/components/media-viewer-overlay"
import { useRouter } from "next/navigation"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { authFetch } from "@/lib/client-auth-fetch"

type AvatarItem = { id: string; name: string; avatar_url: string; front_face_url?: string }
type OutfitItem = { id: string; image_url: string; title?: string; created_at?: string }
type AssetItem = { id: string; image_url: string; title?: string; created_at?: string }

export default function AvatarManagementPage() {
  const router = useRouter()

  const [avatars, setAvatars] = useState<AvatarItem[]>([])
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null)
  const [outfits, setOutfits] = useState<OutfitItem[]>([])
  const [loadingAvatars, setLoadingAvatars] = useState(false)
  const [loadingOutfits, setLoadingOutfits] = useState(false)
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [manageMode, setManageMode] = useState(false)

  const [outfitViewerOpen, setOutfitViewerOpen] = useState(false)
  const [outfitViewerIndex, setOutfitViewerIndex] = useState(0)
  const [assetViewerOpen, setAssetViewerOpen] = useState(false)
  const [assetViewerIndex, setAssetViewerIndex] = useState(0)
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false)
  const [avatarViewerIndex, setAvatarViewerIndex] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmType, setConfirmType] = useState<null | 'avatar' | 'outfit' | 'asset'>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  // 加载用户的形象列表
  useEffect(() => {
    const run = async () => {
      try {
        setLoadingAvatars(true)
        const res = await authFetch("/api/ai/avatars?limit=100")
        const json = await res.json()
        if (json?.success && Array.isArray(json?.data)) {
          setAvatars(json.data)
          // 默认选中第一个真实形象（排除占位）
          if (json.data.length > 0) {
            setSelectedAvatarId(json.data[0].id)
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingAvatars(false)
      }
    }
    run()
  }, [])

  // 加载当前选中形象的穿搭
  useEffect(() => {
    const run = async () => {
      if (!selectedAvatarId) {
        setOutfits([])
        return
      }
      try {
        setLoadingOutfits(true)
        const res = await authFetch(`/api/outfits?avatarId=${selectedAvatarId}`)
        const json = await res.json()
        if (json?.success && Array.isArray(json?.data)) {
          setOutfits(json.data)
        } else {
          setOutfits([])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingOutfits(false)
      }
    }
    run()
  }, [selectedAvatarId])

  // 加载所有资产（与形象无关）
  useEffect(() => {
    const run = async () => {
      try {
        setLoadingAssets(true)
        const res = await authFetch('/api/assets?limit=200')
        const json = await res.json()
        if (json?.success && Array.isArray(json?.data)) {
          setAssets(json.data)
        } else {
          setAssets([])
        }
      } catch (e) {}
      finally { setLoadingAssets(false) }
    }
    run()
  }, [])

  const selectedAvatar = useMemo(
    () => avatars.find((a) => a.id === selectedAvatarId) || null,
    [avatars, selectedAvatarId]
  )

  const faceUrl = selectedAvatar?.front_face_url || selectedAvatar?.avatar_url || "/placeholder-user.jpg"

  // 删除穿搭（带二次确认）
  const handleDeleteOutfit = (outfitId: string) => {
    setConfirmType('outfit')
    setConfirmId(outfitId)
    setConfirmOpen(true)
  }

  // 删除形象（带二次确认，级联删除其所有穿搭）
  const handleDeleteAvatar = (avatarId: string) => {
    setConfirmType('avatar')
    setConfirmId(avatarId)
    setConfirmOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()}>
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">形象管理</h1>
          </div>
          <div>
            <Button
              variant={manageMode ? 'destructive' : 'secondary'}
              className="h-8 px-3 rounded-full"
              onClick={() => setManageMode((v) => !v)}
            >
              {manageMode ? '完成' : '管理'}
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* 头像选择行 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">形象</h2>
            <Button
              variant="ghost"
              className="h-8 px-3 rounded-full flex items-center gap-1 bg-background hover:bg-background text-foreground"
              onClick={() => alert('功能开发中，敬请期待')}
            >
              <Mic className="w-4 h-4" /> 我的歌声
            </Button>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {/* 新建形象占位 */}
            <button
              onClick={() => router.push("/avatar-management/new")}
              className="flex-shrink-0 w-20 h-20 rounded-2xl border border-dashed border-muted-foreground/40 flex items-center justify-center bg-muted hover:bg-muted/80"
            >
              <Plus className="w-6 h-6 text-brand" />
            </button>
            {/* 已有形象 */}
            {loadingAvatars && avatars.length === 0 ? (
              <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-muted animate-pulse" />
            ) : (
              avatars.map((a, idx) => (
                <div
                  key={a.id}
                  className={`flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden relative ${
                    selectedAvatarId === a.id ? "ring-2 ring-green-300" : ""
                  }`}
                >
                  <button
                    onClick={() => {
                      if (selectedAvatarId !== a.id) {
                        setSelectedAvatarId(a.id)
                      } else {
                        setAvatarViewerIndex(idx)
                        setAvatarViewerOpen(true)
                      }
                    }}
                    className="absolute inset-0"
                    aria-label={a.name}
                  />
                  <img
                    src={a.front_face_url || a.avatar_url || "/placeholder-user.jpg"}
                    alt={a.name}
                    className="w-full h-full object-cover object-top"
                  />
                  {manageMode && (
                    <button
                      onClick={() => handleDeleteAvatar(a.id)}
                      className="absolute top-1 right-1 p-1.5 rounded-full bg-red-600 text-white shadow"
                      aria-label="删除形象"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>


        {/* 穿搭固定尺寸网格（点击查看原图并支持保存） */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">穿搭</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* 新建穿搭占位（需要选中形象） */}
            <button
              disabled={!selectedAvatarId}
              onClick={() => selectedAvatarId && router.push(`/avatar-management/${selectedAvatarId}/new-outfit`)}
              className="w-full aspect-[3/4] rounded-2xl border border-dashed border-muted-foreground/40 flex items-center justify-center bg-muted hover:bg-muted/80 disabled:opacity-50"
            >
              <span className="flex items-center gap-1 text-brand text-sm"><Plus className="w-4 h-4" /> 新建穿搭</span>
            </button>

            {/* 已有穿搭图片（固定 4:3 尺寸缩略） */}
            {loadingOutfits && outfits.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-full aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
              ))
            ) : (
              outfits.map((o) => (
                <div key={o.id} className="w-full aspect-[3/4] rounded-2xl overflow-hidden relative">
                  <button
                    onClick={() => { setOutfitViewerIndex(outfits.findIndex(x => x.id === o.id)); setOutfitViewerOpen(true) }}
                    className="absolute inset-0"
                    aria-label={o.title || '查看原图'}
                  />
                  <img src={o.image_url} alt={o.title || ''} className="w-full h-full object-cover" />
                  {manageMode && (
                    <button
                      onClick={() => handleDeleteOutfit(o.id)}
                      className="absolute top-2 right-2 p-2 rounded-full bg-red-600 text-white shadow"
                      aria-label="删除穿搭"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

        {/* 原图查看与保存覆盖层 */}
        {outfitViewerOpen && (
          <MediaViewerOverlay
            items={outfits.map(o => ({ id: o.id, media_url: o.image_url, thumbnail_url: o.image_url, title: o.title || '', user: { id: '', nickname: '' } } as any))}
            initialIndex={outfitViewerIndex}
            onClose={() => setOutfitViewerOpen(false)}
          />
        )}
        {/* 形象大图查看 */}
        {avatarViewerOpen && (
          <MediaViewerOverlay
            items={avatars.map(av => ({ id: av.id, media_url: (av.front_face_url || av.avatar_url), thumbnail_url: (av.front_face_url || av.avatar_url), title: av.name || '', user: { id: '', nickname: '' } } as any))}
            initialIndex={avatarViewerIndex}
            onClose={() => setAvatarViewerOpen(false)}
          />
        )}
        </section>

        {/* 资产固定尺寸网格（不与形象关联，展示所有） */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">资产</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
              onClick={() => router.push('/avatar-management/new-asset')}
              className="w-full aspect-[3/4] rounded-2xl border border-dashed border-muted-foreground/40 flex items-center justify-center bg-muted hover:bg-muted/80"
            >
              <span className="flex items-center gap-1 text-brand text-sm"><Plus className="w-4 h-4" /> 新建资产</span>
            </button>

            {loadingAssets && assets.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-full aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
              ))
            ) : (
              assets.map((a) => (
                <div key={a.id} className="w-full aspect-[3/4] rounded-2xl overflow-hidden relative">
                  <button
                    onClick={() => { setAssetViewerIndex(assets.findIndex(x => x.id === a.id)); setAssetViewerOpen(true) }}
                    className="absolute inset-0"
                    aria-label={a.title || '查看原图'}
                  />
                  <img src={a.image_url} alt={a.title || ''} className="w-full h-full object-cover" />
                  {manageMode && (
                    <button
                      onClick={() => { setConfirmType('asset'); setConfirmId(a.id); setConfirmOpen(true) }}
                      className="absolute top-2 right-2 p-2 rounded-full bg-red-600 text-white shadow"
                      aria-label="删除资产"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
        {assetViewerOpen && (
          <MediaViewerOverlay
            items={assets.map(o => ({ id: o.id, media_url: o.image_url, thumbnail_url: o.image_url, title: o.title || '', user: { id: '', nickname: '' } } as any))}
            initialIndex={assetViewerIndex}
            onClose={() => setAssetViewerOpen(false)}
          />
        )}

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmType === 'avatar' ? '确认删除该形象及其全部穿搭？' : confirmType === 'outfit' ? '确认删除该穿搭？' : '确认删除该资产？'}</AlertDialogTitle>
              <AlertDialogDescription>请确认操作</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setConfirmOpen(false); setConfirmId(null); setConfirmType(null) }}>取消</AlertDialogCancel>
              <AlertDialogAction onClick={async (e) => {
                e.preventDefault()
                if (!confirmId || !confirmType) return
                try {
                  const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
                  if (confirmType === 'avatar') {
                    const res = await fetch(`/api/ai/avatars?id=${encodeURIComponent(confirmId)}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, credentials: 'include' })
                    const json = await res.json()
                    if (!json?.success) throw new Error(json?.message || '删除失败')
                    setAvatars((prev) => prev.filter((a) => a.id !== confirmId))
                    setOutfits((prev) => prev.filter((o) => o.id !== confirmId))
                    setSelectedAvatarId((prev) => { if (prev === confirmId) { const next = avatars.find((a) => a.id !== confirmId)?.id || null; return next } return prev })
                  } else if (confirmType === 'outfit') {
                    const res = await fetch(`/api/outfits?id=${encodeURIComponent(confirmId)}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, credentials: 'include' })
                    const json = await res.json()
                    if (!json?.success) throw new Error(json?.message || '删除失败')
                    setOutfits((prev) => prev.filter((o) => o.id !== confirmId))
                  } else if (confirmType === 'asset') {
                    const res = await fetch(`/api/assets?id=${encodeURIComponent(confirmId)}`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, credentials: 'include' })
                    const json = await res.json()
                    if (!json?.success) throw new Error(json?.message || '删除失败')
                    setAssets((prev) => prev.filter((x) => x.id !== confirmId))
                  }
                  setConfirmOpen(false); setConfirmId(null); setConfirmType(null)
                } catch (e: any) {
                  alert(e?.message || '删除失败，请稍后重试')
                  setConfirmOpen(false); setConfirmId(null); setConfirmType(null)
                }
              }}>继续</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

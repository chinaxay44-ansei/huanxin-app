"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN || ""

export default function AdminFunSeriesItemsPage() {
  const params = useParams()
  const seriesId = useMemo(() => String(params?.id || ''), [params])
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [works, setWorks] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 12
  const [statusFilter, setStatusFilter] = useState<string>('none')
  const [visibilityFilter, setVisibilityFilter] = useState<string>('none')

  const fetchItems = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/fun-series/items?series_id=${seriesId}`, { headers: { 'x-admin-token': ADMIN_TOKEN } })
    const json = await res.json()
    if (res.ok) setItems(json.items || [])
    setLoading(false)
  }

  const fetchWorks = async (p = page) => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(p))
    params.set('limit', String(limit))
    if (search.trim()) params.set('search', search.trim())
    if (statusFilter !== 'none') params.set('status', statusFilter)
    if (visibilityFilter !== 'none') params.set('visibility', visibilityFilter)
    const res = await fetch(`/api/admin/works?${params.toString()}`, { headers: { 'x-admin-token': ADMIN_TOKEN } })
    const json = await res.json()
    if (res.ok) {
      setWorks(json.items || [])
      setTotal(json.total || 0)
      setPage(json.page || p)
    }
    setLoading(false)
  }

  useEffect(() => { if (seriesId) { fetchItems(); fetchWorks(1) } }, [seriesId])

  const addWork = async (workId: string, title?: string, thumb?: string) => {
    await fetch('/api/admin/fun-series/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
      body: JSON.stringify({ series_id: seriesId, work_id: workId, title_override: title, cover_url_override: thumb })
    })
    fetchItems()
  }

  const removeItem = async (id: string) => {
    await fetch(`/api/admin/fun-series/items?id=${id}`, { method: 'DELETE', headers: { 'x-admin-token': ADMIN_TOKEN } })
    fetchItems()
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">专题作品管理</h1>
        <p className="text-sm text-muted-foreground mt-1">为专题添加或移除作品，支持标题与封面覆盖</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="搜索作品标题..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 border rounded px-3 text-sm">
          <option value="none">状态(全部)</option>
          <option value="published">已发布</option>
          <option value="draft">草稿</option>
        </select>
        <select value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value)} className="h-10 border rounded px-3 text-sm">
          <option value="none">可见性(全部)</option>
          <option value="public">公开</option>
          <option value="private">私密</option>
        </select>
        <Button onClick={() => fetchWorks(1)} disabled={loading}>{loading ? '加载中...' : '搜索/筛选'}</Button>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left">封面</th>
              <th className="p-3 text-left">标题</th>
              <th className="p-3 text-left">类型</th>
              <th className="p-3 text-left">可见性</th>
              <th className="p-3 text-left">状态</th>
              <th className="p-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {works.map(w => (
              <tr key={w.id} className="border-t">
                <td className="p-3">
                  <div className="w-20 h-14 rounded overflow-hidden bg-muted">
                    <img src={w.thumbnail_url || '/placeholder.svg'} alt={w.title || ''} className="w-full h-full object-cover" />
                  </div>
                </td>
                <td className="p-3 max-w-[260px]">
                  <div className="font-medium line-clamp-2" title={w.title || ''}>{w.title || '未命名'}</div>
                </td>
                <td className="p-3 text-muted-foreground">{w.type || '未知'}</td>
                <td className="p-3 text-muted-foreground">{w.visibility || '未知'}</td>
                <td className="p-3 text-muted-foreground">{w.status || '未知'}</td>
                <td className="p-3">
                  <Button variant="outline" size="sm" onClick={() => addWork(w.id, w.title, w.thumbnail_url)}>添加到专题</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span>第 {page} 页 / 共 {Math.max(1, Math.ceil(total / limit))} 页</span>
        <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => fetchWorks(page - 1)}>上一页</Button>
        <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit) || loading} onClick={() => fetchWorks(page + 1)}>下一页</Button>
      </div>

      <div>
        <h2 className="text-sm font-medium mb-2">已在专题中的作品</h2>
        <div className="border rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left">封面</th>
                <th className="p-3 text-left">标题</th>
                <th className="p-3 text-left">类型</th>
                <th className="p-3 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} className="border-t">
                  <td className="p-3">
                    <div className="w-20 h-14 rounded overflow-hidden bg-muted">
                      <img src={it.cover_url_override || it.works?.thumbnail_url || '/placeholder.svg'} className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="p-3 max-w-[260px]">
                    <div className="text-sm font-medium line-clamp-2">{it.title_override || it.works?.title || '未命名'}</div>
                  </td>
                  <td className="p-3 text-muted-foreground">{it.works?.type || '未知'}</td>
                  <td className="p-3">
                    <Button variant="destructive" size="sm" onClick={() => removeItem(it.id)}>移除</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN || ""

export default function AdminFunSeriesPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [cover, setCover] = useState("")

  const fetchItems = async (p = 1) => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(p), limit: String(20), ...(search ? { search } : {}) }).toString()
    const res = await fetch(`/api/admin/fun-series?${qs}`, { headers: { 'x-admin-token': ADMIN_TOKEN } })
    const json = await res.json()
    if (res.ok) {
      setItems(json.items || [])
      setTotal(json.total || 0)
      setPage(p)
    }
    setLoading(false)
  }

  useEffect(() => { fetchItems(1) }, [])

  const createSeries = async () => {
    if (!title || !slug) return
    setLoading(true)
    const res = await fetch('/api/admin/fun-series', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
      body: JSON.stringify({ title, slug, cover_url: cover })
    })
    if (res.ok) {
      setTitle("")
      setSlug("")
      setCover("")
      fetchItems(page)
    }
    setLoading(false)
  }

  const toggleActive = async (id: string, is_active: boolean) => {
    await fetch('/api/admin/fun-series', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
      body: JSON.stringify({ id, is_active: !is_active })
    })
    fetchItems(page)
  }

  const removeSeries = async (id: string) => {
    await fetch(`/api/admin/fun-series?id=${id}`, { method: 'DELETE', headers: { 'x-admin-token': ADMIN_TOKEN } })
    fetchItems(page)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">趣味玩法专题管理</h1>
        <p className="text-sm text-muted-foreground mt-1">配置首页趣味玩法的系列专题与映射作品</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="搜索专题标题..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        <Button onClick={() => fetchItems(1)} disabled={loading}>{loading ? '加载中...' : '搜索'}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input placeholder="专题标题" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="专题slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <Input placeholder="封面URL" value={cover} onChange={(e) => setCover(e.target.value)} />
        <div className="md:col-span-3">
          <Button onClick={createSeries} disabled={loading || !title || !slug}>创建专题</Button>
        </div>
      </div>

      <div className="border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left">标题</th>
              <th className="p-3 text-left">slug</th>
              <th className="p-3 text-left">状态</th>
              <th className="p-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t">
                <td className="p-3">{it.title}</td>
                <td className="p-3">{it.slug}</td>
                <td className="p-3">{it.is_active ? '启用' : '停用'}</td>
                <td className="p-3 flex items-center gap-2">
                  <Link href={`/admin/fun-series/${it.id}/items`} className="px-3 py-1 border rounded">管理作品</Link>
                  <Button variant="outline" onClick={() => toggleActive(it.id, it.is_active)}>切换状态</Button>
                  <Button variant="destructive" onClick={() => removeSeries(it.id)}>删除</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

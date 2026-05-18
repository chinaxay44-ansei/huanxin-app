"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN || ""

export default function AdminGenerationFeaturesPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")

  const updateItem = (id: string, patch: Partial<any>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const fetchItems = async () => {
    setLoading(true)
    const qs = new URLSearchParams({ page: '1', limit: String(1000) }).toString()
    const res = await fetch(`/api/admin/generation-features?${qs}`, { headers: { 'x-admin-token': ADMIN_TOKEN } })
    const json = await res.json()
    if (res.ok) {
      const list = json.items || []
      const filtered = search.trim() ? list.filter((x: any) => (x.name || '').includes(search.trim())) : list
      setItems(filtered)
    }
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  // 新增表单
  const [newItem, setNewItem] = useState<any>({ name: '', slug: '', is_directory: false, parent_id: '' })
  const addItem = async () => {
    if (!newItem.name || !newItem.slug) return
    const res = await fetch('/api/admin/generation-features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
      body: JSON.stringify({ name: newItem.name, slug: newItem.slug, is_directory: !!newItem.is_directory, parent_id: newItem.parent_id || null, is_active: true, sort_order: 100 })
    })
    if (res.ok) { setNewItem({ name: '', slug: '', is_directory: false, parent_id: '' }); fetchItems() }
  }

  const saveItem = async (item: any) => {
    const res = await fetch('/api/admin/generation-features', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
      body: JSON.stringify(item)
    })
    if (res.ok) fetchItems()
  }

  const deleteItem = async (id: string) => {
    if (!window.confirm('确认删除该功能？')) return
    const res = await fetch(`/api/admin/generation-features?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': ADMIN_TOKEN },
    })
    if (res.ok) fetchItems()
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Generation Features</h1>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search feature name" className="w-48" />
          <Button onClick={() => fetchItems()} disabled={loading}>Search</Button>
          <Button onClick={addItem}>Add Feature</Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-3 border rounded">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <Input placeholder="功能名" value={newItem.name} onChange={(e) => setNewItem((p: any) => ({ ...p, name: e.target.value }))} />
          <Input placeholder="Slug（唯一）" value={newItem.slug} onChange={(e) => setNewItem((p: any) => ({ ...p, slug: e.target.value }))} />
          <select className="border rounded h-9 px-2" value={newItem.parent_id} onChange={(e) => setNewItem((p: any) => ({ ...p, parent_id: e.target.value }))}>
            <option value="">无父级（顶层）</option>
            {items.filter((x) => !!x.is_active).filter((x) => x.is_directory).map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
          <select className="border rounded h-9 px-2" value={newItem.is_directory ? 'dir' : 'feature'} onChange={(e) => setNewItem((p: any) => ({ ...p, is_directory: e.target.value === 'dir' }))}>
            <option value="feature">功能</option>
            <option value="dir">目录</option>
          </select>
          <Button onClick={addItem}>新增</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">封面</th>
                <th className="p-2">名称</th>
                <th className="p-2">Slug</th>
                <th className="p-2">类型</th>
                <th className="p-2">父级目录</th>
                <th className="p-2">可见性</th>
                <th className="p-2">启用</th>
                <th className="p-2">排序</th>
                <th className="p-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-2">
                    <img src={item.cover_url || '/placeholder.svg'} className="w-16 h-16 rounded object-cover" />
                  </td>
                  <td className="p-2">
                    <Input value={item.name || ''} onChange={(e) => updateItem(item.id, { name: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <Input value={item.slug || ''} onChange={(e) => updateItem(item.id, { slug: e.target.value })} />
                  </td>
                  <td className="p-2">
                    <select className="border rounded h-9 px-2" value={item.is_directory ? 'dir' : 'feature'} onChange={(e) => updateItem(item.id, { is_directory: e.target.value === 'dir' })}>
                      <option value="feature">功能</option>
                      <option value="dir">目录</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <select className="border rounded h-9 px-2" value={item.parent_id || ''} onChange={(e) => updateItem(item.id, { parent_id: e.target.value || null })}>
                      <option value="">无</option>
                      {items.filter((x) => x.is_directory).map((x) => (
                        <option key={x.id} value={x.id}>{x.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <select className="border rounded h-9 px-2" value={item.visibility || 'public'} onChange={(e) => updateItem(item.id, { visibility: e.target.value })}>
                      <option value="public">公开</option>
                      <option value="private">私密</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <select className="border rounded h-9 px-2" value={item.is_active ? 'true' : 'false'} onChange={(e) => updateItem(item.id, { is_active: e.target.value === 'true' })}>
                      <option value="true">启用</option>
                      <option value="false">停用</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <Input value={String(item.sort_order ?? 0)} onChange={(e) => updateItem(item.id, { sort_order: Number(e.target.value || 0) })} />
                  </td>
                  <td className="p-2 flex items-center gap-2">
                    <Button size="sm" onClick={() => saveItem(item)}>保存</Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteItem(item.id)}>删除</Button>
                  {!item.is_directory && (
                    <Button size="sm" asChild>
                      <Link href={`/admin/generation-features/${item.id}/json-config`}>JSON配置</Link>
                    </Button>
                  )}
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

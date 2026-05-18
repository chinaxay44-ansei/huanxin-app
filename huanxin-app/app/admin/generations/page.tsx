"use client"

import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface GenItem {
  id: string
  user_id: string
  prompt?: string
  status: string
  progress?: number
  output_url?: string | null
  created_at: string
}

export default function AdminGenerationsPage() {
  const [items, setItems] = useState<GenItem[]>([])
  const [status, setStatus] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (status && status !== 'all') params.set('status', status)
    if (search.trim()) params.set('search', search.trim())
    params.set('page', String(page))
    params.set('limit', '20')
    return params.toString()
  }, [status, search, page])

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/admin/generations?${query}`, {
        headers: { 'x-admin-token': process.env.NEXT_PUBLIC_ADMIN_API_TOKEN! }
      })
      const json = await res.json()
      if (json.success) setItems(json.data)
    }
    load()
  }, [query])

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">生成任务列表</h1>
      <div className="flex gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="全部状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待处理</SelectItem>
            <SelectItem value="processing">处理中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
          </SelectContent>
        </Select>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索提示词/URL" className="w-64" />
        <Button onClick={() => setPage(1)}>查询</Button>
      </div>

      <div className="overflow-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 text-left">预览</th>
              <th className="p-2 text-left">提示词</th>
              <th className="p-2 text-left">用户</th>
              <th className="p-2 text-left">状态</th>
              <th className="p-2 text-left">进度</th>
              <th className="p-2 text-left">时间</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t">
                <td className="p-2">
                  {it.output_url ? <img src={it.output_url} className="w-16 h-16 object-cover rounded" /> : <div className="w-16 h-16 bg-gray-100 rounded" />}
                </td>
                <td className="p-2 max-w-[320px] truncate">{it.prompt || '-'}</td>
                <td className="p-2">{it.user_id.slice(0, 8)}</td>
                <td className="p-2">{it.status}</td>
                <td className="p-2">{it.progress ?? 0}%</td>
                <td className="p-2">{new Date(it.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
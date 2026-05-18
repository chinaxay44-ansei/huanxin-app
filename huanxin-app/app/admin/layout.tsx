import Link from "next/link"
import { Toaster } from "@/components/ui/sonner"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-background flex"
      style={{
        width: "100vw",
        position: "relative",
        left: "50%",
        right: "50%",
        marginLeft: "-50vw",
        marginRight: "-50vw",
      }}
    >
      <aside className="w-64 border-r px-4 py-6 hidden md:block">
        <div className="font-bold text-xl">焕星管理后台</div>
        <nav className="mt-6 space-y-2">
          <Link href="/admin" className="block px-3 py-2 rounded hover:bg-muted">概览</Link>
          <Link href="/admin/trending" className="block px-3 py-2 rounded hover:bg-muted">热门搜索</Link>
          <Link href="/admin/works" className="block px-3 py-2 rounded hover:bg-muted">作品管理</Link>
          <Link href="/admin/categories" className="block px-3 py-2 rounded hover:bg-muted">分类管理</Link>
          <Link href="/admin/generation-features" className="block px-3 py-2 rounded hover:bg-muted">生成页管理</Link>
          <Link href="/admin/users" className="block px-3 py-2 rounded hover:bg-muted">用户管理</Link>
          <Link href="/admin/reports" className="block px-3 py-2 rounded hover:bg-muted">举报管理</Link>
          <Link href="/admin/announcements" className="block px-3 py-2 rounded hover:bg-muted">公告管理</Link>
        </nav>
      </aside>
      <main className="flex-1 min-w-0">
        {children}
        <Toaster richColors closeButton position="top-center" />
      </main>
    </div>
  )
}

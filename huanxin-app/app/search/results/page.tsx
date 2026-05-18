"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, Search, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { searchWorks, searchUsers } from "@/lib/api/client-interactions"

interface Work {
  id: string
  title: string
  description: string
  thumbnail_url: string
  images: string[]
  tags: string[]
  likes_count: number
  views_count: number
  media_type?: string
  user: {
    id: string
    nickname: string
    avatar_url: string
  }
}

interface User {
  id: string
  nickname: string
  avatar_url: string
  bio: string
  followers_count: number
  following_count: number
  likes_count: number
}

export default function SearchResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "")
  const [activeTab, setActiveTab] = useState<"works" | "users">("works")
  const [works, setWorks] = useState<Work[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load search results when query or tab changes
  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch()
    }
  }, [searchQuery, activeTab])

  const performSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      setLoading(true)
      setError(null)

      if (activeTab === "works") {
        const { data } = await searchWorks(searchQuery.trim())
        // 适配界面字段
        const mapped = (data || []).map((w: any) => ({
          id: w.id,
          title: w.title,
          description: w.description,
          thumbnail_url: w.thumbnail_url,
          images: [w.thumbnail_url, w.thumbnail_url, w.thumbnail_url, w.thumbnail_url].filter(Boolean),
          tags: w.tags || [],
          likes_count: w.likes_count ?? w.likes ?? 0,
          views_count: w.views_count ?? 0,
          media_type: w.media_type,
          user: w.user,
        }))
        setWorks(mapped)
      } else {
        const { data } = await searchUsers(searchQuery.trim())
        const mapped = (data || []).map((u: any) => ({
          id: u.id,
          nickname: u.nickname,
          avatar_url: u.avatar_url,
          bio: u.bio,
          followers_count: u.followers_count ?? 0,
          following_count: u.following_count ?? 0,
          likes_count: u.likes_count ?? 0,
        }))
        setUsers(mapped)
      }
    } catch (error) {
      console.error('Search failed:', error)
      setError('搜索失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      performSearch()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 flex items-center gap-2 bg-muted rounded-full px-4 py-2">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-sm" onClick={handleSearch}>
            搜索
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center border-b px-4">
        <button
          onClick={() => setActiveTab("works")}
          className={`px-4 py-3 text-sm font-medium relative ${
            activeTab === "works" ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          作品
          {activeTab === "works" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full animate-in slide-in-from-left duration-200" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-3 text-sm font-medium relative ${
            activeTab === "users" ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          用户
          {activeTab === "users" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full animate-in slide-in-from-right duration-200" />
          )}
        </button>
      </div>

      {/* Results */}
      <div className="p-2">
        {loading && (
          <div className="p-8 text-center text-muted-foreground">
            <p>搜索中...</p>
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-red-500">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && activeTab === "works" && (
          <div className="grid grid-cols-2 gap-2">
            {works.length > 0 ? (
              works.map((work) => (
                <div key={work.id} className="space-y-2">
                  <div
                    className="relative aspect-[3/4] bg-muted rounded-xl overflow-hidden cursor-pointer"
                    onClick={() => router.push(`/video?type=${work.media_type === 'video' ? 'video' : 'image'}&workId=${work.id}`)}
                    title={work.title}
                  >
                    <img src={work.media_type === 'video' && !work.thumbnail_url ? '/视频封面.jpg' : work.thumbnail_url || "/placeholder.svg"} alt={work.title} className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 flex items-center gap-1 text-white text-xs">
                      <span>{work.views_count}人用过</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <button
                      onClick={() => router.push(`/user/${work.user.id}`)}
                      className="flex items-center gap-2"
                      title={work.user.nickname}
                    >
                      <img src={work.user.avatar_url || "/placeholder.svg"} alt="" className="w-6 h-6 rounded-full" />
                      <span className="text-sm">{work.user.nickname}</span>
                    </button>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm">{work.likes_count}</span>
                    </div>
                  </div>
                  
                </div>
              ))
            ) : (
              <div className="col-span-2 p-8 text-center text-muted-foreground">
                <p>暂无相关作品</p>
              </div>
            )}
          </div>
        )}

        {!loading && !error && activeTab === "users" && (
          <div className="space-y-4">
            {users.length > 0 ? (
              users.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-4 bg-muted rounded-xl">
                  <button onClick={() => router.push(`/user/${user.id}`)} title={user.nickname} className="flex items-center gap-3">
                    <img src={user.avatar_url || "/placeholder.svg"} alt="" className="w-12 h-12 rounded-full" />
                    <div className="text-left">
                      <h3 className="font-medium">{user.nickname}</h3>
                      {user.bio && <p className="text-sm text-muted-foreground line-clamp-1">{user.bio}</p>}
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{user.followers_count} 粉丝</span>
                        <span>{user.likes_count} 获赞</span>
                      </div>
                    </div>
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <p>暂无相关用户</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

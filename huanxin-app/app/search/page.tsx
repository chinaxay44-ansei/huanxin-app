"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Search, X, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { getTrendingSearches } from "@/lib/api/client-interactions"

export default function SearchPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [trendingSearches, setTrendingSearches] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Load data on component mount
  useEffect(() => {
    loadData()
    loadRecentSearches()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const trending = await getTrendingSearches()
      // 兼容接口返回 { data, error } 的结构
      const list = Array.isArray((trending as any)) ? (trending as any) : trending?.data
      setTrendingSearches(Array.isArray(list) ? list : [])
    } catch (error) {
      console.error('Failed to load trending searches:', error)
      // Fallback to mock data
      setTrendingSearches(["Love pray for me...", "山的后面是什么", "万圣节", "又是一年冬", "证件照", "撕拉片"])
    } finally {
      setLoading(false)
    }
  }

  const loadRecentSearches = () => {
    // Load from localStorage
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setRecentSearches(Array.isArray(parsed) ? parsed : [])
      } catch (error) {
        console.error('Failed to parse recent searches:', error)
        setRecentSearches([])
      }
    }
  }

  const saveRecentSearch = (query: string) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10) // Keep only 10 recent searches
    setRecentSearches(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
  }

  const clearRecent = (search: string) => {
    const updated = recentSearches.filter((s) => s !== search)
    setRecentSearches(updated)
    localStorage.setItem('recentSearches', JSON.stringify(updated))
  }

  const refreshTrending = () => {
    loadData() // Reload trending searches
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim())
      router.push(`/search/results?q=${encodeURIComponent(searchQuery)}`)
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
              placeholder=""
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 border-0 bg-transparent p-0 text-sm placeholder:text-muted-foreground focus-visible:ring-0"
            />
          </div>
          <Button variant="ghost" size="sm" className="text-sm" onClick={handleSearch}>
            搜索
          </Button>
        </div>
      </header>

      <div className="px-4 py-6">
        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="mb-8">
            {recentSearches.map((search) => (
              <div key={search} className="flex items-center justify-between py-3">
                <button
                  onClick={() => {
                    setSearchQuery(search)
                    saveRecentSearch(search)
                    router.push(`/search/results?q=${encodeURIComponent(search)}`)
                  }}
                  className="flex items-center gap-3 flex-1"
                >
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-base">{search}</span>
                </button>
                <button onClick={() => clearRecent(search)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Trending Searches */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">探索更多</h2>
            <button onClick={refreshTrending} className="flex items-center gap-1 text-sm text-muted-foreground">
              <RefreshCw className="w-4 h-4" />
              换一换
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {trendingSearches.map((search, index) => (
              <Button
                key={index}
                variant="outline"
                className="h-auto py-3 px-4 justify-start text-left bg-muted border-0 rounded-xl hover:bg-accent transition-colors"
                onClick={() => {
                  setSearchQuery(search)
                  saveRecentSearch(search)
                  router.push(`/search/results?q=${encodeURIComponent(search)}`)
                }}
              >
                <span className="text-sm line-clamp-1">{search}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

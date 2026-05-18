"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Users, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { getFollowingList, getFollowersList, UserProfile, followUser, unfollowUser, checkFollowStatus } from "@/lib/api/client-users"

export default function FollowingPage() {
  const router = useRouter()
  const { getCurrentUserId } = useAuth()
  const [activeTab, setActiveTab] = useState<"following" | "followers">("following")
  const [followingUsers, setFollowingUsers] = useState<UserProfile[]>([])
  const [followersUsers, setFollowersUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({})
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [isClient, setIsClient] = useState(false)

  const currentUserId = getCurrentUserId()

  // 确保只在客户端渲染
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 加载关注列表
  const loadFollowingList = async () => {
    if (!currentUserId) return
    
    try {
      const { data, error } = await getFollowingList(currentUserId)
      if (error) {
        setError(error)
      } else {
        setFollowingUsers(data)
        // 初始化关注状态（关注列表中的用户都是已关注的）
        const states: Record<string, boolean> = {}
        data.forEach(user => {
          states[user.id] = true
        })
        setFollowingStates(prev => ({ ...prev, ...states }))
      }
    } catch (err) {
      setError('加载关注列表失败')
    }
  }

  // 加载粉丝列表
  const loadFollowersList = async () => {
    if (!currentUserId) return
    
    try {
      const { data, error } = await getFollowersList(currentUserId)
      if (error) {
        setError(error)
      } else {
        setFollowersUsers(data)
        // 检查对粉丝的关注状态
        const states: Record<string, boolean> = {}
        for (const user of data) {
          if (user.id !== currentUserId) {
            const { isFollowing } = await checkFollowStatus(currentUserId, user.id)
            states[user.id] = isFollowing
          }
        }
        setFollowingStates(prev => ({ ...prev, ...states }))
      }
    } catch (err) {
      setError('加载粉丝列表失败')
    }
  }

  // 处理关注/取消关注
  const handleFollowToggle = async (userId: string) => {
    if (!currentUserId || userId === currentUserId) return
    
    setActionLoading(prev => ({ ...prev, [userId]: true }))
    
    try {
      const isCurrentlyFollowing = followingStates[userId]
      
      if (isCurrentlyFollowing) {
        const { success, error } = await unfollowUser(currentUserId, userId)
        if (success) {
          setFollowingStates(prev => ({ ...prev, [userId]: false }))
          // 如果在关注页面取消关注，从列表中移除
          if (activeTab === "following") {
            setFollowingUsers(prev => prev.filter(user => user.id !== userId))
          }
        } else {
          setError(error || '取消关注失败')
        }
      } else {
        const { success, error } = await followUser(currentUserId, userId)
        if (success) {
          setFollowingStates(prev => ({ ...prev, [userId]: true }))
        } else {
          setError(error || '关注失败')
        }
      }
    } catch (err) {
      setError('操作失败，请稍后重试')
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }))
    }
  }

  useEffect(() => {
    if (!currentUserId) {
      setError('请先登录')
      setLoading(false)
      return
    }

    const loadData = async () => {
      setLoading(true)
      setError(null)
      
      if (activeTab === "following") {
        await loadFollowingList()
      } else {
        await loadFollowersList()
      }
      
      setLoading(false)
    }

    loadData()
  }, [activeTab, currentUserId])

  const currentUsers = activeTab === "following" ? followingUsers : followersUsers
  const currentCount = currentUsers.length

  // 在客户端渲染之前显示加载状态
  if (!isClient) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-semibold">关注/粉丝</h1>
          <div className="w-10" />
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </div>
    )
  }

  if (!currentUserId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">请先登录</p>
          <Button onClick={() => router.push('/login')}>
            去登录
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-semibold">关注/粉丝</h1>
        <div className="w-10" />
      </div>

      {/* 标签页 */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("following")}
          className={`flex-1 py-3 px-4 text-center font-medium ${
            activeTab === "following"
              ? "text-foreground border-b-2"
              : "text-muted-foreground"
          }`}
        >
          关注 {followingUsers.length > 0 && `(${followingUsers.length})`}
        </button>
        <button
          onClick={() => setActiveTab("followers")}
          className={`flex-1 py-3 px-4 text-center font-medium ${
            activeTab === "followers"
              ? "text-foreground border-b-2"
              : "text-muted-foreground"
          }`}
        >
          粉丝 {followersUsers.length > 0 && `(${followersUsers.length})`}
        </button>
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-red-500 mb-4">{error}</div>
            <Button 
              onClick={() => {
                setError(null)
                if (activeTab === "following") {
                  loadFollowingList()
                } else {
                  loadFollowersList()
                }
              }}
              variant="secondary"
            >
              重试
            </Button>
          </div>
        ) : currentUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg mb-2">
              {activeTab === "following" ? "还没有关注任何人" : "还没有粉丝"}
            </p>
            <p className="text-muted-foreground text-sm">
              {activeTab === "following" ? "去发现更多有趣的人吧" : "分享更多精彩内容来吸引粉丝"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <div 
                  className="flex items-center space-x-3 flex-1 cursor-pointer"
                  onClick={() => router.push(`/user/${user.id}`)}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback>
                      {user.nickname?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {user.nickname || "未知用户"}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.bio || user.location || "这个人很神秘，什么都没留下"}
                    </p>
                  </div>
                </div>
                
                {/* 关注按钮 - 不对自己显示 */}
                {user.id !== currentUserId && (
                  <Button
                    onClick={() => handleFollowToggle(user.id)}
                    disabled={actionLoading[user.id]}
                    size="sm"
                    variant={followingStates[user.id] ? 'secondary' : 'default'}
                  >
                    {actionLoading[user.id] ? (
                      "..."
                    ) : followingStates[user.id] ? (
                      "已关注"
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-1" />
                        关注
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Spinner } from "@/components/ui/spinner"
import Image from "next/image"
import { ChevronLeft, Share2, MoreHorizontal, MapPin, Heart, Sparkles } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { uploadWorkMediaClient } from "@/lib/upload"
import { getUserProfile, getUserWorks, getUserLikedWorks, checkFollowStatus, followUser, unfollowUser } from "@/lib/api/client-users"
import { useAuth } from "@/lib/auth"
import { toast } from "sonner"

interface UserProfile {
  id: string
  nickname: string
  avatar_url: string | null
  bio: string | null
  location: string | null
  gender: string | null
  birth_date: string | null
  zodiac: string | null
  following_count: number
  followers_count: number
  likes_count: number
}

interface Work {
  id: string
  title: string
  thumbnail_url: string | null
  tags: string[]
  likes_count: number
  views_count: number
  media_type?: string
  user: {
    id: string
    nickname: string
    avatar_url: string | null
  }
}

const getWorkCover = (work: any) => {
  const mediaType = work?.media_type ?? work?.type
  const thumb = work?.thumbnail_url || ""
  if (mediaType === "video") {
    const isImageThumb = /\.(png|jpe?g|webp|gif|bmp)$/i.test(thumb)
    return isImageThumb ? thumb : "/视频封面.jpg"
  }
  return thumb || work?.media_url || "/placeholder.svg"
}

export default function UserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  
  const [activeTab, setActiveTab] = useState<"works" | "likes">("works")
  const [isFollowing, setIsFollowing] = useState(false)
  const [isMutual, setIsMutual] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [works, setWorks] = useState<Work[]>([])
  const [likedWorks, setLikedWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const { getCurrentUserId, isAuthenticated, checkAuthStatus } = useAuth()
  const [initialized, setInitialized] = useState(false)
  
  // 初始化认证状态
  useEffect(() => {
    const init = async () => {
      await checkAuthStatus()
      setInitialized(true)
    }
    init()
  }, [checkAuthStatus])

  const currentUserId = getCurrentUserId() || ""

  // 加载用户资料和数据
  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true)
      
      try {
        // 获取用户资料
        const profileResult = await getUserProfile(userId)
        if (profileResult.error === '请先登录') {
          router.push('/login')
          return
        }
        if (profileResult.data) {
          setUserProfile(profileResult.data)
        }

        // 检查关注状态
        if (currentUserId !== userId) {
          const followResult = await checkFollowStatus(currentUserId, userId)
          if (!followResult.error) {
            setIsFollowing(followResult.isFollowing)
          }
          const mutual = await (await import('@/lib/api/client-users')).checkMutualStatus(currentUserId, userId)
          if (!mutual.error) setIsMutual(mutual.isMutual)
        }

        // 获取用户作品
        const worksResult = await getUserWorks(userId, 1, 20)
        if (worksResult.data) {
          setWorks(worksResult.data)
        }

        // 获取用户点赞的作品
        const likedWorksResult = await getUserLikedWorks(userId, 1, 20)
        if (likedWorksResult.data) {
          setLikedWorks(likedWorksResult.data)
        }
      } catch (error) {
        console.error('Failed to load user data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (initialized) {
      if (!isAuthenticated) {
        router.push('/login')
        return
      }
      if (userId) {
        loadUserData()
      }
    }
  }, [userId, currentUserId, initialized, isAuthenticated, router])

  useEffect(() => {
    const processVideoThumbnails = async () => {
      const targets: { id: string, media_url: string }[] = []
      works.forEach((w) => {
        const isVideo = (w as any).media_type === 'video'
        const hasThumb = !!w.thumbnail_url && /\.(png|jpg|jpeg|webp)$/i.test(w.thumbnail_url)
        if (isVideo && !hasThumb && (w as any).media_url) {
          targets.push({ id: w.id, media_url: (w as any).media_url })
        }
      })
      for (const t of targets) {
        try {
          const posterBlob = await captureFirstFrame(t.media_url)
          if (!posterBlob) continue
          const file = new File([posterBlob], `thumb-${t.id}-${Date.now()}.jpg`, { type: 'image/jpeg' })
          const uploaded = await uploadWorkMediaClient(file, { bucket: 'work-media', pathPrefix: 'video-covers' })
          await fetch(`/api/works/${t.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thumbnail_url: uploaded.url })
          })
          setWorks((prev) => prev.map((w) => w.id === t.id ? { ...w, thumbnail_url: uploaded.url } : w))
        } catch {}
      }
    }
    const processLikedVideoThumbnails = async () => {
      const targets: { id: string, media_url: string }[] = []
      likedWorks.forEach((w) => {
        const isVideo = (w as any).media_type === 'video'
        const hasThumb = !!w.thumbnail_url && /\.(png|jpg|jpeg|webp)$/i.test(w.thumbnail_url)
        if (isVideo && !hasThumb && (w as any).media_url) {
          targets.push({ id: w.id, media_url: (w as any).media_url })
        }
      })
      for (const t of targets) {
        try {
          const posterBlob = await captureFirstFrame(t.media_url)
          if (!posterBlob) continue
          const file = new File([posterBlob], `thumb-${t.id}-${Date.now()}.jpg`, { type: 'image/jpeg' })
          const uploaded = await uploadWorkMediaClient(file, { bucket: 'work-media', pathPrefix: 'video-covers' })
          await fetch(`/api/works/${t.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thumbnail_url: uploaded.url })
          })
          setLikedWorks((prev) => prev.map((w) => w.id === t.id ? { ...w, thumbnail_url: uploaded.url } : w))
        } catch {}
      }
    }
    const captureFirstFrame = (url: string) => new Promise<Blob | null>((resolve) => {
      try {
        const video = document.createElement('video')
        video.crossOrigin = 'anonymous'
        video.src = url
        video.preload = 'metadata'
        video.muted = true
        video.playsInline = true as any
        video.addEventListener('loadeddata', () => {
          try {
            const w = Math.max(1, Math.floor(video.videoWidth))
            const h = Math.max(1, Math.floor(video.videoHeight))
            const canvas = document.createElement('canvas')
            canvas.width = w
            canvas.height = h
            const ctx = canvas.getContext('2d')
            if (!ctx) { resolve(null); return }
            ctx.drawImage(video, 0, 0, w, h)
            canvas.toBlob((blob) => { resolve(blob) }, 'image/jpeg', 0.9)
          } catch { resolve(null) }
        }, { once: true })
        video.addEventListener('error', () => resolve(null), { once: true })
      } catch { resolve(null) }
    })

    if (works.length > 0) processVideoThumbnails()
    if (likedWorks.length > 0) processLikedVideoThumbnails()
  }, [works, likedWorks])

  // 处理关注/取消关注
  const handleFollowToggle = async () => {
    if (followLoading || currentUserId === userId) return
    
    setFollowLoading(true)
    try {
      if (isFollowing) {
        const result = await unfollowUser(currentUserId, userId)
        if (result.success) {
          setIsFollowing(false)
          setIsMutual(false)
          // 更新粉丝数
          if (userProfile) {
            setUserProfile({
              ...userProfile,
              followers_count: userProfile.followers_count - 1
            })
          }
        }
      } else {
        const result = await followUser(currentUserId, userId)
        if (result.success) {
          setIsFollowing(true)
          const mutual = await (await import('@/lib/api/client-users')).checkMutualStatus(currentUserId, userId)
          if (!mutual.error) setIsMutual(mutual.isMutual)
          // 更新粉丝数
          if (userProfile) {
            setUserProfile({
              ...userProfile,
              followers_count: userProfile.followers_count + 1
            })
          }
        }
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error)
    } finally {
      setFollowLoading(false)
    }
  }

  // 计算年龄和星座
  const getAgeAndZodiac = (birthDate: string | null) => {
    if (!birthDate) return { age: null, zodiac: null }
    
    const birth = new Date(birthDate)
    const today = new Date()
    const age = today.getFullYear() - birth.getFullYear()
    
    // 简单的星座计算（这里可以用更完整的星座计算逻辑）
    const month = birth.getMonth() + 1
    const day = birth.getDate()
    
    const zodiacSigns = [
      '水瓶座', '双鱼座', '白羊座', '金牛座', '双子座', '巨蟹座',
      '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座'
    ]
    
    let zodiacIndex = 0
    if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) zodiacIndex = 0
    else if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) zodiacIndex = 1
    else if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) zodiacIndex = 2
    else if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) zodiacIndex = 3
    else if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) zodiacIndex = 4
    else if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) zodiacIndex = 5
    else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) zodiacIndex = 6
    else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) zodiacIndex = 7
    else if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) zodiacIndex = 8
    else if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) zodiacIndex = 9
    else if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) zodiacIndex = 10
    else zodiacIndex = 11
    
    return { age, zodiac: zodiacSigns[zodiacIndex] }
  }

  const { age, zodiac } = getAgeAndZodiac(userProfile?.birth_date || null)

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Spinner className="size-8 mx-auto mb-2" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">用户不存在</p>
          <Button onClick={() => router.back()} className="mt-4">
            返回
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4">
            <Share2 className="w-5 h-5" />
            <MoreHorizontal className="w-5 h-5" />
          </div>
        </div>
      </header>

      <div className="px-4 py-6">
        {/* Profile Info */}
        <div className="flex items-start gap-4 mb-6">
          <img
            src={userProfile.avatar_url || "/placeholder.svg?height=80&width=80"}
            alt="Profile"
            className="w-20 h-20 rounded-full object-cover"
          />
          <div className="flex-1">
            <h1 className="text-xl font-bold mb-1">{userProfile.nickname}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              {userProfile.location && (
                <>
                  <MapPin className="w-4 h-4" />
                  <span>{userProfile.location}</span>
                </>
              )}
              {userProfile.gender && (
                <>
                  <span className={userProfile.gender === 'female' ? 'text-pink-500' : 'text-blue-500'}>
                    {userProfile.gender === 'female' ? '♀' : '♂'}
                  </span>
                  <span>{userProfile.gender === 'female' ? '女生' : '男生'}</span>
                </>
              )}
              {age && (
                <>
                  <span>·</span>
                  <span>{age < 20 ? '00后' : age < 30 ? '90后' : age < 40 ? '80后' : '70后'}</span>
                </>
              )}
              {zodiac && (
                <>
                  <span>·</span>
                  <span>{zodiac}</span>
                </>
              )}
            </div>
            {userProfile.bio && (
              <p className="text-sm text-muted-foreground">{userProfile.bio}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mb-6">
          <button className="flex flex-col items-center">
            <span className="text-lg font-bold">{userProfile.following_count}</span>
            <span className="text-xs text-muted-foreground">关注</span>
          </button>
          <button className="flex flex-col items-center">
            <span className="text-lg font-bold">{userProfile.followers_count}</span>
            <span className="text-xs text-muted-foreground">粉丝</span>
          </button>
          <button className="flex flex-col items-center">
            <span className="text-lg font-bold">{userProfile.likes_count}</span>
            <span className="text-xs text-muted-foreground">获赞</span>
          </button>
        </div>

        {/* Action Button */}
        {currentUserId !== userId && (
          <div className="flex items-center gap-3 mb-6">
            <Button
              onClick={handleFollowToggle}
              disabled={followLoading}
              className={`flex-1 rounded-full ${
                isFollowing ? "bg-muted text-foreground hover:bg-muted/80" : "bg-black text-white hover:bg-black/90"
              }`}
            >
              {followLoading ? "处理中..." : isMutual ? "互相关注" : isFollowing ? "已关注" : "关注"}
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={async () => {
                if (!isAuthenticated) { router.push('/login'); return }
                // 直接跳转聊天页，由聊天页负责创建/拉起会话
                router.push(`/chat/new?userId=${userId}`)
              }}
            >
              发消息
            </Button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center border-b mb-4">
          <button
            onClick={() => setActiveTab("works")}
            className={`flex-1 py-3 text-sm font-medium relative ${
              activeTab === "works" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            作品
            {activeTab === "works" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab("likes")}
            className={`flex-1 py-3 text-sm font-medium relative ${
              activeTab === "likes" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            点赞
            {activeTab === "likes" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-full" />}
          </button>
        </div>

        {/* Works Grid */}
        {activeTab === "works" && (
                  <div className="grid grid-cols-2 gap-2">
                    {works.length > 0 ? (
                      works.map((work) => (
                        <div key={work.id} className="space-y-2">
                          <div
                            className="relative aspect-[3/4] bg-muted rounded-xl overflow-hidden cursor-pointer"
                            onClick={() => router.push(`/video?type=${(work as any).media_type === 'video' ? 'video' : 'image'}&workId=${work.id}`)}
                            title={work.title}
                          >
                            <img 
                              src={getWorkCover(work)} 
                              alt={work.title} 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute top-2 left-2 flex items-center gap-1 text-white text-xs">
                              <Sparkles className="w-3 h-3" />
                              <span>{work.views_count}人用过</span>
                            </div>
                          </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-1">
                      {work.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-0.5 rounded ${
                            tag === "发焕星"
                              ? "bg-red-100 text-red-600"
                              : tag === "可发平台"
                                ? "bg-orange-100 text-orange-600"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <img 
                        src={work.user.avatar_url || "/placeholder.svg?height=20&width=20"} 
                        alt="" 
                        className="w-5 h-5 rounded-full" 
                      />
                      <span className="text-xs text-muted-foreground">{work.user.nickname}</span>
                      <div className="ml-auto flex items-center gap-1 text-muted-foreground">
                        <Heart className="w-3 h-3" />
                        <span className="text-xs">{work.likes_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-8 text-center text-muted-foreground">
                <p>暂无作品</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "likes" && (
                  <div className="grid grid-cols-2 gap-2">
                    {likedWorks.length > 0 ? (
                      likedWorks.map((work) => (
                        <div key={work.id} className="space-y-2">
                          <div
                            className="relative aspect-[3/4] bg-muted rounded-xl overflow-hidden cursor-pointer"
                            onClick={() => router.push(`/video?type=${(work as any).media_type === 'video' ? 'video' : 'image'}&workId=${work.id}`)}
                            title={work.title}
                          >
                            <img 
                              src={getWorkCover(work)} 
                              alt={work.title} 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute top-2 left-2 flex items-center gap-1 text-white text-xs">
                              <Sparkles className="w-3 h-3" />
                              <span>{work.views_count}人用过</span>
                            </div>
                          </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-1">
                      {work.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-0.5 rounded ${
                            tag === "发焕星"
                              ? "bg-red-100 text-red-600"
                              : tag === "可发平台"
                                ? "bg-orange-100 text-orange-600"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <img 
                        src={work.user.avatar_url || "/placeholder.svg?height=20&width=20"} 
                        alt="" 
                        className="w-5 h-5 rounded-full" 
                      />
                      <span className="text-xs text-muted-foreground">{work.user.nickname}</span>
                      <div className="ml-auto flex items-center gap-1 text-muted-foreground">
                        <Heart className="w-3 h-3" />
                        <span className="text-xs">{work.likes_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-8 text-center text-muted-foreground">
                <p>暂无点赞作品</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

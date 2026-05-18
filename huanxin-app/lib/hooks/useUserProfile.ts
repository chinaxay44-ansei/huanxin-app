import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth'

export interface UserProfileData {
  user: {
    id: string
    phone: string
    nickname: string
    email?: string
    avatar_url?: string
    created_at: string
    updated_at: string
  }
  profile: {
    id: string
    user_id: string
    bio?: string
    gender?: 'male' | 'female' | 'other'
    birthday?: string
    location?: string
    website?: string
    profession?: string
    education?: string
    relationship_status?: string
    height?: number
    weight?: number
    blood_type?: string
    mbti?: string
    personality_description?: string
    life_motto?: string
    favorite_quote?: string
    hobbies?: string[]
    languages?: string[]
    zodiac_sign?: string
    age_group?: string
    social_links?: Record<string, any>
    privacy_settings?: Record<string, any>
    theme_preference?: string
    notification_settings?: Record<string, any>
    tags?: string[]
    created_at: string
    updated_at: string
  } | null
}

export interface UserStats {
  user_id: string
  total_works: number
  public_works: number
  private_works: number
  liked_works: number
  following_count: number
  followers_count: number
  total_likes_received: number
  total_views_received: number
  total_comments_received: number
  total_shares_received: number
  created_at: string
  updated_at: string
}

export interface UserPersonalTag {
  tag_id: string
  tag_name: string
  category_name: string
  category_color: string
  category_icon: string
}

export interface PersonalTagCategory {
  id: string
  name: string
  icon: string
  color: string
  sort_order: number
  is_active: boolean
  personal_tags: PersonalTag[]
}

export interface PersonalTag {
  id: string
  category_id: string
  name: string
  icon?: string
  color?: string
  sort_order: number
  is_active: boolean
}

export function useUserProfile(userId?: string) {
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getCurrentUserId } = useAuth()
  const isMountedRef = useRef(false)
  const profileRequestRef = useRef(0)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchProfile = async (targetUserId?: string) => {
    const requestId = ++profileRequestRef.current
    const safeUpdate = (updater: () => void) => {
      if (!isMountedRef.current || requestId !== profileRequestRef.current) return
      updater()
    }

    try {
      safeUpdate(() => {
        setLoading(true)
        setError(null)
      })

      const id = targetUserId || userId || getCurrentUserId()
      if (!id) {
        safeUpdate(() => {
          setError('请先登录')
          setLoading(false)
        })
        return
      }

      const response = await fetch(`/api/users/${id}`)
      const result = await response.json()

      if (result.success) {
        safeUpdate(() => setProfile(result.data))
      } else {
        safeUpdate(() => {
          if (response.status === 404) {
            setError('用户不存在')
          } else if (response.status === 401) {
            setError('请先登录')
          } else {
            setError(result.message || '获取用户资料失败')
          }
        })
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }
      safeUpdate(() => setError(err instanceof Error ? err.message : '获取用户资料失败'))
    } finally {
      safeUpdate(() => setLoading(false))
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [userId])

  const updateProfile = async (updates: Record<string, any>) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch('/api/users/profile', {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    })
    const result = await res.json()
    if (result.success) {
      await fetchProfile()
      return { success: true }
    }
    return { success: false, error: result.message || '更新用户资料失败' }
  }

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
    updateProfile
  }
}

export function useUserStats(userId?: string) {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getCurrentUserId } = useAuth()
  const isMountedRef = useRef(false)
  const statsRequestRef = useRef(0)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchStats = async (targetUserId?: string) => {
    const requestId = ++statsRequestRef.current
    const safeUpdate = (updater: () => void) => {
      if (!isMountedRef.current || requestId !== statsRequestRef.current) return
      updater()
    }

    try {
      safeUpdate(() => {
        setLoading(true)
        setError(null)
      })
      
      const id = targetUserId || userId || getCurrentUserId()
      if (!id) {
        safeUpdate(() => {
          setError('请先登录')
          setLoading(false)
        })
        return
      }

      const response = await fetch(`/api/users/stats?userId=${id}`)
      const result = await response.json()

      if (result.success) {
        safeUpdate(() => setStats(result.data))
      } else {
        safeUpdate(() => {
          if (response.status === 404) {
            setError('用户不存在')
          } else if (response.status === 401) {
            setError('请先登录')
          } else {
            setError(result.message || '获取用户统计失败')
          }
        })
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }
      safeUpdate(() => setError(err instanceof Error ? err.message : '获取用户统计失败'))
    } finally {
      safeUpdate(() => setLoading(false))
    }
  }

  useEffect(() => {
    fetchStats()
  }, [userId])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}

export function useUserPersonalTags(userId?: string) {
  const [tags, setTags] = useState<UserPersonalTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getCurrentUserId } = useAuth()
  const isMountedRef = useRef(false)
  const tagsRequestRef = useRef(0)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchTags = async (targetUserId?: string) => {
    const requestId = ++tagsRequestRef.current
    const safeUpdate = (updater: () => void) => {
      if (!isMountedRef.current || requestId !== tagsRequestRef.current) return
      updater()
    }

    try {
      safeUpdate(() => {
        setLoading(true)
        setError(null)
      })
      
      const id = targetUserId || userId || getCurrentUserId()
      if (!id) {
        safeUpdate(() => {
          setError('请先登录')
          setLoading(false)
        })
        return
      }

      const response = await fetch(`/api/users/tags?userId=${id}`)
      const result = await response.json()

      if (result.success) {
        safeUpdate(() => setTags(result.data))
      } else {
        safeUpdate(() => {
          if (response.status === 404) {
            setError('用户不存在')
          } else if (response.status === 401) {
            setError('请先登录')
          } else {
            setError(result.message || '获取个人标签失败')
          }
        })
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }
      safeUpdate(() => setError(err instanceof Error ? err.message : '获取个人标签失败'))
    } finally {
      safeUpdate(() => setLoading(false))
    }
  }

  const updateTags = async (tagIds: string[]) => {
    try {
      const response = await fetch('/api/users/tags', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tagIds }),
      })

      const result = await response.json()

      if (result.success) {
        await fetchTags()
        return { success: true }
      } else {
        return { success: false, error: result.message || '更新个人标签失败' }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : '更新个人标签失败' 
      }
    }
  }

  useEffect(() => {
    fetchTags()
  }, [userId])

  return {
    tags,
    loading,
    error,
    updateTags,
    refetch: fetchTags
  }
}

export function usePersonalTagCategories() {
  const [categories, setCategories] = useState<PersonalTagCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/tags/categories')
      const result = await response.json()

      if (result.success) {
        setCategories(result.data)
      } else {
        setError(result.message || '获取标签分类失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取标签分类失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories
  }
}

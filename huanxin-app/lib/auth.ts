"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { supabase } from "@/lib/supabase/client"
import { User, AuthError } from "@supabase/supabase-js"

interface UserProfile {
  id: string
  phone: string
  username?: string | null
  nickname: string
  avatar_url?: string
  bio?: string
  gender?: string
  birthday?: string
  location?: string
  following_count: number
  followers_count: number
  likes_received_count: number
  works_count: number
  energy_balance: number
  status: string
  is_verified: boolean
  verified_type?: string
  settings: any
  created_at: string
  updated_at: string
  last_login_at?: string
}

interface AuthState {
  isAuthenticated: boolean
  user: UserProfile | null
  loading: boolean
  error: string | null
  
  // 认证方法
  sendOTP: (phone: string) => Promise<{ success: boolean; error?: string }>
  verifyOTP: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>
  loginWithPassword: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>
  // 用户名认证方法
  registerWithUsername: (username: string, password: string, nickname: string) => Promise<{ success: boolean; error?: string }>
  loginWithUsername: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  
  // 邮箱认证方法
  signUpWithEmail: (email: string, password: string, nickname: string) => Promise<{ success: boolean; error?: string }>
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  
  // 微信登录方法
  signInWithWechat: () => Promise<{ success: boolean; error?: string }>
  
  logout: () => Promise<void>
  
  // 用户信息方法
  getCurrentUser: () => Promise<UserProfile | null>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>
  
  // 工具方法
  getCurrentUserId: () => string | null
  checkAuthStatus: () => Promise<void>
  
  // 状态管理
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setUser: (user: UserProfile | null) => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      loading: false,
      error: null,

      // 发送OTP验证码（JWT流程）
      sendOTP: async (phone: string) => {
        set({ loading: true, error: null })
        try {
          const res = await fetch('/api/auth/send-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, type: 'login' }),
            credentials: 'include',
            cache: 'no-store',
          })
          const data = await res.json()
          if (!res.ok || !data.success) {
            const msg = data?.message || '发送验证码失败'
            set({ error: msg, loading: false })
            return { success: false, error: msg }
          }
          set({ loading: false })
          return { success: true }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '发送验证码失败'
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      },

      // 微信登录
      signInWithWechat: async () => {
        set({ loading: true, error: null })
        
        try {
          // 使用Supabase的OAuth登录，这里使用一个通用的OAuth提供商
          // 在实际项目中，你需要配置微信OAuth应用
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google', // 临时使用Google作为示例，实际应该是微信的OAuth配置
            options: {
              redirectTo: `${window.location.origin}/auth/callback`
            }
          })

          if (error) {
            set({ error: error.message, loading: false })
            return { success: false, error: error.message }
          }

          // OAuth登录会重定向，所以这里不需要处理用户状态
          // 用户状态会在回调页面或认证状态变化时更新
          return { success: true }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '微信登录失败'
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      },

      // 验证OTP并登录（JWT流程）
      verifyOTP: async (phone: string, otp: string) => {
        set({ loading: true, error: null })
        try {
          const res = await fetch('/api/auth/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, code: otp, type: 'login' }),
            credentials: 'include',
            cache: 'no-store',
          })
          const data = await res.json()
          if (!res.ok || !data.success) {
            const msg = data?.message || (res.status === 404 ? '用户不存在' : '验证失败')
            set({ error: msg, loading: false })
            return { success: false, error: msg }
          }

          // 将后端返回的 JWT 写入 localStorage（用于 Authorization 备用通道）
          try {
            const token = data?.data?.token
            if (typeof window !== 'undefined' && token) {
              localStorage.setItem('auth-token', token)
            }
          } catch (e) {
            console.warn('保存验证码登录令牌失败:', e)
          }

          const userProfile = await get().getCurrentUser()
          // 若 /api/auth/me 因为 Cookie 传递问题未能拿到用户，使用登录返回的用户作回退
          const fallbackUser = data?.data?.user ?? null
          const finalUser = userProfile || fallbackUser || null
          set({ isAuthenticated: !!finalUser, user: finalUser, loading: false })
          return { success: true }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '验证失败'
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      },

      // 密码登录（JWT流程）
      loginWithPassword: async (phone: string, password: string) => {
        set({ loading: true, error: null })
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password }),
            credentials: 'include',
            cache: 'no-store',
          })
          const data = await res.json()
          if (!res.ok || !data.success) {
            const msg = data?.message || '登录失败'
            set({ error: msg, loading: false })
            return { success: false, error: msg }
          }

          // 将后端返回的 JWT 写入 localStorage（用于 Authorization 备用通道）
          try {
            const token = data?.data?.token
            if (typeof window !== 'undefined' && token) {
              localStorage.setItem('auth-token', token)
            }
          } catch (e) {
            console.warn('保存密码登录令牌失败:', e)
          }

          const userProfile = await get().getCurrentUser()
          const fallbackUser = data?.data?.user ?? null
          const finalUser = userProfile || fallbackUser || null
          set({ isAuthenticated: !!finalUser, user: finalUser, loading: false })
          return { success: true }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '登录失败'
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      },

      // 用户名注册（JWT流程）
      registerWithUsername: async (username: string, password: string, nickname: string) => {
        set({ loading: true, error: null })
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, nickname }),
            credentials: 'include',
            cache: 'no-store',
          })
          const data = await res.json()
          if (!res.ok || !data.success) {
            const msg = data?.message || '注册失败'
            set({ error: msg, loading: false })
            return { success: false, error: msg }
          }

          // 注册后存储后端签发的 JWT，确保立即处于登录态
          try {
            const token = data?.data?.token
            if (typeof window !== 'undefined' && token) {
              localStorage.setItem('auth-token', token)
            }
          } catch (e) {
            console.warn('保存注册登录令牌失败:', e)
          }

          // 注册后尝试拉取当前用户
          const userProfile = await get().getCurrentUser()
          const fallbackUser = data?.data?.user ?? null
          const finalUser = userProfile || fallbackUser || null
          set({ isAuthenticated: !!finalUser, user: finalUser, loading: false })
          return { success: true }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '注册失败'
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      },

      // 用户名密码登录（JWT流程）
      loginWithUsername: async (username: string, password: string) => {
        set({ loading: true, error: null })
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include',
            cache: 'no-store',
          })
          const data = await res.json()
          if (!res.ok || !data.success) {
            const msg = data?.message || '登录失败'
            set({ error: msg, loading: false })
            return { success: false, error: msg }
          }

          // 将后端返回的 JWT 写入 localStorage（用于 Authorization 备用通道）
          try {
            const token = data?.data?.token
            if (typeof window !== 'undefined' && token) {
              localStorage.setItem('auth-token', token)
            }
          } catch (e) {
            console.warn('保存用户名登录令牌失败:', e)
          }

          const userProfile = await get().getCurrentUser()
          const fallbackUser = data?.data?.user ?? null
          const finalUser = userProfile || fallbackUser || null
          set({ isAuthenticated: !!finalUser, user: finalUser, loading: false })
          return { success: true }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '登录失败'
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      },

      // 邮箱注册
      signUpWithEmail: async (email: string, password: string, nickname: string) => {
        set({ loading: true, error: null })
        
        try {
          const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
              data: {
                nickname: nickname
              },
              emailRedirectTo: `${window.location.origin}/auth/confirm`
            }
          })
          
          if (error) {
            set({ error: error.message, loading: false })
            return { success: false, error: error.message }
          }
          
          // 注册成功，但用户需要验证邮箱
          if (data.user && !data.user.email_confirmed_at) {
            set({ loading: false })
            return { 
              success: true, 
              error: '注册成功！请检查您的邮箱并点击验证链接来完成注册。' 
            }
          }
          
          // 如果邮箱已经验证（不太可能在注册时发生）
          if (data.user && data.user.email_confirmed_at) {
            const userProfile = await get().getCurrentUser()
            set({ 
              isAuthenticated: true, 
              user: userProfile,
              loading: false 
            })
            return { success: true }
          }
          
          set({ loading: false })
          return { success: false, error: '注册失败' }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '注册失败'
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      },

      // 邮箱登录
      signInWithEmail: async (email: string, password: string) => {
        set({ loading: true, error: null })
        
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
          })
          
          if (error) {
            set({ error: error.message, loading: false })
            return { success: false, error: error.message }
          }
          
          if (data.user) {
            const userProfile = await get().getCurrentUser()
            set({ 
              isAuthenticated: true, 
              user: userProfile,
              loading: false 
            })
            return { success: true }
          }
          
          set({ loading: false })
          return { success: false, error: '登录失败' }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '登录失败'
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      },

      // 退出登录（JWT流程）
      logout: async () => {
        set({ loading: true })
        try {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', cache: 'no-store' })
          // 清理本地 Authorization 令牌
          try {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth-token')
            }
          } catch (e) {
            console.warn('清理本地令牌失败:', e)
          }
          set({ isAuthenticated: false, user: null, loading: false, error: null })
        } catch (error) {
          console.error('Logout error:', error)
          set({ loading: false })
        }
      },

      // 获取当前用户信息（JWT流程）
      getCurrentUser: async () => {
        try {
          // 优先尝试 Authorization 头（localStorage 中保存的 JWT），回退到 Cookie
          let payload: any = null
          let user: any = null

          const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null

          // 尝试使用 Bearer 令牌（适配 WebView/跨域 Cookie 不可靠场景）
          if (token) {
            const resAuth = await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${token}` },
              cache: 'no-store',
            })
            if (resAuth.ok) {
              payload = await resAuth.json()
              user = payload?.data?.user || null
            }
          }

          // 若 Authorization 未拿到用户，再尝试 Cookie
          if (!user) {
            const resCookie = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
            if (!resCookie.ok) return null
            payload = await resCookie.json()
            user = payload?.data?.user || null
          }

          return user || null
        } catch (error) {
          console.error('Get current user error:', error)
          return null
        }
      },

      // 更新用户资料
      updateProfile: async (updates: Partial<UserProfile>) => {
        set({ loading: true, error: null })
        
        try {
          const { error } = await supabase
            .from('users')
            .update({
              ...updates,
              updated_at: new Date().toISOString()
            })
            .eq('id', get().user?.id)
          
          if (error) {
            set({ error: error.message, loading: false })
            return { success: false, error: error.message }
          }
          
          // 更新本地状态
          const currentUser = get().user
          if (currentUser) {
            set({ 
              user: { ...currentUser, ...updates },
              loading: false 
            })
          }
          
          return { success: true }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '更新失败'
          set({ error: errorMessage, loading: false })
          return { success: false, error: errorMessage }
        }
      },

      // 获取当前用户ID
      getCurrentUserId: () => {
        const state = get()
        return state.user?.id || null
      },

      // 检查认证状态（JWT流程）
      checkAuthStatus: async () => {
        set({ loading: true })
        try {
          const userProfile = await get().getCurrentUser()
          set({ isAuthenticated: !!userProfile, user: userProfile, loading: false })
        } catch (error) {
          console.error('Check auth status error:', error)
          set({ isAuthenticated: false, user: null, loading: false })
        }
      },

      // 状态管理方法
      setLoading: (loading: boolean) => set({ loading }),
      setError: (error: string | null) => set({ error }),
      setUser: (user: UserProfile | null) => set({ user, isAuthenticated: !!user }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    },
  ),
)

// 监听认证状态变化
supabase.auth.onAuthStateChange((event, session) => {
  const { checkAuthStatus } = useAuth.getState()
  
  if (event === 'SIGNED_IN') {
    checkAuthStatus()
  } else if (event === 'SIGNED_OUT') {
    useAuth.setState({ 
      isAuthenticated: false, 
      user: null,
      error: null 
    })
  }
})

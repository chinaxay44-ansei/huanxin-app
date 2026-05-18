"use client"

import { useEffect } from "react"
import { Spinner } from "@/components/ui/spinner"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"

export default function AuthCallback() {
  const router = useRouter()
  const { getCurrentUser } = useAuth()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // 处理OAuth回调
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/login?error=auth_failed')
          return
        }

        if (data.session) {
          // 获取用户信息并更新状态
          await getCurrentUser()
          router.push('/')
        } else {
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        router.push('/login?error=auth_failed')
      }
    }

    handleAuthCallback()
  }, [router, getCurrentUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Spinner className="size-8 mx-auto mb-4" />
        <p className="text-muted-foreground">正在处理登录...</p>
      </div>
    </div>
  )
}
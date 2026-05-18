"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

export default function EmailConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getCurrentUser } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const token_hash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        const next = searchParams.get('next') || '/'

        if (token_hash && type) {
          // 验证邮箱确认token
          const { error } = await supabase.auth.verifyOtp({
            type: type as any,
            token_hash,
          })

          if (error) {
            console.error('Email confirmation error:', error)
            setStatus('error')
            setMessage('邮箱验证失败：' + error.message)
            return
          }

          // 验证成功，获取用户信息
          const { data: { user } } = await supabase.auth.getUser()
          
          if (user) {
            // 更新认证状态
            await getCurrentUser()
            setStatus('success')
            setMessage('邮箱验证成功！正在跳转...')
            
            // 延迟跳转，让用户看到成功消息
            setTimeout(() => {
              router.push(next)
            }, 2000)
          } else {
            setStatus('error')
            setMessage('验证成功但无法获取用户信息')
          }
        } else {
          setStatus('error')
          setMessage('无效的验证链接')
        }
      } catch (error) {
        console.error('Email confirmation error:', error)
        setStatus('error')
        setMessage('验证过程中发生错误')
      }
    }

    handleEmailConfirmation()
  }, [searchParams, router, getCurrentUser])

  const handleReturnToLogin = () => {
    router.push('/login')
  }

  const handleGoHome = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && <Spinner className="size-6" />}
            {status === 'success' && <CheckCircle className="h-6 w-6 text-green-500" />}
            {status === 'error' && <XCircle className="h-6 w-6 text-red-500" />}
            邮箱验证
          </CardTitle>
          <CardDescription>
            {status === 'loading' && '正在验证您的邮箱...'}
            {status === 'success' && '验证成功'}
            {status === 'error' && '验证失败'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            {message}
          </p>
          
          {status === 'error' && (
            <div className="space-y-2">
              <Button onClick={handleReturnToLogin} className="w-full">
                返回登录
              </Button>
              <Button variant="outline" onClick={handleGoHome} className="w-full">
                返回首页
              </Button>
            </div>
          )}
          
          {status === 'success' && (
            <div className="space-y-2">
              <Button onClick={handleGoHome} className="w-full">
                立即进入
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
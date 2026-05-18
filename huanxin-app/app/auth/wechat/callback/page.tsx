'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { CheckCircle, XCircle } from 'lucide-react'

export default function WeChatCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('正在处理微信登录...')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signInWithWechat } = useAuth()

  useEffect(() => {
    const handleWeChatCallback = async () => {
      try {
        // 获取微信回调参数
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        // 检查是否有错误
        if (error) {
          setStatus('error')
          setMessage(errorDescription || '微信登录授权失败')
          toast.error('微信登录授权失败')
          setTimeout(() => {
            router.push('/login')
          }, 3000)
          return
        }

        // 检查是否有授权码
        if (!code) {
          setStatus('error')
          setMessage('未获取到微信授权码')
          toast.error('微信登录失败：未获取到授权码')
          setTimeout(() => {
            router.push('/login')
          }, 3000)
          return
        }

        // 处理微信登录
        setMessage('正在验证微信授权...')
        
        // 这里应该调用后端API处理微信登录
        // 目前使用模拟的signInWithWechat方法
        await signInWithWechat()
        
        setStatus('success')
        setMessage('微信登录成功！正在跳转...')
        toast.success('微信登录成功')
        
        // 跳转到首页
        setTimeout(() => {
          router.push('/')
        }, 2000)

      } catch (error) {
        console.error('微信登录回调处理失败:', error)
        setStatus('error')
        setMessage('微信登录处理失败，请重试')
        toast.error('微信登录失败')
        
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    }

    handleWeChatCallback()
  }, [searchParams, signInWithWechat, router])

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center gap-4">
            <Spinner className="size-12" />
            <p className="text-muted-foreground animate-pulse">正在处理微信登录...</p>
          </div>
        )
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-500" />
      case 'error':
        return <XCircle className="w-12 h-12 text-red-500" />
      default:
        return (
          <div className="flex flex-col items-center gap-4">
            <Spinner className="size-12" />
            <p className="text-muted-foreground animate-pulse">正在处理微信登录...</p>
          </div>
        )
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-blue-600'
      case 'success':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-blue-600'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            {getStatusIcon()}
          </div>
          
          <h1 className="text-xl font-semibold text-gray-900 mb-4">
            微信登录处理
          </h1>
          
          <p className={`text-sm ${getStatusColor()} mb-6`}>
            {message}
          </p>
          
          {status === 'error' && (
            <div className="space-y-3">
              <button
                onClick={() => router.push('/login')}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                返回登录页面
              </button>
            </div>
          )}
          
          {status === 'loading' && (
            <div className="text-xs text-gray-400">
              请稍候，正在处理您的登录请求...
            </div>
          )}
          
          {status === 'success' && (
            <div className="text-xs text-gray-400">
              登录成功！即将跳转到首页...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
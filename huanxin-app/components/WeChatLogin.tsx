'use client'

import React, { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react'

interface WeChatLoginProps {
  onSuccess?: (userInfo: any) => void
  onError?: (error: string) => void
  className?: string
}

type LoginStatus = 'waiting' | 'scanned' | 'confirmed' | 'expired' | 'error'

const WeChatLogin: React.FC<WeChatLoginProps> = ({ 
  onSuccess, 
  onError, 
  className = '' 
}) => {
  const [status, setStatus] = useState<LoginStatus>('waiting')
  const [qrCode, setQrCode] = useState('')
  const [countdown, setCountdown] = useState(120) // 2分钟倒计时

  // 生成二维码内容
  const generateQRCode = () => {
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const qrContent = `https://wx.qq.com/login?uuid=${randomId}&timestamp=${timestamp}`
    setQrCode(qrContent)
    setStatus('waiting')
    setCountdown(120)
  }

  // 模拟扫码状态变化
  const simulateLoginProcess = () => {
    // 模拟用户扫码
    setTimeout(() => {
      if (status === 'waiting') {
        setStatus('scanned')
      }
    }, 3000)

    // 模拟用户确认登录
    setTimeout(() => {
      if (status === 'scanned') {
        setStatus('confirmed')
        // 模拟获取用户信息
        const mockUserInfo = {
          openid: 'mock_openid_' + Date.now(),
          nickname: '微信用户',
          headimgurl: 'https://via.placeholder.com/100x100/4CAF50/FFFFFF?text=微信',
          unionid: 'mock_unionid_' + Date.now()
        }
        onSuccess?.(mockUserInfo)
      }
    }, 6000)
  }

  // 初始化和重新生成二维码
  useEffect(() => {
    generateQRCode()
  }, [])

  // 开始模拟登录流程
  useEffect(() => {
    if (status === 'waiting' && qrCode) {
      simulateLoginProcess()
    }
  }, [status, qrCode])

  // 倒计时
  useEffect(() => {
    if (status === 'waiting' || status === 'scanned') {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setStatus('expired')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [status])

  const handleRefresh = () => {
    generateQRCode()
  }

  const getStatusText = () => {
    switch (status) {
      case 'waiting':
        return '请使用微信扫描二维码'
      case 'scanned':
        return '扫描成功，请在手机上确认登录'
      case 'confirmed':
        return '登录成功！'
      case 'expired':
        return '二维码已过期，请刷新重试'
      case 'error':
        return '登录失败，请重试'
      default:
        return '请使用微信扫描二维码'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'waiting':
        return 'text-gray-600'
      case 'scanned':
        return 'text-blue-600'
      case 'confirmed':
        return 'text-green-600'
      case 'expired':
      case 'error':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`flex flex-col items-center space-y-4 p-6 bg-white rounded-lg shadow-lg ${className}`}>
      {/* 标题 */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">微信扫码登录</h3>
        <p className="text-sm text-gray-500">使用微信扫一扫登录</p>
      </div>

      {/* 二维码区域 */}
      <div className="relative">
        <div className={`p-4 bg-white border-2 rounded-lg transition-all duration-300 ${
          status === 'expired' || status === 'error' ? 'border-red-300 opacity-50' : 
          status === 'scanned' ? 'border-blue-300' :
          status === 'confirmed' ? 'border-green-300' : 'border-gray-300'
        }`}>
          {qrCode && (status === 'waiting' || status === 'scanned') && (
            <QRCodeSVG 
              value={qrCode} 
              size={200}
              level="M"
              includeMargin={false}
            />
          )}
          
          {/* 过期或错误状态的遮罩 */}
          {(status === 'expired' || status === 'error') && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
              <div className="text-center">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                <button
                  onClick={handleRefresh}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>刷新二维码</span>
                </button>
              </div>
            </div>
          )}

          {/* 成功状态的遮罩 */}
          {status === 'confirmed' && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-green-600 font-medium">登录成功！</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 状态文本 */}
      <div className="text-center">
        <p className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </p>
        
        {/* 倒计时 */}
        {(status === 'waiting' || status === 'scanned') && countdown > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            {formatTime(countdown)} 后过期
          </p>
        )}
      </div>

      {/* 提示信息 */}
      <div className="text-center space-y-1">
        <p className="text-xs text-gray-400">
          打开微信，点击右上角"+"，选择"扫一扫"
        </p>
        {status === 'scanned' && (
          <p className="text-xs text-blue-500 animate-pulse">
            请在手机微信上点击"确认登录"
          </p>
        )}
      </div>

      {/* 刷新按钮 */}
      {(status === 'waiting' || status === 'scanned') && (
        <button
          onClick={handleRefresh}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          刷新二维码
        </button>
      )}
    </div>
  )
}

export default WeChatLogin
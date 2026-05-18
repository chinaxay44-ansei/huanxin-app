"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/lib/auth"
import { toast } from "sonner"
import { Eye, EyeOff, ChevronLeft } from "lucide-react"

export default function LoginPage() {
  // 用户名/密码登录与注册状态
  const [mode, setMode] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const router = useRouter()
  const { loginWithUsername, registerWithUsername, loading, error, isAuthenticated } = useAuth()

  // 如果已经登录，重定向到首页
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, router])

  // 验证用户名与密码
  const isValidUsername = (value: string) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    return usernameRegex.test(value)
  }

  const isValidPassword = (value: string) => value.length >= 6

  // 用户名登录
  const handleUsernameLogin = async () => {
    if (!isValidUsername(username)) {
      toast.error("用户名需为3-20位字母/数字/下划线")
      return
    }
    if (!isValidPassword(password)) {
      toast.error("密码长度至少6位")
      return
    }
    const result = await loginWithUsername(username, password)
    if (result.success) {
      toast.success("登录成功")
      router.push("/")
    } else {
      toast.error(result.error || "登录失败")
    }
  }

  // 用户名注册
  const handleUsernameRegister = async () => {
    if (!isValidUsername(username)) {
      toast.error("用户名需为3-20位字母/数字/下划线")
      return
    }
    const autoNickname = `新星${Math.floor(1000 + Math.random() * 9000)}`
    if (!isValidPassword(password)) {
      toast.error("密码长度至少6位")
      return
    }
    if (password !== confirmPassword) {
      toast.error("两次输入的密码不一致")
      return
    }
    if (!agreed) {
      toast.error("请先同意用户协议和隐私政策")
      return
    }
    const result = await registerWithUsername(username, password, autoNickname)
    if (result.success) {
      toast.success("注册成功，请登录")
      setMode("login")
      setPassword("")
      setConfirmPassword("")
    } else {
      toast.error(result.error || "注册失败")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 flex items-center gap-1 text-gray-700 hover:text-gray-900 bg-white/80 backdrop-blur px-3 py-1 rounded-full shadow-sm"
        aria-label="返回上一页"
      >
        <ChevronLeft className="w-4 h-4" />
        返回
      </button>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              欢迎使用焕星
            </h1>
            <p className="text-gray-600">使用用户名登录或注册</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* 用户名登录/注册 */}
          <div className="space-y-6 mt-2">
            <div className="flex justify-center mb-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setMode("login")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === "login" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  登录
                </button>
                <button
                  onClick={() => setMode("register")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    mode === "register" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  注册
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名（3-20位字母/数字/下划线）"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 text-lg"
              />
            </div>

            {/* 昵称自动生成：新星+四位随机数字（不再需要输入） */}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "register" ? "请输入密码（至少6位）" : "请输入密码"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 text-lg pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  确认密码
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="请再次输入密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 text-lg pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {mode === "register" && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="agreement"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked as boolean)}
                />
                <label htmlFor="agreement" className="text-sm text-gray-600">
                  我已阅读并同意
                  <button
                    type="button"
                    className="text-pink-600 hover:underline mx-1"
                    onClick={() => toast.info("没有隐私政策和用户协议")}
                  >
                    用户协议
                  </button>
                  和
                  <button
                    type="button"
                    className="text-pink-600 hover:underline mx-1"
                    onClick={() => toast.info("没有隐私政策和用户协议")}
                  >
                    隐私政策
                  </button>
                </label>
              </div>
            )}

            <Button
              onClick={mode === "login" ? handleUsernameLogin : handleUsernameRegister}
              disabled={
                loading ||
                !username ||
                !password ||
                (mode === "register" && (!confirmPassword || !agreed))
              }
              className="w-full h-12 text-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              {loading ? (mode === "login" ? "登录中..." : "注册中...") : (mode === "login" ? "登录" : "注册")}
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              登录即表示您同意我们的服务条款和隐私政策
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

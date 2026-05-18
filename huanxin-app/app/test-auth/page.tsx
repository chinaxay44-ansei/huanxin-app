"use client"

import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function TestAuthPage() {
  const { setUser, user, isAuthenticated, logout } = useAuth()
  const router = useRouter()

  const simulateLogin = () => {
    // 模拟登录，设置测试用户
    const testUser = {
      id: "32e57499-4c68-4ec1-be99-318ce2f48847",
      phone: "123456",
      nickname: "123456",
      avatar_url: null,
      bio: "测试用户",
      gender: "male",
      birthday: "1990-01-01",
      location: "北京",
      following_count: 0,
      followers_count: 0,
      likes_received_count: 0,
      works_count: 0,
      energy_balance: 100,
      status: "active",
      is_verified: false,
      verified_type: null,
      settings: {},
      created_at: "2025-11-03T13:41:51.608633+00:00",
      updated_at: "2025-11-03T13:41:51.608633+00:00",
      last_login_at: null
    }
    
    setUser(testUser)
  }

  const handleLogout = async () => {
    await logout()
  }

  const goToProfile = () => {
    router.push("/profile")
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">认证测试页面</h1>
      
      <div className="space-y-2">
        <p>当前认证状态: {isAuthenticated ? "已登录" : "未登录"}</p>
        {user && (
          <div className="bg-gray-100 p-4 rounded">
            <p>用户ID: {user.id}</p>
            <p>昵称: {user.nickname}</p>
            <p>手机号: {user.phone}</p>
          </div>
        )}
      </div>

      <div className="space-x-2">
        <Button onClick={simulateLogin} disabled={isAuthenticated}>
          模拟登录
        </Button>
        <Button onClick={handleLogout} disabled={!isAuthenticated} variant="outline">
          退出登录
        </Button>
        <Button onClick={goToProfile} variant="secondary">
          前往个人资料页
        </Button>
      </div>
    </div>
  )
}
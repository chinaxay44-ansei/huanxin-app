"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
// icons removed for text-only navigation
import { useAuth } from "@/lib/auth"

interface BottomNavProps {
  active?: "home" | "video" | "generate" | "messages" | "profile"
}

export function BottomNav({ active }: BottomNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()

  if (pathname?.startsWith("/admin")) return null
  // 聊天页全屏体验，不显示底部导航，避免遮挡输入框
  if (pathname?.startsWith("/chat")) return null

  const navItems = [
    { id: "home", label: "首页", path: "/", requiresAuth: false },
    { id: "video", label: "视频", path: "/video", requiresAuth: false },
    { id: "generate", label: "生成", path: "/generate", isCenter: true, requiresAuth: true },
    { id: "messages", label: "消息", path: "/messages", requiresAuth: true },
    { id: "profile", label: "我的", path: "/profile", requiresAuth: true },
  ] as const

  const currentActive = active ??
    (pathname === "/" ? "home"
    : pathname?.startsWith("/video") ? "video"
    : pathname?.startsWith("/generate") ? "generate"
    : pathname?.startsWith("/messages") ? "messages"
    : pathname?.startsWith("/profile") ? "profile"
    : undefined)

  const handleCenterClick = () => {
    if (!isAuthenticated) {
      router.push("/login")
    } else {
      router.push("/generate")
    }
  }

  return (
    <nav data-slot="bottom-nav" className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-screen-sm mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentActive === item.id

          if (item.isCenter) {
            return (
              <button
                key={item.id}
                onClick={handleCenterClick}
                data-slot="nav-center"
                className="flex flex-col items-center justify-center -mt-6"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand to-brand-secondary flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow relative">
                  <svg
                    className="w-8 h-8 text-brand-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                      fill="currentColor"
                    />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand rounded-full border-2 border-background" />
                </div>
              </button>
            )
          }

          const target = item.requiresAuth && !isAuthenticated ? "/login" : item.path

          return (
            <Link
              key={item.id}
              href={target}
              prefetch
              className={`flex flex-col items-center justify-center gap-0 flex-1 transition-colors ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <span className="text-lg md:text-xl font-semibold">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

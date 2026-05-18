import type React from "react"
import type { Metadata } from "next"
import { Suspense } from "react"

import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/components/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { BottomNav } from "@/components/bottom-nav"
import "./globals.css"

export const metadata: Metadata = {
  title: "焕星 - 唤醒你的美",
  description: "AI-powered video social app with creative generation features",
  applicationName: "焕星",
  manifest: "/manifest.webmanifest",
  themeColor: "#ffffff",
  icons: {
    icon: "/桌面图标.png",
    apple: "/桌面图标.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "焕星",
  },
  formatDetection: {
    telephone: false,
  },
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const enableAnalytics = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <Suspense fallback={<div className="max-w-screen-sm mx-auto bg-background min-h-screen flex items-center justify-center">加载中...</div>}>
              <div className="max-w-screen-sm mx-auto bg-background min-h-screen">{children}</div>
            </Suspense>
            <BottomNav />
          </AuthProvider>
          <Toaster />
          {enableAnalytics && (<Analytics />)}
        </ThemeProvider>
      </body>
    </html>
  )
}

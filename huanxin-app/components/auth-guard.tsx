"use client"

import { useEffect, useState } from "react"
import type React from "react"

import { Spinner } from "./ui/spinner"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, loading, checkAuthStatus } = useAuth()
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[AuthGuard]", { isAuthenticated, loading, isBootstrapping })
    }
  }, [isAuthenticated, loading, isBootstrapping])

  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        await checkAuthStatus()
      } catch (error) {
        console.error("[AuthGuard] checkAuthStatus failed", error)
      } finally {
        if (isMounted) {
          setIsBootstrapping(false)
        }
      }
    }

    initAuth()

    return () => {
      isMounted = false
    }
  }, [checkAuthStatus])

  useEffect(() => {
    if (!isBootstrapping && !isAuthenticated && !loading) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, isBootstrapping, router])

  if (isBootstrapping || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="size-8" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

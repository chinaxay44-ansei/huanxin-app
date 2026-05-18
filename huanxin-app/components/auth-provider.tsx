"use client"

import { useAuth } from "@/lib/auth"

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  useAuth()

  return <>{children}</>
}

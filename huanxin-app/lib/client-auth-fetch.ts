"use client"

export function getClientAuthToken(): string | null {
  if (typeof window === "undefined") return null

  try {
    return localStorage.getItem("auth-token")
  } catch {
    return null
  }
}

export function withClientAuth(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers)
  const token = getClientAuthToken()

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  return {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  }
}

export function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, withClientAuth(init))
}

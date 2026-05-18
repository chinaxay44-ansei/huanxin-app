import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

export interface AuthUser {
  userId: string
  username: string
}

type VerifyResult = AuthUser | { expired: true } | null

export interface AuthRequest extends NextRequest {
  user?: AuthUser
}

export function verifyToken(token: string): VerifyResult {
  try {
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      const decoded: any = jwt.decode(token)
      if (decoded && decoded.userId && decoded.username) {
        return { userId: decoded.userId, username: decoded.username }
      }
      return null
    }

    const decoded = jwt.verify(token, jwtSecret) as any
    return {
      userId: decoded.userId,
      username: decoded.username
    }
  } catch (error: any) {
    // 过期不再打印日志，返回标记，调用方决定是否清理登录态
    if (error?.name === 'TokenExpiredError') {
      return { expired: true }
    }
    return null
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  // 从 Authorization header 获取 token
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // 从 cookie 获取 token
  const cookieToken = request.cookies.get('auth-token')?.value
  if (cookieToken) {
    return cookieToken
  }

  return null
}

export function authenticateRequest(request: NextRequest): AuthUser | null {
  const token = getTokenFromRequest(request)
  if (!token) {
    return null
  }

  const decoded = verifyToken(token)
  if (decoded && 'expired' in decoded) return null
  return decoded
}

export function requireAuth(request: NextRequest): { user: AuthUser } | { error: any } {
  const token = getTokenFromRequest(request)
  if (!token) {
    return {
      error: {
        success: false,
        error: 'UNAUTHORIZED',
        message: '请先登录',
        expired: false,
      }
    }
  }

  const decoded = verifyToken(token)
  if (!decoded || ('expired' in decoded && decoded.expired)) {
    return {
      error: {
        success: false,
        error: 'UNAUTHORIZED',
        message: '请先登录',
        expired: 'expired' in (decoded || {}) ? true : false,
      }
    }
  }

  return { user: decoded, token }
}

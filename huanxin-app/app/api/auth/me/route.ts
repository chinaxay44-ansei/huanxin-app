import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { getUserInfo } from '@/lib/api/auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    
    if ('error' in authResult) {
      const res = NextResponse.json(authResult.error, { status: 401 })
      if (authResult.error?.expired) {
        res.cookies.set('auth-token', '', { path: '/', httpOnly: true, sameSite: 'lax', secure: true, expires: new Date(0) })
      }
      return res
    }

    // 仅按用户ID查询
    const result = await getUserInfo(authResult.user.userId)
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      const statusCode = result.error === 'USER_NOT_FOUND' ? 404 : 500
      return NextResponse.json(result, { status: statusCode })
    }
  } catch (error) {
    console.error('获取用户信息API错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: '服务器内部错误'
      },
      { status: 500 }
    )
  }
}

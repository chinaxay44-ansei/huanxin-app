import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { getUserStats } from '@/lib/api/users'

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAuth(request)
    
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rawId = searchParams.get('userId') || authResult.user.userId
    const isValid = typeof rawId === 'string' && /^[0-9a-fA-F-]{36}$/.test(rawId)
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'INVALID_USER_ID', message: '用户ID缺失' }, { status: 400 })
    }
    const result = await getUserStats(request, rawId)
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      const statusCode = result.error === 'USER_NOT_FOUND' ? 404 : 500
      return NextResponse.json(result, { status: statusCode })
    }
  } catch (error) {
    console.error('获取用户统计API错误:', error)
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
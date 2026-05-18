import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { getUserNotifications, getUnreadNotificationCount } from '@/lib/api/messages'

// GET /api/messages/notifications - 获取用户通知列表
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type') // 可选的通知类型过滤
    const unread_only = searchParams.get('unread_only') === 'true'
    
    if (limit < 1 || limit > 50) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_LIMIT',
        message: '每页数量必须在1-50之间'
      }, { status: 400 })
    }
    
    if (offset < 0) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_OFFSET',
        message: '偏移量不能为负数'
      }, { status: 400 })
    }
    
    // 如果请求的是未读数量
    if (searchParams.get('count_only') === 'true') {
      const result = await getUnreadNotificationCount(authResult.user.userId, authResult.token)
      return NextResponse.json(result)
    }
    
    const result = await getUserNotifications(authResult.user.userId, {
      limit,
      offset,
      type,
      unread_only
    }, authResult.token)
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('获取通知列表API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}

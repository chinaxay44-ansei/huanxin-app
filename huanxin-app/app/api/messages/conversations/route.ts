import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { createPrivateConversation, getUserConversations } from '@/lib/api/messages'

// GET /api/messages/conversations - 获取用户的会话列表
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
    
    const result = await getUserConversations(authResult.user.userId, limit, offset, authResult.token)
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('获取会话列表API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}

// POST /api/messages/conversations - 创建私聊会话
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }
    
    const body = await request.json()
    const { target_user_id } = body
    
    if (!target_user_id) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_TARGET_USER_ID',
        message: '请提供目标用户ID'
      }, { status: 400 })
    }
    
    if (target_user_id === authResult.user.userId) {
      return NextResponse.json({
        success: false,
        error: 'CANNOT_CHAT_WITH_SELF',
        message: '不能与自己创建会话'
      }, { status: 400 })
    }
    
    const result = await createPrivateConversation(authResult.user.userId, target_user_id, authResult.token)
    
    if (!result.success) {
      const status = result.error === 'TARGET_NOT_FOUND' ? 404
        : result.error === 'INVALID_TARGET' ? 400
        : 400
      return NextResponse.json(result, { status })
    }
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('创建私聊会话API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}

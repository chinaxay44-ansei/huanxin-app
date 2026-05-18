import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { followUser, unfollowUser } from '@/lib/api/social'

// POST /api/social/follow - 关注用户
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }
    
    let following_id: string | null = null
    try {
      const body = await request.json()
      following_id = body?.following_id ?? null
    } catch {}
    if (!following_id) {
      const { searchParams } = new URL(request.url)
      following_id = searchParams.get('following_id')
    }
    
    if (!following_id) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_FOLLOWING_ID',
        message: '请提供要关注的用户ID'
      }, { status: 400 })
    }
    
    const result = await followUser(authResult.user.userId, following_id)
    
    if (!result.success) {
      const statusCode = result.error === 'USER_NOT_FOUND' ? 404 : 400
      return NextResponse.json(result, { status: statusCode })
    }
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('关注用户API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}

// DELETE /api/social/follow - 取消关注用户
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }
    
    let following_id: string | null = null
    try {
      const body = await request.json()
      following_id = body?.following_id ?? null
    } catch {}
    if (!following_id) {
      const { searchParams } = new URL(request.url)
      following_id = searchParams.get('following_id')
    }
    
    if (!following_id) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_FOLLOWING_ID',
        message: '请提供要取消关注的用户ID'
      }, { status: 400 })
    }
    
    const result = await unfollowUser(authResult.user.userId, following_id)
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('取消关注用户API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}
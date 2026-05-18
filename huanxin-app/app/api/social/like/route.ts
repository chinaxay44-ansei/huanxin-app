import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { likeWork, unlikeWork } from '@/lib/api/social'

// POST /api/social/like - 点赞作品
export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }
    
    const body = await request.json()
    const { work_id } = body
    
    if (!work_id) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_WORK_ID',
        message: '请提供要点赞的作品ID'
      }, { status: 400 })
    }
    
    const result = await likeWork(authResult.user.userId, work_id)
    
    if (!result.success) {
      const statusCode = result.error === 'WORK_NOT_FOUND' ? 404 : 400
      return NextResponse.json(result, { status: statusCode })
    }
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('点赞作品API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}

// DELETE /api/social/like - 取消点赞作品
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户身份
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }
    
    const body = await request.json()
    const { work_id } = body
    
    if (!work_id) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_WORK_ID',
        message: '请提供要取消点赞的作品ID'
      }, { status: 400 })
    }
    
    const result = await unlikeWork(authResult.user.userId, work_id)
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('取消点赞作品API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}
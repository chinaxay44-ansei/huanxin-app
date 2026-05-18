import { NextRequest, NextResponse } from 'next/server'
import { searchUsers } from '@/lib/api/search'

// GET /api/search/users - 搜索用户
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
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
    
    // 从请求头获取用户ID（如果已登录）
    const userId = request.headers.get('x-user-id')
    
    const result = await searchUsers(query, {
      limit,
      offset,
      user_id: userId || undefined
    })
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('搜索用户API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}
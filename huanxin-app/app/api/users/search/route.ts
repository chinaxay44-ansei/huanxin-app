import { NextRequest, NextResponse } from 'next/server'
import { searchUsers } from '@/lib/api/users'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')
    
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PARAMS',
          message: '搜索关键词不能为空'
        },
        { status: 400 }
      )
    }
    
    // 验证搜索关键词长度
    if (query.trim().length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_QUERY',
          message: '搜索关键词至少2个字符'
        },
        { status: 400 }
      )
    }
    
    const limit = limitParam ? Math.min(parseInt(limitParam), 50) : 20 // 最大50条
    const offset = offsetParam ? Math.max(parseInt(offsetParam), 0) : 0
    
    // 验证分页参数
    if (isNaN(limit) || isNaN(offset)) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PARAMS',
          message: '分页参数格式不正确'
        },
        { status: 400 }
      )
    }
    
    const result = await searchUsers(request, query.trim(), limit, offset)
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('搜索用户API错误:', error)
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
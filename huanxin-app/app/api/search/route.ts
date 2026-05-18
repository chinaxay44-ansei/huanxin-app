import { NextRequest, NextResponse } from 'next/server'
import { searchAll, getHotSearchKeywords, getSearchSuggestions } from '@/lib/api/search'

// GET /api/search - 综合搜索
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')
    const type = searchParams.get('type') // 'suggestions' | 'hot' | null
    
    // 获取搜索建议
    if (type === 'suggestions') {
      if (!query.trim()) {
        return NextResponse.json({
          success: true,
          data: {
            suggestions: []
          }
        })
      }
      
      const result = await getSearchSuggestions(query, limit)
      return NextResponse.json(result)
    }
    
    // 获取热门搜索关键词
    if (type === 'hot') {
      const result = await getHotSearchKeywords(limit)
      return NextResponse.json(result)
    }
    
    // 综合搜索
    if (!query.trim()) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_QUERY',
        message: '请提供搜索关键词'
      }, { status: 400 })
    }
    
    if (limit < 1 || limit > 50) {
      return NextResponse.json({
        success: false,
        error: 'INVALID_LIMIT',
        message: '每页数量必须在1-50之间'
      }, { status: 400 })
    }
    
    // 从请求头获取用户ID（如果已登录）
    const userId = request.headers.get('x-user-id')
    
    const result = await searchAll(query, {
      limit,
      user_id: userId || undefined
    })
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('综合搜索API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}
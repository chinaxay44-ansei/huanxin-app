import { NextRequest, NextResponse } from 'next/server'
import { getCategoriesList } from '@/lib/api/categories'

export async function GET(request: NextRequest) {
  try {
    const result = await getCategoriesList(request)

    if (!result.success) {
      return NextResponse.json({ error: result.error, message: result.message }, { status: 400 })
    }

    return NextResponse.json(result.data, {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=1800'
      }
    })
  } catch (error) {
    console.error('获取分类列表失败:', error)
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: '服务器内部错误' }, { status: 500 })
  }
}
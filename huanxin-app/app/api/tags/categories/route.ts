import { NextRequest, NextResponse } from 'next/server'
import { getPersonalTagsWithCategories } from '@/lib/api/users'

export async function GET(request: NextRequest) {
  try {
    const result = await getPersonalTagsWithCategories()
    
    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 500 })
    }
  } catch (error) {
    console.error('获取个人标签分类API错误:', error)
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
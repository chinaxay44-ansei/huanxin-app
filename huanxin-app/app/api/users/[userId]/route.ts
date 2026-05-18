import { NextRequest, NextResponse } from 'next/server'
import { getUserProfile, getUserStats } from '@/lib/api/users'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    
    const isValidUuid = typeof userId === 'string' && /^[0-9a-fA-F-]{36}$/.test(userId)
    if (!isValidUuid) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PARAMS',
          message: '缺少或非法的用户ID参数'
        },
        { status: 400 }
      )
    }
    
    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('includeStats') === 'true'
    
    // 并行获取用户信息和统计数据
    const promises = [getUserProfile(request, userId)]
    if (includeStats) {
      promises.push(getUserStats(request, userId))
    }
    
    const results = await Promise.all(promises)
    const profileResult = results[0]
    const statsResult = includeStats ? results[1] : null
    
    if (!profileResult.success) {
      const statusCode = profileResult.error === 'USER_NOT_FOUND' ? 404 : 500
      return NextResponse.json(profileResult, { status: statusCode })
    }
    
    const responseData: any = {
      ...profileResult.data
    }
    
    if (statsResult && statsResult.success) {
      responseData.stats = statsResult.data
    }
    
    return NextResponse.json(
      {
        success: true,
        data: responseData
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('获取用户信息API错误:', error)
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
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { getAIGenerationTaskDetail } from '@/lib/api/ai'

interface RouteParams {
  params: {
    taskId: string
  }
}

// GET /api/ai/generate/[taskId] - 获取AI生成任务详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { taskId } = params
    
    if (!taskId) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_TASK_ID',
        message: '请提供任务ID'
      }, { status: 400 })
    }
    
    // 验证用户身份
    const authResult = requireAuth(request)
    if ('error' in authResult) {
      return NextResponse.json(authResult.error, { status: 401 })
    }
    
    const result = await getAIGenerationTaskDetail(taskId, authResult.user.userId)
    
    if (!result.success) {
      const statusCode = result.error === 'TASK_NOT_FOUND' ? 404 : 400
      return NextResponse.json(result, { status: statusCode })
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('获取AI生成任务详情API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { getAITemplateDetail } from '@/lib/api/ai'

interface RouteParams {
  params: Promise<{
    templateId: string
  }>
}

// GET /api/ai/templates/[templateId] - 获取AI模板详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { templateId } = await params
    
    if (!templateId) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_TEMPLATE_ID',
        message: '请提供模板ID'
      }, { status: 400 })
    }
    
    const result = await getAITemplateDetail(templateId)
    
    if (!result.success) {
      const statusCode = result.error === 'TEMPLATE_NOT_FOUND' ? 404 : 400
      return NextResponse.json(result, { status: statusCode })
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('获取AI模板详情API错误:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}
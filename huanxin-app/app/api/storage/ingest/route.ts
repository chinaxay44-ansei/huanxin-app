import { NextRequest, NextResponse } from 'next/server'
import { ingestBucketObjects } from '@/lib/api/storage-sync'

// GET /api/storage/ingest?bucket=huanxin-media&prefix=tests/
// 用于将存储桶对象同步到 works 表，便于前端展示
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket') || 'huanxin-media'
    const prefix = searchParams.get('prefix') || 'tests/'

    const result = await ingestBucketObjects({ bucket, prefix })

    return NextResponse.json({
      success: result.success,
      processed: result.processed,
      inserted: result.inserted,
      skipped: result.skipped,
      errors: result.errors,
      details: result.details || []
    })
  } catch (error) {
    console.error('Storage ingest API error:', error)
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: '服务器内部错误'
    }, { status: 500 })
  }
}
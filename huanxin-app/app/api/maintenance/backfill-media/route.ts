import { NextResponse } from 'next/server'
import { backfillWorkTypesByUrlSuffix } from '@/lib/api/works'

export async function POST(request: Request) {
  try {
    const adminSecret = request.headers.get('x-admin-secret')
    const envSecret = process.env.ADMIN_SECRET
    if (!envSecret || adminSecret !== envSecret) {
      return NextResponse.json({ success: false, error: 'FORBIDDEN', message: '无权限' }, { status: 403 })
    }

    const result = await backfillWorkTypesByUrlSuffix()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' }, { status: 500 })
  }
}
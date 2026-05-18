import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const bucket: string = body?.bucket || 'work-media'

    if (!bucket || typeof bucket !== 'string') {
      return NextResponse.json({ success: false, message: 'Invalid bucket name' }, { status: 400 })
    }

    // COS 单桶模式，直接返回成功
    return NextResponse.json({ success: true, message: 'COS bucket ready', bucket })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message || 'Failed to ensure bucket' }, { status: 500 })
  }
}

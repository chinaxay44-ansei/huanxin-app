import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  try {
    const supabase = createServiceClient()
    const { data: gen, error } = await supabase
      .from('ai_generations')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !gen) throw error || new Error('记录不存在')

    return Response.json({ success: true, data: gen })
  } catch (e: any) {
    console.error('GET /api/ai/generations/[id] error', e)
    return Response.json({ success: false, message: e.message || '服务器错误' }, { status: 500 })
  }
}

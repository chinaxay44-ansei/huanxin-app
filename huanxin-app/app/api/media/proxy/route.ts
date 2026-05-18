import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const u = url.searchParams.get('u')
    if (!u) return new Response('Missing u', { status: 400 })

    const supa = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const allowedPrefix = `${supa}/storage/v1/object/public/`
    if (!supa || !u.startsWith(allowedPrefix) || !u.startsWith('https://')) {
      return new Response('Forbidden', { status: 403 })
    }

    const upstream = await fetch(u)
    if (!upstream.ok) return new Response('Upstream error', { status: upstream.status })

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    const contentLength = upstream.headers.get('content-length') || undefined

    return new Response(upstream.body, {
      headers: {
        'Content-Type': contentType,
        ...(contentLength ? { 'Content-Length': contentLength } : {}),
        'Cache-Control': 'public, max-age=604800, immutable, stale-while-revalidate=604800',
      }
    })
  } catch (e) {
    return new Response('Internal Error', { status: 500 })
  }
}
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal(root) {
  const envPath = path.join(root, '.env.local')
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf8')
  content.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/)
    if (m) {
      const key = m[1]
      let val = m[2]
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
      process.env[key] = val
    }
  })
}

async function listAllPaths(supabase, bucket, base = '') {
  const { data, error } = await supabase.storage.from(bucket).list(base, { limit: 1000 })
  if (error) throw error
  const files = []
  const folders = []
  for (const it of data || []) {
    const p = base ? `${base}/${it.name}` : it.name
    if (it.id) files.push(p)
    else folders.push(p)
  }
  for (const folder of folders) {
    const sub = await listAllPaths(supabase, bucket, folder)
    files.push(...sub)
  }
  return files
}

async function removeAllInBucket(supabase, bucket) {
  const all = await listAllPaths(supabase, bucket, '')
  if (all.length === 0) return { removed: 0 }
  let removed = 0
  const chunkSize = 1000
  for (let i = 0; i < all.length; i += chunkSize) {
    const chunk = all.slice(i, i + chunkSize)
    const { error } = await supabase.storage.from(bucket).remove(chunk)
    if (error) throw error
    removed += chunk.length
  }
  return { removed }
}

async function main() {
  const root = path.resolve(process.cwd())
  loadEnvLocal(root)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const supabase = createClient(url, key)
  const buckets = ['work-media', 'huanxin-media']
  for (const b of buckets) {
    try {
      const { removed } = await removeAllInBucket(supabase, b)
      console.log(`[cleanup] bucket=${b} removed=${removed}`)
    } catch (e) {
      console.error(`[cleanup] bucket=${b} error`, e?.message || e)
    }
  }
}

main().catch((e) => {
  console.error('cleanup failed', e?.message || e)
  process.exit(1)
})
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Prefer env vars; fallback to known values
const SUPABASE_URL = 'https://rwjgloblhimajhmrergo.supabase.co';
const SUPABASE_ANON_KEY = '';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3amdsb2JsaGltYWpobXJlcmdvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTYyNjA5OSwiZXhwIjoyMDc3MjAyMDk5fQ.99sxfW25r4qzRQ4HLxePhwL6kqyhFETZ7p3bMBl9pn4';
const BUCKET = 'huanxin-media';
const LOCAL_FOLDER = path.resolve('C:/Users/admin/Desktop/TareDemo2/HuanXing/huanxin-app/储存桶测试文件：图片、视频');

// Default uploader client uses service role to bypass storage policies
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY);

// Choose an existing test user as author
const DEFAULT_USER_ID = '62a65613-2bf5-451a-aaba-d7e0485ab322';

function guessContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.mov') return 'video/quicktime';
  return 'application/octet-stream';
}
function guessType(filename) {
  const ct = guessContentType(filename);
  if (ct.startsWith('image/')) return 'image';
  if (ct.startsWith('video/')) return 'video';
  return 'image';
}

// Sanitize to storage-safe key: keep [a-zA-Z0-9._-]
function sanitizeKey(name) {
  const base = path.basename(name);
  const safe = base
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  return safe;
}

async function ensureWorkRecord({ mediaUrl, type, title, thumbnailUrl, category }) {
  // Avoid duplicates
  const { data: existing, error: selErr } = await supabase
    .from('works')
    .select('id')
    .eq('media_url', mediaUrl)
    .limit(1);
  if (selErr) {
    console.error('Check existing work failed:', selErr.message);
  }
  if (existing && existing.length > 0) {
    console.log('Work already exists, skip DB insert:', mediaUrl);
    return existing[0].id;
  }
  const payload = {
    user_id: DEFAULT_USER_ID,
    type: type,
    media_url: mediaUrl,
    thumbnail_url: thumbnailUrl || null,
    title: title || null,
    category: category || null,
    status: 'published',
    visibility: 'public',
    is_ai_generated: /ComfyUI|AI|Vidu|WanVideo/i.test(title || '')
  };
  const { data: inserted, error: insErr } = await supabase
    .from('works')
    .insert(payload)
    .select('id')
    .limit(1);
  if (insErr) {
    console.error('Insert work failed:', insErr.message, payload);
    return null;
  }
  const id = inserted?.[0]?.id;
  console.log('Inserted work id:', id, 'for', mediaUrl);
  return id;
}

(async () => {
  try {
    const entries = fs.readdirSync(LOCAL_FOLDER, { withFileTypes: true });
    const files = entries.filter(e => e.isFile()).map(e => e.name);
    if (files.length === 0) {
      console.log('No files found in test folder.');
      return;
    }
    for (const rawName of files) {
      const name = sanitizeKey(rawName);
      const fullPath = path.join(LOCAL_FOLDER, rawName);
      const contentType = guessContentType(rawName);
      const data = fs.readFileSync(fullPath);
      const objectPath = 'tests/' + name;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(objectPath, data, { contentType, cacheControl: '3600', upsert: false });
      if (error) {
        console.error('Upload failed for ' + rawName + ':', error.message);
        continue;
      }
      const publicUrl = SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + objectPath;
      console.log('Uploaded ' + rawName + ' -> ' + publicUrl);

      const type = guessType(rawName);
      const title = path.parse(rawName).name;
      const category = type === 'image' ? 'ai_photo' : 'video';
      const thumbnailUrl = type === 'image' ? publicUrl : null; // simple default

      await ensureWorkRecord({ mediaUrl: publicUrl, type, title, thumbnailUrl, category });
    }
  } catch (err) {
    console.error('Error during upload:', err);
  }
})();





const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const SUPABASE_URL = 'https://rwjgloblhimajhmrergo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3amdsb2JsaGltYWpobXJlcmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2MjYwOTksImV4cCI6MjA3NzIwMjA5OX0.sepwGr9-PD9XAmJE2LH_iCS-4NjPSqh8NE-Z-fljSco';
const BUCKET = 'huanxin-media';
const LOCAL_FOLDER = 'c:\\Users\\admin\\Desktop\\TareDemo2\\HuanXing\\huanxin-app\\储存桶测试文件：图片、视频';

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

(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const entries = fs.readdirSync(LOCAL_FOLDER, { withFileTypes: true });
    const files = entries.filter(e => e.isFile()).map(e => e.name);
    if (files.length === 0) {
      console.log('No files found in test folder.');
      return;
    }
    for (const name of files) {
      const fullPath = path.join(LOCAL_FOLDER, name);
      const contentType = guessContentType(name);
      const data = fs.readFileSync(fullPath);
      const objectPath = 'tests/' + name;
      const { data: result, error } = await supabase.storage
        .from(BUCKET)
        .upload(objectPath, data, { contentType, cacheControl: '3600' });
      if (error) {
        console.error('Upload failed for ' + name + ':', error.message);
      } else {
        const publicUrl = SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + objectPath;
        console.log('Uploaded ' + name + ' -> ' + publicUrl);
      }
    }
  } catch (err) {
    console.error('Error during upload:', err);
  }
})();

// Cloudflare Pages: root = repository root, command = node taicho/build-preview.cjs,
// output directory = taicho-preview-dist. Publish only explicitly listed app assets.
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(__dirname, '..', 'taicho-preview-dist');
fs.mkdirSync(path.join(out, 'taicho', 'icons'), { recursive: true });
const files = ['index.html', 'manifest.webmanifest', 'sw.js',
  'icons/apple-touch-icon.png', 'icons/icon-192.png',
  'icons/icon-512.png', 'icons/icon-512-maskable.png'];
for (const file of files) {
  let content = fs.readFileSync(path.join(__dirname, file));
  if (file === 'index.html') content = Buffer.from(content.toString('utf8')
    .replace('<h1>体調ログ</h1>', '<h1>体調ログ テスト</h1><p class="note">テスト環境・架空データ専用。本番のバックアップは取り込まないでください。</p>')
    .replace('content="体調ログ"', 'content="体調ログ テスト"'));
  if (file === 'manifest.webmanifest') {
    const manifest = JSON.parse(content);
    manifest.name = manifest.short_name = '体調ログ テスト';
    content = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  }
  fs.writeFileSync(path.join(out, 'taicho', file), content);
}
fs.writeFileSync(path.join(out, '404.html'), '<!doctype html><html lang="ja"><meta charset="utf-8"><title>テスト環境</title><p>このページはありません。<a href="/taicho/">体調ログ テスト</a></p></html>');
fs.writeFileSync(path.join(out, '_headers'), '/*\n  X-Robots-Tag: noindex, nofollow\n/taicho/sw.js\n  Cache-Control: no-cache\n');
console.log('Prepared test-only app assets in taicho-preview-dist/taicho/');

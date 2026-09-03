'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const w = require(path.join(os.homedir(), '.local/share/yituo-hub-gzh/cli/lib/wechat.js'));
const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/yituo-hub-gzh/config.json'), 'utf8'));
const en = 'The server behavior is the final answer. ';
function buildBytes(targetBytes) {
  const unit = '<section style="padding:10px;background:#f7f5fb;margin-bottom:8px;"><p>' + en.repeat(20).trim() + '</p></section>';
  const n = Math.max(1, Math.ceil((targetBytes - 200) / Buffer.byteLength(unit)));
  let c = '<section style="max-width:578px;">';
  for (let i = 0; i < n; i++) c += unit;
  return c + '</section>';
}
async function probe(token, content) {
  const bytes = Buffer.byteLength(content);
  try {
    const cover = await w.uploadCover(token, { buffer: fs.readFileSync('cover.png'), extension: 'png', mime: 'image/png' });
    const r = await w.addDraft(token, { article_type: 'news', title: '二分 ' + (bytes / 1024).toFixed(0) + 'KB', author: 'Y visual', digest: '二分。', content, thumb_media_id: cover.media_id, need_open_comment: 0, only_fans_can_comment: 0 });
    fs.appendFileSync('probe-ids.txt', r.media_id + '\n');
    return { ok: true, bytes };
  } catch (e) {
    if (!e.errcode) throw e;
    return { ok: false, bytes, errcode: e.errcode };
  }
}
(async () => {
  const token = await w.getAccessToken(cfg.appid, cfg.appsecret);
  let lo = 434 * 1024, hi = 900 * 1024; // lo=已知通过, hi=已知拒绝
  while (hi - lo > 16 * 1024) {
    const mid = Math.floor((lo + hi) / 2);
    const r = await probe(token, buildBytes(mid));
    console.log((r.bytes / 1024).toFixed(0) + ' KB → ' + (r.ok ? '✅ 过' : '❌ 拒(' + r.errcode + ')'));
    if (r.ok) lo = r.bytes; else hi = r.bytes;
  }
  console.log('==== 字节维度真实上限锁定在 ' + (lo / 1024).toFixed(0) + ' KB ~ ' + (hi / 1024).toFixed(0) + ' KB');
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });

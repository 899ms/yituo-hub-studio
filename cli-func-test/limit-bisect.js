'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const w = require(path.join(os.homedir(), '.local/share/yituo-hub-gzh/cli/lib/wechat.js'));
const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/yituo-hub-gzh/config.json'), 'utf8'));
const en = 'The server behavior is the final answer. ';
function buildBytes(targetBytes) {
  const unit = '<section style="padding:10px;background:#f7f5fb;margin-bottom:8px;"><p>' + en.repeat(20).trim() + '</p></section>';
  const uBytes = Buffer.byteLength(unit);
  const n = Math.ceil((targetBytes - 200) / uBytes);
  let c = '<section style="max-width:578px;">';
  for (let i = 0; i < n; i++) c += unit;
  return c + '</section>';
}
async function probe(token, label, content) {
  const bytes = Buffer.byteLength(content);
  try {
    const cover = await w.uploadCover(token, { buffer: fs.readFileSync('cover.png'), extension: 'png', mime: 'image/png' });
    const r = await w.addDraft(token, { article_type: 'news', title: '上限二分 ' + label, author: 'Y visual', digest: '二分定位。', content, thumb_media_id: cover.media_id, need_open_comment: 0, only_fans_can_comment: 0 });
    fs.appendFileSync('probe-ids.txt', r.media_id + '\n');
    console.log('  ' + label + ': ' + (bytes / 1024).toFixed(0) + ' KB → ✅ 接受');
    return true;
  } catch (e) {
    console.log('  ' + label + ': ' + (bytes / 1024).toFixed(0) + ' KB → ❌ 拒绝 errcode=' + (e.errcode || '?'));
    return false;
  }
}
(async () => {
  const token = await w.getAccessToken(cfg.appid, cfg.appsecret);
  let lo = 900 * 1024, hi = 1150 * 1024; // 已知 434KB 过、1240KB 拒；先测 1MB 附近
  if (!(await probe(token, Math.round(lo / 1024) + 'KB', buildBytes(lo)))) { console.log('900KB 就被拒，需下探'); return; }
  let hiRejected = !(await probe(token, Math.round(hi / 1024) + 'KB', buildBytes(hi)));
  if (!hiRejected) { console.log('1.15MB 仍通过，上限更高，探测 2MB：'); if (!(await probe(token, '2048KB', buildBytes(2 * 1024 * 1024)))) hiRejected = true, hi = 2 * 1024 * 1024; else { console.log('2MB 也通过——字节维度暂未到顶'); return; } }
  while (hi - lo > 32 * 1024) {
    const mid = Math.floor((lo + hi) / 2);
    const ok = await probe(token, Math.round(mid / 1024) + 'KB', buildBytes(mid));
    if (ok) lo = mid; else hi = mid;
  }
  console.log('==== 结论：字节上限位于 ' + (lo / 1024).toFixed(0) + ' KB ~ ' + (hi / 1024).toFixed(0) + ' KB 之间（即 ' + (lo / 1024 / 1024 * 1024).toFixed(0) + 'KB 附近 ≈ 1MB 假说验证）');
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });

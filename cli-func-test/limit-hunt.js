'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const w = require(path.join(os.homedir(), '.local/share/yituo-hub-gzh/cli/lib/wechat.js'));
const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/yituo-hub-gzh/config.json'), 'utf8'));

const zh = '服务端行为才是最终答案。';            // 12 chars = 36 bytes
const en = 'The server behavior is the final answer. '; // 41 chars = 41 bytes
function build(targetChars, charset, unit) {
  let body = '';
  let i = 0;
  while (body.length < targetChars) {
    i++;
    body += `<section style="padding:10px;background:#f7f5fb;margin-bottom:8px;"><p>第${i}段 ` + charset.repeat(unit).trim() + '</p></section>';
  }
  return `<section style="max-width:578px;">` + body + `</section>`;
}
async function probe(token, label, content) {
  try {
    const cover = await w.uploadCover(token, { buffer: fs.readFileSync('cover.png'), extension: 'png', mime: 'image/png' });
    const r = await w.addDraft(token, { article_type: 'news', title: '真实上限探测 ' + label, author: 'Y visual', digest: '上限探测。', content, thumb_media_id: cover.media_id, need_open_comment: 0, only_fans_can_comment: 0 });
    fs.appendFileSync('probe-ids.txt', r.media_id + '\n');
    console.log('  ✅ ' + label + ' → 接受，media_id=' + r.media_id.slice(0, 20) + '…');
    return true;
  } catch (e) {
    console.log('  ❌ ' + label + ' → 拒绝: ' + e.message + (e.errcode ? ' (errcode=' + e.errcode + ')' : ''));
    return false;
  }
}
(async () => {
  const token = await w.getAccessToken(cfg.appid, cfg.appsecret);
  // 阶梯：中文字符打 1MB bytes 假说，再到 3MB；ASCII 解耦字节数
  const ladder = [
    ['35万中文字符(≈1.05MB)', build(350000, zh, 1)],
    ['100万中文字符(≈3MB)', build(1000000, zh, 1)],
    ['100万ASCII字符(≈1MB,1M chars)', build(1000000, en, 1)],
  ];
  for (const [label, content] of ladder) {
    console.log(label + ' | 实际 ' + content.length + ' chars / ' + Math.round(Buffer.byteLength(content) / 1024) + ' KB');
    const ok = await probe(token, label, content);
    if (!ok) break;
  }
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });

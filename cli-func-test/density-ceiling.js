'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const w = require(path.join(os.homedir(), '.local/share/yituo-hub-gzh/cli/lib/wechat.js'));
const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/yituo-hub-gzh/config.json'), 'utf8'));
function build(n) {
  let body = '';
  for (let i = 1; i <= n; i++) {
    body += `<section style="display:flex;align-items:center;padding:4px 8px;">`
      + `<svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="4" fill="#4fd1c5"><animate attributeName="r" values="4;7;4" dur="1.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.2;1" dur="1.4s" repeatCount="indefinite"/></circle></svg>`
      + `<span style="margin-left:8px;font-size:12px;color:#aaa;">动效单元 ${String(i).padStart(4, '0')}</span></section>`;
  }
  return `<section style="max-width:578px;margin:0 auto;">` + body + `</section>`;
}
(async () => {
  const token = await w.getAccessToken(cfg.appid, cfg.appsecret);
  for (const n of [1650, 1700]) {
    const content = build(n);
    const bytes = Buffer.byteLength(content);
    try {
      const cover = await w.uploadCover(token, { buffer: fs.readFileSync('cover.png'), extension: 'png', mime: 'image/png' });
      const r = await w.addDraft(token, { article_type: 'news', title: '动效密度顶点 ' + n, author: 'Y visual', digest: '顶点探测。', content, thumb_media_id: cover.media_id, need_open_comment: 0, only_fans_can_comment: 0 });
      fs.appendFileSync('density-ids.txt', r.media_id + '\n');
      console.log(`✅ ${n} 单元: ${(bytes / 1024).toFixed(0)} KB → 接受`);
    } catch (e) {
      console.log(`❌ ${n} 单元: ${(bytes / 1024).toFixed(0)} KB → 拒绝: ${e.message} (errcode=${e.errcode || '?'})`);
    }
  }
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });

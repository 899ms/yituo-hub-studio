'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const w = require(path.join(os.homedir(), '.local/share/yituo-hub-gzh/cli/lib/wechat.js'));
const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/yituo-hub-gzh/config.json'), 'utf8'));
const count = (s, re) => (String(s).match(re) || []).length;

// 单个动效单元：呼吸圆点(2个animate) + 极短标签，尽量"少文字多动效"
function build(n) {
  let body = '';
  for (let i = 1; i <= n; i++) {
    const id = String(i).padStart(3, '0');
    body += `<section style="display:flex;align-items:center;padding:4px 8px;">`
      + `<svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="4" fill="#4fd1c5"><animate attributeName="r" values="4;7;4" dur="1.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.2;1" dur="1.4s" repeatCount="indefinite"/></circle></svg>`
      + `<span style="margin-left:8px;font-size:12px;color:#aaa;">动效单元 ${id}</span></section>`;
  }
  return `<section style="max-width:578px;margin:0 auto;">` + body + `</section>`;
}
async function push(token, n, digest) {
  const content = build(n);
  const bytes = Buffer.byteLength(content);
  const cover = await w.uploadCover(token, { buffer: fs.readFileSync('cover.png'), extension: 'png', mime: 'image/png' });
  const r = await w.addDraft(token, { article_type: 'news', title: '动效密度阶梯 ' + n + ' 单元', author: 'Y visual', digest, content, thumb_media_id: cover.media_id, need_open_comment: 0, only_fans_can_comment: 0 });
  const d = await w.getDraft(token, r.media_id);
  const stored = (d.news_item && d.news_item[0] && d.news_item[0].content) || '';
  fs.appendFileSync('density-ids.txt', r.media_id + '\n');
  return { bytes, stored, sentAnim: null, storedAnim: count(stored, /<animate/g), storedSvg: count(stored, /<svg/g), sentAnimN: n * 2 };
}
(async () => {
  const token = await w.getAccessToken(cfg.appid, cfg.appsecret);
  const ladder = [100, 300, 700, 1000, 1400, 1600];
  let lastOk = null;
  for (const n of ladder) {
    const content = build(n);
    const bytes = Buffer.byteLength(content);
    try {
      const res = await push(token, n, '动效密度阶梯测试。');
      console.log(`✅ ${n} 单元（动效=${n * 2}）: ${(bytes / 1024).toFixed(0)} KB → 存储 ${res.stored.length} chars, 存储动效=${res.storedAnim}/${n * 2} 完整=${res.storedAnim === n * 2}`);
      lastOk = { n, res };
    } catch (e) {
      console.log(`❌ ${n} 单元（动效=${n * 2}）: ${(bytes / 1024).toFixed(0)} KB → 拒绝: ${e.message} (errcode=${e.errcode || '?'})`);
      break;
    }
  }
  if (lastOk) console.log('== 阶梯终点：' + lastOk.n + ' 单元全部存活。');
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });

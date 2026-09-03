'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const w = require(path.join(os.homedir(), '.local/share/yituo-hub-gzh/cli/lib/wechat.js'));
const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/yituo-hub-gzh/config.json'), 'utf8'));
async function push(token, title, content) {
  const cover = await w.uploadCover(token, { buffer: fs.readFileSync('cover.png'), extension: 'png', mime: 'image/png' });
  const r = await w.addDraft(token, { article_type: 'news', title, author: 'Y visual', digest: '体积边界探测。', content, thumb_media_id: cover.media_id, need_open_comment: 0, only_fans_can_comment: 0 });
  const d = await w.getDraft(token, r.media_id);
  const stored = (d.news_item && d.news_item[0] && d.news_item[0].content) || '';
  fs.appendFileSync('size-test-media-ids.txt', r.media_id + '\n');
  console.log('[' + title + '] 提交 ' + content.length + ' → 存储 ' + stored.length + '（完整=' + (stored.length >= content.length - 50) + '）');
}
(async () => {
  const token = await w.getAccessToken(cfg.appid, cfg.appsecret);
  for (const target of [63000, 150000]) {
    let c = `<section style="max-width:578px;margin:0 auto;font-size:15px;line-height:1.8;">`;
    let i = 0;
    while (c.length < target) { i++; c += `<section style="padding:14px;background:#f7f5fb;border-radius:12px;margin-bottom:12px;"><p style="margin:0;font-weight:bold;">第 ${i} 节</p><p style="margin:0;color:#444;">边界测试。` + '服务端行为才是最终答案。'.repeat(20) + `</p></section>`; }
    c += `</section>`;
    try { await push(token, '体积边界探测 ' + Math.round(c.length / 1000) + 'K', c); }
    catch (e) { console.log('[' + target + 'K 级] ❌ 被拒: ' + e.message + (e.errcode ? ' errcode=' + e.errcode : '')); break; }
  }
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });

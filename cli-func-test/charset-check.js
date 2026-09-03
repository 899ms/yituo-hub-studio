'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const w = require(path.join(os.homedir(), '.local/share/yituo-hub-gzh/cli/lib/wechat.js'));
const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/yituo-hub-gzh/config.json'), 'utf8'));
(async () => {
  const token = await w.getAccessToken(cfg.appid, cfg.appsecret);
  const zh = '服务端行为才是最终答案。';
  const unit = '<section style="padding:10px;background:#f7f5fb;margin-bottom:8px;"><p>' + zh.repeat(60) + '</p></section>';
  const n = Math.ceil((600 * 1024) / Buffer.byteLength(unit));
  let c = '<section style="max-width:578px;">';
  for (let i = 0; i < n; i++) c += unit;
  c += '</section>';
  console.log('中文内容: ' + c.length + ' chars / ' + (Buffer.byteLength(c) / 1024).toFixed(0) + ' KB');
  try {
    const cover = await w.uploadCover(token, { buffer: fs.readFileSync('cover.png'), extension: 'png', mime: 'image/png' });
    const r = await w.addDraft(token, { article_type: 'news', title: '中文内容690KB验证', author: 'Y visual', digest: '字节数消歧。', content: c, thumb_media_id: cover.media_id, need_open_comment: 0, only_fans_can_comment: 0 });
    fs.appendFileSync('probe-ids.txt', r.media_id + '\n');
    console.log('✅ 接受 → 上限按【字节数】计，与字符集无关');
  } catch (e) { console.log('❌ 拒绝 errcode=' + e.errcode + ' → 上限与字符数相关'); }
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });

'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const w = require(path.join(os.homedir(), '.local/share/yituo-hub-gzh/cli/lib/wechat.js'));
const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/yituo-hub-gzh/config.json'), 'utf8'));

// 三个探针：① 静态SVG ② SMIL动效SVG ③ 纯文字对照
const content = `<section style="max-width:578px;margin:0 auto;font-size:15px;line-height:1.8;">
<section style="padding:20px;background:#f7f5fb;border-radius:12px;">
<p style="margin:0 0 12px;font-weight:bold;">① 静态 SVG（紫色圆角方块）：</p>
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="56" height="56" rx="12" fill="#7048e8"/></svg>
<p style="margin:20px 0 12px;font-weight:bold;">② SMIL 动效 SVG（呼吸圆点）：</p>
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="12" fill="#7048e8"><animate attributeName="r" values="12;24;12" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.2;1" dur="1.6s" repeatCount="indefinite"/></circle></svg>
<p style="margin:20px 0 12px;font-weight:bold;">③ 纯文字对照：</p>
<p style="margin:0;color:#444;">如果手机上能看到方块和呼吸圆点，说明极简 SVG 可以通过 API 存稿；如果只剩文字，说明微信清洗所有 SVG。</p>
</section>
</section>`;

const count = (s, re) => (String(s).match(re) || []).length;
(async () => {
  const token = await w.getAccessToken(cfg.appid, cfg.appsecret);
  console.log('token 获取: OK');
  const cover = await w.uploadCover(token, { buffer: fs.readFileSync('cover.png'), extension: 'png', mime: 'image/png' });
  console.log('封面上传: OK media_id=' + cover.media_id.slice(0, 20) + '…');

  const article = {
    article_type: 'news',
    title: 'SVG 存活能力对照实验',
    author: 'Y visual',
    digest: '极简静态SVG / SMIL动效SVG / 纯文字，三探针对照。',
    content,
    thumb_media_id: cover.media_id,
    need_open_comment: 0,
    only_fans_can_comment: 0
  };
  console.log('提交内容: svg=' + count(content, /<svg/g) + ' animate=' + count(content, /<animate/g) + ' chars=' + content.length);

  const r = await w.addDraft(token, article);
  console.log('草稿创建: OK media_id=' + r.media_id.slice(0, 20) + '…');

  const d = await w.getDraft(token, r.media_id);
  const stored = (d.news_item && d.news_item[0] && d.news_item[0].content) || '';
  fs.writeFileSync('svg-stored.html', stored);
  console.log('---- 存储结果对比 ----');
  console.log('提交: svg=' + count(content, /<svg/g) + ' animate=' + count(content, /<animate/g) + ' chars=' + content.length);
  console.log('存储: svg=' + count(stored, /<svg/g) + ' animate=' + count(stored, /<animate/g) + ' chars=' + stored.length);
  console.log(stored.includes('呼吸圆点') ? '文字内容存活: 是' : '文字内容存活: 未见');
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });

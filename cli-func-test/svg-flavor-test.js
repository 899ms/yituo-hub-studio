'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const w = require(path.join(os.homedir(), '.local/share/yituo-hub-gzh/cli/lib/wechat.js'));
const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/yituo-hub-gzh/config.json'), 'utf8'));
const probes = [
  ['A opacity动画(对照)', '<svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="12" fill="#7048e8"><animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite"/></circle></svg>'],
  ['B stroke-dashoffset线条动画', '<svg width="120" height="40" viewBox="0 0 120 40"><path d="M4 20 H116" stroke="#7048e8" stroke-width="3" fill="none" stroke-dasharray="116"><animate attributeName="stroke-dashoffset" from="0" to="-116" dur="3.8s" begin="0s" repeatCount="indefinite"/></path></svg>'],
  ['C animate带begin属性', '<svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="12" fill="#e8590c"><animate attributeName="r" values="12;20;12" dur="2s" begin="0s" repeatCount="indefinite"/></circle></svg>'],
  ['D animateTransform旋转', '<svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="14" fill="#2f9e44"><animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="3s" repeatCount="indefinite"/></circle></svg>'],
];
const content = `<section style="max-width:578px;margin:0 auto;font-size:15px;">` + probes.map(([l, s]) =>
  `<section style="padding:14px;background:#f7f5fb;border-radius:12px;margin-bottom:12px;"><p style="margin:0 0 8px;font-weight:bold;">【${l}】</p>${s}</section>`).join('') + `</section>`;
const count = (s, re) => (String(s).match(re) || []).length;
(async () => {
  const token = await w.getAccessToken(cfg.appid, cfg.appsecret);
  const cover = await w.uploadCover(token, { buffer: fs.readFileSync('cover.png'), extension: 'png', mime: 'image/png' });
  const r = await w.addDraft(token, { article_type: 'news', title: '动效类型存活对照', author: 'Y visual', digest: 'opacity/dashoffset/begin/transform 四对照。', content, thumb_media_id: cover.media_id, need_open_comment: 0, only_fans_can_comment: 0 });
  const d = await w.getDraft(token, r.media_id);
  const stored = (d.news_item && d.news_item[0] && d.news_item[0].content) || '';
  const idx = probes.map(([l]) => stored.indexOf('【' + l + '】'));
  probes.forEach(([l], i) => {
    const seg = stored.slice(idx[i], i + 1 < probes.length ? idx[i + 1] : stored.length);
    console.log(l + ' → svg=' + count(seg, /<svg/g) + ' animate=' + count(seg, /<animate/g));
  });
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });

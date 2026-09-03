'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const w = require(path.join(os.homedir(), '.local/share/yituo-hub-gzh/cli/lib/wechat.js'));
const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/yituo-hub-gzh/config.json'), 'utf8'));

const anim = '<animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite"/>';
const probes = [
  ['A 有xmlns+动效', '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="12" fill="#7048e8">' + anim + '</circle></svg>'],
  ['B 无xmlns+动效', '<svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="12" fill="#e8590c">' + anim + '</circle></svg>'],
  ['C 无xmlns无data+动效(同B)', '<svg width="64" height="64" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="12" fill="#2f9e44">' + anim + '</rect></svg>'],
];
const content = `<section style="max-width:578px;margin:0 auto;font-size:15px;">` + probes.map(([l, s]) =>
  `<section style="padding:14px;background:#f7f5fb;border-radius:12px;margin-bottom:12px;"><p style="margin:0 0 8px;font-weight:bold;">【${l}】</p>${s}</section>`).join('') + `</section>`;
const count = (s, re) => (String(s).match(re) || []).length;
(async () => {
  const token = await w.getAccessToken(cfg.appid, cfg.appsecret);
  const cover = await w.uploadCover(token, { buffer: fs.readFileSync('cover.png'), extension: 'png', mime: 'image/png' });
  const r = await w.addDraft(token, { article_type: 'news', title: 'xmlns 对动效存活的影响', author: 'Y visual', digest: 'A/B/C 对照。', content, thumb_media_id: cover.media_id, need_open_comment: 0, only_fans_can_comment: 0 });
  const d = await w.getDraft(token, r.media_id);
  const stored = (d.news_item && d.news_item[0] && d.news_item[0].content) || '';
  console.log('提交: svg=' + count(content, /<svg/g) + ' animate=' + count(content, /<animate/g) + ' xmlns=' + count(content, /xmlns/g));
  console.log('存储: svg=' + count(stored, /<svg/g) + ' animate=' + count(stored, /<animate/g) + ' xmlns=' + count(stored, /xmlns/g));
  const idx = probes.map(([l]) => stored.indexOf('【' + l + '】'));
  probes.forEach(([l], i) => {
    const seg = stored.slice(idx[i], i + 1 < probes.length ? idx[i + 1] : stored.length);
    console.log(l + ' → svg=' + count(seg, /<svg/g) + ' animate=' + count(seg, /<animate/g));
  });
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });

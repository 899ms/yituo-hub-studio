'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const w = require(path.join(os.homedir(), '.local/share/yituo-hub-gzh/cli/lib/wechat.js'));
const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/yituo-hub-gzh/config.json'), 'utf8'));

const h = fs.readFileSync('local-l6.html', 'utf8');
const svgs = h.match(/<svg[\s\S]*?<\/svg>/g);
const raw = svgs[0]; // violet-studio 完整标题装饰 SVG
console.log('取样SVG长度:', raw.length, '含animate*:', (raw.match(/<animate/g)||[]).length, '含data-*:', (raw.match(/data-/g)||[]).length);

const noData   = raw.replace(/\sdata-[a-zA-Z-]+="[^"]*"/g, '');
const noAnim   = raw.replace(/<animate[a-zA-Z]*[\s\S]*?<\/animate[a-zA-Z]*>/g, '').replace(/<animate[^>]*\/>/g, '');
const noBoth   = noData.replace(/<animate[a-zA-Z]*[\s\S]*?<\/animate[a-zA-Z]*>/g, '').replace(/<animate[^>]*\/>/g, '');

const probes = [
  ['P1 对照-极简静态', '<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="56" height="56" rx="12" fill="#7048e8"/></svg>'],
  ['P2 主题SVG原样', raw],
  ['P3 去data属性', noData],
  ['P4 去动效标记', noAnim],
  ['P5 去data+去动效', noBoth],
  ['P6 极简animateTransform', '<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="14" fill="#7048e8"><animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="3s" repeatCount="indefinite"/></circle></svg>'],
  ['P7 百分比宽+role', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" role="img" aria-label="test" style="display:block;width:100%;height:auto;"><circle cx="32" cy="32" r="20" fill="#7048e8"/></svg>'],
];

let n = 0;
const content = `<section style="max-width:578px;margin:0 auto;font-size:15px;line-height:1.8;">` +
  probes.map(([label, svg]) => {
    n++;
    return `<section style="padding:16px;background:#f7f5fb;border-radius:12px;margin-bottom:14px;"><p style="margin:0 0 10px;font-weight:bold;">【${label}】svg长度=${svg.length}</p>${svg}<p style="margin:10px 0 0;color:#888;">↑ 以上若有图形说明本探针存活</p></section>`;
  }).join('') + `</section>`;

const count = (s, re) => (String(s).match(re) || []).length;
(async () => {
  const token = await w.getAccessToken(cfg.appid, cfg.appsecret);
  const cover = await w.uploadCover(token, { buffer: fs.readFileSync('cover.png'), extension: 'png', mime: 'image/png' });
  const r = await w.addDraft(token, {
    article_type: 'news',
    title: 'SVG 黑名单定位实验（7探针）',
    author: 'Y visual',
    digest: '定位微信 API 清洗 SVG 的触发条件。',
    content,
    thumb_media_id: cover.media_id,
    need_open_comment: 0, only_fans_can_comment: 0
  });
  console.log('草稿创建: OK');
  const d = await w.getDraft(token, r.media_id);
  const stored = (d.news_item && d.news_item[0] && d.news_item[0].content) || '';
  fs.writeFileSync('bisect-stored.html', stored);
  console.log('提交总计: svg=' + count(content, /<svg/g) + ' animate*=' + count(content, /<animate/g) + ' chars=' + content.length);
  console.log('存储总计: svg=' + count(stored, /<svg/g) + ' animate*=' + count(stored, /<animate/g) + ' chars=' + stored.length);
  console.log('---- 各探针存活情况 ----');
  const idx = probes.map(([label]) => stored.indexOf('【' + label + '】'));
  probes.forEach(([label], i) => {
    const start = idx[i], end = i + 1 < probes.length ? idx[i + 1] : stored.length;
    if (start < 0) { console.log(label + ': 标记未找到'); return; }
    const seg = stored.slice(start, end);
    console.log(label + ': svg=' + count(seg, /<svg/g) + ' animate*=' + count(seg, /<animate/g) + (seg.includes('若有图形说明') ? '' : ' (尾部文字也消失→整段被清)'));
  });
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });

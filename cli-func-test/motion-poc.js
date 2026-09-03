'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const BIN = path.join(os.homedir(), '.local/share/yituo-hub-gzh/cli/');
const renderer = require(BIN + 'lib/renderer.js');
const images = require(BIN + 'lib/images.js');
const html = require(BIN + 'lib/html.js');
const w = require(BIN + 'lib/wechat.js');
const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/yituo-hub-gzh/config.json'), 'utf8'));
const count = (s, re) => (String(s).match(re) || []).length;
(async () => {
  const token = await w.getAccessToken(cfg.appid, cfg.appsecret);
  // 1. 真·动效渲染
  const rendered = renderer.renderMarkdown(fs.readFileSync('mini.md', 'utf8'),
    { style: 'night-editorial', level: 'L6', author: 'Y visual', static: false, motion: true });
  console.log('① 动效渲染: animate*=' + count(rendered.html, /<animate/g) + ' svg=' + count(rendered.html, /<svg/g));

  // 2. 正文图上传 + 替换（同正式管线）
  const sources = images.extractImageSources(rendered.html);
  const replacements = [];
  for (const src of sources) {
    const item = await images.prepareInline(await images.readImage(src, process.cwd()));
    const up = await w.uploadInlineImage(token, item);
    replacements.push(up.url);
  }
  let content = images.replaceImageSources(rendered.html, replacements);

  // 3. 压缩（保留视觉）
  content = html.compactForWechat(content, { preserveVisuals: true });
  html.validateArticleShell(content);
  const size = html.assertWechatLimits(content);
  console.log('② 压缩后: chars=' + size.chars + ' animate*=' + count(content, /<animate/g) + ' svg=' + count(content, /<svg/g));

  // 4. 封面 + 存稿
  const coverImg = await images.prepareCover(await images.readImage('cover.png', process.cwd()));
  const cover = await w.uploadCover(token, coverImg);
  const r = await w.addDraft(token, {
    article_type: 'news', title: 'L6 动效 API 直推验证', author: 'Y visual',
    digest: '放开 static 强制后，SVG 动效经 API 完整进入草稿箱。',
    content, thumb_media_id: cover.media_id, need_open_comment: 0, only_fans_can_comment: 0
  });
  console.log('③ 草稿创建: OK');

  // 5. 回读验证
  const d = await w.getDraft(token, r.media_id);
  const stored = (d.news_item && d.news_item[0] && d.news_item[0].content) || '';
  console.log('④ 微信存储: chars=' + stored.length + ' svg=' + count(stored, /<svg/g) + ' animate*=' + count(stored, /<animate/g));
  console.log(count(stored, /<animate/g) > 0 ? '✅✅ 结论：L6 动效可以经 API 完整进入草稿箱，CLI 两行强制是唯一障碍' : '❌ 动效仍未存活');
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });

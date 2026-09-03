'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const BIN = path.join(os.homedir(), '.local/share/yituo-hub-gzh/cli/');
const renderer = require(BIN + 'lib/renderer.js');
const images = require(BIN + 'lib/images.js');
const html = require(BIN + 'lib/html.js');
const w = require(BIN + 'lib/wechat.js');
const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/yituo-hub-gzh/config.json'), 'utf8'));
const count = (s, re) => (String(s).match(re) || []).length;

async function push(token, title, content, digest) {
  const cover = await w.uploadCover(token, { buffer: fs.readFileSync('cover.png'), extension: 'png', mime: 'image/png' });
  const r = await w.addDraft(token, { article_type: 'news', title, author: 'Y visual', digest, content, thumb_media_id: cover.media_id, need_open_comment: 0, only_fans_can_comment: 0 });
  const d = await w.getDraft(token, r.media_id);
  const stored = (d.news_item && d.news_item[0] && d.news_item[0].content) || '';
  fs.appendFileSync('size-test-media-ids.txt', r.media_id + '\n');
  console.log('  [' + title + '] 提交 ' + content.length + ' chars → 存储 ' + stored.length + ' chars（完整=' + (stored.length >= content.length - 50) + '）svg=' + count(stored, /<svg/g) + ' 动效=' + count(stored, /<animate/g));
}

(async () => {
  const token = await w.getAccessToken(cfg.appid, cfg.appsecret);

  // 探针：36K 纯文本压力
  let big = `<section style="max-width:578px;margin:0 auto;font-size:15px;line-height:1.8;">`;
  for (let i = 1; i <= 40; i++) big += `<section style="padding:14px;background:#f7f5fb;border-radius:12px;margin-bottom:12px;"><p style="margin:0 0 8px;font-weight:bold;">第 ${i} 节</p><p style="margin:0;color:#444;">边界测试。` + '服务端行为才是最终答案。'.repeat(22) + `</p></section>`;
  big += `</section>`;
  console.log('探针A 体积: ' + big.length);
  await push(token, '体积边界探测A（36K）', big, '36K 探针。');

  // 真实目标：violet-studio L6 完整文章（全 SVG + 动效）
  const rendered = renderer.renderMarkdown(fs.readFileSync('release.md', 'utf8'),
    { style: 'violet-studio', level: 'L6', author: 'Y visual', static: false, motion: true });
  const sources = images.extractImageSources(rendered.html);
  const replacements = [];
  for (const src of sources) {
    const item = await images.prepareInline(await images.readImage(src, process.cwd()));
    const up = await w.uploadInlineImage(token, item);
    replacements.push(up.url);
  }
  let content = images.replaceImageSources(rendered.html, replacements);
  content = html.compactForWechat(content, { preserveVisuals: true });
  console.log('探针B 体积(violet L6 全文全动效): ' + content.length + ' chars, svg=' + count(content, /<svg/g) + ', 动效=' + count(content, /<animate/g));
  await push(token, '一行命令，把 Markdown 排成公众号高级排版，直接进草稿箱', content, '排版 40 分钟的时代结束了：33 套主题，一条命令，直接进草稿箱。');
})().catch(e => { console.error('ERR:', e.message, e.errcode ? 'errcode=' + e.errcode : ''); process.exit(1); });

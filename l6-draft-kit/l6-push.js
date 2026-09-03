#!/usr/bin/env node
'use strict';
/**
 * l6-push.js —— L6 级 SVG 动效文章 API 直推草稿箱工具
 *
 * 背景：官方 CLI 的 draft 命令在渲染阶段无条件强制 static=true/motion=false，
 * 并默认删除全部 <svg>，导致高级主题的动效永远进不了草稿箱。
 * 本工具复用 CLI 安装目录里的渲染管线，只放开"动效渲染"这一层，
 * 微信 API 实测完整保留 SVG + SMIL 动画（见 TEST-REPORT-2026-09-02.md）。
 *
 * 用法：
 *   node l6-push.js <article.md> [--style night-editorial] [--level L6]
 *                   [--cover cover.png] [--author "名字"] [--digest "摘要"]
 *                   [--audit]     体积审计：本文在各高级主题/等级下能否塞进 2 万字符
 *                   [--json]      输出机器可读 JSON
 *
 * 凭证：环境变量 WECHAT_APPID / WECHAT_APPSECRET 优先，否则读
 *       ~/.config/yituo-hub-gzh/config.json（与官方 CLI 相同）。
 * 前提：本机出口 IP 已加入公众号 IP 白名单；Node.js 20+；已安装官方 CLI。
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const CLI_HOME = process.env.YITUO_HUB_GZH_HOME
  || path.join(os.homedir(), '.local/share/yituo-hub-gzh');
const LIB = path.join(CLI_HOME, 'cli', 'lib');
let renderer, images, html, wechat;
try {
  renderer = require(path.join(LIB, 'renderer.js'));
  images = require(path.join(LIB, 'images.js'));
  html = require(path.join(LIB, 'html.js'));
  wechat = require(path.join(LIB, 'wechat.js'));
} catch (e) {
  console.error('找不到官方 CLI 的 lib（默认查找 ' + LIB + '）。请先安装官方 CLI，或设置 YITUO_HUB_GZH_HOME。');
  process.exit(1);
}

const MAX_CHARS = 20000;
const argv = process.argv.slice(2);
const flagNames = ['audit', 'json', 'help'];
const valueFlags = ['style', 'level', 'cover', 'author', 'digest'];
const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const name = a.slice(2);
    if (flagNames.includes(name)) flags[name] = true;
    else if (valueFlags.includes(name)) flags[name] = argv[++i];
  } else positional.push(a);
}
if (flags.help || positional.length === 0) {
  console.log(fs.readFileSync(__filename, 'utf8').split('/**')[1].split('*/')[0]);
  process.exit(0);
}

function loadConfig() {
  const file = path.join(os.homedir(), '.config/yituo-hub-gzh/config.json');
  let fileCfg = {};
  try { fileCfg = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_e) {}
  return {
    appid: process.env.WECHAT_APPID || fileCfg.appid || '',
    appsecret: process.env.WECHAT_APPSECRET || fileCfg.appsecret || '',
    style: fileCfg.style || 'violet-studio',
    level: fileCfg.level || 'L4',
    author: fileCfg.author || ''
  };
}

/** 渲染（不压缩），返回渲染产物与图片源 */
function render(markdownFile, style, level, author) {
  return renderer.renderMarkdown(
    fs.readFileSync(markdownFile, 'utf8'),
    { style, level, author, static: false, motion: true }   // 关键：不学 draftCommand 强制静态
  );
}

/** 替换图片为微信 URL 后压缩（保留 SVG）——与官方管线同序 */
function finishContent(renderedHtml, urls) {
  let content = images.replaceImageSources(renderedHtml, urls);
  content = html.compactForWechat(content, { preserveVisuals: true }); // 关键：保留 SVG
  html.validateArticleShell(content);
  return content;
}

/** 审计用：以等长占位 URL 代替微信素材 URL，测量精确体积 */
function buildAudited(markdownFile, style, level, author) {
  const rendered = render(markdownFile, style, level, author);
  const sources = images.extractImageSources(rendered.html);
  const dummy = sources.map(() => 'https://mmbiz.qpic.cn/abcdefghijklmnopqrst');
  const content = finishContent(rendered.html, dummy);
  return {
    chars: content.length,
    svg: (content.match(/<svg/g) || []).length,
    anim: (content.match(/<animate/g) || []).length,
    title: rendered.title
  };
}

function info(obj) { flags.json ? console.log(JSON.stringify(obj)) : console.log(obj); }

(async () => {
  const cfg = loadConfig();
  if (!cfg.appid || !cfg.appsecret) {
    console.error('缺少凭证：请设置 WECHAT_APPID/WECHAT_APPSECRET 或运行官方 CLI 的 setup。');
    process.exit(1);
  }
  const markdownFile = path.resolve(positional[0]);
  const baseDir = path.dirname(markdownFile);

  /* ---------- 审计模式 ---------- */
  if (flags.audit) {
    const styles = renderer.styleList().filter(s => s.library === 'advanced');
    const levels = ['L4', 'L5', 'L6'];
    const rows = [];
    for (const s of styles) for (const lv of levels) {
      try {
        const built = buildAudited(markdownFile, s.id, lv, flags.author !== undefined ? flags.author : cfg.author);
        rows.push({ style: s.id, level: lv, chars: built.chars, svg: built.svg, anim: built.anim, fit: built.chars < MAX_CHARS });
      } catch (_e) { /* 该主题不支持此文章结构时跳过 */ }
    }
    rows.sort((a, b) => a.chars - b.chars);
    if (flags.json) return info(rows);
    console.log('文章在各高级主题下的正文体积（上限 ' + MAX_CHARS + '）：');
    for (const r of rows) {
      console.log((r.fit ? '  ✅ ' : '  ❌ ') + r.style.padEnd(22) + r.level + '  ' + r.chars + ' 字符  svg=' + r.svg + ' 动效=' + r.anim);
    }
    const fits = rows.filter(r => r.fit && r.level === 'L6');
    if (fits.length) console.log('可 L6 直推的主题：' + fits.map(f => f.style).join(', '));
    else console.log('没有主题能以 L6 塞下本文，请缩短文章。');
    return;
  }

  /* ---------- 推稿模式 ---------- */
  const style = flags.style || cfg.style;
  const level = flags.level || cfg.level;
  const author = flags.author !== undefined ? flags.author : cfg.author;

  const rendered = render(markdownFile, style, level, author);
  const sources = images.extractImageSources(rendered.html);
  const token = await wechat.getAccessToken(cfg.appid, cfg.appsecret);
  const replacements = [];
  for (const src of sources) {
    const item = await images.prepareInline(await images.readImage(src, baseDir));
    const up = await wechat.uploadInlineImage(token, item);
    replacements.push(up.url);
  }
  let built;
  try {
    built = { content: finishContent(rendered.html, replacements), title: rendered.title };
  } catch (e) {
    if (e.code === 'CONTENT_TOO_LARGE') {
      console.error(e.message);
      console.error('提示：运行 node l6-push.js ' + positional[0] + ' --audit 查看哪些主题塞得下。');
    } else console.error(e.message);
    process.exit(1);
  }
  if (built.content.length >= MAX_CHARS) {
    console.error('（提示）正文 ' + built.content.length + ' 字符超出微信文档建议的 ' + MAX_CHARS + ' 上限。实测服务端 150K 字符仍照常接收，属未文档化行为，继续推送……');
  }
  const content = built.content;
  const contentBytes = Buffer.byteLength(content);
  if (contentBytes >= 600 * 1024) {
    console.error('（警告）正文 ' + (contentBytes / 1024).toFixed(0) + ' KB bytes 已接近实测服务端上限（约 690KB bytes，errcode 45002），建议精简。');
  }

  // 封面：--cover 优先，否则正文第一张图
  const coverFile = flags.cover || sources[0];
  if (!coverFile) { console.error('文章没有图片且未指定 --cover，微信必须有封面。'); process.exit(1); }
  const coverImg = await images.prepareCover(await images.readImage(path.resolve(baseDir, coverFile), baseDir));
  const cover = await wechat.uploadCover(token, coverImg);

  const digest = flags.digest || '由 l6-push 工具推送的 L6 动效文章。';
  const r = await wechat.addDraft(token, {
    article_type: 'news',
    title: built.title,
    author,
    digest,
    content,
    thumb_media_id: cover.media_id,
    need_open_comment: 0,
    only_fans_can_comment: 0
  });

  // 回读核对：标题、封面、以及「动效是否真的活着」
  const detail = await wechat.getDraft(token, r.media_id);
  const item = (detail.news_item && detail.news_item[0]) || {};
  const storedAnim = (item.content.match(/<animate/g) || []).length;
  const verified = item.title === built.title && item.thumb_media_id === cover.media_id;

  info({
    ok: true, tool: 'l6-push', style, level,
    title: built.title,
    draftMediaId: r.media_id,
    thumbMediaId: cover.media_id,
    contentChars: content.length, svg: (content.match(/<svg/g) || []).length, anim: (content.match(/<animate/g) || []).length,
    storedAnim: storedAnim,
    motionSurvived: storedAnim > 0,
    verified, published: false
  });
  if (!verified) { console.error('（警告）回读标题或封面与提交不一致。'); process.exitCode = 1; }
  if (built.anim > 0 && storedAnim === 0) {
    console.error('（警告）提交时含动效但存储后动效消失，请检查文章内容。');
    process.exitCode = 1;
  }
})().catch(e => {
  console.error('ERR: ' + e.message);
  if (e.errcode) console.error('errcode=' + e.errcode);
  if (String(e.message).includes('40164')) console.error('提示：把微信报错里的 IP 加入公众号 IP 白名单后重试。');
  process.exit(1);
});

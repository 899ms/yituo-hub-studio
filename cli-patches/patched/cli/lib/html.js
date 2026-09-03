'use strict';

// WeChat documents advise < 20000 chars, but the server enforces a byte
// limit instead (measured 2026-09: accepts >= 600KB bytes, rejects around
// 690KB bytes with errcode 45002). Keep the documented number only as a
// soft-warning threshold and enforce the measured byte budget.
const MAX_CONTENT_CHARS = 220000;
const MAX_CONTENT_BYTES = 600 * 1024;
const DOCS_MAX_CONTENT_CHARS = 20000;

function compactForWechat(source, options) {
  const opts = options || {};
  let html = String(source || '');

  // Motion assets are useful in the local preview but are decorative in a
  // WeChat draft. Removing them keeps the API payload small and leaves the
  // editable text, theme colors, spacing, and article images intact.
  if (!opts.preserveVisuals) html = html.replace(/<svg\b[\s\S]*?<\/svg>/gi, '');

  html = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+(?:data|aria)-[\w:-]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/\s+(?:role|focusable|xmlns)\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/<\/?(?:figure|figcaption)\b/gi, function (tag) {
      return tag.toLowerCase().replace('figure', tag.indexOf('/') === 1 ? 'section' : 'section').replace('figcaption', tag.indexOf('/') === 1 ? 'p' : 'p');
    })
    .replace(/>\s+</g, '><')
    .trim();

  return html;
}

function assertWechatLimits(html) {
  const chars = String(html || '').length;
  const bytes = Buffer.byteLength(String(html || ''), 'utf8');
  if (chars >= MAX_CONTENT_CHARS || bytes >= MAX_CONTENT_BYTES) {
    const error = new Error('微信草稿正文超过限制：' + chars + ' 字符，' + bytes + ' 字节。可改用 L2/L3、缩短文章或减少图片说明。');
    error.code = 'CONTENT_TOO_LARGE';
    error.chars = chars;
    error.bytes = bytes;
    throw error;
  }
  return { chars, bytes };
}

function validateArticleShell(html) {
  const value = String(html || '').trim();
  if (!/^<section\b/i.test(value)) {
    const error = new Error('排版结果不是公众号正文片段，缺少 section 根节点。');
    error.code = 'HTML_INVALID';
    throw error;
  }
  if (/<(?:script|style)\b/i.test(value)) {
    const error = new Error('排版结果包含公众号正文不应携带的脚本或样式标签。');
    error.code = 'HTML_UNSAFE';
    throw error;
  }
}

module.exports = {
  DOCS_MAX_CONTENT_CHARS,
  MAX_CONTENT_CHARS,
  MAX_CONTENT_BYTES,
  compactForWechat,
  assertWechatLimits,
  validateArticleShell
};

#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const readline = require('node:readline');

const renderer = require('../lib/renderer.js');
const images = require('../lib/images.js');
const html = require('../lib/html.js');
const configStore = require('../lib/config.js');
const wechat = require('../lib/wechat.js');

const CONSOLE_ROOT = 'https://developers.weixin.qq.com/console/product/mp/';
const VERSION = '0.1.0';

function consoleUrl(appid) {
  return appid
    ? CONSOLE_ROOT + encodeURIComponent(String(appid)) + '?tab1=basicInfo&tab2=dev'
    : CONSOLE_ROOT;
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      positional.push(item);
      continue;
    }
    const equal = item.indexOf('=');
    if (equal !== -1) {
      flags[item.slice(2, equal)] = item.slice(equal + 1);
      continue;
    }
    const name = item.slice(2);
    const booleanFlags = new Set(['json', 'static', 'preserve-visuals', 'comments', 'dry-run', 'save-secret', 'no-save-secret', 'help', 'version']);
    if (booleanFlags.has(name)) {
      flags[name] = true;
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      flags[name] = next;
      index += 1;
    } else {
      flags[name] = true;
    }
  }
  return { positional, flags };
}

function jsonMode(flags) {
  return flags.json === true || flags.json === 'true';
}

function writeResult(value, flags) {
  if (jsonMode(flags)) {
    process.stdout.write(JSON.stringify(value) + '\n');
    return;
  }
  if (typeof value === 'string') {
    process.stdout.write(value + '\n');
    return;
  }
  if (value.ok === false) {
    process.stdout.write('✗ ' + (value.error || value.wechat || '操作未成功') + '\n');
    if (value.hint) process.stdout.write('  提示：' + value.hint + '\n');
    return;
  }
  const lines = [];
  if (value.title) lines.push('✓ ' + value.title);
  if (value.style) lines.push('  风格：' + value.style.name + (value.level ? ' · ' + value.level.label : ''));
  if (value.output) lines.push('  输出：' + value.output);
  if (value.draftMediaId) lines.push('  草稿已保存：' + value.draftMediaId);
  if (value.inlineImages !== undefined) lines.push('  图片：' + value.inlineImages + ' 张');
  if (value.published === false) lines.push('  状态：仅保存草稿，未发布');
  if (value.contentChars) lines.push('  正文：' + value.contentChars + ' 字符');
  if (lines.length) {
    process.stdout.write(lines.join('\n') + '\n');
    return;
  }
  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
}

function fail(error, flags) {
  const item = {
    ok: false,
    code: error.code || 'ERROR',
    error: error.message || String(error)
  };
  if (error.errcode) item.errcode = error.errcode;
  const whitelistIp = wechat.whitelistIpFromError(error);
  if (whitelistIp) {
    item.whitelistIp = whitelistIp;
    item.hint = '请把 ' + whitelistIp + ' 加入当前公众号的 IP 白名单。';
  }
  if (error.code === 'CONFIG_REQUIRED') {
    item.hint = '请先在 Agent 环境设置 WECHAT_APPID 和 WECHAT_APPSECRET，或运行 yituo-hub-gzh setup。';
    item.consoleUrl = consoleUrl();
  }
  if (jsonMode(flags)) {
    process.stdout.write(JSON.stringify(item) + '\n');
  } else {
    process.stderr.write('✗ ' + item.error + '\n');
    if (item.hint) process.stderr.write('  ' + item.hint + '\n');
    if (item.consoleUrl) process.stderr.write('  微信开发者后台：' + item.consoleUrl + '\n');
  }
  process.exitCode = 1;
}

function log(message, flags) {
  if (!jsonMode(flags)) process.stderr.write(message + '\n');
}

function help() {
  return [
    'YI TUO HUB GZH CLI ' + VERSION,
    '',
    '把 Agent 已经写好的 Markdown 排成公众号正文，或保存到微信公众号草稿箱。',
    '',
    '命令：',
    '  setup                         交互式配置 AppID、AppSecret 和默认风格',
    '  config show                   查看本机配置（密钥会隐藏）',
    '  styles                        列出可用排版风格和高级等级',
    '  doctor                        检查配置、出口 IP 和微信接口权限',
    '  layout <article.md>           生成带图片内嵌的公众号 HTML',
    '  draft <article.md>            上传图片并创建、核对公众号草稿',
    '',
    '常用参数：',
    '  --style violet-studio        风格 ID 或中文名，默认紫灰工作室',
    '  --level L4                   高级排版等级，默认 L4',
    '  --static                     使用静态视觉，不启用动效',
    '  --author "老颜同学"           覆盖作者署名',
    '  --digest "摘要"              覆盖草稿摘要',
    '  --cover path/to/cover.jpg    指定封面；不填时使用正文第一张图',
    '  --out output.html            layout 输出路径',
    '  --dry-run                    只渲染和检查，不请求微信接口',
    '  --json                       输出机器可读 JSON，方便 Agent 继续判断',
    '',
    '安全约定：',
    '  AppSecret 不接受命令行参数，不上传到 YI TUO 服务器；可用环境变量或本机配置文件。',
    '  draft 只调用草稿接口，不调用发布接口。',
    '',
    '示例：',
    '  yituo-hub-gzh styles',
    '  yituo-hub-gzh layout article.md --style violet-studio --level L4 --out article.html',
    '  yituo-hub-gzh draft article.md --style violet-studio --level L4 --json'
  ].join('\n');
}

function promptText(question, defaultValue) {
  const suffix = defaultValue ? '（默认：' + defaultValue + '）' : '';
  const input = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(function (resolve) {
    input.question(question + suffix + '：', function (answer) {
      input.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

function promptSecret(question) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    return promptText(question);
  }
  return new Promise(function (resolve) {
    const stdin = process.stdin;
    const stdout = process.stdout;
    let value = '';
    stdout.write(question + '：');
    stdin.setRawMode(true);
    stdin.resume();
    function cleanup(result) {
      stdin.setRawMode(false);
      stdin.removeListener('data', onData);
      stdout.write('\n');
      resolve(result);
    }
    function onData(chunk) {
      const text = String(chunk);
      for (const char of text) {
        if (char === '\u0003') {
          cleanup('');
          return;
        }
        if (char === '\r' || char === '\n') {
          cleanup(value);
          return;
        }
        if (char === '\u007f' || char === '\b') {
          value = value.slice(0, -1);
        } else {
          value += char;
        }
      }
    }
    stdin.on('data', onData);
  });
}

function requireInteractive() {
  if (process.stdin.isTTY && process.stdout.isTTY) return;
  const error = new Error('当前命令需要交互式终端；请改用环境变量传入配置。');
  error.code = 'INTERACTIVE_REQUIRED';
  throw error;
}

async function setup(flags) {
  requireInteractive();
  process.stderr.write('微信开发者后台：' + consoleUrl() + '\n');
  process.stderr.write('请先确认 AppSecret 已开启，并准备把本机出口 IP 加入公众号白名单。\n\n');
  const old = configStore.mergedConfig(flags.config);
  const appid = await promptText('AppID', old.appid || '');
  const appsecret = await promptSecret('AppSecret（输入时不显示）');
  if (!appid || !appsecret) {
    const error = new Error('AppID 和 AppSecret 不能为空。');
    error.code = 'CONFIG_REQUIRED';
    throw error;
  }
  const style = await promptText('默认排版风格', old.style || 'violet-studio');
  const level = await promptText('默认高级等级', old.level || 'L4');
  const author = await promptText('默认作者（可空）', old.author || '');
  const file = configStore.saveConfig({ appid, appsecret, style, level, author }, flags.config);
  writeResult({ ok: true, config: file, style, level }, flags);
}

function configShow(flags) {
  const value = configStore.mergedConfig(flags.config);
  writeResult({ ok: true, configPath: value._path, config: configStore.redact(value) }, flags);
}

function styles(flags) {
  writeResult({ ok: true, styles: renderer.styleList() }, flags);
}

function configError() {
  const error = new Error('缺少微信公众号 AppID 或 AppSecret。');
  error.code = 'CONFIG_REQUIRED';
  throw error;
}

async function resolveWechatConfig(flags, allowPrompt) {
  const value = configStore.mergedConfig(flags.config);
  if (value.appid && value.appsecret) return value;
  if (!allowPrompt) configError();
  if (!process.stdin.isTTY || !process.stdout.isTTY) configError();
  requireInteractive();
  process.stderr.write('需要微信公众号配置。请打开：' + consoleUrl(value.appid) + '\n');
  process.stderr.write('AppSecret 不会显示在屏幕上。\n');
  value.appid = value.appid || await promptText('AppID');
  value.appsecret = value.appsecret || await promptSecret('AppSecret（输入时不显示）');
  if (!value.appid || !value.appsecret) configError();
  return value;
}

async function readMarkdown(input) {
  if (!input || input === '-') {
    if (process.stdin.isTTY) {
      const error = new Error('请提供 Markdown 文件路径，或通过管道传入内容。');
      error.code = 'INPUT_REQUIRED';
      throw error;
    }
    return new Promise(function (resolve, reject) {
      let value = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', function (chunk) { value += chunk; });
      process.stdin.on('end', function () { resolve({ markdown: value, baseDir: process.cwd(), source: '-' }); });
      process.stdin.on('error', reject);
    });
  }
  const file = path.resolve(input);
  let markdown;
  try {
    markdown = await fsp.readFile(file, 'utf8');
  } catch (error) {
    const wrapped = new Error('找不到 Markdown 文件：' + file);
    wrapped.code = 'INPUT_NOT_FOUND';
    wrapped.cause = error;
    throw wrapped;
  }
  return { markdown, baseDir: path.dirname(file), source: file };
}

function renderOptions(flags, config) {
  return {
    style: flags.style || config.style || 'violet-studio',
    level: flags.level || config.level || 'L4',
    author: flags.author !== undefined ? flags.author : (config.author || ''),
    static: flags.static === true,
    motion: flags.static ? false : undefined
  };
}

async function prepareLayoutHtml(rendered, baseDir) {
  const sources = images.extractImageSources(rendered.html);
  const cache = new Map();
  const replacements = [];
  for (const source of sources) {
    let prepared = cache.get(source);
    if (!prepared) {
      const input = await images.readImage(source, baseDir);
      prepared = await images.prepareInline(input);
      cache.set(source, prepared);
    }
    replacements.push('data:' + prepared.mime + ';base64,' + prepared.buffer.toString('base64'));
  }
  return { html: images.replaceImageSources(rendered.html, replacements), imageCount: sources.length };
}

function coverSource(flags, sources) {
  if (flags.cover) return flags.cover;
  if (sources.length) return sources[0];
  const error = new Error('文章没有图片，无法生成微信公众号封面。请使用 --cover 指定封面图。');
  error.code = 'COVER_REQUIRED';
  throw error;
}

async function layoutCommand(flags, input) {
  const source = await readMarkdown(input);
  const rendered = renderer.renderMarkdown(source.markdown, renderOptions(flags, {}));
  const validation = renderer.validateRendered(rendered.html);
  const prepared = await prepareLayoutHtml(rendered, source.baseDir);
  html.validateArticleShell(prepared.html);
  const output = flags.out ? path.resolve(flags.out) : path.resolve(source.baseDir, path.basename(source.source === '-' ? 'article' : source.source, path.extname(source.source === '-' ? 'article.md' : source.source)) + '_gzh.html');
  if (flags.out === '-') {
    process.stdout.write(prepared.html);
    return;
  }
  await fsp.mkdir(path.dirname(output), { recursive: true });
  await fsp.writeFile(output, prepared.html, 'utf8');
  writeResult({
    ok: true,
    command: 'layout',
    title: rendered.title,
    style: rendered.style,
    level: rendered.level,
    output,
    inlineImages: prepared.imageCount,
    selfContained: true,
    validationWarnings: validation.warnings
  }, flags);
}

async function draftCommand(flags, input) {
  const config = flags['dry-run'] ? {} : await resolveWechatConfig(flags, true);
  const source = await readMarkdown(input);
  const options = renderOptions(flags, config);
  // Drafts render the static branch by default (smaller payload). When the
  // caller passes --preserve-visuals we keep the full motion markup: the
  // draft/add API stores SMIL animations verbatim (verified 2026-09).
  options.static = flags.static === true;
  options.motion = flags['preserve-visuals'] === true ? true : false;
  const rendered = renderer.renderMarkdown(source.markdown, options);
  const validation = renderer.validateRendered(rendered.html);
  const sources = images.extractImageSources(rendered.html);
  const selectedCover = coverSource(flags, sources);
  const coverInput = await images.readImage(selectedCover, source.baseDir);
  const cover = await images.prepareCover(coverInput);

  const bodyImages = [];
  const cache = new Map();
  for (const imageSource of sources) {
    let item = cache.get(imageSource);
    if (!item) {
      item = await images.prepareInline(await images.readImage(imageSource, source.baseDir));
      cache.set(imageSource, item);
    }
    bodyImages.push({ source: imageSource, image: item });
  }

  let accessToken;
  let coverResult;
  let replacements;
  if (flags['dry-run']) {
    replacements = bodyImages.map(function (_item, index) {
      return 'https://example.invalid/yituo-hub-gzh-image-' + (index + 1) + '.jpg';
    });
  } else {
    log('正在请求微信公众号接口……', flags);
    accessToken = await wechat.getAccessToken(config.appid, config.appsecret);
    log('正在上传封面……', flags);
    coverResult = await wechat.uploadCover(accessToken, cover);
    if (!coverResult.media_id) {
      const error = new Error('封面上传响应中没有 media_id。');
      error.code = 'COVER_UPLOAD_FAILED';
      throw error;
    }
    replacements = [];
    for (let index = 0; index < bodyImages.length; index += 1) {
      log('正在上传正文图片 ' + (index + 1) + '/' + bodyImages.length + '……', flags);
      const result = await wechat.uploadInlineImage(accessToken, bodyImages[index].image);
      if (!result.url) {
        const error = new Error('正文图片上传响应中没有图片地址。');
        error.code = 'IMAGE_UPLOAD_FAILED';
        throw error;
      }
      replacements.push(result.url);
    }
  }
  let content = images.replaceImageSources(rendered.html, replacements);
  content = html.compactForWechat(content, { preserveVisuals: flags['preserve-visuals'] === true });
  html.validateArticleShell(content);
  const size = html.assertWechatLimits(content);
  const docLimitWarnings = size.chars > html.DOCS_MAX_CONTENT_CHARS
    ? ['正文 ' + size.chars + ' 字符超过微信文档建议的 ' + html.DOCS_MAX_CONTENT_CHARS + ' 字符（实测服务端可接收，属未文档化行为）']
    : [];
  if (flags['dry-run']) {
    writeResult({
      ok: true,
      command: 'draft',
      dryRun: true,
      title: rendered.title,
      style: rendered.style,
      level: rendered.level,
      inlineImages: bodyImages.length,
      contentChars: size.chars,
      contentBytes: size.bytes,
      validationWarnings: validation.warnings.concat(docLimitWarnings),
      wouldCreateDraft: true,
      published: false
    }, flags);
    return;
  }
  log('正在创建草稿……', flags);
  const digest = flags.digest || '用 YI TUO HUB GZH CLI，把 Markdown 排成公众号文章并保存到草稿箱。';
  const draftResult = await wechat.addDraft(accessToken, {
    article_type: 'news',
    title: rendered.title,
    author: flags.author !== undefined ? flags.author : (config.author || ''),
    digest,
    content,
    thumb_media_id: coverResult.media_id,
    need_open_comment: flags.comments ? 1 : 0,
    only_fans_can_comment: 0
  });
  if (!draftResult.media_id) {
    const error = new Error('新增草稿成功响应中没有 media_id。');
    error.code = 'DRAFT_CREATE_FAILED';
    throw error;
  }

  log('正在回读草稿核对……', flags);
  const detail = await wechat.getDraft(accessToken, draftResult.media_id);
  const item = detail.news_item && detail.news_item[0];
  const verified = !!item && item.title === rendered.title && item.thumb_media_id === coverResult.media_id;
  if (!verified) {
    const error = new Error('草稿已创建，但回读后的标题或封面与提交内容不一致。');
    error.code = 'DRAFT_VERIFY_FAILED';
    error.draftMediaId = draftResult.media_id;
    throw error;
  }
  writeResult({
    ok: true,
    command: 'draft',
    title: rendered.title,
    style: rendered.style,
    level: rendered.level,
    draftMediaId: draftResult.media_id,
    thumbMediaId: coverResult.media_id,
    inlineImages: bodyImages.length,
    contentChars: size.chars,
    contentBytes: size.bytes,
    validationWarnings: validation.warnings.concat(docLimitWarnings),
    verified: true,
    published: false
  }, flags);
}

async function doctor(flags) {
  const config = configStore.mergedConfig(flags.config);
  const ip = await wechat.publicIp();
  const result = {
    ok: true,
    node: process.version,
    configPath: config._path,
    appid: config.appid || '',
    appsecret: config.appsecret ? '已配置（不显示）' : '未配置',
    publicIp: ip || '暂时无法检测',
    consoleUrl: consoleUrl(config.appid)
  };
  if (config.appid && config.appsecret) {
    try {
      await wechat.getAccessToken(config.appid, config.appsecret);
      result.wechat = '接口权限通过，IP 白名单已放行';
    } catch (error) {
      result.ok = false;
      result.wechat = error.message;
      const whitelistIp = wechat.whitelistIpFromError(error);
      if (whitelistIp) result.whitelistIp = whitelistIp;
    }
  } else {
    result.wechat = '未检测：请先配置 AppID 和 AppSecret';
  }
  writeResult(result, flags);
  if (!result.ok) process.exitCode = 1;
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const command = parsed.positional.shift() || 'help';
  const flags = parsed.flags;
  if (flags.help || command === 'help') {
    process.stdout.write(help() + '\n');
    return;
  }
  if (flags.version || command === 'version') {
    process.stdout.write(VERSION + '\n');
    return;
  }
  if (command === 'styles') return styles(flags);
  if (command === 'setup' || command === 'config-init') return setup(flags);
  if (command === 'config' && parsed.positional[0] === 'show') return configShow(flags);
  if (command === 'doctor') return doctor(flags);
  if (command === 'layout') return layoutCommand(flags, parsed.positional[0]);
  if (command === 'draft') return draftCommand(flags, parsed.positional[0]);
  const error = new Error('未知命令：' + command + '。运行 yituo-hub-gzh --help 查看用法。');
  error.code = 'COMMAND_NOT_FOUND';
  throw error;
}

main().catch(function (error) { fail(error, parseArgs(process.argv.slice(2)).flags); });

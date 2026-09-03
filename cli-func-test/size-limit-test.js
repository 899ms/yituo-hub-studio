'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const w = require(path.join(os.homedir(), '.local/share/yituo-hub-gzh/cli/lib/wechat.js'));
const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/yituo-hub-gzh/config.json'), 'utf8'));
const count = (s, re) => (String(s).match(re) || []).length;

// 生成 ~24K 字符的合法排版内容（40 个带样式小节）
let content = `<section style="max-width:578px;margin:0 auto;font-size:15px;line-height:1.8;">`;
for (let i = 1; i <= 40; i++) {
  content += `<section style="padding:14px;background:#f7f5fb;border-radius:12px;margin-bottom:12px;">`
    + `<p style="margin:0 0 8px;font-weight:bold;">第 ${i} 节：体积压力测试</p>`
    + `<p style="margin:0;color:#444;">这一段用于验证微信草稿接口对正文体积的真实约束。` + `服务端预检与客户端预检是两回事，只有服务端的行为才是最终答案。`.repeat(14) + `</p></section>`;
}
content += `</section>`;

(async () => {
  const token = await w.getAccessToken(cfg.appid, cfg.appsecret);
  const cover = await w.uploadCover(token, { buffer: fs.readFileSync('cover.png'), extension: 'png', mime: 'image/png' });
  console.log('提交体积: ' + content.length + ' chars / ' + Buffer.byteLength(content) + ' bytes');
  try {
    const r = await w.addDraft(token, { article_type: 'news', title: '服务端体积上限探测（超2万字符）', author: 'Y visual', digest: '探测 20K 是否为服务端硬限制。', content, thumb_media_id: cover.media_id, need_open_comment: 0, only_fans_can_comment: 0 });
    console.log('✅ 微信接受了 >20K 内容！media_id=' + r.media_id.slice(0, 24) + '…');
    const d = await w.getDraft(token, r.media_id);
    const stored = (d.news_item && d.news_item[0] && d.news_item[0].content) || '';
    console.log('回读体积: ' + stored.length + ' chars（完整=' + (stored.length >= content.length - 50) + '）');
    fs.appendFileSync('size-test-media-ids.txt', r.media_id + '\n');
  } catch (e) {
    console.log('❌ 被拒绝: ' + e.message + (e.errcode ? ' (errcode=' + e.errcode + ')' : ''));
  }
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });

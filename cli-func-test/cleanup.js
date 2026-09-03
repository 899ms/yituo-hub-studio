'use strict';
const path = require('path'), fs = require('fs'), os = require('os');
const w = require(path.join(os.homedir(), '.local/share/yituo-hub-gzh/cli/lib/wechat.js'));
const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.config/yituo-hub-gzh/config.json'), 'utf8'));
const API = 'https://api.weixin.qq.com/cgi-bin';
async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return res.json();
}
(async () => {
  const token = await w.getAccessToken(cfg.appid, cfg.appsecret);
  const list = await post(`${API}/draft/batchget?access_token=${token}`, { offset: 0, count: 20, no_content: 1 });
  const items = (list.item || []).map(x => ({ media_id: x.media_id, title: x.content && x.content.news_item && x.content.news_item[0] && x.content.news_item[0].title }));
  console.log('草稿箱共 ' + items.length + ' 篇：');
  const junk = /实验|探测|对照/;
  let deleted = 0, kept = 0;
  for (const it of items) {
    if (junk.test(it.title || '')) {
      const r = await post(`${API}/draft/delete?access_token=${token}`, { media_id: it.media_id });
      console.log((r.errcode === 0 ? '  🗑 已删' : '  ⚠ 删失败(' + r.errcode + ')') + ' [' + it.title + ']');
      if (r.errcode === 0) deleted++;
    } else { console.log('  📌 保留 [' + (it.title || '(无标题)') + ']'); kept++; }
  }
  console.log('清理完成：删除 ' + deleted + ' 篇实验草稿，保留 ' + kept + ' 篇。');
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });

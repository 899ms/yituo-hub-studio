#!/usr/bin/env bash
# cli.yituohub.com 首页改版一键上线脚本
# 用法: ./deploy-cli-site.sh user@服务器IP
# 前置: 本机可 SSH 到目标服务器；nginx root 为 /var/www/screensprout-gzh
set -euo pipefail

TARGET=${1:?用法: ./deploy-cli-site.sh user@服务器IP}
ROOT=/var/www/screensprout-gzh
STAMP=$(date +%Y%m%d%H%M%S)

# 1. 服务器端备份原文件（可随时回滚）
ssh "$TARGET" "cd $ROOT && cp index.html index.html.bak.$STAMP && cp cinematic.css cinematic.css.bak.$STAMP && echo 备份完成: index.html.bak.$STAMP / cinematic.css.bak.$STAMP"

# 2. 上传改版文件（仅两个文件，product.css 无改动）
scp index.html cinematic.css "$TARGET:$ROOT/"

# 3. 线上验证：标题应为中文
ssh "$TARGET" "grep -o '写好 Markdown' $ROOT/index.html | head -1" >/dev/null && echo "✅ 线上文件已更新"

echo "🎉 上线完成。回滚命令:"
echo "  ssh $TARGET 'cd $ROOT && mv index.html.bak.$STAMP index.html && mv cinematic.css.bak.$STAMP cinematic.css'"

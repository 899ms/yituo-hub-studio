#!/usr/bin/env bash
set -euo pipefail

release_url="${YITUO_HUB_GZH_URL:-https://cli.yituohub.com/releases/yituo-hub-gzh-cli.tar.gz}"
user_home="$(cd ~ && pwd -P)"
install_root="${YITUO_HUB_GZH_HOME:-$user_home/.local/share/yituo-hub-gzh}"
bin_root="${YITUO_HUB_GZH_BIN:-$user_home/.local/bin}"
temp_root="$(mktemp -d "${TMPDIR:-/tmp}/yituo-hub-gzh-install.XXXXXX")"
trap 'rm -rf "$temp_root"' EXIT

command -v curl >/dev/null 2>&1 || { echo '需要 curl' >&2; exit 1; }
command -v tar >/dev/null 2>&1 || { echo '需要 tar' >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo '需要 Node.js 20 或更高版本' >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo '需要 npm' >&2; exit 1; }

node_major="$(node -p "process.versions.node.split('.')[0]")"
if [ "$node_major" -lt 20 ]; then
  echo "当前 Node.js 版本为 $(node --version)，需要 20 或更高版本" >&2
  exit 1
fi

curl --fail --location --silent --show-error "$release_url" -o "$temp_root/release.tar.gz"
mkdir -p "$install_root" "$bin_root"
tar -xzf "$temp_root/release.tar.gz" -C "$install_root" --strip-components=1
cd "$install_root"
npm install --omit=dev --no-audit --no-fund
chmod +x "$install_root/cli/bin/yituo-hub-gzh.js"
ln -sfn "$install_root/cli/bin/yituo-hub-gzh.js" "$bin_root/yituo-hub-gzh"

echo "YI TUO HUB GZH CLI 已安装到 $install_root"
if ! command -v yituo-hub-gzh >/dev/null 2>&1; then
  echo "请把 $bin_root 加入 PATH，然后运行：yituo-hub-gzh --help"
else
  yituo-hub-gzh --version
fi

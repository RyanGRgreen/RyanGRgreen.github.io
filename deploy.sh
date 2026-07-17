#!/usr/bin/env bash
set -euo pipefail

REPO="RyanGRgreen/RyanGRgreen.github.io"
REMOTE="https://github.com/${REPO}.git"
SITE="https://ryanGRgreen.github.io/"

cd "$(dirname "$0")"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "错误：当前目录不是 git 仓库。"
  exit 1
fi

current_remote="$(git remote get-url origin 2>/dev/null || true)"
if [[ "$current_remote" != "$REMOTE" ]]; then
  if git remote | grep -qx origin; then
    git remote set-url origin "$REMOTE"
  else
    git remote add origin "$REMOTE"
  fi
fi

echo "目标仓库: $REPO"
echo "上线地址: $SITE"
echo

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "未设置 GITHUB_TOKEN。"
  echo "请先在终端执行（不要把 Token 发到聊天里）："
  echo '  export GITHUB_TOKEN="你的Token"'
  echo "  ./deploy.sh"
  exit 1
fi

auth_header=(-H "Authorization: Bearer ${GITHUB_TOKEN}" -H "Accept: application/vnd.github+json")

if ! curl -fsS "${auth_header[@]}" "https://api.github.com/repos/${REPO}" >/dev/null 2>&1; then
  echo "GitHub 上还没有仓库 ${REPO}，正在创建..."
  curl -fsS -X POST "${auth_header[@]}" \
    "https://api.github.com/user/repos" \
    -d '{"name":"RyanGRgreen.github.io","description":"Stick VERSUS fan game","homepage":"https://ryanGRgreen.github.io/","private":false,"auto_init":false}' \
    >/dev/null
  echo "仓库已创建。"
fi

echo "正在推送到 GitHub..."
if git push "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" main; then
  echo
  echo "推送成功。"
  echo "若 Pages 尚未开启，请到："
  echo "  https://github.com/${REPO}/settings/pages"
  echo "  Source 选 Deploy from a branch → Branch: main → / (root)"
  echo
  echo "几分钟后访问: $SITE"
else
  echo
  echo "推送失败。请检查 Token 权限："
  echo "  - Repository access: RyanGRgreen.github.io（或 All repositories）"
  echo "  - Contents: Read and write"
  echo
  echo "重新生成 Token: https://github.com/settings/tokens?type=beta"
  exit 1
fi

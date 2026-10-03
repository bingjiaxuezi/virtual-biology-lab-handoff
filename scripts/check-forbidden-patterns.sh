#!/usr/bin/env bash
# 禁用模式检查：扫描 git 跟踪的文件，命中任一模式即失败。
# 模式来源（合并）：
#   1. scripts/forbidden-patterns.txt（入库的通用模式）
#   2. scripts/forbidden-patterns.local.txt（gitignored，本地敏感模式）
#   3. 环境变量 FORBIDDEN_PATTERNS_EXTRA（base64 编码，CI 注入的敏感模式）
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

PATTERNS_FILE="$(mktemp)"
trap 'rm -f "$PATTERNS_FILE"' EXIT

grep -v '^\s*#' scripts/forbidden-patterns.txt | grep -v '^\s*$' > "$PATTERNS_FILE"

if [ -f scripts/forbidden-patterns.local.txt ]; then
  grep -v '^\s*#' scripts/forbidden-patterns.local.txt | grep -v '^\s*$' >> "$PATTERNS_FILE"
fi

if [ -n "${FORBIDDEN_PATTERNS_EXTRA:-}" ]; then
  printf '%s' "$FORBIDDEN_PATTERNS_EXTRA" | base64 -d >> "$PATTERNS_FILE"
fi

if [ ! -s "$PATTERNS_FILE" ]; then
  echo "无有效模式，跳过检查"
  exit 0
fi

# git grep：0=命中（失败），1=无命中（通过），>1=错误
set +e
git grep -InE -f "$PATTERNS_FILE" -- . ':!scripts/forbidden-patterns.txt' ':!scripts/forbidden-patterns.local.txt'
rc=$?
set -e

if [ "$rc" -eq 0 ]; then
  echo "::error::检测到禁用模式（见上方文件与行号）" >&2
  exit 1
elif [ "$rc" -gt 1 ]; then
  echo "git grep 执行错误 (rc=$rc)" >&2
  exit "$rc"
fi

echo "禁用模式检查通过"

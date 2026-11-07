#!/usr/bin/env bash
# 本地预览：bash tools/serve.sh [端口]
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${1:-8000}"
printf '预览地址：http://localhost:%s\n' "$PORT"
printf '根目录：%s\n' "$ROOT"
exec python3 -m http.server "$PORT" --directory "$ROOT"

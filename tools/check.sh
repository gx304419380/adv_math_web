#!/usr/bin/env bash
# 静态校验：元数据一致性、模板完整性、版权关键词、外链可用性
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
FAIL=0
ok()  { printf '  \033[32m✓\033[0m %s\n' "$*"; }
bad() { printf '  \033[31m✗\033[0m %s\n' "$*"; FAIL=1; }

echo "== 1. chapters.json 一致性与完整性 =="
python3 - <<'PY' || FAIL=1
import json, os, sys
root = os.getcwd()
with open('chapters.json', encoding='utf-8') as f:
    data = json.load(f)
chs = data['chapters']
err = []
if len(chs) != 12: err.append(f'章节数应为 12，实际 {len(chs)}')
ids = [c['id'] for c in chs]
if len(set(ids)) != len(ids): err.append('章节 id 有重复')
for i, c in enumerate(chs):
    if c['index'] != i + 1: err.append(f"{c['id']} 的 index 应为 {i+1}")
    exp_prev = chs[i-1]['id'] if i > 0 else None
    exp_next = chs[i+1]['id'] if i < len(chs)-1 else None
    if c['prev'] != exp_prev: err.append(f"{c['id']} 的 prev 不闭合")
    if c['next'] != exp_next: err.append(f"{c['id']} 的 next 不闭合")
    if not c['sections']: err.append(f"{c['id']} 缺少 sections")
    if not c['title'] or not c['subtitle']: err.append(f"{c['id']} 缺少标题或副标题")
    if c['status'] != 'planned':
        page = os.path.join(root, 'chapters', c['id'], c['id'] + '.html')
        if not os.path.isfile(page): err.append(f"{c['id']} 标记为 {c['status']} 但缺少页面 {page}")
for e in err: print('   ✗', e)
if err: sys.exit(1)
print(f'   ✓ 12 章元数据、prev/next 闭合、已完成章节页面齐全（已完成 {sum(c["status"]=="done" for c in chs)} 章）')
PY

echo "== 2. 页面模板完整性 =="
python3 - <<'PY' || FAIL=1
import glob, os, sys
err = []
for path in glob.glob('chapters/ch*/ch*.html'):
    s = open(path, encoding='utf-8').read()
    for key in ['非官方学习辅助', 'DISCLAIMER.md', 'data-chapter-nav', 'data-nav-sidebar', 'data-goal-list']:
        if key not in s: err.append(f'{path} 缺少 {key}')
    if 'boot.js' not in s: err.append(f'{path} 未引入 boot.js')
for e in err: print('   ✗', e)
if err: sys.exit(1)
print('   ✓ 章节页面均含导航、目标、章节跳转与全站免责声明')
PY

echo "== 3. 版权合规关键词扫描 =="
if grep -rInE '习题 ?[0-9]+-[0-9]+|原书图|教材原文如下|见原书第[0-9]+页' --include='*.html' --include='*.md' chapters index.html README.md 2>/dev/null; then
  bad '发现疑似转载触发词，请人工复核'
else
  ok '未发现教材原文/原书习题编号等触发词'
fi

echo "== 4. 公式数值复核 =="
python3 tools/symcheck.py || FAIL=1

echo "== 5. CDN 外链可用性 =="
python3 - <<'PY' || FAIL=1
import re, glob, urllib.request, sys
urls = set()
for path in ['index.html'] + glob.glob('chapters/**/*.html', recursive=True) + glob.glob('assets/js/*.js'):
    s = open(path, encoding='utf-8').read()
    urls.update(re.findall(r'https://cdn\.jsdelivr\.net/[^\s"\'<>)]+', s))
urls = {u for u in urls if not u.endswith(('.md', '.json'))}
bad = []
for u in sorted(urls):
    try:
        req = urllib.request.Request(u, method='HEAD', headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=12) as r:
            if r.status != 200: bad.append((u, r.status))
    except Exception as e:
        bad.append((u, str(e)))
if bad:
    for u, e in bad: print('   ✗', u, e)
    sys.exit(1)
print(f'   ✓ {len(urls)} 个 CDN 资源全部返回 200')
PY

echo "== 6. 章节数据同步与全局样式约束 =="
python3 tools/sync-chapters.py --check || FAIL=1
if grep -rInE 'type="module"|injectCSS|import\.meta' --include='*.js' --include='*.html' assets chapters index.html style-guide.html 2>/dev/null; then
  bad '发现 ES module / 动态注入 CSS / import.meta 残留（会破坏 file:// 直开）'
else
  ok '无 module / 动态注入 / import.meta 残留，file:// 可直接打开'
fi
MISSING=0
for f in assets/css/base.css assets/css/design-system.css assets/css/demos.css \
         docs/PRINCIPLES.md docs/VISUAL_SPEC.md docs/CONTENT_SPEC.md \
         docs/PROJECT_PLAN.md docs/MAINTAINER_GUIDE.md style-guide.html; do
  if [ ! -f "$f" ]; then bad "缺少规范文件 $f"; MISSING=1; fi
done
[ "$MISSING" -eq 0 ] && ok '视觉规范、设计 token 与维护文档齐全'

echo
if [ "$FAIL" -eq 0 ]; then printf '\033[32m全部校验通过\033[0m\n'; else printf '\033[31m存在校验失败项\033[0m\n'; fi
exit "$FAIL"

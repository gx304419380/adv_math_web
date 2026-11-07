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

# 4) 按钮 / 读数 / 标签里不得用 Unicode 凑数学（见 docs/MATH_TYPESET.md §9）
if grep -nE "label: *'[^']*[²³ˣⁿ√]|name: *'[^']*[²³ˣⁿ√]" chapters/*/demo.js assets/js/*.js 2>/dev/null | head -1 | grep -q .; then
  bad "按钮/标签用了 Unicode 假数学（x²、eˣ、√x 等），应改用 tex: '...' 走 KaTeX"
else ok "按钮与标签均使用规范数学排版"; fi

# 5) 定理证明不得折叠（只允许习题答案折叠）
if grep -nE '<summary>[^<]*(证明|推导)' chapters/*/*.html 2>/dev/null | head -1 | grep -q .; then
  bad "存在折叠的证明/推导，应改为常显（.proof-title + .derive）"
else ok "证明与推导均直接显示，未折叠"; fi

echo
if [ "$FAIL" -eq 0 ]; then printf '\033[32m全部校验通过\033[0m\n'; else printf '\033[31m存在校验失败项\033[0m\n'; fi

# ---- 数学排版静态检查（见 docs/MATH_TYPESET.md）----
echo
echo "== 7. 数学排版 =="
FILES=$(git ls-files '*.html' 2>/dev/null)
[ -z "$FILES" ] && FILES=$(find . -name '*.html' -not -path './.git/*')

# 1) 单美元定界符（本站规定统一用 \( \)）
if grep -nE '(^|[^\\$])\$[^$]{1,80}\$([^$]|$)' $FILES 2>/dev/null | grep -v 'fb-no' | head -1 | grep -q .; then
  bad "存在 $…$ 单美元定界符，应改为 \\( \\)"
else ok "定界符统一（未使用单美元）"; fi

# 2) Unicode 数学符号
if grep -nP '[\x{03A3}\x{222B}\x{221A}\x{2264}\x{2265}\x{221E}\x{03B1}-\x{03C9}]' $FILES 2>/dev/null | head -1 | grep -q .; then
  bad "存在 Unicode 数学符号（Σ ∫ √ ≤ ≥ α ∞ 等），请改用 LaTeX 宏"
else ok "无 Unicode 数学符号"; fi

# 3) 综合审计：HTML 实体、中文裸进公式、函数名缺反斜杠、定界符配对
if python3 tools/audit-math.py >/tmp/math-audit.log 2>&1; then
  ok "无残留原始写法 / 中文进公式 / 函数名缺正体"
else
  bad "数学排版问题：$(tail -1 /tmp/math-audit.log)；明细运行 python3 tools/audit-math.py"
fi

# 4) 按钮 / 读数 / 标签里不得用 Unicode 凑数学（见 docs/MATH_TYPESET.md §9）
if grep -nE "label: *'[^']*[²³ˣⁿ√]|name: *'[^']*[²³ˣⁿ√]" chapters/*/demo.js assets/js/*.js 2>/dev/null | head -1 | grep -q .; then
  bad "按钮/标签用了 Unicode 假数学（x²、eˣ、√x 等），应改用 tex: '...' 走 KaTeX"
else ok "按钮与标签均使用规范数学排版"; fi

# 5) 定理证明不得折叠（只允许习题答案折叠）
if grep -nE '<summary>[^<]*(证明|推导)' chapters/*/*.html 2>/dev/null | head -1 | grep -q .; then
  bad "存在折叠的证明/推导，应改为常显（.proof-title + .derive）"
else ok "证明与推导均直接显示，未折叠"; fi

echo
if [ "$FAIL" -eq 0 ]; then printf '\033[32m全部校验通过\033[0m\n'; else printf '\033[31m存在校验失败项\033[0m\n'; fi
exit "$FAIL"

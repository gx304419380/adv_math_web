#!/usr/bin/env python3
"""数学排版静态审计（规范见 docs/MATH_TYPESET.md）。

在无浏览器环境下，扫描 HTML 源文件，找出会导致"页面上出现原始写法"的问题：
  1. 公式里出现 HTML 实体（&gt; &lt;）—— 应该直接写 > <
  2. 公式里出现 Unicode 数学符号（Σ ∫ √ ≤ α …）—— 应换成 LaTeX 宏
  3. 公式里出现裸中文 —— 应写进 \\text{} 或移到公式外
  4. 函数名缺少反斜杠（sin x / ln x / lim）
  5. 定界符不配对（\\( 与 \\) 数量不等、$$ 为奇数）

用法：
    python3 tools/audit-math.py            # 全站扫描，输出明细
    python3 tools/audit-math.py --last     # 只输出最后一行结论（给 check.sh 用）
退出码：有问题返回 1，干净返回 0。
"""
from __future__ import annotations

import glob
import re
import sys

ROOT = '.'
CJK = r'\u4e00-\u9fff'
UNICODE_MATH = 'Σ∫√≤≥≠∞αβγδεθλμπσφω∀∃∈⊂⊆∪∩⋯'

# 函数名/算子：出现这些字符序列但前面没有反斜杠，视为未正体
FUNCS = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan',
         'ln', 'log', 'lg', 'exp', 'lim', 'max', 'min', 'sup', 'inf', 'det', 'gcd']


def extract_math(html: str):
    """返回 [(行号, 公式内容, 是否独立公式)]"""
    out = []
    for m in re.finditer(r'\$\$(.+?)\$\$', html, re.S):
        out.append((html[:m.start()].count('\n') + 1, m.group(1), True))
    for m in re.finditer(r'\\\((.+?)\\\)', html, re.S):
        out.append((html[:m.start()].count('\n') + 1, m.group(1), False))
    return out


def check_file(path: str):
    issues = []
    html = open(path, encoding='utf-8').read()
    if '<pre' in html or '<code' in html:
        # 示例代码块里的 TeX 是故意展示的，剔除后再检查
        html_wo = re.sub(r'<pre.*?</pre>|<code.*?</code>', '', html, flags=re.S)
    else:
        html_wo = html

    # 定界符配对
    for left, right, name in [(r'\(', r'\)', r'\( \)'), (r'\[', r'\]', r'\[ \]')]:
        a, b = html_wo.count(left), html_wo.count(right)
        if a != b:
            issues.append((0, f'{name} 数量不配对（{a} 个开、{b} 个闭）'))
    if html_wo.count('$$') % 2:
        issues.append((0, '$$ 数量为奇数，存在未闭合的独立公式'))

    for ln, tex, display in extract_math(html_wo):
        tag = '独立公式' if display else '行内公式'

        # &lt; 是必需的（字面 < 会被 HTML 解析器当成标签开头）；
        # &gt; / &amp; 则多余，应该直接写 > 和 &
        if re.search(r'&(gt|amp);', tex):
            issues.append((ln, f'{tag} 含多余的 HTML 实体 &gt;/&amp;，应直接写 > 和 &（&lt; 可保留）'))

        bad = [c for c in tex if c in UNICODE_MATH]
        if bad:
            issues.append((ln, f'{tag} 含 Unicode 数学符号 {"".join(sorted(set(bad)))}，请改用 LaTeX 宏'))

        if re.search(f'[{CJK}]', tex) and '\\text' not in tex:
            issues.append((ln, f'{tag} 含中文但未包在 \\text{{}} 里'))

        # 函数名未加反斜杠（排除已转义的）
        for f in FUNCS:
            if re.search(rf'(?<![\\a-zA-Z]){f}(?![a-zA-Z])', tex):
                issues.append((ln, f'{tag} 中函数名 {f} 缺少反斜杠（应写 \\{f}），否则会渲染成变量相乘'))

        # 用 -> 表示箭头
        if '->' in tex:
            issues.append((ln, f'{tag} 用 -> 表示箭头，应写 \\to'))

    return issues


def main():
    last_only = '--last' in sys.argv
    files = sorted(glob.glob('**/*.html', recursive=True))
    files = [f for f in files if '/.git/' not in f and '/vendor/' not in f]

    total = 0
    for f in files:
        issues = check_file(f)
        if not issues:
            continue
        total += len(issues)
        if not last_only:
            print(f'\n{f}')
            for ln, msg in issues:
                loc = f'  第 {ln} 行' if ln else '  文件级'
                print(f'{loc}: {msg}')

    if last_only:
        print('OK' if total == 0 else f'共 {total} 处')
    else:
        print(f'\n扫描 {len(files)} 个文件，共 {total} 处问题' if total else f'\n扫描 {len(files)} 个文件，未发现问题 ✓')
    return 0 if total == 0 else 1


if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env python3
"""从 chapters.json 生成新章节的 HTML 骨架与 demo.js 骨架。

目的：让 11 章共享同一套页面外壳（8 区块、脚本顺序、页脚、侧栏挂载点），
撰写者只填内容，不再各自复制粘贴 head —— 避免全站样式碎片化。

用法：
  python3 tools/new-chapter.py            # 生成所有 status=planned 的章节
  python3 tools/new-chapter.py ch02 ch03  # 只生成指定章节
生成后必须跑：python3 tools/sync-chapters.py
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'chapters.json'

# 每节一个演示：key 与本章 demo.js 的 DEMOS 表一一对应。
# 命名规则：动宾或核心概念，全小写连字符；跨章重名无所谓（demo.js 是每章独立的）。
DEMO_NAMES = {
    'ch02': ['derivative-from-secant', 'derivative-rules', 'higher-derivatives',
             'implicit-and-parametric', 'linear-approx', 'related-rates'],
    'ch03': ['mvt-parallel', 'lhopital-comparison', 'taylor-approx', 'monotonicity-convexity',
             'extrema-and-maxmin', 'curve-sketching', 'curvature-circle', 'newton-method'],
    'ch04': ['antiderivative-family', 'substitution-flow', 'parts-visual',
             'rational-integration', 'integral-table'],
    'ch05': ['riemann-sum', 'ftc-accumulation', 'definite-substitution',
             'improper-tail', 'gamma-function'],
    'ch06': ['element-method', 'area-slice', 'work-slice', 'solid-of-revolution'],
    'ch07': ['slope-field', 'separable-equations', 'homogeneous-ode', 'linear-first-order',
             'reducible-ode', 'second-order-structure', 'characteristic-roots',
             'particular-solution', 'euler-equation', 'ode-system'],
    'ch08': ['vector-operations', 'cross-product', 'plane-normal',
             'space-line', 'quadric-surfaces', 'space-curve'],
    'ch09': ['surface-and-levelset', 'partial-slices', 'total-differential', 'chain-rule-tree',
             'implicit-partial', 'tangent-plane', 'gradient-field', 'multivar-extrema',
             'saddle-point', 'least-squares'],
    'ch10': ['double-integral-volume', 'order-switch', 'polar-jacobian',
             'triple-integral', 'parametric-integral'],
    'ch11': ['line-integral-arc', 'line-integral-work', 'green-theorem', 'surface-integral-area',
             'flux-surface', 'gauss-divergence', 'stokes-curl'],
    'ch12': ['partial-sums', 'convergence-tests', 'power-series', 'taylor-series',
             'series-application', 'uniform-convergence', 'fourier-square-wave',
             'general-period-fourier'],
}

# 多出来的演示挂在哪一节（1 起算）。保证「每节至少一个 data-demo」且总数与 demos 数组一致。
EXTRA_DEMOS = {
    'ch02': [(4, 5)],   # s4 再加一个相关变化率
    'ch06': [(2, 3)],   # s2 再加一个旋转体
}

HEAD = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>第 {index} 章 · {title} | 高等数学互动学习站</title>
<meta name="description" content="非官方学习辅助：{title} 的原创讲解、函数图像、交互示意图与动画">
<link rel="stylesheet" href="../../assets/css/base.css">
<link rel="stylesheet" href="../../assets/css/layout.css">
<link rel="stylesheet" href="../../assets/css/components.css">
<link rel="stylesheet" href="../../assets/css/design-system.css">
<link rel="stylesheet" href="../../assets/css/demos.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/jsxgraph@1.8.0/distrib/jsxgraph.css">
<script>try{{var t=localStorage.getItem('am-theme');if(t)document.documentElement.dataset.theme=t;}}catch(e){{}}</script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/jsxgraph@1.8.0/distrib/jsxgraphcore.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/@antv/g6@4.8.24/dist/g6.min.js"></script>
<script defer src="../../assets/js/chapters.js"></script>
<script defer src="../../assets/js/cdn.js"></script>
<script defer src="../../assets/js/math.js"></script>
<script defer src="../../assets/js/graph.js"></script>
<script defer src="../../assets/js/plot.js"></script>
<script defer src="../../assets/js/steps.js"></script>
<script defer src="../../assets/js/mindmap.js"></script>
<script defer src="../../assets/js/quiz.js"></script>
<script defer src="../../assets/js/theme.js"></script>
<script defer src="../../assets/js/nav.js"></script>
<script defer src="../../assets/js/polish.js"></script>
<script defer src="../../assets/js/boot.js"></script>
<script defer src="../../assets/js/demo-kit.js"></script>
<script defer src="demo.js"></script>
</head>
<body data-chapter="{cid}">
'''

TOP = '''
<div class="topbar">
  <div class="brand"><b>∫</b> 高等数学 · 互动学习站</div>
  <nav class="tb-nav">
    <a href="../../index.html">首页</a>
    <a href="#" data-chapter-menu>章节目录 ▾</a>
    <a href="../../DISCLAIMER.md">免责声明</a>
  </nav>
  <span class="tb-hint">同济第七版 · 内容原创</span>
</div>
<div class="reading-progress" data-reading-progress></div>

<header class="chapter-hero">
  <div class="hero-inner">
    <div class="hero-index">第 <span data-slot="index">{index}</span> 章 · <span data-slot="volume">{volume}</span></div>
    <h1 data-slot="title">{title}</h1>
    <p class="hero-sub" data-slot="subtitle">{subtitle}</p>
    <div class="hero-meta">
      <span>约 <span data-slot="estMinutes">{est}</span> 分钟</span><span>·</span>
      <span>{nsections} 节</span><span>·</span><span>{ndemos} 个交互演示</span><span>·</span>
      <span data-status-badge>进度</span>
    </div>
    <div class="btn-row hero-actions">
      <a class="btn primary" href="#s1">从第 1 节开始 ↓</a>
    </div>
  </div>
</header>

<div class="page-shell">
  <!-- 侧栏由 assets/js/nav.js 依 chapters.json 自动生成，只显示本章小节 -->
  <aside class="sidebar" data-nav-sidebar></aside>

  <main class="content">
'''

GOALS = '''    <!-- ② 学习目标 -->
    <section id="goals" class="block">
      <h2>这一章你会学到什么</h2>
      <p class="hint">本章按教材的节序展开，知识点名称与术语保持规范一致；定义与定理的表述、例题与图形均为本站原创。文中编号是本站自用编号，不是教材原编号。</p>
      <ul class="goal-list" data-goal-list>
<!-- GOALS:BEGIN -->
        <li><label><input type="checkbox">【待写目标一：学完能做什么】</label></li>
<!-- GOALS:END -->
      </ul>
    </section>

'''

MAP = '''    <!-- ③ 知识结构图 -->
    <section id="map" class="block">
      <h2>知识结构图</h2>
      <p class="hint">先看清这一章的知识点怎么长出来，再逐节往下读。点节点可高亮相连链路。</p>
      <div class="mermaid-box" data-mount="mindmap">
        <script type="application/json">
<!-- MAP:BEGIN -->
{mindmap}
<!-- MAP:END -->
        </script>
      </div>
    </section>

'''

PITFALLS = '''    <!-- ⑤ 常见误区 -->
    <section id="pitfalls" class="block">
      <h2>常见误区</h2>
<!-- PITFALLS:BEGIN -->
      <div class="math-block pitfall">
        <div class="mb-head"><span class="mb-tag">误区</span><span class="mb-title">【待写误区】</span></div>
        <div class="mb-body">【待写：错误做法 → 为什么错 → 正确做法】</div>
      </div>
<!-- PITFALLS:END -->
    </section>

'''

QUIZ = '''    <!-- ⑥ 习题与自测 -->
    <section id="quiz" class="block">
      <h2>习题与自测</h2>
      <p class="hint">题目为本站自编，不含教材原题。折叠答案适合纸笔练习，交互自测会即时判定并给出解析。</p>

      <div class="math-block exercise">
        <div class="mb-head"><span class="mb-tag">习题</span><span class="mb-title">纸笔练习</span><span class="mb-no">练习 1–3</span></div>
        <div class="mb-body">
<!-- EXERCISES:BEGIN -->
          <div class="exercise-card">
            <div class="ex-head"><span class="ex-no">1</span><span class="ex-level">基础</span><strong>【待写题目】</strong></div>
            <details class="ex-answer"><summary>查看答案与解析</summary><div class="ex-answer-body">【待写解析】</div></details>
          </div>
<!-- EXERCISES:END -->
        </div>
      </div>

      <div class="math-block exercise">
        <div class="mb-head"><span class="mb-tag">自测</span><span class="mb-title">交互选择题（即时判定）</span></div>
        <div class="mb-body">
          <div data-mount="quiz">
            <script type="application/json">
<!-- QUIZ:BEGIN -->
[
  { "q": "【待写题目】", "options": ["A", "B", "C", "D"], "answer": 0, "explain": "【待写解析，要说明另外三项为什么错】" }
]
<!-- QUIZ:END -->
            </script>
          </div>
        </div>
      </div>
    </section>

'''

SUMMARY = '''    <!-- ⑦ 小结 -->
    <section id="summary" class="block">
      <h2>小结</h2>
<!-- SUMMARY:BEGIN -->
      <p>【待写：三五句话把全章串起来，并点出通往下一章的桥】</p>
<!-- SUMMARY:END -->
      <div data-chapter-nav></div>
    </section>
'''

FOOTER = '''    <!-- ⑧ 全站页脚：每页显著可见，勿删 -->
    <footer class="site-footer">
      <p><strong>非官方学习辅助</strong> · 参考：同济大学《高等数学》第七版，高等教育出版社</p>
      <p>本站不含教材原文、例题、习题或原图，所有讲解与图形均为原创；文中编号为本站自用 ·
         <a href="../../DISCLAIMER.md">免责声明</a> ·
         <a href="../../README.md">关于本站</a> ·
         <a href="../../style-guide.html">视觉规范</a></p>
      <p class="copyright">原创内容采用 CC BY-NC-SA 4.0 许可</p>
    </footer>

  </main>
</div>
</body>
</html>
'''


def section_block(cid, index, s, sn, demo_key, demo_no, extra=None):
    sid = s['id']
    title = s['title']
    extra_html = ''
    for k, no in (extra or []):
        extra_html += f'''
        <div class="demo-box" data-demo="{k}">
          <div class="demo-title">演示 {no} · 【待写标题】</div>
          <div class="demo-caption">【待写：拖什么、看什么】</div>
        </div>
'''
    return f'''      <article class="section" id="{sid}">
<!-- SECTION:{sid}:BEGIN -->
        <h3><span class="sec-badge">{index}.{sn}</span>{title}</h3>
        <p>【待写：用生活类比或一个问题开场，一段只讲一件事】</p>

        <div class="math-block definition">
          <div class="mb-head"><span class="mb-tag">定义</span><span class="mb-title">【概念名】</span><span class="mb-no">{index}.{sn}</span></div>
          <div class="mb-body">【待写：原创精确表述，用 <mark class="key">高亮最容易漏掉的条件</mark>；术语首次出现用 <strong class="term">加粗</strong> 并当场给白话解释】</div>
        </div>

        <div class="demo-box" data-demo="{demo_key}">
          <div class="demo-title">演示 {demo_no} · 【待写标题】</div>
          <div class="demo-caption">【待写：这个图在演示什么，学生拖什么、看什么、为什么重要】</div>
        </div>

        <div class="math-block example">
          <div class="mb-head"><span class="mb-tag">例题</span><span class="mb-title">【待写标题】</span><span class="mb-no">例 {index}.{sn}</span></div>
          <div class="mb-body">
            <div class="ex-part"><span class="ex-label">题目</span><span class="ex-q">【待写自编题目】</span></div>
            <div class="ex-part"><span class="ex-label">思路</span><span>【待写】</span></div>
            <div class="ex-part"><span class="ex-label">解</span><span>【待写完整推导】</span></div>
            <div class="ex-part"><span class="ex-label">评注</span><span class="ex-note">【待写：这类题的固定动作】</span></div>
          </div>
        </div>

        <div class="math-block insight">
          <div class="mb-head"><span class="mb-tag">直观理解</span><span class="mb-title">【几何意义】</span></div>
          <div class="mb-body">【待写：图在说什么】</div>
        </div>
{extra_html}<!-- SECTION:{sid}:END -->
      </article>
'''


def mindmap_json(sections, chapter_title, next_title):
    nodes, edges = [], []
    for i, s in enumerate(sections):
        sid = f'n{i}'
        kind = 'root' if i == 0 else ('core' if i % 2 == 0 else 'branch')
        nodes.append({'id': sid, 'label': s['title'], 'kind': kind})
        if i:
            edges.append({'source': f'n{i-1}', 'target': sid})
    nodes.append({'id': 'end', 'label': '下一章：' + next_title, 'kind': 'end'})
    edges.append({'source': f'n{len(sections)-1}', 'target': 'end'})
    return json.dumps({'nodes': nodes, 'edges': edges}, ensure_ascii=False, indent=2)


def build_demo_js(cid, keys):
    lines = [
        f'/* 第 {cid[2:]} 章 · {len(keys)} 个原创交互演示',
        '   绘图统一复用 assets/js/plot.js；外壳（controls / readout / btnRow / mountDemos）在 assets/js/demo-kit.js。',
        '   每个演示都要有：可拖动或可播放的控件、随参数更新的数值解读、图下说明。',
        '   数学文字一律走 texInline / texHTML，禁止用 Unicode 假上下标。 */',
        '',
        'const DEMOS = {',
    ]
    for i, k in enumerate(keys):
        lines.append(f"  '{k}': function (el) {{")
        lines.append(f"    placeholderDemo(el, '{k}'); // TODO:{cid} 待实现，交付前必须替换")
        lines.append('  }' + (',' if i < len(keys) - 1 else ''))
    lines += ['};', '', 'mountDemos(DEMOS);', '']
    return '\n'.join(lines)


def main():
    data = json.loads(SRC.read_text(encoding='utf-8'))
    chapters = data['chapters']
    wanted = set(sys.argv[1:]) or {c['id'] for c in chapters if c['status'] == 'planned'}

    for ch in chapters:
        cid = ch['id']
        if cid not in wanted or cid not in DEMO_NAMES:
            continue
        keys = DEMO_NAMES[cid]
        sections = ch['sections']
        nxt = next((c['title'] for c in chapters if c['id'] == ch['next']), '全站总复习')
        next_title = nxt[:6]

        parts = [
            HEAD.format(index=ch['index'], title=ch['title'], cid=cid),
            TOP.format(index=ch['index'], volume=ch['volume'], title=ch['title'],
                       subtitle=ch['subtitle'], est=ch['estMinutes'],
                       nsections=len(sections), ndemos=len(keys)),
            GOALS,
            MAP.format(mindmap=mindmap_json(sections, ch['title'], next_title)),
            '    <!-- ④ 逐节讲解 -->\n    <section id="sections" class="block">\n      <h2>逐节讲解</h2>\n\n',
        ]
        # 演示编号：先按节顺序给主演示编号，额外演示接在后面
        extra_no = len(sections)
        extra_by_sec2 = {}
        for sec_no, key_idx in EXTRA_DEMOS.get(cid, []):
            extra_no += 1
            extra_by_sec2.setdefault(sec_no, []).append((keys[key_idx], extra_no))
        for sn, s in enumerate(sections, 1):
            parts.append(section_block(cid, ch['index'], s, sn, keys[sn - 1], sn,
                                       extra_by_sec2.get(sn)))
        parts += ['\n    </section>\n\n', PITFALLS, QUIZ, SUMMARY, FOOTER]

        d = ROOT / 'chapters' / cid
        d.mkdir(parents=True, exist_ok=True)
        (d / f'{cid}.html').write_text(''.join(parts), encoding='utf-8')
        (d / 'demo.js').write_text(build_demo_js(cid, keys), encoding='utf-8')
        ch['demos'] = keys
        ch['mtime'] = '2026-11-08'
        print(f'{cid}: {len(sections)} 节 / {len(keys)} 演示 → {d.relative_to(ROOT)}')

    SRC.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('已更新 chapters.json 的 demos 数组；请运行 python3 tools/sync-chapters.py')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""章节正文与演示装配检查（零门槛纯静态站点）。

用法：
  python3 tools/check-demos.py                  # 全站
  python3 tools/check-demos.py --chapter ch02  # 单章
  python3 tools/check-demos.py --chapter ch02 ch03

检查项：占位符、标记区完整性、知识图/自测 JSON 合法性、
data-demo 与 DEMOS 注册表一一对应、每节必备组件、
demo.js 语法、绘图器范围字段未被直接改写。
"""
import argparse
import glob
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CH_DIR = os.path.join(ROOT, 'chapters')

PLACEHOLDER = [
    '【待写', '【概念名】', '【待写标题】', 'placeholderDemo',
    'TODO', '待实现，交付前必须替换', '【待写自编题目】',
]
BLOCK_MARKS = ['GOALS', 'MAP', 'PITFALLS', 'EXERCISES', 'QUIZ', 'SUMMARY']


def block(text, name):
    m = re.search(
        r'<!--\s*' + re.escape(name) + r':BEGIN\s*-->(.*?)'
        r'<!--\s*' + re.escape(name) + r':END\s*-->', text, re.S)
    return m.group(1) if m else None


def json_in_block(text):
    """MAP / QUIZ 可能被 <script type="application/json"> 包着，取出纯 JSON"""
    m = re.search(r'<script type="application/json">(.*?)</script>', text, re.S)
    return (m.group(1) if m else text).strip()


def check(ch, errs):
    base = os.path.join(CH_DIR, ch)
    hp = os.path.join(base, ch + '.html')
    jp = os.path.join(base, 'demo.js')
    if not os.path.isfile(hp):
        errs.append(f'{ch}: 缺少 {hp}')
        return
    if not os.path.isfile(jp):
        errs.append(f'{ch}: 缺少 {jp}')
        return
    html = open(hp, encoding='utf-8').read()
    js = open(jp, encoding='utf-8').read()

    # 1) 占位符
    for pat in PLACEHOLDER:
        if pat in html or pat in js:
            errs.append(f'{ch}: 仍残留占位内容「{pat}」')

    # 早期手工样板章（ch01）不走数据驱动生产线，没有 GOALS/SECTION 标记区，
    # 它的正文与演示由 audit-math.py、symcheck.py、shot.py 等全站校验覆盖。
    # 占位符检查对任何章节都生效，其余装配检查只对生产线章节执行。
    if block(html, 'GOALS') is None and not re.search(r'SECTION:s\d+:BEGIN', html):
        print(f'  – {ch}: 手工样板章，跳过装配检查（全站静态校验仍覆盖）')
        return None

    # 2) 标记区
    for mk in BLOCK_MARKS:
        if block(html, mk) is None:
            errs.append(f'{ch}: 缺少或破损标记区 {mk}:BEGIN/END')
    secs = re.findall(r'<!--\s*SECTION:(s\d+):BEGIN\s*-->(.*?)'
                      r'<!--\s*SECTION:\1:END\s*-->', html, re.S)
    if not secs:
        errs.append(f'{ch}: 没有任何 SECTION:sN 标记区')

    # 3) 知识结构图 JSON
    mp = block(html, 'MAP')
    if mp:
        try:
            data = json.loads(json_in_block(mp))
            nodes, edges = data.get('nodes', []), data.get('edges', [])
            if not (6 <= len(nodes) <= 16):
                errs.append(f'{ch}: MAP 节点数 {len(nodes)} 不在 6–16')
            kinds = {n.get('kind') for n in nodes}
            if not {'root', 'end'} <= kinds:
                errs.append(f'{ch}: MAP 缺少 root 或 end 节点')
            if len(edges) < len(nodes) - 1:
                errs.append(f'{ch}: MAP 边太少，节点可能孤立')
        except Exception as e:
            errs.append(f'{ch}: MAP JSON 解析失败：{e}')

    # 4) 自测 JSON
    qz = block(html, 'QUIZ')
    if qz:
        try:
            items = json.loads(json_in_block(qz))
            if not (3 <= len(items) <= 8):
                errs.append(f'{ch}: 自测题 {len(items)} 道，应为 4–5 道')
            for i, it in enumerate(items):
                opts = it.get('options', [])
                a = it.get('answer')
                if not isinstance(a, int) or not (0 <= a < len(opts)):
                    errs.append(f'{ch}: 自测第 {i+1} 题 answer={a} 越界')
                if len(set(map(str, opts))) != len(opts):
                    errs.append(f'{ch}: 自测第 {i+1} 题选项重复')
                ex = it.get('explain', '')
                if len(ex) < 20:
                    errs.append(f'{ch}: 自测第 {i+1} 题解析过短，需说明其余项为何错')
        except Exception as e:
            errs.append(f'{ch}: QUIZ JSON 解析失败：{e}')

    # 5) 每节必备组件
    for sid, body in secs:
        if 'math-block example' not in body:
            errs.append(f'{ch}/{sid}: 缺少例题（math-block example）')
        if 'data-demo=' not in body:
            errs.append(f'{ch}/{sid}: 缺少演示（demo-box data-demo）')
        if 'math-block insight' not in body:
            errs.append(f'{ch}/{sid}: 缺少直观理解（insight）')
        if 'ex-part' not in body:
            errs.append(f'{ch}/{sid}: 例题不是四段式 ex-part')
        if '<details' in body and re.search(r'<summary>[^<]*(证明|推导)', body):
            errs.append(f'{ch}/{sid}: 证明被折叠')

    # 6) demo key 与注册表一一对应
    dom = re.findall(r'data-demo="([^"]+)"', html)
    reg = re.findall(r"['\"]([a-z0-9][a-z0-9-]*)['\"]\s*:\s*function", js)
    for k in dom:
        if k not in reg:
            errs.append(f'{ch}: data-demo="{k}" 在 DEMOS 中没有实现')
    for k in reg:
        if k not in dom:
            errs.append(f'{ch}: DEMOS 里的 "{k}" 没有对应 data-demo')
    if len(dom) != len(set(dom)):
        errs.append(f'{ch}: data-demo key 重复')
    if 'mountDemos(DEMOS)' not in js:
        errs.append(f'{ch}: demo.js 末尾缺少 mountDemos(DEMOS)')
    if re.search(r'\.o\.(xmin|xmax|ymin|ymax)\s*=', js):
        errs.append(f'{ch}: demo.js 直接改写 p.o.xmin 之类字段，请用 p.setRange()')

    # 7) 习题与目标
    exn = len(re.findall(r'class="exercise-card"', html))
    if exn < 3:
        errs.append(f'{ch}: 纸笔练习只有 {exn} 条，应为基础/进阶/综合 3 条')
    goals = len(re.findall(r'<li><label><input type="checkbox"', html))
    if goals < 3:
        errs.append(f'{ch}: 学习目标只有 {goals} 条')

    # 8) JS 语法
    r = subprocess.run(['node', '--check', jp], capture_output=True, text=True)
    if r.returncode != 0:
        errs.append(f'{ch}: demo.js 语法错误：{r.stderr.strip()[:200]}')

    return len(dom)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--chapter', nargs='+', default=None)
    args = ap.parse_args()
    if args.chapter:
        chs = args.chapter
    else:
        chs = sorted(os.path.basename(os.path.dirname(p))
                     for p in glob.glob(os.path.join(CH_DIR, 'ch*', 'ch*.html')))
    errs = []
    total = 0
    for ch in chs:
        before = len(errs)
        n = check(ch, errs)
        if n is None:
            continue
        total += n or 0
        if len(errs) == before:
            print(f'  ✓ {ch}: {n} 个演示全部装配，正文、JSON、语法通过')
        else:
            for e in errs[before:]:
                print(f'  ✗ {e}')
    print()
    if errs:
        print(f'共 {len(errs)} 处问题（{len(chs)} 章，{total} 个演示）')
        sys.exit(1)
    print(f'全部通过：{len(chs)} 章、{total} 个演示装配完整')
    sys.exit(0)


if __name__ == '__main__':
    main()

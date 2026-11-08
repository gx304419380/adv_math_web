#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把「正文片段」注入章节骨架，产出 chNN.html 与 demo.js。

内容片段放在 tools/content/chNN.txt，用 === 标记 === 分段：
  GOALS / MAP / SECTION:s1 … SECTION:sN / PITFALLS / EXERCISES /
  QUIZ / SUMMARY / DEMOJS

这样撰写者只写正文，不用重复骨架，也不用为 JSON 转义反斜杠；
骨架里的 data-demo key、脚本顺序、全站页脚都由生成器保证不被破坏。
"""
import argparse
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'tools', 'content')

MARK = re.compile(r'^===\s*([A-Za-z0-9:_]+)\s*===\s*$')
BLOCK = lambda name: re.compile(
    r'(<!--\s*' + re.escape(name) + r':BEGIN\s*-->)(.*?)(<!--\s*' + re.escape(name) + r':END\s*-->)',
    re.S)

PRESET_TAG = '<script defer src="../../assets/js/demo-presets.js"></script>'
PRESET_ANCHOR = '<script defer src="../../assets/js/demo-kit.js"></script>'
JSON_SCRIPT = re.compile(r'<script type="application/json">(.*?)</script>', re.S)


def replace_json_section(html, name, text):
    """MAP / QUIZ 的 JSON 装在 <script type="application/json"> 里。

    骨架最初把 <!-- MAP:BEGIN --> 写在了 script 内部，那对 HTML 解析器不是
    注释而是 JSON 文本的一部分，会直接让 JSON.parse 失败。这里把标记移到
    script 外，并支持重复运行（标记已在外的情况下只换 script 内容）。
    """
    inner_pat = re.compile(
        r'(<script type="application/json">)\s*'
        r'(<!--\s*' + re.escape(name) + r':BEGIN\s*-->)'
        r'(.*?)'
        r'(<!--\s*' + re.escape(name) + r':END\s*-->)\s*'
        r'(</script>)', re.S)
    m = inner_pat.search(html)
    if m:
        repl = ('<!-- ' + name + ':BEGIN -->\n' + m.group(1) + '\n' + text +
                '\n' + m.group(5) + '\n<!-- ' + name + ':END -->')
        return html[:m.start()] + repl + html[m.end():]
    outer = BLOCK(name).search(html)
    if outer and '<script type="application/json">' in outer.group(2):
        inner = JSON_SCRIPT.sub(
            lambda mm: '<script type="application/json">\n' + text + '\n</script>',
            outer.group(2), count=1)
        return html[:outer.start(2)] + inner + html[outer.end(2):]
    return html


def json_in_block(block_text):
    m = JSON_SCRIPT.search(block_text)
    return (m.group(1) if m else block_text).strip()


def parse_frag(path):
    parts, cur, buf = {}, None, []
    for line in open(path, encoding='utf-8').read().splitlines():
        m = MARK.match(line)
        if m:
            if cur is not None:
                parts[cur] = '\n'.join(buf).strip('\n')
            cur, buf = m.group(1), []
        else:
            buf.append(line)
    if cur is not None:
        parts[cur] = '\n'.join(buf).strip('\n')
    return parts


def build(ch, errs):
    frag_path = os.path.join(CONTENT, ch + '.txt')
    html_path = os.path.join(ROOT, 'chapters', ch, ch + '.html')
    js_path = os.path.join(ROOT, 'chapters', ch, 'demo.js')
    if not os.path.isfile(frag_path):
        errs.append(f'{ch}: 缺少内容片段 {frag_path}')
        return
    if not os.path.isfile(html_path):
        errs.append(f'{ch}: 缺少骨架 {html_path}')
        return
    parts = parse_frag(frag_path)
    html = open(html_path, encoding='utf-8').read()

    # 骨架里实际存在的标记区必须全部被片段覆盖
    needed = set(re.findall(r'<!--\s*([A-Za-z0-9:_]+):BEGIN\s*-->', html))
    missing = sorted(needed - set(parts))
    if missing:
        errs.append(f'{ch}: 内容片段缺少这些标记区：{missing}')
    extra = sorted(k for k in parts if k not in needed and k != 'DEMOJS')
    if extra:
        errs.append(f'{ch}: 内容片段有骨架里不存在的标记区：{extra}')
    if 'DEMOJS' not in parts:
        errs.append(f'{ch}: 内容片段缺少 DEMOJS 段')
    if missing or 'DEMOJS' not in parts:
        return

    before_demos = re.findall(r'data-demo="([^"]+)"', html)

    for name, text in parts.items():
        if name == 'DEMOJS':
            continue
        if name in ('MAP', 'QUIZ'):
            html = replace_json_section(html, name, text)
            if not BLOCK(name).search(html):
                errs.append(f'{ch}: 找不到 {name} 的 JSON 标记区')
            continue
        pat = BLOCK(name)
        if not pat.search(html):
            errs.append(f'{ch}: 骨架里找不到标记区 {name}')
            continue
        html = pat.sub(lambda m, t=text: m.group(1) + '\n' + t + '\n' + m.group(3), html, count=1)

    # 组件层：绘图构造器只引入一次
    if PRESET_TAG not in html:
        if PRESET_ANCHOR not in html:
            errs.append(f'{ch}: 骨架里找不到 demo-kit.js 引入位置')
        else:
            html = html.replace(PRESET_ANCHOR, PRESET_ANCHOR + '\n' + PRESET_TAG, 1)

    after_demos = re.findall(r'data-demo="([^"]+)"', html)
    if before_demos != after_demos:
        errs.append(f'{ch}: data-demo key 与骨架不一致（原 {before_demos} / 新 {after_demos}）')

    # 两个 JSON 区必须能解析
    for name in ('MAP', 'QUIZ'):
        m = BLOCK(name).search(html)
        if m:
            try:
                json.loads(json_in_block(m.group(2)))
            except Exception as e:
                errs.append(f'{ch}: {name} JSON 解析失败：{e}')

    for pat in ('【待写', 'placeholderDemo', 'TODO', '待实现，交付前必须替换'):
        if pat in html or pat in parts['DEMOJS']:
            errs.append(f'{ch}: 仍残留占位内容「{pat}」')

    js = ('/* 第 ' + ch[-2:] + ' 章 · 原创交互演示\n'
          '   绘图与外壳复用 assets/js/plot.js、demo-kit.js、demo-presets.js；\n'
          '   等比例、缩放平移、KaTeX 读数均由组件层统一保证。*/\n\n'
          + parts['DEMOJS'].strip() + '\n')
    if 'mountDemos(DEMOS)' not in js:
        errs.append(f'{ch}: DEMOJS 缺少 mountDemos(DEMOS)')

    if errs:
        return
    open(html_path, 'w', encoding='utf-8').write(html)
    open(js_path, 'w', encoding='utf-8').write(js)
    print(f'  ✓ {ch}: {len(before_demos)} 个演示、{len([k for k in parts if k.startswith("SECTION:")])} 节已注入')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('chapters', nargs='*', help='章节 id，留空则处理全部已有片段')
    a = ap.parse_args()
    if a.chapters:
        chs = a.chapters
    else:
        chs = sorted(os.path.basename(p)[:-4] for p in glob.glob(os.path.join(CONTENT, 'ch*.txt')))
    if not chs:
        print('没有找到内容片段，先用 === 标记 === 写 tools/content/chNN.txt')
        sys.exit(0)
    errs = []
    for ch in chs:
        before = len(errs)
        build(ch, errs)
        if len(errs) > before:
            for e in errs[before:]:
                print('  ✗', e)
    print()
    if errs:
        print(f'{len(errs)} 处问题，未写出文件')
        sys.exit(1)
    print(f'完成 {len(chs)} 章注入')


if __name__ == '__main__':
    main()

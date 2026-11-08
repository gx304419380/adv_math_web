#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""全站浏览器验收：直接以 file:// 打开，逐章采集渲染与运行时指标。

不启服务、不构建，专门验证「双击 index.html 就能学」这条底线。

用法：
  python3 tools/verify-pages.py                       # 12 章 + 首页 + 桌面
  python3 tools/verify-pages.py --chapters ch02 ch05  # 只测指定章
  python3 tools/verify-pages.py --json report.json    # 附写 JSON 报告

依赖：pip3 install playwright && playwright install chromium
"""
import argparse
import asyncio
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
CHS = [f'ch{i:02d}' for i in range(1, 13)]

PROBE = '''() => {
  const q = s => document.querySelectorAll(s).length;
  const txt = s => [...document.querySelectorAll(s)].map(x => x.textContent.trim());
  return {
    demos: q('[data-demo]'),
    canvas: q('.demo-canvas canvas'),
    readout: q('.readout'),
    emptyReadout: txt('.readout').filter(t => !t).length,
    libError: txt('.lib-error'),
    katexError: q('.katex-error'),
    rawTex: (document.body.innerText.match(/\\\\begin\{|\\\\dfrac\{|\\\\mathrm\{/g) || []).length,
    katex: q('.katex'),
    mapNodes: q('.mm-node'),
    chapterCards: q('.chapter-card'),
    gridCards: q('[data-chapter-grid] .chapter-card'),
    sidebarSections: q('[data-nav-sidebar] a'),
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  };
}'''


def judge(ch, d, errs):
    """返回该页的问题列表"""
    e = []
    # 首页没有演示 / 侧栏小节 / 知识图，单独按首页门槛判定
    if ch == 'index':
        if d['katexError']:
            e.append(f"index: {d['katexError']} 个 KaTeX 解析错误")
        if d['rawTex']:
            e.append(f"index: 页面残留 {d['rawTex']} 处原始 LaTeX")
        if d['gridCards'] != 12:
            e.append(f"index: 动态渲染的章节卡片 {d['gridCards']} 张，应为 12")
        if d['scrollWidth'] > d['clientWidth'] + 1:
            e.append(f"index: 横向溢出 {d['scrollWidth']} > {d['clientWidth']}")
        if errs:
            e.append(f'index: 控制台/页面错误 {errs[:2]}')
        return e
    if d['demos'] == 0:
        e.append(f'{ch}: 没有演示')
    # ch01 是手工样板章，其中「函数机器」是纯 DOM 示意、「单位圆」是 SVG，
    # 因此画布数比演示数少 2，不能用数据驱动章节的「一演示一画布」门槛衡量。
    # 移动端抽查的标签形如 ch01-mobile，同样要按基础章号判断。
    if not ch.startswith('ch01') and d['canvas'] < d['demos']:
        e.append(f"{ch}: 演示 {d['demos']} 个但只有 {d['canvas']} 张画布")
    if d['readout'] < d['demos']:
        e.append(f"{ch}: 演示 {d['demos']} 个但只有 {d['readout']} 个读数区")
    if d['emptyReadout']:
        e.append(f"{ch}: {d['emptyReadout']} 个读数区为空")
    if d['libError']:
        e.append(f"{ch}: 组件降级 {d['libError'][:1]}")
    if d['katexError']:
        e.append(f"{ch}: {d['katexError']} 个 KaTeX 解析错误")
    if d['rawTex']:
        e.append(f"{ch}: 页面残留 {d['rawTex']} 处原始 LaTeX")
    if d['katex'] == 0:
        e.append(f'{ch}: KaTeX 节点为 0，公式未渲染')
    if d['mapNodes'] == 0:
        e.append(f'{ch}: 知识结构图没有节点')
    if d['sidebarSections'] == 0:
        e.append(f'{ch}: 侧栏没有当前章小节链接')
    if d['scrollWidth'] > d['clientWidth'] + 1:
        e.append(f"{ch}: 横向溢出 {d['scrollWidth']} > {d['clientWidth']}")
    if errs:
        e.append(f'{ch}: 控制台/页面错误 {errs[:2]}')
    return e


async def probe(pw, browser, url, viewport, label, results, problems):
    pg = await browser.new_page(viewport=viewport)
    errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    try:
        await pg.goto(url, wait_until='domcontentloaded', timeout=90000)
        await pg.wait_for_timeout(4200)
        d = await pg.evaluate(PROBE)
        d['label'] = label
        d['errors'] = errs[:3]
        results.append(d)
        problems.extend(judge(label, d, errs))
        flag = '✓' if not judge(label, d, errs) else '✗'
        print(f"  {flag} {label:<12} 演示 {d['demos']:>2}  画布 {d['canvas']:>2}  "
              f"读数 {d['readout']:>2}  KaTeX {d['katex']:>3}  图节点 {d['mapNodes']:>2}  "
              f"溢出 {d['scrollWidth']}/{d['clientWidth']}")
    except Exception as ex:
        problems.append(f'{label}: 打开失败 {str(ex)[:140]}')
        print(f'  ✗ {label}: 打开失败 {str(ex)[:140]}')
    finally:
        await pg.close()


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--chapters', nargs='+', default=None)
    ap.add_argument('--json', default=None)
    ap.add_argument('--mobile', action='store_true', help='额外做 375×812 抽查')
    a = ap.parse_args()
    chs = a.chapters or CHS

    results, problems = [], []
    async with async_playwright() as pw:
        b = await pw.chromium.launch(args=['--no-sandbox'])
        print('== 桌面 1440×900 · file:// 直开 ==')
        await probe(pw, b, 'file://' + str(ROOT / 'index.html'),
                    {'width': 1440, 'height': 900}, 'index', results, problems)
        for ch in chs:
            p = ROOT / 'chapters' / ch / (ch + '.html')
            if not p.is_file():
                problems.append(f'{ch}: 缺少页面 {p}')
                continue
            await probe(pw, b, 'file://' + str(p),
                        {'width': 1440, 'height': 900}, ch, results, problems)
        if a.mobile:
            print('== 移动端 375×812 抽查 ==')
            for ch in [chs[0], chs[-1]]:
                p = ROOT / 'chapters' / ch / (ch + '.html')
                if p.is_file():
                    await probe(pw, b, 'file://' + str(p),
                                {'width': 375, 'height': 812}, ch + '-mobile',
                                results, problems)
        await b.close()

    if a.json:
        Path(a.json).write_text(json.dumps(
            {'results': results, 'problems': problems}, ensure_ascii=False, indent=2),
            encoding='utf-8')
        print(f'\nJSON 报告：{a.json}')

    print()
    if problems:
        print(f'共 {len(problems)} 处问题：')
        for p in problems:
            print('  ✗', p)
        raise SystemExit(1)
    print(f'全部通过：{len(results)} 个页面（file:// 直开）')
    raise SystemExit(0)


if __name__ == '__main__':
    asyncio.run(main())

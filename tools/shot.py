#!/usr/bin/env python3
"""逐章截图验收：起本地服务 → 打开页面 → 采集控制台错误 → 截全页与交互关键帧。

用法：
  python3 tools/shot.py --chapter ch01
  python3 tools/shot.py --chapter ch01 --viewports desktop,mobile
"""
import argparse
import functools
import http.server
import json
import os
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / 'screenshots'


def clean_old(chapter):
    '''清掉本章的旧截图。演示增删会让文件名里的序号改变，
    不清就会新旧混杂、越积越多（曾累积到 75 张 16MB）。'''
    if not SHOTS.exists():
        return 0
    n = 0
    for f in SHOTS.glob(f'{chapter}-*.png'):
        f.unlink()
        n += 1
    return n


def start_server():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    handler = functools.partial(Quiet, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    return srv, f'http://127.0.0.1:{srv.server_address[1]}'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--chapter', default='ch01')
    ap.add_argument('--viewports', default='desktop,mobile')
    args = ap.parse_args()

    SHOTS.mkdir(exist_ok=True)
    ch = args.chapter
    removed = clean_old(ch)
    if removed:
        print(f'已清理 {ch} 的旧截图 {removed} 张')
    page_url = f'/chapters/{ch}/{ch}.html'
    viewports = {'desktop': (1280, 900), 'mobile': (375, 812)}

    errors, failed_requests, screenshots = [], [], []
    srv, base = start_server()

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=['--no-sandbox'])
        ctx = browser.new_context(viewport={'width': 1280, 'height': 900}, device_scale_factor=1)
        page = ctx.new_page()
        page.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type == 'error' else None)
        page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        page.on('requestfailed', lambda r: failed_requests.append(f'{r.url} :: {r.failure}'))

        # 用 load 而非 networkidle：CDN 偶有慢连接，networkidle 会无限等待
        page.goto(base + page_url, wait_until='load', timeout=60000)
        page.wait_for_timeout(2800)  # 等 CDN 脚本、KaTeX 与 G6 渲染完成

        katex = page.locator('.katex').count()
        demos = page.locator('[data-demo]').count()
        mermaid = page.locator('.mermaid-box svg, .mermaid-box canvas').count()
        sec_links = page.locator('.sb-secs .sec-link').count()
        mind_nodes = page.locator('.mm-node').count()
        print(f'章节 {ch}：KaTeX {katex}，演示 {demos}，侧栏小节 {sec_links}，知识图节点 {mind_nodes}')

        for name in args.viewports.split(','):
            name = name.strip()
            if name not in viewports: continue
            w, h = viewports[name]
            page.set_viewport_size({'width': w, 'height': h})
            page.wait_for_timeout(400)
            path = SHOTS / f'{ch}-{name}-full.png'
            page.screenshot(path=str(path), full_page=True)
            screenshots.append(path.name)
            if name == 'mobile':
                sw = page.evaluate('document.documentElement.scrollWidth')
                cw = page.evaluate('document.documentElement.clientWidth')
                if sw > cw + 2: errors.append(f'移动端横向溢出：scrollWidth={sw} > clientWidth={cw}')
                print(f'移动端宽度检查：scrollWidth={sw}, clientWidth={cw}')

        page.set_viewport_size({'width': 1280, 'height': 900})
        page.wait_for_timeout(300)

        # 每个演示：初始态 + 交互后状态，各截一张
        boxes = page.locator('[data-demo]')
        for i in range(demos):
            box = boxes.nth(i)
            key = box.get_attribute('data-demo') or f'demo{i}'
            try:
                box.scroll_into_view_if_needed(timeout=3000)
                p0 = SHOTS / f'{ch}-{i+1:02d}-{key}-a.png'
                box.screenshot(path=str(p0))
                screenshots.append(p0.name)

                slider = box.locator('input[type="range"]').first
                btn = box.locator('.btn-row .btn, .demo-controls .btn').first
                if slider.count():
                    slider.evaluate("""el => {
                        const min = Number(el.min), max = Number(el.max);
                        el.value = String(min + (max - min) * 0.28);
                        el.dispatchEvent(new Event('input', {bubbles:true}));
                    }""")
                elif btn.count():
                    btn.click()
                page.wait_for_timeout(260)
                p1 = SHOTS / f'{ch}-{i+1:02d}-{key}-b.png'
                box.screenshot(path=str(p1))
                screenshots.append(p1.name)
            except Exception as e:
                errors.append(f'演示 {key} 截图失败：{e}')

        ctx.close()
        browser.close()
    srv.shutdown()

    report = {
        'chapter': ch, 'katex_nodes': katex, 'demos': demos,
        'mermaid_svg': mermaid, 'sidebar_section_links': sec_links,
        'screenshots': screenshots, 'console_errors': errors,
        'failed_requests': failed_requests,
        'passed': not errors and not failed_requests and demos > 0 and katex > 0
    }
    (ROOT / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'\n截图 {len(screenshots)} 张 → {SHOTS}')
    print(f'控制台错误 {len(errors)} 条，失败请求 {len(failed_requests)} 条')
    for e in errors[:12]: print('  !', e)
    print('验收结果：', 'PASS' if report['passed'] else 'FAIL')
    raise SystemExit(0 if report['passed'] else 1)


if __name__ == '__main__':
    main()

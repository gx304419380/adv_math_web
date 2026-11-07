#!/usr/bin/env python3
"""从 chapters.json 生成 assets/js/chapters.js。

目的：页面以 file:// 直接打开时无法 fetch 本地 JSON，因此把同一份数据
内嵌成 window.AM_CHAPTERS。chapters.json 是唯一数据源，改完必须跑本脚本。

用法：
  python3 tools/sync-chapters.py           # 生成
  python3 tools/sync-chapters.py --check  # 只校验是否一致（供 check.sh 调用）
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'chapters.json'
DST = ROOT / 'assets/js/chapters.js'


def build():
    data = json.loads(SRC.read_text(encoding='utf-8'))
    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    return (
        '/* 自动生成，请勿手改：由 tools/sync-chapters.py 从 chapters.json 生成。\n'
        '   目的：让页面以 file:// 直接打开时也能拿到章节数据（无需 fetch）。*/\n'
        'window.AM_CHAPTERS = ' + payload + ';\n'
    )


def main():
    content = build()
    if '--check' in sys.argv:
        current = DST.read_text(encoding='utf-8') if DST.exists() else ''
        if current.strip() == content.strip():
            print('   ✓ chapters.js 与 chapters.json 一致')
            return 0
        print('   ✗ chapters.js 已过期，请运行 python3 tools/sync-chapters.py')
        return 1
    DST.write_text(content, encoding='utf-8')
    print(f'已生成 {DST.relative_to(ROOT)}（{len(content)} 字节）')
    return 0


if __name__ == '__main__':
    sys.exit(main())

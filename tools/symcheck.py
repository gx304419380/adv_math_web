#!/usr/bin/env python3
"""用 sympy 复核第 1 章关键公式与数值，防止自撰讲解出现数学错误。"""
import sys
import sympy as sp

x = sp.symbols('x', positive=True)
h = sp.symbols('h', positive=True)

CHECKS = [
    ('lim sin(x)/x = 1',            sp.limit(sp.sin(x) / x, x, 0),              sp.Integer(1)),
    ('lim (x²−1)/(x−1) = 2',        sp.limit((x**2 - 1) / (x - 1), x, 1),       sp.Integer(2)),
    ('lim (1+1/x)^x = e',           sp.limit((1 + 1/x)**x, x, sp.oo),           sp.E),
    ('lim x²/x = 0 (高阶无穷小)',    sp.limit(x**2 / x, x, 0, dir='+'),          sp.Integer(0)),
    ('割线斜率极限 = 2',             sp.limit(((1 + h)**2 - 1) / h, h, 0),       sp.Integer(2)),
    ('d/dx x² 在 x=1 处 = 2',       sp.diff(x**2, x).subs(x, 1),                sp.Integer(2)),
    ('sin x ~ x (等价无穷小)',       sp.limit(sp.sin(x) / x, x, 0),              sp.Integer(1)),
]

fail = 0
for name, got, want in CHECKS:
    ok = sp.simplify(got - want) == 0
    print(f'  {"✓" if ok else "✗"} {name}: 得到 {got}，期望 {want}')
    if not ok:
        fail += 1

# 数值层面再抽查两个不易符号化的结论
import math
eps = 0.001
v = math.sin(0.001) / 0.001
ok = abs(v - 1) < 1e-6
print(f'  {"✓" if ok else "✗"} 数值抽查 sin(0.001)/0.001 = {v:.8f} ≈ 1')
if not ok: fail += 1

v2 = (1 + 1/100000)**100000
ok2 = abs(v2 - math.e) < 1e-4
print(f'  {"✓" if ok2 else "✗"} 数值抽查 (1+1/100000)^100000 = {v2:.8f} ≈ e')
if not ok2: fail += 1

if fail:
    print(f'\n{fail} 项复核未通过')
    sys.exit(1)
print('\n全部公式复核通过')

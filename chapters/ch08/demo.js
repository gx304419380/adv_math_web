/* 第 08 章 · 原创交互演示
   绘图与外壳复用 assets/js/plot.js、demo-kit.js、demo-presets.js；
   等比例、缩放平移、KaTeX 读数均由组件层统一保证。*/

const DEMOS = {
  'vector-operations': function (el) {
    const a = [1, 2, 3], b = [2, -1, 0];
    const arrow = (p, x, y, color, C) => {
      p.line(0, 0, x, y, { color: C(color), width: 2.4 });
      p.dot(x, y, { r: 4, color: C(color) });
    };
    DemoPresets.custom(el, {
      range: [-1, 3, -2, 3], boxH: 380,
      slider: { label: '混合比例', min: 0, max: 1, step: 0.01, init: 0.5 },
      figureHint: '图里是 xy 平面投影；第三分量请对照读数中的三元组。',
      draw: (p, out, t, c, C) => {
        arrow(p, a[0], a[1], 'accent', C);
        arrow(p, b[0], b[1], 'ok', C);
        p.line(a[0], a[1], b[0], b[1], { color: C('axis'), dash: true, width: 1.2 });
        const q = [t * a[0] + (1 - t) * b[0], t * a[1] + (1 - t) * b[1], t * a[2] + (1 - t) * b[2]];
        arrow(p, q[0], q[1], 'warn', C);
        p.text(a[0] + 0.08, a[1] + 0.15, 'a 的终点', { color: C('accent'), size: 11 });
        p.text(b[0] + 0.08, b[1] - 0.2, 'b 的终点', { color: C('ok'), size: 11 });
        const norm = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2]);
        out.innerHTML = `比例 ${texHTML('t=' + f4(t))}：${texHTML('t\\vec{a}+(1-t)\\vec{b}=\\bigl(' + f4(q[0]) + ',' + f4(q[1]) + ',' + f4(q[2]) + '\\bigr)')}，三维模长 ${texHTML('\\sqrt{' + f4(norm * norm) + '}=' + f4(norm))}（含第三分量，故不短于图中投影箭头；仅当第三分量为 0 时二者一样长）。<br>` +
          `橙色向量的终点始终落在两终点连成的线段上；${texHTML('\\vec{a}=(1,2,3)')}、${texHTML('\\vec{b}=(2,-1,0)')} 的第三分量未画在投影里。`;
      }
    });
  },

  'cross-product': function (el) {
    const a = [1, 2, 0], b = [2, -1, 0];
    DemoPresets.custom(el, {
      range: [-1.5, 3.5, -2, 3], boxH: 380,
      slider: { label: '缩放系数', min: 0.2, max: 1.2, step: 0.01, init: 1 },
      figureHint: '叉积方向垂直纸面，图中只能标成「向里」；其模就是平行四边形面积。',
      draw: (p, out, k, c, C) => {
        const B = [b[0] * k, b[1] * k];
        p.polygon([[0, 0], [a[0], a[1]], [a[0] + B[0], a[1] + B[1]], [B[0], B[1]]],
          { fill: C('cyan'), alpha: 0.24, stroke: C('cyan') });
        p.line(0, 0, a[0], a[1], { color: C('accent'), width: 2.4 });
        p.line(0, 0, B[0], B[1], { color: C('ok'), width: 2.4 });
        p.dot(a[0], a[1], { r: 4, color: C('accent') });
        p.text(0.15, 2.5, '垂直纸面向里', { color: C('warn'), size: 11 });
        const dot = a[0] * B[0] + a[1] * B[1];
        const cross = a[0] * B[1] - a[1] * B[0];
        out.innerHTML = `缩放 ${texHTML('k=' + f4(k))}：${texHTML('\\vec{b}=(' + f4(B[0]) + ',' + f4(B[1]) + ',0)')}。<br>` +
          `数量积 ${texHTML('\\vec{a}\\cdot\\vec{b}=' + f4(dot))}，恒为 0，说明两向量始终垂直；叉积第三分量 ${texHTML('a_xb_y-a_yb_x=' + f4(cross))}。<br>` +
          `平行四边形面积 ${texHTML('\\left|\\vec{a}\\times\\vec{b}\\right|=' + f4(Math.abs(cross)))}，也等于 ${texHTML('|\\vec{a}||\\vec{b}|')}。`;
      }
    });
  },

  'plane-normal': function (el) {
    const M = [1, 0, 0];
    DemoPresets.custom(el, {
      range: [-2, 3, -3, 4], boxH: 360,
      slider: { label: '法向量 y 分量', min: 1.5, max: 6, step: 0.05, init: 3 },
      figureHint: '法向量的三个分量就是平面方程里 x、y、z 的系数；图里只看 xy 投影。',
      draw: (p, out, B, c, C) => {
        // 平面 6(x-1)+By+2z=0，即 6x+By+2z-6=0；常数项与 B 无关
        const D = -6;
        // 与 xy 面（z=0）的交线：y=(6-6x)/B
        p.curve(x => (6 - 6 * x) / B, { color: C('accent'), width: 2.4 });
        p.line(0, 0, 1.5, 0.25 * B, { color: C('warn'), width: 2.4 });
        p.dot(1.5, 0.25 * B, { r: 4, color: C('warn') });
        p.text(-1.8, 3.4, '法向量投影', { color: C('warn'), size: 11 });
        p.dot(M[0], M[1], { r: 4, color: C('danger') });
        const dist = Math.abs(D) / Math.sqrt(36 + B * B + 4);
        out.innerHTML = `法向量 ${texHTML('\\vec{n}=(6,' + f4(B) + ',2)')}，过点 ${texHTML('(1,0,0)')}：点法式 ${texHTML('6(x-1)+' + f4(B) + 'y+2z=0')}。<br>` +
          `与 xy 面的交线 ${texHTML('y=\\dfrac{6-6x}{' + f4(B) + '}')}，斜率随 y 分量一起变；一般式系数 ${texHTML('A=6,\\ B=' + f4(B) + ',\\ C=2')}。<br>` +
          `原点到平面距离 ${texHTML('d=' + f4(dist))}，公式分母是 ${texHTML('|\\vec{n}|')}。`;
      }
    });
  },

  'space-line': function (el) {
    const M = [1, 2, 3], s = [2, -1, 1];
    DemoPresets.custom(el, {
      range: [-3, 5, -2, 4], boxH: 360,
      slider: { label: '参数', min: -1, max: 2, step: 0.01, init: 1 },
      figureHint: '图里是 xy 投影；判断点是否在直线上要看三个比值是否相同。',
      draw: (p, out, t, c, C) => {
        p.line(-3, 2 - (-3 - 1) / 2 * 1, 5, 2 - (5 - 1) / 2 * 1,
          { color: C('accent'), width: 2.2 });
        p.line(M[0], M[1], M[0] + s[0], M[1] + s[1], { color: C('ok'), width: 2.4 });
        const q = [M[0] + s[0] * t, M[1] + s[1] * t, M[2] + s[2] * t];
        p.dot(q[0], q[1], { r: 5, color: C('danger') });
        p.dot(M[0], M[1], { r: 4, color: C('accent') });
        p.text(q[0] + 0.1, q[1] + 0.2, '当前点', { color: C('danger'), size: 11 });
        const P = [3, 1, 4], rs = [(P[0] - M[0]) / s[0], (P[1] - M[1]) / s[1], (P[2] - M[2]) / s[2]];
        out.innerHTML = `${texHTML('t=' + f4(t))}：${texHTML('(x,y,z)=\\bigl(' + f4(q[0]) + ',' + f4(q[1]) + ',' + f4(q[2]) + '\\bigr)')}。<br>` +
          `直线 ${texHTML('\\frac{x-1}{2}=\\frac{y-2}{-1}=z-3')}；检验点 ${texHTML('(3,1,4)')} 的三个比值 ${texHTML(rs.map(f4).join('='))}，相同则点在直线上。`;
      }
    });
  },

  'quadric-surfaces': function (el) {
    let mode = 0;
    const h = 1.5;
    const cases = [
      { name: '球面', tex: 'x^{2}+y^{2}+(z-1)^{2}=1', r: Math.sqrt(3) / 2, shape: '球心在高度 1，半径随高度先增后减' },
      { name: '圆柱面', tex: 'x^{2}+y^{2}=1', r: 1, shape: '半径与高度无关' },
      { name: '圆锥面', tex: 'z^{2}=x^{2}+y^{2}', r: h, shape: '半径与高度成正比' },
      { name: '抛物面', tex: 'z=x^{2}+y^{2}', r: Math.sqrt(h), shape: '半径是高度的平方根' }
    ];
    DemoPresets.custom(el, {
      range: [-1.8, 1.8, -1.8, 1.8], boxH: 360,
      controlsHTML: '<span class="hint">切换曲面，比较同一高度截出的圆半径</span>',
      buttons: cases.map((cs, i) => ({ label: cs.name, run: () => { mode = i; } })),
      figureHint: '四张曲面在同一高度的水平截线都是圆，但半径各不相同；差别在于半径随高度怎么变。',
      draw: (p, out, v, c, C) => {
        const cs = cases[mode];
        p.circle(0, 0, cs.r, { color: C('accent'), width: 2.4, fill: C('cyan'), alpha: 0.14 });
        p.dot(cs.r, 0, { r: 4, color: C('danger') });
        out.innerHTML = `曲面 ${texHTML(cs.tex)}。<br>` +
          `用平面 ${texHTML('z=\\dfrac{3}{2}')} 去截，得到 ${texHTML('x^{2}+y^{2}=r^{2}')}，半径 ${texHTML('r=' + f4(cs.r))}。<br>` +
          `${cs.shape}；若方程里完全不出现某个变量，图形就沿那根轴无限延伸（柱面判据）。`;
      }
    });
  },

  'space-curve': function (el) {
    DemoPresets.custom(el, {
      range: [-1.6, 1.6, -1.6, 1.6], boxH: 360,
      slider: { label: '角度', min: 0, max: 6.28, step: 0.01, init: 0.8 },
      figureHint: '交线在 z=1 平面上，投影就是它本身；别忘了保留 z=1 这个条件。',
      draw: (p, out, t, c, C) => {
        p.circle(0, 0, 1, { color: C('accent'), width: 2.4, fill: C('cyan'), alpha: 0.12 });
        const x = Math.cos(t), y = Math.sin(t);
        p.dot(x, y, { r: 5, color: C('danger') });
        p.line(0, 0, x, y, { color: C('warn'), width: 1.4 });
        p.text(x + 0.08, y + 0.12, '交线上的点', { color: C('danger'), size: 11 });
        out.innerHTML = `角度 ${texHTML('t=' + f4(t))}：${texHTML('(x,y,z)=\\bigl(' + f4(x) + ',' + f4(y) + ',1\\bigr)')}。<br>` +
          `把 ${texHTML('z=1')} 代入 ${texHTML('x^{2}+y^{2}+z^{2}=2')} 得 ${texHTML('x^{2}+y^{2}=1')}；交线须写成联立 ${texHTML('\\begin{cases}x^{2}+y^{2}=1\\\\ z=1\\end{cases}')}，只写前一个会变成圆柱面。`;
      }
    });
  }
};

mountDemos(DEMOS);

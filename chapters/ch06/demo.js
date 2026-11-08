/* 第 06 章 · 原创交互演示
   绘图与外壳复用 assets/js/plot.js、demo-kit.js、demo-presets.js；
   等比例、缩放平移、KaTeX 读数均由组件层统一保证。*/

const DEMOS = {
  'element-method': function (el) {
    DemoPresets.custom(el, {
      range: [0, 2.4, 0, 3.4], boxH: 360, fill: true,
      slider: { label: '细条位置', min: 0.05, max: 1.95, step: 0.01, init: 1.0 },
      figureHint: '细条近似是矩形；把所有细条积起来，丢掉的只是高阶小量。',
      draw: (p, out, x, c, C) => {
        p.line(0, 0, 2, 0, { color: C('accent'), width: 2 });
        p.line(2, 0, 2, 3, { color: C('accent'), width: 2 });
        p.curve(t => 1.5 * t, { from: 0, to: 2, color: C('accent'), width: 2.4 });
        for (let i = 0; i < 40; i++) {
          const a = x * i / 40, b = x * (i + 1) / 40;
          p.rect(a, 0, b, 1.5 * b, { fill: C('cyan'), alpha: 0.10 });
        }
        p.rect(x, 0, x + 0.09, 1.5 * x, { fill: C('warn'), alpha: 0.55, stroke: C('warn') });
        p.text(x + 0.12, 1.5 * x, '这一薄条', { color: C('warn'), size: 11 });
        const partial = 0.75 * x * x;
        out.innerHTML = `位置 ${texHTML('x=' + f4(x))}：竖条高 ${texHTML('1.5x=' + f4(1.5 * x))}，微元 ${texHTML('\\mathrm{d}A=1.5x\\,\\mathrm{d}x')}。<br>` +
          `从 0 积到当前位置得 ${texHTML(f4(partial))}；积到 2 得总面积 ${texHTML('\\int_0^2 1.5x\\,\\mathrm{d}x=3')}，与三角形公式 ${texHTML('\\frac{1}{2}\\times 2\\times 3=3')} 一致。`;
      }
    });
  },

  'area-slice': function (el) {
    const lo = x => x * x, hi = x => 2 * x - x * x;
    DemoPresets.custom(el, {
      range: [0, 1.2, -0.2, 1.4], boxH: 360, fill: true,
      slider: { label: '积分上限', min: 0.05, max: 1, step: 0.01, init: 0.6 },
      figureHint: '先解交点 0 与 1，再判断区间内哪条曲线在上。',
      draw: (p, out, b, c, C) => {
        p.curve(lo, { from: 0, to: 1, color: C('accent'), width: 2.4 });
        p.curve(hi, { from: 0, to: 1, color: C('ok'), width: 2.4 });
        const n = 55;
        for (let i = 0; i < n; i++) {
          const a = b * i / n, d = b * (i + 1) / n;
          p.rect(a, lo(d), d, hi(d), { fill: C('cyan'), alpha: 0.22 });
        }
        p.dot(0, 0, { r: 4, color: C('danger') });
        p.dot(1, 1, { r: 4, color: C('danger') });
        p.text(0.03, 1.25, '交点', { color: C('danger'), size: 11 });
        const val = b * b - 2 * Math.pow(b, 3) / 3;
        out.innerHTML = `上限 ${texHTML('b=' + f4(b))}：已累加面积 ${texHTML(f4(val))}，微元是 ${texHTML('\\bigl[(2x-x^{2})-x^{2}\\bigr]\\mathrm{d}x')}。<br>` +
          `积到 1 得总面积 ${texHTML('\\int_0^1(2x-2x^{2})\\mathrm{d}x=\\frac{1}{3}')}。`;
      }
    });
  },

  'solid-of-revolution': function (el) {
    const f = x => x * x;
    DemoPresets.custom(el, {
      range: [-0.2, 1.3, -1.1, 1.4], boxH: 360,
      slider: { label: '圆盘位置', min: 0.05, max: 1, step: 0.01, init: 0.7 },
      figureHint: '橙色竖线是圆盘直径；截面积是圆周率乘半径的平方。',
      draw: (p, out, x, c, C) => {
        p.curve(f, { from: 0, to: 1, color: C('accent'), width: 2.5 });
        p.line(0, 0, 1, 0, { color: C('axis'), width: 1.2 });
        p.line(1, 0, 1, 1, { color: C('accent'), width: 2 });
        for (let i = 0; i < 36; i++) {
          const a = x * i / 36, b = x * (i + 1) / 36;
          p.rect(a, 0, b, f(b), { fill: C('cyan'), alpha: 0.12 });
        }
        p.line(x, -f(x), x, f(x), { color: C('warn'), width: 3 });
        p.dot(x, f(x), { r: 4, color: C('warn') });
        p.dot(x, -f(x), { r: 4, color: C('warn') });
        p.text(x + 0.03, 1.18, '旋转成圆盘', { color: C('warn'), size: 11 });
        const v = Math.PI * Math.pow(x, 5) / 5;
        out.innerHTML = `位置 ${texHTML('x=' + f4(x))}：半径 ${texHTML('r=x^{2}=' + f4(f(x)))}，微元 ${texHTML('\\mathrm{d}V=\\pi r^{2}\\mathrm{d}x=\\pi x^{4}\\mathrm{d}x')}。<br>` +
          `从 0 到当前位置体积 ${texHTML(f4(v))}；积到 1 得 ${texHTML('V=\\frac{\\pi}{5}')}。`;
      }
    });
  },

  'work-slice': function (el) {
    const F = x => 50 * x;
    DemoPresets.custom(el, {
      range: [0, 0.3, 0, 16], boxH: 340,
      equal: false, aspectNote: '横轴为位移、纵轴为力，两轴量纲不同，刻度各自标定',
      slider: { label: '拉到的位置', min: 0.02, max: 0.3, step: 0.005, init: 0.2 },
      figureHint: '功是力—位移曲线下的面积，不是末端力乘总位移。',
      draw: (p, out, b, c, C) => {
        p.curve(F, { from: 0, to: 0.3, color: C('accent'), width: 2.5 });
        const n = 50;
        for (let i = 0; i < n; i++) {
          const a = b * i / n, d = b * (i + 1) / n;
          p.rect(a, 0, d, F(d), { fill: C('cyan'), alpha: 0.20 });
        }
        p.line(b, 0, b, 16, { color: C('warn'), dash: true, width: 1.4 });
        p.dot(b, F(b), { r: 5, color: C('warn') });
        const W = 25 * b * b;
        out.innerHTML = `终点 ${texHTML('x_0=' + f4(b))}：末端力 ${texHTML('F(x_0)=' + f4(F(b)) + '\\ \\mathrm{N}')}，微元 ${texHTML('\\mathrm{d}W=50x\\,\\mathrm{d}x')}。<br>` +
          `累积功 ${texHTML('W=25x_0^{2}=' + f4(W) + '\\ \\mathrm{J}')}；若误用末端力乘位移会得到 ${texHTML(f4(F(b) * b))} 焦耳，正好是两倍。`;
      }
    });
  }
};

mountDemos(DEMOS);

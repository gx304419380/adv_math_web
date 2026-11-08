/* 第 03 章 · 原创交互演示
   绘图与外壳复用 assets/js/plot.js、demo-kit.js、demo-presets.js；
   等比例、缩放平移、KaTeX 读数均由组件层统一保证。*/

const DEMOS = {
  'mvt-parallel': function (el) {
    const f = x => x * x - 2 * x;
    DemoPresets.custom(el, {
      range: [-0.4, 3.4, -3, 4], boxH: 380, fill: true,
      slider: { label: '平移量', min: 0, max: 2.4, step: 0.01, init: 0.6 },
      figureHint: '橙线是割线，绿线是与它平行的可动直线；把平移量推到 2.25，绿线正好与曲线相切。',
      draw: (p, out, t, c, C) => {
        p.curve(f, { from: 0, to: 3, color: C('accent'), width: 2.6 });
        p.line(-0.3, -0.3, 3.3, 3.3, { color: C('warn'), width: 1.8 });
        p.line(-0.3, -0.3 - t, 3.3, 3.3 - t, { color: C('ok'), width: 2.0 });
        p.dot(0, 0, { r: 4, color: C('danger') });
        p.dot(3, 3, { r: 4, color: C('danger') });
        const disc = 9 - 4 * t;
        if (disc >= -1e-9) {
          const s = Math.sqrt(Math.max(0, disc));
          const x1 = (3 - s) / 2, x2 = (3 + s) / 2;
          p.dot(x1, x1 - t, { r: 4, color: C('ok') });
          if (Math.abs(x2 - x1) > 1e-6) p.dot(x2, x2 - t, { r: 4, color: C('ok') });
        }
        p.text(1.4, 2.5, '割线', { color: C('warn'), size: 11 });
        out.innerHTML = `平移量 ${texHTML('t=' + f4(t))}：可动直线 ${texHTML('y=x-t')}，与曲线联立得 ${texHTML('x^{2}-3x+t=0')}，判别式 ${texHTML('\\Delta=9-4t=' + f4(disc))}。<br>` +
          (Math.abs(disc) < 0.05
            ? `此时 ${texHTML('\\Delta=0')}，直线与曲线相切于 ${texHTML('x=\\dfrac{3}{2}')}；该点切线斜率也是 1，与割线相同，正是拉格朗日定理保证的 ${texHTML('\\xi=\\dfrac{3}{2}')}。`
            : `把平移量推到 ${texHTML('2.25')}，${texHTML('\\Delta')} 变成 0，绿线就恰好与蓝线相切；切点横坐标 ${texHTML('\\xi=\\dfrac{3}{2}')} 落在开区间 ${texHTML('(0,3)')} 内。`);
      }
    });
  },

  'lhopital-comparison': function (el) {
    let mode = 0;
    const cases = [
      { R: x => (3 * x - x * x) / (x + x * x), D: x => (3 - 2 * x) / (1 + 2 * x), name: '零比零型' },
      { R: x => (x * x + 1) / (x + 2), D: x => 2 * x, name: '非未定式' }
    ];
    DemoPresets.custom(el, {
      range: [0, 1.5, -0.2, 3.4], boxH: 380, fill: true,
      slider: { label: '观察点', min: 0.05, max: 1.4, step: 0.01, init: 0.5 },
      controlsHTML: '<span class="hint">切换类型，拖动观察点向 0 靠近，比较两条线是否趋于同一个数</span>',
      buttons: [
        { label: '零比零型（法则有效）', run: () => { mode = 0; } },
        { label: '非未定式（法则无效）', run: () => { mode = 1; } }
      ],
      figureHint: '蓝线是原比值 R(x)，橙色虚线是导数比 D(x)；只有零比零型或无穷比无穷型，两者才趋于同一极限。',
      draw: (p, out, v, c, C) => {
        const cs = cases[mode];
        p.curve(cs.R, { from: 0.02, to: 1.4, color: C('accent'), width: 2.6 });
        p.curve(cs.D, { from: 0.02, to: 1.4, color: C('warn'), width: 2.2, dash: true });
        p.line(v, -0.2, v, 3.4, { color: C('cyan'), dash: true, width: 1.2 });
        p.dot(v, cs.R(v), { r: 5, color: C('accent') });
        p.dot(v, cs.D(v), { r: 5, color: C('warn') });
        out.innerHTML = `${cs.name}：在 ${texHTML('x=' + f4(v))} 处，原比值 ${texHTML('R(x)=' + f4(cs.R(v)))}，导数比 ${texHTML('D(x)=' + f4(cs.D(v)))}。<br>` +
          (mode === 0
            ? `这是 ${texHTML('\\dfrac{0}{0}')} 型；当 ${texHTML('x\\to 0')} 时 ${texHTML('R(x)\\to 3')}、${texHTML('D(x)\\to 3')}，两者趋于同一个数，洛必达法则可用。`
            : `这里 ${texHTML('x\\to 0')} 时分子趋于 1、分母趋于 2，不是未定式；${texHTML('R(x)\\to \\dfrac{1}{2}')} 而 ${texHTML('D(x)\\to 0')}，两者分道扬镳，硬套洛必达会错得 ${texHTML('0')}。`);
      }
    });
  },

  'taylor-approx': function (el) {
    const fact = [1, 1, 2, 6, 24, 120, 720, 5040];
    const terms = [];
    for (let k = 0; k <= 7; k++) {
      terms.push(k === 0 ? () => 0 : (x => Math.pow(x, k) / fact[k - 1]));
    }
    DemoPresets.polyApprox(el, {
      range: [-1.3, 1.05, -1, 3.6], boxH: 380, fill: true,
      initN: 1,
      hint: '拖动阶数 n，看橙线怎样一步步贴住蓝线',
      target: x => x * Math.exp(x),
      terms: terms,
      readout: (n, poly, C) => `展开到 ${texHTML('n=' + n)} 阶。<br>` +
        `在 ${texHTML('x=1')} 处 ${texHTML('P_n(1)=' + f4(poly(1)))}，真值 ${texHTML('f(1)=\\mathrm{e}\\approx' + f4(Math.E))}，误差 ${texHTML(f4(Math.abs(Math.E - poly(1))))}。<br>` +
        `目标 ${texHTML('f(x)=x\\mathrm{e}^{x}')} 的展开是 ${texHTML('\\sum_{k=1}^{\\infty}\\frac{x^{k}}{(k-1)!}')}；阶数越高余项越小，橙线越贴蓝线。`,
      figureHint: '蓝线是目标函数，橙线是 n 阶泰勒多项式；阶数越高，橙线在展开点附近贴得越紧。'
    });
  },

  'monotonicity-convexity': function (el) {
    const f = x => x * x * x + 3 * x * x;
    const d1 = x => 3 * x * x + 6 * x;
    const d2 = x => 6 * x + 6;
    DemoPresets.sliderCurve(el, {
      range: [-2.8, 0.9, -0.9, 4.9], boxH: 380, fill: true,
      slider: { label: '观察点', min: -2.5, max: 0.6, step: 0.01, init: -0.5 },
      hint: '拖动观察点，读一阶与二阶导数的符号',
      curves: [{ fn: f, from: -2.8, to: 0.9, color: 'accent', width: 2.6 }],
      marks: [
        { type: 'vline', x: -2, color: 'warn' },
        { type: 'vline', x: -1, color: 'cyan' },
        { type: 'vline', x: 0, color: 'warn' }
      ],
      dynamic: (p, v, C) => {
        const k = d1(v), y = f(v);
        p.line(v - 0.3, y - 0.3 * k, v + 0.3, y + 0.3 * k, { color: C('danger'), width: 1.8 });
        p.dot(v, y, { r: 5, color: C('danger') });
        p.text(0.15, 4.3, '关键点分区', { color: C('text'), size: 11 });
      },
      readout: (v) => {
        const a = d1(v), b = d2(v);
        return `在 ${texHTML('x=' + f4(v))} 处：${texHTML("f'(x)=3x(x+2)=" + f4(a))}，${texHTML("f''(x)=6(x+1)=" + f4(b))}。<br>` +
          `${texHTML("f'")} ${a > 0 ? '为正，曲线在上升' : (a < 0 ? '为负，曲线在下降' : '为零，可能是极值点')}；${texHTML("f''")} ${b > 0 ? '为正，曲线开口向上（凹）' : (b < 0 ? '为负，曲线开口向下（凸）' : '为零，是拐点候选')}。<br>` +
          `分界点固定为 ${texHTML('x=-2,\\,0')}（由 ${texHTML("f'=0")} 给出）与 ${texHTML('x=-1')}（由 ${texHTML("f''=0")} 给出）。`;
      },
      figureHint: '两条橙竖线标出增减的分界，青竖线标出凹凸改变处，红短线是观察点的切线。'
    });
  },

  'extrema-and-maxmin': function (el) {
    const f = x => Math.abs(x * x - 2 * x);
    DemoPresets.sliderCurve(el, {
      range: [-1.15, 3.15, -0.4, 3.6], boxH: 380,
      slider: { label: '观察点', min: -1, max: 3, step: 0.01, init: 1 },
      hint: '比较五个可疑点的函数值，分清局部极值与整体最值',
      curves: [{ fn: f, from: -1.1, to: 3.1, color: 'accent', width: 2.6 }],
      marks: [
        { type: 'dot', x: -1, y: 3, color: 'warn' },
        { type: 'dot', x: 0, y: 0, color: 'danger' },
        { type: 'dot', x: 1, y: 1, color: 'ok' },
        { type: 'dot', x: 2, y: 0, color: 'danger' },
        { type: 'dot', x: 3, y: 3, color: 'warn' }
      ],
      dynamic: (p, v, C) => {
        p.line(v, -0.4, v, 3.6, { color: C('cyan'), dash: true, width: 1.2 });
        p.dot(v, f(v), { r: 5, color: C('cyan') });
        p.text(-1.05, 3.35, '端点', { color: C('warn'), size: 11 });
      },
      readout: (v) => {
        const val = f(v);
        let kind = '普通点';
        if (Math.abs(v + 1) < 0.02 || Math.abs(v - 3) < 0.02) kind = '区间端点';
        else if (Math.abs(v) < 0.02 || Math.abs(v - 2) < 0.02) kind = '不可导点（尖点）';
        else if (Math.abs(v - 1) < 0.02) kind = '驻点（局部极大）';
        return `在 ${texHTML('x=' + f4(v))} 处 ${texHTML('f(x)=' + f4(val))}，属于${kind}。<br>` +
          `把可疑点全代入：${texHTML('f(-1)=3,\\quad f(0)=0,\\quad f(1)=1,\\quad f(2)=0,\\quad f(3)=3')}。<br>` +
          `最大值 ${texHTML('3')} 在端点 ${texHTML('x=-1,\\,3')} 取得，最小值 ${texHTML('0')} 在不可导点 ${texHTML('x=0,\\,2')} 取得；驻点处的 ${texHTML('f(1)=1')} 只是局部极大，不是最大值。`;
      },
      figureHint: '橙点是两个端点，红点是两个尖点（不可导），绿点是唯一驻点；最值要把它们一起比。'
    });
  },

  'curve-sketching': function (el) {
    let stage = 0;
    const f = x => x + 4 / x;
    DemoPresets.custom(el, {
      range: [-4.6, 4.6, -6.2, 6.2], boxH: 400, fill: true,
      slider: { label: '观察点', min: 0.9, max: 4.2, step: 0.01, init: 2 },
      controlsHTML: '<span class="hint">按四个步骤依次叠加信息，先搭骨架再连曲线</span>',
      buttons: [
        { label: '渐近线', run: () => { stage = 0; } },
        { label: '关键点', run: () => { stage = 1; } },
        { label: '增减凹凸', run: () => { stage = 2; } },
        { label: '完整图形', run: () => { stage = 3; } }
      ],
      figureHint: '虚线是渐近线，红点是极值点；每一步都先用导数分析，再把各段连起来。',
      draw: (p, out, v, c, C) => {
        p.line(0, -6.2, 0, 6.2, { color: C('warn'), dash: true, width: 1.4 });
        p.line(-4.6, -4.6, 4.6, 4.6, { color: C('warn'), dash: true, width: 1.4 });
        if (stage >= 1) {
          p.dot(2, 4, { r: 5, color: C('danger') });
          p.dot(-2, -4, { r: 5, color: C('danger') });
          p.line(2, 0, 2, 4, { color: C('axis'), dash: true, width: 1.1 });
          p.line(-2, 0, -2, -4, { color: C('axis'), dash: true, width: 1.1 });
        }
        if (stage >= 2) {
          p.rect(0.01, -6.2, 4.6, 6.2, { fill: C('ok'), alpha: 0.05 });
          p.rect(-4.6, -6.2, -0.01, 6.2, { fill: C('cyan'), alpha: 0.05 });
        }
        if (stage >= 3) {
          p.curve(f, { from: 0.8, to: 4.4, color: C('accent'), width: 2.6 });
          p.curve(f, { from: -4.4, to: -0.8, color: C('accent'), width: 2.6 });
        }
        p.dot(v, f(v), { r: 4, color: C('cyan') });
        const names = ['渐近线', '关键点', '增减凹凸', '完整图形'];
        out.innerHTML = `第 ${stage + 1} 步 · ${names[stage]}：${texHTML('f(x)=x+\\frac{4}{x}')}，${texHTML("f'(x)=1-\\frac{4}{x^{2}}")}，${texHTML("f''(x)=\\frac{8}{x^{3}}")}。<br>` +
          `在 ${texHTML('x=' + f4(v))} 处 ${texHTML('f=' + f4(f(v)))}，${texHTML("f'=" + f4(1 - 4 / (v * v)))}，${texHTML("f''=" + f4(8 / (v * v * v)))}。<br>` +
          `竖直渐近线 ${texHTML('x=0')}，斜渐近线 ${texHTML('y=x')}；极小 ${texHTML('f(2)=4')}、极大 ${texHTML('f(-2)=-4')}；右侧凹、左侧凸。`;
      }
    });
  },

  'curvature-circle': function (el) {
    const y = x => x * x / 2;
    DemoPresets.custom(el, {
      range: [-2.8, 2.8, -0.6, 4.6], boxH: 400,
      slider: { label: '切点横坐标', min: -0.8, max: 0.8, step: 0.01, init: 0 },
      controlsHTML: '<span class="hint">拖动切点，比较曲率 K 与曲率半径 R</span>',
      figureHint: '绿圆是曲率圆，红点是切点；把切点拖离顶点，看圆怎样变大变松。',
      draw: (p, out, v, c, C) => {
        p.curve(y, { from: -2.7, to: 2.7, color: C('accent'), width: 2.6 });
        const k1 = v;
        const K = 1 / Math.pow(1 + k1 * k1, 1.5);
        const R = 1 / K;
        const cx = -Math.pow(v, 3), cy = 1 + 1.5 * v * v;
        p.circle(cx, cy, R, { color: C('ok'), width: 2.0, fill: C('cyan'), alpha: 0.10 });
        p.dot(v, y(v), { r: 5, color: C('danger') });
        p.dot(cx, cy, { r: 4, color: C('ok') });
        p.line(cx, cy, v, y(v), { color: C('warn'), dash: true, width: 1.3 });
        p.text(0.3, 4.0, '曲率圆', { color: C('ok'), size: 11 });
        out.innerHTML = `在 ${texHTML('x=' + f4(v))} 处：${texHTML("y'=x=" + f4(k1))}，${texHTML("y''=1")}。<br>` +
          `曲率 ${texHTML('K=\\dfrac{|y^{\\prime\\prime}|}{\\left(1+(y^{\\prime})^{2}\\right)^{3/2}}=' + f4(K))}，曲率半径 ${texHTML('R=\\dfrac{1}{K}=' + f4(R))}。<br>` +
          `曲率圆圆心 ${texHTML('\\bigl(-x^{3},\\ 1+\\tfrac{3}{2}x^{2}\\bigr)=\\bigl(' + f4(cx) + ',' + f4(cy) + '\\bigr)')}；顶点处 ${texHTML('K=1,\\ R=1')} 弯得最急，离顶点越远 K 越小。`;
      }
    });
  },

  'newton-method': function (el) {
    const f = x => x * x - 4 * x + 1;
    const df = x => 2 * x - 4;
    let x0 = 4;
    DemoPresets.custom(el, {
      range: [0.3, 4.7, -4, 4], boxH: 400, fill: true,
      slider: { label: '迭代步数', min: 0, max: 5, step: 1, init: 1 },
      controlsHTML: '<span class="hint">拖动迭代步数看收敛，再切换初值看分母为零的失效情形</span>',
      buttons: [
        { label: '初值 4（收敛）', run: () => { x0 = 4; } },
        { label: '初值 2（分母为零）', run: () => { x0 = 2; } }
      ],
      figureHint: '蓝线是函数曲线，橙色短线是每一步的切线；它与横轴的交点就是下一个近似值。',
      draw: (p, out, n, c, C) => {
        p.curve(f, { from: 0.4, to: 4.6, color: C('accent'), width: 2.6 });
        p.line(0.3, 0, 4.7, 0, { color: C('axis'), width: 1.2 });
        const N = Math.round(n);
        let xk = x0;
        const seq = [xk];
        let broken = false;
        for (let i = 0; i < N; i++) {
          const d = df(xk);
          if (Math.abs(d) < 1e-9) { broken = true; break; }
          const xn = xk - f(xk) / d;
          p.line(xk, f(xk), xn, 0, { color: C('warn'), width: 1.6 });
          p.line(xn, 0, xn, f(xn), { color: C('cyan'), dash: true, width: 1.1 });
          seq.push(xn);
          xk = xn;
        }
        p.dot(x0, f(x0), { r: 5, color: C('danger') });
        seq.forEach(q => p.dot(q, 0, { r: 3.5, color: C('ok') }));
        const last = seq[seq.length - 1];
        out.innerHTML = `初值 ${texHTML('x_0=' + f4(x0))}，迭代 ${N} 步：当前 ${texHTML('x=' + f4(last))}，${texHTML('f(x)=' + f4(f(last)))}，${texHTML("f'(x)=" + f4(df(last)))}。<br>` +
          (broken
            ? `这里 ${texHTML("f'(x_0)=0")}（顶点处切线水平），公式 ${texHTML("x_{n+1}=x_n-\\dfrac{f(x_n)}{f'(x_n)}")} 分母为零、切线与横轴平行没有交点，迭代做不下去；初值必须使 ${texHTML("f'(x_0)\\neq 0")}。`
            : `迭代公式 ${texHTML("x_{n+1}=x_n-\\dfrac{f(x_n)}{f'(x_n)}")}；每步把切线与横轴的交点当作新近似值，直到 ${texHTML('|f(x_n)|<\\varepsilon')} 就停。`) +
          `<br>初值 4 时 ${texHTML('x_1=3.75')}、${texHTML('f(3.75)=0.0625')}，比 ${texHTML('f(4)=1')} 更贴近根。`;
      }
    });
  }
};

mountDemos(DEMOS);

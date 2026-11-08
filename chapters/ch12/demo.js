/* 第 12 章 · 原创交互演示
   绘图与外壳复用 assets/js/plot.js、demo-kit.js、demo-presets.js；
   等比例、缩放平移、KaTeX 读数均由组件层统一保证。*/

const DEMOS = {
  'partial-sums': function (el) {
    const u = k => 3 / (4 * k * k - 1);
    DemoPresets.partialSum(el, {
      range: [0, 31, -0.2, 2.2],
      equal: false, aspectNote: '横轴是项数（计数），纵轴是部分和的值，两轴量纲不同',
      maxN: 30, initN: 6,
      term: u,
      limitLine: 1.5,
      hint: '把项数推大，盯住绿色折线停在哪里',
      figureHint: '浅色柱是每一项的大小，绿色折线是累加出的部分和，橙色虚线是极限 3/2。',
      readout: (N, s, term, C) =>
        `取前 ${texHTML('N=' + N)} 项：部分和 ${texHTML('S_{' + N + '}=' + f4(s))}，与 ${texHTML('\\frac{3}{2}=1.5')} 还差 ${texHTML(f4(Math.abs(1.5 - s)))}。<br>` +
        `第 ${texHTML('N')} 项 ${texHTML('u_N=\\frac{3}{4N^{2}-1}=' + f4(term(N)))} 已很小；${texHTML('\\lim_{N\\to\\infty}S_N=\\frac{3}{2}')}，故级数收敛于 ${texHTML('\\frac{3}{2}')}。<br>` +
        `但 ${texHTML('\\lim u_N=0')} 只是必要非充分：调和级数 ${texHTML('\\sum\\frac{1}{n}')} 通项也趋于 0，部分和却无限增长而发散。`
    });
  },

  'convergence-tests': function (el) {
    const defs = [
      { label: '比较判别', tex: '\\frac{n+2}{n^{3}+1}', term: n => (n + 2) / (n * n * n + 1), sum: 2.48465,
        calc: '\\frac{n+2}{n^{3}+1}<\\frac{3}{n^{2}}', verdict: '收敛',
        why: '比较判别法：正项级数，把通项放大到收敛的 p-级数上' },
      { label: '比值判别', tex: '\\frac{2n+1}{3^{n}}', term: n => (2 * n + 1) / Math.pow(3, n), sum: 2,
        calc: '\\rho=\\lim\\limits_{n\\to\\infty}\\frac{u_{n+1}}{u_n}=\\frac{1}{3}<1', verdict: '收敛',
        why: '比值判别法：正项级数，相邻两项之比的极限小于 1' },
      { label: '根值判别', tex: '\\left(\\frac{n}{3n+1}\\right)^{n}', term: n => Math.pow(n / (3 * n + 1), n), sum: 0.37206,
        calc: '\\rho=\\lim\\limits_{n\\to\\infty}\\sqrt[n]{u_n}=\\frac{1}{3}<1', verdict: '收敛',
        why: '根值判别法：通项整体是 n 次幂形状，开方后极限小于 1' },
      { label: '交错级数', tex: '(-1)^{n-1}\\frac{2}{2n+1}', term: n => Math.pow(-1, n - 1) * 2 / (2 * n + 1), sum: 2 - Math.PI / 2,
        calc: 'b_n=\\frac{2}{2n+1}\\downarrow 0', verdict: '条件收敛',
        why: '莱布尼茨判别法：先证收敛，再查绝对值级数发散' },
      { label: '调和级数', tex: '\\frac{1}{n}', term: n => 1 / n, sum: null,
        calc: '\\rho=\\lim\\limits_{n\\to\\infty}\\frac{u_{n+1}}{u_n}=1', verdict: '发散',
        why: '比值与根值极限都等于 1，判别法失效；由分组论证知发散' }
    ];
    let sel = 0;
    const partial = (d, N) => { let s = 0; for (let k = 1; k <= N; k++) s += d.term(k); return s; };
    DemoPresets.sliderCurve(el, {
      range: [0, 30, -1.2, 4.6],
      equal: false, aspectNote: '横轴是项数（计数），纵轴是部分和的值，两轴量纲不同',
      slider: { label: '累加项数', min: 1, max: 30, step: 1, init: 8 },
      hint: '切换五个级数，拖动项数看部分和折线',
      buttons: defs.map((d, i) => ({ label: d.label, run: () => { sel = i; } })),
      dynamic: (p, v, C) => {
        const d = defs[sel], N = Math.max(1, Math.round(v));
        let s = 0; const pts = [];
        for (let k = 1; k <= N; k++) {
          const h = d.term(k); s += h; pts.push([k, s]);
          p.rect(k - 0.32, 0, k + 0.32, h, { fill: C('cyan'), alpha: 0.2, stroke: C('accent') });
        }
        for (let k = 1; k < pts.length; k++) p.line(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], { color: C('ok'), width: 1.8 });
        pts.forEach(q => p.dot(q[0], q[1], { r: 3, color: C('ok') }));
        if (d.sum != null) p.line(0, d.sum, 30, d.sum, { color: C('warn'), dash: true, width: 1.5 });
      },
      figureHint: '绿色折线是部分和；橙色虚线是该级数的和。收敛的折线趋平，调和级数一路往上不回头。',
      readout: (v) => {
        const d = defs[sel], N = Math.max(1, Math.round(v)), s = partial(d, N);
        return `当前级数 ${texHTML(d.tex)}，用 <b>${d.label}</b>：${d.why}。<br>` +
          `关键算式 ${texHTML(d.calc)}，结论 <b>${d.verdict}</b>。<br>` +
          `取前 ${texHTML('N=' + N)} 项的部分和 ${texHTML('S_N=' + f4(s))}` +
          (d.sum != null ? `，级数和 ${texHTML('S=' + f4(d.sum))}（橙色虚线）。` : `；它随 ${texHTML('N')} 增大一直不回头。`) +
          `<br>写答案时把「方法名 + 条件 + 算式 + 结论」四件写齐。`;
      }
    });
  },

  'power-series': function (el) {
    let N = 3;
    const t = x => (x - 2) / 3;
    const S = (x, n) => { let s = 0; for (let k = 1; k <= n; k++) s += Math.pow(t(x), k) / k; return s; };
    const sum = x => { let s = 0; for (let k = 1; k <= 400; k++) s += Math.pow(t(x), k) / k; return s; };
    DemoPresets.sliderCurve(el, {
      range: [-1.6, 5.6, -2, 3.2],
      equal: false, aspectNote: '横轴是自变量 x，纵轴是部分和的值，两轴量纲不同',
      slider: { label: '观察位置', min: -0.9, max: 4.8, step: 0.02, init: 1 },
      hint: '拖动观察点，切换项数，看橙线在收敛区间内贴住蓝线',
      buttons: [
        { label: '取 2 项', run: () => { N = 2; } },
        { label: '取 5 项', run: () => { N = 5; } },
        { label: '取 12 项', run: () => { N = 12; } }
      ],
      curves: [
        { fn: x => S(x, N), color: 'warn', width: 2.2, from: -0.99, to: 4.6 },
        { fn: sum, color: 'accent', width: 2.6, from: -0.99, to: 4.6 }
      ],
      marks: [
        { type: 'vline', x: -1, color: 'danger' },
        { type: 'vline', x: 5, color: 'danger' }
      ],
      dynamic: (p, x0, C) => {
        p.dot(x0, S(x0, N), { r: 5, color: C('warn') });
        p.dot(x0, sum(x0), { r: 5, color: C('accent') });
      },
      figureHint: '两条红色竖线是收敛区间的端点 -1 与 5：端点要单独判断，不能只看半径。',
      readout: (x0) =>
        `在 ${texHTML('x_0=' + f4(x0))} 处，取前 ${texHTML('N=' + N)} 项：${texHTML('S_N=' + f4(S(x0, N)))}，无限项和 ${texHTML('S=' + f4(sum(x0)))}。<br>` +
        `收敛半径 ${texHTML('R=3')}，${texHTML('|x-2|<3')} 内橙线贴住蓝线；端点 ${texHTML('x=5')} 代入得调和级数发散、${texHTML('x=-1')} 代入得交错调和级数收敛，故收敛域 ${texHTML('[-1,5)')}。<br>` +
        `逐项求导后半径仍是 ${texHTML('R=3')}，但两个端点都要重新判断。`
    });
  },

  'taylor-series': function (el) {
    const terms = [0, 1, 2, 3, 4, 5, 6, 7].map(k => x => Math.pow(-1, k) * Math.pow(x, 2 * k + 1) / Math.pow(4, k + 1));
    const f = x => x / (4 + x * x);
    DemoPresets.polyApprox(el, {
      range: [-2, 2, -0.8, 0.8],
      equal: false, aspectNote: '横轴是自变量 x，纵轴是函数值，两轴刻度各自标定',
      terms: terms, target: f, initN: 2,
      hint: '把阶数推大，看橙线在收敛区间内贴住蓝线',
      dynamic: (p, n, poly, C) => {
        p.line(-2, -0.8, -2, 0.8, { color: C('danger'), dash: true, width: 1.3 });
        p.line(2, -0.8, 2, 0.8, { color: C('danger'), dash: true, width: 1.3 });
        p.dot(1.5, poly(1.5), { r: 5, color: C('warn') });
        p.dot(1.5, f(1.5), { r: 5, color: C('accent') });
      },
      figureHint: '红色竖线是收敛区间的端点 ±2；橙线是部分和多项式，蓝线是原函数。',
      readout: (n, poly) => {
        const x0 = 1.5, exact = f(x0), err = Math.abs(exact - poly(x0));
        return `取前 ${texHTML(String(n + 1))} 项：${texHTML('\\frac{x}{4+x^{2}}=\\sum_{k=0}^{n}\\frac{(-1)^{k}x^{2k+1}}{4^{k+1}}')}（${texHTML('|x|<2')}）。<br>` +
          `在 ${texHTML('x=1.5')} 处部分和 ${texHTML('S=' + f4(poly(x0)))}，真值 ${texHTML('f(1.5)=0.24')}，误差 ${texHTML(f4(err))}；项数加大时余项 ${texHTML('R_n\\to 0')}，橙线才等于蓝线。<br>` +
          `超出 ${texHTML('|x|<2')}（例如 ${texHTML('x=3')}）级数发散：即使 ${texHTML('f(3)=\\frac{3}{13}')} 有定义，也不能用展开式去算。`;
      }
    });
  },

  'series-application': function (el) {
    let N = 3;
    const f = x => 1 / (1 + x * x * x);
    const integral = b => {
      const m = 800, h = b / m; let s = 0;
      for (let i = 0; i <= m; i++) { const w = (i === 0 || i === m) ? 0.5 : 1; s += w * f(i * h); }
      return s * h;
    };
    const series = b => { let s = 0; for (let n = 0; n < N; n++) s += Math.pow(-1, n) * Math.pow(b, 3 * n + 1) / (3 * n + 1); return s; };
    DemoPresets.sliderCurve(el, {
      range: [0, 1, -0.05, 1.2], fill: true,
      slider: { label: '积分上限', min: 0.05, max: 0.95, step: 0.01, init: 0.5 },
      hint: '拖动积分上限，切换项数，比较级数近似值与数值积分',
      buttons: [
        { label: '取 2 项', run: () => { N = 2; } },
        { label: '取 3 项', run: () => { N = 3; } },
        { label: '取 4 项', run: () => { N = 4; } },
        { label: '取 5 项', run: () => { N = 5; } }
      ],
      curves: [{ fn: f, color: 'accent', width: 2.6, from: 0, to: 1 }],
      dynamic: (p, b, C) => {
        const m = 60;
        for (let i = 0; i < m; i++) {
          const a = b * i / m, d = b * (i + 1) / m;
          p.rect(a, 0, d, f(d), { fill: C('cyan'), alpha: 0.18 });
        }
        p.line(b, -0.05, b, 1.2, { color: C('warn'), dash: true, width: 1.4 });
        p.dot(b, f(b), { r: 5, color: C('warn') });
      },
      figureHint: '浅色填充是 [0,b] 上的积分面积；橙色竖线是上限位置，读数把级数近似与误差界一起给出。',
      readout: (b) => {
        const ap = series(b), ex = integral(b), bound = Math.pow(b, 3 * N + 1) / (3 * N + 1);
        return `上限 ${texHTML('b=' + f4(b))}：由 ${texHTML('\\frac{1}{1+x^{3}}=\\sum_{n=0}^{\\infty}(-1)^{n}x^{3n}')} 逐项积分得 ${texHTML('\\int_0^b\\frac{\\mathrm{d}x}{1+x^{3}}=\\sum_{n=0}^{\\infty}\\frac{(-1)^{n}b^{3n+1}}{3n+1}')}。<br>` +
          `取前 ${texHTML('N=' + N)} 项得 ${texHTML(f4(ap))}，数值积分核对 ${texHTML(f4(ex))}，实际误差 ${texHTML(f4(Math.abs(ex - ap)))}。<br>` +
          `交错级数余项不超过首个未取项 ${texHTML('\\frac{b^{3N+1}}{3N+1}=' + f4(bound))}；把上限拖到 ${texHTML('b=\\frac12')} 就是例题里的数。`;
      }
    });
  },

  'uniform-convergence': function (el) {
    let fam = 0;
    const S = (x, n) => { let s = 0; for (let k = 1; k <= n; k++) s += Math.sin(k * x) / Math.pow(2, k); return s; };
    const L = x => { let s = 0; for (let k = 1; k <= 240; k++) s += Math.sin(k * x) / Math.pow(2, k); return s; };
    const T = (x, n) => n * x / (1 + n * n * x * x);
    DemoPresets.sliderCurve(el, {
      range: [0, 1, -0.15, 0.85],
      slider: { label: '累加项数', min: 1, max: 20, step: 1, init: 3 },
      hint: '切换两组级数，把项数推大，盯住橙线与蓝线之间的最大差距',
      buttons: [
        { label: '一致收敛', run: () => { fam = 0; } },
        { label: '逐点非一致', run: () => { fam = 1; } }
      ],
      curves: [
        { fn: (x, n) => fam === 0 ? S(x, n) : T(x, n), color: 'warn', width: 2.2 },
        { fn: (x) => fam === 0 ? L(x) : 0, color: 'accent', width: 2.4 }
      ],
      dynamic: (p, n, C) => {
        if (fam === 0) p.dot(1, S(1, n), { r: 4, color: C('warn') });
        else p.dot(1 / n, 0.5, { r: 5, color: C('warn') });
      },
      figureHint: '橙线是第 n 个部分和，蓝线是极限函数；非一致时橙色小峰永远有 1/2 高。',
      readout: (n) => fam === 0
        ? `一致收敛：对一切 ${texHTML('x')} 有 ${texHTML('|S_n(x)-S(x)|\\le\\sum_{k>n}2^{-k}=2^{-n}=' + f4(Math.pow(2, -n)))}，与 ${texHTML('x')} 无关且随 ${texHTML('n')} 趋于 0。<br>` +
          `这正是 Weierstrass 优级数判别（取 ${texHTML('M_k=2^{-k}')}、${texHTML('\\sum M_k')} 收敛）的结论，故可放心逐项求积。`
        : `逐点收敛但不一致：${texHTML('T_n(1/n)=\\frac12')} 对每个 ${texHTML('n')} 都成立，${texHTML('\\sup_{x}|T_n(x)-0|=\\frac12')} 不随 ${texHTML('n')} 减小。<br>` +
          `固定 ${texHTML('x')} 时 ${texHTML('T_n(x)\\to 0')}，却找不到对全体 ${texHTML('x')} 通用的 ${texHTML('N')}；只凭逐点收敛不能交换积分与求和。`
    });
  },

  'fourier-square-wave': function (el) {
    const f = x => (Math.sin(x) > 0 ? 1 : -2);
    const S = (x, N) => {
      let s = -0.5;
      for (let k = 0; k < N; k++) s += 6 / Math.PI * Math.sin((2 * k + 1) * x) / (2 * k + 1);
      return s;
    };
    DemoPresets.sliderCurve(el, {
      range: [-3.5, 3.5, -3, 2],
      slider: { label: '谐波个数', min: 1, max: 25, step: 1, init: 3 },
      hint: '把谐波个数推大，盯住跳变点 x=0 处橙线的值',
      curves: [
        { fn: f, color: 'accent', width: 2.4, dash: true, dense: true },
        { fn: (x, N) => S(x, N), color: 'warn', width: 2.2 }
      ],
      dynamic: (p, N, C) => {
        p.dot(0, -0.5, { r: 5, color: C('danger') });
        p.dot(Math.PI / 2, S(Math.PI / 2, N), { r: 5, color: C('warn') });
      },
      figureHint: '蓝线是分段方波，橙线是只含奇次正弦的部分和；跳变处的过冲宽度变窄但高度不消失。',
      readout: (N) =>
        `取前 ${texHTML('N=' + N)} 个奇次谐波：${texHTML('S_N(x)=-\\frac12+\\frac{6}{\\pi}\\sum_{k=0}^{N-1}\\frac{\\sin((2k+1)x)}{2k+1}')}。<br>` +
        `间断点 ${texHTML('x=0')} 处 ${texHTML('S_N(0)=-\\frac12')} 与 ${texHTML('N')} 无关，恰等于左右极限的平均 ${texHTML('\\frac{1+(-2)}{2}=-\\frac12')}；不是「收敛到函数值」。<br>` +
        `连续点 ${texHTML('x=\\frac{\\pi}{2}')} 处 ${texHTML('S_N=' + f4(S(Math.PI / 2, N)))} 随 ${texHTML('N')} 趋于 ${texHTML('1')}；跳变附近的 Gibbs 过冲宽度变窄、高度不消失。`
    });
  },

  'general-period-fourier': function (el) {
    const f = (x, l) => {
      const u = ((x + l) % (2 * l) + 2 * l) % (2 * l) - l;
      return Math.abs(u) < l / 2 ? 1 : 0;
    };
    const S = (x, l, N) => {
      let s = 0.5;
      for (let n = 1; n <= N; n++) s += 2 / (n * Math.PI) * Math.sin(n * Math.PI / 2) * Math.cos(n * Math.PI * x / l);
      return s;
    };
    DemoPresets.twoSliders(el, {
      range: [-4.5, 4.5, -0.4, 1.5],
      equal: false, aspectNote: '横轴是自变量 x，纵轴是函数值，两轴刻度各自标定',
      sliders: [
        { label: '半周期', min: 1, max: 4, step: 0.1, init: 2 },
        { label: '谐波个数', min: 1, max: 20, step: 1, init: 3 }
      ],
      hint: '分别拖动半周期与谐波个数，看波形拉伸与部分和逼近',
      curves: [
        { fn: (x, l, N) => f(x, l), color: 'accent', width: 2.4, dash: true, dense: true },
        { fn: (x, l, N) => S(x, l, N), color: 'warn', width: 2.2 }
      ],
      dynamic: (p, l, N, C) => {
        p.line(-l / 2, -0.4, -l / 2, 1.5, { color: C('danger'), dash: true, width: 1.2 });
        p.line(l / 2, -0.4, l / 2, 1.5, { color: C('danger'), dash: true, width: 1.2 });
        p.dot(0, S(0, l, N), { r: 5, color: C('warn') });
        p.dot(l / 2, 0.5, { r: 5, color: C('danger') });
      },
      figureHint: '红色竖线是间断点 ±l/2；蓝线是周期脉冲，橙线是按对应频率写出的部分和。',
      readout: (l, N) =>
        `半周期 ${texHTML('l=' + f4(l))}（周期 ${texHTML('2l=' + f4(2 * l))}）、取前 ${texHTML('N=' + N)} 项。<br>` +
        `系数里频率是 ${texHTML('\\frac{n\\pi}{l}')}，基波的 ${texHTML('\\frac{\\pi}{l}=' + f4(Math.PI / l))}；改变 ${texHTML('l')} 只拉伸横轴刻度。<br>` +
        `间断点 ${texHTML('x=\\pm\\frac{l}{2}')} 处级数收敛到左右极限的平均 ${texHTML('\\frac{1+0}{2}=\\frac12')}（红点），不取单侧的函数值；连续点才收敛到 ${texHTML('f(x)')}。`
    });
  }
};

mountDemos(DEMOS);

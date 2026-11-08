/* 第 05 章 · 原创交互演示
   绘图与外壳复用 assets/js/plot.js、demo-kit.js、demo-presets.js；
   等比例、缩放平移、KaTeX 读数均由组件层统一保证。*/

const DEMOS = {
  'riemann-sum': function (el) {
    const f = x => 2 * x + 1;
    DemoPresets.custom(el, {
      range: [-0.2, 1.2, -0.2, 3.4],
      equal: false, aspectNote: '横轴为自变量、纵轴为函数值，两轴刻度各自标定',
      boxH: 360,
      slider: { label: '等分数', min: 2, max: 60, step: 1, init: 8 },
      controlsHTML: '<span class="hint">把等分数推大，看小矩形面积之和怎样逼近 2</span>',
      figureHint: '定义里的四步：分割、取点、求和、让最宽的一段趋于 0。',
      draw: (p, out, n, c, C) => {
        n = Math.round(n);
        p.curve(f, { from: 0, to: 1, color: C('accent'), width: 2.4 });
        let sum = 0;
        for (let k = 1; k <= n; k++) {
          const x0 = (k - 1) / n, x1 = k / n, h = f(x1);
          p.rect(x0, 0, x1, h, { fill: C('cyan'), alpha: 0.22, stroke: C('cyan') });
          sum += h / n;
        }
        p.line(0, 0, 1, 0, { color: C('axis'), width: 1.2 });
        out.innerHTML = `等分数 ${texHTML('n=' + n)}：小矩形面积之和 ${texHTML('S_n=' + f4(sum))}；精确值 ${texHTML('\\int_0^1(2x+1)\\,\\mathrm{d}x=2')}。<br>` +
          `误差 ${texHTML(f4(Math.abs(2 - sum)))}。取右端点时每个矩形都偏高，所以和始终略大于 2，但随 ${texHTML('n\\to\\infty')} 挤到 2。`;
      }
    });
  },

  'ftc-accumulation': function (el) {
    const f = t => t * t + 1;
    const Phi = x => Math.pow(x, 3) / 3 + x;
    DemoPresets.custom(el, {
      range: [0, 2.5, 0, 8], boxH: 380, fill: true,
      slider: { label: '上限', min: 0.1, max: 2.4, step: 0.01, init: 1.2 },
      figureHint: '填充面积是变上限积分的值，蓝线在该点的高度正是它的导数。',
      draw: (p, out, x0, c, C) => {
        p.curve(f, { color: C('accent'), width: 2.4 });
        p.curve(Phi, { color: C('ok'), width: 2.2 });
        for (let i = 0; i < 45; i++) {
          const a = x0 * i / 45, b = x0 * (i + 1) / 45;
          p.rect(a, 0, b, f(b), { fill: C('cyan'), alpha: 0.16 });
        }
        p.line(x0, 0, x0, 8, { color: C('warn'), dash: true, width: 1.4 });
        p.dot(x0, Phi(x0), { r: 5, color: C('ok') });
        p.dot(x0, f(x0), { r: 5, color: C('accent') });
        out.innerHTML = `上限 ${texHTML('x_0=' + f4(x0))}：累积面积 ${texHTML('\\Phi(x_0)=' + f4(Phi(x0)))}，蓝线高度 ${texHTML('f(x_0)=' + f4(f(x0)))}。<br>` +
          `绿线在该点的切线斜率正好是 ${texHTML(f4(f(x0)))}，即 ${texHTML("\\Phi'(x)=f(x)")}；这正是微积分基本公式的局部版本。`;
      }
    });
  },

  'definite-substitution': function (el) {
    const g = x => 2 * x * Math.pow(1 + x * x, 2);
    DemoPresets.custom(el, {
      range: [0, 1.2, 0, 15], boxH: 360,
      equal: false, aspectNote: '横轴为自变量、纵轴为函数值，两轴刻度各自标定',
      slider: { label: '积分上限', min: 0.1, max: 1, step: 0.01, init: 1 },
      figureHint: '换元后积分限从 0 到 b 变成从 1 到 1 加 b 的平方，算出数值即可，不必回代。',
      draw: (p, out, b, c, C) => {
        p.curve(g, { color: C('accent'), width: 2.5 });
        for (let i = 0; i < 50; i++) {
          const a = b * i / 50, d = b * (i + 1) / 50;
          p.rect(a, 0, d, g(d), { fill: C('cyan'), alpha: 0.18 });
        }
        p.line(b, 0, b, 15, { color: C('warn'), dash: true, width: 1.4 });
        const u1 = 1 + b * b, val = (Math.pow(u1, 3) - 1) / 3;
        out.innerHTML = `原限 ${texHTML('x\\in[0,' + f4(b) + ']')}；令 ${texHTML('u=1+x^{2}')} 后新限 ${texHTML('u\\in[1,' + f4(u1) + ']')}。<br>` +
          `${texHTML('\\mathrm{d}u=2x\\,\\mathrm{d}x')} 吸收了括号外的因子，于是 ${texHTML('\\int_0^b 2x(1+x^{2})^{2}\\mathrm{d}x=\\int_1^{1+b^{2}}u^{2}\\,\\mathrm{d}u=' + f4(val))}。<br>` +
          `把上限拖到 1，就得到例题里的 ${texHTML('\\dfrac{7}{3}')}。`;
      }
    });
  },

  'improper-tail': function (el) {
    let pw = 2;
    DemoPresets.sliderCurve(el, {
      range: [1, 12, 0, 1.1], boxH: 340,
      equal: false, aspectNote: '横轴跨度远大于纵轴，纵向刻度已单独缩放',
      slider: { label: '上限', min: 1.5, max: 12, step: 0.1, init: 4 },
      hint: '切换幂次，再把上限一路推大，看部分积分值停不停得下来',
      buttons: [
        { tex: 'p=1', run: () => { pw = 1; } },
        { tex: 'p=2', run: () => { pw = 2; } },
        { tex: 'p=3', run: () => { pw = 3; } }
      ],
      curves: [{ fn: x => 1 / Math.pow(x, pw), color: 'accent', width: 2.5 }],
      dynamic: (p, B, C) => {
        const n = 60;
        for (let i = 0; i < n; i++) {
          const a = 1 + (B - 1) * i / n, b = 1 + (B - 1) * (i + 1) / n;
          p.rect(a, 0, b, 1 / Math.pow(b, pw), { fill: C('cyan'), alpha: 0.16 });
        }
        p.line(B, 0, B, 1.1, { color: C('warn'), dash: true, width: 1.4 });
      },
      readout: (B) => {
        const val = pw === 1 ? Math.log(B) : (1 - Math.pow(B, 1 - pw)) / (pw - 1);
        const lim = pw === 1 ? '随 ' + texHTML('\\ln B') + ' 无限增长，发散' : ('趋于 ' + f4(1 / (pw - 1)) + '，收敛');
        return `${texHTML('p=' + pw)}、${texHTML('B=' + f4(B))}：${texHTML('\\int_1^B\\frac{1}{x^{p}}\\,\\mathrm{d}x=' + f4(val))}。<br>` +
          `三条曲线在 ${texHTML('x\\to+\\infty')} 时都趋于 0，但 ${lim}。${texHTML('p>1')} 才收敛，这就是 ${texHTML('p')}-积分结论。`;
      },
      figureHint: '尾巴的面积会不会失控，取决于衰减速度而不是是否趋于 0。'
    });
  },

  'gamma-function': function (el) {
    const gamma = s => {
      const h = 0.01; let acc = 0;
      for (let i = 1; i <= 3000; i++) {
        const x = i * h;
        acc += Math.pow(x, s - 1) * Math.exp(-x) * h;
      }
      return acc;
    };
    DemoPresets.sliderCurve(el, {
      range: [0, 8, 0, 5], boxH: 340,
      equal: false, aspectNote: '横轴跨度大于纵轴，纵向刻度已单独缩放',
      slider: { label: '参数', min: 1, max: 5, step: 0.05, init: 3 },
      hint: '把参数拖到整数点，对照阶乘值',
      curves: [{ fn: (x, s) => Math.pow(x, s - 1) * Math.exp(-x), color: 'accent', width: 2.5 }],
      dynamic: (p, s, C) => {
        const peak = Math.max(0, s - 1);
        p.line(peak, 0, peak, 5, { color: C('warn'), dash: true, width: 1.2 });
        p.dot(peak, Math.pow(peak, s - 1) * Math.exp(-peak) || 0, { r: 4, color: C('warn') });
      },
      readout: (s) => `参数 ${texHTML('s=' + f4(s))}：曲线下方面积 ${texHTML('\\Gamma(s)\\approx' + f4(gamma(s)))}。<br>` +
        `递推 ${texHTML('\\Gamma(s+1)=s\\,\\Gamma(s)')} 与 ${texHTML('\\Gamma(1)=1')} 给出 ${texHTML('\\Gamma(n+1)=n!')}：${texHTML('\\Gamma(3)=2')}、${texHTML('\\Gamma(4)=6')}。`,
      figureHint: '指数衰减让无穷远处的尾巴面积有限，所以这个含参积分对所有正参数都收敛。'
    });
  }
};

mountDemos(DEMOS);

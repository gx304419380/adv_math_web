/* 第 02 章 · 原创交互演示
   绘图与外壳复用 assets/js/plot.js、demo-kit.js、demo-presets.js；
   等比例、缩放平移、KaTeX 读数均由组件层统一保证。*/

const DEMOS = {
  'derivative-from-secant': function (el) {
    const f = x => x * x, x0 = 1;
    DemoPresets.sliderCurve(el, {
      range: [-0.5, 3, -1, 7], boxH: 380, fill: true,
      slider: { label: '两点间距', min: 0.02, max: 1.2, step: 0.01, init: 1.0 },
      hint: '把 h 拖小，看割线怎样贴到红色虚线上',
      curves: [{ fn: f, color: 'accent', width: 2.6 }],
      play: { label: '▶ 让间距收小', to: 0.02, duration: 3 },
      dynamic: (p, h, C) => {
        const y0 = f(x0), y1 = f(x0 + h), k = (y1 - y0) / h;
        p.line(x0, y0, x0 + h, y1, { color: C('warn'), width: 2.2 });
        p.line(-0.4, 2 * x0 * (-0.4 - x0) + y0, 2.9, 2 * x0 * (2.9 - x0) + y0,
          { color: C('danger'), dash: true, width: 1.8 });
        p.dot(x0, y0, { r: 5, color: C('danger') });
        p.dot(x0 + h, y1, { r: 5, color: C('warn') });
        p.text(x0 + h + 0.06, y1, '动点', { color: C('warn'), size: 11 });
        p.text(-0.35, 5.9, '切线', { color: C('danger'), size: 11 });
      },
      readout: (h) => `间距 ${texHTML('h=' + f4(h))}：割线斜率 ${texHTML('\\dfrac{f(1+h)-f(1)}{h}=2+h=' + f4(2 + h))}，切线斜率恒为 ${texHTML('2')}。<br>` +
        `把 h 拖到接近 0，割线斜率就挤到 2。注意整个过程里 ${texHTML('h\\neq 0')}，导数是取极限而不是代入 0。`,
      figureHint: '橙线是割线、红色虚线是切线；两者的斜率差正好等于 h。'
    });
  },

  'derivative-rules': function (el) {
    const f = x => Math.pow(x * x + 1, 2) / 8;
    const d = x => x * (x * x + 1) / 2;
    DemoPresets.sliderCurve(el, {
      range: [-2, 2, -1, 7], boxH: 380, fill: true,
      slider: { label: '观察点', min: -0.9, max: 1.6, step: 0.01, init: 0.8 },
      hint: '拖动观察点，比较橙色切线斜率与绿线读数',
      curves: [
        { fn: f, color: 'accent', width: 2.6 },
        { fn: d, color: 'ok', width: 2.2 }
      ],
      dynamic: (p, v, C) => {
        const k = d(v), y = f(v);
        p.line(-2, k * (-2 - v) + y, 2, k * (2 - v) + y, { color: C('warn'), width: 1.8 });
        p.dot(v, y, { r: 5, color: C('warn') });
        p.dot(v, k, { r: 5, color: C('danger') });
        p.text(v + 0.08, y + 0.35, '切点', { color: C('warn'), size: 11 });
      },
      readout: (v) => `在 ${texHTML('x_0=' + f4(v))} 处：导函数读数 ${texHTML("f'(x_0)=" + f4(d(v)))}，橙色切线斜率也是 ${texHTML(f4(d(v)))}。<br>` +
        `法则给出的 ${texHTML("f'(x)=\\dfrac{x(x^{2}+1)}{2}")} 与定义给出的切线斜率处处相等，这就是链式法则的验证。`,
      figureHint: '绿线是导函数；红点落在绿线上，它的纵坐标就是该点切线斜率。'
    });
  },

  'higher-derivatives': function (el) {
    const f = x => x * x * x - 3 * x * x;
    const d1 = x => 3 * x * x - 6 * x;
    const d2 = x => 6 * x - 6;
    DemoPresets.sliderCurve(el, {
      range: [-1, 2.2, -5, 8], boxH: 400, fill: true,
      slider: { label: '观察点', min: 0.2, max: 2, step: 0.01, init: 0.5 },
      hint: '看绿线过零处与橙线过零处分别对应蓝线的什么变化',
      curves: [
        { fn: f, color: 'accent', width: 2.6 },
        { fn: d1, color: 'ok', width: 2.0 },
        { fn: d2, color: 'warn', width: 2.0 }
      ],
      marks: [{ type: 'hline', y: 0, color: 'axis' }],
      dynamic: (p, v, C) => {
        p.line(v, -5, v, 8, { color: C('cyan'), dash: true, width: 1.2 });
        p.dot(v, f(v), { r: 4, color: C('accent') });
        p.dot(v, d1(v), { r: 4, color: C('ok') });
        p.dot(v, d2(v), { r: 4, color: C('warn') });
      },
      readout: (v) => `在 ${texHTML('x=' + f4(v))} 处：${texHTML('f=' + f4(f(v)))}　${texHTML("f'=" + f4(d1(v)))}　${texHTML("f''=" + f4(d2(v)))}。<br>` +
        `${texHTML("f''<0")} 表示斜率正在减小，${texHTML("f''>0")} 表示斜率正在增大；${texHTML("f''=0")} 只说明斜率此刻不变。`,
      figureHint: '三条曲线共用同一条竖线：蓝线的值、绿线的斜率、橙线的斜率变化率。'
    });
  },

  'implicit-and-parametric': function (el) {
    const X = t => t * t - 1, Y = t => t * t * t - t;
    const dX = t => 2 * t, dY = t => 3 * t * t - 1;
    DemoPresets.custom(el, {
      range: [-2.5, 2.5, -2.5, 2.5], boxH: 380,
      slider: { label: '参数', min: -1.2, max: 1.2, step: 0.01, init: 1.0 },
      figureHint: '把 t 拖到 0 附近，观察读数里关于分母为零的提示。',
      draw: (p, out, t, c, C) => {
        let prev = null;
        for (let i = 0; i <= 400; i++) {
          const u = -1.9 + 3.8 * i / 400, q = [X(u), Y(u)];
          if (prev) p.line(prev[0], prev[1], q[0], q[1], { color: C('accent'), width: 2.4 });
          prev = q;
        }
        const k = dY(t) / dX(t);
        if (Number.isFinite(k)) {
          p.line(-2.4, k * (-2.4 - X(t)) + Y(t), 2.4, k * (2.4 - X(t)) + Y(t),
            { color: C('warn'), width: 1.8 });
        }
        p.dot(X(t), Y(t), { r: 5, color: C('danger') });
        const ok = Math.abs(dX(t)) > 1e-6;
        out.innerHTML = `${texHTML('t=' + f4(t))}：${texHTML('\\mathrm{d}x/\\mathrm{d}t=' + f4(dX(t)))}，${texHTML('\\mathrm{d}y/\\mathrm{d}t=' + f4(dY(t)))}<br>` +
          (ok
            ? `因为分母不为零，可用 ${texHTML('\\dfrac{\\mathrm{d}y}{\\mathrm{d}x}=\\dfrac{3t^{2}-1}{2t}=' + f4(k))}，橙色短线就是该点切线。`
            : `此时 ${texHTML('\\mathrm{d}x/\\mathrm{d}t=0')}，参数方程公式的分母为零，不能相除；曲线在该点仍有走向，需另作讨论。`);
      }
    });
  },

  'related-rates': function (el) {
    const r = t => 2 + 0.2 * t, h = t => 5 - 0.1 * t;
    const dr = 0.2, dh = -0.1;
    DemoPresets.sliderCurve(el, {
      range: [0, 8, 0, 6], boxH: 360,
      slider: { label: '时刻', min: 0, max: 8, step: 0.05, init: 0 },
      hint: '半径与高度同时变化，体积变化率是两项之和',
      curves: [
        { fn: r, color: 'accent', width: 2.4 },
        { fn: h, color: 'ok', width: 2.4 }
      ],
      dynamic: (p, t, C) => {
        p.line(t, 0, t, 6, { color: C('cyan'), dash: true, width: 1.2 });
        p.dot(t, r(t), { r: 5, color: C('accent') });
        p.dot(t, h(t), { r: 5, color: C('ok') });
      },
      readout: (t) => {
        const A = 2 * r(t) * dr * h(t), B = r(t) * r(t) * dh;
        return `在 ${texHTML('t=' + f4(t))} 时：${texHTML('r=' + f4(r(t)))}、${texHTML('h=' + f4(h(t)))}。<br>` +
          `${texHTML('2rh\\,\\mathrm{d}r/\\mathrm{d}t=' + f4(A))}（半径增大，正贡献），${texHTML('r^{2}\\,\\mathrm{d}h/\\mathrm{d}t=' + f4(B))}（高度减小，负贡献）。<br>` +
          `合计 ${texHTML('\\dfrac{\\mathrm{d}V}{\\mathrm{d}t}=\\pi(' + f4(A) + f4(B) + ')=' + f4(Math.PI * (A + B)))}。`;
      },
      figureHint: '两条变化率一正一负，必须分别算出再相加。'
    });
  },

  'linear-approx': function (el) {
    const f = x => Math.sqrt(x), x0 = 4;
    DemoPresets.sliderCurve(el, {
      range: [3, 5.5, 1.5, 2.6], boxH: 360,
      slider: { label: '增量', min: 0, max: 0.5, step: 0.005, init: 0.08 },
      hint: '把增量拖小，比较近似值与真实值',
      curves: [
        { fn: f, color: 'accent', width: 2.6 },
        { fn: x => 2 + (x - 4) / 4, color: 'danger', dash: true, width: 1.8 }
      ],
      dynamic: (p, dx, C) => {
        const x = x0 + dx;
        p.line(x, 1.5, x, f(x), { color: C('cyan'), dash: true, width: 1.2 });
        p.dot(x, f(x), { r: 5, color: C('accent') });
        p.dot(x, 2 + dx / 4, { r: 5, color: C('warn') });
      },
      readout: (dx) => {
        const real = f(x0 + dx), approx = 2 + dx / 4;
        return `${texHTML('\\Delta x=' + f4(dx))}：微分给出 ${texHTML('\\mathrm{d}y=\\dfrac{\\Delta x}{4}=' + f4(dx / 4))}，近似值 ${texHTML(f4(approx))}，真实值 ${texHTML(f4(real))}。<br>` +
          `误差 ${texHTML(f4(Math.abs(real - approx)))}；把 ${texHTML('\\Delta x')} 缩小 10 倍，误差大约缩小 100 倍，因为丢掉的是 ${texHTML('o(\\Delta x)')}。`;
      },
      figureHint: '红点是切线给出的近似，蓝点是曲线上的真实值；两点几乎重合。'
    });
  }
};

mountDemos(DEMOS);

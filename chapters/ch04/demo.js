/* 第 04 章 · 原创交互演示
   绘图与外壳复用 assets/js/plot.js、demo-kit.js、demo-presets.js；
   等比例、缩放平移、KaTeX 读数均由组件层统一保证。*/

const DEMOS = {
  'antiderivative-family': function (el) {
    const f = x => x * x - 2 * x + 1;
    const F = x => x * x * x / 3 - x * x + x;
    DemoPresets.sliderCurve(el, {
      range: [-1, 3, -4.6, 5.2], boxH: 360, fill: true,
      slider: { label: '常数', min: -1, max: 1, step: 0.05, init: 0 },
      hint: '拖动常数，看整族曲线一起上下平移',
      curves: [
        { fn: (x, v) => F(x) + v - 1, color: 'cyan', width: 1.8 },
        { fn: (x, v) => F(x) + v, color: 'accent', width: 2.6 },
        { fn: (x, v) => F(x) + v + 1, color: 'ok', width: 1.8 }
      ],
      dynamic: (p, v, C) => {
        const x0 = 1.5, k = f(x0);
        [-1, 0, 1].forEach(d => {
          const y = F(x0) + v + d;
          p.line(x0 - 0.7, y - 0.7 * k, x0 + 0.7, y + 0.7 * k,
            { color: C(d === 0 ? 'danger' : 'axis'), width: 1.4, dash: true });
        });
        p.text(1.8, 3.4, '切线互相平行', { color: C('text'), size: 11 });
      },
      readout: (v) => `常数 ${texHTML('C=' + f4(v))}：三条曲线在同一横坐标处的切线斜率都是 ${texHTML('f(x)=x^{2}-2x+1')}。<br>` +
        `求导会把常数抹掉，所以 ${texHTML('\\int f\\,\\mathrm{d}x=F(x)+C')} 是<b>一族</b>函数，不是单个函数。`,
      figureHint: '三条曲线形状完全相同，只是竖直位置不同；虚线切线始终平行。'
    });
  },

  'substitution-flow': function (el) {
    const den = x => x * x + x + 3;
    const g = x => (2 * x + 1) / den(x);
    const G = x => Math.log(den(x));
    DemoPresets.sliderCurve(el, {
      range: [-2, 3, -1.5, 3], boxH: 360,
      slider: { label: '观察点', min: -1.5, max: 2.5, step: 0.01, init: 0.5 },
      hint: '分子恰好是分母的导数，凑微分可一步完成',
      curves: [
        { fn: g, color: 'accent', width: 2.4 },
        { fn: G, color: 'ok', width: 2.4 }
      ],
      dynamic: (p, v, C) => {
        p.line(v, -1.5, v, 3, { color: C('cyan'), dash: true, width: 1.2 });
        p.dot(v, g(v), { r: 5, color: C('accent') });
        p.dot(v, G(v), { r: 5, color: C('ok') });
      },
      readout: (v) => `在 ${texHTML('x=' + f4(v))} 处：分母 ${texHTML('x^{2}+x+3=' + f4(den(v)))}，其导数 ${texHTML('2x+1=' + f4(2 * v + 1))} 正是分子。<br>` +
        `判别式 ${texHTML('1-12=-11<0')}，真数恒正，故 ${texHTML('\\int\\frac{2x+1}{x^{2}+x+3}\\,\\mathrm{d}x=\\ln(x^{2}+x+3)+C')}，无需绝对值。`,
      figureHint: '绿线是蓝线的原函数；把分子凑成微分时，先确认真数恒正。'
    });
  },

  'parts-visual': function (el) {
    DemoPresets.custom(el, {
      range: [0, 2.2, 0, 4.6], boxH: 380, fill: true,
      slider: { label: '终点', min: 0.4, max: 2, step: 0.01, init: 1.4 },
      figureHint: '矩形面积被曲线分成两块：曲线下方那块对应曲线与横轴围出的面积，剩下那块是矩形扣除它后的部分，两块相加正好等于整个矩形，对应分部积分公式。',
      draw: (p, out, u0, c, C) => {
        const v0 = u0 * u0;
        p.rect(0, 0, u0, v0, { fill: C('accent'), alpha: 0.10, stroke: C('accent') });
        const pts = [[0, 0]];
        for (let i = 0; i <= 80; i++) { const u = u0 * i / 80; pts.push([u, u * u]); }
        pts.push([u0, 0]);
        p.polygon(pts, { fill: C('cyan'), alpha: 0.30, stroke: C('cyan') });
        p.curve(u => u * u, { from: 0, to: u0, color: C('warn'), width: 2.4 });
        p.dot(u0, v0, { r: 5, color: C('danger') });
        p.text(u0 + 0.06, v0, '右上角', { color: C('danger'), size: 11 });
        const A = Math.pow(u0, 3) / 3, B = 2 * Math.pow(u0, 3) / 3;
        out.innerHTML = `取 ${texHTML('v=u^{2}')}，矩形面积 ${texHTML('u_0v_0=' + f4(u0 * v0))}。<br>` +
          `曲线下方 ${texHTML('\\int_{0}^{u_0}v\\,\\mathrm{d}u=' + f4(A))}，剩余 ${texHTML('\\int_{0}^{v_0}u\\,\\mathrm{d}v=' + f4(B))}，两者之和 ${texHTML(f4(A + B))} 恰等于矩形面积。<br>` +
          `这正是 ${texHTML('uv=\\int u\\,\\mathrm{d}v+\\int v\\,\\mathrm{d}u')}，移项即得分部积分公式。`;
      }
    });
  },

  'rational-integration': function (el) {
    const den = x => x * x + 2 * x + 2;
    const g = x => (2 * x + 3) / den(x);
    const G = x => Math.log(den(x)) + Math.atan(x + 1);
    DemoPresets.sliderCurve(el, {
      range: [-3, 2, -2, 4], boxH: 360, fill: true,
      slider: { label: '观察点', min: -2.5, max: 1.5, step: 0.01, init: 0 },
      hint: '分母配方后，分子拆成两份',
      curves: [
        { fn: g, color: 'accent', width: 2.4 },
        { fn: G, color: 'ok', width: 2.4 }
      ],
      dynamic: (p, v, C) => {
        p.line(v, -2, v, 4, { color: C('cyan'), dash: true, width: 1.2 });
        p.dot(v, g(v), { r: 5, color: C('accent') });
        p.dot(v, G(v), { r: 5, color: C('ok') });
      },
      readout: () => `配方 ${texHTML('x^{2}+2x+2=(x+1)^{2}+1')}，判别式为负、恒大于 0。<br>` +
        `分子拆成 ${texHTML('2x+3=(2x+2)+1')}：第一份是分母导数，积出 ${texHTML('\\ln(x^{2}+2x+2)')}；第二份配方后查反正切，积出 ${texHTML('\\arctan(x+1)')}。<br>` +
        `故 ${texHTML('\\int\\frac{2x+3}{x^{2}+2x+2}\\,\\mathrm{d}x=\\ln(x^{2}+2x+2)+\\arctan(x+1)+C')}。`,
      figureHint: '绿线是蓝线的原函数，两个来源分别对应分子拆开的两份。'
    });
  },

  'integral-table': function (el) {
    let step = 0;
    const texts = [
      `① 认出形式：被积函数 ${texHTML('\\dfrac{1}{x^{2}+4x+5}')} 分母是二次式，但表里要求 ${texHTML('u^{2}+a^{2}')}，直接对不上号。`,
      `② 配方：${texHTML('x^{2}+4x+5=(x+2)^{2}+1=(x+2)^{2}+1^{2}')}，标准形状出现了。`,
      `③ 换元查表：令 ${texHTML('u=x+2')}、${texHTML('a=1')}，由 ${texHTML('\\int\\dfrac{\\mathrm{d}u}{u^{2}+a^{2}}=\\dfrac{1}{a}\\arctan\\dfrac{u}{a}+C')} 得 ${texHTML('\\arctan(x+2)+C')}。`,
      `④ 求导验算：${texHTML('\\bigl(\\arctan(x+2)\\bigr)\'=\\dfrac{1}{1+(x+2)^{2}}=\\dfrac{1}{x^{2}+4x+5}')}，回到原式，结果正确。`
    ];
    DemoPresets.custom(el, {
      range: [-4, 2, 0, 1.2], boxH: 320,
      controlsHTML: '<span class="hint">逐个点按步骤，看查表公式怎么落到本题</span>',
      buttons: [
        { label: '① 认出形式', run: () => { step = 0; } },
        { label: '② 配方', run: () => { step = 1; } },
        { label: '③ 换元查表', run: () => { step = 2; } },
        { label: '④ 求导验算', run: () => { step = 3; } }
      ],
      draw: (p, out, v, c, C) => {
        p.curve(x => 1 / (x * x + 4 * x + 5), { color: C('accent'), width: 2.6 });
        p.line(-2, 0, -2, 1.2, { color: C(step >= 1 ? 'warn' : 'axis'), dash: true, width: 1.4 });
        if (step >= 1) p.text(-1.9, 1.05, '对称轴', { color: C('warn'), size: 11 });
        if (step >= 2) p.dot(-2, 1, { r: 5, color: C('danger') });
        out.innerHTML = texts[step] + `<br><span class="hint">第 ${step + 1} 步 / 共 4 步</span>`;
      }
    });
  }
};

mountDemos(DEMOS);

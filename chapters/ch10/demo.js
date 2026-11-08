/* 第 10 章 · 原创交互演示
   绘图与外壳复用 assets/js/plot.js、demo-kit.js、demo-presets.js；
   等比例、缩放平移、KaTeX 读数均由组件层统一保证。*/

const DEMOS = {
  'double-integral-volume': function (el) {
    const f = (x, y) => 4 - x * x - y * y;   // 在 [0,1]^2 上恒 >= 2 > 0
    DemoPresets.custom(el, {
      range: [-0.15, 1.2, -0.15, 1.25], boxH: 380,
      slider: { label: '等分数', min: 1, max: 16, step: 1, init: 4 },
      controlsHTML: '<span class="hint">拖动等分数，看细柱体积和怎样逼近精确体积</span>',
      figureHint: '这是三维曲顶柱体的俯视投影：每个小格代表一根竖立的细柱，底色越深柱越高；真实体积没有画出，读数里的和才是它。',
      draw: (p, out, v, c, C) => {
        const n = Math.max(1, Math.round(v)), cell = 1 / n;
        p.rect(0, 0, 1, 1, { fill: C('accent'), alpha: 0.04, stroke: C('text') });
        let sum = 0;
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            const x0 = i * cell, y0 = j * cell;
            const xc = x0 + cell / 2, yc = y0 + cell / 2;
            const h = f(xc, yc);
            sum += h * cell * cell;
            p.rect(x0, y0, x0 + cell, y0 + cell,
              { fill: C('cyan'), alpha: 0.12 + 0.55 * (h / 4), stroke: C('accent') });
          }
        }
        p.text(0.02, 1.12, '底面俯视：颜色越深柱越高', { size: 11, color: C('text') });
        out.innerHTML = `细分 ${texHTML('n\\times n=' + n + '\\times' + n)}：每格面积 ${texHTML('\\Delta\\sigma=1/n^{2}')}，柱高取中心处的 ${texHTML('f=4-x^{2}-y^{2}')}（在底面上恒为正）。<br>` +
          `细柱体积和 ${texHTML('V_n=\\sum f\\,\\Delta\\sigma=' + f4(sum))}，精确体积 ${texHTML('V=\\iint_D(4-x^{2}-y^{2})\\,\\mathrm{d}\\sigma=\\frac{10}{3}\\approx' + f4(10 / 3))}。`;
      }
    });
  },

  'order-switch': function (el) {
    let order = 0; // 0 竖向穿线（先 y 后 x），1 横向穿线（先 x 后 y）
    DemoPresets.custom(el, {
      range: [-0.1, 1.2, -0.1, 1.2], boxH: 380,
      slider: { label: '扫描位置', min: 0.03, max: 0.97, step: 0.01, init: 0.5 },
      controlsHTML: '<span class="hint">切换两种穿线方向，拖动扫描位置看内层上下限</span>',
      buttons: [
        { label: '竖向穿线', run: () => { order = 0; } },
        { label: '横向穿线', run: () => { order = 1; } }
      ],
      figureHint: '竖向穿线对应「先对纵轴变量积分」，横向穿线对应「先对横轴变量积分」；两条扫描线给出的上下限不同，但总积分值相同。',
      draw: (p, out, t, c, C) => {
        for (let i = 0; i < 60; i++) {
          const x0 = i / 60, x1 = (i + 1) / 60;
          p.rect(x0, Math.pow(x0, 3), x1, 1, { fill: C('cyan'), alpha: 0.20 });
        }
        p.curve(x => Math.pow(x, 3), { from: 0, to: 1, color: C('accent'), width: 2.4 });
        p.line(0, 1, 1, 1, { color: C('ok'), width: 2.2 });
        p.line(0, 0, 0, 1, { color: C('ok'), width: 2.2 });
        p.text(0.62, 0.16, '下边界', { size: 10, color: C('accent') });
        p.text(0.62, 1.07, '上边界', { size: 10, color: C('ok') });
        if (order === 0) {
          const yb = Math.pow(t, 3);
          p.line(t, yb, t, 1, { color: C('warn'), width: 2.6 });
          p.dot(t, yb, { r: 5, color: C('danger') });
          p.dot(t, 1, { r: 5, color: C('danger') });
          p.text(t + 0.02, (yb + 1) / 2, '竖向穿线', { size: 10, color: C('warn') });
          out.innerHTML = `竖向穿线：固定 ${texHTML('x=' + f4(t))}，从 ${texHTML('y=x^{3}=' + f4(yb))} 穿入、从 ${texHTML('y=1')} 穿出。<br>` +
            `先对 ${texHTML('y')} 积分 ${texHTML('\\int_{x^{3}}^{1}3x^{2}\\,\\mathrm{d}y=3x^{2}(1-x^{3})')}，再对 ${texHTML('x')} 积分；总值 ${texHTML('I=\\frac{1}{2}')}。`;
        } else {
          const xb = Math.cbrt(t);
          p.line(0, t, xb, t, { color: C('warn'), width: 2.6 });
          p.dot(0, t, { r: 5, color: C('danger') });
          p.dot(xb, t, { r: 5, color: C('danger') });
          p.text(xb / 2, t + 0.06, '横向穿线', { size: 10, color: C('warn') });
          out.innerHTML = `横向穿线：固定 ${texHTML('y=' + f4(t))}，从 ${texHTML('x=0')} 穿入、从 ${texHTML('x=\\sqrt[3]{y}=' + f4(xb))} 穿出。<br>` +
            `先对 ${texHTML('x')} 积分 ${texHTML('\\int_0^{\\sqrt[3]{y}}3x^{2}\\,\\mathrm{d}x=y')}，再对 ${texHTML('y')} 积分；总值仍是 ${texHTML('I=\\frac{1}{2}')}。`;
        }
      }
    });
  },

  'polar-jacobian': function (el) {
    const dth = 0.8; // 固定张角（弧度）
    DemoPresets.twoSliders(el, {
      range: [-0.2, 3.7, -0.2, 3.7], boxH: 400,
      sliders: [
        { label: '半径', min: 0.3, max: 2.6, step: 0.05, init: 1.2 },
        { label: '径向厚度', min: 0.02, max: 0.8, step: 0.01, init: 0.3 }
      ],
      hint: '把径向厚度拖小，看扇环面积怎样贴近拉直后的矩形',
      figureHint: '彩色扇环是极坐标网格里的一格；拉直后长约为半径乘张角、宽为径向厚度，这就是因子 r 的来历。',
      dynamic: (p, r, dr, C) => {
        const outer = [], inner = [], N = 40;
        for (let i = 0; i <= N; i++) {
          const a = dth * i / N;
          outer.push([(r + dr) * Math.cos(a), (r + dr) * Math.sin(a)]);
          inner.push([r * Math.cos(a), r * Math.sin(a)]);
        }
        const pts = outer.concat(inner.slice().reverse());
        p.polygon(pts, { fill: C('cyan'), alpha: 0.30, color: C('accent'), width: 2 });
        p.line(r, 0, r + dr, 0, { color: C('warn'), width: 2 });
        p.dot(r + dr / 2, (r + dr / 2) * Math.sin(dth / 2), { r: 4, color: C('danger') });
        // 标签原来按 0.6 倍半径摆，被拉进了扇形内部；改标在真实内弧中点稍外侧
        p.text(r * Math.cos(dth / 2), r * Math.sin(dth / 2) - 0.14, '内弧', { size: 10, color: C('text') });
        p.text((r + dr) * Math.cos(dth / 2), (r + dr) * Math.sin(dth / 2) + 0.12, '外弧', { size: 10, color: C('text') });
      },
      readout: (r, dr) => {
        const exact = ((r + dr) * (r + dr) - r * r) * dth / 2;
        const approx = r * dr * dth;
        const err = exact > 0 ? (exact - approx) / exact : 0;
        return `半径 ${texHTML('r=' + f4(r))}、径向厚度 ${texHTML('\\Delta r=' + f4(dr))}、张角固定 ${texHTML('\\Delta\\theta=' + f4(dth))}（弧度）。<br>` +
          `扇环精确面积 ${texHTML('\\tfrac{1}{2}\\bigl[(r+\\Delta r)^{2}-r^{2}\\bigr]\\Delta\\theta=' + f4(exact))}，拉直近似 ${texHTML('r\\,\\Delta r\\,\\Delta\\theta=' + f4(approx))}，相对误差 ${texHTML(f4(err * 100) + '\\%')}。<br>` +
          `把径向厚度拖小，误差随之消失，于是 ${texHTML('\\mathrm{d}\\sigma=r\\,\\mathrm{d}r\\,\\mathrm{d}\\theta')}；柱面坐标里 ${texHTML('\\mathrm{d}V=r\\,\\mathrm{d}r\\,\\mathrm{d}\\theta\\,\\mathrm{d}z')}。`;
      }
    });
  },

  'triple-integral': function (el) {
    const A = z => Math.pow(2 - z, 2);   // 高度 z 处截面积，非负
    DemoPresets.riemann(el, {
      range: [0, 2.2, -0.2, 4.5], boxH: 380,
      equal: false, aspectNote: '横轴是高度（长度），纵轴是截面积（长度平方），两轴量纲不同',
      a: 0, b: 2, fn: A, maxN: 40, initN: 6,
      hint: '拖动等分数，看各层薄片体积之和怎样逼近锥体体积',
      figureHint: '曲线是高度 z 处的截面积，每个矩形是那一层的薄片；这是截面法的一维投影，三维锥体未画出，矩形面积和就是它的体积。',
      dynamic: (p, n) => {
        p.text(0.9, 4.25, '截面积曲线', { size: 10 });
      },
      readout: (n, sum) => {
        return `等分 ${texHTML('n=' + n)}：每层厚 ${texHTML('\\Delta z=2/n=' + f4(2 / n))}，薄片体积 ${texHTML('A(z_i)\\Delta z=(2-z_i)^{2}\\Delta z')}。<br>` +
          `累加 ${texHTML('V_n=\\sum A(z_i)\\Delta z=' + f4(sum))}，精确体积 ${texHTML('V=\\int_0^{2}(2-z)^{2}\\,\\mathrm{d}z=\\frac{8}{3}\\approx' + f4(8 / 3))}。`;
      }
    });
  },

  'parametric-integral': function (el) {
    const f = (x, t) => x + t;
    DemoPresets.sliderCurve(el, {
      range: [0, 2.8, -0.2, 3.9], boxH: 380, fill: true,
      slider: { label: '参数', min: 0.2, max: 1, step: 0.01, init: 0.6 },
      hint: '拖动参数，盯住两条移动的上下限与读数里的三项',
      curves: [{ fn: (x, t) => f(x, t), color: 'accent', width: 2.4, from: 0, to: 2.6 }],
      dynamic: (p, t, C) => {
        const N = 44;
        for (let i = 0; i < N; i++) {
          const x0 = t + t * i / N, x1 = t + t * (i + 1) / N;
          const h = f((x0 + x1) / 2, t);
          p.rect(x0, 0, x1, h, { fill: C('cyan'), alpha: 0.24 });
        }
        p.line(t, 0, t, f(t, t), { color: C('warn'), dash: true, width: 1.8 });
        p.line(2 * t, 0, 2 * t, f(2 * t, t), { color: C('warn'), dash: true, width: 1.8 });
        p.dot(t, f(t, t), { r: 5, color: C('danger') });
        p.dot(2 * t, f(2 * t, t), { r: 5, color: C('danger') });
        p.text(t - 0.12, 0.15, '下限', { size: 10, color: C('warn') });
        p.text(2 * t + 0.02, 0.15, '上限', { size: 10, color: C('warn') });
      },
      readout: (t) => {
        const G = 2.5 * t * t;
        return `参数 ${texHTML('t=' + f4(t))}：积分区间 ${texHTML('[t,2t]=[' + f4(t) + ',' + f4(2 * t) + ']')} 与被积函数一起变化。<br>` +
          `${texHTML('G(t)=\\int_t^{2t}(x+t)\\,\\mathrm{d}x=\\frac{5}{2}t^{2}=' + f4(G))}，莱布尼茨给出 ${texHTML("G'(t)=t+6t-2t=5t=" + f4(5 * t))}。<br>` +
          `三项依次是：积分号内 ${texHTML('\\int_t^{2t}1\\,\\mathrm{d}x=t')}、上限 ${texHTML('(2t+t)\\cdot 2=6t')}、下限 ${texHTML('-(t+t)\\cdot 1=-2t')}；漏掉后两项只剩 ${texHTML('t')}。`;
      },
      figureHint: '两条橙色虚线是随参数移动的积分上下限；拖动参数时被积函数与积分区间同时改变，求导要把三处贡献都算上。'
    });
  }
};

mountDemos(DEMOS);

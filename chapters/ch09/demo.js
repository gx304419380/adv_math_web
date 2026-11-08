/* 第 09 章 · 原创交互演示
   绘图与外壳复用 assets/js/plot.js、demo-kit.js、demo-presets.js；
   等比例、缩放平移、KaTeX 读数均由组件层统一保证。*/

const DEMOS = {
  'surface-and-levelset': function (el) {
    DemoPresets.custom(el, {
      range: [-3, 3, -2.2, 2.2], boxH: 380,
      slider: { label: '等高值', min: 0.5, max: 6, step: 0.05, init: 2 },
      controlsHTML: '<span class="hint">拖动等高值，看椭圆一圈圈放大</span>',
      figureHint: '图里是曲面水平截线在平面上的投影，是二维投影图，不是曲面本身。',
      draw: (p, out, cv, c, C) => {
        const ellipse = (k, color, width) => {
          const rx = Math.sqrt(k), ry = Math.sqrt(k / 2);
          let prev = null;
          for (let i = 0; i <= 160; i++) {
            const th = 2 * Math.PI * i / 160;
            const q = [rx * Math.cos(th), ry * Math.sin(th)];
            if (prev) p.line(prev[0], prev[1], q[0], q[1], { color: color, width: width });
            prev = q;
          }
        };
        [1, 2, 3, 4, 5].forEach(k => ellipse(k, C('axis'), 1.1));
        ellipse(cv, C('accent'), 2.6);
        const x0 = Math.sqrt(cv);
        p.line(0, 0, x0, 0, { color: C('warn'), width: 1.6, dash: true });
        p.dot(x0, 0, { r: 5, color: C('danger') });
        p.text(x0 + 0.08, 0.18, '等高线上的点', { color: C('danger'), size: 11 });
        p.text(-2.8, 1.9, '等高线', { color: C('accent'), size: 11 });
        out.innerHTML = `函数 ${texHTML('f(x,y)=x^{2}+2y^{2}')}，等值线方程 ${texHTML('x^{2}+2y^{2}=' + f4(cv))}。<br>` +
          `红点 ${texHTML('(\\sqrt{' + f4(cv) + '},0)')} 落在这条等高线上；沿它走一圈，${texHTML('f')} 始终等于 ${texHTML(f4(cv))}。<br>` +
          `定义域是整个 ${texHTML('\\mathbb{R}^{2}')}；只有换到另一圈等高线，函数值才改变。`;
      }
    });
  },

  'partial-slices': function (el) {
    const fx = a => a, fy = a => a - 1 / 2;
    DemoPresets.sliderCurve(el, {
      range: [-0.5, 2.2, -1.7, 3.6], boxH: 380, fill: true,
      slider: { label: '固定坐标', min: 0.5, max: 1.5, step: 0.01, init: 1.0 },
      hint: '拖动固定坐标，比较两条切片在交点处的切线斜率',
      curves: [
        { fn: (t, a) => t * t / 4 + a * t / 2 - a / 2 + a * a / 4, color: 'accent', width: 2.6 },
        { fn: (t, a) => t * t / 4 + (a - 1) * t / 2 + a * a / 4, color: 'ok', width: 2.2 }
      ],
      marks: [{ type: 'hline', y: 0, color: 'axis' }],
      dynamic: (p, a, C) => {
        const y0 = a * a - a / 2;
        p.line(a - 0.45, y0 - 0.45 * fx(a), a + 0.45, y0 + 0.45 * fx(a), { color: C('warn'), width: 1.8 });
        p.line(a - 0.45, y0 - 0.45 * fy(a), a + 0.45, y0 + 0.45 * fy(a), { color: C('cyan'), width: 1.8, dash: true });
        p.dot(a, y0, { r: 5, color: C('danger') });
        p.text(a + 0.06, y0 + 0.22, '公共点', { color: C('danger'), size: 11 });
      },
      readout: (a) => `固定坐标 ${texHTML('a=' + f4(a))}：两条切片都经过 ${texHTML('(a,\\,f(a,a))')}，公共纵坐标 ${texHTML('f(a,a)=' + f4(a * a - a / 2))}。<br>` +
        `沿 ${texHTML('x')} 方向的切线斜率 ${texHTML('f_x(a,a)=a=' + f4(fx(a)))}，沿 ${texHTML('y')} 方向的切线斜率 ${texHTML('f_y(a,a)=a-\\frac{1}{2}=' + f4(fy(a)))}。<br>` +
        `两条切线斜率一般不同，正说明「偏导数必须指明朝哪个方向」。`,
      figureHint: '蓝线是固定纵坐标为 a 的切片，绿线是固定横坐标为 a 的切片；橙、青短线是各自在公共点处的切线。'
    });
  },

  'total-differential': function (el) {
    let mode = 0;
    const dirs = [
      { name: '沿横轴', c: 1, s: 0 },
      { name: '沿 (3,4)', c: 0.6, s: 0.8 },
      { name: '沿对角', c: Math.SQRT1_2, s: Math.SQRT1_2 }
    ];
    const dz = (r, d) => Math.pow(1 + r * d.c, 2) * (2 + r * d.s) - 2;
    const lin = (r, d) => (4 * d.c + d.s) * r;
    DemoPresets.custom(el, {
      range: [-0.05, 1.2, -0.6, 8.4], boxH: 380, fill: true,
      slider: { label: '步长', min: 0.02, max: 1.0, step: 0.01, init: 0.4 },
      controlsHTML: '<span class="hint">选一个增量方向，再把步长拖小</span>',
      buttons: dirs.map((d, i) => ({ label: d.name, run: () => { mode = i; } })),
      figureHint: '把步长拖小，绿色误差除以步长一路趋于 0，这就是 o(ρ) 的含义。',
      draw: (p, out, r, c, C) => {
        const d = dirs[mode];
        p.curve(q => dz(q, d), { from: 0, to: 1.2, color: C('accent'), width: 2.6 });
        p.curve(q => lin(q, d), { from: 0, to: 1.2, color: C('warn'), width: 2.0, dash: true });
        p.curve(q => dz(q, d) - lin(q, d), { from: 0, to: 1.2, color: C('ok'), width: 2.0 });
        const D = dz(r, d), L = lin(r, d), E = D - L;
        p.dot(r, D, { r: 5, color: C('accent') });
        p.dot(r, L, { r: 4, color: C('warn') });
        p.dot(r, E, { r: 4, color: C('ok') });
        out.innerHTML = `方向：${d.name}，步长 ${texHTML('\\rho=' + f4(r))}，${texHTML('\\Delta x=' + f4(r * d.c))}、${texHTML('\\Delta y=' + f4(r * d.s))}。<br>` +
          `真实增量 ${texHTML('\\Delta z=' + f4(D))}，全微分 ${texHTML('\\mathrm{d}z=f_x\\Delta x+f_y\\Delta y=' + f4(L))}（这里 ${texHTML('f_x=4,\\,f_y=1')}）。<br>` +
          `误差 ${texHTML('\\Delta z-\\mathrm{d}z=' + f4(E))}，比值 ${texHTML('\\frac{\\Delta z-\\mathrm{d}z}{\\rho}=' + f4(E / r))}、${texHTML('\\frac{\\Delta z-\\mathrm{d}z}{\\rho^{2}}=' + f4(E / (r * r)))}；把 ${texHTML('\\rho')} 拖小，前一个比值趋于 0。`;
      }
    });
  },

  'chain-rule-tree': function (el) {
    let mode = 0;
    const nodes = [
      { id: 'top', x: 0, y: 1.9, label: '输出量' },
      { id: 'm1', x: -1.4, y: 0.5, label: '中间量一' },
      { id: 'm2', x: 1.4, y: 0.5, label: '中间量二' },
      { id: 'b1', x: -2.0, y: -1.2, label: '自变量一' },
      { id: 'b2', x: 2.0, y: -1.2, label: '自变量二' }
    ];
    const byId = {};
    nodes.forEach(n => { byId[n.id] = n; });
    const edges = [['top', 'm1'], ['top', 'm2'], ['m1', 'b1'], ['m1', 'b2'], ['m2', 'b1'], ['m2', 'b2']];
    DemoPresets.custom(el, {
      range: [-3, 3, -2, 2.6], boxH: 380,
      slider: { label: '第一个自变量的取值', min: 0, max: 2, step: 0.01, init: 1 },
      controlsHTML: '<span class="hint">点按钮切换要看的偏导数，亮色箭头就是必须相加的通路</span>',
      buttons: [
        { label: '看第一个自变量', run: () => { mode = 0; } },
        { label: '看第二个自变量', run: () => { mode = 1; } }
      ],
      figureHint: '从输出量到所选自变量共有两条通路，漏掉任意一条，偏导数就会少一块。',
      draw: (p, out, xv, c, C) => {
        edges.forEach(e => {
          const A = byId[e[0]], B = byId[e[1]];
          const on = (mode === 0 && B.id === 'b1') || (mode === 1 && B.id === 'b2');
          p.line(A.x, A.y, B.x, B.y, { color: on ? C('accent') : C('axis'), width: on ? 2.6 : 1.1, dash: !on });
        });
        nodes.forEach(n => {
          p.dot(n.x, n.y, { r: 7, color: C('text') });
          p.text(n.x + 0.1, n.y + 0.22, n.label, { color: C('text'), size: 11 });
        });
        const fu = 2 * xv + 4;
        if (mode === 0) {
          const t1 = fu * 1, t2 = 1 * 1;
          out.innerHTML = `看第一个自变量（记作 ${texHTML('x')}，另一个固定为 ${texHTML('y=1')}）：中间量一对应 ${texHTML('u=x+2')}，中间量二对应 ${texHTML('v=x')}。<br>` +
            `经中间量一的通路 ${texHTML('f_u\\,u_x=(2x+4)\\cdot 1=' + f4(t1))}，经中间量二的通路 ${texHTML('f_v\\,v_x=1\\cdot 1=' + f4(t2))}。<br>` +
            `相加得 ${texHTML('\\frac{\\partial z}{\\partial x}=2x+5=' + f4(t1 + t2))}，在 ${texHTML('x=' + f4(xv))} 处为 ${texHTML(f4(t1 + t2))}。`;
        } else {
          const t1 = fu * 2, t2 = 1 * xv;
          out.innerHTML = `看第二个自变量（记作 ${texHTML('y')}，点取在 ${texHTML('y=1')}，第一个自变量由滑块给出）：${texHTML('u_y=2')}、${texHTML('v_y=x')}。<br>` +
            `经中间量一的通路 ${texHTML('f_u\\,u_y=(2x+4)\\cdot 2=' + f4(t1))}，经中间量二的通路 ${texHTML('f_v\\,v_y=1\\cdot x=' + f4(t2))}。<br>` +
            `相加得 ${texHTML('\\frac{\\partial z}{\\partial y}=5x+8=' + f4(t1 + t2))}，在 ${texHTML('x=' + f4(xv))} 处为 ${texHTML(f4(t1 + t2))}。`;
        }
      }
    });
  },

  'implicit-partial': function (el) {
    let branch = 1;
    const upper = xx => Math.sqrt(Math.max(0, (3 - xx * xx) / 2));
    DemoPresets.custom(el, {
      range: [-2.2, 2.2, -1.8, 1.8], boxH: 380,
      slider: { label: '横坐标', min: -1.7, max: 1.7, step: 0.01, init: 0.8 },
      controlsHTML: '<span class="hint">切换上、下半支，把点推向椭圆最右端</span>',
      buttons: [
        { label: '上半支', run: () => { branch = 1; } },
        { label: '下半支', run: () => { branch = -1; } }
      ],
      figureHint: '点越靠近椭圆端点，F_y 越小、切线越陡；到端点处 F_y=0，公式失效。',
      draw: (p, out, x0, c, C) => {
        p.curve(xx => upper(xx), { from: -Math.sqrt(3), to: Math.sqrt(3), color: C('accent'), width: 2.4 });
        p.curve(xx => -upper(xx), { from: -Math.sqrt(3), to: Math.sqrt(3), color: C('accent'), width: 2.4 });
        const y0 = branch * upper(x0);
        const Fx = 2 * x0, Fy = 4 * y0;
        const slope = -Fx / Fy;
        const half = 0.5 / (1 + Math.abs(slope));
        p.line(x0 - half, y0 - half * slope, x0 + half, y0 + half * slope, { color: C('warn'), width: 2.2 });
        p.dot(x0, y0, { r: 5, color: C('danger') });
        p.text(1.35, 0.12, '端点附近', { color: C('text'), size: 11 });
        out.innerHTML = `方程 ${texHTML('F(x,y)=x^{2}+2y^{2}-3=0')}，当前点 ${texHTML('(' + f4(x0) + ',' + f4(y0) + ')')}。<br>` +
          `${texHTML('F_x=2x=' + f4(Fx))}，${texHTML('F_y=4y=' + f4(Fy))}；` +
          (Math.abs(Fy) > 1e-6
            ? `因为 ${texHTML('F_y\\neq 0')}，可用 ${texHTML('\\frac{\\mathrm{d}y}{\\mathrm{d}x}=-\\frac{F_x}{F_y}=' + f4(slope))}，橙色短线就是该点切线。`
            : `此时 ${texHTML('F_y=0')}，公式分母为零，曲线出现竖直切线，不能套用。`);
      }
    });
  },

  'tangent-plane': function (el) {
    const slice = (x, a) => x * x + 2 * a * a;
    const tangent = (x, a) => 2 * x + 2 * a * a - 1;
    DemoPresets.sliderCurve(el, {
      range: [-2.2, 2.2, -1, 8.5], boxH: 380, fill: true,
      slider: { label: '截面位置', min: 0, max: 1.2, step: 0.01, init: 1 },
      hint: '拖动截面位置，看截线与切平面截痕一起变',
      curves: [{ fn: slice, color: 'accent', width: 2.6 }],
      marks: [{ type: 'vline', x: 1, color: 'cyan' }],
      dynamic: (p, a, C) => {
        p.line(0.2, tangent(0.2, a), 2.0, tangent(2.0, a), { color: C('warn'), width: 2.2 });
        p.dot(1, slice(1, a), { r: 5, color: C('danger') });
        p.text(1.05, slice(1, a) + 0.3, '切点', { color: C('danger'), size: 11 });
      },
      readout: (a) => `截面 ${texHTML('y=' + f4(a))}：截线 ${texHTML('z=x^{2}+' + f4(2 * a * a))}，切点 ${texHTML('(1,' + f4(a) + ',' + f4(1 + 2 * a * a) + ')')}。<br>` +
        `曲面 ${texHTML('z=x^{2}+2y^{2}')} 在该点的切平面 ${texHTML('2x+4ay-z-1-2a^{2}=0')}（${texHTML('a=' + f4(a))}），由 ${texHTML('f_x=2')} 与 ${texHTML('f_y=4a=' + f4(4 * a))} 共同决定。<br>` +
        `橙色短线是切平面与截面 ${texHTML('y=' + f4(a))} 的交线，即截线在 ${texHTML('x=1')} 处的切线 ${texHTML('z=2x+' + f4(2 * a * a - 1))}。`,
      figureHint: '蓝线是曲面被竖直平面截出的截线；橙色短线是切平面在同一截面上的截痕，两条线在切点相切。'
    });
  },

  'gradient-field': function (el) {
    const gx = 2, gy = 2, norm = Math.hypot(gx, gy), P = [1, 0.5];
    DemoPresets.custom(el, {
      range: [-2, 2.5, -1.8, 2.2], boxH: 380,
      slider: { label: '方向角', min: 0, max: 6.28, step: 0.01, init: 0.8 },
      controlsHTML: '<span class="hint">转动方向箭头，比较方向导数与梯度方向</span>',
      figureHint: '梯度箭头垂直于等高线；方向箭头与梯度同向时方向导数最大，垂直时为 0。',
      draw: (p, out, ang, c, C) => {
        const ellipse = (k, color, width) => {
          const rx = Math.sqrt(k), ry = Math.sqrt(k / 2);
          let prev = null;
          for (let i = 0; i <= 160; i++) {
            const th = 2 * Math.PI * i / 160;
            const q = [rx * Math.cos(th), ry * Math.sin(th)];
            if (prev) p.line(prev[0], prev[1], q[0], q[1], { color: color, width: width });
            prev = q;
          }
        };
        const arrow = (dx, dy, color) => {
          const L = 1.15, ex = P[0] + L * dx, ey = P[1] + L * dy;
          p.line(P[0], P[1], ex, ey, { color: C(color), width: 2.4 });
          p.dot(ex, ey, { r: 4, color: C(color) });
        };
        [0.5, 1, 2, 2.5].forEach(k => ellipse(k, C('axis'), 1.1));
        ellipse(1.5, C('accent'), 2.2);
        arrow(gx / norm, gy / norm, 'ok');
        const ex = Math.cos(ang), ey = Math.sin(ang);
        arrow(ex, ey, 'danger');
        p.dot(P[0], P[1], { r: 5, color: C('text') });
        p.text(P[0] + 0.08, P[1] - 0.28, '观测点', { color: C('text'), size: 11 });
        p.text(0.55, 1.55, '梯度方向', { color: C('ok'), size: 11 });
        p.text(-1.7, -1.4, '等高线', { color: C('accent'), size: 11 });
        const D = gx * ex + gy * ey;
        out.innerHTML = `在 ${texHTML('(1,0.5)')} 处 ${texHTML('\\nabla f=(2x,4y)=(2,2)')}，模 ${texHTML('|\\nabla f|=' + f4(norm))}，方向角 ${texHTML('\\alpha=' + f4(ang))}。<br>` +
          `单位方向 ${texHTML('\\boldsymbol{e}_l=(\\cos\\alpha,\\sin\\alpha)=(' + f4(ex) + ',' + f4(ey) + ')')}。<br>` +
          `方向导数 ${texHTML('\\frac{\\partial f}{\\partial l}=\\nabla f\\cdot\\boldsymbol{e}_l=2\\cos\\alpha+2\\sin\\alpha=' + f4(D))}；最大 ${texHTML(f4(norm))}、最小 ${texHTML(f4(-norm))}、垂直时为 ${texHTML('0')}。`;
      }
    });
  },

  'multivar-extrema': function (el) {
    DemoPresets.sliderCurve(el, {
      range: [-1.2, 1.2, -3.2, 3.2], boxH: 380, fill: true,
      slider: { label: '二次项系数', min: -2, max: 2, step: 0.05, init: 1 },
      hint: '把系数拖过 0，观察三条截线开口方向的变化',
      curves: [
        { fn: (t, k) => t * t, color: 'accent', width: 2.4 },
        { fn: (t, k) => k * t * t, color: 'ok', width: 2.2 },
        { fn: (t, k) => (1 + k) / 2 * t * t, color: 'warn', width: 2.2 }
      ],
      marks: [{ type: 'hline', y: 0, color: 'axis' }],
      dynamic: (p, k, C) => {
        p.dot(1, 1, { r: 4, color: C('accent') });
        p.dot(1, k, { r: 4, color: C('ok') });
        p.dot(1, (1 + k) / 2, { r: 4, color: C('warn') });
        p.text(-1.1, 2.8, '三条过原点的截线', { color: C('text'), size: 11 });
      },
      readout: (k) => {
        const disc = 4 * k;
        let verdict;
        if (disc > 1e-9) verdict = `${texHTML('AC-B^{2}>0')} 且 ${texHTML('A>0')}，原点取极小值`;
        else if (disc < -1e-9) verdict = `${texHTML('AC-B^{2}<0')}，原点是鞍点、不是极值`;
        else verdict = `${texHTML('AC-B^{2}=0')}，二阶判别失效，需另判`;
        return `${texHTML('f(x,y)=x^{2}+' + f4(k) + 'y^{2}')}：${texHTML('A=2,\\,B=0,\\,C=' + f4(2 * k))}，${texHTML('AC-B^{2}=' + f4(disc))}。<br>` +
          `沿横轴 ${texHTML('t^{2}')}、沿纵轴 ${texHTML(f4(k) + 't^{2}')}、沿对角 ${texHTML(f4((1 + k) / 2) + 't^{2}')}；${verdict}。`;
      },
      figureHint: '三条截线开口都向上时是极小，出现一上一下就是鞍点；系数恰为 0 时判别式给不出结论。'
    });
  },

  'saddle-point': function (el) {
    let mode = 0;
    const cases = [
      { name: '鞍点', tex: 'f(x,y)=x^{2}-y^{2}', A: 2, B: 0, C: -2, ax: t => t * t, ay: t => -t * t, note: '二次项一正一负' },
      { name: '失效但极小', tex: 'f(x,y)=x^{2}+y^{4}', A: 2, B: 0, C: 0, ax: t => t * t, ay: t => Math.pow(t, 4), note: '四阶项仍非负' },
      { name: '失效且非极值', tex: 'f(x,y)=x^{2}+y^{3}', A: 2, B: 0, C: 0, ax: t => t * t, ay: t => Math.pow(t, 3), note: '三次项会变号' }
    ];
    DemoPresets.custom(el, {
      range: [-1.2, 1.2, -2.2, 2.5], boxH: 380, fill: true,
      slider: { label: '观察位置', min: -1, max: 1, step: 0.01, init: 0.6 },
      controlsHTML: '<span class="hint">点按钮切换三个函数，比较两条截线的形状</span>',
      buttons: cases.map((cs, i) => ({ label: cs.name, run: () => { mode = i; } })),
      figureHint: '一条截线开口向上、一条向下就是鞍点；判别式为零时两条截线可能都向上，也可能一条穿过横轴。',
      draw: (p, out, t0, c, C) => {
        const cs = cases[mode];
        p.curve(t => cs.ax(t), { from: -1.2, to: 1.2, color: C('accent'), width: 2.6 });
        p.curve(t => cs.ay(t), { from: -1.2, to: 1.2, color: C('warn'), width: 2.4 });
        p.line(-1.2, 0, 1.2, 0, { color: C('axis'), width: 1.2 });
        p.dot(t0, cs.ax(t0), { r: 5, color: C('accent') });
        p.dot(t0, cs.ay(t0), { r: 5, color: C('warn') });
        p.text(0.15, 2.2, '沿横轴截线', { color: C('accent'), size: 11 });
        p.text(0.15, -1.9, '沿纵轴截线', { color: C('warn'), size: 11 });
        const disc = cs.A * cs.C - cs.B * cs.B;
        let verdict;
        if (mode === 0) verdict = `${texHTML('AC-B^{2}=-4<0')}，原点不是极值（鞍点）`;
        else if (mode === 1) verdict = `${texHTML('AC-B^{2}=0')}，判别失效，但 ${texHTML('f\\geq 0')}，原点取极小值`;
        else verdict = `${texHTML('AC-B^{2}=0')}，判别失效，${texHTML('f')} 在原点附近变号，不取极值`;
        out.innerHTML = `函数 ${texHTML(cs.tex)}，${verdict}。<br>` +
          `沿横轴截线在 ${texHTML('t=' + f4(t0))} 处为 ${texHTML('f(t,0)=' + f4(cs.ax(t0)))}，沿纵轴截线 ${texHTML('f(0,t)=' + f4(cs.ay(t0)))}。<br>` +
          `判别式 ${texHTML('AC-B^{2}=' + f4(disc))}：${cs.note}，所以只看二阶项不足以定论。`;
      }
    });
  },

  'least-squares': function (el) {
    const pts = [[1, 2], [2, 4], [3, 5], [4, 7]];
    DemoPresets.twoSliders(el, {
      range: [0, 4.5, -1, 9.5], boxH: 380, fill: true,
      sliders: [
        { label: '斜率', min: 0.8, max: 1.8, step: 0.01, init: 1.1 },
        { label: '截距', min: -0.2, max: 1.0, step: 0.01, init: 0.8 }
      ],
      hint: '分别拖动斜率与截距，盯住残差平方和的变化',
      curves: [{ fn: (x, a, b) => a * x + b, color: 'accent', width: 2.4 }],
      dynamic: (p, a, b, C) => {
        pts.forEach(q => {
          const yl = a * q[0] + b;
          p.line(q[0], q[1], q[0], yl, { color: C('warn'), width: 1.6, dash: true });
          p.dot(q[0], q[1], { r: 5, color: C('danger') });
        });
        p.text(0.2, 8.6, '数据点', { color: C('danger'), size: 11 });
      },
      readout: (a, b) => {
        let S = 0, sr = 0, sxr = 0;
        const res = pts.map(q => {
          const e = q[1] - (a * q[0] + b);
          S += e * e; sr += e; sxr += q[0] * e;
          return e;
        });
        return `斜率 ${texHTML('a=' + f4(a))}、截距 ${texHTML('b=' + f4(b))}，残差平方和 ${texHTML('S(a,b)=' + f4(S))}。<br>` +
          `四个残差 ${texHTML('(' + res.map(f4).join(', ') + ')')}；和 ${texHTML('\\sum e_i=' + f4(sr))}、加权和 ${texHTML('\\sum x_ie_i=' + f4(sxr))}。<br>` +
          `正规方程 ${texHTML('30a+10b=53,\\quad 10a+4b=18')} 的解 ${texHTML('a=1.6,\\ b=0.5')} 给出 ${texHTML('S_{\\min}=0.2')}；把两个滑块拖到那里，两条和都变成 0。`;
      },
      figureHint: '橙色竖短线是各点的残差；S 最小时残差和与按横坐标加权的残差和同时为 0。'
    });
  }
};

mountDemos(DEMOS);

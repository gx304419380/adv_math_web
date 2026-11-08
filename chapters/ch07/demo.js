/* 第 07 章 · 原创交互演示
   绘图与外壳复用 assets/js/plot.js、demo-kit.js、demo-presets.js；
   等比例、缩放平移、KaTeX 读数均由组件层统一保证。*/

/* 第 07 章 · 10 个原创交互演示。方向场短线一律用 p.line 循环绘制；
   数学文字走 texHTML，画布内只放中文标注。 */

/* 通用：在矩形网格上按 slope(x,y) 画短线段，斜率非有限时跳过该点 */
function slopeFieldSegment(p, C, slope, xr, yr, step) {
  for (let x = xr[0]; x <= xr[1] + 1e-9; x += step) {
    for (let y = yr[0]; y <= yr[1] + 1e-9; y += step) {
      const m = slope(x, y);
      if (!Number.isFinite(m)) continue;
      const h = 0.26, d = Math.sqrt(1 + m * m);
      p.line(x - h / d, y - m * h / d, x + h / d, y + m * h / d,
        { color: C('axis'), width: 1.1, alpha: 0.5 });
    }
  }
}

/* 特征方程三种根情形下，满足 x(0)=1、x'(0)=0 的解 y(x)，参数 k 为一次项系数 */
function charY(x, k) {
  const D = k * k - 4;
  if (D < -1e-4) {
    const beta = Math.sqrt(4 - k * k) / 2;
    return Math.exp(-k * x / 2) * (Math.cos(beta * x) + (k / Math.sqrt(4 - k * k)) * Math.sin(beta * x));
  }
  if (D <= 1e-4) {
    const r = -k / 2;
    return (1 + (k / 2) * x) * Math.exp(r * x);
  }
  const s = Math.sqrt(D), r1 = (-k + s) / 2, r2 = (-k - s) / 2;
  return (-r2 * Math.exp(r1 * x) + r1 * Math.exp(r2 * x)) / (r1 - r2);
}

const DEMOS = {
  'slope-field': function (el) {
    DemoPresets.custom(el, {
      range: [-3, 3, -2, 7], boxH: 380,
      slider: { label: '任意常数', min: -1, max: 4, step: 0.05, init: 1 },
      figureHint: '短线段是方程在每一点规定的斜率方向，蓝色曲线是顺着这些方向走出来的解；拖动常数，整族抛物线上下平移。',
      draw: (p, out, v, c, C) => {
        slopeFieldSegment(p, C, (x, y) => 2 * x + 1, [-2.8, 2.8], [-1.5, 6.6], 0.42);
        p.curve(x => x * x + x + v, { color: C('accent'), width: 2.6, from: -3, to: 3 });
        p.dot(0, v, { r: 5, color: C('danger') });
        p.text(0.15, v + 0.35, '初值点', { color: C('danger'), size: 11 });
        out.innerHTML = `方程 ${texHTML('y^{\\prime}=2x+1')} 只规定斜率，把 ${texHTML('y=x^{2}+x+C')} 代回即得 ${texHTML('y^{\\prime}=2x+1')}，说明它是解。<br>` +
          `当前 ${texHTML('C=' + f4(v))}，特解 ${texHTML('y=x^{2}+x+' + f4(v))}，过 ${texHTML('(0,' + f4(v) + ')')}。<br>` +
          `一阶方程，通解含 ${texHTML('1')} 个任意常数；给定初值 ${texHTML('y(0)=' + f4(v))} 就定出唯一一条。`;
      }
    });
  },

  'separable-equations': function (el) {
    DemoPresets.custom(el, {
      range: [-3.5, 3.5, -3.5, 3.5], boxH: 380,
      slider: { label: '合并后的常数', min: 0.5, max: 4, step: 0.05, init: 1 },
      figureHint: '短线段是方程规定的方向，蓝色双曲线处处与它们相切；拖动常数看解族张开，注意两边积分只写了一次常数。',
      draw: (p, out, v, c, C) => {
        slopeFieldSegment(p, C, (x, y) => Math.abs(y) < 0.35 ? NaN : x / y, [-3.2, 3.2], [-3.2, 3.2], 0.42);
        const upper = x => Math.sqrt(x * x + v);
        p.curve(upper, { color: C('accent'), width: 2.5, from: -3.5, to: 3.5 });
        p.curve(x => -upper(x), { color: C('accent'), width: 2.5, from: -3.5, to: 3.5 });
        p.dot(0, Math.sqrt(v), { r: 5, color: C('danger') });
        out.innerHTML = `分离 ${texHTML('y\\,\\mathrm{d}y=x\\,\\mathrm{d}x')}，两边积分 ${texHTML('\\dfrac{y^{2}}{2}=\\dfrac{x^{2}}{2}+C')}，常数只写一次。<br>` +
          `合并得 ${texHTML('y^{2}=x^{2}+K')}；当前 ${texHTML('K=' + f4(v))}，两支为 ${texHTML('y=\\pm\\sqrt{x^{2}+' + f4(v) + '}')}。<br>` +
          `把 ${texHTML('y^{2}=x^{2}+K')} 两边求导得 ${texHTML('2y\\,y^{\\prime}=2x')}，即 ${texHTML('y^{\\prime}=\\dfrac{x}{y}')}，与方程一致；一阶，通解含 1 个常数。`;
      }
    });
  },

  'homogeneous-ode': function (el) {
    DemoPresets.custom(el, {
      range: [0.1, 2.2, -1, 5], boxH: 380, fill: true,
      slider: { label: '代换后的常数', min: -0.5, max: 1.5, step: 0.05, init: 0.5 },
      figureHint: '方程右端只依赖纵坐标与横坐标的比值，所以同一条过原点的射线上斜率都相同；令新变量等于这个比值就能分离变量，拖动常数看解族。',
      draw: (p, out, v, c, C) => {
        slopeFieldSegment(p, C, (x, y) => x < 0.15 ? NaN : y / x + 1, [0.3, 2.1], [-0.5, 4.8], 0.32);
        [0.5, 1, 1.5].forEach(k => p.line(0, 0, 2.2, 2.2 * k, { color: C('warn'), width: 1, dash: true, alpha: 0.45 }));
        p.curve(x => x * (Math.log(x) + v), { color: C('accent'), width: 2.6, from: 0.06, to: 2.2 });
        p.dot(1, v, { r: 5, color: C('danger') });
        out.innerHTML = `令 ${texHTML('u=\\dfrac{y}{x}')}（即 ${texHTML('y=ux')}），则 ${texHTML('y^{\\prime}=u+x\\,u^{\\prime}')}。<br>` +
          `代入 ${texHTML('x\\,y^{\\prime}=y+x')} 得 ${texHTML('x\\,u^{\\prime}=1')}，积分出 ${texHTML('u=\\ln x+C')}，故 ${texHTML('y=x(\\ln x+C)')}。<br>` +
          `当前 ${texHTML('C=' + f4(v))}，过 ${texHTML('(1,' + f4(v) + ')')}；代回可核对，一阶通解含 1 个常数。`;
      }
    });
  },

  'linear-first-order': function (el) {
    DemoPresets.custom(el, {
      range: [0, 5, -3, 5], boxH: 380, fill: true,
      slider: { label: '任意常数', min: -1.5, max: 3.5, step: 0.05, init: 1 },
      figureHint: '橙色虚线是方程的一个特解（一条直线），蓝线是通解；拖动常数，看那条指数衰减的差项怎样让每条曲线最终贴向直线。',
      draw: (p, out, v, c, C) => {
        p.curve(x => x - 1, { color: C('warn'), width: 1.8, dash: true, from: 0, to: 5 });
        p.curve(x => x - 1 + v * Math.exp(-x), { color: C('accent'), width: 2.6, from: 0, to: 5 });
        p.dot(0, v - 1, { r: 5, color: C('danger') });
        out.innerHTML = `方程 ${texHTML('\\dfrac{\\mathrm{d}y}{\\mathrm{d}x}+y=x')} 中 ${texHTML('P(x)=1')}、${texHTML('Q(x)=x')}，积分因子 ${texHTML('\\mu(x)=\\mathrm{e}^{\\int \\mathrm{d}x}=\\mathrm{e}^{x}')}。<br>` +
          `乘上 ${texHTML('\\mathrm{e}^{x}')} 后左边成为 ${texHTML('(\\mathrm{e}^{x}y)^{\\prime}=x\\,\\mathrm{e}^{x}')}，积分得 ${texHTML('\\mathrm{e}^{x}y=(x-1)\\mathrm{e}^{x}+C')}，即 ${texHTML('y=x-1+C\\mathrm{e}^{-x}')}。<br>` +
          `当前 ${texHTML('C=' + f4(v))}；${texHTML('C\\mathrm{e}^{-x}')} 随 ${texHTML('x\\to+\\infty')} 衰减，所有解都贴向特解 ${texHTML('y=x-1')}。一阶，通解含 1 个常数。`;
      }
    });
  },

  'reducible-ode': function (el) {
    DemoPresets.twoSliders(el, {
      range: [-3, 3, -3, 6], boxH: 380, fill: true,
      sliders: [
        { label: '一次项常数', min: -3, max: 3, step: 0.05, init: 0 },
        { label: '常数项', min: -2, max: 4, step: 0.05, init: 0 }
      ],
      figureHint: '二阶方程要积分两次，每积一次冒出一个任意常数；拖动两个滑块，看固定的三次曲线怎样被一条可调的直线平移、倾斜。',
      curves: [
        { fn: x => x * x * x / 3, color: 'warn', width: 1.6, dash: true },
        { fn: (x, a, b) => x * x * x / 3 + a * x + b, color: 'accent', width: 2.6 }
      ],
      dynamic: (p, a, b, C) => {
        p.dot(0, b, { r: 5, color: C('danger') });
      },
      readout: (a, b) => `二阶方程 ${texHTML('y^{\\prime\\prime}=2x')} 属 ${texHTML('y^{\\prime\\prime}=f(x)')} 型：积分一次 ${texHTML('y^{\\prime}=x^{2}+C_1')}，再积一次 ${texHTML('y=\\dfrac{x^{3}}{3}+C_1 x+C_2')}。<br>` +
        `当前 ${texHTML('C_1=' + f4(a))}、${texHTML('C_2=' + f4(b))}；二阶方程通解恰含 2 个任意常数，与阶数一致。<br>` +
        `橙色虚线是固定的 ${texHTML('\\dfrac{x^{3}}{3}')}，两个常数给蓝线叠加一条直线 ${texHTML('C_1 x+C_2')}。`
    });
  },

  'second-order-structure': function (el) {
    DemoPresets.twoSliders(el, {
      range: [-3, 3, -4, 5], boxH: 380, fill: true,
      sliders: [
        { label: '第一个解的系数', min: -3, max: 3, step: 0.05, init: 1 },
        { label: '第二个解的系数', min: -3, max: 3, step: 0.05, init: 1 }
      ],
      figureHint: '橙色虚线与绿色虚线分别是两个线性无关的解，蓝线是它们的线性组合；调节两个系数，看叠加原理怎样生成整族解。',
      curves: [
        { fn: () => 1, color: 'warn', width: 1.8, dash: true },
        { fn: x => x, color: 'ok', width: 1.8, dash: true },
        { fn: (x, a, b) => a + b * x, color: 'accent', width: 2.8 }
      ],
      dynamic: (p, a, b, C) => {
        p.dot(0, a, { r: 5, color: C('danger') });
      },
      readout: (a, b) => `齐次方程 ${texHTML('y^{\\prime\\prime}=0')} 有两个解 ${texHTML('y_1=1')} 与 ${texHTML('y_2=x')}；${texHTML('\\dfrac{y_2}{y_1}=x')} 不是常数，故二者线性无关。<br>` +
        `叠加原理：${texHTML('y=a\\,y_1+b\\,y_2=a+bx')} 仍是解；当前 ${texHTML('a=' + f4(a))}、${texHTML('b=' + f4(b))}。<br>` +
        `二阶齐次线性方程的通解由 2 个线性无关解张成，任意常数 2 个等于阶数 2。`
    });
  },

  'characteristic-roots': function (el) {
    DemoPresets.custom(el, {
      range: [0, 8, -1.2, 1.5], boxH: 360,
      slider: { label: '一阶导数项的系数', min: 0, max: 3, step: 0.05, init: 1 },
      buttons: [
        { label: '复根情形', value: 1 },
        { label: '重根情形', value: 2 },
        { label: '相异实根', value: 3 }
      ],
      figureHint: '拖动一阶导数项的系数，特征方程的判别式由负变零再变正，蓝线相应地在衰减振荡、临界、单调衰减之间切换，三种根情形一目了然。',
      draw: (p, out, v, c, C) => {
        p.curve(x => charY(x, v), { color: C('accent'), width: 2.6, from: 0, to: 8 });
        const D = v * v - 4;
        let regime, roots, shape;
        if (D < -1e-4) {
          const beta = Math.sqrt(4 - v * v) / 2;
          regime = '判别式为负：一对共轭复根，解是衰减振荡';
          roots = texHTML('r=' + f4(-v / 2) + '\\pm ' + f4(beta) + '\\,\\mathrm{i}');
          shape = texHTML('\\mathrm{e}^{\\alpha x}(C_1\\cos\\beta x+C_2\\sin\\beta x)');
        } else if (D <= 1e-4) {
          regime = '判别式为零：二重实根';
          roots = texHTML('r_1=r_2=-1');
          shape = texHTML('(C_1+C_2 x)\\mathrm{e}^{-x}');
        } else {
          const s = Math.sqrt(D), r1 = (-v + s) / 2, r2 = (-v - s) / 2;
          regime = '判别式为正：两个相异实根，解单调衰减';
          roots = texHTML('r_1=' + f4(r1) + ',\\; r_2=' + f4(r2));
          shape = texHTML('C_1\\mathrm{e}^{r_1 x}+C_2\\mathrm{e}^{r_2 x}');
        }
        out.innerHTML = `方程 ${texHTML('y^{\\prime\\prime}+' + f4(v) + 'y^{\\prime}+y=0')}，特征方程 ${texHTML('r^{2}+' + f4(v) + 'r+1=0')}，${texHTML('\\Delta=' + f4(D))}：${regime}。<br>` +
          `根 ${roots}，对应通解形状 ${shape}。<br>` +
          `蓝线取 ${texHTML('y(0)=1')}、${texHTML('y^{\\prime}(0)=0')} 的特解；${texHTML('C_1,C_2')} 共 2 个常数，与二阶相符。`;
      }
    });
  },

  'particular-solution': function (el) {
    DemoPresets.custom(el, {
      range: [-4, 4, -7, 7], boxH: 380, fill: true,
      slider: { label: '齐次部分振幅', min: 0, max: 2.5, step: 0.05, init: 1.5 },
      figureHint: '橙色虚线是用待定系数法找出的一个特解（直线），蓝线是把它与齐次方程的振荡解相加得到的通解；拖动振幅，看叠加怎样保持仍是解。',
      draw: (p, out, v, c, C) => {
        p.curve(x => x, { color: C('warn'), width: 1.8, dash: true, from: -4, to: 4 });
        p.curve(x => x + v * Math.cos(x), { color: C('accent'), width: 2.6, from: -4, to: 4 });
        p.dot(0, v, { r: 5, color: C('danger') });
        out.innerHTML = `非齐次方程 ${texHTML('y^{\\prime\\prime}+y=x')}：设特解 ${texHTML('y_p=Ax+B')}，代入得 ${texHTML('Ax+B=x')}，比较系数 ${texHTML('A=1')}、${texHTML('B=0')}，故 ${texHTML('y_p=x')}。<br>` +
          `齐次通解 ${texHTML('C_1\\cos x+C_2\\sin x')}；取 ${texHTML('C_2=0')}，通解 ${texHTML('y=x+C\\cos x')}，当前 ${texHTML('C=' + f4(v))}。<br>` +
          `结构定理：非齐次通解 = 齐次通解 + 一个特解；代回 ${texHTML('y^{\\prime\\prime}+y')} 仍得 ${texHTML('x')}，二阶含 2 个常数。`;
      }
    });
  },

  'euler-equation': function (el) {
    DemoPresets.custom(el, {
      range: [0.4, 4, -3, 9], boxH: 380, fill: true,
      slider: { label: '第二个任意常数', min: -1.5, max: 2, step: 0.05, init: 0.5 },
      figureHint: '欧拉方程的系数随横坐标变化，作变量代换后变成常系数方程；橙色与绿色虚线是两个基本解，蓝线是它们的线性组合，拖动常数看曲线怎样变形。',
      draw: (p, out, v, c, C) => {
        p.curve(x => x, { color: C('warn'), width: 1.6, dash: true, from: 0.4, to: 4 });
        p.curve(x => 1 / x, { color: C('ok'), width: 1.6, dash: true, from: 0.4, to: 4 });
        p.curve(x => x + v / x, { color: C('accent'), width: 2.6, from: 0.4, to: 4 });
        p.dot(1, 1 + v, { r: 5, color: C('danger') });
        out.innerHTML = `欧拉方程 ${texHTML('x^{2}y^{\\prime\\prime}+xy^{\\prime}-y=0')}（${texHTML('x>0')}），令 ${texHTML('x=\\mathrm{e}^{t}')} 化为 ${texHTML('Y^{\\prime\\prime}-Y=0')}。<br>` +
          `特征根 ${texHTML('r=\\pm 1')}，故 ${texHTML('Y=C_1\\mathrm{e}^{t}+C_2\\mathrm{e}^{-t}')}，回代 ${texHTML('t=\\ln x')} 得 ${texHTML('y=C_1x+\\dfrac{C_2}{x}')}。<br>` +
          `图中取 ${texHTML('C_1=1')}、${texHTML('C_2=' + f4(v))}；二阶方程通解含 2 个任意常数，与阶数一致。`;
      }
    });
  },

  'ode-system': function (el) {
    DemoPresets.custom(el, {
      range: [-4, 4, -4, 4], boxH: 380,
      slider: { label: '初始横坐标', min: 0.5, max: 3.5, step: 0.05, init: 2 },
      figureHint: '短线段标出方程组在每一点规定的运动方向，蓝线是满足给定初值的一条解轨迹；拖动初值，看这条圆形轨道的半径怎样变化。',
      draw: (p, out, v, c, C) => {
        slopeFieldSegment(p, C, (x, y) => Math.abs(y) < 0.3 ? NaN : -x / y, [-3.6, 3.6], [-3.6, 3.6], 0.42);
        p.circle(0, 0, v, { color: C('accent'), width: 2.6 });
        p.dot(v, 0, { r: 5, color: C('danger') });
        p.text(v + 0.12, 0.35, '初始点', { color: C('danger'), size: 11 });
        p.line(v, 0, v, -0.7, { color: C('warn'), width: 2 });
        out.innerHTML = `方程组 ${texHTML('x^{\\prime}=y')}、${texHTML('y^{\\prime}=-x')}：对第一式再求导得 ${texHTML('x^{\\prime\\prime}=y^{\\prime}=-x')}，即 ${texHTML('x^{\\prime\\prime}+x=0')}。<br>` +
          `解得 ${texHTML('x=C_1\\cos t+C_2\\sin t')}、${texHTML('y=x^{\\prime}=-C_1\\sin t+C_2\\cos t')}；取初值 ${texHTML('x(0)=' + f4(v))}、${texHTML('y(0)=0')} 得 ${texHTML('x=' + f4(v) + '\\cos t')}、${texHTML('y=-' + f4(v) + '\\sin t')}。<br>` +
          `于是 ${texHTML('x^{2}+y^{2}=' + f4(v * v))} 恒定，轨迹是半径 ${texHTML('R=' + f4(v))} 的圆；两个一阶方程合起来有 2 个任意常数。`;
      }
    });
  }
};

mountDemos(DEMOS);

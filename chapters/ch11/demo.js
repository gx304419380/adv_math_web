/* 第 11 章 · 原创交互演示
   绘图与外壳复用 assets/js/plot.js、demo-kit.js、demo-presets.js；
   等比例、缩放平移、KaTeX 读数均由组件层统一保证。*/

const DEMOS = {
  'line-integral-arc': function (el) {
    let dir = 1;
    DemoPresets.custom(el, {
      range: [-0.6, 3.9, -0.6, 5], boxH: 380,
      slider: { label: '累加比例', min: 0, max: 1, step: 0.01, init: 1 },
      buttons: [
        { label: '正向遍历·起点到终点', run: () => { dir = 1; } },
        { label: '反向遍历·终点到起点', run: () => { dir = -1; } }
      ],
      figureHint: '蓝线是线段，红点是累加到的位置，橙箭头标出遍历方向；切换按钮，看整条弧累加完的总量是否改变。',
      draw: (p, out, t, c, C) => {
        p.line(0, 0, 3, 4, { color: C('accent'), width: 2.6 });
        p.dot(0, 0, { r: 5, color: C('ok') });
        p.dot(3, 4, { r: 5, color: C('ok') });
        p.text(-0.45, -0.3, '起点', { color: C('ok'), size: 11 });
        p.text(3.06, 4.22, '终点', { color: C('ok'), size: 11 });
        const ax = 1.25, ay = 1.25 * 4 / 3;
        if (dir === 1) {
          p.line(ax, ay, ax + 0.5, ay + 0.5 * 4 / 3, { color: C('warn'), width: 2.2 });
          p.dot(ax + 0.5, ay + 0.5 * 4 / 3, { r: 3.5, color: C('warn') });
        } else {
          p.line(ax + 0.5, ay + 0.5 * 4 / 3, ax, ay, { color: C('warn'), width: 2.2 });
          p.dot(ax, ay, { r: 3.5, color: C('warn') });
        }
        let px, py, I;
        if (dir === 1) { px = 3 * t; py = 4 * t; I = 15 * t * t * t + 10 * t * t; }
        else { px = 3 * (1 - t); py = 4 * (1 - t); I = 65 * t - 55 * t * t + 15 * t * t * t; }
        p.dot(px, py, { r: 6, color: C('danger') });
        p.text(px + 0.08, py - 0.4, '当前点', { color: C('danger'), size: 11 });
        out.innerHTML = `红点位于 ${texHTML('t=' + f4(t))}：已累加 ${texHTML('I(t)=' + f4(I))}。<br>` +
          `弧长元素 ${texHTML('\\mathrm{d}s=\\sqrt{3^2+4^2}\\,\\mathrm{d}t=5\\,\\mathrm{d}t')}，密度 ${texHTML('f=x^2+y')}。<br>` +
          `沿任意方向累加到整条弧都得 ${texHTML('\\int_L (x^2+y)\\,\\mathrm{d}s=25')}：第一类曲线积分与方向无关。`;
      }
    });
  },

  'line-integral-work': function (el) {
    let dir = 1;
    const Wf = s => s * s * s / 3 + Math.pow(s, 4) / 2;
    const W1 = 5 / 6;
    DemoPresets.custom(el, {
      range: [-0.3, 1.4, -0.3, 1.5], boxH: 380,
      slider: { label: '行走位置', min: 0, max: 1, step: 0.01, init: 1 },
      buttons: [
        { label: '正向·起点到终点', run: () => { dir = 1; } },
        { label: '反向·终点到起点', run: () => { dir = -1; } }
      ],
      figureHint: '蓝线是抛物线路径，红点是质点当前位置；切换方向，看累计功的正负如何翻转。',
      draw: (p, out, t, c, C) => {
        p.curve(x => x * x, { from: 0, to: 1, color: C('accent'), width: 2.6 });
        p.dot(0, 0, { r: 4, color: C('ok') });
        p.dot(1, 1, { r: 4, color: C('ok') });
        p.text(-0.24, -0.2, '起点', { color: C('ok'), size: 11 });
        p.text(1.02, 1.14, '终点', { color: C('ok'), size: 11 });
        let px, py, W;
        if (dir === 1) { px = t; py = t * t; W = Wf(t); }
        else { px = 1 - t; py = (1 - t) * (1 - t); W = Wf(1 - t) - W1; }
        p.dot(px, py, { r: 6, color: C('danger') });
        p.text(px + 0.05, py + 0.2, '质点', { color: C('danger'), size: 11 });
        out.innerHTML = `${texHTML('t=' + f4(t))}：累计功 ${texHTML('W(t)=' + f4(W))}。<br>` +
          `力场 ${texHTML('\\vec{F}=(y,x^2)')}，路径 ${texHTML('y=x^2')}，${texHTML('\\mathrm{d}x=\\mathrm{d}t,\\ \\mathrm{d}y=2t\\,\\mathrm{d}t')}。<br>` +
          `正向走完 ${texHTML('W=\\frac{5}{6}')}；反向走完 ${texHTML('W=-\\frac{5}{6}')}，第二类曲线积分反向变号。`;
      }
    });
  },

  'green-theorem': function (el) {
    let sign = 1;
    const arrow = (p, x1, y1, x2, y2, C) => {
      p.line(x1, y1, x2, y2, { color: C('warn'), width: 2.2 });
      p.dot(x2, y2, { r: 3.5, color: C('warn') });
    };
    const pos = s => {
      if (s < 2) return [s, 0];
      if (s < 3) return [2, s - 2];
      if (s < 5) return [5 - s, 1];
      return [0, 6 - s];
    };
    DemoPresets.custom(el, {
      range: [-0.7, 2.8, -0.7, 1.8], boxH: 360,
      slider: { label: '边界行走位置', min: 0, max: 1, step: 0.01, init: 0.35 },
      buttons: [
        { label: '逆时针·正向边界', run: () => { sign = 1; } },
        { label: '顺时针·反向边界', run: () => { sign = -1; } }
      ],
      figureHint: '橙箭头标出边界正向，红点沿边界行走；顺时针时整体变号，区域内有奇点时不能直接用格林公式。',
      draw: (p, out, t, c, C) => {
        p.rect(0, 0, 2, 1, { fill: C('cyan'), alpha: 0.12, stroke: C('accent') });
        if (sign === 1) {
          arrow(p, 0.7, 0, 1.3, 0, C);
          arrow(p, 2, 0.2, 2, 0.8, C);
          arrow(p, 1.3, 1, 0.7, 1, C);
          arrow(p, 0, 0.8, 0, 0.2, C);
        } else {
          arrow(p, 1.3, 0, 0.7, 0, C);
          arrow(p, 2, 0.8, 2, 0.2, C);
          arrow(p, 0.7, 1, 1.3, 1, C);
          arrow(p, 0, 0.2, 0, 0.8, C);
        }
        const s = 6 * (sign === 1 ? t : 1 - t);
        const q = pos(s);
        p.dot(q[0], q[1], { r: 6, color: C('danger') });
        p.text(q[0] + 0.06, q[1] + 0.16, '边界点', { color: C('danger'), size: 11 });
        out.innerHTML = `场 ${texHTML('\\vec{F}=(x^2-y,\\,y^2+x)')}，边界 ${sign === 1 ? '逆时针（正向）' : '顺时针（反向）'}。<br>` +
          `${texHTML('\\frac{\\partial Q}{\\partial x}-\\frac{\\partial P}{\\partial y}=1-(-1)=2')}，矩形面积 ${texHTML('S=2\\times 1=2')}。<br>` +
          `格林公式 ${texHTML('\\oint_L P\\,\\mathrm{d}x+Q\\,\\mathrm{d}y=\\iint_D 2\\,\\mathrm{d}A=' + (sign === 1 ? '4' : '-4'))}；反向整体变号。闭区域、偏导连续、区域内无奇点缺一不可。`;
      }
    });
  },

  'surface-integral-area': function (el) {
    DemoPresets.custom(el, {
      range: [-0.2, 1.3, -0.2, 1.3], boxH: 380,
      slider: { label: '细分份数', min: 2, max: 20, step: 1, init: 4 },
      figureHint: '图是平面在 xy 面的俯视投影，第一类曲面积分不分侧；每个小格是一块投影面积微元。',
      draw: (p, out, v, c, C) => {
        const nn = Math.round(v), h = 1 / nn;
        for (let i = 0; i < nn; i++) for (let j = 0; j < nn; j++) {
          p.rect(i * h, j * h, (i + 1) * h, (j + 1) * h, { fill: C('cyan'), alpha: 0.10, stroke: C('accent') });
          p.dot(i * h, j * h, { r: 2, color: C('warn') });
        }
        const Sn = 6 - 6 / nn;
        out.innerHTML = `把投影正方形分成 ${texHTML(nn + '\\times' + nn)} 个小格，取每格左下角估密度。<br>` +
          `曲面 ${texHTML('z=2x+2y')} 上 ${texHTML('\\mathrm{d}S=\\sqrt{1+2^2+2^2}\\,\\mathrm{d}x\\mathrm{d}y=3\\,\\mathrm{d}x\\mathrm{d}y')}，密度 ${texHTML('f=z')}。<br>` +
          `黎曼和 ${texHTML('S_n=6-\\frac{6}{' + nn + '}=' + f4(Sn))}，随 ${texHTML('n\\to\\infty')} 趋于精确值 ${texHTML('\\iint_\\Sigma z\\,\\mathrm{d}S=6')}。`;
      }
    });
  },

  'flux-surface': function (el) {
    let sign = 1;
    DemoPresets.custom(el, {
      range: [-0.2, 1.3, -0.2, 1.3], boxH: 380,
      slider: { label: '积分范围', min: 0, max: 1, step: 0.01, init: 1 },
      buttons: [
        { label: '取上侧', run: () => { sign = 1; } },
        { label: '取下侧', run: () => { sign = -1; } }
      ],
      figureHint: '俯视图里阴影是积分区域；上侧法向指向读者，下侧法向背离读者，换侧结果整体变号。',
      draw: (p, out, t, c, C) => {
        p.rect(0, 0, 1, 1, { stroke: C('accent') });
        p.rect(0, 0, t, t, { fill: C('cyan'), alpha: 0.22, stroke: C('accent') });
        p.dot(0.5, 0.5, { r: 4, color: C('danger') });
        p.text(0.55, 0.6, sign === 1 ? '法向指向读者' : '法向背离读者', { color: C('danger'), size: 11 });
        const part = sign * (2 * t * t - t * t * t);
        out.innerHTML = `曲面 ${texHTML('z=2-x-y')} 在 ${texHTML('[0,1]^2')} 上方，取 ${sign === 1 ? '上侧' : '下侧'}。<br>` +
          `${texHTML('\\iint_\\Sigma z\\,\\mathrm{d}x\\mathrm{d}y=\\pm\\iint_D (2-x-y)\\,\\mathrm{d}x\\mathrm{d}y')}：上侧取正、下侧取负。<br>` +
          `子区域上的部分（不计侧）${texHTML('2t^2-t^3=' + f4(2 * t * t - t * t * t))}，当前侧结果 ${texHTML('I(t)=' + f4(part))}；整片 ${texHTML('\\iint_\\Sigma z\\,\\mathrm{d}x\\mathrm{d}y=' + (sign === 1 ? '1' : '-1'))}，换侧仅差一个负号。`;
      }
    });
  },

  'gauss-divergence': function (el) {
    let sign = 1;
    DemoPresets.custom(el, {
      range: [-0.3, 1.4, -0.3, 1.4], boxH: 360,
      slider: { label: '取样位置', min: 0, max: 1, step: 0.01, init: 0.5 },
      buttons: [
        { label: '取外侧', run: () => { sign = 1; } },
        { label: '取内侧', run: () => { sign = -1; } }
      ],
      figureHint: '俯视投影里橙箭头是封闭曲面的外法向；高斯公式要求曲面封闭且取外侧。',
      draw: (p, out, t, c, C) => {
        p.rect(0, 0, 1, 1, { fill: C('cyan'), alpha: 0.10, stroke: C('accent') });
        const arw = (x1, y1, x2, y2) => {
          p.line(x1, y1, x2, y2, { color: C('warn'), width: 2.0 });
          p.dot(x2, y2, { r: 3, color: C('warn') });
        };
        if (sign === 1) {
          arw(0.4, -0.02, 0.6, -0.2); arw(0.4, 1.02, 0.6, 1.2);
          arw(-0.02, 0.4, -0.2, 0.6); arw(1.02, 0.4, 1.2, 0.6);
        } else {
          arw(0.6, -0.2, 0.4, -0.02); arw(0.6, 1.2, 0.4, 1.02);
          arw(-0.2, 0.6, -0.02, 0.4); arw(1.2, 0.6, 1.02, 0.4);
        }
        p.dot(t, 0.5, { r: 6, color: C('danger') });
        p.text(t + 0.04, 0.6, '取样点', { color: C('danger'), size: 11 });
        const div = 2 * t + 2, flux = 3 * sign;
        out.innerHTML = `场 ${texHTML('\\vec{F}=(x^2+y,\\,y+z,\\,z+x)')}，散度 ${texHTML('\\nabla\\cdot\\vec{F}=2x+2')}。<br>` +
          `在取样点 ${texHTML('x=' + f4(t))} 处 ${texHTML('\\nabla\\cdot\\vec{F}=' + f4(div))}；单位立方体上 ${texHTML('\\iiint_\\Omega (2x+2)\\,\\mathrm{d}V=3')}。<br>` +
          `封闭曲面取 ${sign === 1 ? '外' : '内'}侧，通量 ${texHTML('\\iint_\\Sigma \\vec{F}\\cdot\\vec{n}\\,\\mathrm{d}S=' + f4(flux))}；取内侧整体变号，曲面不封闭则不能直接用高斯公式。`;
      }
    });
  },

  'stokes-curl': function (el) {
    let sign = 1;
    const L = 2 + Math.SQRT2;
    const pos = s => {
      if (s < 1) return [s, 0];
      if (s < 1 + Math.SQRT2) { const k = (s - 1) / Math.SQRT2; return [1 - k, k]; }
      return [0, 1 - (s - 1 - Math.SQRT2)];
    };
    const arrow = (p, x1, y1, x2, y2, C) => {
      p.line(x1, y1, x2, y2, { color: C('warn'), width: 2.2 });
      p.dot(x2, y2, { r: 3.5, color: C('warn') });
    };
    DemoPresets.custom(el, {
      range: [-0.3, 1.5, -0.3, 1.5], boxH: 360,
      slider: { label: '边界行走位置', min: 0, max: 1, step: 0.01, init: 0.4 },
      buttons: [
        { label: '逆时针边界·上侧', run: () => { sign = 1; } },
        { label: '顺时针边界·下侧', run: () => { sign = -1; } }
      ],
      figureHint: '三角形就在 xy 平面内，俯视图即曲面本身；橙箭头给边界方向，曲面侧由右手规则配套。',
      draw: (p, out, t, c, C) => {
        p.polygon([[0, 0], [1, 0], [0, 1]], { fill: C('cyan'), alpha: 0.12, stroke: C('accent') });
        p.dot(0, 0, { r: 4, color: C('ok') });
        p.dot(1, 0, { r: 4, color: C('ok') });
        p.dot(0, 1, { r: 4, color: C('ok') });
        if (sign === 1) {
          arrow(p, 0.3, 0, 0.7, 0, C);
          arrow(p, 0.8, 0.2, 0.5, 0.5, C);
          arrow(p, 0, 0.7, 0, 0.3, C);
        } else {
          arrow(p, 0.7, 0, 0.3, 0, C);
          arrow(p, 0.5, 0.5, 0.8, 0.2, C);
          arrow(p, 0, 0.3, 0, 0.7, C);
        }
        const s = L * (sign === 1 ? t : 1 - t);
        const q = pos(s);
        p.dot(q[0], q[1], { r: 6, color: C('danger') });
        p.text(q[0] + 0.04, q[1] + 0.16, '边界点', { color: C('danger'), size: 11 });
        out.innerHTML = `场 ${texHTML('\\vec{F}=(-y,\\,x,\\,0)')}，旋度 ${texHTML('\\nabla\\times\\vec{F}=(0,0,2)')}，三角形面积 ${texHTML('\\frac{1}{2}')}。<br>` +
          `取上侧、边界按右手规则取逆时针：${texHTML('\\iint_\\Sigma(\\nabla\\times\\vec{F})\\cdot\\vec{n}\\,\\mathrm{d}S=2\\times\\frac{1}{2}=1')}。<br>` +
          `环流量 ${texHTML('\\oint_\\Gamma \\vec{F}\\cdot\\mathrm{d}\\vec{r}=' + (sign === 1 ? '1' : '-1'))}；边界改顺时针，曲面侧也必须跟着翻，结果整体变号。`;
      }
    });
  }
};

mountDemos(DEMOS);

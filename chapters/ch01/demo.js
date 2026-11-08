/* 第 1 章 · 14 个原创交互演示
   绘图统一复用 assets/js/plot.js；单位圆与函数机器用原生 SVG / CSS */

/* ---------- 通用小工具 ---------- */

function controls(el, inner) {
  const d = document.createElement('div');
  d.className = 'demo-controls';
  d.innerHTML = inner;
  el.appendChild(d);
  return d;
}
function readout(el) {
  const d = document.createElement('div');
  d.className = 'readout';
  el.appendChild(d);
  return d;
}
function bindRange(root, sel, fn) {
  const s = root.querySelector(sel);
  if (!s) return null;
  s.addEventListener('input', () => fn(Number(s.value), s));
  return s;
}
function btnRow(el, items) {
  const d = document.createElement('div');
  d.className = 'btn-row';
  items.forEach((it, i) => {
    const b = document.createElement('button');
    b.className = 'btn' + (i === 0 ? ' is-active' : '');
    b.type = 'button';
    // 数学形式的按钮文字一律走 KaTeX，禁止用 x² 这种 Unicode 凑出来的“假上标”
    if (it.tex) b.appendChild(texInline(it.tex)); else b.textContent = it.label;
    b.addEventListener('click', () => {
      [...d.children].forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active');
      it.run();
    });
    d.appendChild(b);
  });
  el.appendChild(d);
  return d;
}
const f4 = v => (Math.abs(v) < 1e-10 ? 0 : v).toFixed(4);

/* ---------- 演示 1 · 函数机器 ---------- */

function functionMachine(el) {
  const RULES = [
    { tex: 'x^{2}', fn: x => x * x },
    { tex: '2x+1', fn: x => 2 * x + 1 },
    { tex: '\\left|x\\right|', fn: x => Math.abs(x) }
  ];
  const stage = document.createElement('div');
  stage.className = 'machine';
  stage.innerHTML = `
    <div class="m-node"><span>输入 x</span><b data-in>1.0</b></div>
    <div class="m-arrow">→</div>
    <div class="m-box"><span>对应法则 f</span><b data-rule></b></div>
    <div class="m-arrow">→</div>
    <div class="m-node"><span>输出 f(x)</span><b data-out>1.00</b></div>
    <div class="m-ball" data-ball></div>`;
  el.appendChild(stage);

  const c = controls(el, `
    <label>输入 x <input type="range" data-x min="-3" max="3" step="0.1" value="1"><output data-xv>1.0</output></label>
    <button class="btn" data-play>▶ 投进去</button>`);
  const out = readout(el);
  let x = 1, rule = 0;

  const paint = () => {
    const y = RULES[rule].fn(x);
    stage.querySelector('[data-in]').textContent = f4(x).slice(0, 5);
    stage.querySelector('[data-rule]').innerHTML = '';
    // 机器盒空间有限：用内联 \frac（不用 \dfrac），并强制单行
    stage.querySelector('[data-rule]').appendChild(
      texInline(RULES[rule].tex.replace(/\\dfrac/g, '\\frac'), { output: 'html' }));
    stage.querySelector('[data-out]').textContent = f4(y);
    c.querySelector('[data-xv]').textContent = f4(x).slice(0, 5);
    out.innerHTML = `规则 <b>f(x) = ${texHTML(RULES[rule].tex)}</b>　输入 <b>${texHTML('x=' + f4(x))}</b>　→　唯一输出 <b>${texHTML('f(x)=' + f4(y))}</b><br>同一个输入永远只得到一个输出，这就是「函数」；换个规则，输出就变了。`;
  };
  const play = () => {
    const ball = stage.querySelector('[data-ball]');
    ball.style.transition = 'none';
    ball.style.left = '1.2rem';
    void ball.offsetWidth;
    ball.style.transition = 'left 1.05s ease-in-out';
    ball.style.left = `calc(100% - 2.6rem)`;
  };

  bindRange(c, '[data-x]', v => { x = v; paint(); });
  c.querySelector('[data-play]').addEventListener('click', play);
  btnRow(el, RULES.map((r, i) => ({ tex: r.tex, run: () => { rule = i; paint(); play(); } })));
  paint();
}

/* ---------- 演示 2 · ε-N 数列逼近 ---------- */

function epsilonN(el) {
  const L = 1, MAXN = 60;
  // 横轴是「第 n 项」，纵轴是「项的值」——量纲不同，等比会把 60 项压成一条线。
  // 这种情况必须显式关掉等比例，并由绘图器在图上标注。
  const p = new Plot(el, {
    xmin: 0, xmax: MAXN, ymin: -1, ymax: 3, grid: true,
    equal: false,
    aspectNote: '横轴为项数 n，与纵轴量纲不同'
  });
  const c = controls(el, `
    <label>误差 ε <input type="range" data-eps min="0.05" max="1.5" step="0.05" value="0.4"><output data-epsv>0.40</output></label>
    <label>已显示项数 <input type="range" data-n min="1" max="60" step="1" value="12"><output data-nv>12</output></label>
    <button class="btn primary" data-play>▶ 播放</button>`);
  const out = readout(el);
  const st = { eps: 0.4, n: 12 };

  const a = n => L + (n % 2 ? -1 : 1) * 2 / n;
  const draw = () => {
    p.clear();
    p.rect(0, L - st.eps, MAXN, L + st.eps, { fill: PLOT_COLORS.ok, alpha: .12, stroke: PLOT_COLORS.ok, dash: true });
    p.line(0, L, MAXN, L, { color: PLOT_COLORS.ok, dash: true, width: 1.5 });
    // 边界文字放右端：左端是纵轴刻度数字的位置，挤在一起会看不清
    p.text(MAXN - .8, L + st.eps + .14, '上边界', { color: PLOT_COLORS.ok, size: 11, align: 'right' });
    p.text(MAXN - .8, L - st.eps - .2, '下边界', { color: PLOT_COLORS.ok, size: 11, align: 'right' });
    for (let n = 1; n <= Math.min(st.n, MAXN); n++) {
      const v = a(n);
      p.dot(n, v, { r: 3.4, color: Math.abs(v - L) < st.eps ? PLOT_COLORS.ok : PLOT_COLORS.warn });
    }
    const N = Math.floor(2 / st.eps) + 1;
    p.line(N, -1, N, 3, { color: PLOT_COLORS.accent, dash: true, width: 1.6 });
    p.text(N + .6, 2.6, `N = ${N}`, { color: PLOT_COLORS.accent, size: 11 });
    out.innerHTML = `${texHTML('\\varepsilon=' + f4(st.eps))}　→　需要 <b>${texHTML('N=' + N)}</b>（因为 ${texHTML('|a_{n}-1|=\\dfrac{2}{n}<\\varepsilon')} 要求 ${texHTML('n>\\dfrac{2}{\\varepsilon}')}）<br>` +
      `当前显示前 <b>${Math.round(st.n)}</b> 项；绿色点已落入带内，橙色点还在带外。N 之后全部是绿色 —— 这就是极限。`;
  };
  p.onResize = draw;
  const play = () => {
    st.n = 1;
    if (window.gsap) {
      window.gsap.killTweensOf(st);
      window.gsap.to(st, { n: MAXN, duration: 2.6, ease: 'none',
        onUpdate: () => { c.querySelector('[data-n]').value = Math.round(st.n); c.querySelector('[data-nv]').textContent = Math.round(st.n); draw(); },
        onComplete: draw });
    } else {
      const t = setInterval(() => {
        st.n += 1;
        c.querySelector('[data-n]').value = st.n; c.querySelector('[data-nv]').textContent = st.n;
        draw();
        if (st.n >= MAXN) clearInterval(t);
      }, 45);
    }
  };
  bindRange(c, '[data-eps]', v => { st.eps = v; c.querySelector('[data-epsv]').textContent = f4(v); draw(); });
  bindRange(c, '[data-n]', v => { st.n = v; c.querySelector('[data-nv]').textContent = Math.round(v); draw(); });
  c.querySelector('[data-play]').addEventListener('click', play);
  draw();
}

/* ---------- 演示 3 · ε-δ 定义 ---------- */

function epsilonDelta(el) {
  const f = x => 2 * x + 1, X0 = 1, LIM = 3;
  // 直线 y=2x+1 的斜率与误差带都是几何对象，必须等比；y 跨度大所以给足高度
  // 上界收到 y=5.6 就够：误差 ε 最大 2.4，带上界 = 3+2.4 = 5.4
  const p = new Plot(el, { xmin: -1.6, xmax: 2.8, ymin: -1, ymax: 5.6, grid: true, boxH: 440 });
  const c = controls(el, `
    <label>误差 ε <input type="range" data-eps min="0.2" max="2.4" step="0.1" value="1.2"><output data-epsv>1.20</output></label>
    <span class="hint">拖动 ε，看 δ 窗口自动收紧</span>`);
  const out = readout(el);
  const st = { eps: 1.2 };

  const draw = () => {
    const d = st.eps / 2;
    p.clear();
    /* 水平误差带：由 ε 决定 */
    p.rect(-1.6, LIM - st.eps, 2.8, LIM + st.eps, { fill: PLOT_COLORS.ok, alpha: .13, stroke: PLOT_COLORS.ok, dash: true });
    p.line(-1.6, LIM + st.eps, 2.8, LIM + st.eps, { color: PLOT_COLORS.ok, dash: true, width: 1.4 });
    p.line(-1.6, LIM - st.eps, 2.8, LIM - st.eps, { color: PLOT_COLORS.ok, dash: true, width: 1.4 });
    p.text(-1.45, LIM - st.eps - .3, '误差带下界', { color: PLOT_COLORS.ok, size: 11 });
    /* 竖直自变量窗口：由 δ = ε/2 决定 */
    p.rect(X0 - d, -1, X0 + d, 7, { fill: PLOT_COLORS.accent, alpha: .1, stroke: PLOT_COLORS.accent, dash: true });
    p.line(X0 - d, -1, X0 - d, 7, { color: PLOT_COLORS.accent, dash: true, width: 1.2 });
    p.line(X0 + d, -1, X0 + d, 7, { color: PLOT_COLORS.accent, dash: true, width: 1.2 });
    /* 曲线与落在窗口内的那一段 */
    p.curve(f, { from: -1.6, to: 2.8, color: PLOT_COLORS.accent, width: 2.4 });
    p.curve(f, { from: X0 - d, to: X0 + d, color: PLOT_COLORS.ok, width: 5 });
    p.dot(X0, LIM, { r: 5, color: PLOT_COLORS.accent });
    p.text(X0 + .1, LIM + .38, '(1, 3)', { color: PLOT_COLORS.accent, size: 11 });
    out.innerHTML = `${texHTML('\\varepsilon=' + f4(st.eps))}　→　${texHTML('\\delta=\\dfrac{\\varepsilon}{2}=' + f4(d))}　验证：${texHTML('2\\delta=' + f4(2 * d) + '=\\varepsilon')}<br>` +
      `当 ${texHTML('0<|x-1|<\\delta')} 时，${texHTML('|f(x)-3|=2|x-1|<2\\delta=\\varepsilon')}，定义成立。`;
  };
  p.onResize = draw;

  /* 分步动画改成「逐步收窄 ε」：每一步都保留完整图形，避免关键内容被藏起来 */
  const epsSeq = [1.2, 0.8, 0.4, 0.2];
  const steps = epsSeq.map(e => ({
    label: `误差带收窄到 ${e}`,
    run: () => {
      st.eps = e;
      c.querySelector('[data-eps]').value = String(e);
      c.querySelector('[data-epsv]').textContent = f4(e);
      draw();
    }
  }));
  new StepController(el, steps, { interval: 1700 });

  bindRange(c, '[data-eps]', v => {
    st.eps = v;
    c.querySelector('[data-epsv]').textContent = f4(v);
    draw();
  });
  draw();
}

/* ---------- 演示 4 · 单位圆与 sin x / x ---------- */

function sinxOverX(el) {
  const R = 150, OX = 110, OY = 235;
  const svg = document.createElement('div');
  svg.innerHTML = `<svg class="unit-svg" viewBox="0 0 460 300" xmlns="http://www.w3.org/2000/svg">
    <line x1="20" y1="${OY}" x2="440" y2="${OY}" stroke="currentColor" stroke-opacity=".35"/>
    <line x1="${OX}" y1="290" x2="${OX}" y2="10" stroke="currentColor" stroke-opacity=".35"/>
    <path data-big fill="#d97706" fill-opacity=".13" stroke="#d97706" stroke-width="1" stroke-dasharray="5 4"/>
    <path data-sec fill="#0891b2" fill-opacity=".20" stroke="#0891b2" stroke-width="1.5"/>
    <path data-small fill="#059669" fill-opacity=".28" stroke="#059669" stroke-width="1.5"/>
    <path d="M ${OX + R} ${OY} A ${R} ${R} 0 0 0 ${OX} ${OY - R}" fill="none" stroke="currentColor" stroke-opacity=".45" stroke-width="1.5"/>
    <line data-sin stroke="#059669" stroke-width="3"/>
    <line data-tan stroke="#d97706" stroke-width="3"/>
    <line x1="${OX}" y1="${OY}" x2="${OX + R}" y2="${OY}" stroke="currentColor" stroke-width="1.5"/>
    <line data-op stroke="#4f46e5" stroke-width="2"/>
    <circle data-p r="5" fill="#4f46e5"/>
    <text x="${OX - 22}" y="${OY + 20}">O</text>
    <text x="${OX + R + 6}" y="${OY + 20}">A</text>
    <text data-tp x="0" y="0" class="lbl" fill="#d97706">T</text>
    <text data-pp x="0" y="0" class="lbl" fill="#4f46e5">P</text>
    <text x="300" y="40">三个面积（半径取 1）：</text>
    <text data-a1 x="300" y="62" fill="#059669">小三角形面积</text>
    <text data-a2 x="300" y="84" fill="#0891b2">扇形面积</text>
    <text data-a3 x="300" y="106" fill="#d97706">大三角形面积</text>
    <text data-ineq x="300" y="138" class="lbl">小三角形 &lt; 扇形 &lt; 大三角形</text>
    <text data-clamp x="300" y="164">下界 &lt; 比值 &lt; 上界</text>
  </svg>`;
  el.appendChild(svg.firstChild);
  const root = el.querySelector('svg');
  const c = controls(el, `
    <label>角度 x（弧度） <input type="range" data-x min="0.08" max="0.9" step="0.01" value="0.5"><output data-xv>0.50</output></label>`);
  const out = readout(el);

  const draw = x => {
    const P = [OX + R * Math.cos(x), OY - R * Math.sin(x)];
    const T = [OX + R, OY - R * Math.tan(x)];
    const A = [OX + R, OY];
    root.querySelector('[data-big]').setAttribute('d', `M ${OX} ${OY} L ${A[0]} ${A[1]} L ${T[0]} ${T[1]} Z`);
    root.querySelector('[data-sec]').setAttribute('d', `M ${OX} ${OY} L ${A[0]} ${A[1]} A ${R} ${R} 0 0 0 ${P[0]} ${P[1]} Z`);
    root.querySelector('[data-small]').setAttribute('d', `M ${OX} ${OY} L ${A[0]} ${A[1]} L ${P[0]} ${P[1]} Z`);
    root.querySelector('[data-sin]').setAttribute('x1', P[0]); root.querySelector('[data-sin]').setAttribute('y1', OY);
    root.querySelector('[data-sin]').setAttribute('x2', P[0]); root.querySelector('[data-sin]').setAttribute('y2', P[1]);
    root.querySelector('[data-tan]').setAttribute('x1', A[0]); root.querySelector('[data-tan]').setAttribute('y1', A[1]);
    root.querySelector('[data-tan]').setAttribute('x2', T[0]); root.querySelector('[data-tan]').setAttribute('y2', T[1]);
    root.querySelector('[data-op]').setAttribute('x1', OX); root.querySelector('[data-op]').setAttribute('y1', OY);
    root.querySelector('[data-op]').setAttribute('x2', P[0]); root.querySelector('[data-op]').setAttribute('y2', P[1]);
    root.querySelector('[data-p]').setAttribute('cx', P[0]); root.querySelector('[data-p]').setAttribute('cy', P[1]);
    root.querySelector('[data-tp]').setAttribute('x', T[0] + 8); root.querySelector('[data-tp]').setAttribute('y', T[1] - 4);
    root.querySelector('[data-pp]').setAttribute('x', P[0] + 8); root.querySelector('[data-pp]').setAttribute('y', P[1] - 6);
    root.querySelector('[data-a1]').textContent = `小三角形 = ${f4(Math.sin(x) / 2)}`;
    root.querySelector('[data-a2]').textContent = `扇形     = ${f4(x / 2)}`;
    root.querySelector('[data-a3]').textContent = `大三角形 = ${f4(Math.tan(x) / 2)}`;
    root.querySelector('[data-clamp]').textContent = `下界 ${f4(Math.cos(x))} < 比值 < 上界 1`;
    c.querySelector('[data-xv]').textContent = f4(x);
    const ratio = Math.sin(x) / x;
    out.innerHTML = `角度 ${texHTML('x=' + f4(x))}：${texHTML('\\sin x=' + f4(Math.sin(x)))}　${texHTML('\\tan x=' + f4(Math.tan(x)))}<br>` +
      `比值 ${texHTML('\\dfrac{\\sin x}{x}=' + f4(ratio))}，被夹在 ${texHTML('\\cos x=' + f4(Math.cos(x)))} 与 1 之间；` +
      `把 x 拖到接近 0，两侧都挤向 1，于是 ${texHTML('\\lim\\limits_{x\\to 0}\\dfrac{\\sin x}{x}=1')}。`;
  };
  bindRange(c, '[data-x]', draw);
  draw(0.5);
}

/* ---------- 演示 5 · (1 + 1/x)^x → e ---------- */

function limitE(el) {
  const E = Math.E;
  const fn = x => Math.pow(1 + 1 / x, x);
  // x 跨 59 个单位、y 只有 1 个单位，等比会把图压成一条细线，只能作趋势示意
  const p = new Plot(el, {
    xmin: 1, xmax: 60, ymin: 1.9, ymax: 2.9, grid: true,
    equal: false,
    aspectNote: '纵轴刻度已放大，仅示意趋近趋势'
  });
  const c = controls(el, `
    <label>x <input type="range" data-x min="1" max="200" step="1" value="5"><output data-xv>5</output></label>
    <button class="btn primary" data-play>▶ 播放增长</button>`);
  const out = readout(el);
  const st = { x: 5 };

  const draw = () => {
    p.clear();
    p.line(1, E, 60, E, { color: PLOT_COLORS.warn, dash: true, width: 1.6 });
    p.text(30, E + .06, '水平渐近线', { color: PLOT_COLORS.warn, size: 11 });
    p.curve(fn, { from: 1, to: 60, color: PLOT_COLORS.accent, width: 2.6 });
    const marked = Math.min(st.x, 60);
    p.dot(marked, fn(marked), { r: 5, color: PLOT_COLORS.cyan });
    const v = fn(st.x);
    out.innerHTML = `${texHTML('x=' + st.x)}　${texHTML('\\left(1+\\dfrac{1}{x}\\right)^{x}=' + v.toFixed(6))}　${texHTML('\\mathrm{e}=' + E.toFixed(6))}　差距 <b>${Math.abs(E - v).toExponential(2)}</b><br>` +
      `x 越大，每次增量越小、次数越多，总量稳稳停在 ${texHTML('\\mathrm{e}')}；这就是「连续复利」。`;
  };
  p.onResize = draw;
  bindRange(c, '[data-x]', v => { st.x = Math.round(v); c.querySelector('[data-xv]').textContent = st.x; draw(); });
  c.querySelector('[data-play]').addEventListener('click', () => {
    if (window.gsap) {
      window.gsap.killTweensOf(st);
      window.gsap.to(st, { x: 200, duration: 2.8, ease: 'power1.inOut',
        onUpdate: () => { st.x = Math.round(st.x); c.querySelector('[data-x]').value = st.x; c.querySelector('[data-xv]').textContent = st.x; draw(); } });
    } else {
      const t = setInterval(() => { st.x = Math.min(200, st.x + 2); c.querySelector('[data-x]').value = st.x; c.querySelector('[data-xv]').textContent = st.x; draw(); if (st.x >= 200) clearInterval(t); }, 30);
    }
  });
  draw();
}

/* ---------- 演示 6 · 夹逼定理 ---------- */

function squeezeDemo(el) {
  const p = new Plot(el, { xmin: -3, xmax: 3, ymin: -3.2, ymax: 3.2, grid: true, boxH: 380 });
  const c = controls(el, `
    <label>观察窗口 r <input type="range" data-r min="0.15" max="1.5" step="0.05" value="0.6"><output data-rv>0.60</output></label>
    <span class="hint">把窗口收窄，看振荡被包络线夹到 0</span>`);
  const out = readout(el);
  const st = { r: .6 };
  const f = x => x === 0 ? 0 : x * x * Math.sin(1 / x);

  /* frame 只改取景，draw 只画。
     分开之后，用户自己缩放/平移过的视图不会在每次重绘时被覆盖；
     只有拖动 r 滑块（确实要换观察窗口）才重新取景。 */
  const frame = () => {
    const r = st.r, top = 1.15 * r * r;
    p.setRange({ xmin: -r, xmax: r, ymin: -top, ymax: top });
  };
  const draw = () => {
    const r = st.r, top = 1.15 * r * r;
    p.clear();
    p.curve(x => x * x, { from: -r, to: r, color: PLOT_COLORS.warn, width: 2, dash: true });
    p.curve(x => -x * x, { from: -r, to: r, color: PLOT_COLORS.warn, width: 2, dash: true });
    // dense: 靠近 0 加密采样，否则 sin(1/x) 的振荡会被漏掉、看起来像直线
    p.curve(f, { from: -r, to: r, color: PLOT_COLORS.accent, width: 2.4, samples: 6000, dense: true });
    p.dot(0, 0, { r: 5, color: PLOT_COLORS.ok });
    p.text(r * .05, top * .82, '上界', { color: PLOT_COLORS.warn, size: 11 });
    p.text(r * .05, -top * .9, '下界', { color: PLOT_COLORS.warn, size: 11 });
    out.innerHTML = `窗口 ${texHTML('[-r,r]=[-' + f4(r) + ',' + f4(r) + ']')}　包络 ${texHTML('\\pm r^{2}=\\pm' + f4(r * r))}<br>` +
      `无论中间那条曲线抖得多厉害，它始终满足 ${texHTML('-x^{2}\\le x^{2}\\sin\\dfrac{1}{x}\\le x^{2}')}；两侧都趋于 0，故 ${texHTML('f(x)\\to 0')}。`;
  };
  p.onResize = draw;
  bindRange(c, '[data-r]', v => { st.r = v; c.querySelector('[data-rv]').textContent = f4(v); frame(); draw(); });
  frame();
  draw();
}

/* ---------- 演示 7 · 无穷小的阶 ---------- */

function infinitesimalOrder(el) {
  const p = new Plot(el, { xmin: 0, xmax: 1, ymin: 0, ymax: 1.1, grid: true, boxH: 360 });
  const c = controls(el, `
    <label>p <input type="range" data-p min="0.5" max="4" step="0.1" value="2"><output data-pv>2.0</output></label>
    <label>q <input type="range" data-q min="0.5" max="4" step="0.1" value="1"><output data-qv>1.0</output></label>`);
  const out = readout(el);
  const st = { p: 2, q: 1 };

  const draw = () => {
    p.clear();
    p.curve(x => Math.pow(x, st.p), { from: 0, to: 1, color: PLOT_COLORS.accent, width: 2.6 });
    p.curve(x => Math.pow(x, st.q), { from: 0, to: 1, color: PLOT_COLORS.cyan, width: 2.6 });
    p.text(.62, Math.pow(.62, st.p) + .09, '幂次 p', { color: PLOT_COLORS.accent, size: 11 });
    p.text(.62, Math.pow(.62, st.q) + .09, '幂次 q', { color: PLOT_COLORS.cyan, size: 11 });
    const ratio = Math.pow(0.001, st.p - st.q);
    const kind = st.p > st.q + 1e-9 ? 'p 对应的幂更高，是更高阶无穷小（更快贴近 0）'
      : Math.abs(st.p - st.q) < 1e-9 ? 'p 与 q 相等，同阶且等价（曲线重合）'
      : 'p 对应的幂更低，是低阶无穷小（更慢贴近 0）';
    out.innerHTML = `${texHTML('p=' + f4(st.p))}，${texHTML('q=' + f4(st.q))}　比值 ${texHTML('\\dfrac{x^{p}}{x^{q}}=x^{p-q}')}，在 ${texHTML('x=0.001')} 处约为 <b>${ratio.toExponential(2)}</b><br>${kind}。`;
  };
  p.onResize = draw;
  bindRange(c, '[data-p]', v => { st.p = v; c.querySelector('[data-pv]').textContent = v.toFixed(1); draw(); });
  bindRange(c, '[data-q]', v => { st.q = v; c.querySelector('[data-qv]').textContent = v.toFixed(1); draw(); });
  draw();
}

/* ---------- 演示 8 · 四类间断点 ---------- */

function discontinuity(el) {
  // y 收到 ±3：间断点的关键信息在 x=1 附近，±4 只会让图变窄
  const p = new Plot(el, { xmin: -1, xmax: 3, ymin: -3, ymax: 3, grid: true, boxH: 380 });
  const out = readout(el);
  const EPS = 0.004;
  const TYPES = [
    {
      name: '可去间断', color: PLOT_COLORS.ok,
      parts: [[-1, 1 - EPS, x => x + 1], [1 + EPS, 3, x => x + 1]],
      extra: q => {
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-soft').trim() || '#fff';
        q.dot(1, 2, { r: 6, fill: bg, color: PLOT_COLORS.ok, stroke: PLOT_COLORS.ok });   // 空心：极限值处该点未被取到
        q.dot(1, .5, { r: 5, color: PLOT_COLORS.danger });                       // 实心：函数实际取值
      },
      note: '左右极限都存在且相等（都是 2），但 ' + texHTML('f(1)') + ' 被单独定义成 0.5。把红点挪到空心点处就连续了。',
      lr: '左极限与右极限都等于 2，但 ' + texHTML('f(1)=0.5') + '，两者不相等'
    },
    {
      name: '跳跃间断', color: PLOT_COLORS.warn,
      parts: [[-1, 1 - EPS, x => x * .6], [1 + EPS, 3, x => x * .6 + 1.4]],
      extra: q => {
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-soft').trim() || '#fff';
        q.dot(1, .6, { r: 6, fill: bg, color: PLOT_COLORS.warn, stroke: PLOT_COLORS.warn });
        q.dot(1, 2, { r: 5, color: PLOT_COLORS.warn });
      },
      note: '左右极限各自存在但不相等，图像出现一道台阶，怎么补点都接不上。',
      lr: '左极限约 0.6，右极限约 2.0，两者不相等'
    },
    {
      name: '无穷间断', color: PLOT_COLORS.danger,
      parts: [[-1, 1 - EPS, x => 1 / (x - 1)], [1 + EPS, 3, x => 1 / (x - 1)]],
      extra: q => q.line(1, -4, 1, 4, { color: PLOT_COLORS.danger, dash: true, width: 1.5 }),
      note: '至少一侧趋于无穷，' + texHTML('x=1') + ' 是竖直渐近线，极限不存在。',
      lr: '左极限趋于负无穷，右极限趋于正无穷'
    },
    {
      name: '振荡间断', color: PLOT_COLORS.accent,
      parts: [[-1, 1 - EPS, x => 1.6 * Math.sin(1 / (x - 1))], [1 + EPS, 3, x => 1.6 * Math.sin(1 / (x - 1))]],
      extra: q => {},
      note: '越靠近 1 摆得越密，函数值在 -1.6 与 1.6 之间无限次往返，极限根本不存在。',
      lr: '左右极限都不存在（无限振荡）'
    }
  ];
  let cur = 0;
  const draw = () => {
    p.clear();
    const t = TYPES[cur];
    t.parts.forEach(([a, b, fn]) => p.curve(fn, { from: a, to: b, color: t.color, width: 2.4, samples: 1400 }));
    t.extra(p);
    p.line(1, -4, 1, 4, { color: PLOT_COLORS.axis, dash: true, width: 1 });
    p.text(1.12, 2.62, '间断点位置', { color: PLOT_COLORS.text, size: 11 });
    out.innerHTML = `<b>${t.name}</b>　${t.lr}<br>${t.note}`;
  };
  p.onResize = draw;
  btnRow(el, TYPES.map((t, i) => ({ label: t.name, run: () => { cur = i; draw(); } })));
  draw();
}

/* ---------- 演示 9 · 介值定理 ---------- */

function ivtDemo(el) {
  const f = x => .95 * Math.sin(2.3 * x) + .28 * x + .25;
  const A = 0, B = 3;
  let min = Infinity, max = -Infinity, xmin = 0, xmax = 0;
  for (let i = 0; i <= 2000; i++) {
    const x = A + (B - A) * i / 2000, y = f(x);
    if (y < min) { min = y; xmin = x; }
    if (y > max) { max = y; xmax = x; }
  }
  // 右侧留出半个单位，给"最大值 1.6395"这类标注用，否则会被画布边缘切掉
  const p = new Plot(el, { xmin: -.2, xmax: 3.6, ymin: min - .45, ymax: max + .45, grid: true });
  const c = controls(el, `
    <label>水平线 c <input type="range" data-c min="${min.toFixed(3)}" max="${max.toFixed(3)}" step="0.01" value="${((min + max) / 2).toFixed(3)}"><output data-cv></output></label>`);
  const out = readout(el);
  let cv = (min + max) / 2;

  const draw = () => {
    p.clear();
    p.curve(f, { from: A, to: B, color: PLOT_COLORS.accent, width: 2.6 });
    p.line(A, cv, B, cv, { color: PLOT_COLORS.warn, dash: true, width: 1.8 });
    p.dot(xmin, min, { r: 5, color: PLOT_COLORS.ok });
    p.dot(xmax, max, { r: 5, color: PLOT_COLORS.ok });
    p.text(xmin + .06, min - .2, `最小值 ${f4(min)}`, { color: PLOT_COLORS.ok, size: 10 });
    p.text(xmax + .06, max + .18, `最大值 ${f4(max)}`, { color: PLOT_COLORS.ok, size: 10 });

    const roots = [];
    let prevX = A, prevY = f(A) - cv;
    for (let i = 1; i <= 1600; i++) {
      const x = A + (B - A) * i / 1600, y = f(x) - cv;
      if (prevY === 0 || prevY * y < 0) {
        const r = prevX + (x - prevX) * Math.abs(prevY) / (Math.abs(prevY) + Math.abs(y));
        roots.push(r);
      }
      prevX = x; prevY = y;
    }
    roots.forEach(r => p.dot(r, cv, { r: 5, color: PLOT_COLORS.danger }));
    c.querySelector('[data-cv]').textContent = f4(cv);
    out.innerHTML = `最小值 <b>${f4(min)}</b>　最大值 <b>${f4(max)}</b>　当前 c = <b>${f4(cv)}</b><br>` +
      `水平线与曲线相交 <b>${roots.length}</b> 次：${roots.map(r => f4(r)).join('、') || '（无）'}。` +
      `只要 c 落在最小值与最大值之间，交点就一定存在 —— 这就是介值定理。`;
  };
  p.onResize = draw;
  bindRange(c, '[data-c]', v => { cv = v; draw(); });
  draw();
}

/* ---------- 演示 10 · 割线逼近切线 ---------- */

function secantToTangent(el) {
  const f = x => x * x, X0 = 1;
  // 割线斜率就是「竖直增量 / 水平增量」，不等比时会看出错误的斜率
  const p = new Plot(el, { xmin: -.4, xmax: 2.4, ymin: -.5, ymax: 5.2, grid: true, boxH: 440 });
  const c = controls(el, `
    <label>h <input type="range" data-h min="0.02" max="1.2" step="0.01" value="1.0"><output data-hv>1.00</output></label>
    <button class="btn primary" data-play>▶ 把间距收小</button>`);
  const out = readout(el);
  const st = { h: 1.0 };

  const draw = () => {
    const h = st.h, x1 = X0 + h, y1 = f(x1), slope = (y1 - f(X0)) / h;
    p.clear();
    p.curve(f, { from: -.4, to: 2.4, color: PLOT_COLORS.accent, width: 2.4 });
    p.line(-.4, 2 * (-.4) - 1, 2.4, 2 * 2.4 - 1, { color: PLOT_COLORS.ok, dash: true, width: 1.8 });
    p.line(X0, f(X0), x1, y1, { color: PLOT_COLORS.warn, width: 2.6 });
    p.dot(X0, f(X0), { r: 5, color: PLOT_COLORS.accent });
    p.dot(x1, y1, { r: 5, color: PLOT_COLORS.warn });
    p.text(x1 - .1, y1 + .32, '割点', { color: PLOT_COLORS.warn, size: 10, align: 'right' });
    out.innerHTML = `${texHTML('h=' + f4(h))}　割线斜率 ${texHTML('\\dfrac{(1+h)^{2}-1}{h}=2+h=' + f4(slope))}　切线斜率 <b>${texHTML('2')}</b>　差距 <b>${f4(slope - 2)}</b><br>` +
      `把 h 拖到接近 0，割线绕着 (1,1) 转到极限位置 —— 那条绿色虚线就是切线，斜率正是第 2 章要定义的导数。`;
  };
  p.onResize = draw;
  bindRange(c, '[data-h]', v => { st.h = v; c.querySelector('[data-hv]').textContent = f4(v); draw(); });
  c.querySelector('[data-play]').addEventListener('click', () => {
    if (window.gsap) {
      window.gsap.killTweensOf(st);
      window.gsap.to(st, { h: .02, duration: 2.4, ease: 'power2.inOut',
        onUpdate: () => { c.querySelector('[data-h]').value = st.h; c.querySelector('[data-hv]').textContent = f4(st.h); draw(); } });
    } else {
      const t = setInterval(() => { st.h = Math.max(.02, st.h - .02); c.querySelector('[data-h]').value = st.h; c.querySelector('[data-hv]').textContent = f4(st.h); draw(); if (st.h <= .02) clearInterval(t); }, 25);
    }
  });
  draw();
}

/* ---------- 演示 11 · 基本初等函数图库（含竖直检验） ---------- */

function functionGallery(el) {
  // 每个函数同时给出：按钮用的短 TeX（btn）、正文用的完整 TeX（expr）、定义域/值域的 TeX
  const FUNCS = [
    { btn: 'x^{2}',     expr: 'f(x)=x^{2}',              fn: x => x * x,  dom: '\\mathbb{R}', range: '[0,+\\infty)', from: -3,   to: 3 },
    { btn: 'x^{3}',     expr: 'f(x)=x^{3}',              fn: x => x ** 3, dom: '\\mathbb{R}', range: '\\mathbb{R}', from: -2.2, to: 2.2 },
    { btn: '\\sin x',   expr: 'f(x)=\\sin x',             fn: Math.sin,    dom: '\\mathbb{R}', range: '[-1,1]', from: -4,   to: 4 },
    { btn: '\\cos x',   expr: 'f(x)=\\cos x',             fn: Math.cos,    dom: '\\mathbb{R}', range: '[-1,1]', from: -4,   to: 4 },
    { btn: '\\mathrm{e}^{x}', expr: 'f(x)=\\mathrm{e}^{x}', fn: Math.exp, dom: '\\mathbb{R}', range: '(0,+\\infty)', from: -2, to: 1.7 },
    { btn: '\\ln x',    expr: 'f(x)=\\ln x',              fn: Math.log,    dom: '(0,+\\infty)', range: '\\mathbb{R}', from: 0.02, to: 5 },
    { btn: '\\dfrac{1}{x}', expr: 'f(x)=\\dfrac{1}{x}',   fn: x => 1 / x,  dom: 'x\\neq 0',   range: 'y\\neq 0', from: -3, to: 3, split: true },
    { btn: '\\left|x\\right|', expr: 'f(x)=\\left|x\\right|', fn: Math.abs, dom: '\\mathbb{R}', range: '[0,+\\infty)', from: -3, to: 3 },
    { btn: '\\sqrt{x}', expr: 'f(x)=\\sqrt{x}',           fn: Math.sqrt,   dom: '[0,+\\infty)', range: '[0,+\\infty)', from: 0, to: 5 }
  ];
  // x、y 范围相同 → 等比后画布是正方形，y=x 正好是 45°
  const p = new Plot(el, { xmin: -3, xmax: 5, ymin: -3, ymax: 5, grid: true, boxH: 420 });
  const c = controls(el, `
    <label>竖直检验线 x = <input type="range" data-vx min="-2.8" max="4.8" step="0.1" value="1.2"><output data-vxv>1.2</output></label>`);
  const out = readout(el);
  let cur = 0, vx = 1.2;

  const draw = () => {
    const F = FUNCS[cur];
    // 取景固定在 -3..5：不要在这里改 p.o，那会把用户缩放/平移的位置冲掉
    p.clear();
    if (F.dom === '(0,+\\infty)' || F.dom === '[0,+\\infty)') p.rect(-3, -3, F.from, 5, { fill: PLOT_COLORS.danger, alpha: .06 });
    if (F.split) {
      p.curve(F.fn, { from: -3, to: -0.06, color: PLOT_COLORS.accent, width: 2.8 });
      p.curve(F.fn, { from: 0.06, to: 3, color: PLOT_COLORS.accent, width: 2.8 });
    } else {
      p.curve(F.fn, { from: F.from, to: F.to, color: PLOT_COLORS.accent, width: 2.8, samples: 900 });
    }
    p.line(vx, -3, vx, 5, { color: PLOT_COLORS.warn, dash: true, width: 1.6 });
    const y = F.fn(vx);
    const inside = vx >= F.from && vx <= F.to && Number.isFinite(y);
    if (inside) p.dot(vx, y, { r: 5, color: PLOT_COLORS.ok });
    // 画布内无法保证变量斜体，标签只写“检验线”，具体数值放到下方读数区用 KaTeX 排
    p.text(vx + .12, 4.55, '检验线', { color: PLOT_COLORS.warn, size: 11 });
    out.innerHTML =
      `<b>${texHTML(F.expr)}</b>　定义域 ${texHTML(F.dom)}　值域 ${texHTML(F.range)}<br>` +
      `竖直线 ${texHTML('x=' + f4(vx))} ${inside ? '与图像交于 <b>1</b> 个点' : '不与图像相交（该点不在定义域内）'} —— 任意竖线最多一个交点，即<b>通过竖直检验</b>。`;
  };
  p.onResize = draw;
  bindRange(c, '[data-vx]', v => { vx = v; c.querySelector('[data-vxv]').textContent = f4(v); draw(); });
  btnRow(el, FUNCS.map((F, i) => ({ tex: F.btn, run: () => { cur = i; draw(); } })));
  draw();
}

/* ---------- 演示 12 · 无穷小与无穷大的图像对比 ---------- */

function infinitesimalVsInfinity(el) {
  // 观察窗口 r 从 0.15 变到 1.2，等比会让画布宽度变化 8 倍；且 1/x 与 x² 量纲不同
  const p = new Plot(el, {
    xmin: 0, xmax: 1.2, ymin: -.2, ymax: 3.2, grid: true,
    equal: false,
    aspectNote: '窗口缩放演示，纵横刻度不同'
  });
  const c = controls(el, `
    <label>观察窗口 r <input type="range" data-r min="0.15" max="1.2" step="0.01" value="1"><output data-rv>1.00</output></label>
    <span class="hint">把窗口推向 0，看谁先贴近横轴</span>`);
  const out = readout(el);
  let r = 1;
  // 同样把「换取景」和「画」拆开：用户缩放平移后的视图不该被重绘覆盖
  const frame = () => { p.setRange({ xmin: 0, xmax: 1.2, ymin: -.2, ymax: 3.2 }); };
  const draw = () => {
    p.clear();
    p.curve(x => 1 / x, { from: .34, to: 1.2, color: PLOT_COLORS.danger, width: 2.2, dash: true, samples: 700 });
    p.curve(Math.sqrt, { from: 0, to: 1.2, color: PLOT_COLORS.warn, width: 2.4 });
    p.curve(x => x, { from: 0, to: 1.2, color: PLOT_COLORS.accent, width: 2.4 });
    p.curve(x => x * x, { from: 0, to: 1.2, color: PLOT_COLORS.ok, width: 2.4 });
    p.line(r, -.2, r, 3.2, { color: PLOT_COLORS.cyan, dash: true, width: 1.4 });
    p.text(r + .03, 2.9, '观察位置', { color: PLOT_COLORS.cyan, size: 11 });
    out.innerHTML = `在 ${texHTML('x=' + f4(r))} 处：${texHTML('\\dfrac{1}{x}=' + f4(1 / r))}　${texHTML('\\sqrt{x}=' + f4(Math.sqrt(r)))}　${texHTML('x=' + f4(r))}　${texHTML('x^{2}=' + f4(r * r))}<br>` +
      `拖动竖线往 0 推，四个读数一起变化：红色虚线冲向无穷（<b>无穷大</b>），另外三条都趋于 0（<b>无穷小</b>）但速度不同，幂次越高越快。注意 ${texHTML('\\infty')} 不是数，只是趋势。`;
  };
  p.onResize = draw;
  bindRange(c, '[data-r]', v => { r = v; c.querySelector('[data-rv]').textContent = f4(v); frame(); draw(); });
  frame();
  draw();
}

/* ---------- 演示 13 · 约分与可去间断 ---------- */

function cancelAndLimit(el) {
  const p = new Plot(el, { xmin: -1, xmax: 3, ymin: -1, ymax: 5, grid: true, boxH: 400 });
  const c = controls(el, `
    <label>取 x = <input type="range" data-x min="-0.5" max="2.5" step="0.05" value="1.6"><output data-xv>1.60</output></label>`);
  const out = readout(el);
  let xx = 1.6;
  const g = x => Math.abs(x - 1) < 1e-9 ? NaN : (x * x - 1) / (x - 1);
  const draw = () => {
    p.clear();
    p.line(-1, 0, 3, 4, { color: PLOT_COLORS.ok, width: 2.2, dash: true });
    p.curve(g, { from: -1, to: .995, color: PLOT_COLORS.accent, width: 3.2 });
    p.curve(g, { from: 1.005, to: 3, color: PLOT_COLORS.accent, width: 3.2 });
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-soft').trim() || '#fff';
    p.dot(1, 2, { r: 6, fill: bg, color: PLOT_COLORS.accent, stroke: PLOT_COLORS.accent });
    p.line(xx, -1, xx, 5, { color: PLOT_COLORS.warn, dash: true, width: 1.4 });
    if (Math.abs(xx - 1) > .01) p.dot(xx, xx + 1, { r: 5, color: PLOT_COLORS.warn });
    out.innerHTML = `${texHTML('x=' + f4(xx))}　${texHTML('\\dfrac{x^{2}-1}{x-1}=' + (Math.abs(xx - 1) > .01 ? f4((xx * xx - 1) / (xx - 1)) : '\\text{无定义}'))}　${texHTML('x+1=' + f4(xx + 1))}<br>` +
      `绿色虚线 y = x+1 与蓝色曲线除 x=1 一点外<strong>完全重合</strong>；极限只看去心邻域，故极限为 <b>2</b>。把滑块拖到 1 会看到那个空心点。`;
  };
  p.onResize = draw;
  bindRange(c, '[data-x]', v => { xx = v; c.querySelector('[data-xv]').textContent = f4(v); draw(); });
  draw();
}

/* ---------- 演示 14 · 连续函数的运算 ---------- */

function continuityOperations(el) {
  const CASES = [
    {
      nameTex: '\\sin(x^{2})', color: PLOT_COLORS.accent,
      parts: [[-3, 3, x => Math.sin(x * x)]],
      note: '正弦与幂函数都处处连续，复合后仍处处连续。图像一笔画到底，没有断点。', ok: true
    },
    {
      name: '分段连续（带尖角）', nameTex: '\\left|x\\right|', color: PLOT_COLORS.accent,
      parts: [[-3, 3, Math.abs]],
      note: '两段连续函数在分段点拼起来，左右极限都等于 0 且等于函数值，因此连续；但这里有尖角，不可导。', ok: true
    },
    {
      name: '分段跳跃（不连续）', color: PLOT_COLORS.danger,
      parts: [[-3, -0.001, () => -0.8], [0.001, 3, () => 0.8]],
      note: '左右极限一个是 -0.8、一个是 0.8，不相等，分段点是跳跃间断点。', ok: false
    },
    {
      name: '可去间断（可修补）', color: PLOT_COLORS.warn,
      parts: [[-3, -0.001, x => x + 1], [0.001, 3, x => x + 1]],
      extra: q => {
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-soft').trim() || '#fff';
        q.dot(0, 1, { r: 6, fill: bg, color: PLOT_COLORS.warn, stroke: PLOT_COLORS.warn });
      },
      note: '极限存在且等于 1，但该点函数值缺失；把空心点补上就连续了。', ok: false
    }
  ];
  const p = new Plot(el, { xmin: -3, xmax: 3, ymin: -2, ymax: 2, grid: true, boxH: 360 });
  const out = readout(el);
  let cur = 0;
  const draw = () => {
    const t = CASES[cur];
    p.clear();
    t.parts.forEach(([a, b, fn]) => p.curve(fn, { from: a, to: b, color: t.color, width: 2.7, samples: 900 }));
    if (t.extra) t.extra(p);
    const title = t.nameTex ? texHTML(t.nameTex) : t.name;
    out.innerHTML = `<b>${title}</b>　${t.ok ? '<span class="txt-ok">连续</span>' : '<span class="txt-danger">有间断点</span>'}<br>${t.note}`;
  };
  p.onResize = draw;
  btnRow(el, CASES.map((t, i) => ({ label: t.name, tex: t.nameTex, run: () => { cur = i; draw(); } })));
  draw();
}

/* ---------- 装配 ---------- */

const DEMOS = {
  'function-machine': functionMachine,
  'function-gallery': functionGallery,
  'epsilon-N': epsilonN,
  'epsilon-delta': epsilonDelta,
  'infinitesimal-vs-infinity': infinitesimalVsInfinity,
  'cancel-and-limit': cancelAndLimit,
  'sinx-over-x': sinxOverX,
  'limit-e': limitE,
  'squeeze': squeezeDemo,
  'infinitesimal-order': infinitesimalOrder,
  'discontinuity': discontinuity,
  'continuity-operations': continuityOperations,
  'ivt': ivtDemo,
  'secant-to-tangent': secantToTangent
};

document.querySelectorAll('[data-demo]').forEach(el => {
  const key = el.dataset.demo;
  const run = DEMOS[key];
  if (!run) return;
  try { run(el); }
  catch (err) {
    console.warn(`[ch01] 演示 ${key} 初始化失败：`, err);
    const box = document.createElement('div');
    box.className = 'lib-error';
    box.textContent = `演示「${key}」初始化失败：${err.message}`;
    el.appendChild(box);
  }
});

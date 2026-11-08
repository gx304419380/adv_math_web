/* 通用演示构造器 · 组件层
   各章 demo.js 只写薄配置，不复制绘图样板；绘图细节、等比例、缩放平移、
   readout 的 KaTeX 排版、动画推进都在这里统一实现。
   依赖：assets/js/plot.js → demo-kit.js → math.js（顺序由页面保证）。 */
(function () {
  const PAL = window.PLOT_COLORS || {};
  const C = k => PAL[k] || PAL.accent || '#0969da';
  const ROT = ['accent', 'cyan', 'ok', 'warn', 'danger', 'text'];

  function plotOpts(o, r) {
    // equal 不传：绘图器默认等比例。缩放 / 平移由绘图器自己提供，这里不干预。
    const q = {
      xmin: r[0], xmax: r[1], ymin: r[2], ymax: r[3],
      grid: o.grid !== false, boxH: o.boxH || 360
    };
    // 仅当横轴与纵轴量纲确实不同（如「时间 × 体积」「衰减函数」）才允许非等比，
    // 且必须带告示，绘图器会把提示显示在图像工具条里。
    // fill:true 用于「自变量 × 函数值」图：等比会把画布压成细缝时，
    // 改为铺满容器宽度，并在工具条注明两轴刻度各自标定。
    if (o.equal === false || o.fill === true) {
      q.equal = false;
      q.aspectNote = o.aspectNote || (o.fill
        ? '横轴为自变量、纵轴为函数值，两轴刻度各自标定'
        : '两轴量纲不同，纵向刻度已单独缩放');
    }
    return q;
  }
  function newPlot(el, o) {
    return new Plot(el, plotOpts(o, o.range || [-3, 3, -2, 2]));
  }
  function sliderHTML(s, key) {
    return `<label>${s.label} <input type="range" data-${key} min="${s.min}" max="${s.max}" step="${s.step}" value="${s.init}"><output data-${key}v>${s.init}</output></label>`;
  }
  function hint(el, o) { if (o.figureHint) figureHint(el, o.figureHint); }
  function setSlider(c, key, v) {
    const inp = c.querySelector('[data-' + key + ']');
    const ov = c.querySelector('[data-' + key + 'v]');
    if (inp) inp.value = String(v);
    if (ov) ov.textContent = f4(v);
  }
  function paintCurve(p, cf, i, v) {
    const opt = {
      color: C(cf.color || ROT[i % ROT.length]),
      width: cf.width || 2.4,
      dash: !!cf.dash,
      samples: cf.samples || 900,
      dense: !!cf.dense
    };
    // 不传 from/to 时，curve() 自动按当前视图取样，缩放平移后依然画满窗口
    if (cf.from != null) opt.from = cf.from;
    if (cf.to != null) opt.to = cf.to;
    p.curve(x => cf.fn(x, v), opt);
  }

  /** 单滑块 + 若干曲线 + 动态标注 + 自定义读数（最常用） */
  function sliderCurve(el, o) {
    const p = newPlot(el, o);
    const s = o.slider || { label: '参数', min: 0, max: 1, step: 0.01, init: 0.5 };
    let v = Number(s.init);
    const c = controls(el, sliderHTML(s, 'v') + (o.hint ? `<span class="hint">${o.hint}</span>` : ''));
    const out = readout(el);
    hint(el, o);
    const draw = () => {
      p.clear();
      (o.shades || []).forEach(sh => p.rect(sh[0], sh[1], sh[2], sh[3], {
        fill: C(sh[4] || 'accent'), alpha: sh[5] == null ? .12 : sh[5], stroke: sh[6] ? C(sh[6]) : null
      }));
      (o.curves || []).forEach((cf, i) => paintCurve(p, cf, i, v));
      (o.marks || []).forEach(m => {
        if (m.type === 'dot') p.dot(m.x, m.y, { r: m.r || 5, color: C(m.color || 'danger') });
        else if (m.type === 'hline') p.line(p.view.xmin, m.y, p.view.xmax, m.y, { color: C(m.color || 'warn'), dash: true, width: 1.4 });
        else if (m.type === 'vline') p.line(m.x, p.view.ymin, m.x, p.view.ymax, { color: C(m.color || 'cyan'), dash: true, width: 1.4 });
        else if (m.type === 'text') p.text(m.x, m.y, m.text, { color: C(m.color || 'text'), size: m.size || 11 });
      });
      if (o.dynamic) o.dynamic(p, v, C);           // 每章可自己补点、线、中文标注
      out.innerHTML = o.readout ? o.readout(v, p, C) : `参数 ${texHTML('a=' + f4(v))}`;
    };
    p.onResize = draw;
    if (o.buttons) {
      btnRow(el, o.buttons.map(b => ({
        label: b.label, tex: b.tex,
        run: () => {
          if (b.value != null) { v = Number(b.value); setSlider(c, 'v', v); }
          if (b.run) b.run(v, p);
          draw();
        }
      })));
    }
    if (o.play) {
      const btn = document.createElement('button');
      btn.className = 'btn primary'; btn.type = 'button';
      btn.textContent = o.play.label || '▶ 播放';
      c.appendChild(btn);
      btn.addEventListener('click', () => {
        const from = Number(s.init), to = o.play.to == null ? Number(s.max) : o.play.to;
        const dur = (o.play.duration || 3) * 1000, t0 = performance.now();
        const tick = () => {
          const k = Math.min(1, (performance.now() - t0) / dur);
          v = from + (to - from) * k;
          setSlider(c, 'v', v);
          draw();
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }
    bindRange(c, '[data-v]', nv => { v = nv; setSlider(c, 'v', v); draw(); });
    draw();
  }

  /** 双滑块：两个独立参数 a、b */
  function twoSliders(el, o) {
    const p = newPlot(el, o);
    const sa = o.sliders[0], sb = o.sliders[1];
    let a = Number(sa.init), b = Number(sb.init);
    const c = controls(el, sliderHTML(sa, 'a') + sliderHTML(sb, 'b') +
      (o.hint ? `<span class="hint">${o.hint}</span>` : ''));
    const out = readout(el);
    hint(el, o);
    const draw = () => {
      p.clear();
      (o.curves || []).forEach((cf, i) => {
        const opt = { color: C(cf.color || ROT[i % ROT.length]), width: cf.width || 2.4, dash: !!cf.dash, samples: cf.samples || 900 };
        if (cf.from != null) opt.from = cf.from;
        if (cf.to != null) opt.to = cf.to;
        p.curve(x => cf.fn(x, a, b), opt);
      });
      if (o.dynamic) o.dynamic(p, a, b, C);
      out.innerHTML = o.readout ? o.readout(a, b, p, C) : '';
    };
    p.onResize = draw;
    bindRange(c, '[data-a]', nv => { a = nv; setSlider(c, 'a', a); draw(); });
    bindRange(c, '[data-b]', nv => { b = nv; setSlider(c, 'b', b); draw(); });
    draw();
  }

  /** 黎曼和：等分数 n 控制矩形，读数给近似面积与精确面积对照 */
  function riemann(el, o) {
    const r = o.range || [0, 1, -.2, 1.5];
    const p = new Plot(el, plotOpts(o, r));
    const a = o.a == null ? 0 : o.a, b = o.b == null ? 1 : o.b;
    const f = o.fn || (x => x * x);
    const maxN = o.maxN || 60, n0 = o.initN || 8;
    const c = controls(el, `<label>等分数 n <input type="range" data-n min="2" max="${maxN}" step="1" value="${n0}"><output data-nv>${n0}</output></label>` +
      (o.hint ? `<span class="hint">${o.hint}</span>` : ''));
    const out = readout(el);
    hint(el, o);
    let n = n0;
    const draw = () => {
      p.clear();
      p.curve(f, { from: a, to: b, color: C('accent'), width: 2.4, samples: 1200 });
      const dx = (b - a) / n;
      let sum = 0;
      for (let i = 0; i < n; i++) {
        const x0 = a + i * dx, x1 = x0 + dx, h = f((x0 + x1) / 2);
        p.rect(x0, 0, x1, h, { fill: C('cyan'), alpha: .26, stroke: C('accent') });
        sum += h * dx;
      }
      p.line(a, 0, b, 0, { color: C('axis'), width: 1.2 });
      if (o.dynamic) o.dynamic(p, n, sum);
      out.innerHTML = o.readout ? o.readout(n, sum) : `等分数 ${texHTML('n=' + n)}，矩形面积和 ${texHTML('S_n=' + f4(sum))}`;
    };
    p.onResize = draw;
    bindRange(c, '[data-n]', nv => { n = Math.round(nv); c.querySelector('[data-nv]').textContent = n; draw(); });
    draw();
  }

  /** 逐阶多项式逼近：terms[k] 是第 k 项函数，滑块 n 取前 n 项 */
  function polyApprox(el, o) {
    const p = newPlot(el, o);
    const terms = o.terms || [], tgt = o.target || (() => 0);
    let n = o.initN || 1;
    const c = controls(el, `<label>展开阶数 n <input type="range" data-n min="0" max="${terms.length - 1}" step="1" value="${n}"><output data-nv>${n}</output></label>` +
      (o.hint ? `<span class="hint">${o.hint}</span>` : ''));
    const out = readout(el);
    hint(el, o);
    const poly = x => { let s = 0; for (let k = 0; k <= n && k < terms.length; k++) s += terms[k](x); return s; };
    const draw = () => {
      p.clear();
      p.curve(tgt, { color: C('accent'), width: 2.6, samples: 1200 });
      p.curve(poly, { color: C('warn'), width: 2.2, dash: n > 0, samples: 1200 });
      if (o.dynamic) o.dynamic(p, n, poly, C);
      out.innerHTML = o.readout ? o.readout(n, poly, C) : `展开到 ${texHTML('n=' + n)} 阶`;
    };
    p.onResize = draw;
    bindRange(c, '[data-n]', nv => { n = Math.round(nv); c.querySelector('[data-nv]').textContent = n; draw(); });
    draw();
  }

  /** 数列 / 级数部分和：term(k) 给第 k 项，滑块 N 显示前 N 项与部分和 */
  function partialSum(el, o) {
    const r = o.range || [0, 20, -1, 2];
    const p = new Plot(el, plotOpts(o, r));
    const term = o.term || (() => 0), maxN = o.maxN || 40, n0 = o.initN || 6;
    const c = controls(el, `<label>取到第 N 项 <input type="range" data-n min="1" max="${maxN}" step="1" value="${n0}"><output data-nv>${n0}</output></label>` +
      (o.hint ? `<span class="hint">${o.hint}</span>` : ''));
    const out = readout(el);
    hint(el, o);
    let N = n0;
    const draw = () => {
      p.clear();
      let s = 0;
      const pts = [];
      for (let k = 1; k <= N; k++) { s += term(k); pts.push([k, s]); }
      for (let k = 1; k <= N; k++) {
        const h = term(k);
        p.rect(k - .32, 0, k + .32, h, { fill: C('cyan'), alpha: .22, stroke: C('accent') });
      }
      if (o.limitLine != null) p.line(r[0], o.limitLine, r[1], o.limitLine, { color: C('warn'), dash: true, width: 1.6 });
      for (let k = 1; k < pts.length; k++) p.line(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], { color: C('ok'), width: 1.8 });
      pts.forEach(q => p.dot(q[0], q[1], { r: 3.5, color: C('ok') }));
      if (o.dynamic) o.dynamic(p, N, s, C);
      out.innerHTML = o.readout ? o.readout(N, s, term, C) : `${texHTML('S_{' + N + '}=' + f4(s))}`;
    };
    p.onResize = draw;
    bindRange(c, '[data-n]', nv => { N = Math.round(nv); c.querySelector('[data-nv]').textContent = N; draw(); });
    draw();
  }

  /** 自由绘制逃生口：o.draw(p, out, v, c) 由各章完全自定义；
      o.slider 可选，o.buttons 可选，可直接用 StepController 做分步动画。 */
  function custom(el, o) {
    const p = newPlot(el, o);
    const c = controls(el, (o.slider ? sliderHTML(o.slider, 'v') : '') + (o.controlsHTML || ''));
    const out = readout(el);
    hint(el, o);
    let v = o.slider ? Number(o.slider.init) : 0;
    const draw = () => { p.clear(); o.draw(p, out, v, c, C); };
    p.onResize = draw;
    if (o.slider) bindRange(c, '[data-v]', nv => { v = nv; setSlider(c, 'v', v); draw(); });
    if (o.buttons) btnRow(el, o.buttons.map(b => ({
      label: b.label, tex: b.tex,
      run: () => { if (b.value != null) { v = Number(b.value); setSlider(c, 'v', v); } if (b.run) b.run(v, p); draw(); }
    })));
    draw();
  }

  window.DemoPresets = { sliderCurve, twoSliders, riemann, polyApprox, partialSum, custom };
})();

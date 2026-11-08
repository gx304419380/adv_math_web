/* 轻量 Canvas 2D 绘图器：坐标系、网格、刻度、曲线、点、区域填充
   用于需要精细逐帧控制的交互演示（JSXGraph 仍用于通用 data-mount="graph" 组件）

   交互（默认开启，可用 interactive:false 关闭）：
     滚轮 / 双指 —— 以指针为中心缩放
     拖拽 / 方向键 —— 平移
     双击 / 点「复位」—— 回到初始取景（即构造时给的 xmin..ymax）
   规范见 docs/COMPONENTS.md §6「图表 Plot」。 */

/* ---------- 调色板：全部取自设计 token，随深浅色主题切换 ----------
   演示代码只写 PLOT_COLORS.accent 这类语义名，禁止写死颜色值。 */
const C = {
  axis: '#818b98', grid: 'rgba(31,35,40,.08)', text: '#59636e',
  accent: '#0969da', cyan: '#1b7c83', warn: '#9a6700',
  ok: '#1a7f37', danger: '#cf222e', surface: '#f6f8fa'
};

function plotVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  return (v || '').trim() || fallback;
}
function plotDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }

function refreshPlotPalette() {
  const dark = plotDark();
  C.accent = plotVar('--accent', dark ? '#4493f8' : '#0969da');
  C.ok = plotVar('--ok', dark ? '#3fb950' : '#1a7f37');
  C.warn = plotVar('--warn', dark ? '#d29922' : '#9a6700');
  C.danger = plotVar('--danger', dark ? '#f85149' : '#cf222e');
  C.text = plotVar('--fg-muted', dark ? '#9198a1' : '#59636e');
  C.axis = plotVar('--fg-subtle', dark ? '#6e7681' : '#818b98');
  C.surface = plotVar('--bg-soft', dark ? '#161b22' : '#f6f8fa');
  // 第四条曲线色：调色板里没有独立色相，青绿只在绘图器内部使用
  C.cyan = dark ? '#39c5cf' : '#1b7c83';
  C.grid = dark ? 'rgba(230,237,243,.10)' : 'rgba(31,35,40,.08)';
}

/* 所有实例登记在册：切换主题时统一重绘 */
const PLOTS = [];
const clampNum = (v, a, b) => Math.min(b, Math.max(a, v));
/* 缩放上限：向外最多 50 倍，向内最多 600 倍 */
const Z_MIN = 0.02, Z_MAX = 600;

class Plot {
  constructor(el, opts = {}) {
    /* equal: true —— 强制等比例（1 个单位在 x、y 方向占相同像素）。
       这是数学正确性的底线：不等比时，(1,1) 会被画成长条、圆会变成椭圆、
       45° 直线会变陡，学生看到的是错的图形。
       少数「不是几何图形」的演示（如以项数 n 为横轴的数列散点图）才可关掉，
       且必须在图注里写明「纵轴未按比例」。 */
    this.o = Object.assign({
      xmin: -5, xmax: 5, ymin: -3, ymax: 3,
      grid: true, axes: true, ticks: true, tall: false,
      equal: true,
      boxH: 340,          // 等比例时允许占用的最大高度，宽度由比例反推
      interactive: true   // 滚轮/双指缩放、拖拽平移、双击复位
    }, opts);

    refreshPlotPalette();

    /* base = 初始取景，也是「复位」的目标；view = 当前实际显示的范围。
       两者分开，才能做到「拖过之后一切照常重绘，但一键能回到原图」。 */
    this.base = {
      xmin: this.o.xmin, xmax: this.o.xmax,
      ymin: this.o.ymin, ymax: this.o.ymax
    };
    this.z = 1;
    this.cx = (this.base.xmin + this.base.xmax) / 2;
    this.cy = (this.base.ymin + this.base.ymax) / 2;
    this.view = Object.assign({}, this.base);

    this.wrap = document.createElement('div');
    this.wrap.className = 'demo-canvas' + (this.o.tall ? ' tall' : '');
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'display:block;max-width:100%';
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute('role', 'img');
    this.wrap.appendChild(this.canvas);
    el.appendChild(this.wrap);
    this.ctx = this.canvas.getContext('2d');
    this.onResize = null;
    this._ro = null;
    this._raf = 0;

    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(this.wrap);
    } else {
      window.addEventListener('resize', () => this.resize());
    }
    this._applySize();
    this._syncView();
    if (this.o.interactive) this._initInteract();

    PLOTS.push(this);
    this._label();
  }

  /* 只重算画布尺寸，不触发 onResize。
     setRange 走这里，避免「setRange → resize → onResize(draw) → setRange」死循环。 */
  _applySize() {
    const boxW = this.wrap.clientWidth || 600;
    const boxH = this.o.boxH || 340;
    const xr = (this.base.xmax - this.base.xmin) || 1;
    const yr = (this.base.ymax - this.base.ymin) || 1;

    let w, h;
    if (this.o.equal) {
      // 取能同时塞进「容器宽」和「高度上限」的最大单位长度：
      // 画布一定装得下全部范围，且 x 单位 = y 单位，图形不会被拉伸。
      const unit = Math.min(boxW / xr, boxH / yr);
      w = Math.round(xr * unit);
      h = Math.round(yr * unit);
    } else {
      w = Math.round(boxW);
      h = Math.round(boxH);
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w; this.H = h;
  }

  /* 由 (中心, 缩放倍数) 推出显示范围。
     等比例模式下画布宽高比恒等于 base 的宽高比，所以 view 的宽高比也自动相同，
     ux === uy 始终成立——缩放平移不会破坏比例。 */
  _syncView() {
    const bxr = (this.base.xmax - this.base.xmin) || 1;
    const byr = (this.base.ymax - this.base.ymin) || 1;
    const vxr = bxr / this.z, vyr = byr / this.z;
    this.view.xmin = this.cx - vxr / 2;
    this.view.xmax = this.cx + vxr / 2;
    this.view.ymin = this.cy - vyr / 2;
    this.view.ymax = this.cy + vyr / 2;
    this.ux = this.W / vxr;
    this.uy = this.H / vyr;
  }

  resize() {
    this._applySize();
    this._syncView();
    this.redraw();
    this._label();
  }

  /** 重画（交给演示自己的 onResize；没有就用默认坐标系重绘） */
  redraw() {
    if (this.onResize) this.onResize();
    else this.clear();
    this._syncZoomLabel();
  }

  /* 修改初始取景并重算画布尺寸（窗口随参数变化的演示用）。
     会同时把缩放平移复位到新范围——「换了取景」本来就该从新取景看起。 */
  setRange(r) {
    Object.assign(this.base, r);
    Object.assign(this.o, r);
    this.z = 1;
    this.cx = (this.base.xmin + this.base.xmax) / 2;
    this.cy = (this.base.ymin + this.base.ymax) / 2;
    this._applySize();
    this._syncView();
    this._syncZoomLabel();
  }

  /* 回到构造时的取景（双击图内 / 点「复位」） */
  resetView() {
    this.z = 1;
    this.cx = (this.base.xmin + this.base.xmax) / 2;
    this.cy = (this.base.ymin + this.base.ymax) / 2;
    this._syncView();
    this.redraw();
  }

  /* 缩放到 factor 倍（>1 放大），保持屏幕点 (px,py) 下的数学点不动 */
  zoomAt(px, py, factor) {
    const nz = clampNum(this.z * factor, Z_MIN, Z_MAX);
    if (Math.abs(nz - this.z) < 1e-9) return;
    const mx = this.view.xmin + px / this.ux;
    const my = this.view.ymax - py / this.uy;
    this.z = nz;
    this._syncView();
    this.cx = mx + (this.view.xmax - this.view.xmin) / 2 - px / this.ux;
    this.cy = my - (this.view.ymax - this.view.ymin) / 2 + py / this.uy;
    this._clampCenter();
    this._syncView();
    this._schedule();
  }

  /** 按屏幕像素平移（向右拖 dx>0 → 图形跟着手指走） */
  panPixels(dx, dy) {
    this.cx -= dx / this.ux;
    this.cy += dy / this.uy;
    this._clampCenter();
    this._syncView();
    this._schedule();
  }

  /* 别让用户拖到完全没有参照物的空白里找不回来 */
  _clampCenter() {
    const bxr = (this.base.xmax - this.base.xmin) || 1;
    const byr = (this.base.ymax - this.base.ymin) || 1;
    this.cx = clampNum(this.cx, this.base.xmin - bxr, this.base.xmax + bxr);
    this.cy = clampNum(this.cy, this.base.ymin - byr, this.base.ymax + byr);
  }

  _schedule() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      this.redraw();
    });
  }

  /* ---------- 坐标 → 像素（全部基于 view） ---------- */
  px(x) { return (x - this.view.xmin) / (this.view.xmax - this.view.xmin) * this.W; }
  py(y) { return this.H - (y - this.view.ymin) / (this.view.ymax - this.view.ymin) * this.H; }
  sx(v) { return Math.abs(v) * this.ux; }
  sy(v) { return Math.abs(v) * this.uy; }
  /** 每单位多少像素（等比例下 ux === uy；画圆 / 判等比用它） */
  unit() { return this.ux; }

  clear() {
    const { ctx, W, H, o, view } = this;

    /* 这里只画「底图」：底色、网格、坐标轴。
       刻度数字和不等比告示放到 _overlay() 里画——必须压在各演示自己画的
       色带、曲线、标记之上，否则会被半透明填充盖住，看不清数值。
       overlay 用 rAF 排在本次重绘之后，各演示不需要做任何配合。 */
    ctx.clearRect(0, 0, W, H);
    this._scheduleOverlay();

    /* 刻度密度跟着画布像素走：窄图（等比例下常只有 200 多像素宽）
       如果硬按 8 等分排，数字会挤成一团。这里按「每 70~80px 一个刻度」反推。 */
    const divX = clampNum(Math.round(W / 78), 2, 9);
    const divY = clampNum(Math.round(H / 72), 2, 8);
    const stepX = this.niceStep((view.xmax - view.xmin) / divX);
    const stepY = this.niceStep((view.ymax - view.ymin) / divY);
    this._stepX = stepX; this._stepY = stepY;

    if (o.grid) {
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = Math.ceil(view.xmin / stepX) * stepX; x <= view.xmax; x += stepX) {
        const p = Math.round(this.px(x)) + .5;
        ctx.moveTo(p, 0); ctx.lineTo(p, H);
      }
      for (let y = Math.ceil(view.ymin / stepY) * stepY; y <= view.ymax; y += stepY) {
        const p = Math.round(this.py(y)) + .5;
        ctx.moveTo(0, p); ctx.lineTo(W, p);
      }
      ctx.stroke();
    }

    if (o.axes) {
      ctx.strokeStyle = C.axis; ctx.lineWidth = 1.3;
      ctx.beginPath();
      const y0 = this.py(0), x0 = this.px(0);
      if (y0 >= 0 && y0 <= H) { const p = Math.round(y0) + .5; ctx.moveTo(0, p); ctx.lineTo(W, p); }
      if (x0 >= 0 && x0 <= W) { const p = Math.round(x0) + .5; ctx.moveTo(p, 0); ctx.lineTo(p, H); }
      ctx.stroke();
    }
  }

  _scheduleOverlay() {
    if (this._ovraf) return;
    this._ovraf = requestAnimationFrame(() => {
      this._ovraf = 0;
      this._overlay();
    });
  }

  /* 压在最上层：刻度数字、原点、不等比告示 */
  _overlay() {
    const { ctx, W, H, o, view } = this;
    if (o.axes && o.ticks !== false) this._axes(this._stepX, this._stepY);

    /* 不等比坐标系必须在图上写明，否则学生会把看到的斜率、形状当成真实比例。
       有工具条时（可交互）改由工具条承载，避免文字压在刻度上；
       没有工具条时才直接画在画布右下角。 */
    if (!o.equal && !o.hideAspectNote && !this._hud) {
      const note = o.aspectNote || '纵轴刻度已放大，仅示意趋势';
      ctx.save();
      ctx.font = '11px -apple-system, "PingFang SC", sans-serif';
      const tw = ctx.measureText(note).width;
      ctx.globalAlpha = .94;
      ctx.fillStyle = C.surface;
      ctx.fillRect(W - tw - 14, H - 20, tw + 10, 16);
      ctx.fillStyle = C.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(note, W - tw - 9, H - 12);
      ctx.restore();
    }
  }

  /* 刻度数字 + 原点标记。
     平移后原点可能移出画布：此时轴已经不画了（画在边缘等于撒谎），
     但刻度数字贴边显示，学生仍然能读出当前窗口的尺度。 */
  _axes(stepX, stepY) {
    const { ctx, W, H, view } = this;
    const y0 = this.py(0), x0 = this.px(0);
    const hasX = y0 >= 0 && y0 <= H;
    const hasY = x0 >= 0 && x0 <= W;

    /* 先描一圈画布底色的"光晕"，压在网格线、色带、曲线上也能看清 */
    const label = (str, x, y, align, baseline) => {
      ctx.save();
      ctx.font = '10.5px -apple-system, "PingFang SC", sans-serif';
      ctx.textAlign = align; ctx.textBaseline = baseline;
      ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = C.surface;
      ctx.strokeText(str, x, y);
      ctx.fillStyle = C.text;
      ctx.fillText(str, x, y);
      ctx.restore();
    };

    // 横轴刻度：有 x 轴时贴着轴下方；轴不在画布内则贴底边
    const xRow = hasX ? clampNum(y0 + 3, 2, H - 16) : H - 15;
    const xBase = hasX && y0 > H - 18 ? 'bottom' : 'top';
    let lastX = -1e9;
    ctx.font = '10.5px -apple-system, "PingFang SC", sans-serif'; // measureText 要用同一字号
    if (stepX > 0) {
      for (let x = Math.ceil(view.xmin / stepX) * stepX; x <= view.xmax + 1e-9; x += stepX) {
        if (Math.abs(x) < stepX / 1e6) continue;
        const p = this.px(x);
        const s = this._tickText(x, stepX);
        const w = ctx.measureText(s).width;
        if (p - w / 2 < lastX + 6) continue;
        if (p < w / 2 + 2 || p > W - w / 2 - 2) continue;
        label(s, p, xRow, 'center', xBase);
        lastX = p + w / 2;
      }
    }

    /* 纵轴刻度放在轴的哪一侧：优先轴左侧（教材惯例）；
       左侧放不下就挤到画布最左边（仍在轴左侧）；轴贴边时才放到右侧。 */
    const YW = 22; // 刻度文字大致宽度（"0.5" / "1.25" 这一档）
    let yCol, yAlign;
    if (!hasY) { yCol = 6; yAlign = 'left'; }
    else if (x0 >= YW + 8) { yCol = x0 - 5; yAlign = 'right'; }
    else if (x0 >= 12) { yCol = 3; yAlign = 'left'; }
    else { yCol = x0 + 4; yAlign = 'left'; }
    let lastY = 1e9;
    if (stepY > 0) {
      for (let y = Math.ceil(view.ymin / stepY) * stepY; y <= view.ymax + 1e-9; y += stepY) {
        if (Math.abs(y) < stepY / 1e6) continue;
        const p = this.py(y);
        if (p < 8 || p > H - 8) continue;
        if (lastY - p < 14) continue;
        label(this._tickText(y, stepY), yCol, p, yAlign, 'middle');
        lastY = p;
      }
    }

    // 原点
    if (hasX && hasY && x0 > 14 && x0 < W - 14 && y0 > 14 && y0 < H - 14) {
      label('O', x0 - 5, y0 + 4, 'right', 'top');
    }
  }

  /* 刻度文字：小数位数由步长决定，0.25 要写成 0.25 而不是 0.3 */
  _tickText(v, step) {
    const dec = (String(+(+step).toFixed(8)).split('.')[1] || '').length;
    let s = v.toFixed(dec);
    if (/^-0(\.0+)?$/.test(s)) s = s.slice(1);
    return s;
  }

  niceStep(raw) {
    const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    const n = raw / p;
    return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p;
  }

  _style(o, def) {
    this.ctx.strokeStyle = o.color || def;
    this.ctx.lineWidth = o.width || 2;
    this.ctx.setLineDash(o.dash ? [6, 5] : []);
    this.ctx.globalAlpha = o.alpha ?? 1;
  }
  _end() { this.ctx.setLineDash([]); this.ctx.globalAlpha = 1; }

  line(x1, y1, x2, y2, o = {}) {
    this._style(o, C.accent);
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(this.px(x1), this.py(y1));
    ctx.lineTo(this.px(x2), this.py(y2));
    ctx.stroke(); this._end();
  }

  /* 画函数曲线。
     dense: 靠近 0 的点加密（用于 sin(1/x) 这类在原点附近无限振荡的函数）。
       均匀采样在 |x| 小时会漏掉全部振荡，画出来是一条假直线。
     采样比例按 t^3 分布：越靠近 0 越密，同时保持整段覆盖。 */
  curve(fn, o = {}) {
    this._style(o, C.accent);
    const ctx = this.ctx;
    const a = o.from ?? this.view.xmin, b = o.to ?? this.view.xmax;
    const n = o.samples || 600;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= n; i++) {
      let t = i / n;                  // 0..1
      if (o.dense) {
        // 把均匀参数映射成「两端密、中间也密」：以 0 为中心做幂次压缩
        const s2 = t * 2 - 1;         // -1..1
        const k = Math.sign(s2) * Math.pow(Math.abs(s2), 3);
        t = (k + 1) / 2;
      }
      const x = a + (b - a) * t;
      const y = fn(x);
      if (!Number.isFinite(y) || Math.abs(this.py(y)) > 1e6) { started = false; continue; }
      const px = this.px(x), py = this.py(y);
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke(); this._end();
  }

  /** 水平方向填充带 [x1,x2] × [y1,y2]（用户坐标） */
  rect(x1, y1, x2, y2, o = {}) {
    const ctx = this.ctx;
    const a = this.px(Math.min(x1, x2)), b = this.px(Math.max(x1, x2));
    const t = this.py(Math.max(y1, y2)), d = this.py(Math.min(y1, y2));
    ctx.save();
    ctx.globalAlpha = o.alpha ?? .16;
    ctx.fillStyle = o.fill || C.accent;
    ctx.fillRect(a, t, b - a, d - t);
    ctx.restore();
    if (o.stroke) { this._style({ color: o.stroke, dash: o.dash, width: o.width || 1.4 }, o.stroke); ctx.strokeRect(a, t, b - a, d - t); this._end(); }
  }

  polygon(pts, o = {}) {
    const ctx = this.ctx;
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(this.px(p[0]), this.py(p[1])) : ctx.moveTo(this.px(p[0]), this.py(p[1])));
    ctx.closePath();
    if (o.fill) { ctx.save(); ctx.globalAlpha = o.alpha ?? .2; ctx.fillStyle = o.fill; ctx.fill(); ctx.restore(); }
    if (o.stroke !== false) { this._style(o, o.color || C.accent); ctx.stroke(); this._end(); }
  }

  circle(cx, cy, r, o = {}) {
    if (!this.o.equal) {
      // 不等比时画"圆"必然是椭圆，这会误导学生，直接报错并要求改为等比例
      console.warn('[plot] circle() 需要等比例坐标系，请设置 equal:true');
    }
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(this.px(cx), this.py(cy), this.unit() * Math.abs(r), 0, Math.PI * 2);
    if (o.fill) { ctx.save(); ctx.globalAlpha = o.alpha ?? .15; ctx.fillStyle = o.fill; ctx.fill(); ctx.restore(); }
    this._style(o, o.color || C.accent); ctx.stroke(); this._end();
  }

  dot(x, y, o = {}) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(this.px(x), this.py(y), o.r || 4, 0, Math.PI * 2);
    ctx.fillStyle = o.fill || o.color || C.accent; ctx.fill();
    if (o.stroke) { ctx.lineWidth = o.strokeWidth || 2; ctx.strokeStyle = o.stroke; ctx.stroke(); }
  }

  text(x, y, str, o = {}) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = o.color || C.text;
    ctx.font = `${o.size || 12}px ${o.mono ? 'monospace' : '-apple-system, "PingFang SC", sans-serif'}`;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'middle';
    ctx.fillText(str, this.px(x), this.py(y));
    ctx.restore();
  }

  /** 屏幕像素文字（不受坐标变换影响，适合角标） */
  label(px, py, str, o = {}) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = o.color || C.text;
    ctx.font = `${o.size || 12}px sans-serif`;
    ctx.textAlign = o.align || 'left';
    ctx.fillText(str, px, py);
    ctx.restore();
  }

  /** 正方形（数学意义的正方形，不是屏幕矩形） */
  square(cx, cy, side, o = {}) {
    const h = side / 2;
    this.polygon([[cx - h, cy - h], [cx + h, cy - h], [cx + h, cy + h], [cx - h, cy + h]], o);
  }

  /** 直角标记：在顶点 v 处、朝 d1/d2 两个方向画小方块，表示 90° */
  rightAngle(v, d1, d2, size = .18, o = {}) {
    const a = [v[0] + d1[0] * size, v[1] + d1[1] * size];
    const b = [v[0] + d1[0] * size + d2[0] * size, v[1] + d1[1] * size + d2[1] * size];
    const c = [v[0] + d2[0] * size, v[1] + d2[1] * size];
    this.polygon([a, b, c], Object.assign({ stroke: C.axis, width: 1.2 }, o));
  }

  /** 角度弧：以 v 为顶点，从 a1 到 a2（弧度），半径 r（数学单位） */
  arcAngle(v, r, a1, a2, o = {}) {
    const ctx = this.ctx;
    const u = this.unit();
    ctx.beginPath();
    // canvas 的 y 轴向下，角度取反
    ctx.arc(this.px(v[0]), this.py(v[1]), u * r, -a2, -a1);
    this._style(o, C.accent); ctx.stroke(); this._end();
  }

  /* ---------- 交互 ---------- */

  _initInteract() {
    const cv = this.canvas, wrap = this.wrap;
    wrap.classList.add('is-interactive');

    /* 工具条：缩放 / 复位。放在画布外层的右上角，
       窄图（等比例下画布比容器窄）时正好落在留白里，不遮图。 */
    const hud = document.createElement('div');
    hud.className = 'plot-hud';
    const note = (!this.o.equal && !this.o.hideAspectNote)
      ? `<span class="ph-note">${this.o.aspectNote || '纵轴刻度已放大，仅示意趋势'}</span>` : '';
    hud.innerHTML = note +
      '<span class="ph-tip">滚轮缩放 · 拖拽平移</span>' +
      '<button class="ph-btn" type="button" data-zout aria-label="缩小" title="缩小">−</button>' +
      '<span class="ph-zoom" data-z>100%</span>' +
      '<button class="ph-btn" type="button" data-zin aria-label="放大" title="放大">＋</button>' +
      '<button class="ph-btn ph-reset" type="button" data-zreset title="回到初始取景（也可双击图内）">复位</button>';
    wrap.appendChild(hud);
    this._hud = hud;
    this._zoomLabel = hud.querySelector('[data-z]');
    hud.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.zin !== undefined) this.zoomAt(this.W / 2, this.H / 2, 1.25);
      else if (b.dataset.zout !== undefined) this.zoomAt(this.W / 2, this.H / 2, 1 / 1.25);
      else if (b.dataset.zreset !== undefined) this.resetView();
    });

    /* 滚轮缩放：以指针位置为中心，因此放大后指针下的点还在原处 */
    wrap.addEventListener('wheel', e => {
      e.preventDefault();
      const r = cv.getBoundingClientRect();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const f = Math.exp(-dy * (e.ctrlKey ? 0.006 : 0.0016));
      this.zoomAt(e.clientX - r.left, e.clientY - r.top, clampNum(f, .5, 2));
    }, { passive: false });

    /* 拖拽平移 / 双指缩放：统一用 Pointer Events，鼠标、触摸、手写笔同一套逻辑 */
    const pts = new Map();
    let drag = null, pinch = null;
    const dist = () => {
      const [a, b] = [...pts.values()];
      return Math.hypot(a.x - b.x, a.y - b.y) || 1;
    };
    const mid = () => {
      const [a, b] = [...pts.values()];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };

    cv.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      cv.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) drag = { x: e.clientX, y: e.clientY };
      else if (pts.size === 2) { drag = null; pinch = Object.assign({ d: dist() }, mid()); }
      wrap.classList.add('is-dragging');
      // 只对触摸/手写笔阻止默认行为（避免页面跟着滑）；
      // 鼠标若也 preventDefault，浏览器不再派发 dblclick，双击复位就失效了。
      if (e.pointerType !== 'mouse') e.preventDefault();
    });

    cv.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = cv.getBoundingClientRect();
      if (pts.size === 2 && pinch) {
        const m = mid(), d = dist();
        this.zoomAt(m.x - r.left, m.y - r.top, d / pinch.d);
        this.panPixels(m.x - pinch.x, m.y - pinch.y);
        pinch = Object.assign({ d }, m);
      } else if (pts.size === 1 && drag) {
        this.panPixels(e.clientX - drag.x, e.clientY - drag.y);
        drag = { x: e.clientX, y: e.clientY };
      }
    });

    const up = e => {
      pts.delete(e.pointerId);
      pinch = null;
      if (pts.size === 1) { const p = [...pts.values()][0]; drag = { x: p.x, y: p.y }; }
      if (!pts.size) { drag = null; wrap.classList.remove('is-dragging'); }
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);

    cv.addEventListener('dblclick', () => this.resetView());

    /* 键盘也能操作：方向键平移、+/- 缩放、0 复位 */
    cv.addEventListener('keydown', e => {
      const k = e.key;
      const step = 60;
      const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (map[k]) { this.panPixels(map[k][0], map[k][1]); e.preventDefault(); }
      else if (k === '+' || k === '=') { this.zoomAt(this.W / 2, this.H / 2, 1.25); e.preventDefault(); }
      else if (k === '-' || k === '_') { this.zoomAt(this.W / 2, this.H / 2, 1 / 1.25); e.preventDefault(); }
      else if (k === '0' || k === 'Home') { this.resetView(); e.preventDefault(); }
    });
  }

  _syncZoomLabel() {
    if (!this._zoomLabel) return;
    const pct = Math.round(this.z * 100);
    this._zoomLabel.textContent = pct + '%';
    this.wrap.classList.toggle('is-zoomed', Math.abs(this.z - 1) > 0.001);
  }

  _label() {
    const name = this.o.title || this.o.ariaLabel || '函数图像';
    this.canvas.setAttribute('aria-label',
      `${name}，可拖拽平移、滚轮缩放，双击复位`);
  }

  destroy() {
    if (this._ro) this._ro.disconnect();
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._ovraf) cancelAnimationFrame(this._ovraf);
    const i = PLOTS.indexOf(this);
    if (i >= 0) PLOTS.splice(i, 1);
    this.wrap.remove();
  }
}

window.PLOT_COLORS = C;

/* 切换深浅色后重绘所有图像（画布颜色是取出来的值，不会自己跟着 CSS 变） */
document.addEventListener('theme:change', () => {
  refreshPlotPalette();
  PLOTS.forEach(p => p.redraw());
});

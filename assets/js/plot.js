/* 轻量 Canvas 2D 绘图器：坐标系、网格、曲线、点、区域填充
   用于需要精细逐帧控制的交互演示（JSXGraph 仍用于通用 data-mount="graph" 组件） */

const C = {
  axis: '#94a3b8', grid: 'rgba(148,163,184,.22)',
  text: '#64748b', accent: '#4f46e5', cyan: '#0891b2',
  warn: '#d97706', ok: '#059669', danger: '#dc2626'
};

class Plot {
  constructor(el, opts = {}) {
    /* equal: true —— 强制等比例（1 个单位在 x、y 方向占相同像素）。
       这是数学正确性的底线：不等比时，(1,1) 会被画成长条、圆会变成椭圆、
       45° 直线会变陡，学生看到的是错的图形。
       少数「不是几何图形」的演示（如以项数 n 为横轴的数列散点图）才可关掉，
       且必须在图注里写明「纵轴未按比例」。 */
    this.o = Object.assign({
      xmin: -5, xmax: 5, ymin: -3, ymax: 3,
      grid: true, axes: true, tall: false,
      equal: true,
      boxH: 340        // 等比例时允许占用的最大高度，宽度由比例反推
    }, opts);
    this.wrap = document.createElement('div');
    this.wrap.className = 'demo-canvas' + (this.o.tall ? ' tall' : '');
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'display:block;max-width:100%';
    this.wrap.appendChild(this.canvas);
    el.appendChild(this.wrap);
    this.ctx = this.canvas.getContext('2d');
    this.onResize = null;
    this._ro = null;
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(this.wrap);
    } else {
      window.addEventListener('resize', () => this.resize());
    }
    this.resize();
  }

  /* 只重算画布尺寸，不触发 onResize。
     setRange 走这里，避免「setRange → resize → onResize(draw) → setRange」死循环。 */
  _applySize() {
    const boxW = this.wrap.clientWidth || 600;
    const boxH = this.o.boxH || 340;
    const xr = (this.o.xmax - this.o.xmin) || 1;
    const yr = (this.o.ymax - this.o.ymin) || 1;

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

  resize() {
    this._applySize();
    if (this.onResize) this.onResize();
    else this.clear();
  }

  /* 修改显示范围并重算画布尺寸（动态缩放窗口的演示用）。
     等比例模式下必须走这个方法：直接改 o.xmax 不会重算画布，比例就错了。 */
  setRange(r) {
    Object.assign(this.o, r);
    this._applySize();
  }

  /* 坐标 → 像素。等比例模式下 W/xr === H/yr，所以下面两式用的是同一个单位长度，
     几何形状不会被拉伸（圆是圆、45° 是 45°）。 */
  px(x) { return (x - this.o.xmin) / (this.o.xmax - this.o.xmin) * this.W; }
  py(y) { return this.H - (y - this.o.ymin) / (this.o.ymax - this.o.ymin) * this.H; }
  /* 数学长度 → 像素长度。等比例下 sx(v) === sy(v)。 */
  sx(v) { return Math.abs(v) * this.W / (this.o.xmax - this.o.xmin); }
  sy(v) { return Math.abs(v) * this.H / (this.o.ymax - this.o.ymin); }
  /** 每单位多少像素（用于判断是否等比、以及画圆 / 正方形） */
  unit() { return this.W / (this.o.xmax - this.o.xmin); }

  clear() {
    const { ctx, W, H, o } = this;
    ctx.clearRect(0, 0, W, H);
    if (o.grid) {
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      const stepX = this.niceStep((o.xmax - o.xmin) / 8);
      const stepY = this.niceStep((o.ymax - o.ymin) / 6);
      ctx.beginPath();
      for (let x = Math.ceil(o.xmin / stepX) * stepX; x <= o.xmax; x += stepX) {
        const p = Math.round(this.px(x)) + .5;
        ctx.moveTo(p, 0); ctx.lineTo(p, H);
      }
      for (let y = Math.ceil(o.ymin / stepY) * stepY; y <= o.ymax; y += stepY) {
        const p = Math.round(this.py(y)) + .5;
        ctx.moveTo(0, p); ctx.lineTo(W, p);
      }
      ctx.stroke();
    }
    if (o.axes) {
      ctx.strokeStyle = C.axis; ctx.lineWidth = 1.4;
      ctx.beginPath();
      const y0 = Math.max(0, Math.min(H, this.py(0)));
      const x0 = Math.max(0, Math.min(W, this.px(0)));
      ctx.moveTo(0, y0); ctx.lineTo(W, y0);
      ctx.moveTo(x0, 0); ctx.lineTo(x0, H);
      ctx.stroke();
    }
    /* 不等比坐标系必须在图上写明，否则学生会把看到的斜率、形状当成真实比例。
       这条提示由绘图器统一加，不依赖各演示作者记得。 */
    if (!o.equal && !o.hideAspectNote) {
      const note = o.aspectNote || '纵轴刻度已放大，仅示意趋势';
      ctx.save();
      ctx.font = '11px -apple-system, "PingFang SC", sans-serif';
      const tw = ctx.measureText(note).width;
      ctx.globalAlpha = .9;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fillRect(W - tw - 14, H - 20, tw + 10, 16);
      ctx.fillStyle = C.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(note, W - tw - 9, H - 12);
      ctx.restore();
    }
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
    const a = o.from ?? this.o.xmin, b = o.to ?? this.o.xmax;
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

  destroy() { if (this._ro) this._ro.disconnect(); this.wrap.remove(); }
}

window.PLOT_COLORS = C;

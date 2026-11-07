/* 轻量 Canvas 2D 绘图器：坐标系、网格、曲线、点、区域填充
   用于需要精细逐帧控制的交互演示（JSXGraph 仍用于通用 data-mount="graph" 组件） */

const C = {
  axis: '#94a3b8', grid: 'rgba(148,163,184,.22)',
  text: '#64748b', accent: '#4f46e5', cyan: '#0891b2',
  warn: '#d97706', ok: '#059669', danger: '#dc2626'
};

class Plot {
  constructor(el, opts = {}) {
    this.o = Object.assign({
      xmin: -5, xmax: 5, ymin: -3, ymax: 3,
      grid: true, axes: true, tall: false
    }, opts);
    this.wrap = document.createElement('div');
    this.wrap.className = 'demo-canvas' + (this.o.tall ? ' tall' : '');
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'width:100%;height:100%;display:block';
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

  resize() {
    const w = this.wrap.clientWidth || 600;
    const h = this.wrap.clientHeight || 330;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w; this.H = h;
    if (this.onResize) this.onResize();
    else this.clear();
  }

  px(x) { return (x - this.o.xmin) / (this.o.xmax - this.o.xmin) * this.W; }
  py(y) { return this.H - (y - this.o.ymin) / (this.o.ymax - this.o.ymin) * this.H; }
  sx(v) { return Math.abs(v) * this.W / (this.o.xmax - this.o.xmin); }
  sy(v) { return Math.abs(v) * this.H / (this.o.ymax - this.o.ymin); }

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

  curve(fn, o = {}) {
    this._style(o, C.accent);
    const ctx = this.ctx;
    const a = o.from ?? this.o.xmin, b = o.to ?? this.o.xmax;
    const n = o.samples || 600;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= n; i++) {
      const x = a + (b - a) * i / n;
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
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(this.px(cx), this.py(cy), this.sx(r), 0, Math.PI * 2);
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

  destroy() { if (this._ro) this._ro.disconnect(); this.wrap.remove(); }
}

window.PLOT_COLORS = C;

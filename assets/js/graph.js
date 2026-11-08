/* JSXGraph 薄封装：所有章节的图像演示共用这一层 */

let seq = 0;

const HELPER = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  exp: Math.exp, log: Math.log, ln: Math.log, log2: Math.log2,
  sqrt: Math.sqrt, abs: Math.abs, pow: Math.pow,
  floor: Math.floor, ceil: Math.ceil, sign: Math.sign,
  min: Math.min, max: Math.max, random: Math.random,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  PI: Math.PI, E: Math.E
};

/** 把 "sin(x)/x" 这类自写表达式转成可求值函数（表达式均来自本站静态代码） */
function toFn(expr) {
  if (typeof expr === 'function') return expr;
  const names = Object.keys(HELPER);
  const body = `const {${names.join(',')}} = H; return (${expr});`;
  const compiled = new Function('x', 'H', body);
  return x => compiled(x, HELPER);
}

/** 建一块画布并初始化 board，返回 { board, box } */
function createBoard(el, opts = {}) {
  if (!hasLib('jsxgraph')) { libError(el, 'JSXGraph'); return null; }
  const box = document.createElement('div');
  box.className = 'demo-canvas' + (opts.tall ? ' tall' : '');
  box.id = `jxg-board-${++seq}`;
  el.appendChild(box);

  const xmin = opts.xmin ?? -5, xmax = opts.xmax ?? 5;
  const ymin = opts.ymin ?? -3, ymax = opts.ymax ?? 3;
  const board = window.JXG.JSXGraph.initBoard(box.id, {
    boundingbox: [xmin, ymax, xmax, ymin],
    axis: opts.axis !== false,
    grid: opts.grid ?? true,
    showCopyright: false,
    /* 缩放/平移默认开启：学生要能自己把图放大看清楚、拖到想看的地方。
       keepaspectratio 下 JSXGraph 会把 y 方向一起缩放，比例不会坏。 */
    showNavigation: opts.interactive !== false,
    pan: { enabled: opts.interactive !== false, needShift: false },
    zoom: { enabled: opts.interactive !== false, needShift: false, wheel: true, min: 0.1, max: 40 },
    /* 必须保持等比例：1 个单位在横纵方向占同样像素。
       关掉的话 (1,1) 会被拉成长条、圆变成椭圆、斜率失真——
       学生看到的是错的图形。只有「横轴不是同一量纲」的图
       （如以项数 n、时间为横轴）才可显式传 equal: false。 */
    keepaspectratio: opts.equal !== false
  });

  // JSXGraph 在 keepaspectratio 下会自动调整 boundingbox，
  // 若纵横比与容器差太多会留白，这里提示作者调整范围
  if (opts.equal !== false) {
    const bb = board.getBoundingBox();
    const boxW = box.clientWidth || 1, boxH = box.clientHeight || 1;
    const ratioBB = (bb[2] - bb[0]) / (bb[1] - bb[3]);
    const ratioBox = boxW / boxH;
    if (Math.abs(ratioBB / ratioBox - 1) > 0.6) {
      console.info('[graph] 显示范围的宽高比与容器差得较多，会留白；建议调整 xmin/xmax/ymin/ymax 或传 equal:false');
    }
  }
  return { board, box };
}

/** 在已有 board 上画一条函数曲线 */
function addCurve(board, fn, opts = {}) {
  const f = toFn(fn);
  const a = opts.from ?? board.getBoundingBox()[0];
  const b = opts.to ?? board.getBoundingBox()[2];
  return board.create('functiongraph', [f, a, b], {
    strokeColor: opts.color || '#4f46e5',
    strokeWidth: opts.width || 2.4,
    dash: opts.dash || 0,
    fixed: true,
    highlight: false,
    name: opts.name || ''
  });
}

/** 完整封装：一块画布 + 一条可更新的函数曲线 */
function mountGraph(el, opts = {}) {
  const made = createBoard(el, opts);
  if (!made) return null;
  const { board, box } = made;
  let curve = opts.fn ? addCurve(board, opts.fn, opts) : null;

  return {
    board, box,
    get curve() { return curve; },
    update(fn) {
      if (curve) board.removeObject(curve);
      curve = addCurve(board, fn, opts);
      board.update();
      return curve;
    },
    add(fn, o = {}) { return addCurve(board, fn, o); },
    reset() { board.removeAllObjects(); board.update(); },
    destroy() { try { window.JXG.JSXGraph.freeBoard(board); } catch (_) {} box.remove(); }
  };
}

/* 演示组件通用外壳：所有章节的 demo.js 复用这一层，禁止各章复制一份。
   页面里在 plot.js 之后、本章 demo.js 之前引入。 */

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
/** 按钮里的数学文字必须走 texInline，禁止用 x² 之类 Unicode 假上标 */
function btnRow(el, items) {
  const d = document.createElement('div');
  d.className = 'btn-row';
  items.forEach((it, i) => {
    const b = document.createElement('button');
    b.className = 'btn' + (i === 0 ? ' is-active' : '');
    b.type = 'button';
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

/** 演示下方的「先看什么」提示，与 readout 分开 */
function figureHint(el, text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  el.appendChild(p);
  return p;
}

/** 章节骨架里的占位演示：撰写阶段用，交付前必须全部替换（check-demos.py 会拦） */
function placeholderDemo(el, name) {
  const p = new Plot(el, { xmin: -3, xmax: 3, ymin: -2, ymax: 2, grid: true });
  p.clear();
  p.curve(x => x, { color: PLOT_COLORS.accent, width: 2.2 });
  const out = readout(el);
  out.textContent = `演示「${name}」尚未实现。`;
}

/** 统一装配：页面里所有 data-demo 一次挂完，并兜住单个演示的异常 */
function mountDemos(table) {
  document.querySelectorAll('[data-demo]').forEach(el => {
    const key = el.dataset.demo;
    const run = table[key];
    if (!run) {
      const box = document.createElement('div');
      box.className = 'lib-error';
      box.textContent = `演示「${key}」尚未实现`;
      el.appendChild(box);
      return;
    }
    try { run(el); }
    catch (err) {
      console.warn(`[demo] 演示 ${key} 初始化失败：`, err);
      const box = document.createElement('div');
      box.className = 'lib-error';
      box.textContent = `演示「${key}」初始化失败：${err.message}`;
      el.appendChild(box);
    }
  });
}

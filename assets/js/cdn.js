/* 统一 CDN 版本与依赖检查；加载失败时给出降级提示，不让页面白屏 */

const CDN = Object.freeze({
  katex: '0.16.11',
  jsxgraph: '1.8.0',
  gsap: '3.12.5',
  three: '0.160.0',
  g6: 'https://cdn.jsdelivr.net/npm/@antv/g6@4.8.24/dist/g6.min.js'
});

const CHECKS = {
  katex: () => !!window.katex,
  math: () => typeof window.renderMathInElement === 'function',
  jsxgraph: () => !!window.JXG && !!window.JXG.JSXGraph,
  gsap: () => !!window.gsap,
  g6: () => !!window.G6 && typeof window.G6.Graph === 'function'
};

function hasLib(name) {
  try { return !!(CHECKS[name] && CHECKS[name]()); }
  catch { return false; }
}

function libError(el, name) {
  if (!el) return;
  const box = document.createElement('div');
  box.className = 'lib-error';
  box.textContent = `组件「${name}」未能从 CDN 加载，这个演示暂时不可用；文字讲解不受影响。联网后刷新即可恢复。`;
  el.appendChild(box);
}

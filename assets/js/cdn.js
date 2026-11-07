/* 统一 CDN 版本与依赖检查；加载失败时给出降级提示，不让页面白屏 */

export const CDN = Object.freeze({
  katex: '0.16.11',
  jsxgraph: '1.8.0',
  gsap: '3.12.5',
  three: '0.160.0',
  mermaid: 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs'
});

const CHECKS = {
  katex: () => !!window.katex,
  math: () => typeof window.renderMathInElement === 'function',
  jsxgraph: () => !!window.JXG && !!window.JXG.JSXGraph,
  gsap: () => !!window.gsap
};

export function hasLib(name) {
  try { return !!(CHECKS[name] && CHECKS[name]()); }
  catch { return false; }
}

export function libError(el, name) {
  if (!el) return;
  const box = document.createElement('div');
  box.className = 'lib-error';
  box.textContent = `组件「${name}」未能从 CDN 加载，这个演示暂时不可用；文字讲解不受影响。联网后刷新即可恢复。`;
  el.appendChild(box);
}

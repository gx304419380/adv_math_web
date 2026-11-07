/* Mermaid 知识结构图：按需动态加载，失败时降级为纯文本大纲 */

import { CDN } from './cdn.js';

let seq = 0;
let loader = null;

function fallback(el, text) {
  el.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'mermaid-fallback';
  const p = document.createElement('p');
  p.className = 'lib-error';
  p.textContent = '知识结构图组件加载失败，以下为文字版大纲：';
  box.appendChild(p);
  const pre = document.createElement('pre');
  pre.style.cssText = 'white-space:pre-wrap;font-size:.85rem;line-height:1.7;';
  pre.textContent = text.replace(/^\s+/gm, '');
  box.appendChild(pre);
  el.appendChild(box);
}

export async function renderMindmap(el, text) {
  if (!el) return;
  const src = (text || el.textContent || '').trim();
  if (!src) return;
  try {
    loader = loader || import(/* @vite-ignore */ CDN.mermaid);
    const mod = await loader;
    const mermaid = mod.default || mod;
    const dark = document.documentElement.dataset.theme === 'dark';
    mermaid.initialize({
      startOnLoad: false,
      theme: dark ? 'dark' : 'default',
      securityLevel: 'loose',
      flowchart: { curve: 'basis', useMaxWidth: true }
    });
    const id = `mindmap-svg-${++seq}`;
    const { svg } = await mermaid.render(id, src);
    el.innerHTML = svg;
  } catch (err) {
    console.warn('[mindmap] 渲染失败，使用文字版：', err);
    fallback(el, src);
  }
}

/* 知识结构图 · AntV G6
   数据由页面内 <script type="application/json"> 提供：
   { "nodes":[{"id":"a","label":"映射与函数","kind":"root"}, ...],
     "edges":[{"source":"a","target":"b"}, ...] }
   kind: root(起点) / core(核心) / branch(分支) / end(出口) / normal
   支持拖拽画布、滚轮缩放、拖节点、悬停高亮、随容器自适应、主题切换重绘。 */

let g6Seq = 0;
const graphs = new WeakMap();

function readData(el, text) {
  const raw = el && el.querySelector('script[type="application/json"]');
  if (raw) {
    try {
      const d = JSON.parse(raw.textContent);
      if (d && Array.isArray(d.nodes) && d.nodes.length) return d;
    } catch (err) {
      console.warn('[mindmap] 节点数据解析失败：', err);
    }
  }
  return null;
}

function fallback(el, data, reason) {
  if (!el) return;
  el.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'mermaid-fallback';
  const p = document.createElement('p');
  p.className = 'lib-error';
  p.textContent = `知识结构图（AntV G6）未能渲染${reason ? '：' + reason : ''}，以下为文字版大纲。`;
  box.appendChild(p);
  const pre = document.createElement('pre');
  pre.style.cssText = 'white-space:pre-wrap;font-size:.85rem;line-height:1.7;';
  const byId = Object.fromEntries((data.nodes || []).map(n => [n.id, n.label]));
  const lines = (data.nodes || []).map(n => `• ${n.label}`);
  (data.edges || []).forEach(e => lines.push(`    ${byId[e.source] || e.source} → ${byId[e.target] || e.target}`));
  pre.textContent = lines.join('\n');
  box.appendChild(pre);
  el.appendChild(box);
}

function palette(dark) {
  return {
    root:   { fill: dark ? '#3b3496' : '#4f46e5', stroke: dark ? '#9b93ff' : '#4338ca', label: '#ffffff' },
    core:   { fill: dark ? '#3a2c6b' : '#f2edff', stroke: '#7c3aed', label: dark ? '#efeaff' : '#4c2a91' },
    branch: { fill: dark ? '#133943' : '#e7f6fb', stroke: '#0891b2', label: dark ? '#dff6fb' : '#0e5a6b' },
    end:    { fill: dark ? '#123f30' : '#e7f7f0', stroke: '#059669', label: dark ? '#dcfaec' : '#046c4a' },
    normal: { fill: dark ? '#232a3d' : '#f1f3fb', stroke: dark ? '#4b5573' : '#c7cde8', label: dark ? '#eef1f8' : '#2b3350' }
  };
}

async function renderMindmap(el, text) {
  if (!el) return;
  const data = readData(el, text);
  if (!data) { fallback(el, { nodes: [], edges: [] }, '缺少节点数据'); return; }

  if (!hasLib('g6')) { fallback(el, data, 'CDN 组件未加载'); return; }

  try {
    const G6 = window.G6;
    const dark = document.documentElement.dataset.theme === 'dark';
    const P = palette(dark);
    const edgeColor = dark ? '#5b6480' : '#aab3c8';

    const old = graphs.get(el);
    if (old && !old.get('destroyed')) old.destroy();

    const holder = document.createElement('div');
    holder.id = `g6-mindmap-${++g6Seq}`;
    holder.style.cssText = 'width:100%;height:340px;';
    el.innerHTML = '';
    el.appendChild(holder);

    const nodes = data.nodes.map(n => {
      const s = P[n.kind] || P.normal;
      return {
        id: n.id,
        label: n.label,
        type: 'rect',
        size: [Math.max(108, n.label.length * 13 + 30), 38],
        style: { fill: s.fill, stroke: s.stroke, lineWidth: n.kind === 'root' ? 2 : 1.5, radius: 8 },
        labelCfg: { style: { fill: s.label, fontSize: 12, fontWeight: 600 } }
      };
    });
    const edges = (data.edges || []).map(e => ({
      source: e.source, target: e.target,
      type: 'cubic-horizontal',
      style: { stroke: edgeColor, lineWidth: 1.6, endArrow: true, opacity: .95 }
    }));

    const graph = new G6.Graph({
      container: holder.id,
      width: holder.clientWidth || 760,
      height: 340,
      fitView: true,
      fitViewPadding: [18, 18, 18, 18],
      layout: { type: 'dagre', rankdir: 'LR', nodesep: 12, ranksep: 46, controlPoints: true },
      defaultNode: { type: 'rect' },
      defaultEdge: { type: 'cubic-horizontal' },
      nodeStateStyles: {
        hover: { lineWidth: 3, shadowBlur: 14, shadowColor: dark ? 'rgba(155,147,255,.55)' : 'rgba(79,70,229,.35)' }
      },
      edgeStateStyles: { hover: { lineWidth: 2.8, stroke: dark ? '#9b93ff' : '#4f46e5' } },
      modes: { default: ['drag-canvas', 'zoom-canvas', 'drag-node'] }
    });

    graph.data({ nodes, edges });
    graph.render();

    graph.on('node:mouseenter', ev => {
      const item = ev.item;
      if (!item) return;
      graph.setItemState(item, 'hover', true);
      item.getEdges().forEach(edge => graph.setItemState(edge, 'hover', true));
    });
    graph.on('node:mouseleave', ev => {
      const item = ev.item;
      if (!item) return;
      graph.setItemState(item, 'hover', false);
      item.getEdges().forEach(edge => graph.setItemState(edge, 'hover', false));
    });

    graphs.set(el, graph);
    el._renderMindmap = () => renderMindmap(el, text);
    document.addEventListener('theme:change', el._renderMindmap, { once: true });

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        if (graph.get('destroyed')) { ro.disconnect(); return; }
        graph.changeSize(holder.clientWidth || 760, 340);
        graph.fitView();
      });
      ro.observe(holder);
    }

    const hint = document.createElement('p');
    hint.className = 'g6-hint';
    hint.textContent = '可拖动画布、滚轮缩放、拖动节点；鼠标悬停可高亮相连的知识链路。';
    el.appendChild(hint);
  } catch (err) {
    console.warn('[mindmap] G6 渲染失败：', err);
    fallback(el, data, err.message);
  }
}

/* 知识结构图 · 原生 SVG 手绘
   ------------------------------------------------------------
   为什么不用图布局引擎（G6 / dagre / mermaid）：
     本章知识链本质是「一条主线，旁边挂几组并列分支」，总共五六层。
     自动布局为了把 N 列塞进固定宽度，会把整图等比缩小，
     11 个节点的图被压到 60% 后，节点里 14px 的字实际只剩 8px——就是看不清的根源。
     而且长宽比和容器对不上，还会留大片空白。

   本文件改为「按数据算坐标，直接画 SVG」：
     · 主干固定一列，垂直排布，行距固定，字号 15px 不缩放
     · 分支节点挂在主干左右两侧，同层水平错开
     · viewBox 随内容增长，容器高度 = 内容高度，不留白
     · 悬停/聚焦高亮相连链路；支持深浅色
   数据格式与之前一致（页面无需改动）：
     { "nodes":[{"id":"a","label":"映射与函数","kind":"root"}, ...],
       "edges":[{"source":"a","target":"b"}, ...] }
     kind: root / core / branch / end / normal
   ============================================================ */

const MM = {
  padX: 24, padY: 20,
  nodeH: 40, nodeW: 172,
  rankGap: 78,        // 相邻两层纵向间距
  branchGapX: 26,     // 主干与分支的水平间距
  spineCx: 150,       // 主干中心线（相对内容左缘）
  font: 15, branchFont: 14
};

function mmPalette(dark) {
  return {
    root:   { fill: '#0969da', stroke: '#0550ae', text: '#ffffff', weight: 600 },
    core:   { fill: dark ? '#161b22' : '#ffffff', stroke: dark ? '#4493f8' : '#0969da', text: dark ? '#e6edf3' : '#1f2328', weight: 600 },
    branch: { fill: dark ? '#161b22' : '#f6f8fa', stroke: dark ? '#30363d' : '#d1d9e0', text: dark ? '#e6edf3' : '#1f2328', weight: 400 },
    end:    { fill: dark ? '#0f2417' : '#dafbe1', stroke: dark ? '#3fb950' : '#1a7f37', text: dark ? '#e6edf3' : '#0f5323', weight: 600 },
    normal: { fill: dark ? '#161b22' : '#ffffff', stroke: dark ? '#30363d' : '#d1d9e0', text: dark ? '#e6edf3' : '#1f2328', weight: 400 },
    edge:   dark ? '#484f58' : '#c3ccd6',
    edgeHi: dark ? '#4493f8' : '#0969da'
  };
}

/* 把 DAG 拆成「主干（最长路径）+ 挂在主干旁的分支」 */
function mmAnalyze(data) {
  const nodes = data.nodes || [];
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  const adj = {}, indeg = {};
  nodes.forEach(n => { adj[n.id] = []; indeg[n.id] = 0; });
  (data.edges || []).forEach(e => {
    if (!adj[e.source] || !(e.target in indeg)) return;
    adj[e.source].push(e.target);
    indeg[e.target]++;
  });

  const memo = {};
  const longest = id => {
    if (memo[id]) return memo[id];
    let best = [id];
    (adj[id] || []).forEach(t => {
      const cand = [id, ...longest(t)];
      if (cand.length > best.length) best = cand;
    });
    return (memo[id] = best);
  };
  const start = nodes.find(n => n.kind === 'root') || nodes.find(n => indeg[n.id] === 0) || nodes[0];
  const spine = start ? longest(start.id) : [];

  const level = {};
  spine.forEach((id, i) => { level[id] = i; });
  // 分支层号：取相邻已知层的 ±1，尽量与主干居中对齐
  let changed = true, guard = 0;
  while (changed && guard++ < 20) {
    changed = false;
    (data.edges || []).forEach(e => {
      if (level[e.source] !== undefined && level[e.target] === undefined) {
        level[e.target] = level[e.source] + 1; changed = true;
      } else if (level[e.target] !== undefined && level[e.source] === undefined) {
        level[e.source] = level[e.target] - 1; changed = true;
      }
    });
  }
  nodes.forEach(n => { if (level[n.id] === undefined) level[n.id] = 0; });

  const spineSet = new Set(spine);
  return { nodes, byId, spine, level, branches: nodes.filter(n => !spineSet.has(n.id)) };
}

const mmEsc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function renderMindmap(el, text) {
  if (!el) return;
  const raw = el.querySelector('script[type="application/json"]');
  let data = null;
  if (raw) {
    try {
      const d = JSON.parse(raw.textContent);
      if (d && Array.isArray(d.nodes) && d.nodes.length) data = d;
    } catch (err) {
      console.warn('[mindmap] 节点数据解析失败：', err);
    }
  }
  if (!data) { mmFallback(el, { nodes: [], edges: [] }, '缺少节点数据'); return; }

  try {
    const dark = document.documentElement.dataset.theme === 'dark';
    const P = mmPalette(dark);
    const { byId, spine, level, branches } = mmAnalyze(data);

    const cx = MM.spineCx;
    const rows = Math.max(...Object.values(level), 0) + 1;
    const cyOf = id => MM.padY + MM.nodeH / 2 + level[id] * MM.rankGap;

    const pos = {};
    spine.forEach(id => {
      pos[id] = { x: cx - MM.nodeW / 2, y: cyOf(id) - MM.nodeH / 2, side: 'spine' };
    });

    // 同层分支左右交替铺开
    const taken = {};
    branches.forEach(n => {
      const lv = level[n.id];
      taken[lv] = taken[lv] || { right: 0, left: 0 };
      const goRight = taken[lv].right <= taken[lv].left;
      const i = goRight ? taken[lv].right++ : taken[lv].left++;
      const x = goRight
        ? cx + MM.nodeW / 2 + MM.branchGapX + i * (MM.nodeW + 10)
        : cx - MM.nodeW / 2 - MM.branchGapX - MM.nodeW - i * (MM.nodeW + 10);
      pos[n.id] = { x, y: cyOf(n.id) - MM.nodeH / 2, side: goRight ? 'right' : 'left' };
    });

    let minX = Infinity, maxX = -Infinity;
    Object.values(pos).forEach(p => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x + MM.nodeW);
    });
    // 最小宽度要够放「主干 + 左右各一个分支」，否则 viewBox 太窄，
    // SVG 被等比拉满容器时节点会被横向扯宽（曾出现根节点铺满整行）
    const width = Math.max(cx + MM.nodeW / 2 + MM.branchGapX + MM.nodeW + MM.padX, maxX - minX);
    const height = MM.padY * 2 + (rows - 1) * MM.rankGap + MM.nodeH;
    const dx = MM.padX - minX;

    /* 连线：主干直连；分支走「竖直→水平→竖直」正交折线，比曲线好读 */
    const edgePath = (s, t) => {
      const a = pos[s], b = pos[t];
      if (!a || !b) return '';
      const ax = a.x + MM.nodeW / 2, ay = a.y + MM.nodeH;
      const bx = b.x + MM.nodeW / 2, by = b.y;
      if (Math.abs(ax - bx) < 2) return `M${ax},${ay} L${bx},${by}`;
      const midY = ay + (by - ay) * 0.55;
      return `M${ax},${ay} L${ax},${midY} L${bx},${midY} L${bx},${by}`;
    };

    const mk = dark ? 'mm-arrow-d' : 'mm-arrow';
    const edgesSvg = (data.edges || []).map(e => {
      const d = edgePath(e.source, e.target);
      if (!d) return '';
      return `<path class="mm-edge" data-from="${mmEsc(e.source)}" data-to="${mmEsc(e.target)}"
        d="${d}" fill="none" stroke="${P.edge}" stroke-width="1.5" marker-end="url(#${mk})"/>`;
    }).join('');

    const nodeSvg = Object.keys(pos).map(id => {
      const n = byId[id];
      if (!n) return '';
      const p = pos[id], s = P[n.kind] || P.normal;
      const isRoot = n.kind === 'root';
      const isBranch = p.side !== 'spine';
      return `<g class="mm-node" data-id="${mmEsc(id)}" tabindex="0" role="listitem"
          aria-label="${mmEsc(n.label)}">
        <rect x="${p.x + dx}" y="${p.y}" width="${MM.nodeW}" height="${MM.nodeH}" rx="6"
          fill="${s.fill}" stroke="${s.stroke}" stroke-width="${isRoot ? 1.5 : 1}"/>
        <text x="${p.x + dx + MM.nodeW / 2}" y="${p.y + MM.nodeH / 2 + 1}"
          text-anchor="middle" dominant-baseline="middle"
          font-size="${isBranch ? MM.branchFont : MM.font}" font-weight="${s.weight}"
          fill="${s.text}" style="font-family:inherit">${mmEsc(n.label)}</text>
      </g>`;
    }).join('');

    el.innerHTML = `
      <div class="mm-wrap">
        <svg class="mm-svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"
             preserveAspectRatio="xMidYMin meet" role="list" aria-label="本章知识结构图"
             style="max-width:100%;height:auto">
          <defs>
            <marker id="mm-arrow" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="${P.edge}"/>
            </marker>
            <marker id="mm-arrow-d" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="${P.edge}"/>
            </marker>
          </defs>
          ${edgesSvg}
          ${nodeSvg}
        </svg>
        <p class="mm-caption">方框是一个知识点，箭头表示「先学上面那个，才学得动下面那个」。蓝框是主干，灰框是并列的分支；鼠标移到任一模块上，会亮起与它直接相连的知识链。</p>
      </div>`;

    // 悬停 / 键盘聚焦高亮
    const svg = el.querySelector('.mm-svg');
    const clearHi = () => {
      svg.querySelectorAll('.is-hi').forEach(x => x.classList.remove('is-hi'));
      svg.querySelectorAll('.mm-edge').forEach(p => p.classList.remove('is-hi'));
    };
    const hiNode = id => {
      clearHi();
      const g = svg.querySelector(`.mm-node[data-id="${CSS.escape(id)}"]`);
      if (g) g.classList.add('is-hi');
      svg.querySelectorAll('.mm-edge').forEach(p => {
        if (p.dataset.from === id || p.dataset.to === id) p.classList.add('is-hi');
      });
    };
    svg.querySelectorAll('.mm-node').forEach(g => {
      const id = g.dataset.id;
      g.addEventListener('mouseenter', () => hiNode(id));
      g.addEventListener('focus', () => hiNode(id));
      g.addEventListener('mouseleave', clearHi);
      g.addEventListener('blur', clearHi);
    });

    el._renderMindmap = () => renderMindmap(el, text);
    document.addEventListener('theme:change', el._renderMindmap, { once: true });
  } catch (err) {
    console.warn('[mindmap] 知识图渲染失败：', err);
    mmFallback(el, data, err.message);
  }
}

/* 降级：保留完整的文字版结构 */
function mmFallback(el, data, reason) {
  if (!el) return;
  const byId = Object.fromEntries((data.nodes || []).map(n => [n.id, n.label]));
  const kids = {};
  (data.edges || []).forEach(e => { (kids[e.source] = kids[e.source] || []).push(e.target); });
  const isChild = new Set((data.edges || []).map(e => e.target));
  const roots = (data.nodes || []).filter(n => !isChild.has(n.id));
  const walk = (id, depth) => {
    const line = `${'  '.repeat(depth)}${depth ? '└ ' : ''}${byId[id] || id}`;
    return [line, ...(kids[id] || []).map(k => walk(k, depth + 1))].join('\n');
  };
  const body = roots.length
    ? roots.map(r => walk(r.id, 0)).join('\n')
    : (data.nodes || []).map(n => n.label).join('\n');
  el.innerHTML = `<div class="mm-fallback">
    <p class="lib-error">知识结构图未能绘制${reason ? '：' + reason : ''}，以下是文字版结构。</p>
    <pre>${mmEsc(body)}</pre>
  </div>`;
}

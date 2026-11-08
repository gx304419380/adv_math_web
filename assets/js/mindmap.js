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
  nodeH: 42, nodeW: 172,     // nodeW 是最小宽度，实际宽度按文字测量后取 max
  nodePadX: 18,              // 文字两侧各留的内边距
  rankGap: 84,        // 相邻两层纵向间距（框高 42 + 42 的空隙，够画线又不松散）
  branchGapX: 26,     // 主干与分支的水平间距
  spineCx: 150,       // 主干中心线（相对内容左缘）
  laneW: 46,          // 每条分支车道的宽度：方框 + 走线的空间
  font: 15, branchFont: 14
};

/* 估算文字宽度：汉字/全角按 1 个字号，西文与数字约 0.56 个字号。
   「下一章：曲线积分与曲面积分」这类长标题以前会溢出固定的 172px 框，必须按内容撑开。 */
function mmTextWidth(text, font) {
  let w = 0;
  for (const ch of String(text)) {
    const c = ch.codePointAt(0);
    w += (c > 0x2e80) ? 1 : (/[A-Za-z0-9]/.test(ch) ? 0.56 : 0.4);
  }
  return w * font;
}


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

  // core 加分、branch 扣分：主干就该是一串蓝框，遇到灰框说明走岔了
  /* 主干识别：主干 = 从根出发、把 core 节点串起来的那条链。
     做法不是「挑一条路」，而是「把 core 节点按拓扑顺序接起来」：
     先按 BFS 层序给每个节点定深度，再把所有 core 节点按深度排序；
     相邻两个 core 之间若在原图里有可达路径，就把这段路径并进主干。
     这样即使某条岔路上的 branch 节点比 core 更「顺路」（ch02 的
     高阶导数 与 函数的微分 拓扑上并列），core 也一定会被收进主干。 */
  const start = nodes.find(n => n.kind === 'root') || nodes.find(n => indeg[n.id] === 0) || nodes[0];
  const depth = {};
  if (start) {
    depth[start.id] = 0;
    const q = [start.id];
    while (q.length) {
      const u = q.shift();
      (adj[u] || []).forEach(v => {
        if (depth[v] === undefined) { depth[v] = depth[u] + 1; q.push(v); }
      });
    }
  }
  // 从 u 到 v 的最短路径（BFS），找不到返回 null
  const pathTo = (u, v) => {
    const prev = { [u]: null }, q = [u];
    while (q.length) {
      const x = q.shift();
      if (x === v) {
        const out = [];
        for (let c = v; c !== null; c = prev[c]) out.unshift(c);
        return out;
      }
      (adj[x] || []).forEach(y => {
        if (!(y in prev)) { prev[y] = x; q.push(y); }
      });
    }
    return null;
  };
  /* 主干识别：把所有 core 串成一条链，并使这张图看起来最自然。

     判据（越小越好）：
       · 主干里相邻两个 core 之间若没有边，就得画一条「跨图长线」——
         这种断裂每次记 MEMBER 分，是首要要避免的；
       · 每段「借道路径」中间经过的 branch 或与其它 core 同层，记一点分；
       · 最后按 core 的 BFS 深度做稳定排序参考，保证自上而下。

     为什么要这么绕：三章的图结构完全不同——
       ch03 是从根分出两条并列长链（罗尔→洛必达→泰勒 / 拉格朗日→单调性→极值），
             老的「按深度硬串」正确，新写的「贪心沿边」就会抄近道串错；
       ch10 是星形（根直接放射出 5 条 core，末端再汇聚），只有沿边贪心才顺；
       ch11 是两组并行的 core 链，按深度硬串会凭空接出一条横跨全图的长线。
     启发式怎么调都会在某一章翻车，所以改成对「所有 core 的串接顺序」
     做一次小规模搜索：core 一般 5~9 个，搜索空间完全可控。 */
  const inSpineKind = new Set(['core', 'root', 'end']);
  const coreIds = nodes.filter(n => n.kind === 'core').map(n => n.id);
  const endNode = nodes.find(n => n.kind === 'end');

  // 从 a 到 b 的最短路（沿原图边走），返回路径数组
  const MEMBER = 1000;   // 一次「无边的相邻 core」的罚分
  const SKIP = 400;      // 跳过「直接可达的 core」的罚分

  const costOf = seq => {
    let c = 0;
    for (let i = 0; i + 1 < seq.length; i++) {
      const p = pathTo(seq[i], seq[i + 1]);
      if (!p) return Infinity;
      // 路径里除了两端，其余节点都是「借道」的分支，借一次扣一点
      c += (p.length - 2) * 1;
      // 借道路径越短越好；同一列内的相邻 core 最好直接相连
      if (p.length > 2) c += 2;
    }
    /* 「core 的直接 core 子节点」被排到了它后面很远的地方，重罚。
       ch06 里 写出微元 同时直连 积分求总量 和 变力做功，两条都是 core；
       若为省两个弯走「写出微元 → 变力做功」，积分求总量 就被降级成旁支、
       连线倒着往上绕，语义完全反了。所以直接的 core 子节点要尽量紧跟父节点。 */
    for (let i = 0; i < seq.length; i++) {
      for (let j = i + 2; j < seq.length; j++) {
        if ((adj[seq[i]] || []).includes(seq[j])) c += SKIP;
      }
    }
    return c;
  };
  /* 与「原图的自然顺序」差多少：把 core 按 BFS 深度排出来的名次当作基准，
     真实顺序偏离这个基准越少越好。这一项只在主代价平手时起作用，
     用来兜住「并列子节点被搜索随意打乱」的情况。 */
  const devOf = seq => {
    const base = coreIds.slice().sort((a, b) =>
      (depth[a] ?? 99) - (depth[b] ?? 99) || coreIds.indexOf(a) - coreIds.indexOf(b));
    const rank = Object.fromEntries(base.map((id, i) => [id, i]));
    return seq.filter(id => id in rank)
      .reduce((acc, id, i) => acc + Math.abs(rank[id] - i), 0);
  };

  const better = (a, b) => {
    if (a.cost !== b.cost) return a.cost < b.cost;
    // 代价平手时：先看「与原始教学顺序的偏差」——用 BFS 深度做基准，
    // 并列的 core（ch04 的 凑微分 / 分部积分法 都是 不定积分的性质 的孩子）
    // 按原图拓扑顺序排，而不是被搜索结果随便打乱。
    if (Math.abs(a.dev - b.dev) > 1e-9) return a.dev < b.dev;
    return a.mid < b.mid;
  };

  let bestSeq = [start ? start.id : (coreIds[0] || null)].filter(Boolean);
  if (coreIds.length) {
    // 起点：root（若存在），否则第一个 core
    const rootId = start ? start.id : coreIds[0];
    const rest = coreIds.filter(id => id !== rootId);
    const midOf = seq => seq.reduce((acc, id, i) => acc + (depth[id] ?? 99) * (i + 1), 0);

    let best = { seq: [rootId], cost: Infinity, dev: Infinity, mid: Infinity };
    const n = rest.length;
    const LIMIT = 200000;                      // 搜索节点上限，防止极端图卡死
    let visited = 0;

    const dfs = (seq, left) => {
      if (visited++ > LIMIT) return;
      const cur = { seq: seq.slice(), cost: costOf(seq), dev: devOf(seq), mid: midOf(seq) };
      if (!left.length) {
        if (better(cur, best)) best = cur;
        return;
      }
      // 剪枝：已经比最优解代价还高，就没有继续的意义
      if (cur.cost >= best.cost && best.cost !== Infinity) return;
      for (let i = 0; i < left.length; i++) {
        // 只能接「从当前节点可达」的那些 core，其余 core 接上去必然断
        if (!pathTo(seq[seq.length - 1], left[i])) continue;
        const nx = seq.concat([left[i]]);
        const restLeft = left.slice(0, i).concat(left.slice(i + 1));
        dfs(nx, restLeft);
      }
    };
    dfs([rootId], rest.slice());
    bestSeq = best.seq;
    /* 有 core 从头节点就不可达（图里有孤岛）：单独接到末尾，
       并记一次 MEMBER 罚分——这种情况本来就该由数据去修。 */
    const inSeq = new Set(bestSeq);
    coreIds.filter(id => !inSeq.has(id)).forEach(id => {
      if (pathTo(bestSeq[bestSeq.length - 1], id)) { bestSeq.push(id); return; }
      bestSeq.push(id);
    });
  }

  let spine = bestSeq.slice();
  // 末尾接上 end 节点（下一章）
  if (endNode && !spine.includes(endNode.id)) spine.push(endNode.id);
  spine = spine.filter(id => inSpineKind.has(byId[id] && byId[id].kind));

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
    const wOf = id => {
      const n = byId[id];
      const f = (n && n.kind === 'root') ? MM.font : MM.branchFont;
      return Math.max(MM.nodeW, mmTextWidth(n ? n.label : '', f) + MM.nodePadX * 2);
    };

    const pos = {};
    // 主干节点的框以主干中心线居中：x 由自身宽度反推，而不是固定左缘。
    // 「下一章：向量代数与空间解析几何」宽 246px，若左缘固定就只往右长，
    // 会一头扎进右侧分支那一列（ch07 的「欧拉方程」就是这么撞上的）。
    spine.forEach(id => {
      const w = wOf(id);
      pos[id] = { x: cx - w / 2, y: 0, side: 'spine', w };
    });

    // 分支排布：主干居中，左右各一列；同层分支多于 2 个时再向外扩一列，
    // 每列最多放 2 个（占两个行位），避免把 14 个节点全堆成一条长竖线。
    // 早先是同层无限往右排，ch10 一层 7 个节点，viewBox 撑到 1344px，
    // 塞进 900px 容器后整图被缩到 0.67，14px 的字实际只剩 9px——所以不能无限扩列。
    const rowUse = {};
    const claim = (fromRow, colKey) => {
      let r = fromRow;
      for (;;) {
        rowUse[r] = rowUse[r] || {};
        if (!rowUse[r][colKey]) { rowUse[r][colKey] = true; return r; }
        r++;
      }
    };
    // 期望列数：每层最多 4 个分支 → 左右各 1 列就够；超过才向外扩第 2 列。
    // 列用「条」编号而不是「深度」：一条边要往右走两格时，中间那一格也得算占用。
    const cntByLevel = {};
    branches.forEach(n => { cntByLevel[level[n.id]] = (cntByLevel[level[n.id]] || 0) + 1; });
    const maxPerLevel = Math.max(0, ...Object.values(cntByLevel));
    const strips = maxPerLevel > 4 ? 4 : 2;   // 左右各几条
    // 先把主干自己占的行登记好：主干的每一层就是一个「行占位」，
    // 分支只允许落在它的左右列，绝不能被 claim 推到主干行上。
    spine.forEach(id => {
      const r = level[id];
      rowUse[r] = rowUse[r] || {};
      rowUse[r].spine = true;
    });
    /* 列位以「主干最宽的那个框」为基准计算，而不是固定宽度 MM.nodeW：
       主干里只要有长标题（本节末的「下一章：…」经常很长），
       固定基准算出来的分支位置就会落进主干框里，两张框直接叠在一起。
       取最大宽度后所有列一律往外推，留出的是「至少」够宽，绝不会更窄。 */
    const spineW = Math.max(...spine.map(id => wOf(id)));
    /* 车道宽度同样不能写死：一条车道里要站得下最宽的那个分支框，
       否则「子承父业」时窄父框在 k=0、宽子框被推到 k=1，
       两者中心线差出十几像素，本该一条竖线的父子关系就走成了折线
       （ch12 的「一般周期 2l 与换元」就是这样拐了一下）。
       车道 = max(默认车道, 最宽分支 + 半截走线余量)。 */
    const branchMaxW = Math.max(0, ...branches.map(n => wOf(n.id)));
    const stripW = Math.max(MM.laneW, branchMaxW + 12);
    // 层号 → 主干节点，供分支落位时查「本行的主干框是谁」
    const spineByLevel = {};
    spine.forEach(id => { spineByLevel[level[id]] = id; });
    const placed = [];
    // 每个节点的父（取第一条入边）
    const parentOf = {};
    (data.edges || []).forEach(e => {
      if (!(e.target in parentOf)) parentOf[e.target] = e.source;
    });
    const parentRow = id => {
      const pid = parentOf[id];
      if (!pid) return level[id];
      const pp = pos[pid];
      return pp && pp.row !== undefined ? pp.row : level[id];
    };

    /* 分支排布，四条规则按优先级来：
       ① 子承父业：父节点也是分支、就在父的正下方同一侧（父子之间一条竖线）。
       ② 父所在行的左右两侧。
       ③ 往外顺延最近的空位。
       ④ 同一行同一侧只放一个。
       另外「路径最长」优先落位：一个节点若还有子节点要接在自己下面，
       先把它放好，子节点才好继承它的列。
       早期按「层号」找空位，主干是连续一列时整列已被占满，
       所有分支都被挤到图的最下面，连线绕成一大圈。 */
    const kidCount = {};
    (data.edges || []).forEach(e => { kidCount[e.source] = (kidCount[e.source] || 0) + 1; });
    const order = branches.slice().sort((a, b) => level[a.id] - level[b.id]);
    order.forEach(n => {
      const w = wOf(n.id);
      const pr = parentRow(n.id);
      let row = null, side = 'right';
      /* 左右平衡：第 ②③ 步给一个「先试哪侧」的偏好，另一侧作为备选。
         以前这里按「哪边已经放得多」来选边，但两个计数都从 0 起，
         永远先填右边——于是 12 张图全员右倾，左列空着、右列挤爆。
         现在按「若放这侧，左右两侧剩余差多少」来挑，差相同才用刚才的偏好。 */
      const cntSide = sd => placed.filter(q => q.side === sd).length;
      const pref = cntSide('right') <= cntSide('left') ? ['right', 'left'] : ['left', 'right'];
      const pid = parentOf[n.id];
      const pa = pid && pos[pid];

      // ① 正下方继承父的列
      if (pa && pa.side !== 'spine' && pa.row !== undefined) {
        const below = pa.row + 1;
        if (!rowUse[below]) rowUse[below] = {};
        if (!rowUse[below][pa.side]) { rowUse[below][pa.side] = true; row = below; side = pa.side; }
      }
      /* ①b 同一父节点的其它孩子也跟着父节点的列走。
          一个主干节点常带 3~4 个分支；若每个分支各占一条车道，
          就会在主干左右各糊上 4 条并排的竖线（ch11 有 8 条），
          看着像一大片栅栏。让兄弟姐妹共用父节点这条车道、
          只允许落在不同行位，纵向的并行线立刻就少了。 */
      if (row === null && pid && pos[pid] && pos[pid].side !== 'spine' && pos[pid].strip !== undefined) {
        const sd = pos[pid].side, sk = pos[pid].strip;
        for (let d = 1; d <= 8 && row === null; d++) {
          for (const cand of [pr + d, pr - d]) {
            if (cand < 0) continue;
            if (!rowUse[cand]) rowUse[cand] = {};
            const key = sd + sk;
            if (rowUse[cand][sd] || rowUse[cand][key]) continue;
            rowUse[cand][sd] = true; rowUse[cand][key] = true;
            row = cand; side = sd; break;
          }
        }
        if (row !== null) {
          pos[n.id] = { x: 0, y: 0, side, row, w, strip: sk };
          placed.push({ row, side });
          return;
        }
      }
      // ②③ 父所在行起，上下就近找空位（两侧都探，选更平衡的那侧）
      for (let d = 0; d <= 12 && row === null; d++) {
        const cands = d === 0 ? [pr] : [pr + d, pr - d];
        for (const cand of cands) {
          if (cand < 0) continue;
          if (!rowUse[cand]) rowUse[cand] = {};
          const free = pref.filter(sd => !rowUse[cand][sd]);
          if (!free.length) continue;
          // 空得更多的那侧优先，平手时按 pref 顺序
          free.sort((x, y) => {
            const nx = cntSide(x) + 1 - cntSide(x === 'right' ? 'left' : 'right');
            const ny = cntSide(y) + 1 - cntSide(y === 'right' ? 'left' : 'right');
            return Math.abs(nx) - Math.abs(ny);
          });
          side = free[0]; rowUse[cand][side] = true; row = cand;
          break;
        }
      }
      if (row === null) { row = claim(pr + 9, 'right'); side = 'right'; }

      /* 同侧同一行已有节点时，新节点往外挪一条车道（而不是硬叠在一起）。
         以前的列位置只用「父行有没有东西」来判断，放不下就直接压上去。 */
      let k = 0;
      for (;;) {
        const key = side + k;
        if (!rowUse[row][key]) { rowUse[row][key] = true; break; }
        k++;
      }
      /* 列位基准：主干框是「居中」摆的，窄框两边都留白，
         所以往外推的距离必须按「这一行实际站着的那个主干框的边」来算，
         再用整根主干的最大半宽兜底（防止遇到更宽的邻居）。
         以前一律按 spineW（最大宽度）推，遇到窄主干行就推得太远：
         图整体被撑宽、dx 平移量变大，最后分支反而被平移回主干框上
         （ch06 的「旋转体体积」直接被压进了「写出微元」）。 */
      const spineHalfAt = r => {
        const sid = spineByLevel[r];
        return sid !== undefined ? wOf(sid) / 2 : 0;
      };
      const half = Math.max(spineHalfAt(row), 0);
      const x = side === 'right'
        ? cx + half + MM.branchGapX + k * stripW
        : cx - half - MM.branchGapX - w - k * stripW;
      pos[n.id] = { x, y: 0, side, row, w, strip: k };
      placed.push({ row, side });
    });

    /* 兜底防线：分支绝不允许和主干框横向相交。
       布局规则再多也可能在极端数据下算歪，这里做一次事后校正：
       对每一行，把所有落在这行上的框（主干 + 分支）按中心线分到左右两侧，
       右侧的分支左缘推到「本行主干框右缘 + branchGapX」之外，
       左侧的分支右缘推到「本行主干框左缘 - branchGapX」之外。 */
    const spineByRow = {};
    spine.forEach(id => { spineByRow[level[id]] = id; });
    branches.forEach(n => {
      const p = pos[n.id];
      if (!p) return;
      const sid = spineByRow[p.row];
      if (!sid) return;
      const sp = pos[sid];
      if (p.side === 'right' && p.x < sp.x + sp.w + MM.branchGapX) {
        p.x = sp.x + sp.w + MM.branchGapX;
      }
      if (p.side === 'left' && p.x + p.w > sp.x - MM.branchGapX) {
        p.x = sp.x - MM.branchGapX - p.w;
      }
    });

    Object.keys(pos).forEach(id => {
      const p = pos[id];
      const r = p.side === 'spine' ? level[id] : p.row;
      p.y = MM.padY + r * MM.rankGap;
    });

    // 左侧分支的 x 可能是负数，整图统一平移 dx 到 viewBox 内。
    // 关键：dx 必须在算坐标时就应用（pos 直接存平移后的值），
    // 否则节点平移了、连线没平移，箭头会整体错位——曾经是个把整图搞乱的 bug。
    let minX = Infinity, maxX = -Infinity;
    Object.values(pos).forEach(p => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x + p.w);
    });
    const dx = MM.padX - minX;
    Object.values(pos).forEach(p => { p.x += dx; });

    // 外侧车道：在所有方框之外，宽出半条间距走线。
    // 画布必须把两侧车道都包进来：以前宽度只加 padX，左车道
    // （padX - branchGapX）已是负值、右侧车道又落在画布外，
    // 于是「绕外圈」的竖线整段被 viewBox 裁掉，图上只剩两截横线头。
    const laneL = MM.padX - MM.branchGapX * 0.5;
    const laneR = MM.padX + (maxX - minX) + MM.branchGapX * 0.5;
    // 左右各留出一条车道（padX），车道外侧再留半个间距做呼吸：
    // 之前只加了单侧 padX，右车道恰好落在画布边线上，圆角半径范围内的
    // 那一小段竖线会被 viewBox 裁掉，看起来就像「线在框外断了一截」。
    const width = (maxX - minX) + MM.padX * 2 + MM.branchGapX * 2;
    let maxY = 0;
    Object.values(pos).forEach(p => { maxY = Math.max(maxY, p.y + MM.nodeH); });
    // 同行的线会从框下面绕（目标在左侧时要下沉 14px），画布底边得多留一条缝，
    // 否则兜底走线会掉出 viewBox，图上只剩半截。
    const height = maxY + MM.padY + 20;

    /* 连线：一律走正交折线，竖直段只走节点左右两侧的空白车道，
       水平段只走两行之间的空隙。分支回到主干时若被别的框挡住，
       先绕到图外侧的专用车道再折回来——外车道一定不穿过任何方框。 */
    /* 走线策略：正交折线（竖直→水平→竖直），且必须绕开所有方框。
       以前的做法是在「几个候选 x」×「几个候选 y」上枚举 1~2 个折点，
       行被挤满时枚举不出可走的路线，就退化成一条横穿半张图的斜线
       （ch07 的「可降阶高阶方程 → 高阶线性方程解的结构」就是这么穿框的）。
       现在改成在这张网格上做一次 Dijkstra：
         · 水平通道 = 每一行之间、以及首行上方/末行下方的空隙；
         · 竖直通道 = 每一列方框的左右外侧 + 图左右外缘车道；
       从源节点的下边走到目标节点的上边，每段都验证不穿框。
       网格规模是十几个 × 十几个，跑一次不到一毫秒，肉眼无感。 */
    const lanesX = [], lanesY = [];
    {
      const xs = new Set(), ys = new Set();
      Object.values(pos).forEach(q => {
        /* 竖直通道：每个方框左右外侧各两条（+7 / +14）。
           同一侧可能要并排走两三条线，只给一条时后画的只能绕到外圈，
           图上就出现贴着整张图边缘的长竖线。 */
        xs.add(q.x - 7);
        xs.add(q.x - 14);
        xs.add(q.x + q.w + 7);
        xs.add(q.x + q.w + 14);
        /* 水平通道：行间空隙的上下各一条（贴着上一行的底、贴着下一行的顶），
           外加方的框列左侧。贴着框边走不算穿越（linkOk 里判的是「完全覆盖」），
           所以不需要再给 +4/+8 那种离框 4 像素的窄通道 —— 之前给了反而
           让线在框缝里挤出「栅栏」一样的平行短线。 */
        ys.add(q.y - 6);
        ys.add(q.y + MM.nodeH + 6);
        ys.add(q.y - MM.rankGap * 0.5);
        ys.add(q.y + MM.nodeH + MM.rankGap * 0.5);
      });
      // 图左右外缘的专用车道，唯一保证不穿任何框
      xs.add(laneL); xs.add(laneR);
      ys.forEach(v => lanesY.push(v));
      xs.forEach(v => lanesX.push(v));
      lanesX.sort((p, q) => p - q);
      lanesY.sort((p, q) => p - q);
    }
    const hit = (x1, y1, x2, y2) => {
      const [lx, hx] = x1 <= x2 ? [x1, x2] : [x2, x1];
      const [ly, hy] = y1 <= y2 ? [y1, y2] : [y2, y1];
      return Object.values(pos).some(q =>
        lx < q.x + q.w - 1 && hx > q.x + 1 && ly < q.y + MM.nodeH - 1 && hy > q.y + 1);
    };
    const segOk = (x1, y1, x2, y2) => !hit(x1, y1, x2, y2);

    /* 在网格上求最短正交路径（A*，启发式 = 到目标的曼哈顿距离）。
       starts / goals 是若干带方向的入口点，逐个尝试，取总代价最小的那组。
       为什么不用 Dijkstra：网格虽小，但起点有多组、每组都要跑一遍全图，
       在浏览器里叠加起来会把主线程卡住；A* 加了朝目标的启发式后，
       探索的格子数少一个量级，出图是瞬时的。
       代价里给每次拐弯加罚分，让路线尽量少折、看着更干净。 */
    /* 把整张图看成一张网格图，在上面跑一次 A*。
       ── 网格 ────────────────────────────────────────────────
       节点 = 所有交叉点 (x ∈ lanesX) × (y ∈ lanesY)，外加：
         · 每个方框上下左右四条边的中点，作为「进/出这个框」的端子；
         · 起点、终点本身。
       相邻交叉点之间的线段只要能过 segOk()（不穿框、不出画布），就连一条边，
       跨多远都算一条直线、不额外计费 —— 这就是「正交直线」的代价模型。
       ── 为什么分两次跑 ──────────────────────────────────────
       以前每条边都单独跑一次 A*，十几条边就是十几次全图搜索，
       在浏览器里每次要几百毫秒，图会明显卡一下。
       现在先以「目标节点」为终点跑一次，拿到每个格子到终点的最短距离，
       所有指向同一节点的边共用这份距离表，只额外跑一次「从这段线进去」的短搜索。
       ── 端子 ────────────────────────────────────────────────
       线从方框的哪条边出、从哪条边进，由搜索决定；只是不允许从「侧面」进出，
       否则箭头会指着框的腰，看着别扭。 */
    const PROBE = 5;   // 端子往外迈出的距离，也是「贴框通道」的间距
    const TOL = 0.6;
    const eq = (a, b) => Math.abs(a - b) < TOL;
    const onBox = (x, y, q) =>
      (eq(x, q.l) || eq(x, q.r)) && y > q.t - TOL && y < q.b + TOL ||
      (eq(y, q.t) || eq(y, q.b)) && x > q.l - TOL && x < q.r + TOL;

    // 网格点
    const xsAll = lanesX.slice(), ysAll = lanesY.slice();
    Object.values(pos).forEach(q => {
      // 注意：pos 里的方框记录只有 x / y / w，l/r/t/b 是在下面才补上的，
      // 这里必须用 x / y / w 自己算，否则会算出一堆 NaN 网格线。
      const l = q.x, r = q.x + q.w, t = q.y, b = q.y + MM.nodeH;
      const midX = l + q.w / 2, midY = t + MM.nodeH / 2;
      xsAll.push(l, r, midX, l - PROBE, r + PROBE);
      ysAll.push(t, b, midY, t - PROBE, b + PROBE);
    });
    const nodesAt = new Map();   // "x|y" -> {x, y}
    const addNode = (x, y) => {
      const k = Math.round(x * 10) / 10 + '|' + Math.round(y * 10) / 10;
      if (!nodesAt.has(k)) nodesAt.set(k, { x, y });
      return k;
    };
    xsAll.forEach(x => ysAll.forEach(y => addNode(x, y)));

    // 每个方框的端子（四边中点），并记下「从哪个方向进出」
    const PORT = {};   // id -> [{x, y, side}]
    const PORTKEY = {};   // "x|y" -> {id, side}
    Object.entries(pos).forEach(([id, q]) => {
      q.l = q.x; q.r = q.x + q.w; q.t = q.y; q.b = q.y + MM.nodeH;
      const ports = [
        { x: q.l + q.w / 2, y: q.t, side: 'top' },
        { x: q.l + q.w / 2, y: q.b, side: 'bottom' },
        { x: q.l, y: q.t + MM.nodeH / 2, side: 'left' },
        { x: q.r, y: q.t + MM.nodeH / 2, side: 'right' }
      ];
      PORT[id] = ports;
      ports.forEach(p => {
        const k = addNode(p.x, p.y);
        PORTKEY[k] = { id, side: p.side };
      });
    });

    // 两个网格点之间能否直线走通
    const linkOk = (p, q) => {
      if (Math.abs(p.x - q.x) < TOL) {
        // 竖直段：不能穿过任何方框的内部（贴着边不算穿）
        const [y1, y2] = p.y <= q.y ? [p.y, q.y] : [q.y, p.y];
        return !Object.values(pos).some(bx =>
          p.x > bx.l + 1 && p.x < bx.r - 1 && y1 < bx.b - 1 && y2 > bx.t + 1 &&
          !(eq(p.x, bx.l) || eq(p.x, bx.r)));
      }
      if (Math.abs(p.y - q.y) < TOL) {
        const [x1, x2] = p.x <= q.x ? [p.x, q.x] : [q.x, p.x];
        // 水平段只避开「上下边都盖住这条线」的框：
        // 压在框的上/下边线上时并不遮挡，贴边走反而是最省空间的画法。
        return !Object.values(pos).some(bx =>
          p.y > bx.t + 0.5 && p.y < bx.b - 0.5 && x1 < bx.r - 1 && x2 > bx.l + 1);
      }
      return false;   // 只走正交线
    };

    // 每个网格点的邻居（同一 x 上下、同一 y 左右），缓存一次
    const byX = new Map(), byY = new Map();
    nodesAt.forEach((nd, k) => {
      const kx = Math.round(nd.x * 10) / 10, ky = Math.round(nd.y * 10) / 10;
      if (!byX.has(kx)) byX.set(kx, []);
      if (!byY.has(ky)) byY.set(ky, []);
      byX.get(kx).push({ k, nd });
      byY.get(ky).push({ k, nd });
    });
    byX.forEach(v => v.sort((a, b) => a.nd.y - b.nd.y));
    byY.forEach(v => v.sort((a, b) => a.nd.x - b.nd.x));

    const neighbours = k => {
      const nd = nodesAt.get(k);
      const out = [];
      const kx = Math.round(nd.x * 10) / 10, ky = Math.round(nd.y * 10) / 10;
      const col = byX.get(kx) || [], row = byY.get(ky) || [];
      /* 邻居 = 沿同一列/同一行「一直走，直到撞框」能到达的每一个格点。
         以前只连紧邻的一格，等于强迫线在每个交叉点都得拐一下，
         路径被切成细碎的小折，图上全是没必要的台阶。
         直连（跨多远都按直线算）才是正交走线该有的样子。 */
      const cast = (arr, idx, sign) => {
        for (let j = idx + sign; j >= 0 && j < arr.length; j += sign) {
          const q = arr[j].nd;
          if (!linkOk(nd, q)) break;
          out.push({ k: arr[j].k, nd: q });
        }
      };
      cast(col, col.findIndex(e => e.k === k), 1);
      cast(col, col.findIndex(e => e.k === k), -1);
      cast(row, row.findIndex(e => e.k === k), 1);
      cast(row, row.findIndex(e => e.k === k), -1);
      return out;
    };

    /* A*：从若干起点出发，走到任一目标端子；返回点序列（含首尾） */
    // 拐一次弯的罚分取 48（略大于一个行距 78 的一半）：
    // 太小会贴着框边「棋盘格」乱窜，太大则宁愿绕到图外也不愿多拐一下。
    const BEND = 48;
    const astar = (starts, isGoal, hOf) => {
      let bestPts = null, bestCost = Infinity;
      starts.forEach(st => {
        const g = new Map(), prev = new Map(), done = new Set();
        const open = [{ k: st.k, dir: st.dir, g: 0, f: 0 }];
        g.set(st.k + '|' + st.dir, 0);
        prev.set(st.k + '|' + st.dir, null);
        while (open.length) {
          let bi = 0;
          for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
          const cur = open.splice(bi, 1)[0];
          const ck = cur.k + '|' + cur.dir;
          if (done.has(ck)) continue;
          done.add(ck);
          const nd = nodesAt.get(cur.k);
          const hitGoal = isGoal(cur.k, nd, cur.dir);
          if (hitGoal && cur.g < bestCost) {
            bestCost = cur.g;
            const pts = [];
            for (let key = ck; key; key = prev.get(key)) {
              const parts = key.split('|');
              pts.unshift([+parts[0], +parts[1]]);
            }
            bestPts = pts;
          }
          if (hitGoal) continue;
          if (cur.g >= bestCost) continue;
          for (const nb of neighbours(cur.k)) {
            const dir = Math.abs(nb.nd.x - nd.x) < TOL ? 2 : 1;
            const cost = cur.g + Math.abs(nb.nd.x - nd.x) + Math.abs(nb.nd.y - nd.y) +
              (cur.dir && cur.dir !== dir ? BEND : 0);
            const nk = nb.k + '|' + dir;
            if (g.has(nk) && g.get(nk) <= cost) continue;
            g.set(nk, cost); prev.set(nk, ck);
            open.push({ k: nb.k, dir, g: cost, f: cost + (hOf ? hOf(nb.nd) : 0) * 1.2 });
          }
        }
      });
      return bestPts;
    };

    const polyline = pts => {
      // 去掉重复点与共线冗余点，路径更短也更干净
      const out = [];
      pts.forEach(q => {
        const last = out[out.length - 1];
        if (last && Math.abs(last[0] - q[0]) < 0.5 && Math.abs(last[1] - q[1]) < 0.5) return;
        out.push(q);
      });
      const tidy = [out[0]];
      for (let i = 1; i < out.length - 1; i++) {
        const p0 = tidy[tidy.length - 1], p1 = out[i], p2 = out[i + 1];
        const sameX = Math.abs(p0[0] - p1[0]) < 0.5 && Math.abs(p1[0] - p2[0]) < 0.5;
        const sameY = Math.abs(p0[1] - p1[1]) < 0.5 && Math.abs(p1[1] - p2[1]) < 0.5;
        if (!sameX && !sameY) tidy.push(p1);
      }
      if (out.length > 1) tidy.push(out[out.length - 1]);
      return tidy.map((q, i) => (i ? 'L' : 'M') + Math.round(q[0] * 10) / 10 + ',' +
        Math.round(q[1] * 10) / 10).join(' ');
    };

    const keyOf = (x, y) => Math.round(x * 10) / 10 + '|' + Math.round(y * 10) / 10;

    /* 单条边：从 a 的某个端子出发，走到 b 的某个端子。
       ── 先迈一步、最后一步 ─────────────────────────────────
       端子就落在框边上，若让搜索直接从端子开始，它可以沿框边擦着走，
       于是会出现「从框的下边出发、却横着飘出去」这种看着像接错框的线。
       所以起点先沿法向迈 5px 再交给搜索；终点则要求最后一段垂直于
       目标框的那条边，最后再补到框边，箭头才稳稳贴着框。 */
    const edgePath = (s, t) => {
      const a = pos[s], b = pos[t];
      if (!a || !b) return '';
      const axC = a.l + a.w / 2, bxC = b.l + b.w / 2;
      const down = b.y >= a.y;
      const yA = down ? a.b : a.t;
      const yB = down ? b.t : b.b;
      /* 同一行的连线一律手工画，因为它们的几何很固定：
         · 目标在右：从源框右边平着过去，直接扎目标框左边 —— 最简单也最自然。
         · 目标在左：先沿源框左边下到目标正上方（或正下方），
           再竖着从目标框的顶边（底边）进。绝不能横着扎进右边的腰。
         这三种走法比交给搜索更稳，也不会在框缝里绕出多余的小折。 */
      if (Math.abs(a.y - b.y) < 1) {
        const yC = a.t + MM.nodeH / 2;
        const bxc = b.l + b.w / 2;
        if (b.l >= a.r) {
          if (segOk(a.r + 1, yC, b.l - 1, yC)) return `M${a.r},${yC} L${b.l},${yC}`;
        } else if (a.l >= b.r) {
          /* 目标在左、中间没挡：直接横过去，箭头扎目标框右边。
             早先这里一律「先往上/下绕、再从顶/底边进」，于是同一行的
             两个分支被画成绕一圈的回形针（ch07「可分离变量方程 → 齐次方程」
             就是从右边横出去再折回来）。只有中间确实被别的框挡住、
             或目标框就在左边紧邻位置才需要绕。 */
          if (segOk(b.r + 1, yC, a.l - 1, yC)) return `M${a.l},${yC} L${b.r},${yC}`;
          const xOut = a.l - 3;
          const yIn = yC - 14;                       // 从上方绕
          if (segOk(a.l, yC, xOut, yC) && segOk(xOut, yC, xOut, yIn) &&
              segOk(xOut, yIn, bxc, yIn) && segOk(bxc, yIn, bxc, b.t)) {
            return polyline([[a.l, yC], [xOut, yC], [xOut, yIn], [bxc, yIn], [bxc, b.t]]);
          }
          const yIn2 = yC + MM.nodeH + 14;           // 上方走不通就从下方绕
          if (segOk(a.l, yC, xOut, yC) && segOk(xOut, yC, xOut, yIn2) &&
              segOk(xOut, yIn2, bxc, yIn2) && segOk(bxc, yIn2, bxc, b.b)) {
            return polyline([[a.l, yC], [xOut, yC], [xOut, yIn2], [bxc, yIn2], [bxc, b.b]]);
          }
        }
      }
      /* 同一列里的两框：先把折线修直，再交给下面的搜索。
         窄框用真实宽度、宽框用车道宽度时，父子两框的中心线可能差十几像素；
         这本来是一条竖线的事，交给 A* 会画成「先下、再横一点、再下」的 S 形。
         规则：若两框在横向上有重叠、只差不到 0.6 个框宽，就把入口/出口
         挪到两者重叠区的中点（对齐到源的出口），这样竖段是一条直线。
         挪出口比挪入口安全：出口在框边，箭头仍然稳稳贴着目标框。 */
      // 两框中心线差多少以内才值得「修直」
      const snap = (() => {
        if (Math.abs(axC - bxC) < 1) return null;
        if (Math.abs(axC - bxC) > MM.nodeW * 0.6) return null;
        const lo = Math.max(a.l, b.l), hi = Math.min(a.r, b.r);
        if (hi - lo < 16) return null;                 // 没有像样的重叠区
        const x = Math.min(hi - 8, Math.max(lo + 8, axC));
        if (!segOk(x, yA, x, yB)) return null;
        if (hit(x + 0.5, Math.min(yA, yB), x + 0.5, Math.max(yA, yB))) return null;
        return x;
      })();
      const exA = snap === null ? axC : snap;
      const exTs = snap === null ? bxC : snap;
      /* 上下相邻、左右错开不多：直接从底边竖到顶边（中间没有框挡着）。
         这里不要求两框等宽或左缘对齐——只要竖直通道是空的，竖线就是最短最清楚的路。 */
      if (Math.abs(exA - exTs) < 1 && down && segOk(exA, yA, exTs, yB)) {
        return polyline([[exA, yA], [exTs, yB]]);
      }
      if (Math.abs(exA - exTs) <= MM.nodeW * 0.8 && down && segOk(exA, yA, exA, yB)) {
        return polyline([[exA, yA], [exA, yB], [exTs, yB]]);
      }
      // 同一侧竖列上、上下相邻的两个分支：直接一条竖线
      if (Math.abs(axC - bxC) < 30 && segOk(axC, yA, bxC, yB) &&
          !hit(axC + 0.5, Math.min(yA, yB), axC + 0.5, Math.max(yA, yB))) {
        return `M${axC},${yA} L${bxC},${yB}`;
      }
      /* 同一行的兄弟：中间没有别的框就直接横着连，箭头贴住目标框 */
      if (Math.abs(a.y - b.y) < 1) {
        const yC = a.t + MM.nodeH / 2;
        if (a.r <= b.l && segOk(a.r + 1, yC, b.l - 1, yC)) return `M${a.r},${yC} L${b.l},${yC}`;
        if (b.r <= a.l && segOk(b.r + 1, yC, a.l - 1, yC)) return `M${b.r},${yC} L${a.l},${yC}`;
      }

      const norm = sd => (sd === 'left' ? { dx: -1, dy: 0 } : sd === 'right' ? { dx: 1, dy: 0 }
        : sd === 'top' ? { dx: 0, dy: -1 } : { dx: 0, dy: 1 });
      const goals = PORT[t] || [];
      const tryRoute = forcedSide => {
        const starts = [];
        (PORT[s] || []).forEach(p => {
          if (forcedSide && p.side !== forcedSide) return;
          const ns = norm(p.side);
          const k = keyOf(p.x + ns.dx * PROBE, p.y + ns.dy * PROBE);
          if (nodesAt.has(k)) starts.push({ k, dir: ns.dx ? 1 : 2 });
        });
        if (!starts.length) return null;
        const isGoal = (k, nd, dir) => {
          const gp = goals.find(g => eq(nd.x, g.x) && eq(nd.y, g.y));
          if (!gp) return false;
          // 同一行且目标在左侧时，只准从上下边进入（见上面的③）
          if (sameRow && offsetB < 0 && gp.side !== 'top' && gp.side !== 'bottom') return false;
          // 同一行且目标在右侧时，只准从左右边进入：横着连过去最自然，
          // 让线绕到上面再从顶边扎进来反而多此一举。
          if (sameRow && offsetB >= 0 && gp.side !== 'left' && gp.side !== 'right') return false;
          return dir === (norm(gp.side).dx ? 1 : 2);
        };
        const pts = astar(starts, isGoal,
          nd => Math.min(...goals.map(gp => Math.abs(nd.x - gp.x) + Math.abs(nd.y - gp.y))));
        if (!pts || !pts.length) return null;
        const last = pts[pts.length - 1];
        const gp = goals.reduce((best, g) =>
          (Math.abs(g.x - last[0]) + Math.abs(g.y - last[1]) <
           Math.abs(best.x - last[0]) + Math.abs(best.y - last[1]) ? g : best), goals[0]);
        const full = [[a.l + a.w / 2, a.t + MM.nodeH / 2]].slice(0, 0);
        if (!(eq(gp.x, last[0]) && eq(gp.y, last[1]))) pts.push([gp.x, gp.y]);
        return polyline(pts);
      };
      // 第一轮：优先「从左右边平着出去」（最符合阅读方向），不行再放开
      /* 出口方向：
         ① 上下对齐（同一列）→ 强制从下/上边进出，箭头才是竖着指的；
            否则箭头会扎在目标框的水平边中点上、方向横着，看着像接错。
         ② 同一行且目标在右 → 从右边出去（顺着阅读方向）。
         ③ 同一行且目标在左 → 从左边出去，先横到目标正下方/正上方，
            再竖着从底边/顶边进；不能让线横着扎进框的右侧腰。 */
      const offsetB = (b.l + b.w / 2) - (a.l + a.w / 2);
      const sameRow = Math.abs(a.y - b.y) < 1;
      let rightFirst;
      if (Math.abs(offsetB) < 4) rightFirst = 'bottom';
      else if (!sameRow) rightFirst = offsetB > 0 ? 'right' : 'left';
      else rightFirst = offsetB > 0 ? 'right' : 'left';
      const d1 = tryRoute(rightFirst);
      if (d1) return d1;
      const d2 = tryRoute(null);
      if (d2) return d2;
      // 兜底：绕最外侧
      const lane = axC < cx ? laneL : laneR;
      return `M${axC},${yA} L${lane},${yA} L${lane},${yB} L${bxC},${yB}`;
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
        <rect x="${p.x}" y="${p.y}" width="${p.w}" height="${MM.nodeH}" rx="6"
          fill="${s.fill}" stroke="${s.stroke}" stroke-width="${isRoot ? 1.5 : 1}"/>
        <text x="${p.x + p.w / 2}" y="${p.y + MM.nodeH / 2 + 1}"
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

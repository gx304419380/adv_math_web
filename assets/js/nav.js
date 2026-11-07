/* 全站导航：由 chapters.json 单一数据源生成侧栏、进度看板、章节导航 */

const STATUS = {
  done:    { text: '已完成', cls: 'done' },
  review:  { text: '复核中', cls: '' },
  draft:   { text: '撰写中', cls: '' },
  planned: { text: '计划中', cls: 'planned' }
};

async function initNav({ metaUrl, base = '', currentId = null, isHome = false } = {}) {
  // file:// 直接打开时无法 fetch，优先使用内嵌的 chapters.js 数据
  let data = window.AM_CHAPTERS || null;
  if (!data && metaUrl) {
    try {
      data = await fetch(metaUrl).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      });
    } catch (err) {
      console.warn('[nav] 章节元数据加载失败：', err);
      return null;
    }
  }
  if (!data) return null;
  const chapters = data.chapters || [];
  const byId = Object.fromEntries(chapters.map(c => [c.id, c]));
  const current = currentId ? byId[currentId] : null;
  const link = id => `${base}chapters/${id}/${id}.html`;

  /* 章节头信息填充 */
  if (current) {
    const slots = {
      index: current.index, title: current.title, subtitle: current.subtitle,
      volume: current.volume, estMinutes: current.estMinutes
    };
    Object.entries(slots).forEach(([k, v]) => {
      const el = document.querySelector(`[data-slot="${k}"]`);
      if (el) el.textContent = v;
    });
    document.title = `第 ${current.index} 章 · ${current.title} | 高等数学互动学习站`;
    const badge = document.querySelector('[data-status-badge]');
    if (badge) {
      const s = STATUS[current.status] || STATUS.planned;
      badge.className = `badge ${s.cls}`;
      badge.textContent = s.text;
    }
  }

  /* 侧栏 */
  const sidebar = document.querySelector('[data-nav-sidebar]');
  if (sidebar) {
    const parts = ['<h4>全站章节</h4>'];
    ['上册', '下册'].forEach(vol => {
      parts.push(`<div class="nav-divider"></div>`);
      chapters.filter(c => c.volume === vol).forEach(c => {
        const on = c.id === currentId ? ' is-current' : '';
        const s = STATUS[c.status] || STATUS.planned;
        parts.push(`<a class="${on.trim()}" href="${link(c.id)}">${String(c.index).padStart(2, '0')} ${c.title}${s.cls === 'planned' ? '' : ' · ' + s.text}</a>`);
      });
    });
    if (current && current.sections) {
      parts.push('<div class="nav-divider"></div><h4>本章目录</h4>');
      current.sections.forEach((s, i) => {
        parts.push(`<a class="sec-link" href="#${s.id || 's' + (i + 1)}">${s.title}</a>`);
      });
    }
    sidebar.innerHTML = parts.join('');
  }

  /* 上一章 / 下一章 */
  const navBox = document.querySelector('[data-chapter-nav]');
  if (navBox && current) {
    const prev = current.prev ? byId[current.prev] : null;
    const next = current.next ? byId[current.next] : null;
    navBox.className = 'chapter-nav';
    navBox.innerHTML = [
      prev ? `<a href="${link(prev.id)}"><span>← 上一章</span>${String(prev.index).padStart(2, '0')} ${prev.title}</a>`
           : '<div class="nav-empty"></div>',
      next ? `<a class="nav-next" href="${link(next.id)}"><span>下一章 →</span>${String(next.index).padStart(2, '0')} ${next.title}</a>`
           : '<div class="nav-empty"></div>'
    ].join('');
  }

  /* 首页：进度看板 + 章节卡片 */
  const panel = document.querySelector('[data-progress-board]');
  const done = chapters.filter(c => c.status === 'done').length;
  if (panel) {
    const deg = Math.round(done / chapters.length * 360);
    panel.innerHTML = `
      <div class="progress-ring" style="background:conic-gradient(var(--accent) ${deg}deg, var(--border) ${deg}deg)">
        <span>${done}/${chapters.length}</span>
      </div>
      <div class="progress-text">
        <b>已完成 ${done} 章，共 ${chapters.length} 章</b><br>
        <span class="hint">按教材上下册顺序编排，每章配原创讲解、交互示意图与动画。</span>
      </div>`;
  }

  const grid = document.querySelector('[data-chapter-grid]');
  if (grid) {
    grid.innerHTML = chapters.map(c => {
      const s = STATUS[c.status] || STATUS.planned;
      const planned = c.status === 'planned' ? ' is-planned' : '';
      const href = c.status === 'planned' ? 'javascript:void(0)' : link(c.id);
      const tag = `<div class="cc-top"><span class="cc-num">${c.volume} · 第 ${String(c.index).padStart(2, '0')} 章</span><span class="badge ${s.cls}">${s.text}</span></div>
        <div class="cc-title">${c.title}</div>
        <div class="cc-sub">${c.subtitle}</div>
        <div class="cc-foot">${c.sections.length} 节 · 约 ${c.estMinutes} 分钟${c.demos.length ? ' · ' + c.demos.length + ' 个交互演示' : ''}</div>`;
      return c.status === 'planned'
        ? `<div class="chapter-card${planned}" aria-disabled="true">${tag}</div>`
        : `<a class="chapter-card" href="${href}">${tag}</a>`;
    }).join('');
  }

  /* 学习目标勾选状态（按章 + 序号存本地） */
  const goals = document.querySelector('[data-goal-list]');
  if (goals && currentId) {
    const key = `am-goals-${currentId}`;
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) {}
    [...goals.querySelectorAll('input[type="checkbox"]')].forEach((cb, i) => {
      const wrap = cb.closest('label');
      const paint = () => wrap.classList.toggle('is-done', cb.checked);
      cb.checked = saved.includes(i);
      paint();
      cb.addEventListener('change', () => {
        paint();
        const arr = [...goals.querySelectorAll('input[type="checkbox"]')]
          .map((x, k) => x.checked ? k : -1).filter(k => k >= 0);
        try { localStorage.setItem(key, JSON.stringify(arr)); } catch (_) {}
      });
    });
  }

  return { chapters, current };
}

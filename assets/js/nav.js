/* 全站导航：由 chapters.json 单一数据源生成侧栏、进度看板、章节导航 */

const STATUS = {
  done:    { text: '已完成', cls: 'done' },
  review:  { text: '复核中', cls: '' },
  draft:   { text: '撰写中', cls: '' },
  planned: { text: '计划中', cls: 'planned' }
};

/* 侧栏小节高亮：滚到哪一节，左侧就高亮哪一条。
   用 IntersectionObserver 而不是 scroll 事件，性能更好，手机上也不会抖。 */
function initSectionSpy() {
  const links = [...document.querySelectorAll('.sb-secs .sec-link')];
  if (!links.length || !('IntersectionObserver' in window)) return;

  const map = new Map();
  links.forEach(a => {
    const el = document.getElementById(a.dataset.sec);
    if (el) map.set(el, a);
  });
  if (!map.size) return;

  const setActive = a => links.forEach(l => l.classList.toggle('is-active', l === a));

  const io = new IntersectionObserver(entries => {
    // 取视口内最靠上的那一节作为"当前"
    const visible = entries.filter(e => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible.length) setActive(map.get(visible[0].target));
  }, { rootMargin: '-64px 0px -65% 0px', threshold: 0 });

  map.forEach((_, el) => io.observe(el));

  // 初始：有锚点跟锚点，否则高亮第一节
  const hash = decodeURIComponent(location.hash.slice(1));
  const target = hash ? map.get(document.getElementById(hash)) : null;
  setActive(target || links[0]);

  // 点击后立刻高亮，不等滚动结束
  links.forEach(a => a.addEventListener('click', () => setActive(a)));
}

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

  /* 侧栏：进入某一章后，只显示本章的小节目录。
     已经在这一章里了，再列 12 章的标题没有意义——学生要的是「跳到第 7 节」。
     全站章节导航移到页面顶部的「章节目录」下拉里。 */
  const sidebar = document.querySelector('[data-nav-sidebar]');
  if (sidebar && current && current.sections && current.sections.length) {
    const parts = [
      `<div class="sb-head">`,
      `  <span class="sb-chno">第 ${current.index} 章</span>`,
      `  <span class="sb-chtitle">${current.title}</span>`,
      `</div>`,
      `<nav class="sb-secs" aria-label="本章小节">`
    ];
    current.sections.forEach((s, i) => {
      const id = s.id || 's' + (i + 1);
      parts.push(`<a class="sec-link" href="#${id}" data-sec="${id}"><span class="sec-no">${current.index}.${i + 1}</span>${s.title}</a>`);
    });
    parts.push('</nav>');

    // 本章其它资源：知识结构图、习题、下一章
    const extra = [];
    [['map', '知识结构图'], ['pitfalls', '常见误区'], ['quiz', '习题与自测'], ['summary', '本章小结']]
      .forEach(([id, label]) => {
        if (document.getElementById(id)) extra.push(`<a href="#${id}">${label}</a>`);
      });
    if (extra.length) {
      parts.push('<div class="sb-foot">' + extra.join('') + '</div>');
    }
    sidebar.innerHTML = parts.join('');
  } else if (sidebar) {
    sidebar.innerHTML = '<div class="sb-head"><span class="sb-chtitle">目录</span></div>';
  }

  // 必须等侧栏 DOM 就绪后再绑定滚动高亮
  initSectionSpy();

  /* 顶部「章节目录」下拉：全站 12 章的入口集中在这里，
     侧栏则专注当前章的小节，两者分工不重叠 */
  const menuBtn = document.querySelector('[data-chapter-menu]');
  if (menuBtn) {
    const wrap = document.createElement('div');
    wrap.className = 'ch-menu';
    menuBtn.parentElement.appendChild(wrap);
    wrap.appendChild(menuBtn);
    const panel = document.createElement('div');
    panel.className = 'ch-menu-panel';
    panel.innerHTML = ['上册', '下册'].map(vol => {
      const items = chapters.filter(c => c.volume === vol).map(c => {
        const on = c.id === currentId ? ' is-current' : '';
        const st = STATUS[c.status] || STATUS.planned;
        return `<a class="${on.trim()}" href="${link(c.id)}"><span class="cm-no">${String(c.index).padStart(2, '0')}</span><span class="cm-t">${c.title}</span><span class="cm-s ${st.cls}">${st.text}</span></a>`;
      }).join('');
      return `<div class="cm-vol">${vol}</div>${items}`;
    }).join('');
    wrap.appendChild(panel);

    menuBtn.addEventListener('click', e => {
      e.preventDefault();
      wrap.classList.toggle('open');
    });
    document.addEventListener('click', e => {
      if (!wrap.contains(e.target)) wrap.classList.remove('open');
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') wrap.classList.remove('open');
    });
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
      // 表格式列表：编号 / 标题 / 副标题 / 元信息 / 状态，一行一章。
      // 比卡片网格扫读效率高得多，也更接近「目录」该有的样子。
      const tag = `<span class="cc-num">${String(c.index).padStart(2, '0')}</span>
        <span class="cc-main">
          <span class="cc-title">${c.title}</span>
          <span class="cc-sub">${c.subtitle}</span>
        </span>
        <span class="cc-foot">${c.sections.length} 节 · ${c.estMinutes} 分钟${c.demos.length ? ' · ' + c.demos.length + ' 个演示' : ''}</span>
        <span class="badge ${s.cls}">${s.text}</span>`;
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

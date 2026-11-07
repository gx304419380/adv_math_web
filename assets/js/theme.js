/* 深浅色主题：跟随系统偏好，也可手动切换并记住选择 */

const KEY = 'am-theme';

function initTheme() {
  let theme = null;
  try { theme = localStorage.getItem(KEY); } catch (_) {}
  if (!theme) {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = theme;

  const btn = document.createElement('button');
  btn.className = 'theme-toggle';
  btn.type = 'button';
  btn.setAttribute('aria-label', '切换深浅色主题');
  btn.title = '切换深浅色主题';
  const paint = () => { btn.textContent = document.documentElement.dataset.theme === 'dark' ? '☀' : '☾'; };
  paint();
  btn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(KEY, next); } catch (_) {}
    paint();
    document.dispatchEvent(new CustomEvent('theme:change', { detail: next }));
  });
  document.body.appendChild(btn);
}

/** 移动端侧栏折叠开关 */
function initNavToggle() {
  const sidebar = document.querySelector('[data-nav-sidebar]');
  if (!sidebar) return;
  const btn = document.createElement('button');
  btn.className = 'btn nav-toggle';
  btn.type = 'button';
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span aria-hidden="true">☰</span> 本节目录';
  const sync = () => {
    const open = sidebar.classList.contains('is-open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.classList.toggle('is-open', open);
  };
  btn.addEventListener('click', () => {
    sidebar.classList.toggle('is-open');
    sync();
    // 展开后把侧栏滚进视野，否则按钮在底部、目录在页面上方，用户不知道去哪看
    if (sidebar.classList.contains('is-open')) {
      sidebar.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  });
  // 点某一条小节后自动收起，避免目录挡住刚跳过去的内容
  sidebar.addEventListener('click', e => {
    if (e.target.closest('.sec-link') && window.matchMedia('(max-width:900px)').matches) {
      sidebar.classList.remove('is-open');
      sync();
    }
  });
  document.body.appendChild(btn);
}

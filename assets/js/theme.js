/* 深浅色主题：跟随系统偏好，也可手动切换并记住选择 */

const KEY = 'am-theme';

export function initTheme() {
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
export function initNavToggle() {
  const sidebar = document.querySelector('[data-nav-sidebar]');
  if (!sidebar) return;
  const btn = document.createElement('button');
  btn.className = 'btn nav-toggle';
  btn.type = 'button';
  btn.textContent = '☰ 目录';
  btn.addEventListener('click', () => sidebar.classList.toggle('is-open'));
  document.body.appendChild(btn);
}

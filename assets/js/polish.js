/* 页面级润色：阅读进度条、顶部导航当前项高亮。作为 module 自动执行 */

function initReadingProgress() {
  const bar = document.querySelector('[data-reading-progress]');
  if (!bar) return;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? Math.min(100, Math.max(0, window.scrollY / max * 100)) : 0) + '%';
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

function initTopbarHighlight() {
  const here = location.pathname;
  document.querySelectorAll('.topbar .tb-nav a').forEach(a => {
    const href = a.getAttribute('href') || '';
    const match = (href === 'index.html' && here.endsWith('/index.html'))
      || (href === 'style-guide.html' && here.endsWith('style-guide.html'))
      || (href.includes('ch01.html') && here.includes('ch01.html'));
    if (match) {
      a.style.color = 'var(--accent)';
      a.style.fontWeight = '700';
    }
  });
}

initReadingProgress();
initTopbarHighlight();

/* 页面装配总入口：单章 HTML 只需引入这一个模块 */

const isHome = !document.body.dataset.chapter;
const base = isHome ? '' : '../../';
const currentId = document.body.dataset.chapter || null;
// 相对模块自身位置解析，不依赖页面所在层级，Pages 子路径下同样有效
const metaUrl = (isHome ? '' : '../../') + 'chapters.json';

initTheme();
initNavToggle();
initMath(document);
initNav({ metaUrl, base, currentId, isHome }).catch(err => console.warn('[boot] 导航初始化失败：', err));

document.querySelectorAll('[data-mount]').forEach(el => {
  const type = el.dataset.mount;
  try {
    if (type === 'mindmap') {
      renderMindmap(el);
    } else if (type === 'quiz') {
      mountQuiz(el);
    } else if (type === 'graph') {
      mountGraph(el, {
        fn: el.dataset.fn || 'x',
        xmin: Number(el.dataset.xmin ?? -5), xmax: Number(el.dataset.xmax ?? 5),
        ymin: Number(el.dataset.ymin ?? -3), ymax: Number(el.dataset.ymax ?? 3)
      });
    } else if (type === 'steps') {
      // 分步控制器由各章 demo.js 自行创建，这里只留挂载点
    }
  } catch (err) {
    console.warn(`[boot] 挂载 ${type} 失败：`, err);
    libError(el, type);
  }
});

document.dispatchEvent(new CustomEvent('site:ready'));

/* 渲染完成后再审计一次：确认没有原始 TeX / 中文混入公式漏到页面上（见 docs/MATH_TYPESET.md） */
window.addEventListener('load', () => {
  setTimeout(() => auditMath(document), 600);
});

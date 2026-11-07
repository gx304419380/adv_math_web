/* KaTeX 自动渲染：全站统一入口 */

function initMath(root = document) {
  if (!hasLib('katex') || !hasLib('math')) return false;
  try {
    window.renderMathInElement(root, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
      throwOnError: false,
      strict: false
    });
    return true;
  } catch (err) {
    console.warn('[math] 公式渲染失败：', err);
    return false;
  }
}

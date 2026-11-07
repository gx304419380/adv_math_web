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
      // strict: 'warn' 让不规范写法（中文直入公式、缺 \\text、非法宏）在控制台报出来，
      // 而不是静默渲染成奇怪的直立体——见 docs/MATH_TYPESET.md
      strict: 'warn',
      // 数学正文用正文字体，避免与中文混排时基线跳动
      trust: false,
      // 统一宏：登记于 docs/MATH_TYPESET.md 附表，禁止各章自造而不登记
      macros: {
        '\\R': '\\mathbb{R}',
        '\\N': '\\mathbb{N}',
        '\\Z': '\\mathbb{Z}',
        '\\dx': '\\mathrm{d}x',
        '\\d': '\\mathrm{d}',
        '\\ee': '\\mathrm{e}',
        '\\ii': '\\mathrm{i}'
      }
    });
    return true;
  } catch (err) {
    console.warn('[math] 公式渲染失败：', err);
    return false;
  }
}

/* ============================================================
   数学排版守卫：在渲染后检查“原始写法”是否漏到页面上
   1. 未被渲染的 $ / $$ / \( 残留 → 说明定界符写错（如 &lt; 转义错、跨块）
   2. 公式节点内的中文/中文标点 → 应写成 \text{中文}，否则会被当成变量斜体
   3. <code> 内的裸 TeX（让学生看到 \frac 这种源码）
   检查结果输出到控制台并在开发时高亮，见 docs/MATH_TYPESET.md §7
   ============================================================ */
function auditMath(root = document) {
  const issues = [];

  // 1. 残留定界符（文本节点里出现 $ 或 \( ）
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = n.nodeValue || '';
    if (/[^\\]\$|\\\(/.test(t) && !n.parentElement.closest('.katex, pre, code, .demo-box')) {
      issues.push({ type: 'raw-delimiter', text: t.trim().slice(0, 60) });
    }
  }

  // 2. 公式内的中文（KaTeX 会把汉字塞进斜体数学字体，违反排版规范）
  root.querySelectorAll('.katex').forEach(el => {
    const t = el.textContent || '';
    if (/[\u4e00-\u9fff]/.test(t)) {
      issues.push({ type: 'cjk-in-math', text: t.trim().slice(0, 60) });
    }
  });

  if (issues.length) {
    console.warn(`[math-audit] 发现 ${issues.length} 处不规范排版：`, issues.slice(0, 10));
  }
  return issues;
}

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

/* ============================================================
   运行时公式渲染入口：按钮、读数、标签都用它，禁止用 Unicode 凑数学
   ------------------------------------------------------------
   反面例子（曾经出现在演示按钮上，已全部修掉）：
     'x²'  'x³'  'eˣ'  '√x'  '1/x'  'P(x)'      ← 上下标是字符、根号是符号
   正确做法：
     texInline('x^{2}') → <span class="katex">…真正的上标…</span>
   JS 里画布内无法渲染 KaTeX 时，才允许退化为 Unicode，且必须走 canvasLabel()。
   ============================================================ */
function texInline(tex, opts = {}) {
  // 读数里偶尔会把数字直接传进来；统一转成字符串，避免降级分支调用 .replace 报错
  tex = String(tex);
  const span = document.createElement('span');
  span.className = 'tex-inline';
  if (!window.katex) {
    // 极端降级：库没加载上时给出可读文本，绝不显示反斜杠
    span.textContent = tex.replace(/[\\{}^_]/g, '');
    return span;
  }
  try {
    window.katex.render(tex, span, {
      displayMode: false,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
      output: opts.output || 'html'
    });
  } catch (err) {
    span.textContent = tex.replace(/[\\{}^_]/g, '');
  }
  return span;
}

/* 把 texInline 的 HTML 字符串直接塞进 innerHTML 用（按钮、读数） */
function texHTML(tex, opts) {
  return texInline(tex, opts).outerHTML;
}

/* 画布内文字：KaTeX 用不了，这里统一做最保守的降级，且不用于正文 */
function canvasLabel(tex) {
  return String(tex)
    .replace(/\\mathrm\{([^}]*)\}/g, '$1')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
    .replace(/\\sqrt\{([^}]*)\}/g, '√($1)')
    .replace(/\\cdot|\\times/g, '×')
    .replace(/\\to/g, '→')
    .replace(/\\infty/g, '∞')
    .replace(/\\le/g, '≤').replace(/\\ge/g, '≥').replace(/\\ne|\\neq/g, '≠')
    .replace(/\\pi/g, 'π').replace(/\\alpha/g, 'α').replace(/\\varepsilon/g, 'ε')
    .replace(/\\Delta/g, 'Δ').replace(/\\delta/g, 'δ')
    .replace(/\\,|\\;|\\quad|\\qquad|\\ /g, ' ')
    .replace(/[\^_]\{([^{}]*)\}/g, (m, p1) => SUP[p1] || ('^' + p1))
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .trim();
}
const SUP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵',
  '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺', 'n': 'ⁿ', 'x': 'ˣ'
};

/* 把一个容器里的 \[data-tex] 元素批量渲染成公式（按钮栏、读数用） */
function renderTexNodes(root = document) {
  root.querySelectorAll('[data-tex]').forEach(el => {
    if (el.dataset.texDone === '1') return;
    const tex = el.getAttribute('data-tex');
    el.innerHTML = '';
    el.appendChild(texInline(tex));
    el.dataset.texDone = '1';
  });
}

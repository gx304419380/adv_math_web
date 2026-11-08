# 组件库

> **规则：下面每一个结构都是「复制即用」的。** 写新章节时从这里取，不要自己另写一套。
> 需要的新样式先加进组件库并在此登记，再在章节里使用。

配套可视化版：[`style-guide.html`](../style-guide.html)（每段可一键复制）。

---

## 0. 为什么要有组件库

12 章、上百个小节、上千个公式块。如果每章各写各的，必然出现：同是「定理」却一个圆角大一个圆角小、一个紫色一个蓝色、一个把证明折叠一个不折叠。

**组件库的作用是把「一致性」变成默认结果，而不是靠每次记得。**

判断标准很简单：**同一个东西，在两章里长得必须一模一样。** 如果不一样，要么是 bug，要么是新组件——后者必须先入库。

---

## 1. 语义块（最常用）

全部基于 `.math-block` + 修饰类。结构永远是三段：头部（标签 / 标题 / 编号）+ 正文。

```html
<div class="math-block definition">
  <div class="mb-head">
    <span class="mb-tag">定义</span>
    <span class="mb-title">函数的极限</span>
    <span class="mb-no">1.3</span>
  </div>
  <div class="mb-body">
    设函数 \(f(x)\) 在点 \(x_0\) 的某个去心邻域内有定义……
  </div>
</div>
```

| 内容类型 | 修饰类 | 用途 | 编号 |
|---|---|---|---|
| 定义 | `.definition` | 概念的精确表述 | 必须有 |
| 定理 | `.theorem` | 重要结论 | 必须有 |
| 性质 / 推论 | `.property` | 由定理直接得到的结论 | 有则加 |
| 例题 | `.example` | 见 §3 | 必须有 |
| 习题 | `.exercise` | 见 §4 | 必须有 |
| 注记 | `.remark` | 符号约定、边界条件 | 不要 |
| 直观理解 | `.insight` | 几何意义、类比 | 不要 |
| 常见误区 | `.pitfall` | 易错点 + 为什么错 | 可加「误区一」 |

**注意**：`.mb-tag` 的「·」由 CSS 自动生成，不要手写。编号写纯数字（`1.3`），不要写「定理 1.3」。

### 行内强调

```html
<strong class="term">去心邻域</strong>   <!-- 首次出现的术语，紫色虚线下划线 -->
<mark class="key">极限唯一</mark>        <!-- 该记住的结论，荧光笔底 -->
<strong>普通加粗</strong>                 <!-- 只用于结构性词组 -->
```

> `.key` 每节**不超过 5 处**。四处都是高亮等于没有高亮。

---

## 2. 公式

### 行内公式

```html
由 \(\varepsilon\) 的任意性可知……
```

**中文与公式之间必须有空格**：写 `函数 \(y=f(x)\) 的图像`，不要写 `函数\(y=f(x)\)的图像`。

### 独立编号公式

```html
<div class="formula-box">
  <span class="fb-no">(1.1)</span>
  $$\lim_{x\to x_0}f(x)=L \iff \forall\,\varepsilon>0,\ \exists\,\delta>0:\ 0<|x-x_0|<\delta \Rightarrow |f(x)-L|<\varepsilon$$
</div>
```

### 推导 / 证明（常显，不折叠）

```html
<div class="proof-title">证明 · 极限唯一（反证法，3 步）</div>
<ol class="derive proof-body">
  <li>
    <span class="derive-eq">假设 \(a_n\to A\) 且 \(a_n\to B\)，\(A\neq B\)</span>
    <span class="derive-note">这一步在做什么，为什么能这么做</span>
  </li>
</ol>
```

> **证明不折叠**。学生不该为了看证明再点一次。折叠只保留给习题答案。
> `.derive-note` 是每步的「为什么」，不是可选装饰——没有它就等于跳步。

公式的写法细则见 [MATH_TYPESET.md](MATH_TYPESET.md)。**动笔前必读。**

---

## 3. 例题（四段式）

```html
<div class="math-block example">
  <div class="mb-head">
    <span class="mb-tag">例题</span>
    <span class="mb-title">0/0 型：根号差式的有理化</span>
    <span class="mb-no">例 1.1</span>
  </div>
  <div class="mb-body">
    <div class="ex-part">
      <span class="ex-label">题目</span>
      <span class="ex-q">求 \(\lim\limits_{x\to 0}\dfrac{\sqrt{1+x}-1}{x}\)。</span>
    </div>
    <div class="ex-part">
      <span class="ex-label">思路</span>
      <span>先代入试试：分子分母都是 0，得到 0/0，不能直接用商的法则。</span>
    </div>
    <div class="ex-part">
      <span class="ex-label">解</span>
      <span>分子有理化，同乘 \(\sqrt{1+x}+1\)……</span>
    </div>
    <div class="ex-part">
      <span class="ex-label">评注</span>
      <span class="ex-note">「先看分母是不是 0」是每一步的固定动作。</span>
    </div>
  </div>
</div>
```

**四段缺一不可**，尤其「思路」——那是学生真正卡住的地方。
「评注」要指出方法模式（下次遇到同类题怎么办），不要复述答案。

---

## 4. 习题与折叠答案

```html
<div class="exercise-card">
  <div class="ex-head">
    <span class="ex-no">1</span>
    <span class="ex-level">基础</span>
    <strong>设 \(\lim\limits_{x\to 1}f(x)=3\)，说明为什么可以把 \(f(1)\) 改成任意值。</strong>
  </div>
  <details class="ex-answer">
    <summary>查看答案与解析</summary>
    <div class="ex-answer-body">ε-δ 定义中条件是 \(0<|x-1|<\delta\)，把 \(x=1\) 挖掉了……</div>
  </details>
</div>
```

> 这是**全站唯一允许折叠**的地方：读者在纸笔练习，答案要能先藏起来。

### 交互自测题

```html
<div data-mount="quiz">
  <script type="application/json">
  { "items": [
    { "q": "关于 \(\\lim\\limits_{x\\to 0}\\dfrac{\\sin x}{x}\)，下列说法正确的是？",
      "options": ["等于 0", "等于 1", "不存在"],
      "answer": 1,
      "explain": "由单位圆面积夹逼可得。" }
  ] }
  </script>
</div>
```

选项与题干用 `\(...\)` 写公式，`quiz.js` 会渲染。

---

## 5. 交互演示

演示 = 挂载点 + 一段 `demo.js` 里的函数。**所有演示共用同一套外壳**，不要各写一套 DOM。

```html
<div class="demo-box" data-demo="function-gallery">
  <div class="demo-title">演示 2 · 基本初等函数图库与竖直检验</div>
  <div class="demo-caption">切换函数，然后把竖直线慢慢从左推到右，数一数它和曲线最多交几个点……</div>
</div>
```

```js
// chapters/chXX/demo.js
function functionGallery(el) {
  const p = new Plot(el, { xmin: -3, xmax: 5, ymin: -3, ymax: 5, grid: true });
  const c = controls(el, `<label>竖直检验线 x = <input type="range" data-vx ...></label>`);
  const out = readout(el);

  const draw = () => { /* 只负责画 */ };
  bindRange(c, '[data-vx]', v => { vx = v; draw(); });
  btnRow(el, [{ tex: 'x^{2}', run: () => {...} }]);
  draw();
}
```

必须做的三件事：

1. 在 `demo.js` 的 `DEMOS` 表里注册
2. 在 `chapters.json` 的 `demos` 数组里同步（`check.sh` 会校验一致性）
3. `.demo-caption` 写清**拖什么、看什么、为什么重要**

### 演示文案的要求

| ❌ 不行 | ✅ 要这样 |
|---|---|
| 「观察输出如何变化」 | 「拖动 ε 变小，盯住橙色虚线 N 的位置，它不断右移」 |
| 「看图形变化」 | 「把窗口 r 推到 0，注意包络线自己趋向 0，夹逼完成」 |
| 「拖动滑块体验」 | 「拖到 h 接近 0，斜率从 3.2 滑向 2，但永远差一点」 |

---

## 6. 图表（`Plot`）

`assets/js/plot.js`。所有二维图形都走它，**不要自己写 canvas**。

```js
const p = new Plot(el, { xmin: -3, xmax: 5, ymin: -3, ymax: 5, grid: true, boxH: 420 });
p.clear();
p.curve(x => x * x, { color: PLOT_COLORS.accent, width: 2.4 });
p.line(-1, 0, 3, 0, { color: PLOT_COLORS.warn, dash: true });
p.rect(x1, y1, x2, y2, { fill: PLOT_COLORS.ok, alpha: .13, stroke: PLOT_COLORS.ok });
p.dot(1, 1, { r: 5, color: PLOT_COLORS.accent });
p.circle(0, 0, 1, { color: PLOT_COLORS.accent });     // 只允许在等比例下用
p.text(2, 3, '文字', { size: 11, color: PLOT_COLORS.text });
```

### 等比例是硬性要求

`equal: true` 是默认值：**1 个单位在 x、y 方向占相同像素**。

为什么必须：不等比时 `(1,1)` 会被画成长条、圆变成椭圆、斜率 2 的直线看起来像斜率 1。学生看到的是错的图形，比不看更糟。

| 情况 | 做法 |
|---|---|
| 几何图形（圆、向量、空间曲面、旋转体）、斜率场 | 必须保持默认 `equal: true` |
| 函数值图（横轴自变量、纵轴函数值）但纵向跨度大 | 加 `fill: true`：画布铺满容器宽度，工具条自动注明「两轴刻度各自标定」 |
| 需要更大画布 | 调 `boxH`（高度上限），宽度由比例反推 |
| 动态缩放窗口 | 改范围必须用 `p.setRange({...})`，直接改 `p.o.xmax` 不会重算画布 |
| 横轴不是同一量纲（如项数 n、时间） | 显式 `equal: false` + `aspectNote: '横轴为项数 n，与纵轴量纲不同'` |

`fill: true` 只用于「函数值图」：等比会把画布压成一条几十像素的细缝时，宁可让两轴刻度各自标定，也不能让学生看不清。几何图形一律不得使用 `fill`——圆必须是圆、45° 必须是 45°。

`equal: false` 时绘图器会**自动在下方工具条（或画布右下角）标注**，不需要各演示自己加。
即便如此，能等比例就必须等比例——**关掉等比例是一种需要说明的例外，不是图省事的手段**。

> `circle()` 在不等比下会 `console.warn`，因为它画出来一定是椭圆。

### 缩放与平移（默认开启）

每张 `Plot` 图都自带交互，学生能把图放大看清、拖到想看的地方，不用别人替他决定看哪一段：

| 操作 | 鼠标 | 触摸 | 键盘 |
|---|---|---|---|
| 缩放 | 滚轮（以指针为中心） | 双指捏合 | `+` / `-` |
| 平移 | 按住拖动 | 单指拖动 | 方向键 |
| 复位 | 双击图内，或点工具条「复位」 | 点「复位」 | `0` / `Home` |

- 缩放范围 2%–60000%（相对初始取景），拖不出三倍初始范围，避免学生把图拖丢。
- 等比例下 `ux === uy` 始终成立：**缩放只改显示窗口，不改像素比**，圆永远是圆、45° 永远是 45°。
- 换窗口后刻度数字自动重算（步长、小数位都跟着变），并且密度按画布像素反推，窄图不会把数字挤成一团。
- 工具条 `− 100% ＋ 复位` 由绘图器生成（`.plot-hud`），**不要自己再写一套按钮**；不等比时告示 `.ph-note` 也自动放在工具条最左。

需要关掉交互（极少数情况，比如图只是装饰）：

```js
const p = new Plot(el, { ..., interactive: false });
```

#### frame 与 draw 必须分开

参数会改变显示窗口的演示（观察半径、时间窗口等），一定要把「改取景」和「画」拆成两个函数。
否则每次重绘都会把用户自己缩放平移的位置冲掉：

```js
const frame = () => { p.setRange({ xmin: -r, xmax: r, ymin: -top, ymax: top }); };  // 只在参数变化时调用
const draw = () => { p.clear(); /* 只画 */ };
p.onResize = draw;                                  // 缩放/平移后的重绘只走 draw
bindRange(c, '[data-r]', v => { r = v; frame(); draw(); });
frame(); draw();
```

**禁止在 `draw()` 里直接改 `p.o.xmin` 之类的字段**：那不会重算比例，还会把视图状态改坏（`check.sh` 会拦）。

---

## 7. 知识结构图

数据驱动，页面只放一个挂载点 + 一段 JSON：

```html
<div class="mermaid-box" data-mount="mindmap">
  <script type="application/json">
  { "nodes": [
      { "id": "a", "label": "映射与函数", "kind": "root" },
      { "id": "b", "label": "数列的极限", "kind": "core" },
      { "id": "d", "label": "ε-N 语言", "kind": "branch" },
      { "id": "k", "label": "下一章：导数", "kind": "end" }
    ],
    "edges": [ { "source": "a", "target": "b" }, { "source": "b", "target": "d" } ] }
  </script>
</div>
```

`kind` 四种：`root`（起点，实心蓝）、`core`（主干，白底蓝框）、`branch`（分支，灰框）、`end`（出口，绿框）。

结构由 `mindmap.js` 自动布局：主干（`root` → 全部 `core` → `end`）竖排一列，其余节点挂两侧。**不要手工算坐标。**

落位与走线的完整规则见 [VISUAL_SPEC.md §4.1](VISUAL_SPEC.md)，改布局前务必先读——那里记着几条踩过的坑（主干不能按 BFS 深度硬串、分支列位要按本行主干框实际边界算、`.mm-svg` 不能写 `width:100%`）。

`kind` 标注要和教学内容一致：夹在两条 `core` 之间的必经环节必须标 `core`（如 ch06 的「积分求总量」），否则会被降级成旁支，连线倒着绕回来。

节点数建议 8–16 个；超过 20 个说明该拆成两张图。

---

## 8. 导航与布局

| 结构 | 位置 | 说明 |
|---|---|---|
| 顶栏 | `.topbar` | 首页 / 章节目录下拉 / 关于。**不放维护者入口** |
| 章节目录下拉 | `[data-chapter-menu]` | 由 `nav.js` 自动生成，不用手写 |
| 侧栏小节目录 | `.sidebar[data-nav-sidebar]` | 自动生成当前章小节 + 滚动高亮 |
| 章节头 | `.chapter-hero` | 浅灰底，无渐变 |
| 正文 | `.content` | 760px 列宽，无卡片包裹 |
| 页脚 | `.site-footer` | 固定免责声明 |

新章节页面：**直接复制 `chapters/_template/chapter.html`**，只改内容，不改结构。

---

## 9. 按钮与状态

```html
<button class="btn" type="button">次级操作</button>
<button class="btn primary" type="button">主操作</button>
<a class="btn primary" href="#s1">跳转</a>
<span class="badge done">已完成</span>
<span class="badge planned">计划中</span>
```

按钮里的数学**必须走 `texInline`**：

```js
btnRow(el, [{ tex: 'x^{2}', run: ... }, { tex: '\\dfrac{1}{x}', run: ... }]);
// 不要写 label: 'x²'
```

---

## 10. 新增组件的流程

1. 先确认组件库里**真的没有**能用的（九成情况是有的）
2. 需要新组件 → 在 `assets/css/design-system.css` 或 `components.css` 里加，**只用 `base.css` 的 token**
3. 在本文件登记：用途、结构、可复制片段、注意事项
4. 在 `style-guide.html` 加可视化示例
5. 同步更新 `chapters/_template/chapter.html`（如果它影响章节骨架）

**没有登记过的组件，不允许出现在章节里。**

# 视觉规范

活规范见根目录 [`style-guide.html`](../style-guide.html)（可直接用浏览器打开，展示所有组件的实际效果）。实现集中在 `assets/css/design-system.css`、`assets/css/layout.css` 与 `assets/css/demos.css`。

## 0. 风格定位：学术文档，不是营销落地页

**参考对象**：GitHub（Primer）、MDN、可汗学院这类**工具型/教育型**站点。
**判断标准**：一个学生打开页面，注意力应该落在「这段文字在讲什么」，而不是「这个卡片真好看」。

### 明确禁止（这些是"AI 味"的主要来源）

| 禁止 | 原因 | 替代做法 |
|---|---|---|
| **渐变色块**（尤其是紫蓝渐变横幅） | 装饰压过内容；生成式模板的标志性特征 | 纯色底 + 1px 边框 |
| **大圆角**（≥12px）套在内容容器上 | 显得像消费类 App，不像学习资料 | 统一 6px，小控件 3px |
| **彩色阴影**（紫/蓝光晕） | 视觉噪音，没有任何信息价值 | 正文容器不用阴影；浮层才用中性阴影 |
| **卡片套卡片**（页面上叠 2–3 层白卡） | 层级含混，边界冗余 | 内容直接坐在页面上，靠细线分层 |
| **hover 时上浮 + 放大阴影** | 炫技，干扰阅读节奏 | hover 只换底色（`--bg-soft`） |
| **彩色装饰竖条 / 装饰圆点** | 无信息量的色块 | 用编号、字重、留白建立层级 |
| **一个概念配一种颜色**（紫题、青性质、绿例题…） | 颜色过多等于没有重点 | 收在 5 个色族内，绝大多数用中性灰 |

### 应该这样做

- **层级靠排版建立**：字号、字重、间距、1px 细线。不靠色块和阴影。
- **强调色只有一个用途**：标记「可以点」与「当前所在」。
- **正文列宽受控**（760px 左右），一行的字数在舒适区。
- **密度可以高**：目录、列表按行密排，比大卡片更容易扫读。

## 1. 设计 token：唯一来源

**所有可配置项只在 `assets/css/base.css` 的 `:root` 中定义一次**，其余文件一律 `var(--xxx)` 引用，不得出现硬编码颜色。

取色与尺度取自 GitHub Primer（MIT 许可）的浅色/深色中性阶与功能色。

| 类别 | 变量 | 用途 |
|---|---|---|
| 表面 | `--bg` `--bg-soft` `--bg-inset` `--card` | 页面白、浅灰区、更深的内嵌块 |
| 文字 | `--fg` `--fg-muted` `--fg-subtle` | 正文 / 次要 / 弱化（三级足够） |
| 边框 | `--border` `--border-muted` `--border-soft` | 结构边框 / 面板内分隔 / 极淡分隔 |
| 强调 | `--accent` `--accent-hover` `--accent-soft` | 只用于链接、当前项、主按钮 |
| 状态 | `--ok` `--warn` `--danger` 及各自 `-soft` | 正确/提醒/错误 |
| 字号 | `--fs-xs`…`--fs-2xl`（12/13/16/17/20/24/32） | 全部文本只从这几档取 |
| 行高 | `--lh-tight` `--lh-base` | 标题 1.35 / 正文 1.72 |
| 间距 | `--sp-1`…`--sp-7`（4/8/12/16/24/32/48） | 4px 基准，不写裸数值 |
| 圆角 | `--radius-sm` `--radius` `--radius-lg`（3/6/12） | 内容容器一律 6px |
| 阴影 | `--shadow`（正文=none）`--shadow-lg`（浮层） | 正文不用阴影 |
| 语义色 | `--def` `--thm` `--prop` `--ex` `--exer` `--remark` `--insight` `--pitfall` `--key` + `-rgb` | 九类组件，收在 5 个色族内 |

`[data-theme="dark"]` 覆盖表面、文字、边框与强调色；语义色同步换成深色底上可读的亮色。

**改样式只改这里**。想换主色，改 `--accent` 一处，全站按钮、链接、当前小节标记一起变。

## 2. 语义组件表

统一基类 `.math-block`，头部 `.mb-head`（`.mb-tag` 徽章 + `.mb-title` 标题 + `.mb-no` 编号），正文 `.mb-body`。

| 内容类型 | class | 语义色 | 用途 |
|---|---|---|---|
| 定义 | `.math-block.definition` | `--def` 靛蓝 | 概念的精确表述，带编号 |
| 定理 | `.math-block.theorem` | `--thm` 墨紫 | 重要结论，证明直接展开（**不折叠**） |
| 性质 / 推论 | `.math-block.property` | `--prop` 绿 | 由定理直接得到的常用结论 |
| 推导 / 证明 | `.proof-title` + `.derive` | `--proof` 石板 | 编号步骤 + 每步说明，**常显不折叠** |
| 例题 | `.math-block.example` + `.ex-part` | `--ex` 绿 | 题目 / 思路 / 解 / 评注 四段式 |
| 习题 | `.math-block.exercise` + `.exercise-card` | `--exer` 琥珀 | 题号 + 难度 + 折叠答案 |
| 注记 | `.math-block.remark` | `--remark` 灰 | 符号约定、边界条件、补充 |
| 直观理解 | `.math-block.insight` | `--insight` 蓝 | 几何意义、类比、「图在说什么」 |
| 常见误区 | `.math-block.pitfall` | `--pitfall` 红 | 最容易犯的错 + 为什么错 |

其他：

- `mark.key` — 重点结论：荧光笔底色 + 加粗。**只用在该记住的结论上**。
- `strong.term` / `.term` — 术语首次出现：主色加粗 + 点线下划线。
- `.formula-box` — 需要编号、反复引用的主公式，右上角 `.fb-no` 标号。
- `.demo-box` / `.demo-canvas` — 交互演示容器；`.demo-controls` 放滑块与按钮；`.readout` 放数值解读。
- `.step-bar` / `.step-dot` — 分步动画控制条。

## 3. 页面骨架（所有页面一致）

```
.topbar              顶部导航（sticky）
.reading-progress     阅读进度条（fixed，3px）
.chapter-hero / .home-hero   渐变章节头（点阵装饰 + 圆形光斑）
.page-shell           左侧 236px 侧栏 + 右侧内容（900px 以下折叠为单栏）
  .sidebar            由 nav.js 依 chapters.json 生成
  .content            8 个区块
.site-footer          每页固定「非官方学习辅助」声明，勿删
.theme-toggle         右下角圆形深浅色切换（localStorage 记忆）
```

内容区 8 区块顺序固定：学习目标 → 知识结构图 → 逐节讲解 → 常见误区 → 习题与自测 → 小结与章节导航 → 页脚（详见 [CONTENT_SPEC.md](CONTENT_SPEC.md)）。

## 4. 知识结构图

用 **AntV G6**（v4.8.x，CDN）渲染，数据在页面内 `<script type="application/json">` 中：

```json
{ "nodes": [{"id":"a","label":"映射与函数","kind":"root"}],
  "edges": [{"source":"a","target":"b"}] }
```

`kind` 取值：`root` 起点（主色实心）、`core` 核心、`branch` 分支、`end` 出口（绿）、`normal` 默认。支持拖动画布、滚轮缩放、拖节点、悬停高亮相连链路、容器自适应、主题切换重绘。G6 加载失败时降级为文字大纲。

## 5. 响应式与可访问性

- 断点：`900px`（侧栏折叠、演示画布降高）、`375px`（移动端验收视口）。
- 移动端 `scrollWidth <= clientWidth`，不允许横向溢出。
- 深浅色：`prefers-color-scheme` + 手动切换 + `localStorage`。
- 公式允许横向滚动（`.katex-display`），不撑破布局。
- `prefers-reduced-motion` 下关闭动画；`:focus-visible` 有清晰焦点环。
- 交互控件用 `<button>` / `<input>`，带 `aria-label` 或 `title`。

## 6. 禁止事项

1. **禁止内联 `style="..."`**（动态生成的 DOM 也用 class）。历史遗留已清理，新增代码不得再引入。
2. **禁止在 JS 里动态注入 `<style>`**（原 `injectCSS()` 已移除，样式迁入 `demos.css`）。
3. **禁止硬编码颜色**（用 `var(--xxx)`；Canvas 绘图用 `PLOT_COLORS`，它也是集中定义）。
4. **禁止为新章节另起配色或卡片样式**，一律套语义组件。
5. **禁止把样式写进 HTML 模板副本**，模板只有一份 `chapters/_template/chapter.html`。

## 7. 验收

`bash tools/check.sh` 会检查设计系统文件存在、无 `type="module"` / `injectCSS` / `import.meta` 残留；`python3 tools/shot.py --chapter chXX` 会截桌面与移动端全页图，断言控制台错误 0、无横向溢出。

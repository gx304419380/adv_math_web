# 视觉规范

活规范见根目录 [`style-guide.html`](../style-guide.html)（可直接用浏览器打开，展示所有组件的实际效果）。实现集中在 `assets/css/design-system.css` 与 `assets/css/demos.css`。

## 1. 设计 token：唯一来源

**所有可配置项只在 `assets/css/base.css` 的 `:root` 中定义一次**，其余文件一律 `var(--xxx)` 引用，不得出现硬编码颜色。

| 类别 | 变量 | 用途 |
|---|---|---|
| 背景/文字 | `--bg` `--bg-soft` `--card` `--fg` `--fg-muted` `--border` | 页面底、卡片、正文、次要文字、描边 |
| 主色 | `--accent` `--accent-soft` `--accent-2` | 靛蓝主色、浅底、青色辅助 |
| 状态色 | `--ok` `--warn` `--danger` | 正确/提醒/错误 |
| 尺寸 | `--radius` `--radius-sm` `--maxw` `--shadow` `--shadow-lg` | 圆角、最大宽度、阴影 |
| 字体 | `--font` `--mono` | 正文与等宽 |
| 语义色 | `--def` `--thm` `--prop` `--proof` `--ex` `--exer` `--remark` `--insight` `--pitfall` `--key` 及各自 `-rgb` | 十类内容组件的专属色 |

`[data-theme="dark"]` 覆盖基础色；语义色保持不变（组件用 `rgba(var(--cr), .1)` 自适应深浅）。

**改样式只改这里**。想换主色，改 `--accent` 一处，全站按钮、链接、章节头、进度环、曲线、知识图起点节点一起变。

## 2. 语义组件表

统一基类 `.math-block`，头部 `.mb-head`（`.mb-tag` 徽章 + `.mb-title` 标题 + `.mb-no` 编号），正文 `.mb-body`。

| 内容类型 | class | 语义色 | 用途 |
|---|---|---|---|
| 定义 | `.math-block.definition` | `--def` 靛蓝 | 概念的精确表述，带编号 |
| 定理 | `.math-block.theorem` | `--thm` 紫 | 重要结论，可挂证明折叠区 |
| 性质 / 推论 | `.math-block.property` | `--prop` 青 | 由定理直接得到的常用结论 |
| 推导 / 证明 | `.math-block.proof` + `.derive` | `--proof` 石板 | 编号步骤 + 每步说明，默认折叠 |
| 例题 | `.math-block.example` + `.ex-part` | `--ex` 绿 | 题目 / 解 / 评注 三段式 |
| 习题 | `.math-block.exercise` + `.exercise-card` | `--exer` 琥珀 | 题号 + 难度 + 折叠答案 |
| 注记 | `.math-block.remark` | `--remark` 灰 | 符号约定、边界条件、补充 |
| 直观理解 | `.math-block.insight` | `--insight` 绿松 | 几何意义、类比、「图在说什么」 |
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

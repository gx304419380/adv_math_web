# 维护者指南

> 本文件是**给维护者/部署者**看的。普通学习者不需要读，也不应该被要求执行这里的任何命令——他们双击 `index.html` 就能学。

## 1. 技术架构（为什么是这样）

| 约束 | 做法 |
|---|---|
| 用户零门槛 | 纯静态 HTML/CSS/JS，**无构建、无依赖安装** |
| `file://` 直接打开 | **全部用经典 `<script defer>`**，禁止 ES module；章节数据内嵌在 `chapters.js`，禁止 `fetch()` 本地文件 |
| 公式与图形 | 公共 CDN：KaTeX、JSXGraph、AntV G6、GSAP；第 8–11 章按需加 three.js |
| 绘图 | `assets/js/plot.js`（自研 Canvas 2D 绘图器）+ 原生 SVG；`assets/js/graph.js` 封装 JSXGraph |
| 全局样式 | token 只在 `assets/css/base.css :root`；组件在 `design-system.css`；演示与工具类在 `demos.css` |
| 数据 | `chapters.json` 是唯一数据源，`chapters.js` 由它生成 |
| 主题 | `theme.js`，跟随系统 + localStorage 记忆 |

### 为什么不能用 ES module / fetch

浏览器在 `file://` 协议下会以 CORS 策略阻止模块脚本和本地 `fetch`。一旦用了它们，用户双击 `index.html` 就会看到空白或功能缺失——这违反 [PRINCIPLES.md](PRINCIPLES.md) 第 5 条。所以：

- 所有 `assets/js/*.js` 都是**经典脚本**，顶层 `function` / `class` / `const` 在同一全局环境共享，靠**加载顺序**表达依赖。
- 不使用 `import` / `export` / `import.meta`。
- 章节数据由 `chapters.js` 定义为 `window.AM_CHAPTERS`；`nav.js` 优先读它，仅在 HTTP 环境下才回退到 `fetch('chapters.json')`。
- CDN 脚本是绝对 `https://` URL，在 `file://` 下可以正常加载。

### 脚本加载顺序（不要打乱）

所有页面在 `</head>` 前按此顺序引入（`index.html` / `style-guide.html` 用 `assets/js/`，章节页用 `../../assets/js/`）：

```
chapters.js → cdn.js → math.js → graph.js → plot.js → steps.js
→ mindmap.js → quiz.js → theme.js → nav.js → polish.js → boot.js
→ (章节页专属) demo.js
```

`defer` 保证按文档顺序执行、且 DOM 已解析完。`boot.js` 负责统一装配（主题、公式渲染、导航、`[data-mount]` 挂载），各章 `demo.js` 扫描 `[data-demo]` 挂载专属演示。

### 加载失败降级

`cdn.js` 的 `hasLib()` / `libError()` 统一检查依赖；G6 未加载时知识图降级为文字大纲，KaTeX 未加载时显示原始 LaTeX，绝不白屏。

## 2. 新增一章（照做即可）

章节正文走**数据驱动生产线**：撰写者只写 `tools/content/chNN.txt`，不要手改 `chapters/chNN/chNN.html`——它是生成物，会被覆盖。

1. 在 `chapters.json` 登记本章：`id / index / volume / title / subtitle / sections / prev / next / estMinutes / status / demos / tags / mtime`。`prev`/`next` 必须闭合；`demos` 的顺序对应各节 `data-demo` 的 key。
2. 运行 `python3 tools/sync-chapters.py` 重新生成 `assets/js/chapters.js`（**改了 chapters.json 就必须跑**）。
3. 写 `tools/content/chNN.txt`：用 `=== KEY ===` 分段，必须包含 `GOALS`、`MAP`、`SECTION:s1`…、`PITFALLS`、`EXERCISES`、`QUIZ`、`SUMMARY`、`DEMOJS`。每节必备四段式例题、`data-demo` 演示盒与直观理解；格式照抄 `tools/content/ch02.txt`。
4. 演示只写薄配置，复用 `assets/js/demo-presets.js` 的 `sliderCurve / twoSliders / riemann / polyApprox / partialSum / custom`，不要复制绘图样板。等比例是默认值；只有两轴量纲不同才允许 `equal:false`，且必须带 `aspectNote` 告示。
5. 生成与自检：
   ```bash
   python3 tools/fill-chapter.py chNN
   python3 tools/check-demos.py --chapter chNN
   python3 tools/audit-math.py && node --check chapters/chNN/demo.js
   ```
6. 知识图是 `MAP` 段里的合法 JSON（`nodes` + `edges` + `kind`），由 `assets/js/mindmap.js` 用原生 SVG 手算坐标绘制，**不依赖 G6**。
7. **所有例题、习题、自测题与演示例子必须由另一个独立智能体复核**（数学正确性、解析自洽、零基础、原创性、演示取值），按复核报告改完再进入下一步。
8. 全站验收 `bash tools/check.sh` 与 `python3 tools/verify-pages.py --mobile`；最后把 `chapters.json` 里该章 `status` 改为 `done`，再跑一次 `sync-chapters.py`（首页会把 `planned` 章节渲染成不可点击）。

## 3. 改样式

**只改 `assets/css/base.css` 的 `:root`**。想换主色就改 `--accent`；想调语义卡片颜色改 `--def` / `--thm` 等（记得同步 `-rgb` 形式）。组件结构改 `design-system.css`，演示与工具类改 `demos.css`。

不要：写内联 `style`、在 JS 里注入 `<style>`、硬编码颜色、为新章复制一份样式。`check.sh` 会检查 `type="module"` / `injectCSS` / `import.meta` 残留。

改完打开 `style-guide.html` 目视确认所有组件。

## 4. 工具脚本（维护者用）

| 命令 | 用途 | 普通用户需要吗 |
|---|---|---|
| `python3 tools/sync-chapters.py` | 从 `chapters.json` 生成 `chapters.js` | ❌ |
| `python3 tools/sync-chapters.py --check` | 只校验两者是否一致 | ❌ |
| `bash tools/check.sh` | 元数据、模板、版权关键词、章节装配、sympy 公式复核、CDN、数学排版、图像交互 | ❌ |
| `python3 tools/fill-chapter.py chNN` | 把 `tools/content/chNN.txt` 注入骨架，生成章节 HTML 与 demo.js | ❌ |
| `python3 tools/check-demos.py` | 检查占位符、标记区、MAP/QUIZ JSON、每节组件、`data-demo` 与 `DEMOS` 一一对应、JS 语法 | ❌ |
| `python3 tools/verify-pages.py --mobile` | **不起服务**，直接以 `file://` 打开全部页面，采集渲染与控制台指标 | ❌ |
| `python3 tools/shot.py --chapter ch01` | 自动起本地服务，playwright 逐章截图验收 | ❌ |
| `bash tools/serve.sh` | 本地预览服务 `http://localhost:8000` | ❌ 仅维护者调试 |
| `python3 tools/symcheck.py` | sympy 复核关键公式 | ❌ |
| `python3 tools/audit-math.py` | KaTeX 定界符、HTML 实体、正体函数名、中文裸进公式 | ❌ |

`tools/serve.sh` 与 `shot.py` 里启动的服务**只给维护者**用。面向用户的说明里只写「双击 `index.html`」。

`check-demos.py` 会自动识别 ch01 这类**手工样板章**（没有生产线标记区）并跳过装配检查，但占位符检查对它同样生效。正文源片段 `tools/content/chNN.txt` 是唯一需要手写的文件；`chapters/chNN/*` 全部由生成器产出。

## 5. 面向用户的文案规则

- 首页、README 开头明确写：**直接用浏览器打开 `index.html` 即可**，需要联网加载公式与图形库。
- 不出现 `npm install`、构建、命令行、启动服务器等字眼（维护者章节除外，且要标注「普通用户请跳过」）。
- 不要求用户理解什么是仓库、静态站点、CDN。

## 6. 部署

本站发布到 **WorkBuddy 云服务器**，由平台自动分配域名；**不使用 GitHub Pages**（项目约定）。

```bash
node /root/.codebuddy/skills/sites/scripts/publish.js --dir /workspace/adv_math_web
```

命令输出形如 `https://…app.workbuddy.host/?sharecode=…` 的地址，直接发给学生即可。站点是纯静态、全部相对路径、无 module、无 `fetch`，放在任何子目录下都能跑；本地双击 `index.html` 也照样能学。

- **凭据安全**：任何 token / 密钥只经环境变量单次传入，禁止写入仓库文件、`.git/config`、remote URL、提交历史或文档。`.gitignore` 已排除 `.env*`、`*.token`、`*.key`。
- 发布前必须 `bash tools/check.sh` 与 `python3 tools/verify-pages.py` 全绿。

## 7. 内容准确性

- 公式与数值由 `tools/symcheck.py`（sympy）复核；新增章节的关键公式请加进该脚本的 `CHECKS`。
- 图形必须与公式一致。曲线、极限值、交点数值都要和 readout 对得上。
- 数学定义与定理要准确且完整，但文字必须原创，见 [CONTENT_SPEC.md](CONTENT_SPEC.md)。

---

## 附录 B：怎么把站点放到公网上（给维护者，不给学生）

**给学生的说法永远是「双击 `index.html`」**。以下都是维护者自己要看/要发链接时才做的事。

### B.1 三个概念别混

| 地址 | 谁能访问 | 用途 |
|---|---|---|
| `file:///…/index.html` | 只有本机 | **学生默认用法**，双击即可 |
| `http://localhost:8000` | **只有运行服务的这台机器** | 维护者本机调试。在云服务器上跑，你在家用浏览器是**打不开**的 |
| `https://…app.workbuddy.host/?sharecode=…` | 所有人 | 真正能发给别人的地址，由 WorkBuddy 发布命令生成 |

> `localhost` 永远指“你正在用的这台电脑”。服务器上的 `localhost:8000` 只属于服务器，不是公网地址。这是最常见的误会。

### B.2 WorkBuddy 云服务器发布（本站采用）

```bash
node /root/.codebuddy/skills/sites/scripts/publish.js --dir /workspace/adv_math_web
```

平台托管整个目录并生成可分享的域名。重新发布会更新同一站点内容；发布前先跑完 B.4 的验收。

### B.3 其他方式（不推荐，仅备用）

在有公网 IP 且安全组放行的机器上可用 `python3 -m http.server 8000 --directory . --bind 0.0.0.0`，NAT 后面可用 `cloudflared tunnel --url http://localhost:8000` 做临时演示。这些地址要么只在服务器本机有效、要么重启即失效，不适合发给学生。

### B.4 部署前必跑

```bash
bash tools/check.sh
python3 tools/verify-pages.py --mobile
python3 tools/shot.py --chapter ch01 --viewports desktop,mobile
```

三项都通过、控制台 0 错误、无横向溢出，才能给别人地址。

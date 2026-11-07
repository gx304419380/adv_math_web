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

1. 复制 `chapters/_template/chapter.html` → `chapters/chNN/chNN.html`；复制 `chapter.meta.json` 作参考。
2. 在 `chapters.json` 登记本章：`id / index / volume / title / subtitle / sections / prev / next / estMinutes / status / demos / tags / mtime`。`prev`/`next` 必须闭合。
3. 运行 `python3 tools/sync-chapters.py` 重新生成 `assets/js/chapters.js`（**改了 chapters.json 就必须跑**）。
4. 按 [CONTENT_SPEC.md](CONTENT_SPEC.md) 的 8 区块写内容；用 `design-system.css` 的语义组件，不写内联样式。
5. 新建 `chapters/chNN/demo.js`，复用 `AM.Plot` / `AM.StepController` / `PLOT_COLORS`，注册进 `DEMOS` 表；页面用 `data-demo` 挂载。
6. 知识图用 G6 的 JSON 数据（`nodes` + `edges` + `kind`）。
7. 验收：
   ```bash
   bash tools/check.sh
   python3 tools/shot.py --chapter chNN --viewports desktop,mobile
   ```
   并**额外用 `file://` 直接打开**确认无控制台错误。
8. 提交 `feat(chNN): …`，把 `chapters.json` 的 `status` 改为 `done` 后再跑一次 `sync-chapters.py`。

## 3. 改样式

**只改 `assets/css/base.css` 的 `:root`**。想换主色就改 `--accent`；想调语义卡片颜色改 `--def` / `--thm` 等（记得同步 `-rgb` 形式）。组件结构改 `design-system.css`，演示与工具类改 `demos.css`。

不要：写内联 `style`、在 JS 里注入 `<style>`、硬编码颜色、为新章复制一份样式。`check.sh` 会检查 `type="module"` / `injectCSS` / `import.meta` 残留。

改完打开 `style-guide.html` 目视确认所有组件。

## 4. 工具脚本（维护者用）

| 命令 | 用途 | 普通用户需要吗 |
|---|---|---|
| `python3 tools/sync-chapters.py` | 从 `chapters.json` 生成 `chapters.js` | ❌ |
| `python3 tools/sync-chapters.py --check` | 只校验两者是否一致 | ❌ |
| `bash tools/check.sh` | 元数据、模板、版权关键词、sympy 公式复核、CDN 可用性 | ❌ |
| `python3 tools/shot.py --chapter ch01` | 自动起本地服务，playwright 逐章截图验收 | ❌ |
| `bash tools/serve.sh` | 本地预览服务 `http://localhost:8000` | ❌ 仅维护者调试/部署 |
| `python3 tools/symcheck.py` | sympy 复核关键公式 | ❌ |

`tools/serve.sh` 与 `shot.py` 里启动的服务**只给维护者**用。面向用户的说明里只写「双击 `index.html`」。

## 5. 面向用户的文案规则

- 首页、README 开头明确写：**直接用浏览器打开 `index.html` 即可**，需要联网加载公式与图形库。
- 不出现 `npm install`、构建、命令行、启动服务器等字眼（维护者章节除外，且要标注「普通用户请跳过」）。
- 不要求用户理解什么是仓库、静态站点、CDN。

## 6. 部署

- GitHub Pages：Settings → Pages → Deploy from a branch → `main` / `/(root)`。仓库内已有 `.nojekyll`，保证静态文件原样发布。地址 `https://gx304419380.github.io/adv_math_web/`。
- 也可以把整个目录直接放到任意静态托管或本地磁盘，双击即可。
- **凭据安全**：任何 token / 密钥只经环境变量单次传入，禁止写入仓库文件、`.git/config`、remote URL、提交历史或文档。`.gitignore` 已排除 `.env*`、`*.token`、`*.key`。推送用完的 PAT 应及时撤销。

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
| `https://<用户名>.github.io/<仓库名>/` | 所有人 | 真正能发给别人的地址（需要一个静态托管） |

> `localhost` 永远指“你正在用的这台电脑”。服务器上的 `localhost:8000` 只属于服务器，不是公网地址。这是最常见的误会。

### B.2 GitHub Pages（推荐，免费且永久）

仓库推上去之后，只差一步开关：**Settings → Pages → Source 选 `Deploy from a branch` → 分支 `main`、目录 `/ (root)` → Save**。

用 API 开启需要 PAT 具备 **Pages: Read and Write** 权限（只有 `Contents` 是不够的，会返回 `403 Resource not accessible by personal access token`）。开好后访问：

```
https://gx304419380.github.io/adv_math_web/
```

**本站已为 Pages 子路径做好适配**：全部用相对路径，无 module、无 `fetch`，放在 `/adv_math_web/` 这种子目录下同样能跑。

### B.3 临时公网预览（没有 Pages 时）

在**有公网 IP 的机器**上：

```bash
python3 -m http.server 8000 --directory . --bind 0.0.0.0
# 然后浏览器访问 http://<这台机器的公网IP>:8000
```

前提：云厂商安全组放行 8000 端口。若机器没有公网 IP（NAT 后面），此法不可用，只能走 B.2 或 B.4。

### B.4 内网穿透（有 NAT 时）

```bash
cloudflared tunnel --url http://localhost:8000
```

会给出一个 `https://xxx.trycloudflare.com` 临时地址，重启即失效，仅适合临时演示。

### B.5 部署前必跑

```bash
bash tools/check.sh          # 元数据、版权、公式复核、CDN、数学排版
python3 tools/shot.py --chapter ch01 --viewports desktop,mobile
```

两项都通过、控制台 0 错误，才能给别人地址。

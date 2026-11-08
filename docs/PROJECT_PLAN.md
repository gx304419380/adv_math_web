# 章节计划与进度

## 教材骨架

以同济大学《高等数学》**第七版**（高等教育出版社，上下册共 **12 章**）为准。第八版章名与节序基本一致，可无缝沿用。章节元数据单一数据源：[`../chapters.json`](../chapters.json)。

| 批次 | 章 | 标题 | 节数 | 演示数 | 新增可视化能力 | 状态 |
|---|---|---|---|---|---|---|
| 0 | — | 骨架、共享组件、首页、模板、工具链、规范文档 | — | — | 设计系统、原生 SVG 知识图 | ✅ 完成 |
| 1 | ch01 | 函数与极限 | 10 | 14 | Canvas 绘图器、分步动画、函数图库、ε-δ/ε-N、单位圆 | ✅ 完成（手工样板章） |
| 1 | ch02 | 导数与微分 | 5 | 6 | 割线逼近切线、线性近似、相关变化率 | ✅ 完成 |
| 1 | ch03 | 微分中值定理与导数的应用 | 8 | 8 | 中值定理平行切线、泰勒逼近、凹凸与曲率、牛顿法 | ✅ 完成 |
| 2 | ch04 | 不定积分 | 5 | 5 | 原函数族、换元流程、分部积分 | ✅ 完成 |
| 2 | ch05 | 定积分 | 5 | 5 | 小矩形面积之和、变上限积分、反常积分尾部 | ✅ 完成 |
| 2 | ch06 | 定积分的应用 | 3 | 4 | 元素法切片、旋转体、变力做功 | ✅ 完成 |
| 3 | ch07 | 微分方程 | 10 | 10 | 斜率场、解族、特征根与特解 | ✅ 完成 |
| 4 | ch08 | 向量代数与空间解析几何 | 6 | 6 | 二次曲面截线、平面法向、空间直线 | ✅ 完成 |
| 4 | ch09 | 多元函数微分法及其应用 | 10 | 10 | 偏导切片、切平面、梯度场、鞍点 | ✅ 完成 |
| 5 | ch10 | 重积分 | 5 | 5 | 二重积分体积、换序、极坐标雅可比 | ✅ 完成 |
| 5 | ch11 | 曲线积分与曲面积分 | 7 | 7 | 格林/高斯/斯托克斯、向量场 | ✅ 完成 |
| 6 | ch12 | 无穷级数 | 8 | 8 | 部分和动画、审敛法、泰勒级数、方波傅里叶合成 | ✅ 完成 |

全站 **12 章、88 个交互演示**。知识结构图由 `assets/js/mindmap.js` 用原生 SVG 手算坐标绘制（不依赖 G6）；三维对象一律用二维投影并附说明，不引入 three.js。所有图默认**可缩放、可平移**且保持等比例，只有两轴量纲不同才允许非等比并自动显示告示。

## 章节生产线（数据驱动）

ch02–ch12 不手写 HTML，改走三层结构，避免每章复制一套绘图样板：

| 层 | 文件 | 职责 |
|---|---|---|
| 撰写层 | `tools/content/chNN.txt` | `=== KEY ===` 分段保存正文片段与 `DEMOJS`，是唯一需要手写的文件 |
| 组件层 | `assets/js/demo-presets.js` | `sliderCurve / twoSliders / riemann / polyApprox / partialSum / custom`，统一等比例、缩放平移、KaTeX 读数、动画与按钮 |
| 装配层 | `tools/fill-chapter.py` | 注入骨架生成 `chapters/chNN/chNN.html` 与 `demo.js`，校验标记区、MAP/QUIZ JSON、`data-demo` key |
| 校验层 | `tools/check-demos.py` | 拦截占位符、每节缺组件、key 未注册、JS 语法错误、绘图器范围字段被直接改写 |

ch01 是早期手工样板章，没有生产线标记区，`check-demos.py` 会自动识别并跳过装配检查（占位符检查仍生效）；它由全站数学/截图校验覆盖。

## 逐章标准化循环

1. 对照 `chapters.json.sections` 核对知识点名称与顺序（只对齐名称，不抄教材正文）
2. 过一遍 [CONTENT_SPEC.md](CONTENT_SPEC.md) 的原创边界自检清单
3. 写 `tools/content/chNN.txt`：原创讲解、定义/定理体系、自编例题（KaTeX），每节配演示与直观理解
4. **由另一个独立智能体复核**全部例题、习题、自测题与演示例子（数学正确性、解析自洽、零基础、原创性、演示取值），按报告修正
5. 运行 `python3 tools/fill-chapter.py chNN` 生成页面，再跑 `python3 tools/check-demos.py --chapter chNN`
6. `python3 tools/verify-pages.py --chapters chNN` 以 `file://` 直开验证渲染与控制台，必要时 `python3 tools/shot.py --chapter chNN` 截图
7. `bash tools/check.sh` 全站静态校验（元数据、版权、sympy 复核、CDN、装配、排版、图像交互）
8. 把该章 `status` 改为 `done`，运行 `python3 tools/sync-chapters.py` 同步 `chapters.js`，首页进度环与章节卡片自动刷新（`planned` 章节不可点击）
9. 发布：`node /root/.codebuddy/skills/sites/scripts/publish.js --dir /workspace/adv_math_web`

## 验收门槛（每章必须全过）

| 项 | 标准 |
|---|---|
| 静态校验 | `bash tools/check.sh` 全绿；`check-demos.py` 无占位符、每节组件齐全、`data-demo` 与 `DEMOS` 一一对应 |
| 例题复核 | 独立智能体结论为 PASS，或 NEED_FIX 项全部修完并复验 |
| `file://` 直开 | 不启服务直接打开 `index.html` 与本章页，功能完整、控制台错误 0、失败请求 0 |
| 公式 | KaTeX 节点 > 0、无 `KaTeX parse error`、无原始 LaTeX 残留、无 Unicode 假上下标 |
| 演示 | 每个 `data-demo` 有画布与非空读数，图形与数值解读同步更新，标记点不被窗口裁掉 |
| 知识图 | 原生 SVG 节点渲染成功，无重叠、无裁切 |
| 图像交互 | 滚轮/双指缩放、拖拽/方向键平移、双击或「复位」回原图；缩放不改 `ux/uy` 比例 |
| 移动端 | 375×812 下 `scrollWidth <= clientWidth`，侧栏可折叠 |
| 控制台 | error / pageerror / 失败请求均为 0 |
| 内容 | 8 区块齐全、证明常显不折叠、每节有图与解读、页脚免责声明存在 |

## 当前状态

- 12 章正文、例题、习题、自测与演示全部完成；每章例子均经独立智能体复核并按报告修正。
- 视觉与内容规范：[VISUAL_SPEC.md](VISUAL_SPEC.md) / [CONTENT_SPEC.md](CONTENT_SPEC.md)
- 数学排版：[MATH_TYPESET.md](MATH_TYPESET.md)；组件库：[COMPONENTS.md](COMPONENTS.md)
- 最高原则：[PRINCIPLES.md](PRINCIPLES.md)；维护流程：[MAINTAINER_GUIDE.md](MAINTAINER_GUIDE.md)
- 发布：WorkBuddy 云服务器自动分配域名（**不使用 GitHub Pages**），命令见上表第 9 步。

进度以 `chapters.json` 的 `status` 为准，首页进度环会自动读取，**不要手改首页数字**。

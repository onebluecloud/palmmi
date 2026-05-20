# Palmmi Stage 4B UI Implementation Map

## Purpose

This document maps each future Stage 4 page to the existing Stage 2 UI assets that may guide implementation.

Stage 4B does not implement pages. It only freezes page-to-asset mapping, reusable visual elements, required modules, mobile priority, desktop adaptation, known gaps, and forbidden deviations.

## Global Mapping Rules

- User-facing product name must be `Palmmi`, even when Stage 2 source files say `PalmTag`.
- Stage 4 pages consume Stage 3 `RecognitionResult`; they must not recalculate mother type, persona, Top3, adjacent persona, or cross-mother correction.
- `palmtag-visual-direction.html` is a visual reference, not production code.
- `assets/palmtag-topology.svg` may guide palm-line texture usage, but should be renamed or wrapped later only in an implementation stage if needed.
- Stage 4B does not authorize real VLM, real upload server, real payment, login, backend, or formal poster export.

## 1. Home / Landing Page

页面名称:

首页 / Landing Page

对应 Stage 2 资产路径:

- `docs/stage2/context.md`
- `docs/stage2/ui-guideline.md`
- `docs/stage2/page-flow.md`
- `palmtag-visual-direction.html`
- `assets/palmtag-topology.svg`

可复用的视觉元素:

- 一句话讲清楚产品。
- 主 CTA 指向上传。
- 抽象掌纹拓扑纹理。
- 示例结果卡片作为信任和兴趣入口。
- 轻量隐私提示条。

需要实现的核心模块:

- Palmmi 品牌露出。
- 产品一句话说明。
- 主按钮：进入上传页。
- 示例结果/人格卡片预览。
- 隐私轻提示：娱乐用途、不用于身份识别、可重新上传。

移动端首屏优先级:

1. 产品名和一句话说明。
2. 主 CTA。
3. 轻量掌纹线条视觉或示例结果卡片。
4. 隐私提示。

桌面端适配原则:

- 可使用两列布局：文案/CTA + 结果卡预览。
- 桌面只做补充展示，不改变移动端信息顺序。
- 内容宽度参考 Stage 2 HTML 的 `--max: 1160px`。

资料缺口:

- 无独立首页设计截图。
- 无最终首屏文案冻结。

禁止偏离项:

- 不做传统算命首页。
- 不做营销长页。
- 不使用 `PalmTag` 作为用户可见名称。
- 不声称真实 AI/VLM 已接入。

## 2. Upload Page

页面名称:

上传页 / Upload Page

对应 Stage 2 资产路径:

- `docs/stage2/ui-guideline.md`
- `docs/stage2/page-flow.md`
- `docs/stage2/todo.md`
- `palmtag-visual-direction.html`

可复用的视觉元素:

- 上传区域明显。
- 拍摄示意使用线框掌纹，不用大面积真实手掌图。
- 三段拍摄提示：自然光、掌心完整、避免模糊/遮挡。
- 友好反馈，不用强烈红色恐吓。

需要实现的核心模块:

- 本地图片选择。
- 本地预览。
- 拍摄说明。
- 开始分析按钮。
- 友好错误提示占位。
- 隐私说明入口或轻提示。

移动端首屏优先级:

1. 上传标题和短说明。
2. 上传/预览区域。
3. 主按钮。
4. 3-5 条拍摄提示。

桌面端适配原则:

- 可参考 Stage 2 HTML 的上传说明 + 审核反馈双列结构。
- 桌面不要把上传流程变成后台表单。

资料缺口:

- 无最终上传失败、文件过大、格式不支持的 Stage 2 截图。

禁止偏离项:

- 不接真实上传服务器。
- 不接真实 VLM。
- 不把错误提示写成工程码。
- 不使用恐吓式红色错误页。

## 3. Loading / Analyzing Page

页面名称:

分析中页 / Loading / Analyzing Page

对应 Stage 2 资产路径:

- `docs/stage2/ui-guideline.md`
- `docs/stage2/page-flow.md`
- `docs/stage2/todo.md`
- `palmtag-visual-direction.html`
- `assets/palmtag-topology.svg`

可复用的视觉元素:

- 掌纹线条。
- 扫描感。
- 短进度文案。
- 平静的等待节奏。

需要实现的核心模块:

- 分析中状态。
- 短暂停留或等待 pipeline 返回。
- 娱乐用途提示。
- 失败后进入错误/重拍状态的出口。

移动端首屏优先级:

1. 当前状态：正在生成掌纹人格。
2. 掌纹线条/扫描动效位置。
3. 简短提示，不解释技术细节。

桌面端适配原则:

- 居中或窄卡布局即可。
- 不展示调试日志或 pipeline 步骤表。

资料缺口:

- Stage 2 没有独立分析中页视觉稿。

禁止偏离项:

- 不使用医学检测、风险评估、诊断等词。
- 不展示 VLM、schema、rule engine、JSON 等技术过程。
- 不伪装成真实科学检测。

## 4. Result Page

页面名称:

结果页 / Result Page

对应 Stage 2 资产路径:

- `docs/stage2/ui-guideline.md`
- `docs/stage2/page-flow.md`
- `docs/stage2/data-contract.md`
- `docs/stage2/todo.md`
- `palmtag-visual-direction.html`
- `assets/palmtag-topology.svg`

可复用的视觉元素:

- 人格名称作为最强层级。
- 金句/短判断作为第二层级。
- 掌纹特征作为解释依据。
- 结果页适合截图。
- 生成海报、重新测试等操作入口。

需要实现的核心模块:

- `SUCCESS` 结果主卡。
- `LOW_CONFIDENCE` 保守提示 + 结果展示。
- 主人格展示。
- 母型/双母型提示。
- Top3 候选展示，沿用 pipeline 顺序。
- 匹配特征/冲突特征的非技术化解释。
- 生成海报、重新测试入口。

移动端首屏优先级:

1. “我是什么人格”：主 persona 名称。
2. 一句金句或结果摘要。
3. 低置信提示，只在需要时展示。
4. 海报入口。

桌面端适配原则:

- 可参考 Stage 2 HTML 的结果视觉区 + 详情区双列。
- 桌面端可展示更多解释，但不能改变 Top3 顺序或重新评分。

资料缺口:

- Stage 2 的 persona 示例是探索内容，不是 Stage 3 全 36 人格最终渲染映射。
- Stage 2 的数字评分展示不等同于 Stage 3 可公开展示的精确分数，后续需按 Stage 4 禁止精确小数原则处理。

禁止偏离项:

- 不重算人格。
- 不重排 Top3。
- 不展示原始 JSON、schema、debug、rule engine 术语。
- 不用“命运、健康、婚姻、寿命预测”类表达。

## 5. Poster Page

页面名称:

分享海报页 / Poster Page

对应 Stage 2 资产路径:

- `docs/stage2/ui-guideline.md`
- `docs/stage2/page-flow.md`
- `docs/stage2/todo.md`
- `palmtag-visual-direction.html`
- `assets/palmtag-topology.svg`

可复用的视觉元素:

- 竖版海报卡片。
- 人格名称强突出。
- 金句醒目。
- 掌纹线条装饰。
- 二维码占位。
- 品牌露出。

需要实现的核心模块:

- 基础海报预览。
- 主 persona 名称。
- 母型或短标签。
- 一句结果摘要。
- Palmmi 品牌。
- 保存/分享提示。

移动端首屏优先级:

1. 海报卡片本体。
2. 人格名称。
3. 简短金句。
4. 保存/分享操作。

桌面端适配原则:

- 左侧海报预览 + 右侧操作说明或入口。
- 仍以手机截图传播为核心，不做复杂桌面编辑器。

资料缺口:

- Stage 2 只做海报预览，不做正式 PNG 导出。
- 没有全 36 人格海报布局压力测试截图。

禁止偏离项:

- 不做正式导出功能，除非后续阶段明确要求。
- 不展示 debug/schema/raw score。
- 不做付费解锁、无水印付费等支付系统。

## 6. Error / Empty State

页面名称:

异常状态页 / Error / Empty State

对应 Stage 2 资产路径:

- `docs/stage2/ui-guideline.md`
- `docs/stage2/page-flow.md`
- `palmtag-visual-direction.html`
- `docs/stage3/HANDOFF_TO_STAGE4.md`
- `docs/stage4/STAGE4_SCOPE.md`
- `docs/stage4/STAGE4_INPUT_CONTRACT.md`

可复用的视觉元素:

- 上传页友好反馈样式。
- 简短恢复路径。
- 掌纹线框/轻纹理，不用警报式视觉。

需要实现的核心模块:

- 上传失败。
- 格式不支持。
- 图片过大。
- 模糊/过暗/掌纹不完整重拍。
- `RETRY_REQUIRED`。
- `REJECTED`。
- 分析失败/超时。
- 结果丢失/未知 persona。

移动端首屏优先级:

1. 人话说明发生了什么。
2. 一个清晰恢复动作。
3. 简短拍摄建议。

桌面端适配原则:

- 使用同一窄内容结构。
- 不做后台错误面板。

资料缺口:

- Stage 2 没有专门异常状态视觉稿。
- 只能沿用上传页和 Stage 4 状态映射延展，后续需要截图验收确认。

禁止偏离项:

- 不展示工程错误码作为主文案。
- 不输出人格、母型或 Top3 给 `RETRY_REQUIRED` / `REJECTED`。
- 不责备用户。

## 7. Mobile Layout Baseline

页面名称:

移动端布局基准

对应 Stage 2 资产路径:

- `docs/stage2/ui-guideline.md`
- `docs/stage2/scope.md`
- `docs/stage2/acceptance.md`
- `palmtag-visual-direction.html`
- `docs/stage4/STAGE4_VISUAL_BASELINE.md`

可复用的视觉元素:

- 移动端优先。
- 卡片式布局。
- 主 CTA 明确。
- 短文案。
- 结果和海报适合截图。

需要实现的核心模块:

- 390px 宽度可读。
- 430px 宽度可读。
- 触控目标不拥挤。
- 文字不溢出。
- 首屏只放主要任务。

移动端首屏优先级:

1. 当前页面任务。
2. 主视觉/主结果。
3. 主 CTA。

桌面端适配原则:

- 桌面只扩展，不重排核心意义。

资料缺口:

- Stage 2 无 390px / 430px 截图。

禁止偏离项:

- 不做桌面优先 hero split 作为移动端主结构。
- 不把结果做成密集表格。

## 8. Desktop Responsive Baseline

页面名称:

桌面端响应式基准

对应 Stage 2 资产路径:

- `palmtag-visual-direction.html`
- `docs/stage4/STAGE4_SCOPE.md`

可复用的视觉元素:

- `--max: 1160px` 页面最大内容宽度。
- 940px 以下开始明显折叠。
- 双列区块可用于首页、上传、结果、海报。

需要实现的核心模块:

- 桌面截图补充。
- 宽屏不拉伸海报/卡片到不可读。
- 内容居中，留白清晰。

移动端首屏优先级:

- 桌面不改变移动端优先级。

桌面端适配原则:

- 推荐验收尺寸：1440x900。
- 可补充 1024px 宽度检查。
- 桌面不是 Stage 4 的主体验判断。

资料缺口:

- Stage 2 没有桌面验收截图。

禁止偏离项:

- 不为了桌面改写移动端信息架构。
- 不新增复杂桌面后台/编辑器行为。

## Stage 4C Entry Decision

可以进入 Stage 4C，但 Stage 4C 只应启动首页和上传页实现。

Stage 4C 启动条件:

- 使用本映射表作为页面依据。
- 使用 `docs/stage4/STAGE4_DESIGN_TOKENS_SPEC.md` 的 Stage 2 token 约束。
- 使用 `docs/stage4/STAGE4_SCREENSHOT_LOG.md` 记录 390px、430px 和必要桌面截图。
- 不开始分析中、结果页、海报页正式实现。

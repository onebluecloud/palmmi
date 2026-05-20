# Palmmi Stage 4 Context

## Stage 4 目标

Stage 4 只做页面产品化：把 Stage 3 已验收的 mock 识别闭环结果变成用户可以使用和理解的页面体验。

## Stage 4 只做页面产品化

Stage 4 关注：

- 首页 / 上传页
- 分析中加载页
- 结果页
- 低置信 / 重拍 / 拒识页面
- Top3 / 副母型 / 解释链展示
- 海报页基础模板
- 移动端与微信内体验

Stage 4 不继续开发识别逻辑。

## Stage 4 输入来自 Stage 3 RecognitionResult

Stage 4 页面只消费 Stage 3 输出的 `RecognitionResult`。页面层不读取 V4.2 原报告，不读取 features 重新打分，不直接调用人格规则。

## Stage 4 不负责真实 VLM

真实 VLM 接入不属于 Stage 4 页面开发。Stage 4 仍使用 mock pipeline 或上游传入的 mock `RecognitionResult` 做页面产品化。

## Stage 4 不负责调权重

Stage 4 不处理 3I 分布风险，不调整 3G 母型评分权重，不调整 3H 人格匹配规则。

## Stage 4 不负责重新设计人格

Stage 4 不重新设计 36 人格名称、人格归属、相邻人格规则、跨母型补判规则或 V4.2 字段体系。

## Stage 4 页面范围

Stage 4 建议拆分为：

- 4A：Stage 4 上下文冻结 + 页面范围确认
- 4B：首页 / 上传页接入 mock pipeline
- 4C：分析中加载页
- 4D：结果页接入 RecognitionResult
- 4E：低置信 / 重拍 / 拒识页面
- 4F：Top3 / 副母型 / 解释链展示
- 4G：海报页基础模板
- 4H：移动端与微信内体验测试
- 4I：Stage 4 回归与交接

## Stage 4 第一轮建议任务

Stage 4A 一句话目标：冻结 Stage 4 页面产品化上下文，读取 Stage 3 交接材料，确认页面范围、接口边界、禁止修改项和第一批页面任务；不接真实 VLM，不改识别规则。

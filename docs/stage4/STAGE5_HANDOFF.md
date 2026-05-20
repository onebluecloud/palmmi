# Palmmi Stage 5 Handoff

## 1. Stage 5 的定位

Stage 5 是真实 VLM / API 接入阶段。它应该把 Stage 4 的静态 mock 前端流程连接到真实图片识别、真实服务端边界和真实模型返回字段映射上。

Stage 5 不应该重做 Stage 4 的页面产品化成果。

## 2. Stage 5 应该做什么

- 真实 VLM 接入。
- 真实图片识别。
- 真实 API 边界。
- 模型返回字段映射。
- 图片缓存策略。
- 图片删除策略。
- 接口限流。
- 成本控制。
- 安全策略。
- 服务端接口。
- 真实环境部署准备。

## 3. Stage 5 不应该做什么

Stage 5 第一轮不应该处理：

- 重新设计 UI。
- 重做结果页。
- 重做海报视觉。
- 重写 36 人格规则。
- 重写 Stage 3 score engine。
- 做支付。
- 做登录。
- 做复杂商业化。

## 4. Stage 5 可复用的 Stage 4 页面

| Page | Path | Reuse guidance |
| --- | --- | --- |
| 首页 | `index.html` | 保持入口和产品说明，不需要 Stage 5 第一轮重做。 |
| 上传页 | `upload/index.html` | 可复用本地选择、格式/大小校验和提示文案；真实上传边界需要替换。 |
| 分析页 | `analyze/index.html` | 可复用 loading、done、timeout、error 和恢复入口；真实分析状态需要接服务端。 |
| 结果页 | `result/index.html` | 可复用结果渲染结构；数据源需要来自真实 RecognitionResult 映射。 |
| 海报页 | `poster/index.html` | 可复用海报预览和异常状态；真实导出/复制/二维码不应在 Stage 5 第一轮强行加入。 |

## 5. Stage 5 可复用的数据 key

当前可复用 key：

```text
palmmi:lastUpload
palmmi:lastAnalysisResult
```

复用方式：

- `palmmi:lastUpload` 可以继续作为前端短暂上传状态承接，但真实图片不应长期以 base64 存在 sessionStorage。
- `palmmi:lastAnalysisResult` 可以继续作为结果页/海报页的前端读取边界，但写入来源应从 Stage 4D mock adapter 替换为真实 API 返回后的标准化结果。

## 6. Stage 5 需要替换的 mock 边界

需要替换：

```text
scripts/palmmi-analyze.js
createStage4DMockRecognitionResult()
runStage4DAnalysis()
saveAnalysisResult()
```

当前 `runStage4DAnalysis(upload, { pipeline })` 保留了注入点。Stage 5 可以将真实服务端调用或构建层 pipeline 注入到这里，但不应在浏览器端直接引用 Stage 3 rules / score / matcher 内部文件。

## 7. Stage 5 真实 VLM 接入点

建议接入点：

```text
upload/index.html
-> service upload endpoint
-> analyze/index.html
-> server-side VLM / recognition pipeline
-> normalized RecognitionResult
-> result/index.html
-> poster/index.html
```

原则：

- 真实 VLM 调用应放在服务端或受控 API 层。
- 前端不直接暴露模型 key。
- 前端不直接把真实图片发给第三方模型而绕过服务端策略。
- VLM 原始返回必须先映射到 Stage 3 / Stage 4 可消费的 RecognitionResult。

## 8. Stage 5 图片上传 / 缓存 / 删除策略待处理

需要定义：

- 图片上传方式：multipart、signed URL 或服务端代理。
- 图片大小、格式、压缩和 EXIF 处理。
- 临时图片存储位置。
- 缓存 key 和文件 hash 规则。
- 图片保留时长。
- 用户主动删除或自动过期策略。
- 失败时是否保留图片用于重试。
- 是否保存原图、缩略图或仅保存模型输入版本。

## 9. Stage 5 API 安全待处理

需要定义：

- API key 不进前端。
- 请求签名或会话校验。
- 文件类型和大小的服务端二次校验。
- 速率限制。
- 滥用防护。
- 日志脱敏。
- 错误输出不暴露模型、schema、prompt 或内部栈。

## 10. Stage 5 成本控制待处理

需要定义：

- 单次图片识别成本预算。
- 每用户 / 每 IP / 每会话限流。
- 缓存命中策略。
- 重试次数限制。
- 超时上限。
- 模型降级策略。
- 批量测试和生产流量隔离。

## 11. Stage 5 错误状态如何沿用 Stage 4E

Stage 5 应继续复用 Stage 4E 的用户状态语言：

- 上传缺失：回到上传页。
- 上传状态损坏：重新上传。
- 分析超时：提示重新上传后再试。
- 分析失败：提示流程暂时没有完成。
- 图片不适合识别：不要展示 persona / mother / Top3。
- 真实 API 错误：映射为用户可恢复状态，不暴露技术细节。

推荐继续使用：

```text
missing-upload
invalid-upload
timeout
error
missing-result
invalid-result
partial-result
```

## 12. Stage 5 结果结构如何映射到 Stage 4F / 4G / 4H / 4I 页面

Stage 5 的真实结果应映射到稳定的 RecognitionResult 形状：

- `status`
- `primary_mother`
- `secondary_mother`
- `is_dual_mother`
- `primary_persona`
- `top3`
- `quality_gate`
- `schema`
- `recognition.explanation`
- `error_codes`
- `cache`
- `image_input`

结果页和海报页继续遵守：

- `SUCCESS`：展示 persona、mother、Top3、解释和海报入口。
- `LOW_CONFIDENCE`：展示结果和轻量保守提示。
- `RETRY_REQUIRED`：不展示 persona、mother 或 Top3。
- `REJECTED`：不展示 persona、mother 或 Top3。
- Top3 顺序来自上游，不在前端重排。
- 页面不展示 raw JSON、schema、debug、VLM 或 rule engine 术语。

## 13. Stage 5 禁止破坏的 Stage 4 前端流程

禁止破坏：

```text
index.html
-> upload/index.html
-> analyze/index.html
-> result/index.html
-> poster/index.html
-> upload/index.html
```

禁止在 Stage 5 第一轮破坏：

- 390px / 430px 移动端优先体验。
- 上传页本地校验文案和恢复入口。
- 分析页异常恢复入口。
- 结果页 ready / missing / invalid / partial / error 状态。
- 海报页 ready / missing / invalid / partial / error 状态。
- 结果页到海报页的读取边界。
- 不重算人格、不重排 Top3 的前端约束。

## 14. Stage 5 第一轮建议任务

建议第一轮只做真实 VLM 接入骨架，不做 UI 重设计：

1. 定义服务端 API 合同：上传输入、分析请求、分析响应、错误响应。
2. 定义真实 VLM 原始输出到 RecognitionResult 的字段映射。
3. 定义图片上传、缓存、删除和超时策略。
4. 定义 API key、安全、限流、成本控制策略。
5. 在分析页替换 Stage 4D mock 写入来源，但保持结果页和海报页读取 `palmmi:lastAnalysisResult` 的形状兼容。
6. 添加真实 API mock 测试和错误映射测试。
7. 重新跑 Stage 4 现有测试，确认页面流程不被破坏。

Stage 5 不要在第一轮开始支付、登录、商业化、重新设计 UI 或重写 Stage 3 规则。

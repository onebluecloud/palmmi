# Palmmi Handoff To Stage 4

## Stage 4 可以直接使用的识别入口

Stage 4 页面产品化不直接调用人格规则。可接入的识别入口只有 Stage 3 pipeline 边界：

```js
const { runRecognitionPipeline, createDefaultPipelineConfig } = require("lib/recognition/recognitionPipeline.ts");
```

当前仍是 mock 模式。页面层应通过页面/服务适配层拿到 `RecognitionResult`，而不是在组件里直接读取 features 或规则文件。

## Stage 4 可以直接使用的输出字段

页面层只消费：

1. `status`
2. `primary_mother`
3. `secondary_mother`
4. `is_dual_mother`
5. `primary_persona`
6. `top3`
7. `matched_features`
8. `conflict_features`
9. `reason_codes`
10. `correction`
11. `cache`
12. `quality_gate`
13. `schema`
14. `debug` 中允许后台查看的字段

其中 `matched_features`、`conflict_features`、`reason_codes`、`correction` 可以来自 `primary_persona`、`top3` 或 `recognition` 内部结构；页面只展示，不重算。

## RecognitionResult 字段说明

| 字段 | 页面用途 |
| --- | --- |
| `status` | 决定页面分支：成功、低置信、重拍、拒识。 |
| `cache` | 后台诊断缓存命中；用户默认不展示。 |
| `image_input` | 后台排查输入 metadata；用户默认不展示。 |
| `quality_gate` | 决定失败、重拍、低质量提示。 |
| `schema` | 后台诊断字段质量；用户默认不展示字段级技术细节。 |
| `mother_scores` | 后台诊断；页面不按分数重算母型。 |
| `primary_mother` | 结果页主母型展示。 |
| `secondary_mother` | 双母型或解释链展示。 |
| `is_dual_mother` | 是否展示双母型提示。 |
| `primary_persona` | 结果页主结果展示。 |
| `top3` | Top3 候选展示。 |
| `recognition` | 解释链、相邻人格、跨母型补判、低置信来源。 |
| `error_codes` | 页面失败分支映射，不直接露出工程码。 |
| `debug` | 后台调试使用。 |

## status 状态说明

| status | 含义 | 页面处理 |
| --- | --- | --- |
| `SUCCESS` | 识别闭环成功，置信度正常。 | 展示主结果、Top3、解释链和海报入口。 |
| `LOW_CONFIDENCE` | 可输出结果，但质量、Schema 或 Top1/Top2 边界较弱。 | 展示结果，同时用温和提示说明结果偏保守，可提供重拍入口。 |
| `RETRY_REQUIRED` | 不适合输出人格结果。 | 进入重拍页，提示换更清晰、正面、单手掌照片。 |
| `REJECTED` | 输入不符合识别要求。 | 进入拒识页，说明原因并引导重新上传合适照片。 |
| `CACHE_HIT` | 不是独立 status；由 `cache.cache_hit = true` 表达。 | 页面结果照常展示；后台可标记来自缓存。 |

## SUCCESS / LOW_CONFIDENCE / RETRY_REQUIRED / REJECTED / CACHE_HIT 处理方式

- `SUCCESS`：展示 `primary_persona` 作为主卡片，`primary_mother` 作为辅助标签，`top3` 作为候选解释。
- `LOW_CONFIDENCE`：仍展示 `primary_persona` 和 `top3`，但增加“本次照片信息不够稳定，结果按保守方式处理”的用户提示。
- `RETRY_REQUIRED`：不展示人格，不展示母型，不展示 Top3；只展示重拍引导。
- `REJECTED`：不展示人格，不展示母型，不展示 Top3；只展示拒识原因和重新上传入口。
- `CACHE_HIT`：不改变页面结果分支；后台 debug 面板可显示缓存命中。

## 页面应该如何展示 Top3

- Top3 顺序沿用 pipeline 输出，不允许页面重排。
- 每个候选展示 `name`、`mother_type` 和非技术化解释。
- `score` 可用于内部排序和后台调试，用户侧不建议展示精确小数。
- `matched_features` 和 `conflict_features` 只能转成普通语言，不显示字段名堆叠。

## 页面应该如何展示失败/重拍/拒识

- `RETRY_REQUIRED`：提示照片需要更清晰、更亮、掌心正面、单只手、掌纹完整。
- `REJECTED`：提示当前图片不是可识别的掌心照片，或文件类型/尺寸不符合要求。
- 不向用户显示 JSON、Schema、VLM、rule engine、枚举越界等工程术语。

## 页面应该如何处理低置信

- `LOW_CONFIDENCE` 不是失败。
- 页面可以展示结果，但应提供重拍入口。
- 低置信文案应表达“照片信息不够稳定”，不要表达系统错误。
- 不允许页面为了“看起来更准”自行改人格或 Top3。

## 页面不得临时接真实 VLM

Stage 4 页面开发不得新增真实 provider、API key、千问配置、fetch 调用或后端代理来临时接真实 VLM。真实 VLM 接入应进入后续专门阶段。

## 页面不得绕过 Stage 3 pipeline

页面不得：

- 自己读取 features 重新打分。
- 自己判断母型。
- 自己判断人格。
- 自己处理相邻人格规则。
- 自己处理跨母型补判。
- 自己临时调用 VLM。
- 自己改人格名称和文案。

## 页面不得直接调用人格规则

Stage 4 不应直接 import 或调用：

- `personaRules.ts`
- `personaMatcher.ts`
- `adjacentResolver.ts`
- `crossMotherCorrection.ts`
- `motherScores.ts`

这些属于 Stage 3 识别层。Stage 4 只消费 `RecognitionResult`。

## 页面不得直接读取 V4.2 报告重新设计规则

V4.2 仍是识别规则、字段、人格归属的最终依据，但 Stage 4 只能使用 Stage 3 已冻结的工程结果，不得重新读取报告后自行改字段、规则、人格名称或解释逻辑。

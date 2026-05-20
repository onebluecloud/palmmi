# Palmmi Stage 6B 环境变量与密钥管理方案

## 1. 当前环境变量扫描结果

扫描范围：`.env.example`、`.gitignore`、`docs/`、`api/`、`server/`、`scripts/`、`src/`、`tests/`、`upload/`、`analyze/`、`result/`、`poster/`。当前只发现 `.env.example`，未发现真实 `.env` 文件。

| 变量名 | 出现位置 | 用途 | 是否敏感 | 是否允许前端暴露 | 本地开发是否需要 | Preview 是否需要 | Production 是否需要 | 备注 |
|---|---|---|---|---|---|---|---|---|
| `PALMMI_VLM_PROVIDER` | `.env.example`; `server/stage5p/env.js`; `tests/stage5/*.cjs`; Stage 5 docs | 选择 `mock` / `qwen` provider | 否 | 否 | 是 | 是 | 是 | Stage 6 Preview 初期建议 `mock` |
| `VLM_PROVIDER` | `.env.example`; `server/stage5p/env.js` | provider fallback alias | 否 | 否 | 可选 | 可选 | 可选 | 优先使用 `PALMMI_VLM_PROVIDER` |
| `PALMMI_VLM_MODE` | `.env.example`; `server/stage5p/env.js`; `tests/stage5/*.cjs`; Stage 5 docs | `mock-only` / `real-only` / `real-with-mock-fallback` | 中 | 否 | 是 | 是 | 是 | 影响是否真实调用模型 |
| `VLM_MODE` | `.env.example`; `server/stage5p/env.js` | mode fallback alias | 中 | 否 | 可选 | 可选 | 可选 | 优先使用 `PALMMI_VLM_MODE` |
| `PALMMI_QWEN_API_KEY` | `.env.example`; `server/stage5p/env.js`; `scripts/palmmi-stage5c-runner.js`; `tests/stage5/*.cjs`; Stage 5 docs | Qwen / DashScope API Key | 高 | 否 | real 本地测试需要 | real Preview 需要 secret | real Production 需要 secret | 只能放本地未提交 `.env` 或 Cloudflare secret |
| `QWEN_API_KEY` | `.env.example`; `server/stage5p/env.js`; `tests/stage5/*.cjs`; Stage 5 docs | Qwen API Key fallback alias | 高 | 否 | 可选 | 可选 secret | 可选 secret | 优先使用 `PALMMI_QWEN_API_KEY` |
| `PALMMI_QWEN_MODEL` | `.env.example`; `server/stage5p/env.js`; `scripts/palmmi-stage5c-runner.js`; `tests/stage5/*.cjs`; Stage 5 docs | Qwen 模型名 | 低 | 否 | 是 | real Preview 需要 | real Production 需要 | 默认 `qwen3-vl-flash` |
| `QWEN_MODEL` | `.env.example`; `server/stage5p/env.js`; `tests/stage5/*.cjs` | Qwen 模型 fallback alias | 低 | 否 | 可选 | 可选 | 可选 | 优先使用 `PALMMI_QWEN_MODEL` |
| `PALMMI_QWEN_ENDPOINT` | `.env.example`; `server/stage5p/env.js` | Qwen compatible-mode endpoint override | 中 | 否 | 可选 | 可选 | 可选 | 默认值在代码内，通常不需要配置 |
| `QWEN_ENDPOINT` | `.env.example`; `server/stage5p/env.js` | endpoint fallback alias | 中 | 否 | 可选 | 可选 | 可选 | 优先使用 `PALMMI_QWEN_ENDPOINT` |
| `PALMMI_VLM_TIMEOUT_MS` | `.env.example`; `server/stage5p/env.js`; Stage 5 docs | VLM 请求超时 | 中 | 否 | 是 | 是 | 是 | 当前示例值 `60000`；需和前端等待策略统一 |
| `VLM_TIMEOUT_MS` | `.env.example`; `server/stage5p/env.js` | timeout fallback alias | 中 | 否 | 可选 | 可选 | 可选 | 优先使用 `PALMMI_VLM_TIMEOUT_MS` |
| `PALMMI_VLM_MAX_IMAGE_BYTES` | `.env.example`; `server/stage5p/env.js`; `tests/stage5/*.cjs`; Stage 5 docs | 服务端图片大小限制 | 中 | 否 | 是 | 是 | 是 | 当前示例值 `8388608` |
| `VLM_MAX_IMAGE_BYTES` | `.env.example`; `server/stage5p/env.js` | image size fallback alias | 中 | 否 | 可选 | 可选 | 可选 | 优先使用 `PALMMI_VLM_MAX_IMAGE_BYTES` |
| `PALMMI_STAGE5Q_IMAGE_DIR` | `.env.example`; `tests/stage5/stage5q-real-qwen-min-chain.test.cjs` | 本地真实图片测试目录 | 中 | 否 | 可选 | 否 | 否 | 本地路径，不进 Cloudflare |
| `PALMMI_DOUBAO_API_KEY` | `.env.example`; `scripts/palmmi-stage5c-runner.js` | 本地 Stage 5C shell provider key | 高 | 否 | 否 | 否 | 否 | 当前不是 Stage 6 Qwen 路线 |
| `PALMMI_GLM_API_KEY` | `.env.example`; `scripts/palmmi-stage5c-runner.js` | 本地 Stage 5C shell provider key | 高 | 否 | 否 | 否 | 否 | 当前不是 Stage 6 Qwen 路线 |
| `PALMMI_GEMINI_API_KEY` | `.env.example`; `scripts/palmmi-stage5c-runner.js` | 本地 Stage 5C shell provider key | 高 | 否 | 否 | 否 | 否 | 当前不是 Stage 6 Qwen 路线 |
| `PALMMI_OPENAI_API_KEY` | `.env.example`; `scripts/palmmi-stage5c-runner.js` | 本地 Stage 5C shell provider key | 高 | 否 | 否 | 否 | 否 | 当前不是 Stage 6 Qwen 路线 |
| `LOCALAPPDATA` | `tests/stage5/stage5n-browser-result-poster.test.cjs`; `tests/stage5/stage5r-page-real-flow.test.cjs` | 查找本地 Playwright 浏览器缓存 | 中 | 否 | 测试时由系统提供 | 否 | 否 | 系统环境变量，不由 Palmmi 配置 |

当前未发现：

- 限流配置变量：当前未发现。
- 日志等级变量：当前未发现。
- 图片缓存相关配置变量：当前未发现。
- Cloudflare Token / GitHub Token 环境变量：当前未发现。
- `NEXT_PUBLIC_` / `VITE_` / `PUBLIC_` 前端公开环境变量：当前未发现。

Stage 6 讨论中出现但当前代码未使用的建议项：

| 变量名 | 出现位置 | 用途 | 是否敏感 | 是否允许前端暴露 | 本地开发是否需要 | Preview 是否需要 | Production 是否需要 | 备注 |
|---|---|---|---|---|---|---|---|---|
| `ENABLE_MOCK_MODE` | 用户 Stage 6B 指令示例 | mock 开关 | 中 | 否 | 否 | 否 | 否 | 建议新增，当前代码未使用；当前等价能力由 `PALMMI_VLM_PROVIDER` / `PALMMI_VLM_MODE` 表达 |
| `ENABLE_REAL_VLM` | 用户 Stage 6B 指令示例 | real VLM 开关 | 中 | 否 | 否 | 否 | 否 | 建议新增，当前代码未使用；当前等价能力由 `PALMMI_VLM_MODE=real-only` 表达 |
| `LOG_LEVEL` | 用户 Stage 6B 指令示例 | 日志级别 | 中 | 否 | 否 | 否 | 否 | 建议新增，当前代码未使用 |
| `VLM_API_KEY` | 用户 Stage 6B 指令示例 | 通用模型 key | 高 | 否 | 否 | 否 | 否 | 建议新增，当前代码未使用；当前使用 `PALMMI_QWEN_API_KEY` / `QWEN_API_KEY` |
| `VLM_BASE_URL` | 用户 Stage 6B 指令示例 | 通用模型 base URL | 中 | 否 | 否 | 否 | 否 | 建议新增，当前代码未使用；当前使用 `PALMMI_QWEN_ENDPOINT` / `QWEN_ENDPOINT` |

## 2. 敏感变量分级

### 高敏感

- `PALMMI_QWEN_API_KEY`
- `QWEN_API_KEY`
- `PALMMI_DOUBAO_API_KEY`
- `PALMMI_GLM_API_KEY`
- `PALMMI_GEMINI_API_KEY`
- `PALMMI_OPENAI_API_KEY`
- 未来任何 Cloudflare Token、GitHub Token、支付密钥

这些变量绝不能进入前端 bundle、浏览器存储、日志、Markdown 真实值、测试输出真实值或 Git 历史；只能由本地未提交 `.env` 或部署平台 secret 管理。

### 中敏感

- `PALMMI_VLM_MODE`
- `VLM_MODE`
- `PALMMI_QWEN_ENDPOINT`
- `QWEN_ENDPOINT`
- `PALMMI_VLM_TIMEOUT_MS`
- `VLM_TIMEOUT_MS`
- `PALMMI_VLM_MAX_IMAGE_BYTES`
- `VLM_MAX_IMAGE_BYTES`
- `PALMMI_STAGE5Q_IMAGE_DIR`
- `LOCALAPPDATA`
- 未来日志开关、限流配置、维护模式开关、内部服务 URL

这些变量一般不是密钥，但会影响成本、可用性、内部路径或部署行为；不应暴露给前端，不应把真实本地路径写入公开文档。

### 低敏感

- `PALMMI_VLM_PROVIDER`
- `VLM_PROVIDER`
- `PALMMI_QWEN_MODEL`
- `QWEN_MODEL`
- 非敏感公开站点名称、版本号、静态文案配置

低敏感不代表可以进入前端 bundle。当前 Palmmi 没有需要前端读取的 env 变量；前端只应通过同源 `/api/analyze` 触发服务端逻辑。

必须遵守：

- Qwen / Cloudflare / GitHub / 支付密钥绝不能进入前端 bundle。
- API Key、Authorization header、完整 request body、base64、图片 data URL、provider raw response 绝不能进入日志。
- 文档只能写变量名、空值、占位符或操作说明，不能写真实值。
- 高敏感变量只能由本地 ignored `.env` 或 Cloudflare secret 管理。

## 3. 前端暴露风险检查

- `NEXT_PUBLIC_`：未发现真实代码使用；仅 `docs/STAGE6_DEPLOYMENT_PLAN.md` 中作为风险说明出现。
- `VITE_`：未发现。
- `PUBLIC_`：未发现。
- 前端 JS 直接读取敏感变量：未发现。`scripts/` 下浏览器脚本未读取 `process.env` 中的 Qwen key。
- API Key 写入浏览器代码风险：当前未发现真实 key；Stage 6C 适配时必须保持 key 只在 Function / Worker server side。
- provider raw response 暴露给用户风险：当前 `server/stage5p/analyze-service.js` 会移除 `provider_output`、`raw_provider`、`raw_response`、`rawText` 等字段；但 `scripts/palmmi-stage5.js` 的本地 mock skeleton 曾返回 `provider_output`，不能作为生产 API 响应形态。

结论：当前未发现前端 bundle 暴露敏感变量，但 Stage 6C 增加 Cloudflare Functions / Worker 入口时必须重新扫描最终 bundle。

## 4. 日志泄露风险检查

已发现风险：

- `scripts/palmmi-stage5c-runner.js` 是本地批处理 runner，存在 `console.log` / `console.error`，并会输出 `firstFailure.errorMessage`；其中 Qwen 失败分支包含 provider response 文本片段。它不应进入线上 Function / Worker 日志路径。
- 当前上传链路使用 `previewDataUrl` / `data_url` / `base64`，如果 Stage 6C 的平台适配层打印完整 request body，会泄露用户图片。
- Qwen Provider 会构造 `Authorization: Bearer ${this.apiKey}` 和图片 data URL；任何调试日志都不能打印 fetch init、headers、body。

未发现但需要保持禁止的风险：

- 未发现 `server/stage5p/**` 中有 `console.log` / `console.error` 输出完整 request body。
- 未发现真实 API Key 字符串、Cloudflare Token、GitHub Token。
- 未发现生产 API 响应直接返回 `Authorization`、`choices`、完整 base64、`raw_response`、`raw_provider`、`rawText` 的代码路径。

Stage 6C 前需要重点复查的日志点：

- 新增 `functions/api/analyze.js` 或 `_worker.js` 时，不允许打印 `request.body`、`await request.text()`、payload、headers、`process.env` / `context.env`。
- 不允许打印 `responseText`、provider 原始 JSON、`choices`、`rawText`。
- 不允许把 `console.error(error)` 用在可能携带 request/provider 上下文的错误对象上；只允许输出 request id、错误码、provider 名、模型名、latency 和图片大小。

## 5. `.gitignore` 检查

检查项：

| 项 | 当前状态 |
|---|---|
| `.env` | 已补充 |
| `.env.local` | 已存在 |
| `.env.*.local` | 已补充 |
| `.env.production` | 已补充 |
| `.env.development` | 已补充 |
| `.env.preview` | 已补充 |
| `*.pem` | 已补充 |
| `*.key` | 已补充 |
| `*.secret` | 已补充 |

本阶段已更新 `.gitignore`，仅加入 env/key/secret 忽略规则，没有修改源码。

## 6. `.env.example` 建议

项目已有 `.env.example`。本阶段检查结果：

- 未发现真实 Key。
- 原文件已包含核心 Qwen / VLM 变量。
- 原文件缺少 `PALMMI_QWEN_ENDPOINT`、`QWEN_ENDPOINT`、`VLM_PROVIDER`、`VLM_MODE` 和部分当前代码可读取的本地 runner 变量。

本阶段已更新 `.env.example`：

- 高敏感 key 均为空值。
- endpoint override 为空值，默认使用代码内 DashScope compatible-mode endpoint。
- 保留 `PALMMI_QWEN_API_KEY=` 和 `QWEN_API_KEY=` 空值，以继续符合 Stage 5 测试对示例文件的安全断言。

本地真实 `.env` 示例应只保存在用户机器且不提交：

```dotenv
PALMMI_VLM_PROVIDER=mock
PALMMI_VLM_MODE=mock-only
PALMMI_QWEN_API_KEY=
PALMMI_QWEN_MODEL=qwen3-vl-flash
PALMMI_QWEN_ENDPOINT=
PALMMI_VLM_TIMEOUT_MS=60000
PALMMI_VLM_MAX_IMAGE_BYTES=8388608
```

真实 Qwen Key 只能由用户在本地 `.env` 或 Cloudflare secret 页面手动填写，不能进入聊天、文档或 Git。

## 7. Cloudflare Pages 环境变量配置策略

### Preview 环境

建议初始配置：

| 变量名 | 类型 | 建议值 | 说明 |
|---|---|---|---|
| `PALMMI_VLM_PROVIDER` | plain text | `mock` | Preview 初期默认 mock |
| `PALMMI_VLM_MODE` | plain text | `mock-only` | Preview 初期关闭 real VLM |
| `PALMMI_QWEN_MODEL` | plain text | `qwen3-vl-flash` | real 测试前可先配置 |
| `PALMMI_QWEN_ENDPOINT` | plain text | 空或默认 endpoint | 通常先不配置 |
| `PALMMI_VLM_TIMEOUT_MS` | plain text | `60000` | 需和前端等待策略统一 |
| `PALMMI_VLM_MAX_IMAGE_BYTES` | plain text | `8388608` | 服务端限制 8MB |
| `PALMMI_QWEN_API_KEY` | encrypted secret | 暂不配置 | real Qwen 小范围测试时再配置 |

Preview 初期默认开启 mock、关闭 real VLM。只有在 Stage 6C 完成 Function / Worker 入口适配，且通过限流、日志脱敏、上传检查后，才允许小范围开启真实 Qwen。

### Production 环境

建议初始配置：

| 变量名 | 类型 | 建议值 | 说明 |
|---|---|---|---|
| `PALMMI_VLM_PROVIDER` | plain text | `mock` | Production 暂不公开时保持保守 |
| `PALMMI_VLM_MODE` | plain text | `mock-only` | real VLM 不默认开启 |
| `PALMMI_QWEN_MODEL` | plain text | `qwen3-vl-flash` | 可配置但不代表开启 real |
| `PALMMI_VLM_TIMEOUT_MS` | plain text | `60000` | Stage 6E 前仍需验证 |
| `PALMMI_VLM_MAX_IMAGE_BYTES` | plain text | `8388608` | Stage 6D 验证后可调整 |
| `PALMMI_QWEN_API_KEY` | encrypted secret | 暂不配置 | Production 公开前再配置 |

Production 当前不公开，不绑定正式域名，不做宣发。Production 真实 Qwen 开启前必须通过 Stage 6E，且至少满足：限流、日志脱敏、上传大小控制、测试链接控制、Key 轮换方案、错误回退策略。

## 8. 本地开发环境策略

- 本地 `.env` 可以从 `.env.example` 复制变量名，但真实值只由用户本地填写。
- `.env`、`.env.local`、`.env.*.local`、`.env.production`、`.env.development`、`.env.preview` 都不应提交 Git。
- 本地真实 Qwen Key 只写入 ignored `.env`，不写入 `.env.example`、docs、测试 fixture、命令输出或聊天。
- 本地 mock：`PALMMI_VLM_PROVIDER=mock`、`PALMMI_VLM_MODE=mock-only`。
- 本地 real：`PALMMI_VLM_PROVIDER=qwen`、`PALMMI_VLM_MODE=real-only`，并在本地 `.env` 填 `PALMMI_QWEN_API_KEY`。
- 本地调试禁止打印：`process.env`、Authorization header、完整 request body、base64、图片 data URL、provider raw response、`rawText`、`responseText`、用户上传图片内容。

## 9. Key 泄露应急方案

如果 Qwen API Key 泄露：

1. 立即在服务商后台禁用 / 删除旧 Key。
2. 创建新 Key。
3. 更新本地 `.env`。
4. 更新 Cloudflare Preview / Production secrets。
5. 重新部署。
6. 检查 Git 历史是否包含旧 Key。
7. 如 Git 历史包含旧 Key，旧 Key 视为永久失效，不能继续使用。

如果 Cloudflare Token 泄露：

1. 立即撤销 Token。
2. 重新创建最小权限 Token。
3. 检查是否有异常部署或 DNS 修改。

如果 GitHub Token 泄露：

1. 立即撤销 Token。
2. 检查仓库权限。
3. 检查是否有异常 commit / workflow。

## 10. Stage 6C 前置安全门

| 安全项 | 是否必须 | 当前状态 | 说明 |
|---|---|---|---|
| `.env` 未提交 | 必须 | PASS | 当前项目根目录未发现 `.env`，只存在 `.env.example` |
| `.gitignore` 已忽略 env 文件 | 必须 | PASS | 已补 `.env`、`.env.*.local`、`.env.production`、`.env.development`、`.env.preview` |
| `.env.example` 不含真实 Key | 必须 | PASS | 高敏感变量为空值，无真实 Key |
| 前端 bundle 无敏感变量 | 必须 | PASS | 未发现 `NEXT_PUBLIC_` / `VITE_` / `PUBLIC_` 或前端读取 Qwen key |
| 日志不输出 base64 | 必须 | PASS | 当前 `server/stage5p/**` 无 console 输出 base64；Stage 6C 新入口必须复查 |
| 日志不输出 provider raw response | 必须 | PASS | 当前生产 API 边界会清理 raw 字段；本地 runner 有 provider response 片段日志，不能进入线上入口 |
| Cloudflare Preview 变量清单已明确 | 必须 | PASS | 已列 Preview mock-first 和 real secret 策略 |
| Production 暂不公开策略已明确 | 必须 | PASS | Production 暂不公开，real Qwen Stage 6E 前不默认开启 |
| Key 泄露轮换方案已明确 | 必须 | PASS | 已列 Qwen / Cloudflare / GitHub Token 轮换步骤 |

安全门角度已具备进入 6C 的密钥管理基础，但 Stage 6C 仍被部署工程项阻塞：Git remote 未配置、仓库尚无 commit、Cloudflare Pages Functions / Worker 入口尚未适配、Cloudflare / GitHub 授权尚未完成。

## 11. Stage 6B 结论

- 是否发现真实密钥泄露：未发现。疑似真实 key/token 模式扫描没有命中；仅发现测试占位值如 `test-key`、`TEST_QWEN_KEY_PLACEHOLDER`。
- 是否发现前端暴露风险：未发现当前风险。未发现 `NEXT_PUBLIC_` / `VITE_` / `PUBLIC_` 真实变量，也未发现前端读取敏感 env。
- 是否发现日志泄露风险：发现潜在风险。当前线上 API 边界没有明显日志泄露点，但本地 runner 会输出 provider 错误片段；Stage 6C 新增 Function / Worker 时必须禁止 request body、base64、Authorization、raw response 日志。
- 是否需要更新 `.gitignore`：需要，已更新。
- 是否需要更新 `.env.example`：需要，已更新。
- 是否可以进入 Stage 6C：BLOCKED。
- 如果不能进入 Stage 6C，阻塞项是什么：Git remote 未配置；仓库尚无 commit；Cloudflare Pages Functions / Worker API 入口尚未适配；Cloudflare / GitHub 授权尚未完成；当前 `/api/analyze` 不是 Cloudflare Pages 可直接运行的入口形态。
- 下一步建议是 Stage 6C 还是 Stage 6B 修复轮：密钥管理方案已完成，不需要 Stage 6B 修复轮；下一步应做 Stage 6C 前置工程修复任务，但不能直接部署。

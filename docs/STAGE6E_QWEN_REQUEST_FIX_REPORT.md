# Stage 6E-Fix 公网 Qwen 请求失败修复报告

## 1. 本次修改文件列表

| 文件 | 类型 | 修改原因 |
|---|---|---|
| `server/stage5p/errors.js` | 最小源码修复 | 给 `VLM_API_REQUEST_FAILED` 增加脱敏诊断字段承载能力，不返回 raw response |
| `server/stage5p/analyze-service.js` | 最小源码修复 | 将 provider 的脱敏诊断透传到稳定错误响应 |
| `server/stage5p/providers/qwen-vlm-provider.js` | 最小源码修复 | 修复 Cloudflare runtime 下 `fetch` 调用绑定问题，并增加脱敏 upstream 诊断 |
| `scripts/build-cloudflare-pages.cjs` | 部署配置修复 | 将结果页 / 海报页依赖的 Stage 5 浏览器读取模块复制进 Pages `dist` |
| `docs/STAGE6E_QWEN_REQUEST_FIX_REPORT.md` | 文档 | 记录 Stage 6E-Fix 根因、修复、验证和自检 |
| `docs/STAGE6E_REAL_QWEN_REPORT.md` | 文档 | 更新 Stage 6E 真实链路最终状态 |
| `docs/STAGE6_STATE.md` | 文档 | 更新 Stage 6 当前状态 |

未修改 Stage 3 人格规则、权重、阈值、36 型人格数据；未重做 Stage 4 UI 主风格；未重写 Stage 5 VLM 主逻辑。

## 2. 失败现象

- Cloudflare Production 已配置 `PALMMI_QWEN_API_KEY`、`PALMMI_VLM_PROVIDER`、`PALMMI_VLM_MODE`。
- 线上已离开 mock 路径，但正常掌纹图返回 `VLM_API_REQUEST_FAILED`。
- 本地 Node 真实 Qwen 链路可跑通。
- 页面 `/`、`/upload/`、`/result/`、`/poster/` 均可访问。

## 3. 本地成功链路与公网失败链路差异

| 项目 | 本地 Node | Cloudflare Production 修复前 | 修复后 |
|---|---|---|---|
| Key 变量名 | `PALMMI_QWEN_API_KEY` / `QWEN_API_KEY` | `PALMMI_QWEN_API_KEY` | `PALMMI_QWEN_API_KEY` |
| provider 变量名 | `PALMMI_VLM_PROVIDER` | `PALMMI_VLM_PROVIDER` | `PALMMI_VLM_PROVIDER` |
| mode 变量名 | `PALMMI_VLM_MODE` | `PALMMI_VLM_MODE` | `PALMMI_VLM_MODE` |
| endpoint | `dashscope.aliyuncs.com` compatible-mode | 同本地 | 同本地 |
| model | `qwen3-vl-flash` | `qwen3-vl-flash` | `qwen3-vl-flash` |
| fetch 调用 | Node runtime 可用 | Cloudflare runtime `fetch failed` / `TypeError` | `globalThis.fetch` 直接调用后成功 |
| 结果页依赖模块 | 本地可从源码目录读取 | Pages `dist` 未包含，返回首页 HTML 回退 | 已复制进 `dist/src/stage5/` |

## 4. Qwen endpoint / base URL 检查

- endpoint host：`dashscope.aliyuncs.com`
- endpoint path：`/compatible-mode/v1/chat/completions`
- base URL 来源：代码默认值，未要求用户在 Cloudflare 中额外配置
- 结论：endpoint / path 正确，未发现重复拼接或缺失 `/chat/completions`。

## 5. Qwen model 检查

- model：`qwen3-vl-flash`
- 来源：代码默认值，Cloudflare 未配置 `PALMMI_QWEN_MODEL` 时使用该默认值
- 本地 Stage 5Q 已用同一模型跑通真实链路
- 结论：本轮没有改模型名。

## 6. Cloudflare runtime 兼容性检查

定位到 Cloudflare Production 失败时的脱敏诊断：

| 字段 | 结果 |
|---|---|
| providerStage | `qwen_fetch` |
| requestMethod | `POST` |
| endpointHost | `dashscope.aliyuncs.com` |
| endpointPath | `/compatible-mode/v1/chat/completions` |
| contentType | `application/json` |
| bodyFormat | OpenAI compatible chat completions + `image_url` data URL |
| upstreamStatus | 未取得 |
| isFetchFailed | `true` |
| errorType | `TypeError` |

根因是 Qwen provider 将全局 `fetch` 存为实例属性后以 `this.fetchImpl(...)` 方式调用。Cloudflare Workers runtime 下该调用方式会触发 fetch 绑定问题。修复后对全局 fetch 使用 `globalThis.fetch(endpoint, init)` 直接调用。

## 7. 请求 header 检查，脱敏

- method：`POST`
- `Content-Type`：`application/json`
- auth：存在 Bearer Secret 构造
- 输出限制：未输出 Authorization header 明文，未输出 Secret 值
- 结论：header 结构正确，修复未改变 Key 来源或明文处理方式。

## 8. 请求 body 格式检查，脱敏

- 请求格式：OpenAI compatible chat completions
- message content：`text` + `image_url`
- 图片传递：单次请求内 data URL，服务端不落盘
- 输出限制：报告和日志不记录 base64，不记录原图内容
- 结论：body 格式与本地成功链路一致。

## 9. 上游错误状态，脱敏

修复前没有取得 upstream HTTP status，错误发生在 Cloudflare runtime fetch 调用阶段，不是 Qwen 返回 401 / 403 / 404 / 429 / 5xx。

修复后正常掌纹图公网 API 返回 200，provider 为 `qwen`，不再出现 `VLM_API_REQUEST_FAILED`。

## 10. 根因判断

根因分两层：

1. 公网真实 Qwen API 失败根因：Cloudflare runtime 下全局 `fetch` 被作为实例方法调用，导致 `TypeError` / fetch failed。修复为对全局 fetch 使用 `globalThis.fetch` 直接调用。
2. API 修复后结果页 / 海报页显示错误根因：Cloudflare Pages 构建产物未包含 `src/stage5/*.js` 页面读取模块，线上访问这些模块时回退到首页 HTML。修复为将 4 个浏览器端 Stage 5 读取模块复制进 `dist`。

## 11. 本次最小修复内容

- 增加脱敏诊断字段：`providerStage`、`endpointHost`、`endpointPath`、`model`、`upstreamStatus`、`upstreamErrorCode`、`upstreamRequestId`、`isTimeout`、`isFetchFailed`、`errorType`。
- 修复 Qwen provider fetch 调用绑定：全局 fetch 走 `globalThis.fetch`。
- Cloudflare Pages 构建产物加入：
  - `src/stage5/analysis-result-read-adapter.js`
  - `src/stage5/analysis-result-storage-reader.js`
  - `src/stage5/page-analysis-reader.js`
  - `src/stage5/page-analysis-state-mapper.js`

## 12. 线上真实 Qwen 验证结果

部署：

- 最新修复提交：`7a85e34`
- Cloudflare deployment：`932aab1a-27c0-43e6-9f89-3dc95774fced`
- deployment URL：`https://932aab1a.palmmi.pages.dev`
- Production URL：`https://palmmi.pages.dev`
- workers.dev URL：`https://palmmi.onebluecloud723.workers.dev`

| 链接 | 图片 | HTTP | provider | 结果 |
|---|---|---:|---|---|
| `https://palmmi.pages.dev/api/analyze` | 正常左手 fixture | 200 | `qwen` | PASS，返回结构化结果 |
| `https://palmmi.pages.dev/api/analyze` | 正常右手 fixture | 200 | `qwen` | PASS，返回结构化结果 |
| `https://palmmi.onebluecloud723.workers.dev/api/analyze` | 正常左手 fixture | 200 | `qwen` | PASS，返回结构化结果 |

## 13. 结果页验证结果

| 链接 | 状态 | 说明 |
|---|---|---|
| `https://palmmi.pages.dev/result/` | PASS | 使用公网真实 Qwen 分析结果后进入 `partial-result`，结果面板可见 |
| `https://palmmi.onebluecloud723.workers.dev/result/` | PASS | 使用公网真实 Qwen 分析结果后进入 `partial-result`，结果面板可见 |

`partial-result` 是低置信度图片的可展示状态，不是白屏或崩溃。

## 14. 海报页验证结果

| 链接 | 状态 | 说明 |
|---|---|---|
| `https://palmmi.pages.dev/poster/` | PASS | 使用公网真实 Qwen 分析结果后进入 `partial-result`，海报预览可见 |
| `https://palmmi.onebluecloud723.workers.dev/poster/` | PASS | 使用公网真实 Qwen 分析结果后进入 `partial-result`，海报预览可见 |

## 15. 异常路径验证结果

| 异常类型 | HTTP | 错误码 | 结果 |
|---|---:|---|---|
| 明显无效图片 | 502 | `VLM_API_REQUEST_FAILED` | PASS，不白屏，脱敏错误 |
| 超大图片 | 400 | `FILE_TOO_LARGE` | PASS |
| 错误格式文件 | 400 | `FILE_TYPE_UNSUPPORTED` | PASS |
| Qwen fetch 失败 | 502 | `VLM_API_REQUEST_FAILED` | PASS，不白屏，脱敏错误 |
| Qwen 解析失败 | 本地边界测试覆盖 | `VLM_API_INVALID_RESPONSE` | PASS，不白屏，脱敏错误 |

## 16. 安全检查结果

| 安全项 | 结果 | 说明 |
|---|---|---|
| API 返回不暴露 Key / Token | PASS | 公网 API 返回扫描未发现 |
| API 返回不暴露 base64 | PASS | 公网 API 返回扫描未发现 |
| API 返回不暴露 provider raw response | PASS | 公网 API 返回扫描未发现 |
| 构建日志不暴露 Key / Token | PASS | Cloudflare deployment logs 未发现敏感标记 |
| 构建日志不暴露 base64 | PASS | Cloudflare deployment logs 未发现 |
| 构建日志不暴露 raw response | PASS | Cloudflare deployment logs 未发现 |
| 前端 bundle 不包含 Qwen Key | PASS | `dist` 扫描未发现 Key / endpoint secret |
| 运行 API 路径不打印 raw response | PASS | API 代码无运行时 console 输出 raw response |
| 没有新增长期图片存储 | PASS | 未新增 KV / R2 / D1 / Durable Object |
| 没有新增用户身份采集 | PASS | 未新增登录或身份采集 |

## 17. Stage 3 / 4 / 5 冻结检查

| 检查项 | 结果 | 说明 |
|---|---|---|
| Stage 3 规则 / 权重 / 阈值 | PASS | 本轮未修改相关文件 |
| 36 型人格数据 | PASS | 本轮未修改 |
| Stage 4 UI 主风格 | PASS | 本轮未改 UI 样式或布局 |
| Stage 5 VLM 主逻辑 | PASS | 仅做 Cloudflare runtime fetch 兼容和部署产物补齐，未重写 provider / parser / 规则引擎 |
| 支付 / 打赏 / 登录 / 宣发 | PASS | 未新增 |
| 域名 / DNS | PASS | 未绑定域名，未修改 DNS |

回归测试：

- `npm run build`：PASS
- `node tests/stage5/stage5p-provider-boundary.test.cjs`：PASS
- `node tests/stage4/upload-validation.test.cjs`：PASS
- `node tests/stage4/error-state.test.cjs`：PASS
- `node tests/stage4/analyze-flow.test.cjs`：PASS
- `node tests/stage5/stage5j-analysis-storage-reader.test.cjs`：PASS
- `node tests/stage5/stage5k-page-analysis-reader.test.cjs`：PASS
- `node tests/stage5/stage5m-result-poster-ui-integration.test.cjs`：PASS
- `node tests/stage5/stage5n-browser-result-poster.test.cjs`：PASS

## 18. 是否可以进入 Stage 6F

PASS。

Stage 6E-Fix 已满足进入 Stage 6F 的技术门槛：公网真实 Qwen API 跑通，结果页和海报页可展示，异常路径不白屏，未发现 Key / Token / base64 / raw response 泄露。

注意：本轮只报告可以进入 Stage 6F，不执行 Stage 6F。

## 19. 当前阻塞项

当前 Stage 6E-Fix 无阻塞项。

Stage 6F 仍需单独指令启动；在启动前继续保持：

- 不公开传播测试链接。
- 不绑定正式域名。
- 不修改 DNS。
- 不新增支付 / 打赏 / 登录 / 宣发。

## 20. Codex 自检验收表

| 验收项 | 结果 | 证据 / 说明 |
|---|---|---|
| 是否定位 `VLM_API_REQUEST_FAILED` 的具体失败类型 | PASS | Cloudflare fetch 阶段 `TypeError` / `isFetchFailed=true` |
| 是否确认线上 endpoint / base URL | PASS | `dashscope.aliyuncs.com` + `/compatible-mode/v1/chat/completions` |
| 是否确认线上 model | PASS | `qwen3-vl-flash` |
| 是否确认线上 Authorization header 构造正确，脱敏 | PASS | Bearer Secret 构造存在，未输出明文 |
| 是否确认线上 request body 格式正确，脱敏 | PASS | OpenAI compatible chat completions + `image_url` data URL |
| 是否确认 Cloudflare runtime 没有 Node-only API 问题 | PASS | 修复 fetch 绑定后 Production 成功 |
| 是否确认公网真实 Qwen 请求成功 | PASS | 正常左右手图 HTTP 200，provider `qwen` |
| 是否确认 provider 为 qwen / real | PASS | 公网 API 返回 `provider: qwen` |
| 是否确认正常掌纹图返回人格结果 | PASS | `analysis_result` / `recognition_result` 存在 |
| 是否确认结果页展示真实结果 | PASS | `/result/` 进入 `partial-result` 且结果面板可见 |
| 是否确认海报页展示真实结果 | PASS | `/poster/` 进入 `partial-result` 且海报预览可见 |
| 是否确认无效图片不白屏 | PASS | 返回脱敏错误 JSON |
| 是否确认超大图片仍被拒绝 | PASS | `FILE_TOO_LARGE` |
| 是否确认错误格式仍被拒绝 | PASS | `FILE_TYPE_UNSUPPORTED` |
| 是否确认 Qwen 异常不白屏 | PASS | `VLM_API_REQUEST_FAILED` 稳定脱敏返回 |
| 是否确认 Qwen 解析失败不白屏 | PASS | Stage 5 边界测试覆盖 |
| 是否确认 API 不暴露 Key / Token | PASS | 公网 API 扫描未发现 |
| 是否确认 API 不暴露 base64 | PASS | 公网 API 扫描未发现 |
| 是否确认 API 不暴露 raw response | PASS | 公网 API 扫描未发现 |
| 是否确认日志不暴露 Key / Token | PASS | Cloudflare 构建日志检查未发现 |
| 是否确认日志不暴露 base64 | PASS | Cloudflare 构建日志检查未发现 |
| 是否确认日志不暴露 raw response | PASS | Cloudflare 构建日志检查未发现 |
| 是否确认没有新增长期图片存储 | PASS | 未新增 KV / R2 / D1 / Durable Object |
| 是否确认没有新增支付 / 打赏 / 登录 / 宣发 | PASS | 未新增 |
| 是否确认没有修改 Stage 3 规则 / 权重 / 阈值 | PASS | 未修改 |
| 是否确认没有重做 Stage 4 UI | PASS | 未修改 UI 主风格 |
| 是否确认没有重写 Stage 5 VLM 主逻辑 | PASS | 仅 Cloudflare runtime 兼容和部署产物修复 |
| 是否可以进入 Stage 6F | PASS | 6E-Fix 验收通过；本轮不执行 6F |

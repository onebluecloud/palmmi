# Stage 6D 图片上传与临时缓存策略报告

## 1. 本次修改文件列表

- `scripts/palmmi-upload.js`
  - 将前端上传限制从 10MB 调整为 8MB，与线上 API 默认限制一致。
  - 为 `palmmi:lastUpload` 增加 `expiresAt` 和 `retentionTtlHours: 24`。
- `scripts/palmmi-analyze.js`
  - 读取上传状态时检查 24 小时 TTL，过期后清理 `palmmi:lastUpload`。
  - 分析成功后清理 `palmmi:lastUpload`，避免图片 data URL 继续保留在浏览器 sessionStorage。
- `upload/index.html`
  - 同步 8MB 上传说明。
  - 更新隐私提示，明确图片只用于本次分析请求，服务端不长期保存原图。
- `tests/stage4/upload-validation.test.cjs`
  - 同步 8MB 上传限制断言。
- `tests/stage4/error-state.test.cjs`
  - 同步超大图片测试边界。
- `tests/stage4/analyze-flow.test.cjs`
  - 增加上传状态 24 小时 TTL 和过期清理断言。
- `tests/stage5/stage5r-page-real-flow.test.cjs`
  - 同步分析成功后清理上传状态的预期。
- `docs/STAGE6D_UPLOAD_CACHE_REPORT.md`
  - 新增本报告。
- `docs/STAGE6_STATE.md`
  - 更新 Stage 6D 状态。

## 2. 当前图片处理链路

1. 上传页 `upload/index.html` 使用 `input[type=file]` 选择本地图片。
2. `scripts/palmmi-upload.js` 校验 MIME 类型和大小，支持 `image/jpeg`、`image/png`、`image/webp`，最大 8MB。
3. 浏览器用 `URL.createObjectURL()` 做即时预览，并用 `FileReader.readAsDataURL()` 生成 data URL。
4. `palmmi:lastUpload` 暂存在浏览器 `sessionStorage`，包含文件名、MIME、大小、data URL、上传时间和 24 小时过期时间。
5. 分析页 `scripts/palmmi-analyze.js` 读取 `palmmi:lastUpload`，过期或损坏则清理并要求重新上传。
6. `scripts/palmmi-analyze-api-client.js` 将上传状态作为单次 JSON 请求发送给 `/api/analyze`。
7. Cloudflare Pages Function `functions/api/analyze.js` 当前 Stage 6D 仍使用 mock-only，校验 MIME 和大小后返回 mock 结果。
8. 分析成功后，浏览器清理 `palmmi:lastUpload`，只保留 `palmmi:lastAnalysisResult` 供结果页和海报页读取。

## 3. 原图是否落盘

- 服务端原图是否落盘：否。
- 仓库 / Cloudflare Pages / Worker 是否写入原图文件：否。
- 浏览器端是否暂存图片：是，上传后会在当前浏览器标签页的 `sessionStorage` 中临时保存 data URL。
- 浏览器端暂存是否长期：否，本轮已加入 24 小时 TTL，并在分析成功后清理。

## 4. 缓存位置与缓存时间

- `palmmi:lastUpload`：浏览器 `sessionStorage`，最多 24 小时，分析成功后立即清理。
- `palmmi:lastAnalysisResult`：浏览器 `sessionStorage`，保存可渲染分析结果，不包含原图 data URL。
- `palmmi:anonymousDeviceId`：浏览器 `localStorage`，仅匿名设备 ID，不包含图片。
- 服务端缓存：当前无服务端图片缓存。
- 未来如需要临时图片缓存，TTL 不得超过 24 小时，并需单独设计 KV/R2 等策略。

## 5. 是否使用 KV / R2 / D1 / Durable Object / 外部对象存储

- Cloudflare KV：未使用。
- Cloudflare R2：未使用。
- Cloudflare D1：未使用。
- Durable Object：未使用。
- 外部对象存储：未使用。
- Cloudflare API 检查结果：Pages production / preview 配置中未发现 KV、R2、D1、Durable Object 绑定。

## 6. 海报是否保存

- 服务端是否保存海报：否。
- 海报页是否生成文件：否。
- 海报页只读取 `palmmi:lastAnalysisResult` 并在浏览器中渲染预览。

## 7. 结果页是否可重复访问

- 同一浏览器 session 中，如果 `palmmi:lastAnalysisResult` 仍存在，结果页和海报页可以重复访问。
- 结果页不依赖服务端保存原图。
- 页面刷新后是否可看结果：同一 sessionStorage 未清理时可以。
- 换浏览器、换设备、清理 sessionStorage 后不可重复访问。

## 8. 日志是否记录图片 URL / base64 / raw response

- 当前 Pages Function 不打印 request body。
- 当前 Worker 兼容入口不打印 request body。
- 本地 Wrangler dev 日志未发现 `data:image`、`;base64,`、`raw_response`、`provider_raw`、`Authorization`、Key / Token。
- Cloudflare Pages 构建日志未发现 API Key、Token、`.env`、base64、provider raw response。
- Qwen Provider 当前 6D 未开启；代码中把 provider raw response 解析后只返回结构化结果，不直接返回 raw response。

## 9. 本次发现的问题

- 前端上传限制 10MB 与线上 API 默认 8MB 不一致。
- 浏览器 `sessionStorage` 中的 `palmmi:lastUpload` 没有明确 24 小时过期检查。
- 分析成功后 `palmmi:lastUpload` 原本仍可能保留在 sessionStorage。

## 10. 本次完成的修复

- 统一前端上传限制为 8MB。
- 增加 `expiresAt` 和 `retentionTtlHours: 24`。
- 分析页读取上传状态时执行 TTL 检查，过期后清理并要求重新上传。
- 分析成功后清理 `palmmi:lastUpload`。
- 更新上传页隐私说明，避免继续表达“不会上传到服务器”的过期说法。

## 11. 上传大小与格式限制

- 最大大小：8MB。
- 支持格式：JPG / PNG / WebP。
- 前端限制：`scripts/palmmi-upload.js`。
- Pages Function 限制：`functions/api/analyze.js`。
- Stage 5P server API 默认限制：`server/stage5p/env.js`。

## 12. 隐私与安全结论

- 原图不在服务端长期保存。
- 当前不使用长期图片 URL。
- 当前不做用户图库、历史报告、账号绑定或长期云存储。
- base64 只存在于浏览器临时上传状态和单次请求体中。
- base64 不进入 API 响应、构建日志或运行日志。
- provider raw response 不进入 API 响应或页面。
- 真实 Qwen Key 未配置、未写入、未输出。

## 13. 本地测试结果

| 测试项 | 结果 | 说明 |
|---|---|---|
| `npm run build` | PASS | 成功生成 `dist` |
| `node tests/stage4/upload-validation.test.cjs` | PASS | 8MB / 格式校验通过 |
| `node tests/stage4/error-state.test.cjs` | PASS | 错误状态通过 |
| `node tests/stage4/analyze-flow.test.cjs` | PASS | 24 小时 TTL 和过期清理通过 |
| `node tests/stage5/stage5p-provider-boundary.test.cjs` | PASS | API 边界脱敏通过 |
| 本地 Pages 首页 / 上传 / 结果 / 海报 | PASS | 均返回 200 |
| 本地 POST `/api/analyze` 正常图片 | PASS | 200，mock SUCCESS |
| 本地 POST `/api/analyze` 超大图片 | PASS | 400，`FILE_TOO_LARGE` |
| 本地 POST `/api/analyze` 错误格式 | PASS | 400，`FILE_TYPE_UNSUPPORTED` |
| 本地 API 响应泄露检查 | PASS | 未发现 base64、Key、Token、raw response |
| 本地运行日志泄露检查 | PASS | 未发现 base64、Key、Token、raw response |

## 14. 线上测试结果

| 测试项 | 结果 | 说明 |
|---|---|---|
| Cloudflare deployment `a7207d05` | PASS | commit `6d7286f` 构建和 deploy 均 success |
| 线上首页 `/` | PASS | 200，标题 `Palmmi · 掌纹人格标签` |
| 线上上传页 `/upload/` | PASS | 200，标题 `Palmmi · 上传掌纹`，显示 8MB，未发现 10MB 文案 |
| 线上结果页 `/result/` | PASS | 200，标题 `Palmmi · 结果` |
| 线上海报页 `/poster/` | PASS | 200，标题 `Palmmi · 分享海报` |
| 线上 POST `/api/analyze` 正常图片 | PASS | 200，`ok: true`、`provider: mock`、`status: SUCCESS` |
| 线上 POST `/api/analyze` 超大图片 | PASS | 400，`FILE_TOO_LARGE` |
| 线上 POST `/api/analyze` 错误格式 | PASS | 400，`FILE_TYPE_UNSUPPORTED` |
| 线上 API 响应泄露检查 | PASS | 未发现 base64、Key、Token、raw response |
| Cloudflare 构建日志泄露检查 | PASS | 未发现 API Key、Token、`.env`、base64、provider raw response |

## 15. 是否可以进入 Stage 6E

6D 可完成；6E 需要用户后续在 Cloudflare 平台手动配置真实 Qwen Key 后才能执行真实链路验证。

## 16. 仍需用户人工完成的事项

- 不要把 Qwen API Key、Cloudflare Token、GitHub Token 发到聊天。
- 准备 3–10 张测试图片。
- Stage 6E 前在 Cloudflare 平台手动配置真实 Qwen Key。
- 不公开传播 `pages.dev` / `workers.dev` 链接。
- 暂不绑定正式域名，不修改 DNS，不接支付 / 打赏 / 登录。

## 17. Codex 自检验收结果

| 验收项 | 结果 | 证据 / 说明 |
|---|---|---|
| 是否确认原图是否落盘 | PASS | 服务端不落盘；浏览器 sessionStorage 临时保存 data URL |
| 是否确认缓存位置 | PASS | `sessionStorage`：`palmmi:lastUpload` / `palmmi:lastAnalysisResult` |
| 是否确认缓存时间 | PASS | 上传状态最多 24 小时，成功分析后清理 |
| 是否确认是否使用 KV / R2 / D1 / Durable Object / 外部对象存储 | PASS | Cloudflare 配置未发现相关绑定 |
| 是否确认海报是否保存 | PASS | 海报仅浏览器渲染，不生成服务端文件 |
| 是否确认结果页是否依赖长期图片存储 | PASS | 结果页依赖 `palmmi:lastAnalysisResult`，不依赖原图 |
| 是否确认日志不记录 base64 | PASS | 本地日志和构建日志未发现 |
| 是否确认日志不记录完整图片 URL | PASS | 当前无长期图片 URL，也无 URL 日志 |
| 是否确认日志不记录 provider raw response 全量 | PASS | 未发现 raw response 日志 |
| 是否确认 API 返回不暴露 base64 | PASS | 本地 API 响应扫描通过 |
| 是否确认 API 返回不暴露 Key / Token | PASS | 本地 API 响应扫描通过 |
| 是否确认 API 返回不暴露 provider raw response 全量 | PASS | 本地 API 响应扫描通过 |
| 是否确认上传大小限制 | PASS | 8MB，前端和服务端一致 |
| 是否确认上传格式限制 | PASS | JPG / PNG / WebP |
| 是否确认 mock 链路仍可用 | PASS | 本地 POST `/api/analyze` 返回 mock SUCCESS |
| 是否确认页面仍可访问 | PASS | 本地和线上四页均 200 |
| 是否确认没有新增支付 / 打赏 / 登录 / 宣发功能 | PASS | 未新增 |
| 是否确认没有修改 Stage 3 人格规则、权重、阈值 | PASS | 未修改 Stage 3 数据 / 规则文件 |
| 是否确认没有重做 Stage 4 UI 主风格 | PASS | 仅更新上传文案和限制 |
| 是否确认没有重写 Stage 5 VLM 主逻辑 | PASS | 未修改 provider 主逻辑 |
| 是否确认没有写入真实 Qwen Key | PASS | 未写入 |
| 是否可以进入 Stage 6E | BLOCKED | 6D 已通过；真实链路验证需用户后续手动配置真实 Qwen Key |

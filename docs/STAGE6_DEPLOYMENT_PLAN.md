# Palmmi Stage 6A 部署方案确认

## 1. 项目结构扫描结果

- 当前路径：`C:\Users\zhang\Documents\New project 8`
- Git remote：未配置 remote，`git remote -v` 无输出。
- 当前分支：`master`
- Git 状态：仓库尚无 commit，当前项目文件均为未跟踪文件。
- 技术栈：静态 HTML/CSS/浏览器 JS + CommonJS Node 风格服务端分析边界。未发现 Next / Vite / Remix / Astro / Nuxt / Svelte 配置。
- 包管理器：未发现 `package.json`、`package-lock.json`、`pnpm-lock.yaml`、`yarn.lock`、`bun.lockb`。
- build 命令：当前项目未定义 build 命令。静态页面理论上可直接以项目根目录作为静态输出。
- dev 命令：当前项目未定义 dev 命令。`Open-PalmTag.cmd` 会用 Chrome / Edge 打开 `palmtag-visual-direction.html`；线上同源 API 流程需要 HTTP(S) 环境。
- 输出目录：无构建输出目录；静态入口位于项目根目录及 `upload/`、`analyze/`、`result/`、`poster/`。
- README / docs：根目录无 `README.md`；已有 `docs/stage2`、`docs/stage3`、`docs/stage4`、`docs/stage5`；`PalmTag_rule_engine_v0/README.md` 存在。
- API routes / server routes / functions：存在 `api/analyze.js` 和 `server/stage5p/**`，但不存在 Cloudflare Pages 的 `functions/` 目录，也不存在 `_worker.js`。
- 服务端模型调用：存在，主要在 `server/stage5p/providers/qwen-vlm-provider.js`。
- 图片上传处理：存在，浏览器侧在 `scripts/palmmi-upload.js`；分析 API 输入规范化在 `server/stage5p/analyze-service.js`。
- 海报生成逻辑：存在，浏览器侧在 `scripts/palmmi-poster.js` 和 `poster/index.html`，当前为 DOM 渲染，不是服务端图片生成。
- 本地文件系统依赖：线上 API 主链路未发现写入本地文件；但服务端代码使用 `node:path`、`Buffer`、`process.env`，且 `server/stage5p/providers/qwen-vlm-provider.js` 间接引入 `scripts/palmmi-stage5c-runner.js`，该 runner 顶层使用 `node:fs`，主要用于本地批处理/测试。
- 长时间任务：真实 Qwen / VLM 调用可能接近 `PALMMI_VLM_TIMEOUT_MS` 默认 60000ms；当前前端分析页默认约 8000ms 进入 timeout 状态。
- 大 body size 上传风险：浏览器上传限制 10MB，服务端限制默认 8MB；但当前分析 payload 会携带 base64 data URL，体积会膨胀约三分之一。
- serverless timeout 风险：Qwen 请求是外部网络等待，Cloudflare Workers 对 HTTP 请求无固定 wall time 上限但受客户端连接、CPU、内存、平台配额影响；当前 UI 8 秒 timeout 更可能先触发。

上传 / 分析 / Qwen / 规则引擎 / 海报相关路径：

- 上传页：`upload/index.html`
- 上传脚本：`scripts/palmmi-upload.js`
- 分析页：`analyze/index.html`
- 分析页脚本：`scripts/palmmi-analyze.js`
- API 客户端：`scripts/palmmi-analyze-api-client.js`
- API 入口模块：`api/analyze.js`
- 服务端分析服务：`server/stage5p/analyze-service.js`
- 环境变量解析：`server/stage5p/env.js`
- Provider 选择：`server/stage5p/provider-selection.js`
- Qwen Provider：`server/stage5p/providers/qwen-vlm-provider.js`
- Mock Provider：`server/stage5p/providers/mock-vlm-provider.js`
- Stage 5 runner / 本地批处理：`scripts/palmmi-stage5c-runner.js`
- 识别管线：`src/stage5/palmmi-recognition-pipeline.js`
- 分析桥接：`src/stage5/palmmi-analysis-bridge.js`
- 规则引擎：`lib/recognition/*.ts`
- 36 型人格 / 规则数据：`lib/recognition/personaCatalog.ts`、`lib/recognition/personaRules.ts`、`PalmTag_rule_engine_v0/data/*.json`
- 结果页：`result/index.html`、`scripts/palmmi-result.js`
- 海报页：`poster/index.html`、`scripts/palmmi-poster.js`

## 2. Cloudflare Pages 适配性判断

- 静态页面是否适合 Pages：适合。当前 `index.html`、`upload/`、`analyze/`、`result/`、`poster/`、`scripts/`、`styles/` 可作为静态站点部署到 Cloudflare Pages。Cloudflare Pages 官方支持静态资产和预览部署。
- API routes 是否适合 Pages Functions / Workers：需要适配后才适合。当前 `api/analyze.js` 是 CommonJS 导出 `handleAnalyzeRequest/runAnalyzeApi`，不是 Pages Functions 需要的 `functions/api/analyze.js` + `onRequest` / `onRequestPost` 形态，也没有 `_worker.js`。
- Qwen / VLM 调用是否适合 serverless / edge 环境：原则上适合放在 serverless / edge 后端，不能放前端；但需要处理 timeout、日志脱敏、请求大小、速率限制和密钥绑定。
- 图片上传 body size 是否存在风险：存在中等风险。当前 8MB 服务端限制和 10MB 前端限制低于 Cloudflare Free/Pro 100MB request body 限制，但 base64 JSON 传输会放大体积，并增加日志泄露和内存压力。
- Qwen 请求 timeout 是否存在风险：存在高风险。服务端默认 `PALMMI_VLM_TIMEOUT_MS=60000`，但分析页默认约 8000ms 进入 timeout 状态；Stage 6E 真实链路前需要统一用户等待策略。
- 海报生成是否依赖 Node Canvas / 文件系统 / 浏览器 API：当前海报为浏览器 DOM 渲染，依赖 `sessionStorage` 和 DOM，不依赖 Node Canvas，不写文件，不生成长期图片文件。
- 环境变量是否可迁移到 Cloudflare Pages：可以。Cloudflare Pages Functions 可在 Preview / Production 配置变量和加密 secret；敏感项必须用 secret，不能用前端公开变量。
- 是否需要 Node.js compatibility：需要。当前服务端链路使用 CommonJS `require`、`process.env`、`Buffer`、`node:path`，且间接引入 `node:fs`；Cloudflare Workers / Pages Functions 需要配置 `nodejs_compat` 与合适 compatibility date 后再验证。
- 是否存在无法直接部署到 Cloudflare Pages 的阻塞点：存在。阻塞点不是静态页面，而是 API 运行形态：没有 `functions/` 或 `_worker.js`，没有 Cloudflare 适配器，没有 `wrangler` 配置，没有 Git remote / 已连接仓库。

明确结论：

- Cloudflare Pages 推荐作为 Stage 6 首选，但只推荐按“静态 Pages + Pages Functions/Worker API 适配”的形态推进。
- Stage 6A 不应创建 production 部署。
- Stage 6B 应先整理 Preview / Production 变量、secret、mock/real 开关、日志脱敏和限流策略。
- Stage 6C 在当前状态下不能直接做完整真实 Qwen Preview；需要先完成 GitHub 仓库/remote 确认，并增加 Cloudflare Pages Functions 适配层或 `_worker.js`。
- Vercel 应保留为备选。若 Cloudflare 的 CommonJS/Node compatibility、Pages Functions 路由适配或 Qwen 等待时间验证不稳定，Vercel Node serverless 可能更接近当前代码形态，但也仍需要平台函数入口适配。
- 是否需要后续做代码适配：需要。至少需要新增 Pages Functions / Worker 入口、平台 env 读取桥接、请求/响应包装、部署配置和真实 Preview 验证。

参考的官方信息：

- Cloudflare Pages limits：`https://developers.cloudflare.com/pages/platform/limits/`
- Cloudflare Pages Functions：`https://developers.cloudflare.com/pages/functions/`
- Cloudflare Pages Functions get started：`https://developers.cloudflare.com/pages/functions/get-started/`
- Cloudflare Pages bindings / variables / secrets：`https://developers.cloudflare.com/pages/functions/bindings/`
- Cloudflare Workers limits：`https://developers.cloudflare.com/workers/platform/limits/`
- Cloudflare Workers Node.js compatibility：`https://developers.cloudflare.com/workers/runtime-apis/nodejs/`

## 3. Computer Use / Chrome 操作记录

- 未使用浏览器。
- 未使用原因：当前 Codex 环境没有可直接控制用户已登录 Chrome / Cloudflare Dashboard / GitHub Dashboard 的 Computer Use 工具；不能虚构已经进入 Cloudflare Dashboard。
- 已使用的替代方式：只查阅 Cloudflare 官方公开文档用于平台适配判断。

后续用户需要手动完成的 Cloudflare 页面操作：

- 保持 Cloudflare 账号可登录。
- Stage 6C 前在 Cloudflare Dashboard 进入 Workers & Pages / Pages。
- 连接 GitHub 时由用户在浏览器里确认授权。
- 选择 Palmmi 对应 GitHub 仓库。
- 不绑定正式域名。
- 不修改 DNS。
- 不填入 API Key 到聊天或文档。
- Preview 部署前只在 Cloudflare 变量/secret 页面配置占位或真实 secret。
- 未创建任何项目。
- 未修改任何 Cloudflare 设置。

## 4. 推荐部署路径

建议按以下顺序：

- Stage 6A：只确认部署方案。当前文档即本阶段产物。
- Stage 6B：整理生产环境变量和密钥管理。明确 Preview 默认 mock、real VLM 小范围开启、secret 配置位置、日志脱敏和限流要求。
- Stage 6C：创建 Preview 部署 Dry Run。先完成 GitHub repo/remote 和 Cloudflare Pages 连接，再验证静态页面；随后增加/验证 Pages Functions API 入口。
- Stage 6D：验证图片上传和缓存策略。重点验证 base64 不进入日志、图片不长期保存、上传大小和微信内置浏览器行为。
- Stage 6E：公网真实 Qwen 链路验证。只在小范围测试链接中开启 real VLM，并完成成本保护和回滚开关。

## 5. 域名策略

- 当前不需要购买域名。
- 当前不需要绑定正式域名。
- 当前可以先使用 Cloudflare Pages 默认 `*.pages.dev` 做 Preview / 内测。
- 正式发布前再决定是否购买 / 绑定域名。
- Stage 6 内测不需要备案。
- 如果未来使用中国大陆服务器、Cloudflare China Network、或长期主要面向中国大陆用户公开运营，需要单独处理 ICP 备案 / 许可证、内容合规和国内访问速度问题。
- Cloudflare China Network 官方要求每个接入的 apex domain 有有效 ICP 备案或许可证；普通 Cloudflare Global / Pages 的中国大陆访问速度和稳定性不能按国内节点假设。

默认判断：

- Stage 6 内测先不用正式域名。
- 先用 Cloudflare Pages 默认域名做 Preview。
- 正式发布前再决定是否购买 / 绑定域名。
- 如果未来使用中国大陆服务器或面向大陆长期运营，再单独处理备案问题。

参考：

- Cloudflare China Network：`https://developers.cloudflare.com/china-network/`
- Cloudflare ICP concept：`https://developers.cloudflare.com/china-network/concepts/icp/`

## 6. 环境变量初步清单

以下变量来自当前代码和 `.env.example` 扫描，不凭空新增。

| 变量名 | 当前代码中出现的位置 | 是否敏感 | 是否允许暴露到前端 | Preview 是否需要 | Production 是否需要 |
|---|---|---:|---:|---:|---:|
| `PALMMI_VLM_PROVIDER` | `.env.example`; `server/stage5p/env.js`; tests | 否 | 否 | 是，建议 `mock` 起步 | 是，真实环境可设 `qwen` |
| `VLM_PROVIDER` | `server/stage5p/env.js` | 否 | 否 | 可选 fallback | 可选 fallback |
| `PALMMI_VLM_MODE` | `.env.example`; `server/stage5p/env.js`; tests | 否 | 否 | 是，建议 `mock-only` 起步 | 是，公开前不建议默认 real |
| `VLM_MODE` | `server/stage5p/env.js` | 否 | 否 | 可选 fallback | 可选 fallback |
| `PALMMI_QWEN_API_KEY` | `.env.example`; `server/stage5p/env.js`; `scripts/palmmi-stage5c-runner.js`; tests | 是 | 否 | real VLM 小范围测试时需要 secret | real VLM 需要 secret |
| `QWEN_API_KEY` | `.env.example`; `server/stage5p/env.js`; tests | 是 | 否 | 可选 fallback secret | 可选 fallback secret |
| `PALMMI_QWEN_MODEL` | `.env.example`; `server/stage5p/env.js`; `scripts/palmmi-stage5c-runner.js`; tests | 否 | 否 | real 测试时需要 | real 环境需要 |
| `QWEN_MODEL` | `.env.example`; `server/stage5p/env.js`; tests | 否 | 否 | 可选 fallback | 可选 fallback |
| `PALMMI_QWEN_ENDPOINT` | `server/stage5p/env.js` | 否，但不应给前端 | 否 | 可选，默认 DashScope endpoint | 可选 |
| `QWEN_ENDPOINT` | `server/stage5p/env.js` | 否，但不应给前端 | 否 | 可选 fallback | 可选 fallback |
| `PALMMI_VLM_TIMEOUT_MS` | `.env.example`; `server/stage5p/env.js` | 否 | 否 | 是，建议先保守 | 是 |
| `VLM_TIMEOUT_MS` | `.env.example`; `server/stage5p/env.js` | 否 | 否 | 可选 fallback | 可选 fallback |
| `PALMMI_VLM_MAX_IMAGE_BYTES` | `.env.example`; `server/stage5p/env.js` | 否 | 否 | 是，建议 8388608 起步 | 是 |
| `VLM_MAX_IMAGE_BYTES` | `.env.example`; `server/stage5p/env.js` | 否 | 否 | 可选 fallback | 可选 fallback |
| `PALMMI_STAGE5Q_IMAGE_DIR` | `tests/stage5/stage5q-real-qwen-min-chain.test.cjs` | 否，本地路径 | 否 | 否，仅本地测试 | 否 |
| `PALMMI_DOUBAO_API_KEY` | `scripts/palmmi-stage5c-runner.js` | 是 | 否 | 否，非当前 Qwen 路线 | 否 |
| `PALMMI_GLM_API_KEY` | `scripts/palmmi-stage5c-runner.js` | 是 | 否 | 否，非当前 Qwen 路线 | 否 |
| `PALMMI_GEMINI_API_KEY` | `scripts/palmmi-stage5c-runner.js` | 是 | 否 | 否，非当前 Qwen 路线 | 否 |
| `PALMMI_OPENAI_API_KEY` | `scripts/palmmi-stage5c-runner.js` | 是 | 否 | 否，非当前 Qwen 路线 | 否 |

`NEXT_PUBLIC_` 风险扫描结论：

- 当前代码扫描未发现 `NEXT_PUBLIC_` 变量。
- 未发现敏感变量使用前端公开前缀。
- Qwen key 只应进入 Cloudflare Pages / Workers secret，不应写入代码、Markdown、浏览器存储或前端环境变量。

## 7. Preview / Production 环境策略

- Preview 环境先放非敏感变量：`PALMMI_VLM_PROVIDER=mock`、`PALMMI_VLM_MODE=mock-only`、`PALMMI_VLM_TIMEOUT_MS=60000`、`PALMMI_VLM_MAX_IMAGE_BYTES=8388608`。
- Preview 环境不默认开启真实 Qwen。
- Preview 小范围 real VLM 测试时才配置 `PALMMI_QWEN_API_KEY` secret，并把 `PALMMI_VLM_PROVIDER=qwen`、`PALMMI_VLM_MODE=real-only` 限定在受控预览分支或临时测试环境。
- Production 环境当前不公开，不绑定正式域名，不开启推广。
- Production 变量先不配置真实 Qwen，或配置后保持入口不可公开访问，直到限流和日志脱敏验收完成。
- 保留 mock 模式。`mock-only` 是测试回滚和维护模式的最低成本开关。
- 防止测试链接外泄导致 API 成本失控：真实 Qwen 开启前必须完成限流、每日额度、请求频率限制、测试链接访问控制或人工分发策略。
- 临时关闭 real VLM：将 `PALMMI_VLM_PROVIDER=mock` 且 `PALMMI_VLM_MODE=mock-only`，或关闭 `/api/analyze` real provider 分支。

推荐默认：

- Preview 先支持 mock。
- 再小范围开启 real VLM。
- Production 暂不公开。
- Stage 6 不做公开推广。
- 真实 Qwen 开启前必须完成限流和日志脱敏检查。

## 8. 图片缓存策略初判

- 是否保存原图：当前前端会把 `previewDataUrl` 存入 `sessionStorage` 的 `palmmi:lastUpload`；服务端响应不长期保存原图。
- 是否使用 base64：使用。`scripts/palmmi-upload.js` 使用 `FileReader.readAsDataURL()`；`scripts/palmmi-analyze-api-client.js` 会把 `previewDataUrl` 作为 `data_url` 发给 `/api/analyze`；Qwen Provider 会把图片 buffer 转回 data URL 发给 DashScope。
- 是否写入本地文件系统：线上主链路未发现写入；本地测试 runner 会使用 `fs` 读写本地样本和结果。
- 是否依赖临时目录：线上主链路未发现；本地 runner 依赖本地文件路径。
- 是否生成海报文件：当前不生成文件；只是海报页 DOM 渲染。
- 是否存在长期图片 URL：当前未发现长期图片 URL；浏览器 `URL.createObjectURL()` 只用于本地预览并会 revoke。
- 是否存在日志泄露图片内容风险：存在。base64 出现在请求 body 中，如果平台、调试或错误日志记录 request body，会泄露图片内容。

默认原则：

- 原图不长期保存。
- 最多短期缓存。
- base64 不进入日志。
- provider raw response 不直接暴露给用户。
- Stage 6 不做用户图库、不做历史报告、不做账号绑定。

## 9. 回滚策略初判

- 如果 Cloudflare Pages 部署失败：不切 production；保留本地静态版本；修复 Pages 配置或切到 Vercel 备选 dry run。
- 如果线上 Qwen 失败：把 Preview / Function 环境变量切回 `PALMMI_VLM_PROVIDER=mock`、`PALMMI_VLM_MODE=mock-only`，或让 `/api/analyze` 返回稳定维护/重试错误。
- 如果 API Key 泄露：立即在 Qwen / DashScope 控制台轮换 key；删除 Cloudflare secret 中旧值；检查 Pages / Workers 日志和 repo；重新部署。
- 如果测试链接被刷：关闭 real VLM 变量或下线 Preview；增加访问控制、限流和每日预算后再恢复。
- 如果上传异常：临时关闭上传入口或让分析页稳定返回重试状态；不要保留异常图片 payload。
- 如果 Cloudflare 不适合：保留静态 Pages 判断结果，切换到 Vercel 备选路线，使用 Vercel 环境变量和 serverless route 重新做 Stage 6C dry run。

## 10. Stage 6B / 6C 前置阻塞项

### 已完成的人工事项

- Cloudflare 账号已注册。

### 还需要用户配合的事项

- 如浏览器需要登录 Cloudflare，用户需要完成登录。
- 如需要连接 GitHub，用户需要授权。
- 如需要选择仓库，用户需要确认仓库名称。
- 真实 Qwen Key 不要粘贴到聊天，后续应在平台环境变量中配置。
- 准备 3–10 张测试图片。
- 准备 iPhone / 安卓微信测试设备。

### Codex 下一步可做的事项

- Stage 6B：环境变量与密钥管理。
- Stage 6C：Preview 部署 Dry Run。

Stage 6C 当前阻塞：

- Git remote 未配置，Cloudflare 尚不能从当前本地仓库直接确认 GitHub 仓库。
- 当前仓库尚无 commit。
- 当前没有 Cloudflare Pages Functions 入口或 `_worker.js`。
- 当前没有 Cloudflare / Wrangler 部署配置。
- 当前没有浏览器授权状态可供 Codex 直接确认 Cloudflare Pages 能看到仓库列表。

## 11. 最终结论

- 推荐部署平台：Cloudflare Pages，采用静态 Pages + Pages Functions / Worker API 的形态。
- 是否现在需要买域名：不需要。
- 是否现在需要备案：不需要。
- 是否现在需要绑定正式域名：不需要。
- 是否可以先用 `*.pages.dev`：可以，建议 Stage 6 Preview 先用默认域名。
- 是否可以进入 Stage 6B：可以。Stage 6B 应处理变量、secret、mock/real 开关、日志脱敏、限流和成本控制。
- 是否可以进入 Stage 6C：当前 BLOCKED。需要先确认 GitHub 仓库/remote，并补 Cloudflare Pages Functions / Worker 入口适配。
- 当前最大部署风险：当前 API 不是 Cloudflare Pages Functions 可直接运行的入口形态。
- 当前最大安全风险：真实 Qwen key 与 base64 图片 payload 的泄露风险，尤其是日志、前端变量和测试链接外泄。
- 下一步 Codex 子任务建议：Stage 6B：生产环境变量与密钥管理；随后 Stage 6C：Preview 部署 Dry Run。

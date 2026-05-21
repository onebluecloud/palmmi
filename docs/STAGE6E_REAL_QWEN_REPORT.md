# Stage 6E 公网真实 Qwen 链路验证报告

## 1. 本次修改文件列表

| 文件 | 类型 | 修改原因 |
|---|---|---|
| `server/stage5p/errors.js` | 最小源码修复 | 支持脱敏 Qwen upstream 诊断 |
| `server/stage5p/analyze-service.js` | 最小源码修复 | 透传脱敏诊断到稳定错误响应 |
| `server/stage5p/providers/qwen-vlm-provider.js` | 最小源码修复 | 修复 Cloudflare runtime 下 fetch 绑定问题 |
| `scripts/build-cloudflare-pages.cjs` | 部署配置 | 补齐结果页 / 海报页浏览器端 Stage 5 读取模块 |
| `docs/STAGE6E_QWEN_REQUEST_FIX_REPORT.md` | 文档 | 记录 Stage 6E-Fix |
| `docs/STAGE6E_REAL_QWEN_REPORT.md` | 文档 | 更新 Stage 6E 最终验证结果 |
| `docs/STAGE6_STATE.md` | 文档 | 更新 Stage 6 状态 |

## 2. 当前线上部署链接

- Pages：`https://palmmi.pages.dev`
- workers.dev：`https://palmmi.onebluecloud723.workers.dev`
- 最新修复部署：`https://932aab1a.palmmi.pages.dev`
- Cloudflare deployment id：`932aab1a-27c0-43e6-9f89-3dc95774fced`
- 最新修复提交：`7a85e34`
- 正式域名：未绑定
- DNS：未修改
- 用途：Stage 6 内测，不公开传播

## 3. 项目实际读取的环境变量

| 类别 | 变量名 | 来源文件 | 说明 |
|---|---|---|---|
| provider | `PALMMI_VLM_PROVIDER` / `VLM_PROVIDER` | `server/stage5p/env.js` | 控制 mock / qwen provider |
| mode | `PALMMI_VLM_MODE` / `VLM_MODE` | `server/stage5p/env.js` | real 模式归一化为真实 provider |
| Qwen Key | `PALMMI_QWEN_API_KEY` / `QWEN_API_KEY` | `server/stage5p/env.js` | 真实 Qwen 调用密钥 |
| Qwen model | `PALMMI_QWEN_MODEL` / `QWEN_MODEL` | `server/stage5p/env.js` | 未配置时使用 `qwen3-vl-flash` |
| Qwen endpoint | `PALMMI_QWEN_ENDPOINT` / `QWEN_ENDPOINT` | `server/stage5p/env.js` | 未配置时使用 DashScope compatible endpoint |
| timeout | `PALMMI_VLM_TIMEOUT_MS` / `VLM_TIMEOUT_MS` | `server/stage5p/env.js` | 未配置时使用默认超时 |
| upload limit | `PALMMI_VLM_MAX_IMAGE_BYTES` / `VLM_MAX_IMAGE_BYTES` | `server/stage5p/env.js` | 未配置时使用 8MB |

未发现前端读取 Qwen Key。

## 4. 本机环境变量检查结果

本轮不输出任何本机 Secret 值。上一轮本地 Node Stage 5Q 已确认 real Qwen 链路可用。

## 5. Cloudflare Pages Secret / 环境变量配置结果

| 变量名 | Production 状态 |
|---|---|
| `PALMMI_QWEN_API_KEY` | 已配置，Secret |
| `PALMMI_VLM_PROVIDER` | 已配置 |
| `PALMMI_VLM_MODE` | 已配置 |
| `PALMMI_QWEN_MODEL` | 未配置，使用代码默认值 |
| `PALMMI_QWEN_ENDPOINT` | 未配置，使用代码默认值 |

只记录变量名和状态，不记录值。

## 6. 是否重新部署

PASS。

已部署最新修复提交 `7a85e34`，Cloudflare deployment `932aab1a-27c0-43e6-9f89-3dc95774fced` 全阶段 success。

## 7. 当前 provider 状态

PASS。

公网 API 已从 mock 切换为 real / qwen。正常掌纹图返回 `provider: qwen`。

## 8. 测试图片类型与测试结果

| 图片类型 | 结果 | 说明 |
|---|---|---|
| 正常掌纹图 | PASS | 公网真实 Qwen 返回 200 |
| 左手图 | PASS | `dayi-left.jpg` 返回 provider `qwen` |
| 右手图 | PASS | `grand-right.jpg` 返回 provider `qwen` |
| 偏暗图 | BLOCKED | 仓库 fixture 未明确标注偏暗样本 |
| 模糊图 | BLOCKED | 仓库 fixture 未明确标注模糊样本 |
| 裁切不完整图 | BLOCKED | 仓库 fixture 未明确标注裁切不完整样本 |
| 明显无效图片 | PASS | 返回可控脱敏错误 JSON，不白屏 |
| 超大图片 | PASS | 返回 `FILE_TOO_LARGE` |
| 错误格式文件 | PASS | 返回 `FILE_TYPE_UNSUPPORTED` |

## 9. upload -> analyze -> Qwen -> result 链路结果

PASS。

公网真实 Qwen API 已跑通；浏览器上传页调用 `/api/analyze` 后返回 `provider: qwen`，并将分析结果写入 sessionStorage。结果页可读取真实分析结果并展示。

## 10. upload -> analyze -> Qwen -> result -> poster 链路结果

PASS。

`/result/` 与 `/poster/` 均可读取公网真实 Qwen 分析结果，进入 `partial-result` 可展示状态。`partial-result` 是低置信度图片的可展示状态，不是白屏或崩溃。

## 11. 异常图片测试结果

| 异常类型 | 结果 | 说明 |
|---|---|---|
| 明显无效图片 | PASS | 返回 `VLM_API_REQUEST_FAILED`，不白屏，不泄露 raw response |
| 超大图片 | PASS | 返回 `FILE_TOO_LARGE` |
| 错误格式文件 | PASS | 返回 `FILE_TYPE_UNSUPPORTED` |
| Qwen 请求失败 | PASS | 返回稳定脱敏错误 JSON |
| Qwen 解析失败 | PASS | Stage 5 边界测试覆盖 |

## 12. Qwen 超时 / 异常 / 解析失败处理

- Qwen 异常：PASS，稳定脱敏错误 JSON。
- Qwen 解析失败：PASS，本地边界测试覆盖。
- Qwen 超时：代码路径有 `AbortController` 和 `VLM_API_TIMEOUT` 映射；本轮未制造真实公网超时。

## 13. 安全检查结果

| 安全项 | 结果 | 说明 |
|---|---|---|
| API 返回不包含 Key / Token | PASS | 公网 API 扫描未发现 |
| API 返回不包含 base64 | PASS | 公网 API 扫描未发现 |
| API 返回不包含 provider raw response | PASS | 公网 API 扫描未发现 |
| 构建日志不包含 Key / Token | PASS | Cloudflare logs 扫描未发现 |
| 构建日志不包含 base64 | PASS | Cloudflare logs 扫描未发现 |
| 构建日志不包含 raw response | PASS | Cloudflare logs 扫描未发现 |
| 前端 bundle 不包含 Qwen Key | PASS | `dist` 扫描未发现 |
| 不新增长期图片存储 | PASS | 未新增 KV / R2 / D1 / Durable Object |
| 不新增用户身份信息采集 | PASS | 未新增 |

## 14. 是否存在 Key / Token 泄露

PASS，未发现。

## 15. 是否存在 base64 泄露

PASS，API 返回和构建日志未发现 base64 泄露。

## 16. 是否存在 provider raw response 泄露

PASS，API 返回和构建日志未发现 raw response 泄露。

## 17. 是否修改 Stage 3 / 4 / 5 冻结内容

- Stage 3：未修改规则、权重、阈值、36 型人格数据。
- Stage 4：未重做 UI 主风格。
- Stage 5：只做 Cloudflare runtime fetch 兼容和部署产物补齐，未重写 VLM Provider 主逻辑、parser 或规则引擎。

## 18. 性能与成本观察

- 公网真实 Qwen 正常图可跑通，单次测试约十几秒量级。
- 当前仍是内测链接，不应公开传播。
- 后续 Stage 6F 应继续处理成本控制、限流、监控或更严格的测试策略。

## 19. 当前阻塞项

Stage 6E 当前无阻塞项。

## 20. 是否可以进入 Stage 6F

PASS。

只表示 Stage 6E 技术门槛满足；本轮不执行 Stage 6F。

## 21. Codex 自检验收结果

| 验收项 | 结果 | 证据 / 说明 |
|---|---|---|
| 是否确认项目真实读取的 Qwen Key 变量名 | PASS | `PALMMI_QWEN_API_KEY` / `QWEN_API_KEY` |
| 是否确认 Cloudflare Pages 已配置真实 Qwen Key Secret | PASS | Production 已配置 Secret |
| 是否确认 Cloudflare Pages 能读取真实 Qwen Key | PASS | 已进入 qwen real 路径并请求成功 |
| 是否确认线上 provider 已从 mock 切换到 real / qwen | PASS | 公网 API 返回 `provider: qwen` |
| 是否确认正常图片真实 Qwen 链路可跑通 | PASS | HTTP 200，返回结构化结果 |
| 是否确认左手图片可跑通 | PASS | `dayi-left.jpg` |
| 是否确认右手图片可跑通 | PASS | `grand-right.jpg` |
| 是否确认偏暗图片有合理结果或合理错误 | BLOCKED | 无明确 fixture |
| 是否确认模糊图片有合理结果或合理错误 | BLOCKED | 无明确 fixture |
| 是否确认裁切不完整图片有合理结果或合理错误 | BLOCKED | 无明确 fixture |
| 是否确认无效图片不会白屏 | PASS | 脱敏错误 JSON |
| 是否确认超大图片被拒绝 | PASS | `FILE_TOO_LARGE` |
| 是否确认错误格式被拒绝 | PASS | `FILE_TYPE_UNSUPPORTED` |
| 是否确认结果页正常展示 | PASS | `partial-result` 可展示 |
| 是否确认海报页正常展示 | PASS | `partial-result` 可展示 |
| 是否确认 Qwen 异常不白屏 | PASS | 稳定脱敏错误 |
| 是否确认 Qwen 解析失败不白屏 | PASS | 边界测试覆盖 |
| 是否确认 API 返回不暴露 Key / Token | PASS | 扫描未发现 |
| 是否确认 API 返回不暴露 base64 | PASS | 扫描未发现 |
| 是否确认 API 返回不暴露 provider raw response 全量 | PASS | 扫描未发现 |
| 是否确认构建日志不暴露 Key / Token | PASS | Cloudflare logs 未发现 |
| 是否确认运行日志不暴露 Key / Token | PASS | 代码路径无运行时敏感 console；API 无泄露 |
| 是否确认运行日志不暴露 base64 | PASS | 代码路径无运行时 base64 console；API 无泄露 |
| 是否确认运行日志不暴露 raw response | PASS | 代码路径无 raw response console；API 无泄露 |
| 是否确认没有新增长期图片存储 | PASS | 未新增 |
| 是否确认没有新增支付 / 打赏 / 登录 / 宣发功能 | PASS | 未新增 |
| 是否确认没有修改 Stage 3 人格规则、权重、阈值 | PASS | 未修改 |
| 是否确认没有重做 Stage 4 UI 主风格 | PASS | 未修改 |
| 是否确认没有重写 Stage 5 VLM 主逻辑 | PASS | 仅 runtime 兼容和部署产物修复 |
| 是否可以进入 Stage 6F | PASS | 本轮不执行 6F |

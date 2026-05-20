# Stage 6E 公网真实 Qwen 链路验证报告

## 1. 本次修改文件列表

| 文件 | 类型 | 修改原因 | 是否影响 Stage 3 / 4 / 5 冻结成果 |
|---|---|---|---|
| `functions/api/analyze.js` | Pages Function | 将 Stage 6C mock-only 入口改为调用现有 `api/analyze.js` / Stage 5P 分析服务 | 不修改 Stage 3/4；不重写 Stage 5 真实 VLM 主逻辑 |
| `server/stage5p/providers/qwen-response-parser.js` | 服务端兼容模块 | 抽出 edge-safe Qwen 响应解析函数，避免 Pages Functions 间接加载本地文件系统脚本 | 不改变解析语义 |
| `server/stage5p/providers/qwen-vlm-provider.js` | 服务端 provider | 改为读取 edge-safe parser | 不重写真实 Qwen 调用逻辑 |
| `server/stage5p/providers/mock-vlm-provider.js` | 服务端 mock provider | 去除对本地文件系统脚本的运行时依赖，保持 mock 回归可用 | 不影响真实 Qwen 主逻辑 |
| `server/stage5p/analyze-service.js` | 服务端分析服务 | 将 `__dirname` 路径加载改成相对 `require`，适配 Pages Functions 打包运行 | 不改业务决策逻辑 |
| `src/stage5/palm-feature-set-to-rule-input.js` | Stage 5 bridge | 将 `__dirname` 路径加载改成相对 `require` | 不改规则映射逻辑 |
| `src/stage5/palmmi-analysis-bridge.js` | Stage 5 bridge | 将 `__dirname` 路径加载改成相对 `require` | 不改分析桥接逻辑 |
| `src/stage5/palmmi-recognition-pipeline.js` | Stage 5 pipeline | 将 `__dirname` 路径加载改成相对 `require` | 不改识别 pipeline 逻辑 |
| `docs/STAGE6E_REAL_QWEN_REPORT.md` | 文档 | 记录 Stage 6E 检查、测试和阻塞状态 | 不影响运行 |
| `docs/STAGE6_STATE.md` | 文档 | 更新 Stage 6E 当前状态 | 不影响运行 |

## 2. 当前线上部署链接

- Pages：`https://palmmi.pages.dev`
- workers.dev：`https://palmmi.onebluecloud723.workers.dev`
- 当前用途：Stage 6 内测，不公开传播
- 正式域名：未绑定
- DNS：未修改

## 3. 项目实际读取的环境变量

| 类别 | 变量名 | 来源文件 | 说明 |
|---|---|---|---|
| provider | `PALMMI_VLM_PROVIDER` / `VLM_PROVIDER` | `server/stage5p/env.js`、`functions/api/analyze.js` | 控制 mock / qwen provider |
| mode | `PALMMI_VLM_MODE` / `VLM_MODE` | `server/stage5p/env.js`、`functions/api/analyze.js` | 控制 mock-only / real-only / fallback |
| Qwen Key | `PALMMI_QWEN_API_KEY` / `QWEN_API_KEY` | `server/stage5p/env.js`、`server/stage5p/providers/qwen-vlm-provider.js` | 真实 Qwen 调用密钥 |
| Qwen model | `PALMMI_QWEN_MODEL` / `QWEN_MODEL` | `server/stage5p/env.js` | 模型名 |
| Qwen endpoint | `PALMMI_QWEN_ENDPOINT` / `QWEN_ENDPOINT` | `server/stage5p/env.js` | Qwen compatible-mode endpoint |
| timeout | `PALMMI_VLM_TIMEOUT_MS` / `VLM_TIMEOUT_MS` | `server/stage5p/env.js` | VLM 请求超时 |
| upload limit | `PALMMI_VLM_MAX_IMAGE_BYTES` / `VLM_MAX_IMAGE_BYTES` | `server/stage5p/env.js`、`functions/api/analyze.js` | 图片大小限制 |

未发现 `import.meta.env` 读取。前端 bundle 不读取 Qwen Key。

## 4. 本机环境变量检查结果

只记录是否存在，不记录值。

| 变量名 | 本机是否存在 |
|---|---|
| `PALMMI_QWEN_API_KEY` | 是 |
| `QWEN_API_KEY` | 否 |
| `DASHSCOPE_API_KEY` | 是 |
| `BAILIAN_API_KEY` | 否 |
| `ALIBABA_CLOUD_API_KEY` | 否 |
| `PALMMI_QWEN_MODEL` | 是 |
| `QWEN_MODEL` | 否 |
| `PALMMI_QWEN_ENDPOINT` | 否 |
| `QWEN_ENDPOINT` | 否 |
| `PALMMI_VLM_PROVIDER` | 否 |
| `VLM_PROVIDER` | 否 |
| `PALMMI_VLM_MODE` | 否 |
| `VLM_MODE` | 否 |

## 5. Cloudflare Pages Secret / 环境变量配置结果

只记录变量名和状态，不记录值。

| 变量名 | Production 当前状态 | Preview 当前状态 | 说明 |
|---|---|---|---|
| `PALMMI_QWEN_API_KEY` | 未配置 | 未配置 | BLOCKED：无法在当前环境安全地把本机 Key 写入 Cloudflare Secret |
| `PALMMI_VLM_PROVIDER` | 未配置 | 已配置 | Production 未切 real，避免无 Key 时线上变 503 |
| `PALMMI_VLM_MODE` | 未配置 | 已配置 | Production 未切 real |
| `PALMMI_QWEN_MODEL` | 未配置 | 未配置 | 可使用代码默认值或后续手动配置 |
| `PALMMI_QWEN_ENDPOINT` | 未配置 | 未配置 | 可使用代码默认值或后续手动配置 |
| `PALMMI_VLM_TIMEOUT_MS` | 未配置 | 未配置 | 可使用代码默认值 |
| `PALMMI_VLM_MAX_IMAGE_BYTES` | 未配置 | 未配置 | 可使用代码默认值 |

Cloudflare MCP / API 插件可以查询 Pages 项目配置，但不能安全读取本机环境变量中的 Qwen Key。
本地 Wrangler 状态为未登录，且本机没有可用 Cloudflare API Token 环境变量。为避免密钥明文进入聊天、日志或文件，本轮未自动写入 Cloudflare Secret。

用户后续需要在 Cloudflare Dashboard 手动配置：

| 变量名 | 类型 | 环境 |
|---|---|---|
| `PALMMI_QWEN_API_KEY` | Secret / encrypted | Production |
| `PALMMI_VLM_PROVIDER` | Plain text | Production |
| `PALMMI_VLM_MODE` | Plain text | Production |
| `PALMMI_QWEN_MODEL` | Plain text，可选 | Production |
| `PALMMI_QWEN_ENDPOINT` | Plain text，可选 | Production |

## 6. 是否重新部署

- 已重新部署。
- Git commit：`e4f46a2`
- Cloudflare deployment id：`c6fc5632-f167-489b-a44b-814f4cd0a744`
- Cloudflare deployment URL：`https://c6fc5632.palmmi.pages.dev`
- 部署状态：PASS，`deploy` stage success。
- 本轮未完成真实 Secret 配置，因此公网真实 Qwen 部署验证仍为 BLOCKED。
- 当前 Production 仍默认 mock，直到 Production 环境变量被手动配置。

## 7. 当前 provider 状态

| 环境 | provider 状态 |
|---|---|
| 本地 Node Stage 5Q | real / qwen 可用 |
| 本地 Pages Functions | mock 可用 |
| Cloudflare Production | 默认 mock；未切 real；线上 `/api/analyze` 返回 provider `mock` |
| Cloudflare Preview | 已有 Preview 变量，但本轮未使用真实 Key |

## 8. 测试图片类型与测试结果

本轮使用仓库已有 fixture：`PalmTag_rule_engine_v0/samples/palms`。
未使用用户真实隐私图片，未上传测试图片到仓库。

| 图片类型 | 结果 | 说明 |
|---|---|---|
| 正常掌纹图 | PASS | 本地 real Qwen 跑通 5 张 |
| 左手图 | PASS | 本地 real Qwen 跑通 |
| 右手图 | PASS | 本地 real Qwen 跑通 |
| 偏暗图 | BLOCKED | 仓库 fixture 未明确标注偏暗类型，未伪造 PASS |
| 模糊图 | BLOCKED | 仓库 fixture 未明确标注模糊类型，未伪造 PASS |
| 裁切不完整图 | BLOCKED | 仓库 fixture 未明确标注裁切不完整类型，未伪造 PASS |
| 明显无效图片 | PASS | synthetic blank PNG 返回可控错误 |
| 超大图片 | PASS | 已由 Stage 6D 和 API 边界验证 |
| 错误格式文件 | PASS | 返回 `FILE_TYPE_UNSUPPORTED` |

## 9. upload -> analyze -> Qwen -> result 链路结果

| 环境 | 结果 | 说明 |
|---|---|---|
| 本地 Node Stage 5Q | PASS | 5 张 fixture 完成 real Qwen -> 规则引擎 -> 结果 contract |
| Cloudflare Pages Production | BLOCKED | 缺少 Production `PALMMI_QWEN_API_KEY` Secret |

## 10. upload -> analyze -> Qwen -> result -> poster 链路结果

| 环境 | 结果 | 说明 |
|---|---|---|
| 本地 Node Stage 5Q | PASS | real Qwen 分析结果 contract 可生成 |
| Cloudflare Pages Production | BLOCKED | 缺少 Production Secret，无法做公网 real Qwen 验证 |

结果页和海报页静态页面在 Stage 6C/6D 已验证可访问；本轮未在公网 real 结果上完成端到端展示。

## 11. 异常图片测试结果

| 异常类型 | 结果 | 说明 |
|---|---|---|
| Qwen Key 缺失 | PASS | 本地 guard 返回 `VLM_API_KEY_MISSING`，不发起 provider 请求 |
| 错误格式 | PASS | 返回 `FILE_TYPE_UNSUPPORTED` |
| 无效图片 | PASS | 返回可控错误，不白屏 |
| 超大图片 | PASS | Stage 6D 已验证返回 `FILE_TOO_LARGE` |

## 12. Qwen 超时 / 异常 / 解析失败处理

| 项目 | 结果 | 说明 |
|---|---|---|
| Qwen Key 缺失不白屏 | PASS | 返回稳定错误 JSON |
| Qwen 请求失败不白屏 | PASS | provider request failure 映射为稳定错误 |
| Qwen 解析失败不白屏 | PASS | provider invalid response 映射为稳定错误 |
| Qwen 超时不白屏 | BLOCKED | 本轮未对公网制造真实超时；代码路径已有 `AbortController` 超时映射 |

## 13. 安全检查结果

| 安全项 | 结果 | 说明 |
|---|---|---|
| API 返回不包含 Key / Token | PASS | 本地 real 和 mock 响应检查无泄露标记 |
| API 返回不包含 base64 | PASS | 本地 real 和 mock 响应检查无泄露标记 |
| API 返回不包含 provider raw response | PASS | provider response ref 脱敏 |
| 构建日志不包含 Key / Token | PASS | 本地构建和 Wrangler 编译未输出密钥 |
| 运行日志不包含 Key / Token | PASS | 未把真实 Key 注入本地 Pages dev，避免 Wrangler 打印 binding 值 |
| 不记录完整原图 URL | PASS | 当前链路不生成长期图片 URL |
| 不新增长期图片存储 | PASS | 未新增 KV / R2 / D1 / Durable Object / 外部对象存储 |
| 不新增用户身份信息采集 | PASS | 未新增账号或用户系统 |

## 14. 是否存在 Key / Token 泄露

未发现。
本轮没有把真实 Qwen Key / Cloudflare Token / GitHub Token 写入代码、文档、`.env`、`.dev.vars`、wrangler 配置、测试文件或 commit message。

## 15. 是否存在 base64 泄露

未发现。
API 返回和测试摘要未包含 base64；没有把测试图片 base64 写入文档。

## 16. 是否存在 provider raw response 泄露

未发现。
Qwen provider 返回 `response_ref`，不返回 provider raw response 全量。

## 17. 是否修改 Stage 3 / 4 / 5 冻结内容

- Stage 3 人格规则、权重、阈值、36 型人格数据：未修改。
- Stage 4 UI 主风格：未修改。
- Stage 5 真实 Qwen / VLM 主逻辑：未重写。
- Stage 5P 文件有 Cloudflare runtime 兼容修复：路径加载兼容、edge-safe parser 抽取、Pages Function 入口接入。

## 18. 性能与成本观察

本地 real Qwen 测试共完成 5 张掌纹 fixture，单次耗时约 7-11 秒。
公网 real Qwen 未执行，因此没有线上成本观察。正式 6E 继续前应限制测试样本数量，避免成本失控。

## 19. 当前阻塞项

Stage 6E 公网真实链路验证当前 BLOCKED：

1. Cloudflare Production 未配置 `PALMMI_QWEN_API_KEY` Secret。
2. 当前环境无法安全地将本机 Qwen Key 写入 Cloudflare Pages Secret：
   - Cloudflare MCP / API 插件不能读取本机环境变量；
   - 本地 Wrangler 未登录；
   - 本机没有 Cloudflare API Token 环境变量。
3. 因此不能验证公网 provider 从 mock 切到 real / qwen。

## 20. 是否可以进入 Stage 6F

BLOCKED。
必须先完成 Cloudflare Production Secret 手动配置，并重新执行公网 real Qwen 验证。

## 21. Codex 自检验收结果

| 验收项 | 结果 | 证据 / 说明 |
|---|---|---|
| 是否确认项目真实读取的 Qwen Key 变量名 | PASS | `PALMMI_QWEN_API_KEY` / `QWEN_API_KEY` |
| 是否确认本机存在可用 Qwen Key | PASS | 本机存在，未输出值 |
| 是否确认 Cloudflare Pages 已配置真实 Qwen Key Secret | BLOCKED | Production 未配置，无法安全自动写入 |
| 是否确认 Cloudflare Pages 能读取真实 Qwen Key | BLOCKED | Secret 未配置 |
| 是否确认线上 provider 已从 mock 切换到 real / qwen | BLOCKED | Secret 未配置，Production 未切 real |
| 是否确认正常图片真实 Qwen 链路可跑通 | PASS | 本地 real Qwen 5 张 fixture 跑通 |
| 是否确认左手图片可跑通 | PASS | 本地 real Qwen fixture 跑通 |
| 是否确认右手图片可跑通 | PASS | 本地 real Qwen fixture 跑通 |
| 是否确认偏暗图片有合理结果或合理错误 | BLOCKED | 缺少明确偏暗样本 |
| 是否确认模糊图片有合理结果或合理错误 | BLOCKED | 缺少明确模糊样本 |
| 是否确认裁切不完整图片有合理结果或合理错误 | BLOCKED | 缺少明确裁切样本 |
| 是否确认无效图片不会白屏 | PASS | synthetic blank PNG 返回可控错误 |
| 是否确认超大图片被拒绝 | PASS | Stage 6D 已验证 |
| 是否确认错误格式被拒绝 | PASS | 返回 `FILE_TYPE_UNSUPPORTED` |
| 是否确认结果页正常展示 | BLOCKED | 公网 real 结果未生成 |
| 是否确认海报页正常展示 | BLOCKED | 公网 real 结果未生成 |
| 是否确认 Qwen 超时不白屏 | BLOCKED | 未执行公网超时注入 |
| 是否确认 Qwen 异常不白屏 | PASS | 本地异常路径返回稳定错误 |
| 是否确认 Qwen 解析失败不白屏 | PASS | 代码路径和边界测试覆盖 |
| 是否确认 API 返回不暴露 Key / Token | PASS | 本地测试无泄露标记 |
| 是否确认 API 返回不暴露 base64 | PASS | 本地测试无泄露标记 |
| 是否确认 API 返回不暴露 provider raw response 全量 | PASS | 本地测试无泄露标记 |
| 是否确认构建日志不暴露 Key / Token | PASS | 本地构建未输出密钥 |
| 是否确认运行日志不暴露 Key / Token | PASS | 未将真实 Key 注入会打印 binding 的本地 Pages dev |
| 是否确认运行日志不暴露 base64 | PASS | 未发现 |
| 是否确认运行日志不暴露 raw response | PASS | 未发现 |
| 是否确认没有新增长期图片存储 | PASS | 未新增 |
| 是否确认没有新增支付 / 打赏 / 登录 / 宣发功能 | PASS | 未新增 |
| 是否确认没有修改 Stage 3 人格规则、权重、阈值 | PASS | 未修改 |
| 是否确认没有重做 Stage 4 UI 主风格 | PASS | 未修改 |
| 是否确认没有重写 Stage 5 VLM 主逻辑 | PASS | 仅做 serverless 兼容和入口适配 |
| 是否可以进入 Stage 6F | BLOCKED | 公网 real Qwen 链路未完成 |

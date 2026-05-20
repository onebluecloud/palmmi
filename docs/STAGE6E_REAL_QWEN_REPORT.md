# Stage 6E 公网真实 Qwen 链路验证报告

## 1. 本次修改文件列表

| 文件 | 类型 | 修改原因 |
|---|---|---|
| `docs/STAGE6E_REAL_QWEN_REPORT.md` | 文档 | 记录 Stage 6E 重跑结果 |
| `docs/STAGE6_STATE.md` | 文档 | 更新 Stage 6E 当前状态 |

本轮未修改源码。

## 2. 当前线上部署链接

- Pages：`https://palmmi.pages.dev`
- workers.dev：`https://palmmi.onebluecloud723.workers.dev`
- Stage 6E 变量配置后 redeploy：`https://a67e8a48.palmmi.pages.dev`
- redeploy id：`a67e8a48-50ac-4e94-9a56-8da13fbf5b73`
- redeploy 状态：PASS，`deploy` stage success
- 当前用途：Stage 6 内测，不公开传播
- 正式域名：未绑定
- DNS：未修改

## 3. 项目实际读取的环境变量

| 类别 | 变量名 | 来源文件 | 说明 |
|---|---|---|---|
| provider | `PALMMI_VLM_PROVIDER` / `VLM_PROVIDER` | `server/stage5p/env.js` | 控制 mock / qwen provider |
| mode | `PALMMI_VLM_MODE` / `VLM_MODE` | `server/stage5p/env.js` | `real` 会按 qwen provider 归一化为 real-only |
| Qwen Key | `PALMMI_QWEN_API_KEY` / `QWEN_API_KEY` | `server/stage5p/env.js`、`server/stage5p/providers/qwen-vlm-provider.js` | 真实 Qwen 调用密钥 |
| Qwen model | `PALMMI_QWEN_MODEL` / `QWEN_MODEL` | `server/stage5p/env.js` | 未配置时使用代码默认值 |
| Qwen endpoint | `PALMMI_QWEN_ENDPOINT` / `QWEN_ENDPOINT` | `server/stage5p/env.js` | 未配置时使用代码默认值 |
| timeout | `PALMMI_VLM_TIMEOUT_MS` / `VLM_TIMEOUT_MS` | `server/stage5p/env.js` | 未配置时使用代码默认值 |
| upload limit | `PALMMI_VLM_MAX_IMAGE_BYTES` / `VLM_MAX_IMAGE_BYTES` | `server/stage5p/env.js` | 未配置时使用 8MB 默认值 |

未发现前端读取 Qwen Key。

## 4. Cloudflare Production 环境变量检查结果

只记录变量名和状态，不记录值。

| 变量名 | Production 是否存在 | 类型 |
|---|---|---|
| `PALMMI_QWEN_API_KEY` | PASS | `secret_text` |
| `PALMMI_VLM_PROVIDER` | PASS | `secret_text` |
| `PALMMI_VLM_MODE` | PASS | `secret_text` |
| `PALMMI_QWEN_MODEL` | 未配置 | 使用代码默认值 |
| `PALMMI_QWEN_ENDPOINT` | 未配置 | 使用代码默认值 |
| `PALMMI_VLM_TIMEOUT_MS` | 未配置 | 使用代码默认值 |
| `PALMMI_VLM_MAX_IMAGE_BYTES` | 未配置 | 使用代码默认值 |

变量配置后已触发 Production redeploy：`a67e8a48-50ac-4e94-9a56-8da13fbf5b73`，部署成功。

## 5. 当前 provider 状态

| 环境 | provider 状态 |
|---|---|
| 本地 Node Stage 5Q | PASS，real / qwen 可用 |
| Cloudflare Production | PASS，已离开 mock 路径并进入 real Qwen 请求路径 |
| Cloudflare Production API 返回 | FAIL，正常掌纹图返回 `VLM_API_REQUEST_FAILED` |

说明：如果线上没有读取到 Key，会返回 `VLM_API_KEY_MISSING`。本轮线上返回 `VLM_API_REQUEST_FAILED`，说明 Production 已进入 Qwen 请求路径，但 Qwen 远端请求未成功。

## 6. 测试图片类型与测试结果

本轮使用仓库已有 fixture：`PalmTag_rule_engine_v0/samples/palms`。未使用用户真实隐私图片，未上传测试图片到仓库。

| 图片类型 | 结果 | 说明 |
|---|---|---|
| 正常掌纹图 | FAIL | 公网返回 `VLM_API_REQUEST_FAILED` |
| 左手图 | FAIL | 公网返回 `VLM_API_REQUEST_FAILED` |
| 右手图 | FAIL | 公网返回 `VLM_API_REQUEST_FAILED` |
| 偏暗图 | BLOCKED | 仓库 fixture 未明确标注偏暗样本 |
| 模糊图 | BLOCKED | 仓库 fixture 未明确标注模糊样本 |
| 裁切不完整图 | BLOCKED | 仓库 fixture 未明确标注裁切不完整样本 |
| 明显无效图片 | PASS | 返回可控错误 JSON，不白屏 |
| 超大图片 | PASS | 返回 `FILE_TOO_LARGE` |
| 错误格式文件 | PASS | 返回 `FILE_TYPE_UNSUPPORTED` |

## 7. upload -> analyze -> Qwen -> result 链路结果

| 环境 | 结果 | 说明 |
|---|---|---|
| 本地 Node Stage 5Q | PASS | 5 张 fixture 完成 real Qwen -> 规则引擎 -> 结果 contract |
| Cloudflare Pages Production | FAIL | 已进入 real Qwen 请求路径，但返回 `VLM_API_REQUEST_FAILED` |
| workers.dev 兼容入口 | FAIL | 同样返回 `VLM_API_REQUEST_FAILED` |

## 8. upload -> analyze -> Qwen -> result -> poster 链路结果

| 项目 | 结果 | 说明 |
|---|---|---|
| 结果页静态访问 | PASS | `/result/` 返回 200 |
| 海报页静态访问 | PASS | `/poster/` 返回 200 |
| 公网 real 结果展示 | BLOCKED | 正常掌纹 API 未生成成功 real 结果 |
| 公网 real 海报展示 | BLOCKED | 正常掌纹 API 未生成成功 real 结果 |

## 9. 异常图片测试结果

| 异常类型 | 结果 | 说明 |
|---|---|---|
| 明显无效图片 | PASS | 返回 `VLM_API_REQUEST_FAILED`，不白屏，不泄露 raw response |
| 超大图片 | PASS | 返回 `FILE_TOO_LARGE` |
| 错误格式文件 | PASS | 返回 `FILE_TYPE_UNSUPPORTED` |
| Qwen 请求失败 | PASS | 返回稳定脱敏错误 JSON |
| Qwen 解析失败 | PASS | 本地边界测试覆盖，返回稳定脱敏错误 |
| Qwen 超时 | BLOCKED | 未对公网制造真实超时；代码路径已有超时映射 |

## 10. 安全检查结果

| 安全项 | 结果 | 说明 |
|---|---|---|
| API 返回不包含 Key / Token | PASS | 公网 API 返回检查未发现 |
| API 返回不包含 base64 | PASS | 公网 API 返回检查未发现 |
| API 返回不包含 provider raw response | PASS | 公网 API 返回检查未发现 |
| 构建日志不包含 Key / Token | PASS | Cloudflare deployment logs 检查未发现 |
| 构建日志不包含 base64 | PASS | Cloudflare deployment logs 检查未发现 |
| 构建日志不包含 raw response | PASS | Cloudflare deployment logs 检查未发现 |
| 前端 bundle 不包含 Qwen Key | PASS | `dist` 扫描未发现 |
| 不新增长期图片存储 | PASS | KV / R2 / D1 / Durable Object 均未新增 |
| 不新增用户身份信息采集 | PASS | 未新增账号或身份采集 |

运行日志的完整 tail 未在当前环境获取到；通过 API 返回和构建日志未发现泄露。

## 11. 冻结回归检查

| 项目 | 结果 | 说明 |
|---|---|---|
| Stage 3 人格规则、权重、阈值 | PASS | 本轮未修改 |
| 36 型人格数据 | PASS | 本轮未修改 |
| Stage 4 UI 主风格 | PASS | 本轮未修改 |
| Stage 5 主逻辑 | PASS | 上一轮只做 Cloudflare runtime 兼容和入口适配，本轮未改源码 |
| Qwen / VLM 主逻辑 | PASS | 本轮未重写 |
| `npm run build` | PASS | 构建成功 |
| `node tests/stage5/stage5p-provider-boundary.test.cjs` | PASS | 通过 |
| `node tests/stage4/analyze-flow.test.cjs` | PASS | 通过 |
| `node tests/stage5/stage5q-real-qwen-min-chain.test.cjs` | PASS | 本地 real Qwen 5 张 fixture 跑通，无泄露标记 |

## 12. 性能与成本观察

- 本地 real Qwen：5 张 fixture 跑通，单次约 7-10 秒。
- 公网 Cloudflare real Qwen：未成功，正常图片返回 `VLM_API_REQUEST_FAILED`。
- 成本风险：公网 real 请求已触发，但均未完成成功链路；继续测试前应先定位 Qwen 请求失败原因。

## 13. 当前阻塞项

Stage 6E 当前 FAIL / BLOCKED：

1. Cloudflare Production 已读取到 real 配置并进入 Qwen 请求路径。
2. 正常掌纹图公网 API 返回 `VLM_API_REQUEST_FAILED`。
3. 因正常图没有成功生成 real 结果，无法完成公网 `result` 和 `poster` 的 real 展示验收。
4. 当前错误是脱敏错误，未暴露 provider raw response；下一轮需要在不泄露 Key / raw response 的前提下定位 Qwen 请求失败原因，可能方向包括 Secret 值、Qwen 权限 / 模型权限、Cloudflare 到 Qwen endpoint 的请求失败。

## 14. 是否可以进入 Stage 6F

FAIL。
不能进入 Stage 6F。需要先做 Stage 6E 修复轮，定位并修复公网 `VLM_API_REQUEST_FAILED`。

## 15. Codex 自检验收结果

| 验收项 | 结果 | 证据 / 说明 |
|---|---|---|
| Cloudflare Production 已配置 `PALMMI_QWEN_API_KEY` | PASS | 存在，类型 `secret_text` |
| Cloudflare Production 已配置 `PALMMI_VLM_PROVIDER` | PASS | 存在，类型 `secret_text` |
| Cloudflare Production 已配置 `PALMMI_VLM_MODE` | PASS | 存在，类型 `secret_text` |
| 变量配置后已重新部署 | PASS | redeploy `a67e8a48-50ac-4e94-9a56-8da13fbf5b73` 成功 |
| 线上 provider 已切换为 qwen / real | PASS | 已离开 mock，正常图返回 Qwen 请求失败错误 |
| 正常掌纹图公网真实 Qwen 链路跑通 | FAIL | 返回 `VLM_API_REQUEST_FAILED` |
| 结果页正常展示 | BLOCKED | 页面 200，但 real 结果未生成 |
| 海报页正常展示 | BLOCKED | 页面 200，但 real 结果未生成 |
| 无效图片不白屏 | PASS | 返回稳定错误 JSON |
| 超大图片被拒绝 | PASS | `FILE_TOO_LARGE` |
| 错误格式被拒绝 | PASS | `FILE_TYPE_UNSUPPORTED` |
| Qwen 异常不白屏 | PASS | `VLM_API_REQUEST_FAILED` 脱敏返回 |
| Qwen 解析失败不白屏 | PASS | 本地边界测试覆盖 |
| API 不暴露 Key / Token | PASS | 检查未发现 |
| API 不暴露 base64 | PASS | 检查未发现 |
| API 不暴露 raw response | PASS | 检查未发现 |
| 日志不暴露 Key / Token | PASS | 构建日志检查未发现 |
| 日志不暴露 base64 | PASS | 构建日志检查未发现 |
| 日志不暴露 raw response | PASS | 构建日志检查未发现 |
| 没有新增长期图片存储 | PASS | 未新增 KV / R2 / D1 / Durable Object |
| 没有新增支付 / 打赏 / 登录 / 宣发 | PASS | 未新增 |
| 没有修改 Stage 3 规则 / 权重 / 阈值 | PASS | 未修改 |
| 没有重做 Stage 4 UI | PASS | 未修改 |
| 没有重写 Stage 5 VLM 主逻辑 | PASS | 本轮未改源码 |
| 是否可以进入 Stage 6F | FAIL | 公网真实 Qwen 正常图未跑通 |

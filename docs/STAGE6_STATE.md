# Palmmi Stage 6 状态记录

## 当前阶段

Stage 6E：公网真实 Qwen 链路验证重跑

## Stage 6E 是否完成

未完成，当前状态：FAIL / BLOCKED。
Cloudflare Production 已配置关键变量并重新部署，线上已进入 real Qwen 请求路径，但正常掌纹图返回 `VLM_API_REQUEST_FAILED`，公网真实链路未跑通。

## 已完成

- Stage 1–5 已完成 / 冻结。
- Stage 6A：部署方案确认已完成。
- Stage 6B：环境变量与密钥管理已完成。
- Stage 6C：Cloudflare Pages Preview / Dry Run 已完成。
- Stage 6D：图片上传与临时缓存策略已完成。
- Stage 6E 前置：
  - `PALMMI_QWEN_API_KEY` Production Secret 已存在。
  - `PALMMI_VLM_PROVIDER` Production 变量已存在。
  - `PALMMI_VLM_MODE` Production 变量已存在。
  - 已触发 Production redeploy：`a67e8a48-50ac-4e94-9a56-8da13fbf5b73`。
  - 本地 real Qwen 5 张 fixture 仍可跑通。

## 当前线上链接

- Pages：`https://palmmi.pages.dev`
- workers.dev：`https://palmmi.onebluecloud723.workers.dev`
- Stage 6E redeploy：`https://a67e8a48.palmmi.pages.dev`
- 链接用途：仅用于 Stage 6 内测，不公开传播

## 当前 Cloudflare 环境变量状态

| 变量名 | Production |
|---|---|
| `PALMMI_QWEN_API_KEY` | 已配置，Secret |
| `PALMMI_VLM_PROVIDER` | 已配置 |
| `PALMMI_VLM_MODE` | 已配置 |
| `PALMMI_QWEN_MODEL` | 未配置，使用默认值 |
| `PALMMI_QWEN_ENDPOINT` | 未配置，使用默认值 |
| `PALMMI_VLM_TIMEOUT_MS` | 未配置，使用默认值 |
| `PALMMI_VLM_MAX_IMAGE_BYTES` | 未配置，使用默认值 |

## 当前 provider 状态

- 本地 Node：real / qwen 可用。
- Cloudflare Production：已离开 mock 路径，进入 real Qwen 请求路径。
- Cloudflare Production 正常掌纹图：FAIL，返回 `VLM_API_REQUEST_FAILED`。

## 当前禁止修改

- Stage 3 人格规则。
- Stage 3 权重阈值。
- 36 型人格数据。
- Stage 4 UI 主风格。
- Stage 5 真实 Qwen / VLM 主逻辑。
- 支付 / 打赏。
- 登录系统。
- 宣发功能。
- 正式域名绑定。
- Cloudflare DNS。
- 真实 Key 明文文件。

## 当前人工待办

- 不要把 Qwen API Key、Cloudflare Token、GitHub Token 发到聊天。
- 不要公开分享 `*.pages.dev` 或 `*.workers.dev` 链接。
- 暂时不要买域名。
- 暂时不要绑定正式域名。
- 暂时不要修改 DNS。
- 暂时不要接支付 / 打赏 / 登录。

## 当前 Codex 待办

- Stage 6E 修复轮：定位公网 `VLM_API_REQUEST_FAILED`。
- 只允许做脱敏诊断，不输出 Key / Token / raw response。
- 可能需要检查 Secret 值是否粘贴正确、模型权限是否可用、Cloudflare 到 Qwen endpoint 的请求是否被拒绝。

## 当前风险

- 公网真实 Qwen 链路未跑通。
- 多次公网 real 请求可能产生成本。
- 真实 provider 错误被正确脱敏，但也降低了诊断信息，需要下一轮安全诊断。
- 测试链接仍需保持不公开。

## 下一步

不要进入 Stage 6F。先执行 Stage 6E 修复轮，定位并修复公网 `VLM_API_REQUEST_FAILED`。

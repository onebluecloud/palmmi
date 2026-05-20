# Palmmi Stage 6 状态记录

## 当前阶段

Stage 6E：公网真实 Qwen 链路验证

## Stage 6E 是否完成

BLOCKED。
本地真实 Qwen provider 已跑通，但 Cloudflare Production 真实 Secret 未配置，公网 real Qwen 链路尚未完成。

## 已完成

- Stage 1–5 已完成 / 冻结。
- Stage 6A：部署方案确认已完成。
- Stage 6B：环境变量与密钥管理已完成。
- Stage 6C：Cloudflare Pages Preview / Dry Run 已完成。
- Stage 6D：图片上传与临时缓存策略已完成。
- Stage 6E 本地检查：
  - 已确认项目真实读取的环境变量名。
  - 已确认本机存在 Qwen Key，未输出值。
  - 已完成本地 real Qwen provider 测试。
  - 已完成 Pages Function 入口从 mock-only 到 Stage 5P 服务的最小适配。
  - 已完成 Cloudflare runtime `__dirname` 兼容修复。

## 当前线上链接

- Pages：`https://palmmi.pages.dev`
- 最新 Production deployment：`https://c6fc5632.palmmi.pages.dev`
- workers.dev：`https://palmmi.onebluecloud723.workers.dev`
- 当前用途：Stage 6 内测，不公开传播
- 正式域名：未绑定
- DNS：未修改

## 当前 Cloudflare 环境变量状态

| 变量名 | Production | Preview |
|---|---|---|
| `PALMMI_QWEN_API_KEY` | 未配置 | 未配置 |
| `PALMMI_VLM_PROVIDER` | 未配置 | 已配置 |
| `PALMMI_VLM_MODE` | 未配置 | 已配置 |
| `PALMMI_QWEN_MODEL` | 未配置 | 未配置 |
| `PALMMI_QWEN_ENDPOINT` | 未配置 | 未配置 |
| `PALMMI_VLM_TIMEOUT_MS` | 未配置 | 未配置 |
| `PALMMI_VLM_MAX_IMAGE_BYTES` | 未配置 | 未配置 |

## 当前 provider 状态

- 本地 Node：real / qwen 可用。
- 本地 Pages Functions：mock 可用。
- Cloudflare Production：默认 mock，未切 real；最新部署 `c6fc5632-f167-489b-a44b-814f4cd0a744` 成功。
- Cloudflare Preview：已有 Preview 变量，但本轮未配置真实 Qwen Key。

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
- 在 Cloudflare Dashboard 的 Pages 项目 `palmmi` 中手动配置 Production Secret：`PALMMI_QWEN_API_KEY`。
- 在 Cloudflare Dashboard 的 Production 环境中配置真实链路变量：`PALMMI_VLM_PROVIDER`、`PALMMI_VLM_MODE`。
- 可选配置：`PALMMI_QWEN_MODEL`、`PALMMI_QWEN_ENDPOINT`、`PALMMI_VLM_TIMEOUT_MS`、`PALMMI_VLM_MAX_IMAGE_BYTES`。
- 配置后重新触发一次 Pages Production 部署。
- 准备正常掌纹、左手、右手、偏暗、模糊、裁切不完整、无效、超大、错误格式测试样本。

## 当前 Codex 待办

- 用户完成 Cloudflare Production Secret 配置后，重新执行 Stage 6E 公网 real Qwen 链路验证。
- 验证 `upload -> analyze -> Qwen -> result`。
- 验证 `upload -> analyze -> Qwen -> result -> poster`。
- 检查构建日志、运行日志、API 返回是否泄露 Key / Token / base64 / provider raw response。

## 当前风险

- Cloudflare Production Secret 未配置，公网 real Qwen 尚未验证。
- 真实 Qwen 成本需要限制测试样本数量。
- 偏暗 / 模糊 / 裁切不完整样本不足。
- Preview / Production 配置错误可能导致 mock 与 real 状态混淆。
- 测试链接外泄可能导致真实模型成本失控。

## 下一步

Stage 6E 修复轮：用户先在 Cloudflare Dashboard 手动配置 Production Secret 和真实链路变量，然后 Codex 重新执行公网 real Qwen 验证。Stage 6F 仍然 BLOCKED。

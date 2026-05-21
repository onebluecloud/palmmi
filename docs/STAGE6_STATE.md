# Palmmi Stage 6 状态记录

## 当前阶段

Stage 6E-Fix：公网 Qwen 请求失败修复已完成。

## Stage 6E 是否完成

已完成，当前状态：PASS。

公网真实 Qwen 链路已跑通，结果页和海报页均可展示真实分析结果。当前只允许进入 Stage 6F 准备，不在本轮执行 Stage 6F。

## 已完成

- Stage 1–5 已完成 / 冻结。
- Stage 6A：部署方案确认已完成。
- Stage 6B：环境变量与密钥管理已完成。
- Stage 6C：Cloudflare Pages Preview / Dry Run 已完成。
- Stage 6D：图片上传与临时缓存策略已完成。
- Stage 6E：公网真实 Qwen 链路验证已完成。
- Stage 6E-Fix：
  - 修复 Cloudflare runtime 下 Qwen `fetch` 调用绑定问题。
  - 补齐 Cloudflare Pages 构建产物中的 Stage 5 页面读取模块。
  - 公网 API 返回 `provider: qwen`。
  - `/result/` 和 `/poster/` 可展示真实分析结果。

## 当前线上链接

- Pages：`https://palmmi.pages.dev`
- workers.dev：`https://palmmi.onebluecloud723.workers.dev`
- 最新修复部署：`https://932aab1a.palmmi.pages.dev`
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
- Cloudflare Production：real / qwen 可用。
- Pages API：正常掌纹图返回 HTTP 200，`provider: qwen`。
- workers.dev API：正常掌纹图返回 HTTP 200，`provider: qwen`。

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

- 等待用户提供 Stage 6F 指令。
- Stage 6F 前继续保持链接不公开，并准备成本控制 / 限流 / 监控相关验收。

## 当前风险

- 测试链接外泄仍可能带来 Qwen API 成本风险。
- 当前尚未做正式限流系统。
- 当前尚未绑定正式域名，也不应公开推广。
- 偏暗 / 模糊 / 裁切不完整样本仍缺少明确 fixture，需要后续补测。

## 下一步

可以进入 Stage 6F，但本轮不进入。

推荐下一步：Stage 6F，重点处理真实链路上线前的成本控制、限流、监控、灰度和内测边界。

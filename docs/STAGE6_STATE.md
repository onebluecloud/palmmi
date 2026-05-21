# Palmmi Stage 6 状态记录

## 当前阶段

Stage 6F：Production Mobile Simulation / WeChat Manual Gate / E2E Regression 已完成。

Stage 6F status: CONDITIONAL_PASS

Reason: Automated production mobile simulation passed, but WeChat iOS / Android real-device validation remains MANUAL_REQUIRED.

## 已完成

- Stage 1–5 已完成 / 冻结。
- Stage 6A：部署方案确认已完成。
- Stage 6B：环境变量与密钥管理已完成。
- Stage 6C：Cloudflare Pages Preview / Dry Run 已完成。
- Stage 6D：图片上传与临时缓存策略已完成。
- Stage 6E：公网真实 Qwen 链路验证已完成。
- Stage 6E-Fix：公网 Qwen 请求失败修复已完成，状态 PASS。
- Stage 6F：
  - 生产首页 / 结果页 / 海报页可访问。
  - 生产 `/api/analyze` endpoint 可访问，错误时返回稳定 JSON。
  - 正常掌纹 fixture 生产真实 Qwen 请求成功。
  - 返回 `provider: qwen`。
  - 返回 `analysis_result`。
  - 结果页和海报页可读取真实分析结果并展示 `partial-result`。
  - Desktop Chrome baseline、iPhone Safari 模拟、Android Chrome 模拟通过。
  - 微信 iOS / Android 真机状态保持 `MANUAL_REQUIRED`。
  - 安全泄露扫描通过。

## 当前线上链接

- Pages：`https://palmmi.pages.dev`
- API：`https://palmmi.pages.dev/api/analyze`
- workers.dev：`https://palmmi.onebluecloud723.workers.dev`
- 链接用途：仅用于 Stage 6 内测，不公开传播

## 当前真实链路状态

| 项 | 状态 | 说明 |
|---|---|---|
| endpoint | PASS | `dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` |
| model | PASS | `qwen3-vl-flash` |
| provider | PASS | 生产 API 返回 `qwen` |
| analysis_result | PASS | 生产 API 返回结构化结果 |
| 结果页 | PASS | 真实分析结果可展示为 `partial-result` |
| 海报页 | PASS | 真实分析结果可展示为 `partial-result` |

## 当前移动端模拟测试状态

| 场景 | 状态 | 说明 |
|---|---|---|
| Desktop Chrome baseline | PASS | Playwright 自动化通过 |
| iPhone Safari 模拟 | PASS | Playwright iPhone 13 模拟通过 |
| Android Chrome / Pixel 模拟 | PASS | Playwright Pixel 模拟通过 |
| 移动端 viewport | PASS | 未发现严重横向溢出 |
| 移动端上传入口 | PASS | file input + label 可触发 file chooser |

## 当前微信真机测试状态

```text
WeChat iOS WebView: MANUAL_REQUIRED
WeChat Android WebView: MANUAL_REQUIRED
```

| 项目 | 状态 |
|---|---|
| iPhone 微信打开首页 | MANUAL_REQUIRED |
| iPhone 微信上传图片 | MANUAL_REQUIRED |
| iPhone 微信进入结果页 | MANUAL_REQUIRED |
| iPhone 微信进入海报页 | MANUAL_REQUIRED |
| iPhone 微信长按保存 / 分享体验 | MANUAL_REQUIRED |
| 安卓微信打开首页 | MANUAL_REQUIRED |
| 安卓微信上传图片 | MANUAL_REQUIRED |
| 安卓微信进入结果页 | MANUAL_REQUIRED |
| 安卓微信进入海报页 | MANUAL_REQUIRED |
| 安卓微信长按保存 / 分享体验 | MANUAL_REQUIRED |

## 缺失 fixture 列表

- 偏暗图 fixture：`BLOCKED_BY_MISSING_FIXTURE`
- 模糊图 fixture：`BLOCKED_BY_MISSING_FIXTURE`
- 裁切不完整图 fixture：`BLOCKED_BY_MISSING_FIXTURE`

正常掌纹 fixture 已存在并通过：`PalmTag_rule_engine_v0/samples/palms/dayi-left.jpg`。

## 当前安全状态

| 检查项 | 状态 |
|---|---|
| Key / Token 泄露 | PASS |
| base64 泄露 | PASS |
| raw response 泄露 | PASS |
| 新增长期图片存储 | PASS |
| 新增支付 / 打赏 / 登录 / 宣发 | PASS |
| 修改 Stage 3 规则 / 权重 / 阈值 | PASS |
| 重做 Stage 4 UI | PASS |
| 重写 Stage 5 VLM 主逻辑 | PASS |

## 当前阻塞项

| 阻塞项 | 状态 | 说明 |
|---|---|---|
| iPhone 微信真机测试 | MANUAL_REQUIRED | 需要真实设备截图或测试结果 |
| 安卓微信真机测试 | MANUAL_REQUIRED | 需要真实设备截图或测试结果 |
| 偏暗图 fixture | BLOCKED_BY_MISSING_FIXTURE | 需要明确图片 fixture |
| 模糊图 fixture | BLOCKED_BY_MISSING_FIXTURE | 需要明确图片 fixture |
| 裁切不完整图 fixture | BLOCKED_BY_MISSING_FIXTURE | 需要明确图片 fixture |

## 是否可以进入 Stage 6G

是否可以进入 Stage 6G: CONDITIONAL

条件：进入 Stage 6G 前或 Stage 6G 中必须补充 iPhone 微信 / 安卓微信真机测试。偏暗、模糊、裁切不完整图片 fixture 建议同步补齐，但本轮没有伪造通过。

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
- 补充 iPhone 微信和安卓微信真机验收结果。

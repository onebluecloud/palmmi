# Palmmi Stage 6 状态记录

## 当前阶段

Stage 6F-Fix-3：Repair Invalid Image Gate, P25 Collapse, and Poster Contract 已完成代码修复和自动化回归。

Stage 6F-Fix-3 status: CODE_FIXED_MANUAL_RETEST_REQUIRED

Stage 6G: BLOCKED

Reason: 用户在 Stage 6F-Fix-2 后的安卓微信真机复测仍失败；本轮已通过代码和自动化修复非手掌图片闸门、P25 默认兜底 / 人格塌缩风险、结果页与海报页 contract 不一致问题，但尚未获得修复后安卓微信真机复测结果，iOS 微信也仍未真机验收。

## 已完成

- Stage 1-5 已完成 / 冻结。
- Stage 6A：部署方案确认已完成。
- Stage 6B：环境变量与密钥管理已完成。
- Stage 6C：Cloudflare Pages Preview / Dry Run 已完成。
- Stage 6D：图片上传与临时缓存策略已完成。
- Stage 6E：公网真实 Qwen 链路验证已完成。
- Stage 6E-Fix：公网 Qwen 请求失败修复已完成，状态 PASS。
- Stage 6F：移动端模拟、生产页面访问、安全扫描和微信人工闸门已完成。
- Stage 6F-Fix：修复结果字段不完整、二次结果读取失败和“检查照片”按钮问题，但后续安卓微信复测发现仍未修干净。
- Stage 6F-Fix-2：
  - 上传页在同一 JS 上下文内完成图片 decode、压缩、API 请求、结果写入和回读。
  - API 成功并写入 `palmmi:last-analysis` 后才跳转 `/result/`。
  - `/result/` 和 `/poster/` 只读取已经成功写入的脱敏结果。
  - 客户端压缩移动端照片：优先最长边 1280px、JPEG quality 0.82；必要时 1024px / 0.75；目标小于约 1.2MB。
  - 超时、上传状态丢失、结果读取失败、低质量照片、API 失败拆分为独立错误码。
  - 超时不会清空上一次有效结果，不会跳转结果页，不会显示为结果读取失败。
  - `npm run test:stage6f` 已覆盖 Fix-2 本地回归并通过。
- Stage 6F-Fix-3：
  - Qwen provider 强制校验 `is_palm_photo`、`is_single_hand`、`is_palm_side_visible`、`palm_lines_visible`。
  - 非手掌 / 饮料 / 物品 / 手背 / 多手 / 掌纹不可见不会进入人格结果。
  - 缺失人格、未知人格、低置信度或缺少掌纹信号时返回 `ANALYSIS_UNRELIABLE`，不默认补成 `P25 老干部`。
  - 上传页“检查照片”文案改为基础检查，不再承诺掌纹可用。
  - `analysis_result` 补充 `valid_palm`、`poster_title`、`poster_subtitle`、`poster_quote`，结果页和海报页读取同一稳定脱敏结果。
  - `npm run test:stage6f` 已覆盖 Fix-3 非手掌、P25 兜底、多次分析隔离和 poster contract 回归并通过。

## 用户真机复测失败记录

Stage 6F-Fix 后，用户在安卓微信内置浏览器中复测失败：

| 问题 | 真机表现 | 判断 |
|---|---|---|
| 拍照上传后分析失败 | “检查照片”通过，开始分析后显示“当前分析结果暂时无法读取，请重新上传后再试” | 拍照 File / Blob 或分析任务状态在跨页流程中丢失 |
| 本地相册图片分析超时 | 约 2.5MB 图片检查通过，开始分析后显示“当前分析服务响应超时，请稍后再试” | 原图 / base64 体积过大，微信 WebView 下真实请求链路超时 |

结论：Stage 6F-Fix 没修干净，不能进入 Stage 6G。

Stage 6F-Fix-2 后，用户在安卓微信内置浏览器中继续复测失败：

| 问题 | 真机表现 | 判断 |
|---|---|---|
| 非手掌图片被分析成人格 | 啤酒 / 饮料图通过基础检查并进入 `P25 老干部` 结果 | 服务端 palm validity 闸门和默认人格兜底必须修复 |
| 多个手掌疑似塌缩 P25 | 多张不同手掌均倾向 `P25 老干部 / M1` | 缺字段或解析失败不能默认选择任意人格 |
| 海报生成失败 | 结果页能展示文字，但海报页提示字段缺失 / 掌纹不够清晰 | 结果页与海报页 contract 不一致 |

结论：Stage 6F-Fix-2 仍失败，Stage 6G 继续 BLOCKED。

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
| 结果页 | CODE_FIXED_MANUAL_RETEST_REQUIRED | Fix-2 后成功结果先写入 `palmmi:last-analysis` 再跳转 |
| 海报页 | CODE_FIXED_MANUAL_RETEST_REQUIRED | 读取同一稳定脱敏结果 |
| 当前生产正常上传 | FAIL_BEFORE_FIX3_DEPLOYMENT | 本轮测试记录当前已部署版本仍可能失败；需本次部署后复测 |

## Stage 6F-Fix-2 修复状态

| 修复项 | 状态 | 说明 |
|---|---|---|
| 安卓微信拍照后结果无法读取 | CODE_FIXED_AUTOMATED_PASS | 上传页同上下文完成压缩和 API 请求，成功写入结果后才跳转 |
| 相册图片分析超时 | CODE_FIXED_AUTOMATED_PASS | 请求前压缩为 JPEG，2MB+ 模拟图压缩到小于 1.2MB |
| 成功后再跳转结果页 | PASS | 自动化确认 API pending 时仍停留在上传页 |
| `palmmi:last-analysis` 写入顺序 | PASS | API success -> normalize/save -> readback -> navigate `/result/` |
| REQUEST_TIMEOUT | PASS | 超时留在上传页，不清空上一次有效结果 |
| UPLOAD_STATE_LOST | PASS | 上传状态丢失显示独立错误 |
| RESULT_READ_FAILED | PASS | 结果读取失败不覆盖超时 |
| IMAGE_NOT_CLEAR | PASS | 低质量照片提示重拍，不展示半残缺人格 |
| API_REQUEST_FAILED | PASS | API 请求失败显示独立错误 |

## Stage 6F-Fix-3 修复状态

| 修复项 | 状态 | 说明 |
|---|---|---|
| 非手掌图片被分析成人格 | CODE_FIXED_AUTOMATED_PASS | 服务端返回 `NOT_PALM`，前端不写入人格结果 |
| 多结果塌缩为 P25 老干部 | CODE_FIXED_AUTOMATED_PASS | 移除解析默认手掌有效和默认人格兜底；残缺结果进入 `ANALYSIS_UNRELIABLE` |
| 检查照片误导文案 | PASS | 文案只说明通过基础文件 / decode / 尺寸检查 |
| 结果页与海报页 contract 不一致 | PASS | 同一 `palmmi:last-analysis` 脱敏结果补齐海报字段 |
| 有效结果生成基础海报 | PASS | Poster contract 自动化通过 |
| 无效结果禁止海报 | PASS | `NOT_PALM` / 低质量结果显示重拍提示 |

## 当前移动端模拟测试状态

| 场景 | 状态 | 说明 |
|---|---|---|
| Desktop Chrome baseline | PASS | Playwright 自动化通过 |
| iPhone Safari 模拟 | PASS | Playwright iPhone 13 模拟通过 |
| Android Chrome / Pixel 模拟 | PASS | Playwright Pixel 模拟通过 |
| Fix-2 拍照大图模拟 | PASS | 2MB+ `camera.jpg` 先压缩，再 API 成功后跳转 |
| Fix-2 相册超时模拟 | PASS | `REQUEST_TIMEOUT` 不跳转结果页，不清空旧结果 |
| Fix-3 非手掌图片 | PASS | `NOT_PALM` 不展示 / 不写入人格 |
| Fix-3 P25 兜底防护 | PASS | 残缺 API mock 返回 `ANALYSIS_UNRELIABLE` |
| Fix-3 多次分析隔离 | PASS | 无效第二次分析不覆盖旧有效结果，也不展示旧结果为新结果 |
| Fix-3 Poster contract | PASS | 有效结果可生成基础海报 |
| 移动端 viewport | PASS | 未发现严重横向溢出 |
| 移动端上传入口 | PASS | file input + label 可触发 file chooser |

## 当前微信真机测试状态

```text
WeChat Android: MANUAL_RETEST_REQUIRED
WeChat iOS: MANUAL_REQUIRED
```

| 项目 | 状态 |
|---|---|
| 安卓微信打开首页 | MANUAL_RETEST_REQUIRED |
| 安卓微信拍照上传 | MANUAL_RETEST_REQUIRED |
| 安卓微信相册上传 | MANUAL_RETEST_REQUIRED |
| 安卓微信非手掌图片拒绝 | MANUAL_RETEST_REQUIRED |
| 安卓微信多手掌不塌缩 P25 | MANUAL_RETEST_REQUIRED |
| 安卓微信进入结果页 | MANUAL_RETEST_REQUIRED |
| 安卓微信进入海报页 | MANUAL_RETEST_REQUIRED |
| 安卓微信长按保存 / 分享体验 | MANUAL_RETEST_REQUIRED |
| iPhone 微信打开首页 | MANUAL_REQUIRED |
| iPhone 微信上传图片 | MANUAL_REQUIRED |
| iPhone 微信进入结果页 | MANUAL_REQUIRED |
| iPhone 微信进入海报页 | MANUAL_REQUIRED |
| iPhone 微信长按保存 / 分享体验 | MANUAL_REQUIRED |

Codex 没有把微信真机测试伪造成 PASS。

## 缺失 fixture 列表

- 偏暗图 fixture：`BLOCKED_BY_MISSING_FIXTURE`
- 模糊图 fixture：`BLOCKED_BY_MISSING_FIXTURE`
- 裁切不完整图 fixture：`BLOCKED_BY_MISSING_FIXTURE`

正常掌纹 fixture 已存在：`PalmTag_rule_engine_v0/samples/palms/dayi-left.jpg`。

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
| 安卓微信 Fix-2 后真机复测 | MANUAL_RETEST_REQUIRED | 必须由用户在安卓微信重新测试拍照和相册路径 |
| iPhone 微信真机测试 | MANUAL_REQUIRED | 需要真实设备截图或测试结果 |
| Fix-3 部署后生产真实上传确认 | MANUAL_RETEST_REQUIRED | 当前代码修复后需等待 Pages 部署并复测 |
| 安卓微信非手掌拒绝复测 | MANUAL_RETEST_REQUIRED | 啤酒 / 饮料 / 非手掌图片必须被拒绝，不能进入人格结果 |
| 安卓微信海报生成复测 | MANUAL_RETEST_REQUIRED | 有效结果页能展示人格时，海报页也必须能生成基础海报 |
| 偏暗图 fixture | BLOCKED_BY_MISSING_FIXTURE | 需要明确图片 fixture |
| 模糊图 fixture | BLOCKED_BY_MISSING_FIXTURE | 需要明确图片 fixture |
| 裁切不完整图 fixture | BLOCKED_BY_MISSING_FIXTURE | 需要明确图片 fixture |

## 是否可以进入 Stage 6G

是否可以进入 Stage 6G: BLOCKED

条件：只有在本次 Fix-3 部署后，安卓微信拍照上传、相册上传、非手掌拒绝、多手掌不塌缩 P25、海报生成真机复测通过，且继续保持无 Key / Token / base64 / raw response 泄露，才允许重新评估 Stage 6G。

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
- 等待本次 Fix-3 部署后，补充安卓微信拍照上传复测结果。
- 等待本次 Fix-3 部署后，补充安卓微信相册上传复测结果。
- 等待本次 Fix-3 部署后，补充安卓微信非手掌图片拒绝复测结果。
- 等待本次 Fix-3 部署后，补充安卓微信海报生成复测结果。
- 补充 iPhone 微信真机验收结果。

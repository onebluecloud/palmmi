# Stage 6F Mobile / WeChat / E2E Regression Report

Date: 2026-05-21

## 1. 本次修改文件列表

| 文件 | 类型 | 说明 |
|---|---|---|
| `docs/STAGE6F_MOBILE_WECHAT_E2E_REPORT.md` | 文档 | 新增 Stage 6F 生产移动端、微信人工闸门、E2E、安全扫描报告 |
| `docs/STAGE6_STATE.md` | 文档 | 更新 Stage 6F 当前状态 |
| `tests/stage6f/mobile-e2e.test.cjs` | 测试 | 新增 Playwright 生产移动端模拟、真实 Qwen 上传回归、异常输入测试 |
| `scripts/stage6f/security-scan.cjs` | 测试脚本 | 新增 Key / Token / base64 / raw response / 长期图片存储扫描 |
| `package.json` | 测试配置 | 新增 `test:stage6f` 和 `scan:stage6f` |

未新增 `package-lock.json`。未修改业务主逻辑、Stage 3 规则、Stage 4 UI 主风格或 Stage 5 VLM 主逻辑。

## 2. Stage 6F 目标

本轮目标是完成生产环境真实链路的移动端自动化模拟测试、线上端到端回归、安全泄露检查，并建立微信真机人工验收闸门。

范围冲突记录：`docs/STAGE6_STATE.md` 上一版建议 Stage 6F 重点处理成本控制 / 限流 / 监控；本次用户指令明确要求 Stage 6F 执行移动端生产模拟、WeChat manual gate 和 E2E regression。本轮按当前指令执行，且不扩大到支付、宣发、登录、限流系统或监控系统。

## 3. 当前生产信息

| 项 | 值 |
|---|---|
| 生产地址 | `https://palmmi.pages.dev/` |
| API 地址 | `https://palmmi.pages.dev/api/analyze` |
| endpoint | `dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` |
| model | `qwen3-vl-flash` |
| provider | `qwen` |

## 4. Stage 6F 可执行状态

`docs/STAGE6_STATE.md` 明确记录 Stage 6E-Fix 已完成且 PASS，公网真实 Qwen 链路已跑通，结果页和海报页可展示真实分析结果，且当前可以进入 Stage 6F。

状态结论：PASS，可以执行 Stage 6F。未记录 `STATE_INCONSISTENT`。

## 5. 生产环境页面 / 接口检查

| 页面 / 接口 | 结果 | 证据 / 说明 |
|---|---|---|
| 首页 `/` | PASS | HTTP 200；标题 `Palmmi · 掌纹人格标签`；不白屏；上传入口存在 |
| 结果页 `/result/` | PASS | HTTP 200；无 session 时显示 `missing-result`，不白屏；测试状态可渲染 `partial-result` |
| 海报页 `/poster/` | PASS | HTTP 200；无 session 时显示 `missing-result`，不白屏；测试状态可渲染 `ready` |
| API `/api/analyze` GET | PASS | HTTP 405；稳定 JSON：`METHOD_NOT_ALLOWED` |
| API `/api/analyze` empty POST | PASS | HTTP 400；稳定 JSON：`FILE_TYPE_UNSUPPORTED` |
| API 正常掌纹上传 | PASS | HTTP 200；`provider: qwen`；返回 `analysis_result` |

静态资源检查：未发现生产静态资源 404，JS bundle 加载成功。

## 6. Stage 5 构建产物检查

| 产物 | 生产 HTTP | 说明 |
|---|---:|---|
| `/src/stage5/analysis-result-read-adapter.js` | 200 | JS 资源存在，不是 HTML fallback |
| `/src/stage5/analysis-result-storage-reader.js` | 200 | JS 资源存在，不是 HTML fallback |
| `/src/stage5/page-analysis-reader.js` | 200 | JS 资源存在，不是 HTML fallback |
| `/src/stage5/page-analysis-state-mapper.js` | 200 | JS 资源存在，不是 HTML fallback |

结果页和海报页依赖的 `src/stage5/*.js` 已进入 Pages 构建产物。

## 7. Playwright / 移动端模拟测试结果

测试命令：`npm run test:stage6f`

| 设备 / 场景 | 结果 | 说明 |
|---|---|---|
| Desktop Chrome baseline | PASS | 首页、上传页、结果页、海报页均可访问；无静态资源 404；无明显 JS error |
| iPhone Safari 模拟 | PASS | 使用 Playwright `iPhone 13` preset 或等价 fallback；移动 viewport 无严重横向溢出 |
| Android Chrome / Pixel 模拟 | PASS | 使用 Playwright `Pixel 5` preset 或等价 fallback；移动 viewport 无严重横向溢出 |

说明：iPhone Safari 是 Chromium 下的设备 / UA / viewport 模拟，不等同于 iPhone 微信或真实 Safari 内核真机测试。

## 8. 移动端上传入口检查

| 检查项 | 结果 | 说明 |
|---|---|---|
| `<input type="file">` 存在 | PASS | `#palmFile` 存在 |
| `accept` 包含 image 类型 | PASS | `image/jpeg,image/png,image/webp` |
| 不只依赖桌面拖拽 | PASS | 移动端可通过 `label[for=palmFile]` 触发 file chooser |
| 上传区可见 | PASS | iPhone / Pixel viewport 下可见 |
| CTA 按钮可见 | PASS | `开始分析` 可见 |
| 不依赖 hover 才能操作 | CODE_REVIEW_PASS | 自动化以点击 / touch-friendly file chooser 路径完成 |

## 9. API 真实 Qwen 回归结果

| 项 | 结果 | 说明 |
|---|---|---|
| 使用 fixture | PASS | `PalmTag_rule_engine_v0/samples/palms/dayi-left.jpg` |
| API HTTP 200 | PASS | 正常掌纹上传后 `/api/analyze` 返回 200 |
| provider 为 qwen | PASS | 返回 `provider: qwen` |
| 返回 `analysis_result` | PASS | 返回结构化 `analysis_result` |
| 结果页读取真实结果 | PASS | 同一 session 进入 `/result/` 后为 `partial-result`，非白屏 |
| 海报页读取真实结果 | PASS | 同一 session 进入 `/poster/` 后为 `partial-result`，非白屏 |
| API 不泄露 Key / Token | PASS | 响应扫描未发现 |
| API 不泄露 base64 | PASS | 响应扫描未发现 |
| API 不泄露 raw response | PASS | 响应扫描未发现 |

`partial-result` 是低置信度 / 部分字段兜底下的可展示状态，不是白屏或崩溃。

## 10. 异常输入测试结果

| 异常类型 | 结果 | 说明 |
|---|---|---|
| 非图片文件 | PASS | 移动端上传页阻止；不进入 API；不白屏 |
| 超大图片 | PASS | 移动端上传页按 8MB 限制拒绝；不进入 API；不白屏 |
| 空请求 | PASS | 生产 API HTTP 400，稳定 JSON |
| Qwen 请求失败模拟 | PASS | 本地 API 边界返回 `VLM_API_REQUEST_FAILED`，不泄露敏感内容 |
| Qwen 解析失败模拟 | PASS | 本地 API 边界返回 `VLM_API_INVALID_RESPONSE`，不泄露敏感内容 |
| Qwen 空返回模拟 | PASS | 本地 API 边界返回 `VLM_API_INVALID_RESPONSE`，不泄露敏感内容 |
| 偏暗图 | BLOCKED_BY_MISSING_FIXTURE | 仓库中未发现明确偏暗图片 fixture |
| 模糊图 | BLOCKED_BY_MISSING_FIXTURE | 仓库中未发现明确模糊图片 fixture |
| 裁切不完整图 | BLOCKED_BY_MISSING_FIXTURE | 仓库中未发现明确裁切不完整图片 fixture |

## 11. 微信内置浏览器人工闸门

```text
WeChat iOS WebView: MANUAL_REQUIRED
WeChat Android WebView: MANUAL_REQUIRED
```

Codex 没有把微信真机测试伪造成自动化 PASS。以下项目必须由真实设备补测。

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

代码层风险判断：

| 风险项 | 判断 |
|---|---|
| 是否依赖微信不支持的 API | CODE_REVIEW_PASS，未发现必须依赖桌面专属 API |
| 是否依赖桌面拖拽 | CODE_REVIEW_PASS，上传入口是 file input |
| 是否依赖 hover | CODE_REVIEW_PASS，主流程可点击完成 |
| 是否有严重 viewport 问题 | CODE_REVIEW_PASS，iPhone / Pixel 模拟无严重横向溢出 |
| file input 兼容风险 | CODE_REVIEW_PASS，但仍需微信真机确认相册 / 拍照入口 |

`CODE_REVIEW_PASS` 不能替代微信真机 PASS。

## 12. 安全泄露扫描

测试命令：`npm run scan:stage6f`

扫描范围：

- `server/**`
- `src/**`
- `scripts/**`
- `tests/**`
- `docs/**`
- `functions/**`
- `api/**`
- `worker/**`
- `dist/**`
- 最新 `npm test` 日志做了额外脱敏检查

| 检查项 | 结果 | 说明 |
|---|---|---|
| Qwen API Key 泄露 | PASS | 未发现真实 Key 值 |
| Authorization Bearer Token 泄露 | PASS | 未发现 Bearer Token 值 |
| base64 大段图片泄露 | PASS | 未发现长 data URL / 长 base64 payload |
| raw Qwen response 泄露 | PASS | 未发现 raw response payload |
| 用户上传原图长期存储路径 | PASS | 未发现生产路径写入上传图片 |
| 生产 secret 明文 | PASS | 未发现 |
| 测试输出日志泄露 | PASS | 最新 npm debug log 未发现 Key / Token / base64 / raw response |

## 13. 长期图片存储检查

| 检查项 | 结果 | 说明 |
|---|---|---|
| 新增用户原图长期保存 | PASS | 本轮未新增 |
| 新增 base64 长期保存 | PASS | 本轮未新增 |
| 上传图片落盘路径 | PASS | 生产代码未新增 |
| 上传图片写入公开目录 | PASS | 未发现 |
| 用户图片写入日志 | PASS | 未发现 |
| 用户图片写入报告 | PASS | 未写入 |
| Playwright fixture 隐私 | PASS | 使用仓库内测试样本；未新增真实用户隐私图片 |

## 14. 构建和测试命令

| 命令 | 结果 | 说明 |
|---|---|---|
| `npm run test:stage6f` | PASS | 生产移动端模拟、真实 Qwen 回归、异常输入模拟通过 |
| `npm run build` | PASS | `dist` 构建成功 |
| `npm run scan:stage6f` | PASS | 泄露 / 存储扫描通过 |
| `npm test` | NOT_AVAILABLE | `package.json` 没有总 `test` 脚本；未伪造 PASS |

## 15. 禁止项检查

| 禁止项 | 结果 | 说明 |
|---|---|---|
| 新增支付 | PASS | 未新增 |
| 新增打赏 | PASS | 未新增 |
| 新增登录 | PASS | 未新增 |
| 新增用户系统 | PASS | 未新增 |
| 新增宣发功能 | PASS | 未新增 |
| 新增长期图片存储 | PASS | 未新增 |
| 修改 Stage 3 规则 / 权重 / 阈值 / 36 型人格 | PASS | 未修改 |
| 重做 Stage 4 UI | PASS | 未修改 UI 主风格 |
| 重写 Stage 5 VLM 主逻辑 | PASS | 未修改 Stage 5 VLM 主逻辑 |

## 16. 是否可以进入 Stage 6G

是否可以进入 Stage 6G: CONDITIONAL

条件：进入 Stage 6G 前或 Stage 6G 中必须补充 iPhone 微信 / 安卓微信真机测试。建议同时补充偏暗、模糊、裁切不完整的明确图片 fixture。

## 17. 当前阻塞项

| 阻塞项 | 状态 | 说明 |
|---|---|---|
| iPhone 微信真机测试 | MANUAL_REQUIRED | Codex 不能自动完成 |
| 安卓微信真机测试 | MANUAL_REQUIRED | Codex 不能自动完成 |
| 偏暗图 fixture | BLOCKED_BY_MISSING_FIXTURE | 仓库未发现明确图片 fixture |
| 模糊图 fixture | BLOCKED_BY_MISSING_FIXTURE | 仓库未发现明确图片 fixture |
| 裁切不完整图 fixture | BLOCKED_BY_MISSING_FIXTURE | 仓库未发现明确图片 fixture |

## 18. 后续人工补测清单

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

## 19. Codex 自检验收表

| 验收项 | 结果 | 证据 / 说明 |
|---|---|---|
| Stage 6E-Fix 状态确认 | PASS | `docs/STAGE6_STATE.md` 明确 6E-Fix PASS |
| 首页生产环境可访问 | PASS | HTTP 200，不白屏 |
| 结果页生产环境可访问 | PASS | HTTP 200，不白屏 |
| 海报页生产环境可访问 | PASS | HTTP 200，不白屏 |
| API endpoint 可访问 | PASS | GET 405 / POST 400 均为稳定 JSON；正常上传 200 |
| 真实 Qwen 请求成功 | PASS | 正常掌纹 fixture 返回 HTTP 200 |
| provider 为 qwen | PASS | 返回 `provider: qwen` |
| 返回 analysis_result | PASS | 返回 `analysis_result` |
| iPhone Safari 模拟测试 | PASS | Playwright iPhone 13 模拟通过 |
| Android Chrome 模拟测试 | PASS | Playwright Pixel 模拟通过 |
| 移动端 viewport 无严重问题 | PASS | iPhone / Pixel scrollWidth 等于 clientWidth |
| 移动端上传入口存在 | PASS | `#palmFile` 存在 |
| 上传入口不只依赖拖拽 | PASS | file input + label 可触发 file chooser |
| 结果页移动端不白屏 | PASS | base 和 test state 均不白屏；真实结果 `partial-result` |
| 海报页移动端不白屏 | PASS | base 和 test state 均不白屏；真实结果 `partial-result` |
| iPhone 微信真机首页 | MANUAL_REQUIRED | 需用户真机补测 |
| iPhone 微信真机上传 | MANUAL_REQUIRED | 需用户真机补测 |
| iPhone 微信真机结果页 | MANUAL_REQUIRED | 需用户真机补测 |
| iPhone 微信真机海报页 | MANUAL_REQUIRED | 需用户真机补测 |
| 安卓微信真机首页 | MANUAL_REQUIRED | 需用户真机补测 |
| 安卓微信真机上传 | MANUAL_REQUIRED | 需用户真机补测 |
| 安卓微信真机结果页 | MANUAL_REQUIRED | 需用户真机补测 |
| 安卓微信真机海报页 | MANUAL_REQUIRED | 需用户真机补测 |
| 非图片不白屏 | PASS | 上传页稳定错误态 |
| 超大图片仍被拒绝 | PASS | 8MB 限制生效 |
| 空请求返回稳定错误 | PASS | HTTP 400 `FILE_TYPE_UNSUPPORTED` |
| 偏暗图测试 | BLOCKED_BY_MISSING_FIXTURE | 未发现明确图片 fixture |
| 模糊图测试 | BLOCKED_BY_MISSING_FIXTURE | 未发现明确图片 fixture |
| 裁切不完整图测试 | BLOCKED_BY_MISSING_FIXTURE | 未发现明确图片 fixture |
| Qwen 异常不白屏 | PASS | 本地 API 边界模拟稳定返回 |
| Qwen 解析失败不白屏 | PASS | 本地 API 边界模拟稳定返回 |
| API 不暴露 Key / Token | PASS | 响应与扫描均未发现 |
| API 不暴露 base64 | PASS | 响应与扫描均未发现 |
| API 不暴露 raw response | PASS | 响应与扫描均未发现 |
| 日志不暴露 Key / Token | PASS | npm log 脱敏检查通过 |
| 日志不暴露 base64 | PASS | npm log 脱敏检查通过 |
| 日志不暴露 raw response | PASS | npm log 脱敏检查通过 |
| 没有新增长期图片存储 | PASS | 未新增生产图片存储 |
| 没有新增支付 / 打赏 / 登录 / 宣发 | PASS | 未新增 |
| 没有修改 Stage 3 规则 / 权重 / 阈值 | PASS | 未修改相关文件 |
| 没有重做 Stage 4 UI | PASS | 未修改 UI 主风格 |
| 没有重写 Stage 5 VLM 主逻辑 | PASS | 未修改 VLM 主逻辑 |
| 是否可以进入 Stage 6G | CONDITIONAL | 微信 iOS / Android 真机仍需人工补测 |

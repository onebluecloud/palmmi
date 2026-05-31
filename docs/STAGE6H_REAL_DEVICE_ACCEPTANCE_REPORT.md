# Palmmi Stage 6H 真实移动端 / 微信真机验收报告

Date: 2026-05-31

## 1. 阶段结论

- Stage 6H 当前状态：`MANUAL_REQUIRED`
- 是否允许进入下一阶段：`BLOCKED`
- 主要阻塞项：真实 iPhone Safari、iPhone 微信、Android Chrome、Android 微信验收尚未由用户完成。

Stage 6H 不做新功能开发。本阶段只记录自动化线上复查结果，并给出真机人工验收清单。Codex 未伪造任何真机结果。

## 2. 线上环境

- 线上链接：`https://palmmi.onebluecloud723.workers.dev`
- Cloudflare 最新已推送 commit：以 `origin/main` 最新提交和 Codex 最终报告为准。
- Cloudflare 最新部署 commit 是否已确认：`PASS_BY_BUILD_META`
- 部署确认说明：Codex 已新增 `/build-meta.json` 和 `npm run preflight:stage6h -- --expect-commit <latest-origin-main-commit>`，可在没有 Cloudflare API token 的情况下确认线上 workers.dev 部署 commit。最新部署优先用该命令确认；Cloudflare Dashboard 只作为该命令失败时的兜底。
- 是否绑定正式域名：`NO`
- 是否公开发布：`NO`
- 是否配置真实 Qwen：`YES`，生产真实链路保持既有配置；本轮 Codex 自动化未调用真实 Qwen。
- 是否接入支付 / 打赏：`NO`

## 3. 自动化线上复查结果

| 检查项 | 结果 | 说明 |
|---|---|---|
| 首页 `/` | PASS | HTTP 200，Palmmi 页面，非 Hello World，未发现敏感泄露标记。 |
| 上传页 `/upload/` | PASS | HTTP 200，Palmmi 页面，非 Hello World，未发现敏感泄露标记。 |
| 结果页 `/result/` | PASS | HTTP 200，Palmmi 页面，非 Hello World，未发现敏感泄露标记。 |
| 海报页 `/poster/` | PASS | HTTP 200，Palmmi 页面，非 Hello World，未发现敏感泄露标记。 |
| POST `/api/analyze` 空请求 | PASS | HTTP 400，`FILE_TYPE_UNSUPPORTED`，provider 前拒绝。 |
| POST `/api/analyze` 非图片请求 | PASS | HTTP 400，`FILE_TYPE_UNSUPPORTED`，provider 前拒绝。 |
| 静态资源加载 | PASS | CSS、upload/analyze/result/poster JS、Stage 5 reader/mapper 资源均可加载；临时 SSL 抖动重试后通过。 |
| 页面是否仍是 Palmmi | PASS | 四个页面均包含 Palmmi / 掌纹人格标签标识。 |
| 错误响应脱敏 | PASS | API 错误响应不包含技术栈、provider raw response、base64 或 key。 |
| 不暴露 API Key | PASS | 页面、API 错误响应和静态资源检查未发现 key / token 值。 |
| 不暴露 raw response | PASS | API 错误响应不包含 raw provider response；公开 JS 仅含历史 mock / 清理字段名，不含真实 provider raw 内容。 |
| 不暴露 base64 | PASS | API 错误响应不包含 base64；本轮未上传图片。 |

自动化复查未设置 `PALMMI_ALLOW_REAL_QWEN_TESTS=1`，未运行真实 Qwen E2E，未消耗额度。

### Stage 6H online preflight script

Codex added a repeatable zero-cost preflight command:

```text
npm run preflight:stage6h
```

It checks:

- GET `/`
- GET `/upload/`
- GET `/result/`
- GET `/poster/`
- POST `/api/analyze` with invalid `text/plain` body only
- GET `/build-meta.json`

It does not upload a real image, does not call Qwen, and reports `api_calls_made=0`, `quota_consumed=false`.

`/build-meta.json` exposes the deployed commit SHA. This command verifies deployment without a Cloudflare API token:

```text
npm run preflight:stage6h -- --expect-commit <latest-origin-main-commit>
```

Latest run on 2026-05-31: `PASS`, all four pages HTTP 200 and Palmmi pages, invalid API POST HTTP 400 `INVALID_REQUEST_BODY`, build metadata matched the expected commit, and no API key, base64, stack, or raw provider response was found.

### Stage 6H manual result checker

Codex added a local text-only helper for the moment when the user sends true-device results back:

```text
npm run check:stage6h:manual -- --file <Codex-saved-user-result-text>
```

It checks whether the pasted Stage 6H template has missing required fields, obvious P0 / P1 blockers, sensitive leak observations, and the minimum iPhone WeChat + Android WeChat condition for `CONDITIONAL_PASS`. It reports `can_enter_stage6i=true` when that minimum gate is met, while still keeping untested iPhone Safari / Android Chrome fields in `missing_required`. It reports `api_calls_made=0`, `quota_consumed=false`, and `real_qwen_called=false`. Before printing JSON, it redacts obvious API key / token / secret / `sk-...`, `data:image/...;base64,...`, raw response payload, and very long base64-like payload values. This redaction is only a fallback; users still must not paste keys, images, base64, raw provider responses, or private data. It does not upload images, call Qwen, or prove that the user's true-device statements are correct.

## 4. 真机人工验收清单

### iPhone Safari

| 项目 | 结果 | 备注 |
|---|---|---|
| 首页打开 | MANUAL_REQUIRED | 用户填写 |
| 上传页打开 | MANUAL_REQUIRED | 用户填写 |
| 相册上传 | MANUAL_REQUIRED | 用户填写 |
| 拍照上传 | MANUAL_REQUIRED | 用户填写 |
| 正常清晰掌纹分析 | MANUAL_REQUIRED | 用户填写 |
| 模糊 / 偏暗掌纹提示 | MANUAL_REQUIRED | 用户填写 |
| 非手掌图片提示 NOT_PALM | MANUAL_REQUIRED | 用户填写 |
| 超大图 / 非图片拦截 | MANUAL_REQUIRED | 用户填写 |
| 连续点击上传按钮 re-entry lock | MANUAL_REQUIRED | 用户填写 |
| 30 秒内重复提交 | MANUAL_REQUIRED | 用户填写 |
| 结果页展示 | MANUAL_REQUIRED | 用户填写 |
| 海报页展示 | MANUAL_REQUIRED | 用户填写 |
| 保存 / 长按保存海报 | MANUAL_REQUIRED | 用户填写 |
| 返回上一页 | MANUAL_REQUIRED | 用户填写 |
| 白屏 / 卡死 / 无限加载 | MANUAL_REQUIRED | 用户填写 |
| 错误提示是否可理解 | MANUAL_REQUIRED | 用户填写 |
| 是否暴露技术错误 / raw response / stack / key / base64 | MANUAL_REQUIRED | 用户填写 |

### iPhone 微信

| 项目 | 结果 | 备注 |
|---|---|---|
| 首页打开 | MANUAL_REQUIRED | 用户填写 |
| 上传页打开 | MANUAL_REQUIRED | 用户填写 |
| 相册上传 | MANUAL_REQUIRED | 用户填写 |
| 拍照上传 | MANUAL_REQUIRED | 用户填写 |
| 正常清晰掌纹分析 | MANUAL_REQUIRED | 用户填写 |
| 模糊 / 偏暗掌纹提示 | MANUAL_REQUIRED | 用户填写 |
| 非手掌图片提示 NOT_PALM | MANUAL_REQUIRED | 用户填写 |
| 超大图 / 非图片拦截 | MANUAL_REQUIRED | 用户填写 |
| 连续点击上传按钮 re-entry lock | MANUAL_REQUIRED | 用户填写 |
| 30 秒内重复提交 | MANUAL_REQUIRED | 用户填写 |
| 结果页展示 | MANUAL_REQUIRED | 用户填写 |
| 海报页展示 | MANUAL_REQUIRED | 用户填写 |
| 保存 / 长按保存海报 | MANUAL_REQUIRED | 用户填写 |
| 返回上一页 | MANUAL_REQUIRED | 用户填写 |
| 白屏 / 卡死 / 无限加载 | MANUAL_REQUIRED | 用户填写 |
| 错误提示是否可理解 | MANUAL_REQUIRED | 用户填写 |
| 是否暴露技术错误 / raw response / stack / key / base64 | MANUAL_REQUIRED | 用户填写 |

### Android Chrome

| 项目 | 结果 | 备注 |
|---|---|---|
| 首页打开 | MANUAL_REQUIRED | 用户填写 |
| 上传页打开 | MANUAL_REQUIRED | 用户填写 |
| 相册上传 | MANUAL_REQUIRED | 用户填写 |
| 拍照上传 | MANUAL_REQUIRED | 用户填写 |
| 正常清晰掌纹分析 | MANUAL_REQUIRED | 用户填写 |
| 模糊 / 偏暗掌纹提示 | MANUAL_REQUIRED | 用户填写 |
| 非手掌图片提示 NOT_PALM | MANUAL_REQUIRED | 用户填写 |
| 超大图 / 非图片拦截 | MANUAL_REQUIRED | 用户填写 |
| 连续点击上传按钮 re-entry lock | MANUAL_REQUIRED | 用户填写 |
| 30 秒内重复提交 | MANUAL_REQUIRED | 用户填写 |
| 结果页展示 | MANUAL_REQUIRED | 用户填写 |
| 海报页展示 | MANUAL_REQUIRED | 用户填写 |
| 保存 / 长按保存海报 | MANUAL_REQUIRED | 用户填写 |
| 返回上一页 | MANUAL_REQUIRED | 用户填写 |
| 白屏 / 卡死 / 无限加载 | MANUAL_REQUIRED | 用户填写 |
| 错误提示是否可理解 | MANUAL_REQUIRED | 用户填写 |
| 是否暴露技术错误 / raw response / stack / key / base64 | MANUAL_REQUIRED | 用户填写 |

### Android 微信

| 项目 | 结果 | 备注 |
|---|---|---|
| 首页打开 | MANUAL_REQUIRED | 用户填写 |
| 上传页打开 | MANUAL_REQUIRED | 用户填写 |
| 相册上传 | MANUAL_REQUIRED | 用户填写 |
| 拍照上传 | MANUAL_REQUIRED | 用户填写 |
| 正常清晰掌纹分析 | MANUAL_REQUIRED | 用户填写 |
| 模糊 / 偏暗掌纹提示 | MANUAL_REQUIRED | 用户填写 |
| 非手掌图片提示 NOT_PALM | MANUAL_REQUIRED | 用户填写 |
| 超大图 / 非图片拦截 | MANUAL_REQUIRED | 用户填写 |
| 连续点击上传按钮 re-entry lock | MANUAL_REQUIRED | 用户填写 |
| 30 秒内重复提交 | MANUAL_REQUIRED | 用户填写 |
| 结果页展示 | MANUAL_REQUIRED | 用户填写 |
| 海报页展示 | MANUAL_REQUIRED | 用户填写 |
| 保存 / 长按保存海报 | MANUAL_REQUIRED | 用户填写 |
| 返回上一页 | MANUAL_REQUIRED | 用户填写 |
| 白屏 / 卡死 / 无限加载 | MANUAL_REQUIRED | 用户填写 |
| 错误提示是否可理解 | MANUAL_REQUIRED | 用户填写 |
| 是否暴露技术错误 / raw response / stack / key / base64 | MANUAL_REQUIRED | 用户填写 |

## 5. 异常输入验收

| 场景 | 结果 | 说明 |
|---|---|---|
| 非手掌图片 | MANUAL_REQUIRED | 用户填写 |
| 模糊图片 | MANUAL_REQUIRED | 用户填写 |
| 偏暗图片 | MANUAL_REQUIRED | 用户填写 |
| 超大图片 | MANUAL_REQUIRED | 用户填写 |
| 非图片文件 | MANUAL_REQUIRED | 用户填写 |
| 重复点击上传 | MANUAL_REQUIRED | 用户填写 |
| 30 秒内重复提交 | MANUAL_REQUIRED | 用户填写 |

## 6. 成本记录

| 测试项 | 是否调用真实 Qwen | 调用次数 | 是否消耗额度 | 说明 |
|---|---|---|---|---|
| 自动化复查 | NO | 0 | NO | Codex 自动化只做 GET 和无效 POST；未触发 provider。 |
| iPhone Safari 真机 | MANUAL_REQUIRED | 用户填写 | 用户填写 | 用户填写 |
| iPhone 微信真机 | MANUAL_REQUIRED | 用户填写 | 用户填写 | 用户填写 |
| Android Chrome 真机 | MANUAL_REQUIRED | 用户填写 | 用户填写 | 用户填写 |
| Android 微信真机 | MANUAL_REQUIRED | 用户填写 | 用户填写 | 用户填写 |

建议真实正常掌纹分析总量控制在 2-4 次内。每次真机真实分析都应记录设备、浏览器 / 微信、图片类型、结果页、海报页、错误表现和额度消耗。不要把图片、base64、raw response 或 key 写入文档或提交到 GitHub。

## 7. 风险与问题

| 风险 / 问题 | 当前状态 | 说明 |
|---|---|---|
| 白屏 | MANUAL_REQUIRED | 真机确认 |
| 卡死 | MANUAL_REQUIRED | 真机确认 |
| 请求超时 | MANUAL_REQUIRED | 真机真实分析确认 |
| 上传失败 | MANUAL_REQUIRED | 相册 / 拍照都需确认 |
| 相册不可选 | MANUAL_REQUIRED | 微信 WebView 重点确认 |
| 拍照不可用 | MANUAL_REQUIRED | 微信 WebView 可能受权限影响 |
| 结果页异常 | MANUAL_REQUIRED | 真机真实分析后确认 |
| 海报保存失败 | MANUAL_REQUIRED | 长按保存 / 系统分享行为需真机确认 |
| 微信 WebView 兼容问题 | MANUAL_REQUIRED | iOS / Android 微信分别确认 |
| Android / iOS 差异 | MANUAL_REQUIRED | 真机确认 |
| 成本异常 | MANUAL_REQUIRED | 用户真实分析后记录调用次数 |
| 日志泄露风险 | PASS_FOR_AUTOMATION | 自动化错误响应未发现 key/base64/raw response/stack 泄露；真机仍需观察页面错误提示。 |

## 8. Stage 6H 结论

- 是否通过自动化线上复查：`PASS`
- 是否完成真机人工验收：`NO`
- 是否仍存在 `MANUAL_REQUIRED`：`YES`
- 是否可以进入 Stage 6I / 发布前收口：`BLOCKED`
- 阻塞项：iPhone Safari、iPhone 微信、Android Chrome、Android 微信真实设备验收未完成。

下一步：用户按第 4、5、6 节清单完成真机测试，并把每台设备的结果反馈给 Codex。最低可进入 Stage 6I 条件收口的真机门槛是 iPhone 微信和 Android 微信各完成 1 轮真实清晰掌纹测试，且没有白屏、卡死、上传完全不可用、结果页完全不可用、海报页完全不可用或敏感信息泄露。iPhone Safari / Android Chrome 如仍未测，必须继续保留为 `MANUAL_REQUIRED` 风险。Codex 只能根据用户真实反馈更新 Stage 6H 结论，不能代填或伪造真机结果。

## 9. 非技术测试速查入口

如果第 4、5、6 节表格太长，可直接使用简化版速查表：

```text
docs/STAGE6H_REAL_DEVICE_QUICK_TEST_PACKET.md
```

该文件只保留用户需要实际操作和回填的最小步骤；完整验收记录仍以本报告为准。

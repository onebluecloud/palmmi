# Stage 6F Mobile / WeChat / E2E Regression Report

Date: 2026-05-21

## Stage 6F-Fix-5 追加记录

用户已运行真实 Qwen 小样本 smoke，输出为脱敏 summary。本轮不继续真实调用 Qwen，不进入 Stage 6G。

真实 smoke 结果：

| 样本 | 结果 | 关键事实 |
|---|---|---|
| not_palm | PASS | `NOT_PALM`，`valid_palm=false`，无人格结果，total_tokens 2189 |
| palm_faint | FAIL_OR_NEEDS_PROMPT_TUNING | `valid_palm=true`，`personality_id=null`，`candidate_count=0`，`ANALYSIS_UNRELIABLE`，total_tokens 2957 |
| palm_clear | FAIL | `valid_palm=true`，`personality_id=null`，`candidate_count=0`，`ANALYSIS_UNRELIABLE`，total_tokens 2957 |

判断：非手掌拦截已经成立；真实手掌没有被误判为非手掌。问题集中在 valid palm 通过后，人格分析 result 没有产出或没有被 parser 接住。

### Stage 6F-Fix-5 修复内容

| 修复项 | 状态 | 说明 |
|---|---|---|
| smoke 只跑 validity / 单次解析风险 | CODE_FIXED_AUTOMATED_PASS | 真实模式改为调用完整 `provider.analyze()` pipeline |
| valid palm 后人格分析 | CODE_FIXED_AUTOMATED_PASS | validity 通过后继续第二阶段分析；低置信但合法人格结果返回 `LOW_CONFIDENCE` |
| prompt 有效手掌 result 要求 | CODE_FIXED_AUTOMATED_PASS | 明确要求 valid palm 必须输出 `result.personality_id` 和 `candidate_results` |
| parser 字段别名 | CODE_FIXED_AUTOMATED_PASS | 支持 `personalityId`、`personality`、`primary_personality_id`、`candidates` / `result.candidates` 等别名 |
| 人格名称映射 | CODE_FIXED_AUTOMATED_PASS | 只允许精确匹配冻结 36 型人格名称，不做模糊猜测 |
| NOT_PALM 拦截 | PASS | 保留非手掌只返回 `NOT_PALM`，不进入人格结果 |
| 默认 P25 / 老干部兜底 | PASS | 未恢复默认人格兜底 |
| 新诊断 | PASS | 新增 `VALIDITY_PASS_RESULT_MISSING` / `SMOKE_PIPELINE_INCOMPLETE` |

### Fix-5 自动化复测结果

| 场景 | 结果 | 说明 |
|---|---|---|
| valid palm must produce personality result | PASS | mock 有效手掌低置信结果返回 `LOW_CONFIDENCE`、`P25`、1 个候选 |
| valid palm without result should not be final success | PASS | 第二阶段缺 result 时返回 `ANALYSIS_UNRELIABLE` + `VALIDITY_PASS_RESULT_MISSING` |
| parser aliases | PASS | 精确人格名称和 candidate aliases 可解析为合法 ID |
| non-palm still rejected | PASS | Fix-4 / Fix-5 回归继续覆盖 `NOT_PALM` |
| smoke dry run | PASS | 无 `--real` 输出 `REAL_QWEN_DISABLED`，`api_calls_made=0` |

Fix-5 后尚未重新运行真实 Qwen smoke。Stage 6G 继续 `BLOCKED`，直到真实 Qwen 小样本、安卓微信和 iOS 微信真机验收补齐。

## Stage 6F-Real-Qwen-Smoke 追加记录

本轮不是 Stage 6G，也不继续盲修业务逻辑。本轮新增一个人工显式触发的真实 Qwen API 小样本验收脚本，用来验证当前 prompt / parser / contract 在真实 Qwen 返回下是否成立。

当前背景：

- Fix-4 部署后，用户安卓微信复测确认啤酒 / 饮料图已能返回 `NOT_PALM`。
- 真实手掌图仍可能被误杀为 `ANALYSIS_UNRELIABLE`。
- 需要用用户本地三张测试图片做真实 Qwen 小样本 smoke，但 Codex 不默认调用真实 Qwen。

```text
Real Qwen smoke script: READY
Real Qwen smoke result: NOT_RUN
Android WeChat: MANUAL_RETEST_REQUIRED
iOS WeChat: MANUAL_REQUIRED
Stage 6G: BLOCKED
```

### Real Qwen Smoke 脚本

| 项目 | 状态 | 说明 |
|---|---|---|
| 脚本路径 | READY | `scripts/stage6f/real-qwen-smoke.cjs` |
| package script | READY | `npm run smoke:stage6f:qwen` |
| 默认真实调用 | DISABLED | 无 `--real` 时输出 `REAL_QWEN_DISABLED`，不调用 Qwen |
| 用户图片目录 | READY | `E:\其他\Palmmi\Palmmi-test-images`，不复制、不提交 |
| 目录模式 | READY | 支持 `--image-dir "E:\其他\Palmmi\Palmmi-test-images"` |
| 显式路径模式 | READY | 支持 `--not-palm` / `--palm-faint` / `--palm-clear` |
| 样本数量 | LIMITED | 最多处理 3 张图片：非手掌、掌纹偏淡、清晰手掌 |
| Key 读取 | READY | `PALMMI_QWEN_API_KEY` -> `QWEN_API_KEY` -> `DASHSCOPE_API_KEY` |
| 输出 | PASS | 只输出脱敏 summary，不输出 Key / Token / base64 / raw Qwen response |
| CI / Stage6F 默认测试 | PASS | 不纳入真实 API 默认流程；`test:stage6f` 只验证 dry run |

### Real Qwen Smoke 预期判定

| 样本 | 期望 | 未通过时含义 |
|---|---|---|
| not_palm | `NOT_PALM`，无人格结果 | 如果是 `REQUEST_TIMEOUT` / `ANALYSIS_UNRELIABLE` / 任意人格，说明无效图闸门仍需调 |
| palm_faint | `LOW_CONFIDENCE` 或有效人格 | 如果是 `ANALYSIS_UNRELIABLE`，说明 parser / prompt 可能过严 |
| palm_clear | `OK` / `LOW_CONFIDENCE` 且有合法人格 | 如果仍失败，说明真实 Qwen prompt / parser contract 未成立 |

Codex 本轮没有运行 `--real`，没有读取用户本地图片，没有输出 raw Qwen response。用户后续需要显式运行：

```powershell
npm run smoke:stage6f:qwen -- --real --image-dir "E:\其他\Palmmi\Palmmi-test-images"
```

## Stage 6F-Fix-4 追加记录

用户确认 Cloudflare Production 已部署到 `aa51bf5bdfe1822cb98059878ab3c74f6cb5e708` 后，在安卓微信真机复测非手掌啤酒 / 饮料图：

- “检查照片”显示基础检查通过。
- 点击“开始分析”后未再显示 `P25 老干部`。
- 最终显示 `REQUEST_TIMEOUT`。

判断：Fix-3 已基本阻断默认人格兜底，但 `NOT_PALM` gate 仍不稳定；非手掌图不应进入完整人格分析流程直到超时。本轮进入 Stage 6F-Fix-4，不进入 Stage 6G。

Stage 6F-Fix-4 结论：`CODE_FIXED_MANUAL_RETEST_REQUIRED`

```text
Android WeChat: MANUAL_RETEST_REQUIRED
iOS WeChat: MANUAL_REQUIRED
Stage 6G: BLOCKED
```

### Stage 6F-Fix-4 修复内容

| 修复项 | 状态 | 修复方式 |
|---|---|---|
| 非手掌图返回 `REQUEST_TIMEOUT` | CODE_FIXED_AUTOMATED_PASS | Qwen provider 改为先发极简有效性预检；非手掌只跑预检并直接返回 `NOT_PALM` |
| 非手掌进入人格分析 | CODE_FIXED_AUTOMATED_PASS | 只有预检确认清晰单手掌心后才发第二阶段人格分析请求 |
| `validity` 缺失 | CODE_FIXED_AUTOMATED_PASS | parser 记录 `hasValidity`；缺失时返回 `ANALYSIS_UNRELIABLE`，不补人格 |
| 真实 fetch timeout | CODE_FIXED_AUTOMATED_PASS | 只有 `AbortError` / 真实请求超时返回 `REQUEST_TIMEOUT` |
| 前端错误码区分 | PASS | 现有上传页映射保留 `NOT_PALM` / `IMAGE_NOT_CLEAR` / `ANALYSIS_UNRELIABLE` / `REQUEST_TIMEOUT` 独立文案 |

### Fix-4 自动化复测结果

| 场景 | 结果 | 说明 |
|---|---|---|
| 非手掌图片不应超时 | PASS | mock 饮料图只触发 1 次有效性请求，返回 `NOT_PALM`，不返回 `REQUEST_TIMEOUT` |
| validity 缺失测试 | PASS | 返回 `ANALYSIS_UNRELIABLE`，不返回 P25 / `REQUEST_TIMEOUT` |
| fetch timeout 测试 | PASS | 模拟真实 abort 时返回 `REQUEST_TIMEOUT` |
| `npm run test:stage6f` | PASS | Fix-4 子项全部通过；测试仍记录当前线上真实上传旧链路状态，等待本次部署后真机复测 |

Codex 没有把安卓微信真机结果写成 PASS。Fix-4 部署后仍需要用户在安卓微信复测非手掌图片是否稳定显示 `NOT_PALM`。

## Stage 6F-Fix-3 追加记录

用户在 Stage 6F-Fix-2 后进行了安卓微信真机复测，发现仍有严重问题。本轮进入 Stage 6F-Fix-3，不进入 Stage 6G。

Stage 6F-Fix-3 结论：`CODE_FIXED_MANUAL_RETEST_REQUIRED`

Stage 6G：`BLOCKED`

```text
Android WeChat: MANUAL_RETEST_REQUIRED
iOS WeChat: MANUAL_REQUIRED
Stage 6G: BLOCKED
```

### Stage 6F-Fix-2 后真机失败记录

| 问题 | 安卓微信真机表现 | 判断 |
|---|---|---|
| 非手掌图片被分析成人格 | 啤酒 / 饮料图通过“检查照片”，并最终进入 `P25 老干部` 结果 | 上传页基础检查文案误导，服务端没有强制 palm validity，normalize / fallback 存在人格塌缩风险 |
| 多个手掌疑似塌缩为 P25 | 多张不同手掌均倾向 `P25 老干部 / M1` | 解析失败、字段不足或默认候选不能兜底成任何人格 |
| 海报生成失败 | 结果页可展示文字，但海报页提示“照片掌纹不够清晰 / 字段缺失” | 结果页与海报页使用的字段契约不一致 |

这些问题不能记录为 PASS。Stage 6G 继续阻塞。

### Stage 6F-Fix-3 修复内容

| 修复项 | 状态 | 修复方式 |
|---|---|---|
| 非手掌图片被分析成人格 | CODE_FIXED_AUTOMATED_PASS | Qwen provider 先校验 `validity.is_palm_photo`、`is_single_hand`、`is_palm_side_visible`、`palm_lines_visible`，不满足直接返回 `NOT_PALM` / `IMAGE_NOT_CLEAR` |
| P25 默认人格兜底 | CODE_FIXED_AUTOMATED_PASS | 移除解析层默认手掌有效；缺失 `personality_id`、未知人格、低置信度或缺少掌纹信号时返回 `ANALYSIS_UNRELIABLE`，不写入人格结果 |
| 检查照片误导文案 | CODE_FIXED_AUTOMATED_PASS | 文案改为“照片已通过基础检查。开始分析后会继续判断是否为清晰掌心照片。” |
| 结果页 / 海报页 contract 不一致 | CODE_FIXED_AUTOMATED_PASS | `analysis_result` 补充 `valid_palm`、`poster_title`、`poster_subtitle`、`poster_quote`，结果页和海报页读取同一稳定脱敏 contract |
| 有效结果无法生成海报 | CODE_FIXED_AUTOMATED_PASS | 有效人格结果从冻结展示内容补齐海报最低字段；无效结果禁止生成海报并提示重拍 |

### 新增错误状态

| 错误码 | 使用场景 |
|---|---|
| `NOT_PALM` | 图片不是单手掌、掌心不可见、手背 / 物品 / 饮料 / 多手 / 风景等无效输入 |
| `ANALYSIS_UNRELIABLE` | Qwen 返回低置信度、缺少人格 ID、未知人格 ID、缺少掌纹信号或候选结果不足 |
| `IMAGE_NOT_CLEAR` | 是手掌但掌纹不可见、模糊、过暗或裁切影响识别 |

无效图片、非手掌图片和不可靠分析不会写入 `palmmi:last-analysis` 为人格结果，也不会沿用上一次有效人格当作新结果。

### Stage 6F-Fix-3 自动化复测结果

| 场景 | 结果 | 说明 |
|---|---|---|
| `npm run test:stage6f` | PASS | Fix-3 新增回归均通过；测试输出仍记录线上当前已部署真实上传存在旧版本失败项，等待本次部署后真机复测 |
| 非手掌图片测试 | PASS | mock `NOT_PALM` 后停留上传页，不展示 / 不写入 `P25 老干部` |
| P25 默认兜底测试 | PASS | 残缺 API mock 返回 `ANALYSIS_UNRELIABLE`，不展示 P25 / 老干部 |
| 多次分析隔离测试 | PASS | 第一次有效 P25 保存后，第二次非手掌不覆盖旧结果，也不把旧 P25 显示为新结果 |
| Poster contract 测试 | PASS | 有效人格结果可生成基础海报，不显示字段缺失 |
| 无效结果禁止海报 | PASS | `NOT_PALM` / 无效结果禁止海报并提示重新拍摄 |
| 服务端 palm validity contract | PASS | 非手掌返回 `NOT_PALM`；低信号残缺返回 `ANALYSIS_UNRELIABLE` |

### Stage 6F-Fix-3 微信状态

| 项目 | 状态 |
|---|---|
| 安卓微信打开首页 | MANUAL_RETEST_REQUIRED |
| 安卓微信非手掌图片拒绝 | MANUAL_RETEST_REQUIRED |
| 安卓微信多手掌不塌缩 P25 | MANUAL_RETEST_REQUIRED |
| 安卓微信生成海报 | MANUAL_RETEST_REQUIRED |
| iPhone 微信打开首页 | MANUAL_REQUIRED |
| iPhone 微信上传图片 | MANUAL_REQUIRED |
| iPhone 微信进入结果页 | MANUAL_REQUIRED |
| iPhone 微信进入海报页 | MANUAL_REQUIRED |

Codex 没有把微信真机修复伪造成 PASS。本轮只能写代码修复和自动化通过，不能替代安卓微信 / iPhone 微信真机验收。

## Stage 6F-Fix-2 追加记录

用户在 Stage 6F-Fix 后进行了安卓微信真机复测，发现 Stage 6F-Fix 没修干净。本轮进入 Stage 6F-Fix-2，不进入 Stage 6G。

Stage 6F-Fix-2 结论：`CODE_FIXED_MANUAL_RETEST_REQUIRED`

Stage 6G：`BLOCKED`

```text
Android WeChat: MANUAL_RETEST_REQUIRED
iOS WeChat: MANUAL_REQUIRED
Stage 6G: BLOCKED
```

### Stage 6F-Fix 后真机失败记录

| 问题 | 安卓微信真机表现 | 判断 |
|---|---|---|
| 拍照上传后分析失败 | “检查照片”通过，点击“开始分析”后进入分析中，最终显示“当前分析结果暂时无法读取，请重新上传后再试” | 上传页到分析页的跨页流程丢失拍照 File / Blob 或当前任务状态 |
| 本地相册图片分析超时 | 约 2.5MB 相册图检查通过，点击“开始分析”后显示“当前分析服务响应超时，请稍后再试” | 原图 / base64 体积过大，微信 WebView 下真实请求链路容易超时 |

这些问题不能记录为 PASS。Stage 6G 继续阻塞。

### Stage 6F-Fix-2 修复内容

| 修复项 | 状态 | 修复方式 |
|---|---|---|
| 安卓微信拍照后结果无法读取 | CODE_FIXED_AUTOMATED_PASS | 上传页在同一 JS 上下文内完成 decode、压缩、API 请求、结果写入和回读；API 成功后才跳转 `/result/` |
| 相册图片分析超时 | CODE_FIXED_AUTOMATED_PASS | 请求前客户端压缩为 JPEG，避免 2.5MB 左右原图直接转 base64 送分析 |
| `/result/` 承担分析任务 | FIXED | `/result/` 只读取已成功写入的 `palmmi:last-analysis` |
| `/analysis/` 跨页读取 File | FIXED_FOR_UPLOAD_FLOW | 上传页不再把真实分析任务交给跨页 File / session 状态；`/analysis/` 仅保留兼容和测试态 |
| 结果写入顺序 | PASS | API success -> save sanitized result -> readback -> navigate `/result/` |
| 超时处理 | PASS | `REQUEST_TIMEOUT` 留在上传页，不清空上一次有效结果，不显示 `RESULT_READ_FAILED` |

### 图片压缩策略

| 项 | 策略 |
|---|---|
| 浏览器能力 | `Image` / `createImageBitmap` + `canvas` + `canvas.toBlob` |
| 输出格式 | JPEG |
| 首选最长边 | 1280px |
| 回退最长边 | 1024px |
| 首选质量 | 0.82 |
| 回退质量 | 0.75 |
| 目标体积 | 优先小于约 1.2MB |
| 失败回退 | 压缩失败时仅在当前请求中临时回退原图，不写入 localStorage / sessionStorage，不记录 base64 |

Stage 6F-Fix-2 自动化中，2MB+ `camera.jpg` 模拟文件压缩为约 659KB 后再请求 API。

### 错误状态拆分

| 错误码 | 展示策略 |
|---|---|
| `UPLOAD_STATE_LOST` | 当前上传状态已丢失，请重新选择照片后再试 |
| `REQUEST_TIMEOUT` | 当前分析服务响应超时，请稍后重试，或换一张更清晰、文件更小的照片 |
| `RESULT_READ_FAILED` | 未找到可展示的分析结果，请重新分析 |
| `RESULT_WRITE_FAILED` | 分析结果暂时无法保存，请重新分析 |
| `IMAGE_NOT_CLEAR` | 请重新拍摄一张掌纹完整、光线均匀的掌心照片 |
| `API_REQUEST_FAILED` | 分析服务暂时不可用，请稍后重试 |

请求超时不会再显示成结果读取失败；结果读取失败也不会覆盖请求超时。

### Stage 6F-Fix-2 复测结果

| 命令 / 场景 | 结果 | 说明 |
|---|---|---|
| `npm run test:stage6f` | PASS | Fix-2 本地回归通过；后续 Fix-3 测试输出仍记录当前已部署线上版本存在旧问题，等待本次部署后复测 |
| Fix-2 拍照大图模拟 | PASS | API pending 时仍停留上传页；API 成功写入 `palmmi:last-analysis` 后跳转结果页 |
| Fix-2 相册超时模拟 | PASS | 显示 `REQUEST_TIMEOUT`；不跳转结果页；不清空上一次有效结果 |
| localStorage / sessionStorage 脱敏 | PASS | 未发现 Key / Token / base64 / raw response |
| 非图片 / 超大图片 | PASS | 上传页稳定错误态，不白屏 |

### Stage 6F-Fix-2 微信状态

| 项目 | 状态 |
|---|---|
| 安卓微信拍照上传 | MANUAL_RETEST_REQUIRED |
| 安卓微信相册上传 | MANUAL_RETEST_REQUIRED |
| 安卓微信进入结果页 | MANUAL_RETEST_REQUIRED |
| 安卓微信进入海报页 | MANUAL_RETEST_REQUIRED |
| iPhone 微信打开首页 | MANUAL_REQUIRED |
| iPhone 微信上传图片 | MANUAL_REQUIRED |
| iPhone 微信进入结果页 | MANUAL_REQUIRED |
| iPhone 微信进入海报页 | MANUAL_REQUIRED |

Codex 没有把微信真机测试伪造成 PASS。本轮只能写代码修复和自动化通过，不能替代安卓微信 / iPhone 微信真机验收。

## Stage 6F-Fix 追加记录

用户在安卓微信真机测试中发现 3 个真实问题：结果页展示半残缺结果、第二次重新测试后结果读取失败、上传页“检查照片”按钮点击无明确反应。本轮进入 Stage 6F-Fix，不进入 Stage 6G。

Stage 6F-Fix 结论：`CONDITIONAL_PASS`

原因：代码层修复和自动化回归已通过，但用户尚未提供修复后的安卓微信 / iOS 微信真机复测结果。

```text
WeChat Android: FIXED_BY_CODE_REVIEW_AND_AUTOMATED_TEST, MANUAL_RETEST_REQUIRED
WeChat iOS: MANUAL_REQUIRED
```

### Stage 6F-Fix 修复摘要

| 问题 | 修复状态 | 修复方式 |
|---|---|---|
| 结果字段暂时不完整 / 暂无详细描述 / 暂无掌纹依据 | FIXED_BY_CODE_REVIEW_AND_AUTOMATED_TEST | `analysis_result` 增加稳定展示字段；按 `personality_id` 读取冻结展示内容补齐 Pxx 结果；无法补齐时进入 `IMAGE_NOT_CLEAR`，提示重拍 |
| 第二次重新测试后结果读取失败 | FIXED_BY_CODE_REVIEW_AND_AUTOMATED_TEST | 新增稳定 key `palmmi:last-analysis`；成功 normalize 后先写结果再跳转；API 失败不清空上一次有效结果；结果页 / 海报页同源读取 |
| “检查照片”按钮不可点击 / 点击无反应 | FIXED_BY_CODE_REVIEW_AND_AUTOMATED_TEST | 上传页按钮执行本地图片检查：是否选择、类型、大小、decode、尺寸；成功 / 失败均给明确提示 |

### Stage 6F-Fix 结果契约

后端返回的 `analysis_result` 继续保留 Stage 5 既有契约，同时补充前端稳定展示字段：

| 字段 | 状态 |
|---|---|
| `personality_id` / `personality_name` | REQUIRED |
| `main_line_type` | REQUIRED |
| `title` / `summary` / `description` | REQUIRED，优先来自冻结展示内容 |
| `evidence` / `features` / `traits` / `match_reason` | REQUIRED |
| `candidate_results` | REQUIRED，脱敏候选列表 |
| `quality_status` | `OK` / `LOW_CONFIDENCE` / `IMAGE_NOT_CLEAR` / `PARTIAL` |
| `user_message` | REQUIRED，低质量照片时提示重拍 |

如果 `personality_id` 能匹配冻结展示资料，则只补齐展示字段，不改 Stage 3 规则、权重、阈值或 36 型人格内容。如果无法可靠补齐，则结果页和海报页不再渲染半残缺人格结果，改为提示“这张照片掌纹不够清晰，请重新拍摄后再试。”

### Stage 6F-Fix 存储策略

| 项 | 结果 |
|---|---|
| 稳定结果 key | `palmmi:last-analysis` |
| 兼容旧结果 key | `palmmi:lastAnalysisResult` |
| 写入顺序 | API 成功后写入脱敏完整结果，再进入结果页 |
| API 失败 | 不清空上一次有效结果，只写入脱敏错误状态 |
| 图片 base64 | 不写入结果 key |
| raw Qwen response | 不写入结果 key |
| Key / Token | 不写入结果 key |

### Stage 6F-Fix 复测结果

| 命令 / 场景 | 结果 | 说明 |
|---|---|---|
| `npm run test:stage6f` | PASS | 覆盖检查照片按钮、稳定存储、结果页 / 海报页读取、二次失败不丢结果、残缺结果不展示半成品 |
| 检查照片按钮 | PASS | Fix-3 后选择图片并检查时只提示“照片已通过基础检查。开始分析后会继续判断是否为清晰掌心照片。” |
| 稳定结果读取 | PASS | `/result/` 和 `/poster/` 可读取同一个稳定结果 |
| 二次分析失败保护 | PASS | 第二次 API 失败不会清空第一次成功结果 |
| 残缺结果处理 | PASS | 未补齐结果进入重拍提示，不再展示半残缺字段 |
| localStorage / sessionStorage 脱敏 | PASS | 未发现 Key / Token / base64 / raw response |

### Stage 6F-Fix 微信状态

| 项目 | 状态 |
|---|---|
| 安卓微信打开首页 | MANUAL_RETEST_REQUIRED |
| 安卓微信上传图片 | MANUAL_RETEST_REQUIRED |
| 安卓微信进入结果页 | MANUAL_RETEST_REQUIRED |
| 安卓微信进入海报页 | MANUAL_RETEST_REQUIRED |
| iPhone 微信打开首页 | MANUAL_REQUIRED |
| iPhone 微信上传图片 | MANUAL_REQUIRED |
| iPhone 微信进入结果页 | MANUAL_REQUIRED |
| iPhone 微信进入海报页 | MANUAL_REQUIRED |

Codex 没有把微信真机修复伪造成 PASS。安卓微信问题仅能写为 `FIXED_BY_CODE_REVIEW_AND_AUTOMATED_TEST, MANUAL_RETEST_REQUIRED`。

## 1. 本次修改文件列表

| 文件 | 类型 | 说明 |
|---|---|---|
| `docs/STAGE6F_MOBILE_WECHAT_E2E_REPORT.md` | 文档 | 更新 Stage 6F-Fix 真机问题修复记录 |
| `docs/STAGE6_STATE.md` | 文档 | 更新 Stage 6F-Fix 当前状态 |
| `tests/stage6f/mobile-e2e.test.cjs` | 测试 | 补充检查照片、稳定存储、二次分析、残缺结果回归 |
| `scripts/palmmi-upload.js` | 前端 | 修复“检查照片”按钮和本地图片检查 |
| `scripts/palmmi-analyze.js` | 前端 | 修复稳定结果 key 和失败不清空有效结果 |
| `scripts/palmmi-result.js` | 前端 | 修复残缺结果展示为重拍提示 |
| `scripts/palmmi-poster.js` | 前端 | 同步修复海报页残缺结果处理 |
| `scripts/palmmi-stage5.js` | 前端兼容 | 失败保存错误时不清空已有有效结果 |
| `src/stage5/analysis-result-contract.js` | 结果契约 | 从冻结展示内容补齐稳定展示字段 |
| `src/stage5/analysis-result-read-adapter.js` | 结果读取 | 透出稳定展示字段 |
| `src/stage5/analysis-result-storage-reader.js` | 结果读取 | 支持 `palmmi:last-analysis` 和旧 key fallback |
| `src/stage5/page-analysis-reader.js` | 结果读取 | 结果页 / 海报页读取稳定展示字段 |

未新增 `package-lock.json`。未新增支付、打赏、登录、宣发或长期图片存储。未修改 Stage 3 规则、权重、阈值或 Stage 5 VLM 主逻辑。

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

是否可以进入 Stage 6G: BLOCKED

条件：本次 Fix-5 部署后，必须补充真实 Qwen 小样本复测、安卓微信拍照上传、相册上传、非手掌稳定 `NOT_PALM` 且不超时、多手掌不塌缩 P25、海报生成和 iPhone 微信真机测试；在用户提供真实复测通过结果前，不允许进入 Stage 6G。建议同时补充偏暗、模糊、裁切不完整的明确图片 fixture。

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
| 是否可以进入 Stage 6G | FAIL | Fix-5 后仍需真实 Qwen 小样本复测、安卓微信复测和 iOS 微信真机测试 |

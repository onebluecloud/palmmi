# Palmmi Stage 6 状态记录

## 当前阶段

Stage 6F：Final-Classifier-Hard-Fix-2 代码层已完成，真实 collapse smoke 和微信真机仍需复测。

Stage 6F status: FINAL_CLASSIFIER_HARD_FIX_2_CODE_PASS / REAL_COLLAPSE_SMOKE_REQUIRED / ANDROID_WECHAT_RETEST_REQUIRED

Stage 6G: BLOCKED

Reason: 用户真实 5 手掌 smoke 已证明 commit `66f83452894b6ea0db785ebefe2cb08c10b33ba1` 仍不能进入 Stage 6G：not-palm PASS，但 5 张 palm 全部 `LOW_INFORMATION_FEATURE_SET`，`api_calls_made=11`，且 debug 缺失、collapse_analysis 将 palm 统计为 0。本轮修复中文 / 别名 palm_features normalize、放宽 feature information gate、LOW_INFORMATION debug 输出，以及 `ALL_PALM_LOW_INFORMATION` hard fail。Stage 6G 仍 BLOCKED，原因是新 commit 仍需真实 collapse smoke、安卓微信最终真机复测和 iOS 微信真机验收。

## 已完成

- Stage 1-5 已完成 / 冻结。
- Stage 6A：部署方案确认已完成。
- Stage 6B：环境变量与密钥管理已完成。
- Stage 6C：Cloudflare Pages Preview / Dry Run 已完成。
- Stage 6D：图片上传与临时缓存策略已完成。
- Stage 6E：公网真实 Qwen 链路验证已完成。
- Stage 6E-Fix：公网 Qwen 请求失败修复已完成，状态 PASS。
- Stage 6F：移动端模拟、生产页面访问、安全扫描和微信人工闸门已完成。
- Stage 6F Smoke Script Fix：
  - 修复 `scripts/stage6f/real-qwen-smoke.cjs` 的 collapse-check 选择逻辑。
  - `--image-dir` 下可自动识别 `not-palm-beer.jpg` 和 `palm-1.jpg` 到 `palm-5.jpg`。
  - `--collapse-check --min-palm-samples 5` 不再强制要求 `palm-faint` / `palm-clear`。
  - 支持重复 `--palm-sample <path>` 显式传入多张真实手掌样本。
  - 预计调用次数按 `not_palm_count * 1 + palm_sample_count * 2` 计算；1 张 not-palm + 5 张 palm + 1 模型估算为 11 次，`--max-real-calls 12` 可运行。
  - 样本不足返回 `INSUFFICIENT_PALM_SAMPLES`，not-palm 缺失返回 `NOT_PALM_SAMPLE_MISSING`，超过上限返回 `MAX_REAL_CALLS_EXCEEDED`，均不调用 Qwen。
  - 无 `--real` 仍输出 `REAL_QWEN_DISABLED`，`api_calls_made=0`。
- Stage 6F-Final-Classifier-Hard-Fix-2：
  - 记录真实 5 手掌 smoke 失败：not-palm PASS，5 张 palm 全部 `LOW_INFORMATION_FEATURE_SET`，`api_calls_made=11`。
  - 修复 `--debug-classifier` 下 LOW_INFORMATION 结果没有 `classifier_debug` 的问题。
  - 增强 Qwen `palm_features` normalize：支持中文值和字段别名。
  - 放宽 feature information gate：all unknown 继续阻断；2 个可用高信号字段可进入 `LOW_CONFIDENCE` 分类，不直接误杀。
  - 修复 collapse_analysis：5 张 palm 全 LOW_INFORMATION 时统计为 `palm_sample_count=5`、`low_information_count=5`、`hard_fail=true`、`diagnostic_code=ALL_PALM_LOW_INFORMATION`。
  - 保留 NOT_PALM 拦截和有效 LOW_CONFIDENCE 海报能力。
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
- Stage 6F-Fix-4：
  - Qwen provider 拆分为极简有效性预检和通过后的第二阶段人格分析。
  - 非手掌 / 饮料 / 物品图只跑有效性预检；未通过时直接返回 `NOT_PALM`。
  - `validity` 缺失返回 `ANALYSIS_UNRELIABLE`，不能变成 `NOT_PALM`、`REQUEST_TIMEOUT` 或人格结果。
  - 真实 fetch abort / 超时才返回 `REQUEST_TIMEOUT`。
  - `npm run test:stage6f` 已覆盖 Fix-4 非手掌不超时、validity 缺失和真实 fetch timeout 回归并通过。
- Stage 6F-Real-Qwen-Smoke：
  - 新增 `scripts/stage6f/real-qwen-smoke.cjs`。
  - 新增 `npm run smoke:stage6f:qwen`，默认无 `--real` 时只输出 `REAL_QWEN_DISABLED`，不调用真实 Qwen。
  - 支持用户本地目录 `E:\其他\Palmmi\Palmmi-test-images` 的 `--image-dir` 自动识别，以及 `--not-palm` / `--palm-faint` / `--palm-clear` 显式路径模式。
  - 支持 `--timeout-ms`、`--model`，Key 读取顺序为 `PALMMI_QWEN_API_KEY`、`QWEN_API_KEY`、`DASHSCOPE_API_KEY`。
  - 真实运行最多处理 3 个样本；完整 `provider.analyze()` 对有效手掌会执行两阶段，真实 Qwen API 调用次数可能达到 5 次；输出脱敏 summary，不输出 Key / Token / base64 / raw Qwen response，不提交图片。
  - Real Qwen smoke script: READY
  - Real Qwen smoke result: PASS_AFTER_FIX5
- Stage 6F-Fix-5：
  - 真实 smoke 结果记录：not_palm PASS，`NOT_PALM`，total_tokens 2189。
  - 真实 smoke 结果记录：palm_faint FAIL，`valid_palm=true`、`personality_id=null`、`candidate_count=0`、`ANALYSIS_UNRELIABLE`，total_tokens 2957。
  - 真实 smoke 结果记录：palm_clear FAIL，`valid_palm=true`、`personality_id=null`、`candidate_count=0`、`ANALYSIS_UNRELIABLE`，total_tokens 2957。
  - 修复 smoke 脚本：真实模式改为调用完整 `provider.analyze()`，不再只用单次 `fetchAndParse` 代表完整 pipeline。
  - 修复 provider：validity 通过后必须执行人格分析阶段；低置信但合法人格结果进入 `LOW_CONFIDENCE`，不直接误杀。
  - 修复 parser：支持 `personalityId`、`personality`、`primary_personality_id`、`candidates` / `result.candidates` 等真实字段别名；人格名称只做冻结 36 型人格精确匹配。
  - 新增诊断：`VALIDITY_PASS_RESULT_MISSING`、`VALIDITY_PASS_FEATURES_MISSING`、`SMOKE_PIPELINE_INCOMPLETE`。
  - 保留 `NOT_PALM` 拦截和禁止默认 P25 / 老干部兜底。
- Stage 6F Real Qwen Smoke after Fix-5：
  - 总体结果：PASS。
  - `not_palm`：PASS，`NOT_PALM`，`valid_palm=false`，`has_personality_result=false`，`personality_id=null`，total_tokens 1817。
  - `palm_faint`：PASS_OR_REVIEW，`actual_code=OK`，`quality_status=LOW_CONFIDENCE`，`valid_palm=true`，`personality_id=P25`，`has_personality_result=true`，`candidate_count=3`，total_tokens 3141。
  - `palm_clear`：PASS，`actual_code=OK`，`quality_status=LOW_CONFIDENCE`，`valid_palm=true`，`personality_id=P25`，`has_personality_result=true`，`candidate_count=3`，total_tokens 3156。
  - `api_calls_made=5`，符合完整 pipeline 的两阶段调用成本预期修正。
  - 未输出 Key / Token / base64 / raw Qwen response。
  - 两张手掌均返回 P25：当前不判定失败，但后续安卓微信多图复测必须继续观察是否存在人格塌缩。
- Stage 6F-Final-Stabilization：
  - 生产默认模型保持 `qwen3-vl-flash`，未直接切换到 `qwen3.6-flash`。
  - provider 支持显式 `model`、`PALMMI_QWEN_MODEL`、`QWEN_MODEL`，优先级为显式参数 > `PALMMI_QWEN_MODEL` > `QWEN_MODEL` > 默认 `qwen3-vl-flash`。
  - `scripts/stage6f/real-qwen-smoke.cjs` 支持 `--models`、`--collapse-check`、`--max-real-calls`，可人工执行 `qwen3-vl-flash` vs `qwen3.6-flash` A/B smoke。
  - smoke 默认无 `--real` 仍输出 `REAL_QWEN_DISABLED`，不调用真实 Qwen。
  - 标准 3 样本 x 2 模型预计最多 10 次真实 Qwen API 调用；如果目录中加入更多 palm 样本且预计调用超过 `--max-real-calls`，脚本会拒绝运行。
  - Qwen prompt 增加反塌缩约束：先提取 palm features，再输出 top 3 candidates，每个候选必须给出掌纹特征理由。
  - 合法 P25 允许展示，但必须有具体 palm feature reason；缺少 reason 的 P25 返回 `ANALYSIS_UNRELIABLE`，不允许作为默认兜底。
  - parser 增加 `candidate_count`、`top_candidate_id`、`has_collapse_guard`、`low_confidence`、`collapse_risk_hint` 诊断。
  - 多图 smoke 中 3 个及以上 palm 样本全部同一人格时标记 `PERSONALITY_COLLAPSE_RISK`，但不自动修改人格结果。
  - `LOW_CONFIDENCE` + `valid_palm=true` + 合法人格结果允许生成基础海报；`NOT_PALM` / `ANALYSIS_UNRELIABLE` 仍禁止生成海报。
  - poster 页增加 `POSTER_RESULT_READ_FAILED`、`POSTER_CONTRACT_INVALID`、`POSTER_NOT_ALLOWED_FOR_INVALID_IMAGE` 错误码。
  - `npm run test:stage6f` 已覆盖 Final Stabilization mock 回归并通过；当前生产旧部署仍需等待本次提交部署后由用户复测。
- Stage 6F-Final-Fix：
  - 已记录用户真实 A/B smoke：两个模型均稳定返回 `NOT_PALM`；两张手掌均输出主结果 `P25`，但 candidate hints 不包含 P25。
  - `A/B result: inconclusive for model switch.` 生产默认继续 `qwen3-vl-flash`，不切 `qwen3.6-flash`。
  - Qwen prompt 改为只提取 palm validity / palm_features；Qwen 的 personality / candidate hints 不再作为最终主结果。
  - 最终人格由本地 Stage 3 / Stage 5 classifier 计算；`personality_id` 必须等于 `candidate_results[0].personality_id`。
  - smoke summary 的 `candidate_ids` 改为来自本地 `analysis_result` contract，不再输出 Qwen raw candidate hints。
  - poster 增加 `POSTER_MAIN_CANDIDATE_MISMATCH`；`LOW_CONFIDENCE` 有效人格结果仍允许生成基础海报。
  - `npm run test:stage6f` 已覆盖 Final-Fix mock 回归：主结果候选一致、LOW_CONFIDENCE 海报、非手掌禁止海报、缺失人格不默认 P25、classifier deterministic。
- Stage 6F-Classifier-Calibration：
  - 已记录用户安卓微信复测：非手掌识别通过、手掌识别通过、海报生成通过，但多个手掌主结果塌缩为 `P31 留一手`。
  - 未发现默认 `P31 留一手` 兜底；`留一手` 只存在于 Stage3 冻结 persona catalog / 文档映射中。
  - 根因定位为 Stage5 adapter 没有把 Qwen 高层 `main_line_type` 保留下来，且未知 / 低信息字段以 0 进入规则时容易误命中 P31 的低值规则。
  - 已保留 Stage3 规则 / 权重 / 阈值 / 36 型人格正文不变；仅在 Stage5 adapter 增加多维 `palm_features` 校准。
  - classifier 现在使用 `main_line_type`、`line_depth`、`line_complexity`、`line_continuity`、`branch_density`、`palm_shape_hint`、`confidence` 生成本地 rule input。
  - `candidate_results` 增加 `confidence`、`reason`、`score_breakdown`，用于诊断不是默认人格。
  - smoke collapse 诊断增加 `candidate_distribution`；3 个及以上 palm 样本全部同一人格时输出 `PERSONALITY_COLLAPSE_RISK`，全部 P31 时记录 `All tested palm samples collapsed to 留一手.`
  - `npm run test:stage6f` 已覆盖 no-default-留一手、不同特征不同候选、deterministic、score_breakdown、poster 和 NOT_PALM 回归。
- Stage 6F-Final-Classifier-Hard-Fix：
  - 已记录 `f3d2afdc93aa87b58b54436616e13562d18434a7` 安卓微信真机复测失败：多个不同手掌仍全部输出 `P31 留一手`，不能再作为可接受版本。
  - 新增 `LOW_INFORMATION_FEATURE_SET`：`valid_palm=true` 但 `main_line_type` 缺失或 6 个核心 palm features 中可用字段少于 3 个时，不输出任何人格。
  - unknown / unclear 特征不再能通过低信息路径误命中 P31；`LOW_CONFIDENCE` 只影响置信度，不决定人格。
  - classifier diagnostics 增加 `scoreMargin`、`unknownFeatureCount`、`usableFeatureCount`、`collapseRiskHint`、`classifierVersion`。
  - 合法 P31 必须是 `candidate_results[0]`，并且有非空 feature reason 与 `score_breakdown`；不得来自 fallback。
  - real Qwen smoke 支持 `--debug-classifier`、`--min-palm-samples`、`--min-unique-personalities`；5 张 palm 少于 2 个不同人格时 hard fail，全部 P31 时输出 `P31_COLLAPSE_CONFIRMED` 且 `ok=false`。
  - `npm run test:stage6f` 已覆盖 all unknown、低信息特征、5 组 mock 多样性、P31 合法依据、deterministic、海报和 NOT_PALM 回归。

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

Stage 6F-Fix-3 部署到 `aa51bf5bdfe1822cb98059878ab3c74f6cb5e708` 后，用户在安卓微信内置浏览器中继续复测非手掌图：

| 问题 | 真机表现 | 判断 |
|---|---|---|
| 非手掌图没有出人格但返回超时 | 啤酒 / 饮料图基础检查通过，开始分析后显示 `REQUEST_TIMEOUT` | 默认人格兜底大概率已修复，但 `NOT_PALM` gate 未稳定命中 |

结论：Stage 6F-Fix-3 没有完全失败，但 NOT_PALM gate 没过，Stage 6G 继续 BLOCKED。

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
| 当前生产正常上传 | FAIL_BEFORE_FIX4_DEPLOYMENT | 本轮测试记录当前已部署版本仍可能失败；需本次部署后复测 |

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

## Stage 6F-Fix-4 修复状态

| 修复项 | 状态 | 说明 |
|---|---|---|
| 非手掌图返回 `REQUEST_TIMEOUT` | CODE_FIXED_AUTOMATED_PASS | 非手掌只触发有效性预检并返回 `NOT_PALM` |
| 非手掌进入人格分析 | CODE_FIXED_AUTOMATED_PASS | 预检失败不会发第二阶段人格分析请求 |
| 非手掌写入人格结果 | PASS | `NOT_PALM` 不写入 `palmmi:last-analysis` 人格结果 |
| 非手掌生成海报 | PASS | 无效结果禁止海报 |
| `validity` 缺失 | PASS | 返回 `ANALYSIS_UNRELIABLE` |
| 真实 fetch timeout | PASS | 返回 `REQUEST_TIMEOUT` |

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
| Fix-4 非手掌不超时 | PASS | `NOT_PALM`，且只发起 1 次有效性请求 |
| Fix-4 validity 缺失 | PASS | `ANALYSIS_UNRELIABLE` |
| Fix-4 fetch timeout | PASS | `REQUEST_TIMEOUT` |
| Fix-5 有效手掌低置信人格 | PASS | validity 通过后执行第二阶段，返回 `LOW_CONFIDENCE` + 合法人格候选 |
| Fix-5 有效手掌缺 Qwen result | PASS | validity 通过且 palm_features 可用时进入本地 classifier；特征不足才 `ANALYSIS_UNRELIABLE` |
| Fix-5 parser 字段别名 | PASS | 精确映射冻结人格名称和 candidate aliases，不默认 P25 |
| Real Qwen smoke 脚本 dry run | PASS | 无 `--real` 输出 `REAL_QWEN_DISABLED`，未调用真实 Qwen |
| 移动端 viewport | PASS | 未发现严重横向溢出 |
| 移动端上传入口 | PASS | file input + label 可触发 file chooser |

## 真实 Qwen 小样本 smoke 状态

| 项目 | 状态 | 说明 |
|---|---|---|
| Real Qwen smoke script | READY | `scripts/stage6f/real-qwen-smoke.cjs` |
| Real Qwen smoke result before Fix-5 | RUN_FAILED | not_palm PASS；palm_faint / palm_clear 均 `valid_palm=true` 但 result missing |
| Real Qwen smoke result after Fix-5 | PASS | not_palm / palm_faint / palm_clear 核心验收通过 |
| Real Qwen smoke API calls | RECORDED | `api_calls_made=5`；最多 3 个样本，但有效手掌两阶段导致最多约 5 次真实调用 |
| Real Qwen smoke P25 observation | REVIEW_IN_WECHAT_RETEST | 两张手掌均返回 P25，暂不判定失败，后续多图复测继续观察人格塌缩 |
| Real Qwen A/B smoke | RECORDED_INCONCLUSIVE | 用户已运行；两个模型均拒绝非手掌，但都未解决 P25 主结果集中，不建议切生产模型 |
| PERSONALITY_COLLAPSE_RISK | READY | 仅用于 smoke / 报告诊断，不作为前端用户错误展示 |
| 用户本地图片目录 | READY_FOR_USER_RUN | `E:\其他\Palmmi\Palmmi-test-images`，不提交进 Git |
| 目录模式 | READY | `npm run smoke:stage6f:qwen -- --real --image-dir "E:\其他\Palmmi\Palmmi-test-images"` |
| 显式路径模式 | READY | 支持 `--not-palm` / `--palm-faint` / `--palm-clear` |
| 输出安全 | PASS | 脱敏 summary；不输出 Key / Token / base64 / raw Qwen response |

## Stage 6F-Final-Stabilization 状态

| 项目 | 状态 | 说明 |
|---|---|---|
| `PALMMI_QWEN_MODEL` / `QWEN_MODEL` | PASS | 支持 env 配置；显式 model 参数优先 |
| 生产默认模型 | PASS | 仍为 `qwen3-vl-flash`，未直接切生产模型 |
| A/B smoke `--models` | PASS | 支持 `qwen3-vl-flash,qwen3.6-flash` |
| A/B smoke `--collapse-check` | PASS | 多 palm 样本统计塌缩风险 |
| A/B smoke `--max-real-calls` | PASS | 预计调用数超过限制时拒绝运行 |
| P25 默认兜底 | PASS | 继续禁止；缺 result 不会补 P25 |
| P25 palm feature reason | PASS | 合法 P25 必须有掌纹特征理由或 collapse guard |
| `PERSONALITY_COLLAPSE_RISK` | PASS | 3 个及以上 palm 样本全部同一人格时标记 |
| LOW_CONFIDENCE 海报 | PASS | 有效低置信人格结果允许生成基础海报 |
| result / poster contract | PASS | poster 最低字段与 result 读取保持一致 |
| 海报按钮逻辑 | PASS | `OK` / `LOW_CONFIDENCE` 有效结果可进入海报；无效图片继续阻止 |
| `npm test` | NOT_AVAILABLE | `package.json` 无总 `test` 脚本 |
| `npm run build` | PASS | Cloudflare Pages 静态产物构建成功 |
| `npm run test:stage6f` | PASS | 命令退出码 0；Classifier-Calibration mock 回归通过，生产旧部署上传子项等待部署后复测 |
| 安全扫描 | PASS | `finding_count=0` |
| smoke dry run | PASS | 无 `--real`，`REAL_QWEN_DISABLED`，`api_calls_made=0` |
| 真实 A/B smoke | RECORDED_INCONCLUSIVE | 用户已运行；不建议切 `qwen3.6-flash`，本轮 Codex 未再次执行 `--real` |
| 安卓微信最终复测 | MANUAL_RETEST_REQUIRED | 部署后需要用户测非手掌、正常手掌、海报 |
| iOS 微信测试 | MANUAL_REQUIRED | 仍未真机验收 |

## Stage 6F-Final-Fix 状态

| 项目 | 状态 | 说明 |
|---|---|---|
| 真实 A/B smoke 结果记录 | PASS | 两个模型 `NOT_PALM` PASS；手掌样本主结果均为 P25，A/B 对切模型结论为 inconclusive |
| 生产模型 | PASS | 默认继续 `qwen3-vl-flash`，未切 `qwen3.6-flash` |
| Qwen 最终人格决策 | PASS | Qwen 只提供 validity / palm_features；人格输出仅诊断，最终不采信 |
| 本地 classifier | PASS | 复用 Stage 3 / Stage 5 rule input 和 matcher，未修改冻结规则 / 权重 / 正文 |
| 主结果候选一致性 | PASS | `personality_id === candidate_results[0].personality_id` |
| 默认 P25 / 老干部兜底 | PASS | 特征不足返回 `ANALYSIS_UNRELIABLE`，不默认补 P25 |
| NOT_PALM 拦截 | PASS | 非手掌有效性闸门保留 |
| LOW_CONFIDENCE 海报 | PASS | 有效低置信人格结果可生成基础海报 |
| 海报错误码 | PASS | 新增 `POSTER_MAIN_CANDIDATE_MISMATCH` |
| Final-Fix mock 测试 | PASS | 本地分类、候选一致、poster contract、缺失人格、deterministic 回归均通过 |

## Stage 6F-Final-Classifier-Hard-Fix 状态

| 项目 | 状态 | 说明 |
|---|---|---|
| `f3d2afd` 真机复测失败确认 | PASS | 已明确记录：多个不同手掌仍全部 `P31 留一手` |
| `LOW_INFORMATION_FEATURE_SET` | PASS | 低信息 palm_features 不再输出人格 |
| feature information gate | PASS | `main_line_type` 合法且至少 3 个核心特征可用才进入本地 classifier |
| unknown 特征误命中 | PASS | unknown / unclear 不再通过低信息路径误命中 P31 |
| score margin 诊断 | PASS | success contract 和 smoke debug summary 可输出 score margin |
| P31 合法输出条件 | PASS | P31 必须有 feature reason / score_breakdown，并且是候选第一名 |
| `P31_COLLAPSE_CONFIRMED` | PASS | 5 张及以上真实 palm 全 P31 时 smoke hard fail |
| collapse hard fail | PASS | `unique_personality_count < 2` 且 palm 样本数达到阈值时 `ok=false` |
| NOT_PALM / 海报回归 | PASS | 非手掌拦截与有效 LOW_CONFIDENCE 海报能力未回退 |
| Hard-Fix mock 测试 | PASS | all unknown、低信息、5 mock 多样性、P31 合法依据、deterministic、poster、NOT_PALM 均通过 |

## Stage 6F-Classifier-Calibration 状态

| 项目 | 状态 | 说明 |
|---|---|---|
| 安卓微信复测记录 | PASS | 非手掌、手掌识别、海报链路已恢复；新问题为多个手掌全部 `P31 留一手` |
| 默认 `留一手` 兜底 | PASS | 未发现硬编码兜底；已禁止 all-unknown 特征进入人格结果 |
| 多维特征打分 | PASS | Stage5 adapter 使用 `main_line_type`、深浅、复杂度、连续性、分支密度、掌形和置信度 |
| `score_breakdown` | PASS | 每个 candidate 输出 score、confidence、reason、score_breakdown |
| 塌缩诊断 | PASS | 增加 `candidate_distribution` 和 `PERSONALITY_COLLAPSE_RISK`；支持 P31 留一手专项说明 |
| 主候选一致性 | PASS | 继续保证 `personality_id === candidate_results[0].personality_id` |
| NOT_PALM / 海报回归 | PASS | 非手掌拦截和 LOW_CONFIDENCE 海报能力未回退 |
| Classifier-Calibration mock 测试 | PASS | 不同 mock 特征产生 4 个不同主结果；deterministic 和 score_breakdown 通过 |

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
| 安卓微信非手掌不返回超时 | MANUAL_RETEST_REQUIRED |
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
| `f3d2afd` 安卓微信真机复测 | FAIL_CONFIRMED | 已失败；多个不同手掌仍全部 `P31 留一手`，不要再复测该 commit |
| 安卓微信 Hard-Fix 后真机复测 | MANUAL_RETEST_REQUIRED | 必须等待新 commit 部署后，由用户重新测试多张不同手掌是否不再全部 `P31 留一手` |
| iPhone 微信真机测试 | MANUAL_REQUIRED | 需要真实设备截图或测试结果 |
| Hard-Fix 部署后生产真实上传确认 | MANUAL_RETEST_REQUIRED | 当前代码修复后需等待 Pages 部署并复测 |
| 安卓微信非手掌拒绝复测 | CODE_REVIEW_PASS / RETEST_RECOMMENDED | 用户已反馈非手掌识别通过；部署后建议快速确认未回退 |
| 安卓微信海报生成复测 | CODE_REVIEW_PASS / RETEST_RECOMMENDED | 用户已反馈海报生成通过；部署后建议快速确认未回退 |
| 安卓微信正常手掌人格多样性复测 | MANUAL_RETEST_REQUIRED | 本轮已新增低信息闸门和 collapse hard fail；仍需用户真机确认多个手掌不再全部 `P31 留一手` |
| 安卓微信人格塌缩观察 | MANUAL_RETEST_REQUIRED | 重点观察是否从 `P31 留一手` 转移到另一个固定人格 |
| 真实 A/B smoke | RECORDED_INCONCLUSIVE | 用户已运行；当前结论是不切 `qwen3.6-flash`，不再作为进入 6G 的单独前置项 |
| 偏暗图 fixture | BLOCKED_BY_MISSING_FIXTURE | 需要明确图片 fixture |
| 模糊图 fixture | BLOCKED_BY_MISSING_FIXTURE | 需要明确图片 fixture |
| 裁切不完整图 fixture | BLOCKED_BY_MISSING_FIXTURE | 需要明确图片 fixture |

## 是否可以进入 Stage 6G

是否可以进入 Stage 6G: BLOCKED

条件：`f3d2afd` 已被安卓微信真机证明失败，不能作为进入 Stage 6G 的依据。只有本轮 Hard-Fix 新 commit 部署后，安卓微信多张正常手掌不再全部塌缩为 `P31 留一手` 或另一个固定人格，真实 5 张 palm smoke 若仍少于 2 个不同人格会 hard fail，且非手掌 / 结果页 / 海报链路保持不回退，并继续保持无 Key / Token / base64 / raw response 泄露，才允许重新评估 Stage 6G。

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
- 等待本次 Final-Fix 部署后，补充安卓微信拍照上传复测结果。
- 等待本次 Final-Fix 部署后，补充安卓微信相册上传复测结果。
- 等待本次 Final-Fix 部署后，补充安卓微信非手掌图片拒绝且不超时复测结果。
- 等待本次 Final-Fix 部署后，补充安卓微信正常手掌本地分类结果复测。
- 等待本次 Final-Fix 部署后，补充安卓微信海报生成复测结果。
- 当前 A/B smoke 结论为不切模型；后续只有在更多样本证明默认模型仍异常时再评估配置切换。
- 补充 iPhone 微信真机验收结果。

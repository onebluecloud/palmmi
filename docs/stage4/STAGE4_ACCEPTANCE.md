# Palmmi Stage 4 Acceptance

## Stage 4A Acceptance Criteria

Stage 4A passes when:

1. 已读取 Stage 3 交接材料。
2. 已确认 Stage 3 可以关闭。
3. 已确认 Stage 4 只做页面产品化。
4. 已明确不接真实 VLM。
5. 已明确不改识别规则。
6. 已明确不改 Stage 3 核心 pipeline。
7. 已建立 Stage 4 状态文件。
8. 已建立 Stage 4 范围文件。
9. 已建立视觉基准文件。
10. 已建立 design tokens 文档。
11. 已建立截图日志机制。
12. 已建立 Stage 4 总验收标准。
13. 已建立后续任务拆分。
14. git status 检查通过，只应出现 `docs/stage4/` 下的新文档或改动作为 Stage 4A 本轮新增内容。

## Stage 4A Evidence

Stage 4A reads:

- `docs/stage3/STAGE3_STATE.md`
- `docs/stage3/HANDOFF_3I.md`
- `docs/stage3/HANDOFF_3J.md`
- `docs/stage3/HANDOFF_3K.md`
- `docs/stage3/HANDOFF_3L.md`
- `docs/stage3/HANDOFF_TO_STAGE4.md`
- `docs/stage3/STAGE3I_DISTRIBUTION_REPORT.md`
- `docs/stage3/STAGE3J_PIPELINE_REPORT.md`
- `docs/stage3/STAGE3K_STABILITY_REPORT.md`
- `docs/stage3/STAGE3_FINAL_ACCEPTANCE_REPORT.md`
- `docs/stage4/STAGE4_CONTEXT.md`
- `docs/stage4/STAGE4_INPUT_CONTRACT.md`
- `docs/stage4/STAGE4_FORBIDDEN_CHANGES.md`

Stage 4A creates:

- `docs/stage4/STAGE4_STATE.md`
- `docs/stage4/STAGE4_SCOPE.md`
- `docs/stage4/STAGE4_VISUAL_BASELINE.md`
- `docs/stage4/STAGE4_DESIGN_TOKENS.md`
- `docs/stage4/STAGE4_SCREENSHOT_LOG.md`
- `docs/stage4/STAGE4_ACCEPTANCE.md`
- `docs/stage4/STAGE4_WORKFLOW.md`
- `docs/stage4/STAGE4_NEXT_TASKS.md`

## Stage 4 Overall Acceptance Criteria

Stage 4 passes when a user can complete the full mobile-first flow:

```text
首页
  -> 上传图片
  -> 进入分析中
  -> 调用 Stage 3 mock pipeline
  -> 得到人格结果
  -> 查看结果页
  -> 生成分享海报
  -> 保存或分享
  -> 重新测试
```

And all of these are true:

1. 不接真实 VLM。
2. 不破坏 Stage 3 测试。
3. 不修改识别规则。
4. 不出现空白页。
5. 不出现无法恢复的错误状态。
6. 移动端体验优先通过。
7. 每个关键阶段都有截图记录。

## Stage 4 Data Acceptance

Stage 4 must:

- Consume `RecognitionResult` only.
- Render `SUCCESS` and `LOW_CONFIDENCE` without recalculating persona or Top3.
- Treat `RETRY_REQUIRED` and `REJECTED` as non-result branches.
- Preserve Top3 order from pipeline output.
- Convert engineering reasons into user-facing language.
- Hide `debug`, raw schema details, raw error codes, raw cache keys, and model internals from users.

Stage 4 must not:

- Read features in UI for scoring.
- Recalculate mother type.
- Recalculate persona.
- Reorder Top3.
- Directly import Stage 3 rule internals into page components.
- Connect a real VLM provider.

## Stage 4 Mobile Acceptance

Every implementation stage must check:

- 390px mobile viewport.
- 430px mobile viewport.
- No text overlap.
- No clipped actions.
- First screen is meaningful on mobile.
- Desktop is responsive enough but not treated as primary.
- User can recover from upload, analysis, retry, and rejected states.

## Stage 4 Visual Acceptance

Palmmi visual direction passes when it feels:

- entertainment/personality-test oriented
- social-share friendly
- warm and premium
- mobile-first
- abstractly palm-inspired

Palmmi visual direction fails when it feels:

- traditional fortune-telling
- medical diagnostic
- internal backend dashboard
- scary full-hand biometric scan
- debug or JSON viewer

## Stage 4 Screenshot Acceptance

Future stage screenshots must be saved under:

```text
docs/stage4/screenshots/
```

Every key screenshot log entry must include:

1. 截图文件名
2. 对应阶段
3. 页面名称
4. 移动端 / 桌面端
5. 验收结论
6. 是否需要返工
7. 备注

## Stage 4I Acceptance Record

Stage 4I passes because:

1. ready 状态海报已从基础预览打磨为更适合传播的人格身份卡。
2. 390px ready 截图已保存：`docs/stage4/screenshots/4I-poster-mobile-390.png`。
3. 430px ready 截图已保存：`docs/stage4/screenshots/4I-poster-mobile-430.png`。
4. 1440px 桌面截图已保存：`docs/stage4/screenshots/4I-poster-desktop-1440.png`。
5. 长人格名、长代号、长金句、长标签已通过 `4I-poster-long-name-mobile-390.png` 验收，不横向撑爆。
6. `missing-result` / `invalid-result` / `partial-result` 截图均已保存且不白屏、不塌陷。
7. 视觉继续沿用 Stage 2 / Stage 4B 基准：深色底、纸色卡片、玉绿色掌纹线条、克制神秘感和移动端优先。
8. 未新增真实 API、真实 VLM、OpenAI、Qwen、百炼、千问或 Vision 相关调用。
9. 未新增 html2canvas、canvas 导出、download、clipboard、QRCode 或真实分享能力。
10. 未修改 Stage 3 score / rules / matcher / mock pipeline 核心识别逻辑。
11. Stage 4 指定测试全部通过。
12. `STAGE4_STATE.md` 和 `STAGE4_SCREENSHOT_LOG.md` 已更新 Stage 4I 记录。

Stage 4I verification commands:

```text
node tests/stage4/upload-validation.test.cjs
node tests/stage4/analyze-flow.test.cjs
node tests/stage4/error-state.test.cjs
node tests/stage4/result-render.test.cjs
node tests/stage4/result-visual.test.cjs
node tests/stage4/poster-render.test.cjs
```

All commands passed.

Stage 4I not done by design:

- No real poster export.
- No real copy-to-clipboard.
- No real QR code.
- No real share chain.
- No payment, login, backend, real VLM, or real API.

Recommended next step:

- Stage 4J should validate the complete 390px / 430px mobile flow from home to upload, analyzing, result, poster and retest, using screenshots and forbidden-scope checks.

## Stage 4J Acceptance Record

Stage 4J passes because:

1. home -> upload -> analyze -> result -> poster -> retest 主流程已用真实浏览器跑通。
2. 390px 移动端主流程截图已保存：`4J-home-mobile-390.png`、`4J-upload-mobile-390.png`、`4J-analyze-mobile-390.png`、`4J-result-mobile-390.png`、`4J-poster-mobile-390.png`、`4J-retest-mobile-390.png`。
3. 430px 移动端主流程截图已保存：`4J-home-mobile-430.png`、`4J-upload-mobile-430.png`、`4J-analyze-mobile-430.png`、`4J-result-mobile-430.png`、`4J-poster-mobile-430.png`。
4. 1440px 桌面基础兼容截图已保存：`4J-home-desktop-1440.png`、`4J-upload-desktop-1440.png`、`4J-analyze-desktop-1440.png`、`4J-result-desktop-1440.png`、`4J-poster-desktop-1440.png`。
5. 关键 CTA 可渲染并可触发：开始上传、选择图片、开始分析、查看结果、生成分享海报、重新测试。
6. 浏览器验收未发现横向滚动、白屏或明显控制台错误。
7. missing-result / invalid-result / partial-result / analyze error 截图均已保存，状态可恢复。
8. 修复了 home / upload / analyze 缺少 data favicon 导致的 `/favicon.ico` 404 控制台噪音。
9. 结果页和海报页继续沿用 Stage 2 / Stage 4B 视觉基准。
10. 未新增真实 API、真实 VLM、OpenAI、Qwen、百炼、千问或 Vision 相关调用。
11. 未新增 html2canvas、canvas 导出、download、clipboard、QRCode 或真实分享能力。
12. 未修改 Stage 3 score / rules / matcher / mock pipeline 核心识别逻辑。
13. Stage 4 指定测试和新增 full-flow 测试全部通过。
14. `STAGE4_STATE.md` 和 `STAGE4_SCREENSHOT_LOG.md` 已更新 Stage 4J 记录。

Stage 4J verification commands:

```text
node tests/stage4/upload-validation.test.cjs
node tests/stage4/analyze-flow.test.cjs
node tests/stage4/error-state.test.cjs
node tests/stage4/result-render.test.cjs
node tests/stage4/result-visual.test.cjs
node tests/stage4/poster-render.test.cjs
node tests/stage4/full-flow.test.cjs
```

All commands passed.

Stage 4J browser validation:

```text
390px mobile full flow: passed
430px mobile full flow: passed
1440px desktop full flow: passed
```

Stage 4J not done by design:

- No real poster export.
- No real copy-to-clipboard.
- No real QR code.
- No real share chain.
- No html2canvas / canvas export.
- No payment, login, backend, real VLM, or real API.

Known Stage 4J note:

- The actual full-flow result still comes from the Stage 4D static mock adapter, so result and poster full-flow screenshots use partial-result fallback content. Ready-state visual quality is already covered by Stage 4G and Stage 4I screenshots.

Recommended next step:

- Stage 4K should freeze Stage 4, organize the final handoff, and explicitly separate Stage 5 work such as real VLM/API integration, real image saving, copy/share, QR code, payment, login, and backend.

## Stage 4K Final Acceptance Record

Stage 4K passes because:

1. 首页验收通过：`index.html` 保持 Palmmi 品牌、上传入口、玩法说明和示意卡，不新增功能。
2. 上传页验收通过：`upload/index.html` 保持本地图片选择、格式/大小校验、本地预览、重新选择和进入分析页能力。
3. 分析页验收通过：`analyze/index.html` 保持 loading / done / missing-upload / invalid-upload / timeout / error 状态和恢复入口。
4. 异常状态验收通过：上传、分析、结果、海报异常状态均有用户可恢复路径，不暴露 raw JSON、schema、debug 或技术错误作为主文案。
5. 结果页验收通过：`result/index.html` 只读取 `palmmi:lastAnalysisResult`，渲染允许字段，支持 ready / missing-result / invalid-result / partial-result / error。
6. 海报页验收通过：`poster/index.html` 只读取 `palmmi:lastAnalysisResult`，渲染海报预览和异常状态；保存图片、复制分享文案仍为占位。
7. 全流程验收通过：`index.html -> upload/index.html -> analyze/index.html -> result/index.html -> poster/index.html -> upload/index.html` 已由 Stage 4J 验收，并由 `full-flow.test.cjs` 固定静态链路。
8. 截图验收通过：`docs/stage4/screenshots/` 下实际存在 73 张 PNG，其中 390px 41 张、430px 19 张、1440px 13 张，覆盖首页、上传、分析、异常、结果、长名称、低质量提示、海报和全流程。
9. 测试验收通过：Stage 4K 重新运行 7 个 Stage 4 测试，全部通过。
10. 禁止项验收通过：实际实现文件未发现 OpenAI、Qwen、千问、百炼、Vision API、真实 API fetch、html2canvas、canvas 导出、download、clipboard、QRCode、real share、payment、login、backend API 或 Stage 3 core 直接引用。
11. Stage 4 最终结论：Stage 4 可冻结，可以进入 Stage 5。

Stage 4K verification commands:

```text
node tests/stage4/upload-validation.test.cjs
node tests/stage4/analyze-flow.test.cjs
node tests/stage4/error-state.test.cjs
node tests/stage4/result-render.test.cjs
node tests/stage4/result-visual.test.cjs
node tests/stage4/poster-render.test.cjs
node tests/stage4/full-flow.test.cjs
```

All commands passed.

Stage 4K implementation-file forbidden scan:

```text
No forbidden implementation matches found.
```

Stage 4K not done by design:

- No real VLM.
- No real API.
- No real poster export.
- No real copy-to-clipboard.
- No real QR code.
- No real share chain.
- No payment, login, backend, deployment, or Stage 3 core logic changes.

## Stage 4 Completion Gate

Stage 4K may close Stage 4 only after:

- Stage 4A through 4J documents and implementation records are current.
- Mobile full-flow screenshots exist.
- Stage 3 tests still pass or an explicit non-run reason is recorded.
- Forbidden path review confirms no recognition-rule, VLM, API, or Stage 3 core pipeline modifications.
- Stage 5 handoff clearly states what remains for real VLM integration.

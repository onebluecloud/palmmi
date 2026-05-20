const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const resultPage = require(path.join(root, "scripts", "palmmi-result.js"));

function sampleRecognitionResult(overrides = {}) {
  return {
    status: "SUCCESS",
    primary_mother: {
      id: "M2",
      name: "柔线型",
      core_fields_matched: ["HEAD_LINE_CURVE", "HEART_LINE_CURVE"],
    },
    primary_persona: {
      id: "P02",
      persona_id: "P02-LONG-CODE-FOR-STAGE-4G",
      name: "慢热但会把细节照顾到的人",
      mother_type: "M2",
      hook: "先观察，再把每一个关键细节稳稳接住。",
      description: "这是给用户阅读的结果说明，用来解释本次 Palmmi 结果来自可识别的掌纹结构，而不是诊断或命运判断。",
      matched_features: ["HEAD_LINE_CURVE", "HEART_LINE_CURVE", "FINGER_SPREAD"],
    },
    top3: [
      { id: "P02", persona_id: "P02", name: "慢热但会把细节照顾到的人", mother_type: "M2" },
      { id: "P07", persona_id: "P07", name: "温柔推进者", mother_type: "M2" },
      { id: "P13", persona_id: "P13", name: "细节收藏家", mother_type: "M5" },
      { id: "P21", persona_id: "P21", name: "额外候选不应挤爆页面", mother_type: "M7" },
    ],
    recognition: {
      explanation: {
        persona: {
          matched_features: ["HEAD_LINE_CURVE", "HEART_LINE_CURVE", "FINGER_SPREAD"],
        },
      },
    },
    quality_gate: {
      status: "PASS",
    },
    schema: {
      status: "PASS",
    },
    error_codes: [],
    debug: {
      pipeline_version: "stage4d_static_browser_adapter_v1",
    },
    ...overrides,
  };
}

{
  const viewModel = resultPage.createResultViewModel(sampleRecognitionResult());

  assert.equal(viewModel.state, "ready");
  assert.equal(viewModel.personaName, "慢热但会把细节照顾到的人");
  assert.equal(viewModel.personaCode, "P02-LONG-CODE-FOR-STAGE-4G");
  assert.match(viewModel.summaryPreview, /Palmmi 结果来自可识别的掌纹结构/);
  assert.equal(viewModel.qualityHintText, "");
  assert.equal(viewModel.topCandidates.length, 3, "Top3 display should remain bounded and keep source order");
  assert.equal(viewModel.topCandidates[0].code, "P02");
}

{
  const longText = "这是一句很长很长的金句，用来确认移动端结果页会保留完整文案，同时通过布局换行来避免撑爆首屏和按钮区域。";
  const viewModel = resultPage.createResultViewModel(sampleRecognitionResult({
    primary_persona: {
      id: "P99",
      persona_id: "P99-SUPER-LONG-CODE-WITHOUT-SPACES-FOR-WRAPPING",
      name: "一个名字特别长但仍然需要在三百九十像素手机屏幕里读得下去的人格标签",
      mother_type: "M8",
      hook: longText,
      description: longText,
      matched_features: [
        "HEAD_LINE_LENGTH",
        "HEAD_LINE_DEPTH",
        "HEAD_LINE_SLOPE",
        "HEART_LINE_LENGTH",
        "HEART_LINE_DEPTH",
        "FINGER_SPREAD",
        "LINE_COMPLEXITY",
        "OVERALL_CLARITY",
        "MOUNT_LUNA",
      ],
    },
    top3: [
      {
        id: "P99",
        persona_id: "P99-SUPER-LONG-CODE-WITHOUT-SPACES-FOR-WRAPPING",
        name: "一个名字特别长但仍然需要正常展示的候选人格",
        mother_type: "M8",
      },
      { id: "P21", persona_id: "P21", name: "移动端文本换行观察者", mother_type: "M4" },
      { id: "P32", persona_id: "P32", name: "标签收纳管理员", mother_type: "M6" },
    ],
  }));

  assert.equal(viewModel.personaName.includes("三百九十像素"), true);
  assert.equal(viewModel.hook, longText);
  assert.match(viewModel.evidence.at(-1), /另有 1 项/);
  assert.equal(viewModel.topCandidates[0].code, "P99");
  assert.ok(viewModel.topCandidates[0].code.length <= 16, "Long Top3 codes should be compacted for mobile cards");
}

{
  const lowQuality = resultPage.createResultViewModel(sampleRecognitionResult({
    status: "LOW_CONFIDENCE",
    quality_gate: { status: "WARN" },
    error_codes: ["LOW_LIGHT"],
  }));

  assert.equal(lowQuality.state, "ready");
  assert.match(lowQuality.qualityHintText, /可读性一般|娱乐参考/);
  assert.match(lowQuality.confidenceCopy, /重新上传|更清晰/);
}

{
  const partial = resultPage.createResultViewModel({
    status: "SUCCESS",
    primary_persona: {
      name: "字段不完整的人格",
    },
    top3: [],
  });

  assert.equal(partial.state, "partial-result");
  assert.match(partial.summaryPreview, /字段暂时缺失|暂无详细描述/);
  assert.deepEqual(partial.tags, ["暂无标签"]);
}

for (const state of ["missing-result", "invalid-result", "partial-result", "error"]) {
  const problem = resultPage.createProblemViewModel(state);

  assert.equal(problem.primaryActionText, "重新测试");
  assert.equal(problem.primaryHref, "../upload/index.html");
  assert.equal(problem.secondaryActionText, "返回首页");
  assert.equal(problem.secondaryHref, "../index.html");
  assert.ok(problem.recoveryHint, `${state} should include a friendly recovery hint`);
}

{
  const viewModel = resultPage.createResultViewModel(sampleRecognitionResult());

  assert.equal(viewModel.posterEnabled, true);
  assert.match(viewModel.posterActionText, /海报/);
  assert.equal(viewModel.posterHref, "../poster/index.html");
  assert.match(viewModel.posterActionNote, /基础海报预览|占位/);
}

const html = fs.readFileSync(path.join(root, "result", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles", "palmmi.css"), "utf8");
const stage4Sources = [
  "scripts/palmmi-result.js",
  "result/index.html",
  "styles/palmmi.css",
].map((item) => fs.readFileSync(path.join(root, item), "utf8")).join("\n");

assert.match(html, /id="resultSummary"/, "Ready first screen should include a user-facing result summary");
assert.match(html, /id="resultQualityHint"/, "Ready first screen should include a low-quality hint container");
assert.match(html, /poster\/index\.html/, "Poster entry should link to the Stage 4H base poster page");
assert.match(css, /\.result-name[\s\S]*text-wrap:\s*balance/, "Long persona names need balanced wrapping rules");
assert.match(css, /\.result-quality-hint/, "Low-quality hint needs a dedicated visual treatment");
assert.doesNotMatch(stage4Sources, /\bfetch\s*\(/i, "Stage 4G must not call a real API");
assert.doesNotMatch(stage4Sources, /OpenAI|Qwen|Qwen-VL|百炼|千问|Vision API/i, "Stage 4G must not call real vision providers");
assert.doesNotMatch(
  stage4Sources,
  /personaRules|personaMatcher|adjacentResolver|crossMotherCorrection|motherScores/i,
  "Stage 4G page code must not import Stage 3 core rule files"
);
assert.doesNotMatch(stage4Sources, /html2canvas|toDataURL|QRCode|navigator\.clipboard/i, "Stage 4G must not implement poster export or sharing");

console.log("Stage 4G result visual tests passed.");

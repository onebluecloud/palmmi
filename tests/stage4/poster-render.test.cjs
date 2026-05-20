const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const posterPage = require(path.join(root, "scripts", "palmmi-poster.js"));

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function sampleRecognitionResult(overrides = {}) {
  return {
    status: "SUCCESS",
    cache: {
      cache_hit: false,
    },
    image_input: {
      file_name: "palm.jpg",
      mime_type: "image/jpeg",
    },
    quality_gate: {
      status: "PASS",
    },
    schema: {
      status: "PASS",
    },
    mother_scores: null,
    primary_mother: {
      id: "M1",
      name: "钢线型",
      core_fields_matched: ["HEAD_LINE_LENGTH", "HEAD_LINE_DEPTH"],
    },
    secondary_mother: null,
    is_dual_mother: false,
    primary_persona: {
      id: "P01",
      persona_id: "P01",
      name: "人生排位赛选手",
      mother_type: "M1",
      hook: "把目标拆清楚，再稳稳推进。",
      description: "这是来自 RecognitionResult 的用户可读核心描述。",
      tags: ["目标感", "执行力", "稳定推进"],
      matched_features: ["HEAD_LINE_LENGTH", "HEAD_LINE_DEPTH", "MOUNT_JUPITER"],
    },
    top3: [
      { id: "P01", persona_id: "P01", name: "人生排位赛选手", mother_type: "M1" },
      { id: "P06", persona_id: "P06", name: "目标感整理者", mother_type: "M1" },
      { id: "P12", persona_id: "P12", name: "节奏规划者", mother_type: "M4" },
    ],
    recognition: {
      explanation: {
        persona: {
          reason: "This is an internal rule-engine style explanation that should not be displayed directly.",
          matched_features: ["HEAD_LINE_LENGTH", "HEAD_LINE_DEPTH", "MOUNT_JUPITER"],
        },
        low_confidence: false,
      },
    },
    error_codes: [],
    debug: {
      pipeline_version: "stage4d_static_browser_adapter_v1",
    },
    ...overrides,
  };
}

assert.equal(posterPage.ANALYSIS_RESULT_STORAGE_KEY, "palmmi:lastAnalysisResult");
assert.deepEqual(Object.values(posterPage.POSTER_STATES), [
  "loading",
  "ready",
  "missing-result",
  "invalid-result",
  "partial-result",
  "error",
]);

{
  const storage = createMemoryStorage();
  storage.setItem(posterPage.ANALYSIS_RESULT_STORAGE_KEY, JSON.stringify(sampleRecognitionResult()));

  const read = posterPage.readAnalysisResult(storage);

  assert.equal(read.ok, true);
  assert.equal(read.state, "ready");
  assert.equal(read.result.primary_persona.name, "人生排位赛选手");
}

{
  const viewModel = posterPage.createPosterViewModel(sampleRecognitionResult());

  assert.equal(viewModel.state, "ready");
  assert.equal(viewModel.personaName, "人生排位赛选手");
  assert.equal(viewModel.personaCode, "P01");
  assert.equal(viewModel.hook, "把目标拆清楚，再稳稳推进。");
  assert.equal(viewModel.pill, "传播海报");
  assert.equal(viewModel.tags.includes("#目标感"), true);
  assert.equal(viewModel.tags.includes("#钢线型"), true);
  assert.equal(viewModel.tags.length <= 4, true, "Poster social tags should stay thumbnail-friendly");
  assert.equal(viewModel.matchedFeatures.some((item) => item.includes("智慧线")), true);
  assert.equal(viewModel.primaryMother, "钢线型");
  assert.equal(viewModel.topCandidates.length, 3);
  assert.equal(viewModel.topCandidates[0].code, "P01");
  assert.match(viewModel.qualityHint, /娱乐参考|清晰/);
}

{
  const storage = createMemoryStorage();
  const read = posterPage.readAnalysisResult(storage);

  assert.equal(read.ok, false);
  assert.equal(read.state, "missing-result");
  assert.match(read.message, /重新测试|上传/);
}

{
  const storage = createMemoryStorage();
  storage.setItem(posterPage.ANALYSIS_RESULT_STORAGE_KEY, "{not json");

  const read = posterPage.readAnalysisResult(storage);

  assert.equal(read.ok, false);
  assert.equal(read.state, "invalid-result");
  assert.match(read.message, /重新测试|读取/);
}

{
  const viewModel = posterPage.createPosterViewModel({
    status: "SUCCESS",
    primary_persona: {},
    primary_mother: {},
    top3: [],
  });

  assert.equal(viewModel.state, "partial-result");
  assert.equal(viewModel.personaName, "未知人格");
  assert.equal(viewModel.personaCode, "结果待完善");
  assert.equal(viewModel.hook, "暂无金句");
  assert.deepEqual(viewModel.tags, ["暂无标签"]);
  assert.deepEqual(viewModel.matchedFeatures, ["暂无匹配特征"]);
  assert.equal(viewModel.primaryMother, "结果待完善");
  assert.match(viewModel.summary, /娱乐参考/);
}

{
  const viewModel = posterPage.createPosterViewModel(sampleRecognitionResult({
    status: "LOW_CONFIDENCE",
    quality_gate: { status: "WARN" },
    primary_persona: {
      id: "P99",
      persona_id: "P99-SUPER-LONG-CODE-WITHOUT-SPACES-FOR-WRAPPING",
      name: "一个名字特别长但仍然需要在三百九十像素手机屏幕里读得下去的人格标签",
      mother_type: "M8",
      description: "",
      matched_features: [],
    },
  }));

  assert.equal(viewModel.personaName.includes("三百九十像素"), true);
  assert.equal(viewModel.personaCode, "P99-SUPER-LONG-CODE-WITHOUT-SPACES-FOR-WRAPPING");
  assert.match(viewModel.qualityHint, /可读性一般|娱乐参考/);
}

{
  const retryModel = posterPage.createPosterViewModel(sampleRecognitionResult({ status: "RETRY_REQUIRED" }));
  const rejectedModel = posterPage.createPosterViewModel(sampleRecognitionResult({ status: "REJECTED" }));

  assert.equal(retryModel.state, "error");
  assert.equal(rejectedModel.state, "error");
  assert.doesNotMatch(retryModel.title, /人生排位赛/);
}

for (const state of ["missing-result", "invalid-result", "partial-result", "error"]) {
  const problem = posterPage.createProblemViewModel(state);

  assert.equal(problem.backResultHref, "../result/index.html");
  assert.equal(problem.retestHref, "../upload/index.html");
  assert.equal(problem.homeHref, "../index.html");
  assert.ok(problem.title, `${state} should have a title`);
  assert.ok(problem.message, `${state} should have a message`);
}

assert.equal(posterPage.readRequestedTestState({ search: "?state=missing-result" }), "missing-result");
assert.equal(posterPage.readRequestedTestState({ search: "?state=invalid-result" }), "invalid-result");
assert.equal(posterPage.readRequestedTestState({ search: "?state=partial-result" }), "partial-result");
assert.equal(posterPage.readRequestedTestState({ search: "?state=error" }), "error");
assert.equal(posterPage.readRequestedTestState({ search: "?state=ready" }), "ready");
assert.equal(posterPage.readRequestedTestState({ search: "?state=long-name" }), "long-name");
assert.equal(posterPage.readRequestedTestState({ search: "?state=unknown" }), null);

const posterHtml = fs.readFileSync(path.join(root, "poster", "index.html"), "utf8");
const resultHtml = fs.readFileSync(path.join(root, "result", "index.html"), "utf8");
const stage4Sources = [
  "scripts/palmmi-poster.js",
  "poster/index.html",
  "result/index.html",
  "scripts/palmmi-result.js",
  "styles/palmmi.css",
].map((item) => fs.readFileSync(path.join(root, item), "utf8")).join("\n");

assert.match(posterHtml, /id="posterPreview"/, "Poster page should include a preview area");
assert.match(posterHtml, /人格身份卡/, "Poster page should position the share card as a personality identity card");
assert.match(posterHtml, /id="posterSavePlaceholder"/, "Poster page should include save-image placeholder control");
assert.match(posterHtml, /id="posterCopyPlaceholder"/, "Poster page should include copy-share-copy placeholder control");
assert.match(posterHtml, /后续阶段开放/, "Poster page should keep export and copy as future-stage placeholders");
assert.match(posterHtml, /返回结果页/, "Poster page should include a result-page recovery link");
assert.match(posterHtml, /重新测试/, "Poster page should include a retest link");
assert.match(resultHtml, /poster\/index\.html/, "Result page should link to poster preview in Stage 4H");

assert.match(stage4Sources, /\.poster-frame::after/, "Stage 4I poster should add a refined palm-line texture layer");
assert.match(stage4Sources, /\.poster-hook[\s\S]*background:/, "Stage 4I poster quote needs a stronger social-card treatment");
assert.doesNotMatch(stage4Sources, /html2canvas|toDataURL|canvas\.toBlob|new\s+Blob|download\s*=|navigator\.clipboard|QRCode/i);
assert.doesNotMatch(stage4Sources, /\bfetch\s*\(/i, "Stage 4H must not call a real API");
assert.doesNotMatch(stage4Sources, /OpenAI|Qwen|Qwen-VL|百炼|千问|Vision API/i, "Stage 4I must not call real vision providers");
assert.doesNotMatch(
  stage4Sources,
  /personaRules|personaMatcher|adjacentResolver|crossMotherCorrection|motherScores/i,
  "Stage 4I page code must not import Stage 3 core rule files"
);

console.log("Stage 4I poster render tests passed.");

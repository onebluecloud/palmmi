const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const resultPage = require(path.join(root, "scripts", "palmmi-result.js"));

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
    primary_mother: {
      id: "M1",
      name: "钢线型",
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
      score: 1,
      matched_features: ["HEAD_LINE_LENGTH", "HEAD_LINE_DEPTH", "MOUNT_JUPITER"],
      conflict_features: [],
      reason_codes: ["M1_INTERNAL_MATCH"],
    },
    top3: [
      {
        id: "P01",
        persona_id: "P01",
        name: "人生排位赛选手",
        mother_type: "M1",
        score: 1,
        matched_features: ["HEAD_LINE_LENGTH"],
      },
      {
        id: "P06",
        persona_id: "P06",
        name: "目标感整理者",
        mother_type: "M1",
        score: 0.84,
      },
    ],
    recognition: {
      explanation: {
        persona: {
          reason: "Persona was scored from the public RecognitionResult explanation.",
          matched_features: ["HEAD_LINE_LENGTH", "HEAD_LINE_DEPTH", "MOUNT_JUPITER"],
          conflict_features: [],
        },
        low_confidence: false,
      },
      correction: {
        cross_mother_checked: true,
        adjacent_checked: true,
      },
    },
    quality_gate: {
      status: "PASS",
    },
    schema: {
      status: "PASS",
    },
    cache: {
      cache_hit: false,
    },
    error_codes: [],
    debug: {
      mock_vlm_used: true,
    },
    ...overrides,
  };
}

assert.equal(resultPage.ANALYSIS_RESULT_STORAGE_KEY, "palmmi:lastAnalysisResult");
assert.deepEqual(Object.values(resultPage.RESULT_STATES), [
  "loading",
  "ready",
  "missing-result",
  "invalid-result",
  "partial-result",
  "error",
]);

{
  const storage = createMemoryStorage();
  const sample = sampleRecognitionResult();
  storage.setItem(resultPage.ANALYSIS_RESULT_STORAGE_KEY, JSON.stringify(sample));

  const read = resultPage.readAnalysisResult(storage);

  assert.equal(read.ok, true);
  assert.equal(read.state, "ready");
  assert.equal(read.result.primary_persona.name, "人生排位赛选手");
}

{
  const viewModel = resultPage.createResultViewModel(sampleRecognitionResult());

  assert.equal(viewModel.state, "ready");
  assert.equal(viewModel.personaName, "人生排位赛选手");
  assert.equal(viewModel.personaCode, "P01");
  assert.equal(viewModel.tags.includes("钢线型"), true);
  assert.equal(viewModel.tags.includes("M1"), true);
  assert.equal(viewModel.evidence.some((item) => item.includes("智慧线")), true);
  assert.equal(viewModel.topCandidates[0].code, "P01");
}

{
  const storage = createMemoryStorage();
  const read = resultPage.readAnalysisResult(storage);

  assert.equal(read.ok, false);
  assert.equal(read.state, "missing-result");
  assert.match(read.message, /重新测试/);
}

{
  const storage = createMemoryStorage();
  storage.setItem(resultPage.ANALYSIS_RESULT_STORAGE_KEY, "{not json");

  const read = resultPage.readAnalysisResult(storage);

  assert.equal(read.ok, false);
  assert.equal(read.state, "invalid-result");
  assert.match(read.message, /重新测试/);
}

{
  const viewModel = resultPage.createResultViewModel({
    status: "SUCCESS",
    primary_persona: {},
    top3: [],
  });

  assert.equal(viewModel.state, "partial-result");
  assert.equal(viewModel.personaName, "未知人格");
  assert.equal(viewModel.personaCode, "结果待完善");
  assert.deepEqual(viewModel.tags, ["暂无标签"]);
  assert.deepEqual(viewModel.evidence, ["暂无掌纹依据"]);
  assert.match(viewModel.coreDescription, /暂无详细描述/);
}

{
  const model = resultPage.createProblemViewModel("missing-result");

  assert.equal(model.primaryActionText, "重新测试");
  assert.equal(model.primaryHref, "../upload/index.html");
  assert.equal(model.secondaryActionText, "返回首页");
  assert.equal(model.secondaryHref, "../index.html");
}

{
  const viewModel = resultPage.createResultViewModel(sampleRecognitionResult());

  assert.equal(viewModel.posterActionText, "生成分享海报");
  assert.equal(viewModel.posterHref, "../poster/index.html");
  assert.match(viewModel.posterActionNote, /基础海报预览/);
  assert.equal(viewModel.posterEnabled, true);
}

const stage4Sources = [
  "scripts/palmmi-result.js",
  "result/index.html",
  "scripts/palmmi-analyze.js",
].map((item) => fs.existsSync(path.join(root, item)) ? fs.readFileSync(path.join(root, item), "utf8") : "").join("\n");

assert.doesNotMatch(stage4Sources, /\bfetch\s*\(/i, "Stage 4F must not call a real API");
assert.doesNotMatch(stage4Sources, /OpenAI|Qwen|Qwen-VL|百炼|千问|Vision API/i, "Stage 4F must not call real vision providers");
assert.doesNotMatch(
  stage4Sources,
  /personaRules|personaMatcher|adjacentResolver|crossMotherCorrection|motherScores/i,
  "Stage 4F page code must not import Stage 3 core rule files"
);

console.log("Stage 4F result render tests passed.");

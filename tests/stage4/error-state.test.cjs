const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const upload = require(path.join(root, "scripts", "palmmi-upload.js"));
const analyze = require(path.join(root, "scripts", "palmmi-analyze.js"));

function file({ name, type, size }) {
  return { name, type, size };
}

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

function createAnalyzeDoc() {
  const elements = new Map();

  function element(id) {
    const item = {
      id,
      dataset: {},
      hidden: false,
      textContent: "",
      removeAttribute() {},
      classList: {
        toggle() {},
      },
      querySelector() {
        return null;
      },
    };
    elements.set(id, item);
    return item;
  }

  [
    "analysisApp",
    "analysisTitle",
    "analysisCopy",
    "analysisStatusPill",
    "analysisRunning",
    "analysisDone",
    "analysisProblem",
    "analysisProblemTitle",
    "analysisProblemCopy",
    "analysisPreviewImage",
    "analysisPreviewFallback",
    "analysisFileName",
    "analysisFileMeta",
  ].forEach(element);

  return {
    body: { dataset: {} },
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

const tenMb = 10 * 1024 * 1024;

{
  const storage = createMemoryStorage();
  const result = upload.prepareUploadForAnalysis({
    file: null,
    previewDataUrl: "",
    storage,
  });

  assert.equal(result.ok, false);
  assert.equal(result.shouldNavigate, false);
  assert.equal(result.code, "missing_file");
  assert.match(result.message, /请先选择/);
  assert.equal(storage.getItem(upload.UPLOAD_STORAGE_KEY), null);
}

assert.equal(upload.validateUploadFile(file({ name: "notes.txt", type: "text/plain", size: 1024 })).code, "invalid_type");
assert.equal(upload.validateUploadFile(file({ name: "large.jpg", type: "image/jpeg", size: tenMb + 1 })).code, "too_large");
assert.equal(upload.createPreviewReadFailureResult().message, "这张图片暂时无法读取，请重新选择。");

assert.deepEqual(Object.values(analyze.ANALYSIS_STATES), [
  "idle",
  "analyzing",
  "done",
  "missing-upload",
  "invalid-upload",
  "timeout",
  "error",
]);

{
  const storage = createMemoryStorage();
  const read = analyze.readUploadState(storage);
  assert.equal(read.ok, false);
  assert.equal(read.state, "missing-upload");
}

{
  const storage = createMemoryStorage();
  storage.setItem(analyze.UPLOAD_STORAGE_KEY, "{not json");
  const read = analyze.readUploadState(storage);
  assert.equal(read.ok, false);
  assert.equal(read.state, "invalid-upload");
}

{
  const storage = createMemoryStorage();
  storage.setItem(analyze.UPLOAD_STORAGE_KEY, JSON.stringify({ fileName: "palm.jpg" }));
  const read = analyze.readUploadState(storage);
  assert.equal(read.ok, false);
  assert.equal(read.state, "invalid-upload");
}

assert.equal(analyze.readRequestedTestState({ search: "?state=missing-upload" }), "missing-upload");
assert.equal(analyze.readRequestedTestState({ search: "?state=invalid-upload" }), "invalid-upload");
assert.equal(analyze.readRequestedTestState({ search: "?state=timeout" }), "timeout");
assert.equal(analyze.readRequestedTestState({ search: "?state=error" }), "error");
assert.equal(analyze.readRequestedTestState({ search: "?state=done" }), null);

{
  const model = analyze.createProblemViewModel("timeout");
  assert.equal(model.title, "分析暂时没有完成");
  assert.match(model.message, /重新上传/);
  assert.equal(model.primaryActionText, "重新上传");
  assert.equal(model.primaryHref, "../upload/index.html");
}

{
  const model = analyze.createProblemViewModel("error");
  assert.equal(model.title, "需要重新上传");
  assert.match(model.message, /重新上传/);
  assert.equal(model.primaryActionText, "重新上传");
}

{
  const storage = createMemoryStorage();
  const existing = JSON.stringify({ status: "SUCCESS", created_at: "before-error" });
  storage.setItem(analyze.ANALYSIS_RESULT_STORAGE_KEY, existing);

  const doc = createAnalyzeDoc();
  analyze.initAnalyzePage(doc, {
    storage,
    location: { search: "?state=error" },
  });

  assert.equal(storage.getItem(analyze.ANALYSIS_RESULT_STORAGE_KEY), existing);
  assert.equal(doc.body.dataset.analysisState, "error");
  assert.equal(doc.getElementById("analysisProblem").hidden, false);
}

const stage4Sources = [
  "scripts/palmmi-upload.js",
  "scripts/palmmi-analyze.js",
  "upload/index.html",
  "analyze/index.html",
].map((item) => fs.readFileSync(path.join(root, item), "utf8")).join("\n");

assert.doesNotMatch(stage4Sources, /\bfetch\s*\(/i, "Stage 4E must not call a real API");
assert.doesNotMatch(stage4Sources, /OpenAI|Qwen|Qwen-VL|百炼|千问|Vision API/i, "Stage 4E must not call real vision providers");
assert.doesNotMatch(
  stage4Sources,
  /personaRules|personaMatcher|adjacentResolver|crossMotherCorrection|motherScores/i,
  "Stage 4E page code must not import Stage 3 core rule files"
);

console.log("Stage 4E error-state tests passed.");

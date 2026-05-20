const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

const analyze = require(path.join(root, "scripts", "palmmi-analyze.js"));
const upload = require(path.join(root, "scripts", "palmmi-upload.js"));

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

const uploadState = {
  schemaVersion: "stage4d_upload_v1",
  fileName: "palm.jpg",
  fileType: "image/jpeg",
  fileSize: 512000,
  fileSizeLabel: "500 KB",
  previewDataUrl: "data:image/jpeg;base64,stage4d",
  uploadedAt: "2026-05-17T00:00:00.000Z",
  handSide: null,
};

assert.equal(upload.UPLOAD_STORAGE_KEY, "palmmi:lastUpload");
assert.equal(analyze.UPLOAD_STORAGE_KEY, "palmmi:lastUpload");
assert.equal(analyze.ANALYSIS_RESULT_STORAGE_KEY, "palmmi:lastAnalysisResult");

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
  storage.setItem(analyze.UPLOAD_STORAGE_KEY, JSON.stringify(uploadState));

  const read = analyze.readUploadState(storage);

  assert.equal(read.ok, true);
  assert.equal(read.state, "idle");
  assert.equal(read.upload.fileName, "palm.jpg");
  assert.equal(read.upload.fileSizeLabel, "500 KB");
}

{
  const storage = createMemoryStorage();
  const read = analyze.readUploadState(storage);

  assert.equal(read.ok, false);
  assert.equal(read.state, "missing-upload");
  assert.match(read.message, /请先上传/);
}

{
  const storage = createMemoryStorage();
  storage.setItem(analyze.UPLOAD_STORAGE_KEY, "{not json");

  const read = analyze.readUploadState(storage);

  assert.equal(read.ok, false);
  assert.equal(read.state, "invalid-upload");
  assert.match(read.message, /重新上传/);
}

{
  const storage = createMemoryStorage();
  const result = analyze.createStage4DMockRecognitionResult(uploadState, {
    now: () => "2026-05-17T00:00:01.000Z",
  });

  analyze.saveAnalysisResult(storage, result);

  const saved = JSON.parse(storage.getItem(analyze.ANALYSIS_RESULT_STORAGE_KEY));
  assert.equal(saved.status, "SUCCESS");
  assert.equal(saved.debug.mock_vlm_used, false);
  assert.equal(saved.debug.pipeline_version, "stage4d_static_browser_adapter_v1");
  assert.equal(saved.image_input.file_name, "palm.jpg");
}

{
  const state = upload.buildUploadState({
    file: { name: "palm.webp", type: "image/webp", size: 1024 },
    previewDataUrl: "data:image/webp;base64,stage4d",
    now: () => "2026-05-17T00:00:02.000Z",
  });

  assert.equal(state.fileName, "palm.webp");
  assert.equal(state.fileType, "image/webp");
  assert.equal(state.fileSize, 1024);
  assert.equal(state.fileSizeLabel, "1 KB");
  assert.equal(state.previewDataUrl, "data:image/webp;base64,stage4d");
  assert.equal(state.uploadedAt, "2026-05-17T00:00:02.000Z");
}

{
  const storage = createMemoryStorage();
  upload.saveUploadState(storage, uploadState);

  const saved = JSON.parse(storage.getItem(upload.UPLOAD_STORAGE_KEY));
  assert.equal(saved.fileName, "palm.jpg");
  assert.equal(saved.schemaVersion, "stage4d_upload_v1");
}

const analyzeSource = fs.readFileSync(path.join(root, "scripts", "palmmi-analyze.js"), "utf8");
assert.doesNotMatch(analyzeSource, /\bfetch\s*\(/i, "Stage 4D must not call a real API");
assert.doesNotMatch(analyzeSource, /OpenAI|Qwen|Qwen-VL|百炼|千问|Vision API/i, "Stage 4D must not mention or call real vision providers");
assert.doesNotMatch(
  analyzeSource,
  /personaRules|personaMatcher|adjacentResolver|crossMotherCorrection|motherScores/i,
  "Stage 4D page code must not import Stage 3 core rule files"
);

console.log("Stage 4D analyze flow tests passed.");

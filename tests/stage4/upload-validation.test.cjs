const assert = require("node:assert/strict");
const { validateUploadFile, MAX_UPLOAD_BYTES } = require("../../scripts/palmmi-upload.js");

function file({ name, type, size }) {
  return { name, type, size };
}

const tenMb = 10 * 1024 * 1024;

assert.equal(MAX_UPLOAD_BYTES, tenMb, "Stage 4C upload limit should stay at 10MB");

assert.deepEqual(validateUploadFile(null), {
  ok: false,
  code: "missing_file",
  message: "请先选择一张清晰的手掌照片。"
});

assert.deepEqual(validateUploadFile(file({ name: "notes.txt", type: "text/plain", size: 1024 })), {
  ok: false,
  code: "invalid_type",
  message: "图片格式不支持，请上传 JPG / PNG / WebP。"
});

assert.deepEqual(validateUploadFile(file({ name: "large.jpg", type: "image/jpeg", size: tenMb + 1 })), {
  ok: false,
  code: "too_large",
  message: "图片太大，请换一张 10MB 以内的图片。"
});

for (const type of ["image/jpeg", "image/png", "image/webp"]) {
  assert.deepEqual(validateUploadFile(file({ name: `palm.${type.split("/")[1]}`, type, size: tenMb })), {
    ok: true,
    code: "accepted",
    message: "图片已选择，可以预览。"
  });
}

console.log("Stage 4C upload validation tests passed.");

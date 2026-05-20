const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

function readHtml(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const pages = {
  home: readHtml("index.html"),
  upload: readHtml(path.join("upload", "index.html")),
  analyze: readHtml(path.join("analyze", "index.html")),
  result: readHtml(path.join("result", "index.html")),
  poster: readHtml(path.join("poster", "index.html")),
};

assert.match(pages.home, /href="upload\/index\.html"/, "Home should link into upload");
assert.match(pages.upload, /id="startAnalyze"/, "Upload should expose the analyze CTA");
assert.match(pages.upload, /scripts\/palmmi-upload\.js/, "Upload should load its local script");
assert.match(pages.analyze, /id="viewResult"/, "Analyze should expose the result CTA");
assert.match(pages.analyze, /scripts\/palmmi-analyze\.js/, "Analyze should load its local script");
assert.match(pages.result, /href="\.\.\/poster\/index\.html"/, "Result should link into poster");
assert.match(pages.poster, /href="\.\.\/upload\/index\.html"/, "Poster should expose a retest link");

for (const [name, html] of Object.entries(pages)) {
  assert.match(html, /<link rel="icon" href="data:,?"/, `${name} should use a local data favicon to avoid browser 404 noise`);
}

const stage4Sources = Object.values(pages).join("\n");
assert.doesNotMatch(stage4Sources, /\bfetch\s*\(/i, "Stage 4J pages must not call a real API");
assert.doesNotMatch(stage4Sources, /OpenAI|Qwen|Qwen-VL|百炼|千问|Vision API/i, "Stage 4J pages must not mention or call real vision providers");
assert.doesNotMatch(stage4Sources, /html2canvas|toDataURL|canvas\.toBlob|download\s*=|navigator\.clipboard|QRCode/i, "Stage 4J must not implement export or sharing");

console.log("Stage 4J full-flow tests passed.");

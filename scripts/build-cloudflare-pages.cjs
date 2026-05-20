const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist");

const files = [
  "index.html",
  "upload/index.html",
  "analyze/index.html",
  "result/index.html",
  "poster/index.html",
  "styles/palmmi.css",
  "scripts/palmmi-upload.js",
  "scripts/palmmi-analyze-api-client.js",
  "scripts/palmmi-stage5.js",
  "scripts/palmmi-analyze.js",
  "scripts/palmmi-result.js",
  "scripts/palmmi-poster.js",
  "assets/palmtag-topology.svg",
];

function copyFile(relativePath) {
  const source = path.join(root, relativePath);
  if (!fs.existsSync(source)) {
    return;
  }
  const target = path.join(outDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
for (const file of files) {
  copyFile(file);
}

console.log(`Cloudflare Pages static output written to ${path.relative(root, outDir)}`);

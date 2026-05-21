const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const trackedPrefixes = [
  "server/",
  "src/",
  "scripts/",
  "tests/",
  "docs/",
  "functions/",
  "api/",
  "worker/",
];
const buildOutputDirs = ["dist"];
const textExtensions = new Set([
  ".cjs",
  ".js",
  ".json",
  ".md",
  ".html",
  ".css",
  ".txt",
  ".toml",
  ".yml",
  ".yaml",
]);

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function walk(directory) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    return [];
  }
  const output = [];
  const stack = [directory];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git") {
          continue;
        }
        stack.push(absolute);
      } else if (entry.isFile()) {
        output.push(absolute);
      }
    }
  }
  return output;
}

function trackedFiles() {
  return childProcess.execSync("git ls-files", { cwd: root, encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((file) => trackedPrefixes.some((prefix) => normalizePath(file).startsWith(prefix)))
    .map((file) => path.join(root, file));
}

function scanFiles() {
  const files = new Set(trackedFiles());
  for (const dir of buildOutputDirs) {
    for (const file of walk(path.join(root, dir))) {
      files.add(file);
    }
  }
  return Array.from(files)
    .filter((file) => textExtensions.has(path.extname(file).toLowerCase()))
    .filter((file) => fs.existsSync(file));
}

function isAllowedPlaceholder(value) {
  return /^(test|stage6f|dummy|example|placeholder|redacted|secret|your|mock|empty|none)/i.test(value);
}

function collectFindings(file, text) {
  const findings = [];
  const relative = normalizePath(path.relative(root, file));
  const lines = text.split(/\r?\n/);

  const bearerPattern = /Bearer[^\S\r\n]+([A-Za-z0-9._~+/=-]{20,})/g;
  const keyAssignmentPattern = /\b(PALMMI_QWEN_API_KEY|QWEN_API_KEY)\b[^\S\r\n]*[:=][^\S\r\n]*["']?([A-Za-z0-9._~+/=-]{20,})/g;
  for (const line of lines) {
    for (const match of line.matchAll(bearerPattern)) {
      if (!isAllowedPlaceholder(match[1]) && !match[0].includes("${")) {
        findings.push({ file: relative, type: "AUTHORIZATION_BEARER_TOKEN" });
      }
    }
    for (const match of line.matchAll(keyAssignmentPattern)) {
      if (!isAllowedPlaceholder(match[2])) {
        findings.push({ file: relative, type: "QWEN_API_KEY_VALUE" });
      }
    }
  }

  if (/data:image\/(?:png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]{200,}/.test(text)) {
    findings.push({ file: relative, type: "LONG_IMAGE_DATA_URL" });
  }

  if (/\bbase64,?[A-Za-z0-9+/=]{500,}/.test(text)) {
    findings.push({ file: relative, type: "LONG_BASE64_PAYLOAD" });
  }

  if (/"choices"\s*:\s*\[[\s\S]{0,2000}"usage"\s*:/.test(text) || /"raw_response"\s*:\s*\{/.test(text)) {
    findings.push({ file: relative, type: "RAW_QWEN_RESPONSE_PAYLOAD" });
  }

  return findings;
}

function scanProductionImageStorageRisk() {
  const productionFiles = [
    ...walk(path.join(root, "server")),
    ...walk(path.join(root, "functions")),
    ...walk(path.join(root, "api")),
    ...walk(path.join(root, "worker")),
  ].filter((file) => textExtensions.has(path.extname(file).toLowerCase()));

  const findings = [];
  for (const file of productionFiles) {
    const text = fs.readFileSync(file, "utf8");
    const relative = normalizePath(path.relative(root, file));
    if (/fs\.(writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream)\s*\(/.test(text)) {
      findings.push({ file: relative, type: "PRODUCTION_FILE_WRITE" });
    }
    if (/\b(KV|R2|D1|DurableObject|bucket|putObject)\b/.test(text) && /image|upload|base64|previewDataUrl/i.test(text)) {
      findings.push({ file: relative, type: "PERSISTENT_IMAGE_STORAGE_REFERENCE" });
    }
  }
  return findings;
}

function main() {
  const files = scanFiles();
  const findings = [];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    findings.push(...collectFindings(file, text));
  }
  const storageFindings = scanProductionImageStorageRisk();
  findings.push(...storageFindings);

  const summary = {
    stage: "6F",
    scanned_file_count: files.length,
    scanned_ranges: [...trackedPrefixes, ...buildOutputDirs.map((dir) => `${dir}/`)],
    finding_count: findings.length,
    findings,
    no_key_or_token_leak: findings.every((finding) => !["AUTHORIZATION_BEARER_TOKEN", "QWEN_API_KEY_VALUE"].includes(finding.type)),
    no_base64_leak: findings.every((finding) => !["LONG_IMAGE_DATA_URL", "LONG_BASE64_PAYLOAD"].includes(finding.type)),
    no_raw_response_leak: findings.every((finding) => finding.type !== "RAW_QWEN_RESPONSE_PAYLOAD"),
    no_persistent_image_storage: findings.every((finding) => !["PRODUCTION_FILE_WRITE", "PERSISTENT_IMAGE_STORAGE_REFERENCE"].includes(finding.type)),
  };

  console.log(JSON.stringify(summary, null, 2));
  assert.equal(findings.length, 0, "Stage 6F security scan found forbidden leakage or storage patterns.");
}

main();

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist");

const files = [
  "index.html",
  "upload/index.html",
  "analyze/index.html",
  "result/index.html",
  "poster/index.html",
  "feedback/index.html",
  "styles/palmmi.css",
  "scripts/palmmi-upload.js",
  "scripts/palmmi-analyze-api-client.js",
  "scripts/palmmi-stage5.js",
  "scripts/palmmi-analyze.js",
  "scripts/palmmi-result.js",
  "scripts/palmmi-poster.js",
  "scripts/palmmi-feedback.js",
  "src/stage5/analysis-result-read-adapter.js",
  "src/stage5/analysis-result-storage-reader.js",
  "src/stage5/page-analysis-reader.js",
  "src/stage5/page-analysis-state-mapper.js",
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

function getGitValue(args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return null;
  }

  const value = result.stdout.trim();
  return value || null;
}

function getCommitSha() {
  if (process.env.CF_PAGES_COMMIT_SHA) {
    return {
      value: process.env.CF_PAGES_COMMIT_SHA,
      source: "CF_PAGES_COMMIT_SHA",
    };
  }

  if (process.env.GITHUB_SHA) {
    return {
      value: process.env.GITHUB_SHA,
      source: "GITHUB_SHA",
    };
  }

  return {
    value: getGitValue(["rev-parse", "HEAD"]) || "unknown",
    source: "git",
  };
}

function getBranch() {
  if (process.env.CF_PAGES_BRANCH) {
    return {
      value: process.env.CF_PAGES_BRANCH,
      source: "CF_PAGES_BRANCH",
    };
  }

  if (process.env.GITHUB_REF_NAME) {
    return {
      value: process.env.GITHUB_REF_NAME,
      source: "GITHUB_REF_NAME",
    };
  }

  return {
    value: getGitValue(["branch", "--show-current"]) || "unknown",
    source: "git",
  };
}

function writeBuildMeta() {
  const commit = getCommitSha();
  const branch = getBranch();
  const meta = {
    app: "palmmi",
    platform: "cloudflare-pages",
    commit_sha: commit.value,
    commit_source: commit.source,
    branch: branch.value,
    branch_source: branch.source,
    url: process.env.CF_PAGES_URL || null,
    built_at: new Date().toISOString(),
    api_calls_made: 0,
    real_qwen_called: false,
  };

  fs.writeFileSync(
    path.join(outDir, "build-meta.json"),
    `${JSON.stringify(meta, null, 2)}\n`,
    "utf8"
  );
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
for (const file of files) {
  copyFile(file);
}
writeBuildMeta();

console.log(`Cloudflare Pages static output written to ${path.relative(root, outDir)}`);

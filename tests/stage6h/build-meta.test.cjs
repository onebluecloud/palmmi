const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const buildScript = path.join(root, 'scripts/build-cloudflare-pages.cjs');
const metaPath = path.join(root, 'dist/build-meta.json');

const result = spawnSync(process.execPath, [buildScript], {
  cwd: root,
  env: {
    ...process.env,
    CF_PAGES_COMMIT_SHA: '1234567890abcdef1234567890abcdef12345678',
    CF_PAGES_BRANCH: 'main',
    CF_PAGES_URL: 'https://palmmi.example.test'
  },
  encoding: 'utf8'
});

assert.equal(result.status, 0, result.stderr || result.stdout);
assert.equal(fs.existsSync(metaPath), true, 'build-meta.json should be generated');

const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

assert.equal(meta.app, 'palmmi');
assert.equal(meta.platform, 'cloudflare-pages');
assert.equal(meta.commit_sha, '1234567890abcdef1234567890abcdef12345678');
assert.equal(meta.commit_source, 'CF_PAGES_COMMIT_SHA');
assert.equal(meta.branch, 'main');
assert.equal(meta.branch_source, 'CF_PAGES_BRANCH');
assert.equal(meta.url, 'https://palmmi.example.test');
assert.equal(meta.real_qwen_called, false);
assert.equal(meta.api_calls_made, 0);
assert.match(meta.built_at, /^\d{4}-\d{2}-\d{2}T/);

const serialized = JSON.stringify(meta);
assert.equal(/api[_-]?key|secret|token|base64|raw[_-]?response|sk-/i.test(serialized), false);

console.log('Stage 6H build metadata tests passed.');

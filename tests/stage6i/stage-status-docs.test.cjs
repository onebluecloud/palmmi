const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assertNoPattern(text, pattern, message) {
  assert.equal(pattern.test(text), false, message);
}

const packageJson = JSON.parse(readRepoFile('package.json'));
const stage6State = readRepoFile('docs/STAGE6_STATE.md');
const stage6iChecklist = readRepoFile('docs/STAGE6I_RELEASE_CANDIDATE_CHECKLIST.md');

const testStage6iScript = packageJson.scripts && packageJson.scripts['test:stage6i'];

assert.ok(testStage6iScript, 'package.json must define test:stage6i');
assert.ok(
  testStage6iScript.includes('tests/stage6i/stage-status-docs.test.cjs'),
  'test:stage6i must include the Stage 6 status docs guard'
);

assertNoPattern(
  testStage6iScript,
  /test:stage6f:real|e2e:real-qwen|--real\b|PALMMI_ALLOW_REAL_QWEN_TESTS=1/i,
  'test:stage6i must stay zero-cost and must not invoke real Qwen tests'
);

assert.ok(
  stage6State.includes('Stage 6H：MANUAL_DEFERRED_FINAL_GATE。'),
  'Stage 6H must remain an explicit deferred manual final gate'
);
assert.ok(
  stage6State.includes('Stage 6I status: READY_FOR_DEVELOPMENT_MANUAL_DEFERRED'),
  'Stage 6I must remain development-ready but manual-deferred'
);
assert.ok(
  stage6State.includes('最终真机验收时，补充安卓微信拍照上传复测结果。'),
  'Android WeChat retest tasks should be deferred to final true-device acceptance'
);

assertNoPattern(
  stage6State,
  /等待本次 Final-Fix 部署后|Final-Fix 部署后/,
  'Stage 6 state must not describe already deployed work as still waiting for deployment'
);

for (const label of [
  'iPhone 微信真机测试',
  '安卓微信真机测试',
  'iPhone Safari 真机测试',
  'Android Chrome 真机测试',
  '安卓微信人格塌缩观察'
]) {
  const manualPattern = new RegExp(`\\|\\s*${label}\\s*\\|\\s*MANUAL_REQUIRED\\s*\\|`);
  assert.ok(manualPattern.test(stage6State), `${label} must remain MANUAL_REQUIRED`);

  const falsePassPattern = new RegExp(`\\|\\s*${label}\\s*\\|\\s*(PASS|CONDITIONAL_PASS)\\s*\\|`);
  assertNoPattern(stage6State, falsePassPattern, `${label} must not be marked as PASS by automation`);
}

assert.ok(
  stage6iChecklist.includes('Runtime-code continuation audit passed'),
  'Stage 6I checklist should label f99a262 as runtime-code audit, not latest deployment forever'
);
assert.ok(
  stage6iChecklist.includes('Later docs-only commits only need deployment pointer preflight'),
  'Stage 6I checklist should document how docs-only commits are handled'
);

console.log('Stage 6 status docs guard tests passed.');

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

require.extensions[".ts"] = require.extensions[".js"];

const root = path.resolve(__dirname, "..", "..");
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function loadFixture(name) {
  const filePath = path.join(__dirname, "fixtures", name);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

for (const file of [
  "persona-matcher.test.ts",
  "adjacent-resolver.test.ts",
  "cross-mother-correction.test.ts",
]) {
  require(path.join(__dirname, file))({ test, assert, loadFixture, root });
}

let failed = 0;

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error && error.stack ? error.stack : error);
  }
}

if (failed > 0) {
  console.error(`${failed}/${tests.length} Stage 3H tests failed.`);
  process.exit(1);
}

console.log(`${tests.length}/${tests.length} Stage 3H tests passed.`);

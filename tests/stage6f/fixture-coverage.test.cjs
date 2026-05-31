const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const fixtureDir = path.join(root, "tests", "stage6f", "specialized-fixtures");
const requiredFixtures = [
  {
    name: "dark_palm_image",
    fileName: "dark-palm.jpg",
    pattern: /(dark|dim|low-light|underexposed|偏暗)/i,
  },
  {
    name: "blurry_palm_image",
    fileName: "blurry-palm.jpg",
    pattern: /(blur|blurry|模糊)/i,
  },
  {
    name: "cropped_incomplete_palm_image",
    fileName: "cropped-incomplete-palm.jpg",
    pattern: /(crop|cropped|incomplete|partial|裁切|不完整)/i,
  },
];

function isJpeg(buffer) {
  return buffer.length > 4
    && buffer[0] === 0xff
    && buffer[1] === 0xd8
    && buffer[buffer.length - 2] === 0xff
    && buffer[buffer.length - 1] === 0xd9;
}

function main() {
  assert.equal(path.basename(fixtureDir), "specialized-fixtures");
  assert.equal(path.basename(path.dirname(fixtureDir)), "stage6f");

  const missing = [];
  for (const fixture of requiredFixtures) {
    assert.match(fixture.fileName, fixture.pattern, `${fixture.name} fixture file name must be discoverable by Stage 6F scan`);
    const filePath = path.join(fixtureDir, fixture.fileName);
    if (!fs.existsSync(filePath)) {
      missing.push(fixture.name);
      continue;
    }
    const buffer = fs.readFileSync(filePath);
    assert.ok(buffer.length > 1024, `${fixture.name} fixture should be a real image, not an empty placeholder`);
    assert.ok(buffer.length < 1024 * 1024, `${fixture.name} fixture should stay small for default tests`);
    assert.ok(isJpeg(buffer), `${fixture.name} fixture must be a JPEG`);
  }

  assert.deepEqual(missing, [], "Stage 6F specialized abnormal image fixtures are missing");
  console.log("Stage 6F fixture coverage tests passed.");
}

main();

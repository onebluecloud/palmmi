const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const stage5c = require(path.join(root, "scripts", "palmmi-stage5c-runner.js"));

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "palmmi-stage5c-"));
}

async function main() {
  {
    const examplePath = path.join(root, "docs", "stage5", "stage5c-samples.example.json");
    const example = JSON.parse(fs.readFileSync(examplePath, "utf8"));
    assert.ok(Array.isArray(example));
    assert.ok(example.length > 0);
    assert.equal(example[0].sampleId, "sample-001");
    assert.match(example[0].imagePath, /^E:\/example\//);
    assert.equal(example[0].handLabel, "real-human-palm");
  }

  {
    const sampleDir = makeTempDir();
    const leftImage = path.join(sampleDir, "client-left.jpg");
    const rightImage = path.join(sampleDir, "demo-右.png");
    const unknownImage = path.join(sampleDir, "微信图片.webp");
    const ignored = path.join(sampleDir, "notes.txt");
    fs.writeFileSync(leftImage, Buffer.from("left"));
    fs.writeFileSync(rightImage, Buffer.from("right"));
    fs.writeFileSync(unknownImage, Buffer.from("unknown"));
    fs.writeFileSync(ignored, "ignore");

    const manifestPath = path.join(sampleDir, "manifest.local.json");
    const manifest = stage5c.generateLocalManifest({
      sampleDir,
      manifestPath,
    });

    assert.equal(manifest.length, 3);
    assert.deepEqual(manifest.map((item) => item.sampleId), ["sample-001", "sample-002", "sample-003"]);
    const sidesByName = Object.fromEntries(
      manifest.map((item) => [path.basename(item.imagePath), item.side])
    );
    assert.equal(sidesByName["client-left.jpg"], "left");
    assert.equal(sidesByName["demo-右.png"], "right");
    assert.equal(sidesByName["微信图片.webp"], "unknown");
    assert.ok(manifest.every((item) => item.imagePath.includes("/")));
    assert.ok(manifest.every((item) => item.handLabel === "real-human-palm"));
    assert.ok(fs.existsSync(manifestPath));
  }

  {
    const sampleDir = makeTempDir();
    const existingImage = path.join(sampleDir, "usable-right.jpg");
    const missingImage = path.join(sampleDir, "missing-left.jpg");
    const manifestPath = path.join(sampleDir, "manifest.local.json");
    const outputPath = path.join(sampleDir, "results.local.json");
    fs.writeFileSync(existingImage, Buffer.from("image bytes"));
    fs.writeFileSync(manifestPath, JSON.stringify([
      {
        sampleId: "sample-001",
        imagePath: existingImage.replace(/\\/g, "/"),
        side: "right",
        handLabel: "real-human-palm",
        expectedValidity: "valid",
        notes: "existing test image",
      },
      {
        sampleId: "sample-002",
        imagePath: missingImage.replace(/\\/g, "/"),
        side: "left",
        handLabel: "real-human-palm",
        expectedValidity: "valid",
        notes: "missing test image",
      },
    ], null, 2));

    const summary = await stage5c.runStage5C({
      provider: "mock",
      manifest: manifestPath,
      output: outputPath,
    });

    assert.equal(summary.provider, "mock");
    assert.equal(summary.total, 2);
    assert.equal(summary.okCount, 1);
    assert.equal(summary.failedCount, 1);
    assert.ok(fs.existsSync(outputPath));

    const output = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    assert.equal(output.provider, "mock");
    assert.equal(output.model, "stage5c-mock-vlm");
    assert.equal(output.results.length, 2);
    assert.deepEqual(
      output.results.map((item) => ({
        sampleId: item.sampleId,
        ok: item.ok,
        parsedValidity: item.parsedValidity,
        errorCode: item.errorCode,
      })),
      [
        {
          sampleId: "sample-001",
          ok: true,
          parsedValidity: true,
          errorCode: null,
        },
        {
          sampleId: "sample-002",
          ok: false,
          parsedValidity: null,
          errorCode: "INVALID_IMAGE",
        },
      ]
    );
    assert.equal(typeof output.results[0].latencyMs, "number");
    assert.ok(Array.isArray(output.results[0].warnings));
  }

  {
    const sampleDir = makeTempDir();
    const imagePath = path.join(sampleDir, "auto-left.jpeg");
    const manifestPath = path.join(sampleDir, "auto-manifest.local.json");
    const outputPath = path.join(sampleDir, "auto-results.local.json");
    fs.writeFileSync(imagePath, Buffer.from("image bytes"));

    const summary = await stage5c.runStage5C({
      provider: "mock",
      sampleDir,
      manifest: manifestPath,
      output: outputPath,
    });

    assert.equal(summary.total, 1);
    assert.ok(fs.existsSync(manifestPath));
    assert.ok(fs.existsSync(outputPath));
  }

  {
    const sampleDir = makeTempDir();
    const imagePath = path.join(sampleDir, "normalized-left.jpg");
    const manifestPath = path.join(sampleDir, "normalized-manifest.local.json");
    const outputPath = path.join(sampleDir, "normalized-results.local.json");
    fs.writeFileSync(imagePath, Buffer.from("image bytes"));
    fs.writeFileSync(manifestPath, JSON.stringify([
      {
        sampleId: "sample-001",
        imagePath: imagePath.replace(/\\/g, "/"),
        side: "left",
        handLabel: "real-human-palm",
        expectedValidity: "valid",
      },
    ], null, 2));

    const summary = await stage5c.runStage5C({
      provider: "mock",
      manifest: manifestPath,
      output: outputPath,
      normalize: true,
    });

    assert.equal(summary.total, 1);
    assert.equal(summary.results[0].ok, true);
    assert.equal(summary.results[0].featureSet.schemaVersion, "palm-feature-set.v1");
    assert.equal(summary.results[0].featureSet.rawProvider.provider, "mock");
    assert.equal(summary.results[0].featureSet.majorLines.lifeLine.visible, true);
    assert.equal(
      Object.prototype.hasOwnProperty.call(summary.results[0], "rawText"),
      false
    );
  }

  {
    const sampleDir = makeTempDir();
    const imagePath = path.join(sampleDir, "rule-input-left.jpg");
    const manifestPath = path.join(sampleDir, "rule-input-manifest.local.json");
    const outputPath = path.join(sampleDir, "rule-input-results.local.json");
    fs.writeFileSync(imagePath, Buffer.from("image bytes"));
    fs.writeFileSync(manifestPath, JSON.stringify([
      {
        sampleId: "sample-001",
        imagePath: imagePath.replace(/\\/g, "/"),
        side: "left",
        handLabel: "real-human-palm",
        expectedValidity: "valid",
      },
    ], null, 2));

    const summary = await stage5c.runStage5C({
      provider: "mock",
      manifest: manifestPath,
      output: outputPath,
      normalize: true,
      toRuleInput: true,
    });

    assert.equal(summary.normalized, true);
    assert.equal(summary.toRuleInput, true);
    assert.equal(summary.results[0].featureSet.schemaVersion, "palm-feature-set.v1");
    assert.equal(summary.results[0].ruleInput.schemaVersion, "rule-input.v1");
    assert.equal(summary.results[0].ruleInput.source, "palm-feature-set");
    assert.equal(typeof summary.results[0].ruleInput.normalized_33_fields.LIFE_LINE_LENGTH, "number");
  }

  console.log("Stage 5C runner tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

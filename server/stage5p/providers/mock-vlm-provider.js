const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const {
  MockStage5CProvider,
} = require(path.join(root, "scripts", "palmmi-stage5c-runner.js"));

function imageBufferFrom(input = {}) {
  const image = input.image || {};
  if (Buffer.isBuffer(image.imageBuffer)) {
    return image.imageBuffer;
  }
  if (Buffer.isBuffer(image.buffer)) {
    return image.buffer;
  }
  if (typeof image.base64 === "string" && image.base64.trim()) {
    const raw = image.base64.includes(",") ? image.base64.split(",").pop() : image.base64;
    return Buffer.from(raw, "base64");
  }
  return Buffer.from("palmmi-stage5p-mock-image");
}

class MockVlmProvider {
  constructor(options = {}) {
    this.name = "mock";
    this.model = options.model || "stage5p-mock-vlm";
    this.provider = new MockStage5CProvider({ model: this.model });
  }

  async analyze(input = {}) {
    return this.provider.analyzePalmImage({
      imageBuffer: imageBufferFrom(input),
      mimeType: (input.image && input.image.content_type) || "image/jpeg",
      side: (input.image && input.image.side) || "unknown",
      handLabel: "real-human-palm",
      sampleId: input.request_id || null,
      metadata: {
        anonymous_device_id: input.anonymous_device_id || null,
      },
    });
  }
}

module.exports = {
  MockVlmProvider,
};

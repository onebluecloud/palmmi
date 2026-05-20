const { RECOGNITION_STATUS } = require("./recognitionResult.ts");

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const MIN_SHORT_SIDE = 600;
const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function runQualityGate(image) {
  const reasonCodes = [];
  const warnings = [];
  const normalized = normalizeImageMetadata(image);

  if (!normalized) {
    return gateResult(RECOGNITION_STATUS.REJECTED, false, null, ["IMAGE_METADATA_MISSING"], warnings);
  }

  if (!normalized.file_hash) {
    reasonCodes.push("FILE_HASH_MISSING");
  }
  if (!SUPPORTED_MIME_TYPES.has(normalized.mime_type)) {
    reasonCodes.push("UNSUPPORTED_MIME_TYPE");
  }
  if (normalized.file_size > MAX_FILE_SIZE_BYTES) {
    reasonCodes.push("FILE_TOO_LARGE");
  }
  if (!Number.isFinite(normalized.width) || !Number.isFinite(normalized.height) || normalized.width <= 0 || normalized.height <= 0) {
    reasonCodes.push("INVALID_IMAGE_DIMENSIONS");
  } else if (Math.min(normalized.width, normalized.height) < MIN_SHORT_SIDE) {
    reasonCodes.push("IMAGE_TOO_SMALL");
  }

  if (reasonCodes.length > 0) {
    return gateResult(RECOGNITION_STATUS.REJECTED, false, normalized, reasonCodes, warnings);
  }

  if (normalized.is_palm === false) {
    return gateResult(RECOGNITION_STATUS.REJECTED, false, normalized, ["NOT_PALM"], warnings);
  }
  if (normalized.is_palm_side === false) {
    return gateResult(RECOGNITION_STATUS.REJECTED, false, normalized, ["BACK_OF_HAND"], warnings);
  }
  if (normalized.is_single_hand === false) {
    return gateResult(RECOGNITION_STATUS.REJECTED, false, normalized, ["MULTIPLE_HANDS"], warnings);
  }

  if (normalized.is_clear_enough === false || normalized.quality_score < 0.6) {
    return gateResult(RECOGNITION_STATUS.RETRY_REQUIRED, false, normalized, ["BLURRY_OR_LOW_CLARITY"], warnings);
  }

  if (normalized.quality_score < 0.8) {
    warnings.push("LOW_QUALITY_BUT_USABLE");
    return {
      status: "LOW_QUALITY_PASS",
      recognition_status: RECOGNITION_STATUS.LOW_CONFIDENCE,
      can_continue: true,
      image: normalized,
      reason_codes: ["LOW_QUALITY_PASS"],
      warnings,
      quality_score: normalized.quality_score,
      is_low_quality_pass: true,
    };
  }

  return {
    status: "PASS",
    recognition_status: RECOGNITION_STATUS.SUCCESS,
    can_continue: true,
    image: normalized,
    reason_codes: [],
    warnings,
    quality_score: normalized.quality_score,
    is_low_quality_pass: false,
  };
}

function normalizeImageMetadata(image) {
  if (!image || typeof image !== "object") {
    return null;
  }
  return {
    file_hash: typeof image.file_hash === "string" ? image.file_hash : "",
    mime_type: String(image.mime_type || "").toLowerCase(),
    file_size: Number(image.file_size ?? image.file_size_bytes),
    width: Number(image.width),
    height: Number(image.height),
    is_palm: image.is_palm,
    is_palm_side: image.is_palm_side,
    is_single_hand: image.is_single_hand,
    is_clear_enough: image.is_clear_enough,
    quality_score: normalizeQualityScore(image.quality_score),
  };
}

function normalizeQualityScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return numeric > 1 ? numeric / 100 : numeric;
}

function gateResult(status, canContinue, image, reasonCodes, warnings) {
  return {
    status,
    recognition_status: status,
    can_continue: canContinue,
    image,
    reason_codes: reasonCodes,
    warnings,
    quality_score: image ? image.quality_score : 0,
    is_low_quality_pass: false,
  };
}

module.exports = {
  MAX_FILE_SIZE_BYTES,
  MIN_SHORT_SIDE,
  SUPPORTED_MIME_TYPES,
  runQualityGate,
};

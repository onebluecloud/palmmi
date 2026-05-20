const RECOGNITION_STATUS = Object.freeze({
  SUCCESS: "SUCCESS",
  LOW_CONFIDENCE: "LOW_CONFIDENCE",
  RETRY_REQUIRED: "RETRY_REQUIRED",
  REJECTED: "REJECTED",
});

function emptyRecognitionPayload() {
  return {
    mother_scores: null,
    primary_mother: null,
    secondary_mother: null,
    is_dual_mother: false,
    primary_persona: null,
    top3: [],
    recognition: null,
  };
}

module.exports = {
  RECOGNITION_STATUS,
  emptyRecognitionPayload,
};

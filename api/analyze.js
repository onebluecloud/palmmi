const {
  runAnalyzeApi,
} = require("../server/stage5p/analyze-service.js");
const {
  ERROR_CODES,
  createErrorResponse,
} = require("../server/stage5p/errors.js");

async function readRequestBody(requestLike) {
  if (!requestLike) {
    return {};
  }
  if (typeof requestLike === "string") {
    return JSON.parse(requestLike);
  }
  if (typeof requestLike.json === "function") {
    return requestLike.json();
  }
  if (typeof requestLike.body === "string") {
    return JSON.parse(requestLike.body);
  }
  if (requestLike.body && typeof requestLike.body === "object") {
    return requestLike.body;
  }
  if (typeof requestLike === "object") {
    return requestLike;
  }
  return {};
}

async function handleAnalyzeRequest(requestLike, options = {}) {
  try {
    const body = await readRequestBody(requestLike);
    return runAnalyzeApi(body, options);
  } catch (error) {
    return createErrorResponse(ERROR_CODES.UNKNOWN_ERROR, null);
  }
}

module.exports = {
  handleAnalyzeRequest,
  runAnalyzeApi,
};

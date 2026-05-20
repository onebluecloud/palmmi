# Palmmi Stage 5 Technical Decisions

> Stage 5A decision freeze. This document records technical decisions only; it does not implement them.

## 1. VLM Provider Abstraction

Stage 5 will use a `VlmProvider` abstraction.

Reason:

- Stage 5 should not lock the product to one model vendor before a comparison experiment.
- Qwen, Doubao, GLM-4V, Gemini, and Mock can share the same project-facing contract.
- Provider-specific request formats, response formats, rate limits, timeouts, and error codes stay behind one adapter boundary.
- The rest of the app consumes `VlmAnalyzeOutput`, `PalmFeatureSet`, and `RecognitionResult`, not provider-native JSON.

Decision:

- The provider analyzes palm features only.
- The provider does not choose the final persona.
- The provider does not write directly to result/poster storage.
- The provider can be swapped by configuration or test setup without changing page rendering logic.

## 2. Qwen Default Strategy

Stage 5 will not hard-code Qwen as the only VLM.

Stage 5B should use Mock Provider by default because it is deterministic, free, and does not require API keys.

Stage 5D may use Qwen as the first real provider only if the Stage 5C comparison supports that choice and a human gate approves it. Even then, Qwen remains one provider behind the abstraction rather than the product contract itself.

Decision:

- Product contract: provider-neutral.
- Local/default development: Mock Provider.
- First real provider: selected after Stage 5C evidence and human approval.

## 3. VLM Comparison Experiment Strategy

Stage 5C will run a small model comparison before real provider lock-in.

Experiment size:

- 10-20 real palm images.
- Include varied lighting, focus quality, hand orientation, skin tones, and image sizes.
- Do not commit raw real-user images unless explicitly approved.

Models to compare:

- Qwen-compatible VLM.
- Doubao-compatible VLM.
- GLM-4V-compatible VLM.
- Gemini-compatible VLM.
- Mock Provider as deterministic control, where useful.

Scoring dimensions:

- Structured-output stability: same image and similar images produce schema-compatible fields.
- Refusal rate: model refuses or fails to analyze palm images.
- Cost: estimated cost per successful recognition.
- Speed: latency and timeout behavior.
- Availability: API access, quota, regional reliability, and integration complexity.
- Recoverability: provider errors can be mapped into existing Stage 4 error states.

Output:

- A short experiment report under `docs/stage5/experiments/`.
- A recommended first real provider for Stage 5D.
- Known risks, fallback provider notes, and rejected-provider reasons.

## 4. Deterministic Persona Mapping

The first Stage 5 mapping from palm features to the 36 personas will use deterministic rules.

Reason:

- The 36-persona content and original rule source are product assets that must remain stable.
- Deterministic rules are easier to test, review, diff, and reproduce.
- The result page needs stable `primary_persona` and `top3` behavior.
- Deterministic rules reduce model drift and unexpected model creativity.
- Error and low-confidence behavior can be handled explicitly.

Decision:

- VLM extracts palm features.
- `PalmFeatureSet` is validated and normalized.
- Deterministic mapping chooses persona output.
- The frontend receives only normalized `RecognitionResult`.

## 5. No LLM Second-Pass Persona Reasoning in Stage 5

Stage 5 will not use an LLM second reasoning pass to decide the final persona.

Reason:

- It would make persona choice harder to reproduce.
- It would blur the boundary between palm-feature recognition and product-rule mapping.
- It could rewrite, dilute, or contradict the existing 36-persona system.
- It adds cost and latency before the base recognition chain is proven.
- It increases test complexity and makes acceptance less deterministic.

Decision:

- LLM/VLM output can only contribute structured palm features.
- Final persona selection must be deterministic in Stage 5.
- Any future LLM-assisted explanation generation must be separately scoped after Stage 5 and must not change persona identity.

## 6. anonymous_device_id Minimal Design

Stage 5B introduces `anonymous_device_id`.

Storage:

```text
localStorage key: palmmi:anonymousDeviceId
```

Minimal behavior:

- Created once on the first Stage 5B-capable visit.
- Stored in `localStorage`.
- Sent with upload/analyze requests.
- Used for basic abuse protection, flow correlation, retry counting, and later aggregate analysis.
- Not treated as a logged-in identity.

Privacy boundaries:

- Do not bind to phone number.
- Do not bind to WeChat.
- Do not create an account system.
- Do not store name, phone, contact, or other direct personal identity fields.
- Do not use it as payment identity.

Recommended format:

- Random UUID-like identifier generated client-side.
- No embedded timestamp, IP, user agent, or device fingerprint.
- Regeneration is acceptable if the user clears browser storage.

## 7. Image Retention Strategy

Stage 5 should not store images long term by default.

Decision:

- Prefer temporary processing.
- Avoid long-term `base64` image storage in browser storage.
- If an upload reference is needed between upload and analyze pages, it must have an expiration time.
- Server-side temporary files or object-storage entries must have automatic deletion.
- Logs must not include raw images, base64 payloads, signed URLs, or full provider request bodies.

Recommended initial retention:

- Temporary upload references expire within 15-60 minutes.
- Failed analysis may retain the temporary reference only until expiration for a bounded retry.
- No permanent image archive in Stage 5.
- Any future cache must define key, TTL, deletion trigger, and privacy impact before implementation.

## 8. API Key Security Strategy

API keys are server-side secrets.

Decision:

- API keys are read only from environment variables.
- API keys must not be hard-coded.
- API keys must not be committed.
- API keys must not be copied into Markdown documents.
- API keys must not be exposed to frontend JavaScript.
- API keys must not appear in screenshots, logs, error messages, or test fixtures.

Documentation may refer to placeholder environment variable names, such as:

```text
PALMMI_VLM_PROVIDER
PALMMI_QWEN_API_KEY
PALMMI_DOUBAO_API_KEY
PALMMI_GLM4V_API_KEY
PALMMI_GEMINI_API_KEY
```

These names are placeholders for contract planning only. Real values are supplied outside the repository.

## 9. Error and Safety Decision

Provider and pipeline errors must be mapped into stable project-level error codes.

Decision:

- User-facing messages should reuse Stage 4 recoverable states where possible.
- Technical error details stay server-side.
- Result/poster pages never show raw provider JSON, schema debug output, prompt text, model traces, or stack traces.
- Images that are low quality, non-palm, multi-hand, or unsafe for analysis should return a retry/rejected state rather than a persona.

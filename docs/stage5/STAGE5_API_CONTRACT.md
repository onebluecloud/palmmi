# Palmmi Stage 5 API Contract

> Interface contract draft only. The TypeScript-like blocks below define shapes and naming conventions; they are not implementation code for this round.

## Contract Principles

- Provider output is not the product result.
- `RecognitionResult` is the internal standard result shape.
- VLM providers extract palm features only.
- Deterministic project rules choose the final persona.
- Raw provider responses must not be written directly into result/poster storage.
- API keys and provider secrets never enter frontend code or client storage.
- Images are temporary by default.

## VlmProvider Draft

```ts
type VlmProviderName =
  | "mock"
  | "qwen"
  | "doubao"
  | "glm4v"
  | "gemini";

interface VlmProvider {
  name: VlmProviderName;
  analyze(input: VlmAnalyzeInput): Promise<VlmAnalyzeOutput>;
}
```

Provider requirements:

- Accept one normalized `VlmAnalyzeInput`.
- Return one normalized `VlmAnalyzeOutput`.
- Hide provider-native request/response details.
- Apply provider timeout and schema validation.
- Never decide the final persona.

## VlmAnalyzeInput Draft

```ts
interface VlmAnalyzeInput {
  request_id: string;
  anonymous_device_id: string;
  image: {
    upload_ref?: string;
    temporary_url?: string;
    content_type: "image/jpeg" | "image/png" | "image/webp";
    size_bytes: number;
    width?: number;
    height?: number;
    sha256?: string;
  };
  locale: "zh-CN";
  timeout_ms: number;
  provider_options?: {
    provider?: VlmProviderName | "auto";
    model?: string;
    experiment_id?: string;
  };
}
```

Notes:

- `temporary_url` is server-side only and must not be exposed if it contains credentials.
- `upload_ref` must expire.
- `anonymous_device_id` is not a login identity.
- Image binary/base64 payload handling belongs to the upload/API layer, not long-term browser storage.

## VlmAnalyzeOutput Draft

```ts
type VlmAnalyzeStatus =
  | "OK"
  | "LOW_CONFIDENCE"
  | "RETRY_REQUIRED"
  | "REJECTED"
  | "PROVIDER_ERROR";

interface VlmAnalyzeOutput {
  request_id: string;
  provider: VlmProviderName;
  model?: string;
  status: VlmAnalyzeStatus;
  features?: PalmFeatureSet;
  quality: {
    palm_detected: boolean;
    single_hand: boolean;
    image_usable: boolean;
    confidence: number;
    reasons: string[];
  };
  refusal?: {
    refused: boolean;
    reason_code?: string;
  };
  performance?: {
    latency_ms?: number;
    estimated_cost_usd?: number;
  };
  error_codes: Stage5ErrorCode[];
  raw_response_ref?: string;
}
```

Notes:

- `raw_response_ref` is an internal pointer only. It must not be shown in frontend pages.
- `features` may be absent when status is `RETRY_REQUIRED`, `REJECTED`, or `PROVIDER_ERROR`.
- `confidence` uses `0` to `1`.

## PalmFeatureSet Draft

```ts
interface PalmFeatureSet {
  schema_version: "palm_features.v1";
  hand: {
    visible_side: "palm" | "back" | "unclear";
    handedness?: "left" | "right" | "unknown";
    orientation: "upright" | "rotated" | "unclear";
  };
  image_quality: {
    sharpness: "high" | "medium" | "low";
    lighting: "good" | "uneven" | "dark" | "overexposed";
    occlusion: "none" | "minor" | "major";
    confidence: number;
  };
  palm_shape: {
    palm_width_ratio?: number;
    finger_length_ratio?: number;
    shape_hint?: "square" | "rectangular" | "wide" | "long" | "unclear";
    confidence: number;
  };
  major_lines: {
    life_line: PalmLineFeature;
    head_line: PalmLineFeature;
    heart_line: PalmLineFeature;
    fate_line?: PalmLineFeature;
  };
  mounts?: {
    venus?: PalmRegionFeature;
    moon?: PalmRegionFeature;
    jupiter?: PalmRegionFeature;
    saturn?: PalmRegionFeature;
    apollo?: PalmRegionFeature;
    mercury?: PalmRegionFeature;
  };
  special_marks?: Array<{
    type: "branch" | "break" | "island" | "cross" | "star" | "chain" | "unclear";
    region: string;
    confidence: number;
  }>;
  provider_notes?: string[];
}

interface PalmLineFeature {
  visibility: "clear" | "faint" | "broken" | "unclear" | "not_visible";
  length: "short" | "medium" | "long" | "unclear";
  depth: "shallow" | "medium" | "deep" | "unclear";
  curvature: "straight" | "slight" | "curved" | "unclear";
  branches: "none" | "few" | "many" | "unclear";
  breaks: "none" | "minor" | "major" | "unclear";
  confidence: number;
}

interface PalmRegionFeature {
  prominence: "low" | "medium" | "high" | "unclear";
  texture: "smooth" | "lined" | "dense" | "unclear";
  confidence: number;
}
```

Notes:

- `PalmFeatureSet` contains observed palm features, not persona labels.
- Fields can be expanded only when deterministic mapping needs them.
- Unknown or low-confidence fields must remain explicit instead of guessed.

## RecognitionResult Draft

```ts
type RecognitionStatus =
  | "SUCCESS"
  | "LOW_CONFIDENCE"
  | "RETRY_REQUIRED"
  | "REJECTED"
  | "ERROR";

interface RecognitionResult {
  schema: {
    name: "palmmi.recognition_result";
    version: "stage5.v1";
  };
  status: RecognitionStatus;
  request_id: string;
  anonymous_device_id: string;
  primary_mother?: string;
  secondary_mother?: string;
  is_dual_mother: boolean;
  primary_persona?: string;
  top3: Array<{
    persona_id: string;
    rank: 1 | 2 | 3;
    score: number;
    reason_codes: string[];
  }>;
  quality_gate: {
    passed: boolean;
    confidence: number;
    reasons: string[];
  };
  recognition: {
    feature_schema_version: "palm_features.v1";
    explanation: string;
    feature_summary?: string[];
  };
  error_codes: Stage5ErrorCode[];
  cache: {
    hit: boolean;
    key?: string;
    expires_at?: string;
  };
  image_input: {
    upload_ref?: string;
    content_type?: string;
    size_bytes?: number;
    width?: number;
    height?: number;
    retained_until?: string;
  };
  provider_meta?: {
    provider: VlmProviderName;
    model?: string;
    latency_ms?: number;
  };
}
```

Rules:

- `SUCCESS` and `LOW_CONFIDENCE` may include persona fields and `top3`.
- `RETRY_REQUIRED`, `REJECTED`, and `ERROR` must not show persona, mother, or Top3 in UI.
- `top3` order is decided upstream and must not be re-sorted by result/poster pages.
- `score` is deterministic mapping score, not raw model confidence.

## Analyze API Request Draft

Preferred Stage 5 flow uses a temporary upload reference:

```text
POST /api/analyze
Content-Type: application/json
```

```json
{
  "request_id": "req_...",
  "anonymous_device_id": "anon_...",
  "upload_ref": "upl_...",
  "provider": "auto",
  "locale": "zh-CN"
}
```

Request rules:

- `request_id` is generated per analysis attempt.
- `anonymous_device_id` must match the local `palmmi:anonymousDeviceId`.
- `upload_ref` must refer to a non-expired temporary upload.
- `provider` defaults to `auto`; Stage 5B may force `mock`.
- Request must not include API keys.

Optional supporting upload boundary:

```text
POST /api/upload
Content-Type: multipart/form-data
```

Fields:

```text
image: File
anonymous_device_id: string
client_flow_id?: string
```

Upload response draft:

```json
{
  "upload_ref": "upl_...",
  "expires_at": "2026-05-18T12:00:00.000Z",
  "image_input": {
    "content_type": "image/jpeg",
    "size_bytes": 123456,
    "width": 1200,
    "height": 1600
  }
}
```

## Analyze API Response Draft

Success or usable low-confidence response:

```json
{
  "ok": true,
  "request_id": "req_...",
  "recognition_result": {
    "schema": {
      "name": "palmmi.recognition_result",
      "version": "stage5.v1"
    },
    "status": "SUCCESS",
    "request_id": "req_...",
    "anonymous_device_id": "anon_...",
    "is_dual_mother": false,
    "top3": [],
    "quality_gate": {
      "passed": true,
      "confidence": 0.86,
      "reasons": []
    },
    "recognition": {
      "feature_schema_version": "palm_features.v1",
      "explanation": ""
    },
    "error_codes": [],
    "cache": {
      "hit": false
    },
    "image_input": {}
  }
}
```

Recoverable error response:

```json
{
  "ok": false,
  "request_id": "req_...",
  "status": "RETRY_REQUIRED",
  "error": {
    "code": "IMAGE_LOW_QUALITY",
    "message_key": "retry_upload",
    "retryable": true
  }
}
```

Response rules:

- User-facing pages should use `recognition_result` when `ok` is true.
- User-facing pages should map `error.message_key` to existing Stage 4 recovery copy/states.
- Response must not include raw provider output, prompts, stack traces, or secrets.

## Error Code Draft

```ts
type Stage5ErrorCode =
  | "MISSING_IMAGE"
  | "INVALID_CONTENT_TYPE"
  | "IMAGE_TOO_LARGE"
  | "IMAGE_TOO_SMALL"
  | "IMAGE_UNREADABLE"
  | "UPLOAD_EXPIRED"
  | "MISSING_DEVICE_ID"
  | "RATE_LIMITED"
  | "PALM_NOT_DETECTED"
  | "MULTIPLE_HANDS_DETECTED"
  | "IMAGE_LOW_QUALITY"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_REFUSED"
  | "PROVIDER_SCHEMA_INVALID"
  | "FEATURE_NORMALIZATION_FAILED"
  | "PERSONA_MAPPING_FAILED"
  | "INTERNAL_ERROR";
```

Recommended UI state mapping:

| Error code | Stage 4-compatible state | Retryable |
| --- | --- | --- |
| `MISSING_IMAGE` | `missing-upload` | yes |
| `INVALID_CONTENT_TYPE` | `invalid-upload` | yes |
| `IMAGE_TOO_LARGE` | `invalid-upload` | yes |
| `IMAGE_TOO_SMALL` | `invalid-upload` | yes |
| `IMAGE_UNREADABLE` | `invalid-upload` | yes |
| `UPLOAD_EXPIRED` | `missing-upload` | yes |
| `MISSING_DEVICE_ID` | `error` | yes |
| `RATE_LIMITED` | `error` | later |
| `PALM_NOT_DETECTED` | `invalid-result` | yes |
| `MULTIPLE_HANDS_DETECTED` | `invalid-result` | yes |
| `IMAGE_LOW_QUALITY` | `partial-result` or `invalid-result` | yes |
| `PROVIDER_TIMEOUT` | `timeout` | yes |
| `PROVIDER_UNAVAILABLE` | `error` | yes |
| `PROVIDER_REFUSED` | `invalid-result` | yes |
| `PROVIDER_SCHEMA_INVALID` | `error` | yes |
| `FEATURE_NORMALIZATION_FAILED` | `error` | yes |
| `PERSONA_MAPPING_FAILED` | `error` | no |
| `INTERNAL_ERROR` | `error` | yes |

## Storage Key Draft

| Key | Storage | Stage | Purpose | Payload rule |
| --- | --- | --- | --- | --- |
| `palmmi:anonymousDeviceId` | `localStorage` | 5B+ | Anonymous anti-abuse and flow correlation id | Random id only; no PII |
| `palmmi:lastUpload` | `sessionStorage` | existing / 5B+ | Latest upload state for analyze page | Metadata and temporary `upload_ref`; no long-term base64 |
| `palmmi:lastAnalysisResult` | `sessionStorage` | existing / 5B+ | Result/poster page read boundary | Must contain normalized `RecognitionResult` only |
| `palmmi:lastAnalyzeError` | `sessionStorage` | 5B+ | Recoverable error state for analyze/result flow | Project error code and state only |
| `palmmi:clientFlowId` | `sessionStorage` | optional 5B+ | Correlate one upload/analyze flow | Random per flow; no PII |

Storage rules:

- Do not store raw VLM responses in browser storage.
- Do not store API keys in browser storage.
- Do not store permanent raw images in browser storage.
- `sessionStorage` can be cleared without breaking identity assumptions.
- `localStorage` id is anonymous and user-clearable.

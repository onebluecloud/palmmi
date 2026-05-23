# Frontend Pages Map

## Pages

| Page | Path | Role |
|---|---|---|
| Home | `/` / `index.html` | Brand, product positioning, upload entry. |
| Upload | `/upload/` / `upload/index.html` | File selection, local preview, basic checks, inline analyze call. |
| Analyze | `/analyze/` / `analyze/index.html` | Legacy/loading flow; current upload page can analyze inline and jump directly to result after save. |
| Result | `/result/` / `result/index.html` | Reads safe analysis result and renders personality result or retry state. |
| Poster | `/poster/` / `poster/index.html` | Reads the same safe result and renders poster preview if contract is valid. |

## Upload Flow

`scripts/palmmi-upload.js` controls upload:

- accepts JPG, PNG, WebP;
- rejects files over 8MB;
- decodes dimensions and rejects too-small images;
- shows local preview through object URL;
- compresses before analysis using JPEG:
  - primary longest side: 1280px, quality 0.82;
  - fallback longest side: 1024px, quality 0.75;
  - target around 1.2MB.

The "check photo" button is only a local file/decode/dimension check. It does not promise the image is a usable palm.

## Analyze Call

Current main path:

```text
upload page
-> normalize/compress image
-> read compressed image as data URL
-> call /api/analyze through scripts/palmmi-analyze-api-client.js
-> require stable analysis_result contract
-> write palmmi:last-analysis
-> write legacy palmmi:lastAnalysisResult
-> verify readback
-> navigate to /result/
```

`scripts/palmmi-analyze.js` still supports the older analyze page and storage helpers. For successful current inline analysis, result navigation happens only after storage readback passes.

## Storage Keys

```text
palmmi:lastUpload
palmmi:last-analysis
palmmi:lastAnalysisResult
palmmi:lastAnalyzeError
```

`palmmi:last-analysis` is the stable key. `palmmi:lastAnalysisResult` is legacy fallback.

Stored analysis data removes forbidden fields such as base64/data URL, buffers, Authorization, raw provider response, and internal debug payloads.

## Result Page

`scripts/palmmi-result.js` reads via:

```text
src/stage5/page-analysis-reader.js
src/stage5/page-analysis-state-mapper.js
src/stage5/analysis-result-storage-reader.js
src/stage5/analysis-result-read-adapter.js
```

It blocks terminal/invalid states such as `NOT_PALM`, `IMAGE_NOT_CLEAR`, `ANALYSIS_UNRELIABLE`, `LOW_INFORMATION_FEATURE_SET`, `RETRY_REQUIRED`, `REJECTED`, and main-candidate mismatch.

## Poster Page

`scripts/palmmi-poster.js` reads the same stable result. It blocks:

- missing/invalid storage;
- terminal quality states;
- incomplete poster contract;
- `candidate_results[0]` mismatch with the main result.

## WeChat WebView Notes

WeChat-specific risks observed in Stage 6F:

- cross-page upload state can be fragile;
- large original photos can timeout;
- cache can require versioned URLs;
- real camera/gallery behavior must be validated on Android and iPhone devices.

Use cache-busted links such as:

```text
https://palmmi.pages.dev/upload/?v=stage6f-final-<commit>
```

# Palmmi Stage 4 Screenshot Log

## Purpose

Stage 4 requires screenshot-based acceptance for every visual and flow stage.

Stage 4B establishes the screenshot mechanism. It does not require generating all future page screenshots because Stage 4B does not implement formal pages.

## Screenshot Directory

All future Stage 4 acceptance screenshots must be saved under:

```text
docs/stage4/screenshots/
```

The directory should be created when the first real screenshot is captured.

## Required Viewports

Mobile screenshots are mandatory for every visual page stage.

Required mobile sizes:

- `390px` width
- `430px` width

Recommended desktop supplemental size:

- `1440px x 900px`

Optional desktop/narrow responsive check:

- `1024px x 768px`

Desktop screenshots are supplemental and cannot replace mobile acceptance.

## Naming Convention

Use this format:

```text
<stage>-<page-or-state>-<viewport>.png
```

Rules:

- Prefix with the Stage number, for example `4C`, `4D`, `4E`.
- Include the page or state name.
- Include viewport type: `mobile-390`, `mobile-430`, or `desktop-1440`.
- Use `.png` for acceptance screenshots unless a later stage documents otherwise.

Examples:

```text
4C-home-mobile-390.png
4C-home-mobile-430.png
4C-home-desktop-1440.png
4C-upload-mobile-390.png
4C-upload-mobile-430.png
4D-analyzing-mobile-390.png
4E-upload-invalid-format-mobile-390.png
4F-result-mobile-390.png
4H-poster-mobile-390.png
```

## Required Pages By Stage

| Stage | Required screenshot pages/states | Mandatory viewports |
| --- | --- | --- |
| 4B | No formal page screenshots required | None |
| 4C | Home, upload, upload with local preview if implemented | 390px, 430px; desktop 1440 optional |
| 4D | Analyzing/loading, successful transition target | 390px, 430px |
| 4E | Upload invalid format, oversized image, blurry/too dark retry, rejected/non-palm, timeout/analysis failure, lost state | 390px, 430px |
| 4F | Result data rendering for `SUCCESS`, `LOW_CONFIDENCE`, at least one long-name persona | 390px, 430px |
| 4G | Polished result page, Top3/feature explanation, low-confidence hint | 390px, 430px; desktop 1440 optional |
| 4H | Base poster rendering for at least one persona | 390px, 430px |
| 4I | Polished poster rendering, long-name stress case, social-share crop check | 390px, 430px |
| 4J | Full flow: home -> upload -> analyzing -> result -> poster -> retest | 390px, 430px |
| 4K | Final Stage 4 handoff screenshots and any remaining regression states | 390px, 430px; desktop 1440 optional |

## Exception State Screenshot Requirements

Every error/empty state screenshot must show:

- Plain-language reason.
- One clear recovery action.
- No raw engineering code as the main message.
- No persona, mother type, or Top3 when status is `RETRY_REQUIRED` or `REJECTED`.
- No medical, fate, health, wealth, marriage, or lifespan claim.

Minimum Stage 4E exception screenshot set:

```text
4E-upload-no-file-mobile-390.png
4E-upload-invalid-format-mobile-390.png
4E-upload-too-large-mobile-390.png
4E-analyze-missing-upload-mobile-390.png
4E-analyze-invalid-upload-mobile-390.png
4E-analyze-timeout-mobile-390.png
4E-analyze-error-mobile-390.png
```

The 430px counterparts should also be captured unless Stage 4E explicitly records why a state is not reachable.

## Screenshot Log Table

| Screenshot file | Stage | Page/state | Viewport | Acceptance result | Rework needed | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `4C-home-mobile-390.png` | 4C | Home | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; first screen shows Palmmi title, positioning, primary upload CTA, privacy/free/share hints. |
| `4C-home-mobile-430.png` | 4C | Home | 430px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; mobile title and primary CTA remain visible without horizontal overflow. |
| `4C-home-desktop-1440.png` | 4C | Home | 1440px desktop | Pass | No | Captured under `docs/stage4/screenshots/`; desktop layout remains centered and follows Stage 2 dark topology visual style. |
| `4C-upload-mobile-390.png` | 4C | Upload | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; upload area, select button, guidance, status copy and check action are visible. |
| `4C-upload-mobile-430.png` | 4C | Upload | 430px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; upload page remains usable and text wraps within the viewport. |
| `4C-upload-desktop-1440.png` | 4C | Upload | 1440px desktop | Pass | No | Captured under `docs/stage4/screenshots/`; desktop two-column upload and photo tips layout is stable. |
| `4D-analyze-mobile-390.png` | 4D | Loading / analyzing | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; loading visual, progress copy, upload return action and lower upload thumbnail area render without horizontal overflow. |
| `4D-analyze-mobile-430.png` | 4D | Loading / analyzing | 430px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; mobile layout remains stable and text wraps within the viewport. |
| `4D-analyze-desktop-1440.png` | 4D | Loading / analyzing | 1440px desktop | Pass | No | Captured under `docs/stage4/screenshots/`; desktop two-column analysis and upload-state layout remains centered and readable. |
| `4D-analyze-done-mobile-390.png` | 4D | Done / result prepared | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; done state shows only minimal completion feedback and does not render a full result page. |
| `4D-analyze-missing-upload-mobile-390.png` | 4D | Missing upload | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; missing-upload state is not blank and provides a clear return-to-upload action. |
| `4E-upload-no-file-mobile-390.png` | 4E | Upload / no file selected | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; start action shows a short no-file prompt and keeps the user on upload. |
| `4E-upload-invalid-format-mobile-390.png` | 4E | Upload / invalid format | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; unsupported file type shows clear JPG / PNG / WebP guidance. |
| `4E-upload-too-large-mobile-390.png` | 4E | Upload / too large | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; oversized image shows the 10MB recovery guidance. |
| `4E-upload-no-file-mobile-430.png` | 4E | Upload / no file selected | 430px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; 430px layout remains stable. |
| `4E-upload-invalid-format-mobile-430.png` | 4E | Upload / invalid format | 430px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; 430px layout remains stable. |
| `4E-upload-too-large-mobile-430.png` | 4E | Upload / too large | 430px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; 430px layout remains stable. |
| `4E-analyze-missing-upload-mobile-390.png` | 4E | Analyze / missing upload | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; lost upload state is not blank and provides re-upload / home recovery actions. |
| `4E-analyze-invalid-upload-mobile-390.png` | 4E | Analyze / invalid upload state | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; damaged upload state uses plain-language recovery copy. |
| `4E-analyze-timeout-mobile-390.png` | 4E | Analyze / timeout | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; timeout state shows re-upload recovery without technical error codes. |
| `4E-analyze-error-mobile-390.png` | 4E | Analyze / analysis error | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; generic analysis failure shows re-upload recovery without debug details. |
| `4E-analyze-missing-upload-mobile-430.png` | 4E | Analyze / missing upload | 430px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; 430px layout remains stable. |
| `4E-analyze-invalid-upload-mobile-430.png` | 4E | Analyze / invalid upload state | 430px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; 430px layout remains stable. |
| `4E-analyze-timeout-mobile-430.png` | 4E | Analyze / timeout | 430px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; 430px layout remains stable. |
| `4E-analyze-error-mobile-430.png` | 4E | Analyze / analysis error | 430px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; 430px layout remains stable. |
| `4E-analyze-error-desktop-1440.png` | 4E | Analyze / analysis error | 1440px desktop | Pass | No | Captured under `docs/stage4/screenshots/`; desktop error layout remains centered and readable. |
| `4F-result-mobile-390.png` | 4F | Result / ready | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; result page reads `palmmi:lastAnalysisResult`, renders persona name, code, tags, evidence, retest action and poster placeholder without horizontal overflow. |
| `4F-result-mobile-430.png` | 4F | Result / ready | 430px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; 430px layout remains stable and readable. |
| `4F-result-desktop-1440.png` | 4F | Result / ready | 1440px desktop | Pass | No | Captured under `docs/stage4/screenshots/`; desktop two-column result layout remains centered and does not collapse. |
| `4F-result-missing-mobile-390.png` | 4F | Result / missing-result | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; missing result state is not blank and provides retest / home recovery actions. |
| `4F-result-invalid-mobile-390.png` | 4F | Result / invalid-result | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; damaged result JSON uses plain-language retry copy and does not expose raw error details. |
| `4F-result-partial-mobile-390.png` | 4F | Result / partial-result | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; partial fields render safe fallbacks without inventing a concrete persona. |
| `4G-result-mobile-390.png` | 4G | Result / polished ready | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; first screen shows Palmmi, persona name/code, hook, result summary, tags, retest action and disabled poster placeholder. |
| `4G-result-mobile-430.png` | 4G | Result / polished ready | 430px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; 430px layout remains stable and preserves clear hierarchy. |
| `4G-result-desktop-1440.png` | 4G | Result / polished ready | 1440px desktop | Pass | No | Captured under `docs/stage4/screenshots/`; desktop two-column layout remains centered and readable. |
| `4G-result-long-name-mobile-390.png` | 4G | Result / long-name stress | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; long persona name, long code, long hook, many tags/features, and Top3 candidates do not overflow horizontally. |
| `4G-result-low-quality-mobile-390.png` | 4G | Result / low quality hint | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; `LOW_CONFIDENCE` and `quality_gate.status = WARN` show a light entertainment-reference hint without diagnostic claims. |
| `4G-result-partial-mobile-390.png` | 4G | Result / partial-result | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; incomplete fields use safe fallbacks and recovery actions while keeping the result-page visual system. |
| `4G-result-error-mobile-390.png` | 4G | Result / error | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; error state is not blank, hides technical details, and shows retest / home recovery actions. |
| `4H-poster-mobile-390.png` | 4H | Poster / ready base | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; base poster reads `palmmi:lastAnalysisResult`, renders persona name/code/hook/tags and placeholder save/share controls without horizontal overflow. |
| `4H-poster-mobile-430.png` | 4H | Poster / ready base | 430px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; 430px layout remains stable and keeps poster preview first. |
| `4H-poster-desktop-1440.png` | 4H | Poster / ready base | 1440px desktop | Pass | No | Captured under `docs/stage4/screenshots/`; desktop two-column poster preview and data panel remain stable. |
| `4H-poster-long-name-mobile-390.png` | 4H | Poster / long-name stress | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; long persona name, long code, long hook and wrapped tags stay inside the poster preview. |
| `4H-poster-missing-mobile-390.png` | 4H | Poster / missing-result | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; missing result key is not blank and provides result/retest/upload/home recovery actions. |
| `4H-poster-invalid-mobile-390.png` | 4H | Poster / invalid-result | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; damaged JSON uses plain-language recovery copy and exposes no raw error details. |
| `4H-poster-partial-mobile-390.png` | 4H | Poster / partial-result | 390px mobile | Pass | No | Captured under `docs/stage4/screenshots/`; incomplete fields use safe fallbacks without inventing a concrete persona. |
| `4I-poster-mobile-390.png` | 4I | Poster / polished ready | 390px mobile | Pass | No | Polished personality identity card; persona name, quote band, social tags and palm-line texture remain readable without horizontal overflow. |
| `4I-poster-mobile-430.png` | 4I | Poster / polished ready | 430px mobile | Pass | No | 430px ready poster keeps the primary persona name, quote and `#` tags stable. |
| `4I-poster-desktop-1440.png` | 4I | Poster / polished ready | 1440px desktop | Pass | No | Desktop two-column layout remains stable at 1440 x 900; desktop is supplemental only. |
| `4I-poster-long-name-mobile-390.png` | 4I | Poster / long-name stress | 390px mobile | Pass | No | Long persona name, long code, long quote and long social tags wrap inside the poster card without clipping. |
| `4I-poster-missing-mobile-390.png` | 4I | Poster / missing-result | 390px mobile | Pass | No | Missing result state is not blank and keeps result/retest/upload/home recovery actions. |
| `4I-poster-invalid-mobile-390.png` | 4I | Poster / invalid-result | 390px mobile | Pass | No | Damaged result state uses plain recovery copy and no raw error details. |
| `4I-poster-partial-mobile-390.png` | 4I | Poster / partial-result | 390px mobile | Pass | No | Incomplete fields keep a complete poster card with safe fallbacks and no invented concrete persona. |
| `4J-home-mobile-390.png` | 4J | Home / full flow | 390px mobile | Pass | No | Full-page mobile capture; primary upload CTA is visible and no horizontal overflow was found. |
| `4J-upload-mobile-390.png` | 4J | Upload / full flow | 390px mobile | Pass | No | Full-page mobile capture; file selection, check photo and start analysis controls remain visible and stable. |
| `4J-analyze-mobile-390.png` | 4J | Analyze / full flow | 390px mobile | Pass | No | Full-page mobile capture from real upload handoff; loading state, recovery actions and upload preview area render without horizontal overflow. |
| `4J-result-mobile-390.png` | 4J | Result / full flow | 390px mobile | Pass | No | Full-page mobile capture from Stage 4D static mock result; partial-result fallback remains readable and recoverable. |
| `4J-poster-mobile-390.png` | 4J | Poster / full flow | 390px mobile | Pass | No | Full-page mobile capture from result-to-poster handoff; partial poster remains complete and keeps retest controls. |
| `4J-retest-mobile-390.png` | 4J | Retest / full flow | 390px mobile | Pass | No | Full-page mobile capture after poster retest action returns to upload. |
| `4J-home-mobile-430.png` | 4J | Home / full flow | 430px mobile | Pass | No | Full-page mobile capture; 430px layout is stable. |
| `4J-upload-mobile-430.png` | 4J | Upload / full flow | 430px mobile | Pass | No | Full-page mobile capture; upload controls remain stable. |
| `4J-analyze-mobile-430.png` | 4J | Analyze / full flow | 430px mobile | Pass | No | Full-page mobile capture; analysis view remains stable. |
| `4J-result-mobile-430.png` | 4J | Result / full flow | 430px mobile | Pass | No | Full-page mobile capture; result fallback remains readable. |
| `4J-poster-mobile-430.png` | 4J | Poster / full flow | 430px mobile | Pass | No | Full-page mobile capture; poster fallback remains stable. |
| `4J-home-desktop-1440.png` | 4J | Home / desktop compatibility | 1440px desktop | Pass | No | Viewport capture at `1440 x 900`; desktop layout remains centered and stable. |
| `4J-upload-desktop-1440.png` | 4J | Upload / desktop compatibility | 1440px desktop | Pass | No | Viewport capture at `1440 x 900`; upload two-column layout remains stable. |
| `4J-analyze-desktop-1440.png` | 4J | Analyze / desktop compatibility | 1440px desktop | Pass | No | Viewport capture at `1440 x 900`; analyze two-column layout remains stable. |
| `4J-result-desktop-1440.png` | 4J | Result / desktop compatibility | 1440px desktop | Pass | No | Viewport capture at `1440 x 900`; result layout remains stable. |
| `4J-poster-desktop-1440.png` | 4J | Poster / desktop compatibility | 1440px desktop | Pass | No | Viewport capture at `1440 x 900`; poster layout remains stable. |
| `4J-error-missing-result-mobile-390.png` | 4J | Result / missing-result | 390px mobile | Pass | No | Missing result state is not blank and provides retest / home recovery actions. |
| `4J-error-invalid-result-mobile-390.png` | 4J | Result / invalid-result | 390px mobile | Pass | No | Invalid result state avoids raw technical details and provides recovery actions. |
| `4J-error-partial-result-mobile-390.png` | 4J | Result / partial-result | 390px mobile | Pass | No | Partial result state renders safe fallbacks without inventing a concrete persona. |
| `4J-error-analyze-failed-mobile-390.png` | 4J | Analyze / error | 390px mobile | Pass | No | Analyze failure state is not blank and provides re-upload / home recovery actions. |

## Stage 4C Capture Notes

Stage 4C screenshots were generated with installed Chrome headless because Playwright browser installation timed out in the current environment.

Generated files:

- `docs/stage4/screenshots/4C-home-mobile-390.png` (`390 x 900`)
- `docs/stage4/screenshots/4C-home-mobile-430.png` (`430 x 932`)
- `docs/stage4/screenshots/4C-home-desktop-1440.png` (`1440 x 900`)
- `docs/stage4/screenshots/4C-upload-mobile-390.png` (`390 x 900`)
- `docs/stage4/screenshots/4C-upload-mobile-430.png` (`430 x 932`)
- `docs/stage4/screenshots/4C-upload-desktop-1440.png` (`1440 x 900`)

Upload local-preview interaction was verified by browser flow test. A dedicated preview-state screenshot was not part of the Stage 4C required minimum set.

## Stage 4D Capture Notes

Stage 4D screenshots were generated with local Chrome through Playwright CLI against a temporary local static server at `http://127.0.0.1:8123/`.

Generated files:

- `docs/stage4/screenshots/4D-analyze-mobile-390.png` (`390 x 900`)
- `docs/stage4/screenshots/4D-analyze-mobile-430.png` (`430 x 932`)
- `docs/stage4/screenshots/4D-analyze-desktop-1440.png` (`1440 x 900`)
- `docs/stage4/screenshots/4D-analyze-done-mobile-390.png` (`390 x 900`)
- `docs/stage4/screenshots/4D-analyze-missing-upload-mobile-390.png` (`390 x 900`)

The analyzing and done screenshots used browser `sessionStorage` seeded with `palmmi:lastUpload` to match the real upload-to-analysis handoff. The missing-upload screenshot used empty `sessionStorage`.

## Stage 4E Capture Notes

Stage 4E screenshots were generated with local Chrome through Playwright CLI against the local static server at `http://127.0.0.1:8123/`.

Generated files:

- `docs/stage4/screenshots/4E-upload-no-file-mobile-390.png` (`390 x 900`)
- `docs/stage4/screenshots/4E-upload-invalid-format-mobile-390.png` (`390 x 900`)
- `docs/stage4/screenshots/4E-upload-too-large-mobile-390.png` (`390 x 900`)
- `docs/stage4/screenshots/4E-upload-no-file-mobile-430.png` (`430 x 932`)
- `docs/stage4/screenshots/4E-upload-invalid-format-mobile-430.png` (`430 x 932`)
- `docs/stage4/screenshots/4E-upload-too-large-mobile-430.png` (`430 x 932`)
- `docs/stage4/screenshots/4E-analyze-missing-upload-mobile-390.png` (`390 x 900`)
- `docs/stage4/screenshots/4E-analyze-invalid-upload-mobile-390.png` (`390 x 900`)
- `docs/stage4/screenshots/4E-analyze-timeout-mobile-390.png` (`390 x 900`)
- `docs/stage4/screenshots/4E-analyze-error-mobile-390.png` (`390 x 900`)
- `docs/stage4/screenshots/4E-analyze-missing-upload-mobile-430.png` (`430 x 932`)
- `docs/stage4/screenshots/4E-analyze-invalid-upload-mobile-430.png` (`430 x 932`)
- `docs/stage4/screenshots/4E-analyze-timeout-mobile-430.png` (`430 x 932`)
- `docs/stage4/screenshots/4E-analyze-error-mobile-430.png` (`430 x 932`)
- `docs/stage4/screenshots/4E-analyze-error-desktop-1440.png` (`1440 x 900`)

Upload exception screenshots were captured by triggering the real upload-page controls. Analyze exception screenshots used the Stage 4E local test query entries:

```text
analyze/index.html?state=missing-upload
analyze/index.html?state=invalid-upload
analyze/index.html?state=timeout
analyze/index.html?state=error
```

## Stage 4F Capture Notes

Stage 4F screenshots were generated with local Chrome through Playwright CLI against the local static server at `http://127.0.0.1:8123/`.

Generated files:

- `docs/stage4/screenshots/4F-result-mobile-390.png` (`390 x 1459`)
- `docs/stage4/screenshots/4F-result-mobile-430.png` (`430 x 1453`)
- `docs/stage4/screenshots/4F-result-desktop-1440.png` (`1440 x 947`, viewport `1440 x 900`, full-page capture)
- `docs/stage4/screenshots/4F-result-missing-mobile-390.png` (`390 x 900`)
- `docs/stage4/screenshots/4F-result-invalid-mobile-390.png` (`390 x 900`)
- `docs/stage4/screenshots/4F-result-partial-mobile-390.png` (`390 x 1182`)

Ready-state screenshots used browser `sessionStorage` seeded with `palmmi:lastAnalysisResult` to match the analysis-to-result handoff. Missing-result used empty `sessionStorage`; invalid-result used damaged JSON; partial-result used a valid but incomplete RecognitionResult-shaped object.

Stage 4F local test query entries are available only for local validation and screenshots:

```text
result/index.html?state=missing-result
result/index.html?state=invalid-result
result/index.html?state=partial-result
result/index.html?state=error
```

## Stage 4G Capture Notes

Stage 4G screenshots were generated with local Chrome through Playwright CLI against the local static server at `http://127.0.0.1:8123/`.

Generated files:

- `docs/stage4/screenshots/4G-result-mobile-390.png` (`390 x 1357`)
- `docs/stage4/screenshots/4G-result-mobile-430.png` (`430 x 1353`)
- `docs/stage4/screenshots/4G-result-desktop-1440.png` (`1440 x 900`)
- `docs/stage4/screenshots/4G-result-long-name-mobile-390.png` (`390 x 2013`)
- `docs/stage4/screenshots/4G-result-low-quality-mobile-390.png` (`390 x 1675`)
- `docs/stage4/screenshots/4G-result-partial-mobile-390.png` (`390 x 1311`)
- `docs/stage4/screenshots/4G-result-error-mobile-390.png` (`390 x 900`)

Ready, long-name, and low-quality screenshots used browser `sessionStorage` seeded with `palmmi:lastAnalysisResult`, matching the analysis-to-result handoff. Partial and error screenshots used existing Stage 4 local query entries:

```text
result/index.html?state=partial-result
result/index.html?state=error
```

Stage 4G screenshot status:

| Screenshot file path | Page | State | Viewport size | Screenshot status | Pass | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/stage4/screenshots/4G-result-mobile-390.png` | Result | ready | 390px mobile | Captured | Yes | Polished ready state; no horizontal overflow. |
| `docs/stage4/screenshots/4G-result-mobile-430.png` | Result | ready | 430px mobile | Captured | Yes | 430px hierarchy and actions remain clear. |
| `docs/stage4/screenshots/4G-result-desktop-1440.png` | Result | ready | 1440px desktop | Captured | Yes | Desktop two-column layout remains stable. |
| `docs/stage4/screenshots/4G-result-long-name-mobile-390.png` | Result | long-name stress | 390px mobile | Captured | Yes | Long name, long code, long hook, many tags/features and Top3 candidates stay inside containers. |
| `docs/stage4/screenshots/4G-result-low-quality-mobile-390.png` | Result | low quality / low confidence | 390px mobile | Captured | Yes | Hint is based on existing fields and uses entertainment-reference copy. |
| `docs/stage4/screenshots/4G-result-partial-mobile-390.png` | Result | partial-result | 390px mobile | Captured | Yes | Safe fallbacks render without exposing raw fields. |
| `docs/stage4/screenshots/4G-result-error-mobile-390.png` | Result | error | 390px mobile | Captured | Yes | Recovery actions are visible and no technical error is shown. |

## Stage 4H Capture Notes

Stage 4H screenshots were generated with local Chromium through Playwright against a temporary local static server.

Generated files:

- `docs/stage4/screenshots/4H-poster-mobile-390.png` (`390 x 1828`)
- `docs/stage4/screenshots/4H-poster-mobile-430.png` (`430 x 1856`)
- `docs/stage4/screenshots/4H-poster-desktop-1440.png` (`1440 x 900`)
- `docs/stage4/screenshots/4H-poster-long-name-mobile-390.png` (`390 x 1926`)
- `docs/stage4/screenshots/4H-poster-missing-mobile-390.png` (`390 x 900`)
- `docs/stage4/screenshots/4H-poster-invalid-mobile-390.png` (`390 x 900`)
- `docs/stage4/screenshots/4H-poster-partial-mobile-390.png` (`390 x 1613`)

Ready, long-name, and partial screenshots used browser `sessionStorage` seeded with `palmmi:lastAnalysisResult`, matching the result-to-poster handoff. Missing-result used empty `sessionStorage`; invalid-result used damaged JSON.

Stage 4H local test query entries are available only for local validation and screenshots:

```text
poster/index.html?state=missing-result
poster/index.html?state=invalid-result
poster/index.html?state=partial-result
poster/index.html?state=error
```

Stage 4H screenshot status:

| Screenshot file path | Page | State | Viewport size | Screenshot status | Pass | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/stage4/screenshots/4H-poster-mobile-390.png` | Poster | ready | 390px mobile | Captured | Yes | Base poster preview renders current RecognitionResult fields and placeholder controls; no horizontal overflow. |
| `docs/stage4/screenshots/4H-poster-mobile-430.png` | Poster | ready | 430px mobile | Captured | Yes | 430px layout remains stable and readable. |
| `docs/stage4/screenshots/4H-poster-desktop-1440.png` | Poster | ready | 1440px desktop | Captured | Yes | Desktop two-column layout remains stable. |
| `docs/stage4/screenshots/4H-poster-long-name-mobile-390.png` | Poster | long-name stress | 390px mobile | Captured | Yes | Long name, long code, long hook and wrapped tags stay inside the poster preview. |
| `docs/stage4/screenshots/4H-poster-missing-mobile-390.png` | Poster | missing-result | 390px mobile | Captured | Yes | Missing result key shows recovery actions and no blank page. |
| `docs/stage4/screenshots/4H-poster-invalid-mobile-390.png` | Poster | invalid-result | 390px mobile | Captured | Yes | Damaged JSON shows plain recovery copy without raw error output. |
| `docs/stage4/screenshots/4H-poster-partial-mobile-390.png` | Poster | partial-result | 390px mobile | Captured | Yes | Missing fields use safe fallbacks and no invented persona. |

## Stage 4I Capture Notes

Stage 4I screenshots were generated with local Chrome through Playwright CLI against the local static server at `http://127.0.0.1:8123/`.

Generated files:

- `docs/stage4/screenshots/4I-poster-mobile-390.png` (`390 x 1828`)
- `docs/stage4/screenshots/4I-poster-mobile-430.png` (`430 x 1856`)
- `docs/stage4/screenshots/4I-poster-desktop-1440.png` (`1440 x 900`)
- `docs/stage4/screenshots/4I-poster-long-name-mobile-390.png` (`390 x 1926`)
- `docs/stage4/screenshots/4I-poster-missing-mobile-390.png` (`390 x 900`)
- `docs/stage4/screenshots/4I-poster-invalid-mobile-390.png` (`390 x 900`)
- `docs/stage4/screenshots/4I-poster-partial-mobile-390.png` (`390 x 1613`)

Ready and long-name screenshots used Stage 4 local screenshot query entries:

```text
poster/index.html?state=ready
poster/index.html?state=long-name
```

Existing exception query entries were reused:

```text
poster/index.html?state=missing-result
poster/index.html?state=invalid-result
poster/index.html?state=partial-result
poster/index.html?state=error
```

These entries are only for local validation and screenshot capture. They do not call a real API, do not connect a real VLM, do not export images, do not copy text, and do not create QR codes.

Stage 4I screenshot status:

| Screenshot file path | Page | State | Viewport size | Screenshot status | Pass | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/stage4/screenshots/4I-poster-mobile-390.png` | Poster | polished ready | 390px mobile | Captured | Yes | Persona name, quote band, social tags and abstract palm-line texture form a stronger share-card first screen. |
| `docs/stage4/screenshots/4I-poster-mobile-430.png` | Poster | polished ready | 430px mobile | Captured | Yes | 430px layout keeps the core persona signal and tags readable. |
| `docs/stage4/screenshots/4I-poster-desktop-1440.png` | Poster | polished ready | 1440px desktop | Captured | Yes | Desktop supplemental layout remains stable at `1440 x 900`. |
| `docs/stage4/screenshots/4I-poster-long-name-mobile-390.png` | Poster | long-name stress | 390px mobile | Captured | Yes | Long name/code/quote/tags wrap inside the poster without horizontal overflow. |
| `docs/stage4/screenshots/4I-poster-missing-mobile-390.png` | Poster | missing-result | 390px mobile | Captured | Yes | Missing result state remains complete and recoverable. |
| `docs/stage4/screenshots/4I-poster-invalid-mobile-390.png` | Poster | invalid-result | 390px mobile | Captured | Yes | Invalid result state avoids raw technical errors and provides recovery actions. |
| `docs/stage4/screenshots/4I-poster-partial-mobile-390.png` | Poster | partial-result | 390px mobile | Captured | Yes | Partial result keeps a visually complete card with safe fallback copy. |

## Stage 4J Capture Notes

Stage 4J screenshots were generated with local Chrome through Chrome DevTools Protocol against the local static server at `http://127.0.0.1:8123/`.

Generated files:

- `docs/stage4/screenshots/4J-home-mobile-390.png` (`390 x 1694`)
- `docs/stage4/screenshots/4J-upload-mobile-390.png` (`390 x 1450`)
- `docs/stage4/screenshots/4J-analyze-mobile-390.png` (`390 x 1422`)
- `docs/stage4/screenshots/4J-result-mobile-390.png` (`390 x 1492`)
- `docs/stage4/screenshots/4J-poster-mobile-390.png` (`390 x 1648`)
- `docs/stage4/screenshots/4J-retest-mobile-390.png` (`390 x 1450`)
- `docs/stage4/screenshots/4J-home-mobile-430.png` (`430 x 1659`)
- `docs/stage4/screenshots/4J-upload-mobile-430.png` (`430 x 1450`)
- `docs/stage4/screenshots/4J-analyze-mobile-430.png` (`430 x 1422`)
- `docs/stage4/screenshots/4J-result-mobile-430.png` (`430 x 1418`)
- `docs/stage4/screenshots/4J-poster-mobile-430.png` (`430 x 1631`)
- `docs/stage4/screenshots/4J-home-desktop-1440.png` (`1440 x 900`)
- `docs/stage4/screenshots/4J-upload-desktop-1440.png` (`1440 x 900`)
- `docs/stage4/screenshots/4J-analyze-desktop-1440.png` (`1440 x 900`)
- `docs/stage4/screenshots/4J-result-desktop-1440.png` (`1440 x 900`)
- `docs/stage4/screenshots/4J-poster-desktop-1440.png` (`1440 x 900`)
- `docs/stage4/screenshots/4J-error-missing-result-mobile-390.png` (`390 x 900`)
- `docs/stage4/screenshots/4J-error-invalid-result-mobile-390.png` (`390 x 900`)
- `docs/stage4/screenshots/4J-error-partial-result-mobile-390.png` (`390 x 1311`)
- `docs/stage4/screenshots/4J-error-analyze-failed-mobile-390.png` (`390 x 1244`)

Main-flow screenshots used the real front-end handoff:

```text
index.html
upload/index.html
analyze/index.html
result/index.html
poster/index.html
upload/index.html
```

The current Stage 4D static browser adapter still emits a placeholder RecognitionResult, so full-flow result and poster screenshots show `partial-result` fallback content. Ready-state visual quality remains covered by Stage 4G and Stage 4I ready screenshots. Stage 4J did not change mock recognition logic or Stage 3 core logic.

Stage 4J browser validation additionally checked 390px, 430px and 1440px for:

- Complete route chain.
- Rendered and triggerable CTA elements.
- No blank page.
- No horizontal overflow.
- No obvious console error after the favicon 404 fix.

Stage 4J screenshot status:

| Screenshot file path | Page | State | Viewport size | Screenshot status | Pass | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/stage4/screenshots/4J-home-mobile-390.png` | Home | full flow | 390px mobile | Captured | Yes | Full-page mobile capture; primary CTA is visible. |
| `docs/stage4/screenshots/4J-upload-mobile-390.png` | Upload | full flow | 390px mobile | Captured | Yes | Upload controls and guidance remain stable. |
| `docs/stage4/screenshots/4J-analyze-mobile-390.png` | Analyze | full flow | 390px mobile | Captured | Yes | Loading view renders from the real upload handoff. |
| `docs/stage4/screenshots/4J-result-mobile-390.png` | Result | full flow | 390px mobile | Captured | Yes | Partial-result fallback is readable and recoverable. |
| `docs/stage4/screenshots/4J-poster-mobile-390.png` | Poster | full flow | 390px mobile | Captured | Yes | Poster fallback is complete and retest remains available. |
| `docs/stage4/screenshots/4J-retest-mobile-390.png` | Upload | retest | 390px mobile | Captured | Yes | Retest action returns to upload. |
| `docs/stage4/screenshots/4J-home-mobile-430.png` | Home | full flow | 430px mobile | Captured | Yes | 430px layout remains stable. |
| `docs/stage4/screenshots/4J-upload-mobile-430.png` | Upload | full flow | 430px mobile | Captured | Yes | 430px upload layout remains stable. |
| `docs/stage4/screenshots/4J-analyze-mobile-430.png` | Analyze | full flow | 430px mobile | Captured | Yes | 430px analyze layout remains stable. |
| `docs/stage4/screenshots/4J-result-mobile-430.png` | Result | full flow | 430px mobile | Captured | Yes | 430px result fallback remains readable. |
| `docs/stage4/screenshots/4J-poster-mobile-430.png` | Poster | full flow | 430px mobile | Captured | Yes | 430px poster fallback remains stable. |
| `docs/stage4/screenshots/4J-home-desktop-1440.png` | Home | desktop compatibility | 1440px desktop | Captured | Yes | Desktop viewport capture remains stable. |
| `docs/stage4/screenshots/4J-upload-desktop-1440.png` | Upload | desktop compatibility | 1440px desktop | Captured | Yes | Desktop upload layout remains stable. |
| `docs/stage4/screenshots/4J-analyze-desktop-1440.png` | Analyze | desktop compatibility | 1440px desktop | Captured | Yes | Desktop analyze layout remains stable. |
| `docs/stage4/screenshots/4J-result-desktop-1440.png` | Result | desktop compatibility | 1440px desktop | Captured | Yes | Desktop result layout remains stable. |
| `docs/stage4/screenshots/4J-poster-desktop-1440.png` | Poster | desktop compatibility | 1440px desktop | Captured | Yes | Desktop poster layout remains stable. |
| `docs/stage4/screenshots/4J-error-missing-result-mobile-390.png` | Result | missing-result | 390px mobile | Captured | Yes | Missing result recovery is visible. |
| `docs/stage4/screenshots/4J-error-invalid-result-mobile-390.png` | Result | invalid-result | 390px mobile | Captured | Yes | Invalid result recovery is visible. |
| `docs/stage4/screenshots/4J-error-partial-result-mobile-390.png` | Result | partial-result | 390px mobile | Captured | Yes | Partial result fallback remains complete. |
| `docs/stage4/screenshots/4J-error-analyze-failed-mobile-390.png` | Analyze | error | 390px mobile | Captured | Yes | Analyze error recovery is visible. |

## Stage 4K Final Screenshot Inventory

Stage 4K did not generate new screenshots. This stage verified the existing screenshot directory and froze the Stage 4 screenshot set.

Actual PNG files under `docs/stage4/screenshots/`:

- Total PNG files: 73.
- 390px screenshots: 41.
- 430px screenshots: 19.
- 1440px screenshots: 13.

Required coverage check:

| Required item | Status | Evidence |
| --- | --- | --- |
| 首页截图 | Present | `4C-home-*`, `4J-home-*` |
| 上传页截图 | Present | `4C-upload-*`, `4J-upload-*` |
| 分析页截图 | Present | `4D-analyze-*`, `4J-analyze-*` |
| 上传异常截图 | Present | `4E-upload-no-file-*`, `4E-upload-invalid-format-*`, `4E-upload-too-large-*` |
| 分析异常截图 | Present | `4E-analyze-*`, `4J-error-analyze-failed-mobile-390.png` |
| 结果页截图 | Present | `4F-result-*`, `4G-result-*`, `4J-result-*` |
| 结果页异常截图 | Present | `4F-result-missing-*`, `4F-result-invalid-*`, `4F-result-partial-*`, `4G-result-error-*`, `4J-error-*result*` |
| 结果页长名称截图 | Present | `4G-result-long-name-mobile-390.png` |
| 低质量提示截图 | Present | `4G-result-low-quality-mobile-390.png` |
| 海报页截图 | Present | `4H-poster-*`, `4I-poster-*`, `4J-poster-*` |
| 海报页异常截图 | Present | `4H-poster-missing-*`, `4H-poster-invalid-*`, `4H-poster-partial-*`, `4I-poster-missing-*`, `4I-poster-invalid-*`, `4I-poster-partial-*` |
| 全流程截图 | Present | `4J-home-*`, `4J-upload-*`, `4J-analyze-*`, `4J-result-*`, `4J-poster-*`, `4J-retest-mobile-390.png` |

No blocking screenshot gap was found during Stage 4K. The known Stage 4J note remains: the current full-flow result and poster screenshots can show `partial-result` fallback because the real flow still uses the Stage 4D static mock adapter. Ready-state result and poster visuals are covered by Stage 4G and Stage 4I screenshots.

## Acceptance Checklist For Future Screenshots

Each future screenshot entry must check:

- Mobile screenshot exists for each required viewport.
- No blank page.
- No overlapping text.
- No clipped primary action.
- No unreadable palm-line texture behind text.
- No debug/schema/VLM/rule-engine terms in user-facing UI.
- `Palmmi` is used instead of `PalmTag`.
- The page follows the current stage scope.
- The page does not imply medical diagnosis, fate prediction, or real VLM connection.
- Result pages do not recompute or reorder Stage 3 output.
- Error pages provide recovery paths.
- Buttons and long Chinese labels fit at 390px.
- Poster screenshot remains understandable as a standalone share card.

## How To Record Acceptance

When a screenshot is captured:

1. Save the image under `docs/stage4/screenshots/`.
2. Add or update one row in this file.
3. Set `Acceptance result` to `Pass`, `Fail`, or `Needs review`.
4. Set `Rework needed` to `Yes`, `No`, or `TBD`.
5. Add concise notes describing the visual issue or confirming the pass.

## Rework Rules

Mark `Rework needed` as `Yes` when:

- Mobile first screen fails at 390px or 430px.
- Primary action is unclear or clipped.
- Text overlaps, overflows, or becomes unreadable.
- Visual tone looks like fortune-telling, medical diagnosis, horror, or backend tooling.
- User-facing pages expose engineering fields.
- A page uses data not allowed by `RecognitionResult`.
- Result page changes Stage 3 output order or meaning.
- Error state shows persona/mother/Top3 when it should not.

Mark `Rework needed` as `No` only when the screenshot passes the stage-specific acceptance criteria.

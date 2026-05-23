# Open Questions

| Question | Current status | Notes |
|---|---|---|
| Switch to `qwen3.6-flash`? | OPEN | A/B was inconclusive; do not switch production by default. |
| Continue `qwen3-vl-flash`? | CURRENT_DEFAULT | Default remains `qwen3-vl-flash`. |
| Does classifier need Stage 7 optimization? | OPEN | If real samples still collapse or overblock, handle as a later calibrated stage, not blind Stage 6F edits. |
| Tips/donation in Stage 7? | OPEN | Current stage does not add tips. |
| Promotion in Stage 7? | OPEN | Current stage does not add promotion/growth loop. |
| iPhone WeChat test done? | MANUAL_REQUIRED | Not completed. |
| Need custom domain? | OPEN / NOT_NOW | Stage 6F can use `palmmi.pages.dev`. |
| Need ICP/filing? | OPEN / NOT_NOW | Depends on future domain/server/audience decisions. |
| Need rate limit/day budget? | OPEN | Required before broad public release; not currently implemented as a full feature. |
| Need more fixtures for dark/blurry/cropped palms? | OPEN | Docs record missing specialized fixtures. |
| Can Stage 6G start? | BLOCKED | Requires fresh smoke and real-device pass evidence. |

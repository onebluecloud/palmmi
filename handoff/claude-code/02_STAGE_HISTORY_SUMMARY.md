# Stage History Summary

## Stage 1

Stage 1 established the original PalmTag/Palmmi rule-engine prototype:

```text
manual 33 palm fields -> 8 mother types -> 36 personalities -> adjacent/cross-mother resolution -> display copy
```

It did not include image recognition, VLM, web UI, upload pages, result pages, or poster pages. Its main value is the early product direction, privacy direction, and rule-engine baseline.

## Stage 2

Stage 2 defined the mobile-first product flow and UI direction. The intended flow was home, upload, analyzing, result, poster, donation, and privacy. The final tone was premium, restrained, palm-line based, young, social, and entertainment-oriented. It explicitly rejected medical, old fortune-telling, cheap H5 lottery, and heavy mysticism styles.

## Stage 3

Stage 3 engineered the recognition system around frozen V4.2 rules:

- image input and quality-gate contracts;
- 33-field schema and degradation;
- cache/version strategy;
- 8 mother scoring;
- 36-persona matching;
- adjacent and cross-mother handling;
- mock end-to-end pipeline and regression tests.

Frozen items include V4.2 fields, scoring rules, weights, thresholds, mother/persona mapping, 36 persona names/copy, adjacent rules, and cross-mother rules. Do not casually modify them.

## Stage 4

Stage 4 productized the frontend pages:

```text
index.html
upload/index.html
analyze/index.html
result/index.html
poster/index.html
```

It froze the mobile-first UI, page states, result rendering, poster preview, screenshots, and tests. It did not connect real VLM, real payment, login, backend storage, or real sharing export. Do not redo the UI in Stage 6F.

## Stage 5

Stage 5 connected the Stage 4 flow to a controlled real VLM/API boundary:

- provider abstraction and Qwen provider;
- server-side `/api/analyze`;
- VLM output normalization into `PalmFeatureSet`;
- local recognition pipeline;
- `analysis-result.v1` contract;
- result/poster readers;
- real Qwen minimum-chain and page-flow tests.

Stage 5 froze with mock and real Qwen paths working locally. It deferred deployment, production secrets, WeChat validation, logs, rate limits, monitoring, and large-sample validation to Stage 6.

## Stage 6

Stage 6 moved Palmmi to Cloudflare Pages and real online validation:

- Stage 6A/B: deployment plan, env/secrets plan.
- Stage 6C/D: Cloudflare build/runtime and upload/cache strategy.
- Stage 6E: public real Qwen endpoint and Cloudflare fetch fix.
- Stage 6F: mobile/WeChat validation, not-palm gate, result/poster contract, anti-collapse work, real smoke scripts.

Current state: Stage 6F is not complete. Stage 6G is blocked until fresh real smoke and real device validation pass.

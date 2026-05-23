# Changelog Snapshot

Source command:

```bash
git log --oneline -30
```

## Last 30 Commits

```text
0034715 fix: repair low-information classifier overblocking
66f8345 fix: support multi-palm collapse smoke selection
eda6277 fix: harden classifier against P31 collapse
f3d2afd fix: calibrate local personality classifier diversity
c71f032 fix: stabilize personality classification and poster contract
d7bd1d2 fix: stabilize model comparison and poster generation
b2dce6f docs: record real qwen stage 6f smoke pass
68e6220 fix: complete valid palm personality analysis pipeline
f280a69 test: add real qwen stage 6f smoke validation
51a7fec fix: stabilize not palm validation gate
aa51bf5 fix: reject invalid images and stabilize poster contract
f3de3c6 fix: stabilize stage 6f wechat analyze flow
540bd7a fix: repair stage 6f wechat result flow
9c1c88f test: complete stage 6f mobile e2e validation
ece8cba fix: repair stage 6e qwen production request
7a85e34 fix: include stage5 page modules in pages build
efed786 fix: bind qwen fetch for cloudflare runtime
2771e47 fix: add stage 6e qwen diagnostics
f30134e test: complete stage 6e real qwen verification
8f338bd docs: clarify stage 6e runtime deployment
d344aa2 docs: record stage 6e deployment blocker
e4f46a2 test: verify stage 6e real qwen flow
6a915ae docs: record stage 6d online verification
6d7286f docs: complete stage 6d upload cache strategy
f388629 fix: repair stage 6c cloudflare entry
9df34a0 docs: record cloudflare pages git integration blocker
e3a4d46 chore: ignore local preview tooling state
e29d748 fix: make stage 6c pages function mock-only
ae25885 docs: note cloudflare manual authorization step
7dcde13 docs: record stage 6c prep push result
```

## Summary

Stage 6E Qwen request fix:

- repaired Cloudflare runtime fetch binding;
- copied Stage 5 browser reader modules into Pages build;
- confirmed public Qwen path after fix.

Stage 6F mobile / WeChat validation:

- added mobile E2E coverage;
- tracked Android/iPhone WeChat manual gates;
- fixed upload/analyze/result storage flow.

NOT_PALM fixes:

- added strict validity precheck;
- non-palm should not enter full personality analysis;
- not-palm must not write a personality result.

P25 / P31 collapse fixes:

- stopped trusting Qwen final personality;
- moved final personality to local classifier;
- added candidate consistency checks;
- added P31 collapse diagnostics and hard-fail logic.

LOW_INFORMATION fixes:

- added `LOW_INFORMATION_FEATURE_SET`;
- blocked all-unknown/low-information feature sets from producing personality;
- latest commit repaired overblocking by normalizing Chinese/alias features and allowing enough high-signal features to classify.

Smoke script enhancements:

- added real Qwen dry-run safety;
- added multi-model A/B;
- added collapse check;
- added numbered `palm-1` to `palm-5` selection;
- added debug classifier output and hard-fail diagnostics.

Poster contract fixes:

- added stable `palmmi:last-analysis`;
- blocked invalid images and main-candidate mismatch;
- allowed valid LOW_CONFIDENCE results to generate basic poster.

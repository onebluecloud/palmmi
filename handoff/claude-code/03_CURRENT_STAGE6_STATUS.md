# Current Stage 6 Status

## True Current State

```text
Stage 6F: not fully PASS
Stage 6G: not started
Current status: BLOCKED / awaiting final validation
Latest commit: 0034715cdd7722f408cef81ba8f279651edad272
Latest subject: fix: repair low-information classifier overblocking
```

The latest Stage 6 state file says Stage 6F code-level hard-fix work is complete, but real collapse smoke, Android WeChat retest, and iOS WeChat validation are still required.

## Required Recent Commits

```text
0034715cdd7722f408cef81ba8f279651edad272 fix: repair low-information classifier overblocking
66f83452894b6ea0db785ebefe2cb08c10b33ba1 fix: support multi-palm collapse smoke selection
eda627703a3ce3c49680a7faf1b983d0f5b264dd fix: harden classifier against P31 collapse
f3d2afdc93aa87b58b54436616e13562d18434a7 fix: calibrate local personality classifier diversity
```

## Latest Recorded Real Smoke

Latest recorded true 5-palm smoke was against commit `66f83452894b6ea0db785ebefe2cb08c10b33ba1`, not the latest commit:

```text
not-palm: PASS
palm-1..palm-5: all LOW_INFORMATION_FEATURE_SET
api_calls_made: 11
```

After that failure, commit `0034715cdd7722f408cef81ba8f279651edad272` repaired Chinese/alias `palm_features` normalization, relaxed the feature information gate, added LOW_INFORMATION debug output, and added `ALL_PALM_LOW_INFORMATION` hard-fail diagnostics. This new commit still needs real collapse smoke.

## Validation Matrix

| Item | Current status | Evidence / note |
|---|---|---|
| Non-palm rejection | PASS / RETEST_RECOMMENDED | Real and mock history show `NOT_PALM` path restored; should be checked again after latest deployment. |
| Real 5-palm smoke on latest commit | NOT_RUN | Latest recorded 5-palm run failed on `66f8345`; latest `0034715` needs rerun. |
| Personality collapse | BLOCKED | P31 collapse was confirmed at `f3d2afd`; hard-fix exists but real validation is pending. |
| LOW_INFORMATION overblocking | BLOCKED | Latest fix targets this, but real 5-palm validation is pending. |
| Poster generation | CODE_PASS / RETEST_RECOMMENDED | LOW_CONFIDENCE valid results are allowed by code; Android WeChat should confirm no regression. |
| Android WeChat | MANUAL_RETEST_REQUIRED | Must retest after latest deployment. |
| iPhone WeChat | MANUAL_REQUIRED | Not completed. |
| Can enter Stage 6G | BLOCKED | Do not enter Stage 6G before fresh real smoke and real-device validation. |

## Do Not Falsify

Do not write Stage 6F as final PASS. Do not write Stage 6G as opened. Do not convert mock/code-pass evidence into real-device pass evidence.

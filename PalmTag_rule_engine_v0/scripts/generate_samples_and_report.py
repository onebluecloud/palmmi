from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.loader import load_field_schema
from src.result_builder import build_result


def baseline_features() -> dict[str, Any]:
    fields = {item["field_key"]: 0 for item in load_field_schema()}
    fields["OVERALL_PROPORTION_FLAG"] = 1
    return fields


SAMPLES: list[dict[str, Any]] = [
    {
        "file": "sample_01_p01.json",
        "title": "P01 人生排位赛选手",
        "coverage": "P01, M1 钢线型",
        "expected_persona": "P01",
        "updates": {
            "HEAD_LINE_LENGTH": 3,
            "HEAD_LINE_DEPTH": 3,
            "OVERALL_CLARITY": 2,
            "LINE_COMPLEXITY": 0,
            "HEART_LINE_DEPTH": 1,
            "FATE_LINE_CLARITY": 2,
            "MOUNT_JUPITER": 1,
        },
    },
    {
        "file": "sample_02_p06.json",
        "title": "P06 混乱过敏体",
        "coverage": "P06, M1 高清晰低复杂",
        "expected_persona": "P06",
        "updates": {
            "HEAD_LINE_DEPTH": 3,
            "HEAD_LINE_LENGTH": 1,
            "OVERALL_CLARITY": 3,
            "LINE_COMPLEXITY": 0,
            "FINGERTIP_SHAPE": 1,
            "MOUNT_SATURN": 1,
        },
    },
    {
        "file": "sample_03_p14.json",
        "title": "P14 恒温热源",
        "coverage": "P14, M2 暖纹型",
        "expected_persona": "P14",
        "updates": {
            "HEART_LINE_LENGTH": 3,
            "HEART_LINE_CURVE": 3,
            "HEART_LINE_DEPTH": 2,
            "LIFE_LINE_CURVE": 2,
            "LIFE_LINE_DEPTH": 2,
            "MOUNT_VENUS": 1,
            "OVERALL_CLARITY": 2,
        },
    },
    {
        "file": "sample_04_p24_m8.json",
        "title": "P24 节奏掌控者",
        "coverage": "P24, M8 复纹型",
        "expected_persona": "P24",
        "updates": {
            "HEAD_LINE_LENGTH": 3,
            "HEAD_LINE_DEPTH": 1,
            "HEAD_LINE_END_FORK": 1,
            "HEART_LINE_DEPTH": 2,
            "HEART_LINE_LENGTH": 3,
            "THUMB_LENGTH_RATIO": 2,
            "FATE_LINE_CLARITY": 2,
            "SUN_LINE_PRESENCE": 1,
            "SIMIAN_LINE": 1,
            "CHUAN_PALM": 1,
            "FINGER_SPREAD": 0,
            "LINE_COMPLEXITY": 0,
            "OVERALL_CLARITY": 2,
        },
    },
    {
        "file": "sample_05_p33_chuan.json",
        "title": "P33 自我闭环怪",
        "coverage": "P33, 川字掌场景",
        "expected_persona": "P33",
        "updates": {
            "CHUAN_PALM": 1,
            "FINGER_SPREAD": 0,
            "HEAD_LIFE_GAP": 0,
            "LINE_COMPLEXITY": 0,
            "OVERALL_CLARITY": 3,
            "HEART_LINE_DEPTH": 1,
        },
    },
    {
        "file": "sample_06_m6_track.json",
        "title": "M6 轨道型场景",
        "coverage": "M6 轨道型, P13",
        "expected_persona": "P13",
        "updates": {
            "FATE_LINE_CLARITY": 3,
            "SUN_LINE_PRESENCE": 1,
            "OVERALL_CLARITY": 3,
            "THUMB_LENGTH_RATIO": 3,
            "HEAD_LINE_DEPTH": 0,
            "HEAD_LINE_LENGTH": 0,
        },
    },
    {
        "file": "sample_07_simian_pressure.json",
        "title": "P07 压力通电体",
        "coverage": "P07, 断掌场景, P05/P07 易混分流",
        "expected_persona": "P07",
        "updates": {
            "SIMIAN_LINE": 1,
            "THUMB_LENGTH_RATIO": 3,
            "FATE_LINE_CLARITY": 3,
            "LIFE_LINE_DEPTH": 3,
            "OVERALL_CLARITY": 1,
        },
    },
    {
        "file": "sample_08_m7_moon.json",
        "title": "M7 月相型场景",
        "coverage": "M7 月相型, P10",
        "expected_persona": "P10",
        "updates": {
            "MOUNT_LUNA": 2,
            "HEAD_LINE_SLOPE": 3,
            "FINGERTIP_SHAPE": 2,
            "HEART_LINE_DEPTH": 1,
        },
    },
    {
        "file": "sample_09_p35_adjacent.json",
        "title": "P35 情感满仓者",
        "coverage": "P35, P14/P35 易混分流",
        "expected_persona": "P35",
        "updates": {
            "HEART_LINE_DEPTH": 3,
            "HEART_LINE_LENGTH": 3,
            "HEART_LINE_CURVE": 2,
            "LIFE_LINE_CURVE": 2,
            "LIFE_LINE_DEPTH": 2,
            "MOUNT_VENUS": 1,
            "INDEX_LENGTH_RATIO": 2,
            "OVERALL_CLARITY": 2,
        },
    },
    {
        "file": "sample_10_low_confidence_noise.json",
        "title": "低置信字段干扰场景",
        "coverage": "M7 低置信字段高值，但主母型仍需 2 个核心支持",
        "expected_persona": "P01",
        "updates": {
            "MOUNT_LUNA": 3,
            "FINGERTIP_SHAPE": 3,
            "HEAD_LINE_SLOPE": 0,
            "HEART_LINE_DEPTH": 1,
            "HEAD_LINE_LENGTH": 3,
            "HEAD_LINE_DEPTH": 3,
            "OVERALL_CLARITY": 2,
            "LINE_COMPLEXITY": 0,
            "FATE_LINE_CLARITY": 2,
            "MOUNT_JUPITER": 1,
        },
    },
]


def sample_features(sample: dict[str, Any]) -> dict[str, Any]:
    features = baseline_features()
    features.update(sample["updates"])
    return features


def summarize_input(features: dict[str, Any]) -> str:
    non_zero = {key: value for key, value in features.items() if value not in (0, None, "")}
    return ", ".join(f"{key}={value}" for key, value in sorted(non_zero.items())[:12])


def main() -> int:
    sample_dir = PROJECT_ROOT / "tests" / "sample_inputs"
    output_dir = PROJECT_ROOT / "outputs"
    sample_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    report_lines = [
        "# Rule Engine Test Report",
        "",
        "This report was generated by running the V0.1 rule engine against the sample inputs.",
        "",
    ]
    issues: list[str] = []

    for index, sample in enumerate(SAMPLES, start=1):
        features = sample_features(sample)
        sample_path = sample_dir / sample["file"]
        sample_path.write_text(json.dumps(features, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        result = build_result(features)
        output_path = output_dir / f"result_{index:02d}.json"
        output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        expected = sample["expected_persona"]
        if result["persona_id"] != expected:
            issues.append(
                f"{sample['file']} expected {expected}, got {result['persona_id']}."
            )

        core_trace = result["score_trace"]["core_support_trace"].get(result["primary_mother"], {})
        display_ok = bool(result["display_content"].get("hook"))
        report_lines.extend(
            [
                f"## {index:02d}. {sample['title']}",
                "",
                f"- Coverage: {sample['coverage']}",
                f"- Input summary: {summarize_input(features)}",
                f"- Mother scores: `{result['score_trace']['mother_scores']}`",
                (
                    f"- Primary mother reason: `{result['primary_mother']}` with "
                    f"{core_trace.get('count', 0)} core support hits "
                    f"({', '.join(core_trace.get('fields', [])) or 'none'})"
                ),
                f"- Persona candidate scores: `{result['score_trace']['persona_scores']}`",
                f"- Adjacent resolver triggered: {result['score_trace']['resolver_used']}",
                f"- Final persona_id: `{result['persona_id']}`",
                f"- Final persona name: {result['persona_name']}",
                f"- Display content loaded: {'Yes' if display_ok else 'No'}",
                "",
            ]
        )

    report_lines.extend(
        [
            "## Issues Found",
            "",
            *(f"- {issue}" for issue in issues),
        ]
    )
    if not issues:
        report_lines.append("- No sample execution mismatches found.")

    report_lines.extend(
        [
            "",
            "## Next Steps",
            "",
            "- Keep this V0.1 as a rules-only baseline before adding image recognition.",
            "- Review blank Excel conditions that were normalized to `>= 1` if stricter thresholds are needed.",
            "- Add real manually labeled palm samples before tuning weights.",
            "",
        ]
    )
    (output_dir / "rule_engine_test_report.md").write_text(
        "\n".join(report_lines), encoding="utf-8"
    )
    print(f"Wrote {len(SAMPLES)} sample inputs, result JSON files, and rule_engine_test_report.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

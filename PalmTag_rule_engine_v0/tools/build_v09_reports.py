from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.vision_vote import low_confidence_fields
from tools.build_human_review_pack import KEY_FIELDS, build_review_item


COMPARE_FIELDS = [
    "HEAD_LIFE_GAP",
    "HEAD_LINE_DEPTH",
    "LIFE_LINE_DEPTH",
    "FATE_LINE_CLARITY",
    "OVERALL_CLARITY",
    "LINE_COMPLEXITY",
]

DIAGNOSIS_FIELDS = [
    "HEAD_LIFE_GAP",
    "HEAD_LINE_DEPTH",
    "HEAD_LINE_LENGTH",
    "LIFE_LINE_DEPTH",
    "LIFE_LINE_LENGTH",
    "FATE_LINE_CLARITY",
    "OVERALL_CLARITY",
    "LINE_COMPLEXITY",
    "THUMB_LENGTH_RATIO",
    "CHUAN_PALM",
    "SIMIAN_LINE",
]

FOCUS_P31 = ["dayi-left", "hua-left", "kai-left", "qing-left"]
FOCUS_P32 = ["qing-right", "zheng-left"]
FOCUS_COMPARE = ["kai-left", "qing-left", "qing-right", "zheng-left", "zheng-right"]


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_results(result_dir: Path) -> list[dict[str, Any]]:
    return [_load_json(path) for path in sorted(result_dir.glob("*_result.json"))]


def image_stem(result: dict[str, Any]) -> str:
    return Path(result.get("image_file", "")).stem


def by_stem(results: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {image_stem(result): result for result in results}


def final_features(result: dict[str, Any]) -> dict[str, Any]:
    return result.get("vision_vote", {}).get("final_features", {})


def engine_result(result: dict[str, Any]) -> dict[str, Any]:
    return result.get("engine_result", {})


def feature_average(results: list[dict[str, Any]], field_key: str) -> float | None:
    values = [
        final_features(result).get(field_key)
        for result in results
        if final_features(result).get(field_key) is not None
    ]
    if not values:
        return None
    return round(sum(float(value) for value in values) / len(values), 2)


def feature_distribution(results: list[dict[str, Any]], field_key: str) -> dict[Any, int]:
    return dict(Counter(final_features(result).get(field_key) for result in results))


def persona_change_rows(v08_results: list[dict[str, Any]], v09_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    old_by_stem = by_stem(v08_results)
    new_by_stem = by_stem(v09_results)
    rows: list[dict[str, Any]] = []
    for stem in sorted(set(old_by_stem) | set(new_by_stem)):
        old_persona = engine_result(old_by_stem.get(stem, {})).get("persona_id")
        new_persona = engine_result(new_by_stem.get(stem, {})).get("persona_id")
        changed = old_persona != new_persona
        if old_persona == "P31" and new_persona != "P31":
            judgement = "P31 default-outlet risk reduced."
        elif old_persona == "P29" and new_persona == "P29":
            judgement = "P29 preserved."
        elif new_persona == "P32":
            judgement = "P32 retained; check strong-action support."
        elif changed:
            judgement = "Changed; needs manual review."
        else:
            judgement = "No change."
        rows.append(
            {
                "image_file": f"{stem}.jpg",
                "v08_persona": old_persona,
                "v09_persona": new_persona,
                "changed": changed,
                "judgement": judgement,
            }
        )
    return rows


def review_change_reason(v08_result: dict[str, Any] | None, v09_result: dict[str, Any]) -> str:
    if not v08_result:
        return "No V0.8 result found for comparison."
    old_engine = engine_result(v08_result)
    new_engine = engine_result(v09_result)
    old_features = final_features(v08_result)
    new_features = final_features(v09_result)
    reasons = []
    if old_engine.get("persona_id") != new_engine.get("persona_id"):
        reasons.append(f"{old_engine.get('persona_id')} -> {new_engine.get('persona_id')}")
    if old_engine.get("primary_mother") != new_engine.get("primary_mother"):
        reasons.append(f"mother {old_engine.get('primary_mother')} -> {new_engine.get('primary_mother')}")
    for field_key in COMPARE_FIELDS:
        if old_features.get(field_key) != new_features.get(field_key):
            reasons.append(f"{field_key} {old_features.get(field_key)} -> {new_features.get(field_key)}")
    return "; ".join(reasons) if reasons else "No major persona or key-field change."


def _score_table(result: dict[str, Any]) -> str:
    engine = engine_result(result)
    scores = engine.get("score_trace", {}).get("persona_scores", {})
    return ", ".join(f"{key}={value}" for key, value in sorted(scores.items())) or "None"


def _mother_scores(result: dict[str, Any]) -> str:
    scores = engine_result(result).get("score_trace", {}).get("mother_scores", {})
    return ", ".join(f"{key}={value}" for key, value in sorted(scores.items())) or "None"


def _matched_rules(result: dict[str, Any], persona_id: str) -> list[str]:
    trace = engine_result(result).get("score_trace", {}).get("persona_match_trace", {}).get(persona_id, {})
    matched = []
    for rule in trace.get("rules", []):
        if rule.get("matched"):
            matched.append(
                f"{rule['field_key']} {rule['operator']} {rule['threshold']} "
                f"(value={rule['value']}, weight={rule['weight']})"
            )
    return matched


def write_diagnosis_report(v08_results: list[dict[str, Any]], output_path: Path) -> None:
    p31_count = sum(1 for result in v08_results if engine_result(result).get("persona_id") == "P31")
    p32_count = sum(1 for result in v08_results if engine_result(result).get("persona_id") == "P32")
    head_gap_dist = feature_distribution(v08_results, "HEAD_LIFE_GAP")
    lines = [
        "# PalmTag V0.9 Diagnosis Report",
        "",
        "## 1. P31 是否过宽",
        "",
        f"- V0.8 中 P31 命中 {p31_count}/{len(v08_results)}。",
        "- P31 主要依赖 HEAD_LINE_LENGTH>=2、HEAD_LINE_DEPTH>=2、FATE_LINE_CLARITY<=1；当 HEAD_LIFE_GAP 全部为 0 时，P12 失去入口，P31 容易成为 M1 默认出口。",
        "",
        "| sample | persona | mother | key features | P31 matched rules | M1 candidates |",
        "|---|---|---|---|---|---|",
    ]
    results_by_stem = by_stem(v08_results)
    for stem in FOCUS_P31:
        result = results_by_stem.get(stem)
        if not result:
            continue
        features = final_features(result)
        key_features = ", ".join(f"{key}={features.get(key)}" for key in DIAGNOSIS_FIELDS)
        lines.append(
            f"| {stem} | {engine_result(result).get('persona_id')} | {engine_result(result).get('primary_mother')} | "
            f"{key_features} | {'; '.join(_matched_rules(result, 'P31')) or 'None'} | {_score_table(result)} |"
        )
    lines.extend(
        [
            "",
            "结论：P31 在 V0.8 中不是随机集中，而是由 M1 候选内 P25/P12 经常因 LINE_COMPLEXITY 或 HEAD_LIFE_GAP 未过 required 条件被清零后胜出。kai-left、qing-left 属于需要 V0.9 重点复查的 P31 风险样本。",
            "",
            "## 2. P32 / M8 是否过宽",
            "",
            f"- V0.8 中 P32 命中 {p32_count}/{len(v08_results)}。",
            "- qing-right 与 zheng-left 都是 M8 主母型；M8 主要来自多个母型分数同时超过 60，而不是单个 HEAD_LINE_END_FORK。",
            "",
            "| sample | persona | mother scores | key features | P32 matched rules | M8 candidates |",
            "|---|---|---|---|---|---|",
        ]
    )
    for stem in FOCUS_P32:
        result = results_by_stem.get(stem)
        if not result:
            continue
        features = final_features(result)
        key_features = ", ".join(f"{key}={features.get(key)}" for key in DIAGNOSIS_FIELDS)
        lines.append(
            f"| {stem} | {engine_result(result).get('persona_id')} | {_mother_scores(result)} | "
            f"{key_features} | {'; '.join(_matched_rules(result, 'P32')) or 'None'} | {_score_table(result)} |"
        )
    lines.extend(
        [
            "",
            "结论：P32 的风险点是 M8 入口较宽，且旧规则中 P32 即使 THUMB_LENGTH_RATIO 未满足，也可能因为 M8 候选整体弱而被 raw score 兜底选中。V0.9 需要给 P32 增加强行动字段组合支撑。",
            "",
            "## 3. HEAD_LIFE_GAP 是否长期偏低",
            "",
            f"- HEAD_LIFE_GAP 分布：{head_gap_dist}",
            "- V0.8 的 27 次 pass 和 9 个 final_features 均显示 HEAD_LIFE_GAP 长期为 0，说明 Prompt 对智慧线/生命线起点分离过度保守。",
            "",
            "## 4. 强线条是否被压成中档",
            "",
            "| field | average | distribution | diagnosis |",
            "|---|---:|---|---|",
        ]
    )
    for field_key in ["HEAD_LINE_DEPTH", "LIFE_LINE_DEPTH", "FATE_LINE_CLARITY", "OVERALL_CLARITY"]:
        dist = feature_distribution(v08_results, field_key)
        avg = feature_average(v08_results, field_key)
        diagnosis = "存在中档集中" if dist.get(2, 0) >= len(v08_results) // 2 and dist.get(3, 0) == 0 else "未见明显 2 档锁死"
        lines.append(f"| {field_key} | {avg} | {dist} | {diagnosis} |")
    lines.extend(
        [
            "",
            "## 5. V0.9 修正方向",
            "",
            "- Prompt：明确 HEAD_LIFE_GAP 只要可见空隙至少给 1；强主线允许给 3；FATE_LINE_CLARITY 不把浅但可见的纵向线压成 0；OVERALL_CLARITY 区分照片清晰与主线系统清晰。",
            "- 规则：P31 增加 CHUAN_PALM=0、SIMIAN_LINE=0、LINE_COMPLEXITY<=2 边界，并降低泛化加分；P25 增加稳定低噪声出口；P32 增加强行动组合支撑；M8 入口从 3 个强母型收紧到 4 个强母型。",
            "",
        ]
    )
    _write_text(output_path, "\n".join(lines))


def write_compare_report(v08_results: list[dict[str, Any]], v09_results: list[dict[str, Any]], output_path: Path) -> None:
    rows = persona_change_rows(v08_results, v09_results)
    old_by_stem = by_stem(v08_results)
    new_by_stem = by_stem(v09_results)
    lines = [
        "# PalmTag V0.8 vs V0.9 Compare Report",
        "",
        "## 1. 字段变化",
        "",
        "| field | V0.8 avg | V0.9 avg | change |",
        "|---|---:|---:|---:|",
    ]
    for field_key in COMPARE_FIELDS:
        old_avg = feature_average(v08_results, field_key)
        new_avg = feature_average(v09_results, field_key)
        change = None if old_avg is None or new_avg is None else round(new_avg - old_avg, 2)
        lines.append(f"| {field_key} | {old_avg} | {new_avg} | {change} |")

    lines.extend(
        [
            "",
            "## 2. 人格变化",
            "",
            "| image_file | V0.8 persona | V0.9 persona | 是否变化 | 判断 |",
            "|---|---|---|---|---|",
        ]
    )
    for row in rows:
        lines.append(
            f"| {row['image_file']} | {row['v08_persona']} | {row['v09_persona']} | "
            f"{'是' if row['changed'] else '否'} | {row['judgement']} |"
        )

    lines.extend(["", "## 3. 重点样本检查", ""])
    for stem in FOCUS_COMPARE:
        old = old_by_stem.get(stem)
        new = new_by_stem.get(stem)
        if not new:
            continue
        lines.extend(
            [
                f"### {stem}",
                "",
                f"- V0.8: {engine_result(old or {}).get('primary_mother')} / {engine_result(old or {}).get('persona_id')} {engine_result(old or {}).get('persona_name')}",
                f"- V0.9: {engine_result(new).get('primary_mother')} / {engine_result(new).get('persona_id')} {engine_result(new).get('persona_name')}",
                f"- 变化原因: {review_change_reason(old, new)}",
                f"- V0.9 key fields: {', '.join(f'{key}={final_features(new).get(key)}' for key in COMPARE_FIELDS)}",
                f"- V0.9 persona scores: {_score_table(new)}",
                "",
            ]
        )
    _write_text(output_path, "\n".join(lines))


def _review_json_item(v09_result: dict[str, Any], v08_result: dict[str, Any] | None) -> dict[str, Any]:
    item = build_review_item(v09_result)
    item["v08_result"] = {
        "primary_mother": engine_result(v08_result or {}).get("primary_mother"),
        "persona_id": engine_result(v08_result or {}).get("persona_id"),
        "persona_name": engine_result(v08_result or {}).get("persona_name"),
    }
    item["v09_result"] = {
        "primary_mother": engine_result(v09_result).get("primary_mother"),
        "persona_id": engine_result(v09_result).get("persona_id"),
        "persona_name": engine_result(v09_result).get("persona_name"),
    }
    item["change_reason"] = review_change_reason(v08_result, v09_result)
    item["is_more_reasonable"] = "手填"
    return item


def write_v09_review_pack(
    v08_results: list[dict[str, Any]],
    v09_results: list[dict[str, Any]],
    markdown_path: Path,
    json_path: Path,
) -> None:
    old_by_stem = by_stem(v08_results)
    items = [_review_json_item(result, old_by_stem.get(image_stem(result))) for result in v09_results]
    lines = [
        "# PalmTag qwen3.6-plus V0.9 Human Re-review Pack",
        "",
        f"- Total images: {len(items)}",
        "- Model: qwen3.6-plus",
        "- Purpose: 人工复评 V0.9 是否比 V0.8 更合理。",
        "",
    ]
    for index, item in enumerate(items, start=1):
        display = item.get("display_content", {})
        lines.extend(
            [
                f"## {index}. {Path(item['image_file']).name}",
                "",
                "### 1. 图片信息",
                "",
                f"- image_file: `{item['image_file']}`",
                f"- person_id: `{item['person_id']}`",
                f"- hand_side: `{item['hand_side']}`",
                "",
                "### 2. 视觉字段摘要",
                "",
                "| 字段 | 值 |",
                "|---|---:|",
            ]
        )
        for field_key in KEY_FIELDS:
            lines.append(f"| {field_key} | {item['key_features'].get(field_key)} |")
        lines.extend(
            [
                "",
                "### 3. 低置信字段",
                "",
                ", ".join(item.get("low_confidence_fields") or []) or "None",
                "",
                "### 4. 规则结果",
                "",
                f"- V0.8结果: `{item['v08_result']['primary_mother']}` / `{item['v08_result']['persona_id']}` {item['v08_result']['persona_name']}",
                f"- V0.9结果: `{item['v09_result']['primary_mother']}` / `{item['v09_result']['persona_id']}` {item['v09_result']['persona_name']}",
                f"- 变化原因: {item['change_reason']}",
                "- 是否更合理: 手填",
                f"- secondary_mother: `{item['secondary_mother']}`",
                f"- 是否触发易混人格分流: {'是' if item['resolver_used'] else '否'}",
                f"- 分流前人格: `{item['resolver_before']}`",
                f"- 分流后人格: `{item['resolver_after']}`",
                "",
                "### 5. 展示文案",
                "",
                f"- 人格名称: {item['persona_name']}",
                f"- 钩子: {display.get('hook', '')}",
                f"- 金句: {display.get('quote', '')}",
                f"- 最终判断: {display.get('final_judgement', '')}",
                "",
                "### 6. 人工评审表格",
                "",
                "| 评审项 | 分数/判断 |",
                "|---|---|",
                "| 字段识别是否明显离谱 | 是/否 |",
                "| 人格是否像这个人 | 1-5分 |",
                "| 文案是否有命中感 | 1-5分 |",
                "| 是否愿意分享 | 是/否 |",
                "| V0.9是否比V0.8更合理 | 是/否/不确定 |",
                "| 最大问题 | 手填 |",
                "| 建议修正 | 手填 |",
                "",
            ]
        )
    _write_text(markdown_path, "\n".join(lines))
    _write_json(json_path, items)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build V0.9 diagnosis, compare, and review reports.")
    parser.add_argument("--v08-result-dir", type=Path, default=PROJECT_ROOT / "outputs" / "qwen_real_image_batch_qwen3_6_plus")
    parser.add_argument("--v09-result-dir", type=Path, default=PROJECT_ROOT / "outputs" / "qwen_real_image_batch_v09")
    parser.add_argument("--outputs-dir", type=Path, default=PROJECT_ROOT / "outputs")
    args = parser.parse_args()

    v08_results = load_results(args.v08_result_dir)
    write_diagnosis_report(v08_results, args.outputs_dir / "v09_diagnosis_report.md")
    if args.v09_result_dir.exists():
        v09_results = load_results(args.v09_result_dir)
        write_compare_report(v08_results, v09_results, args.outputs_dir / "v08_v09_compare_report.md")
        write_v09_review_pack(
            v08_results,
            v09_results,
            args.outputs_dir / "human_review" / "qwen36plus_review_pack_v09.md",
            args.outputs_dir / "human_review" / "qwen36plus_review_pack_v09.json",
        )
    print("Wrote outputs/v09_diagnosis_report.md")
    if args.v09_result_dir.exists():
        print("Wrote outputs/v08_v09_compare_report.md")
        print("Wrote outputs/human_review/qwen36plus_review_pack_v09.md")
        print("Wrote outputs/human_review/qwen36plus_review_pack_v09.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

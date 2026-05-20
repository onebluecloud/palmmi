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

from tools.build_human_review_pack import KEY_FIELDS, build_review_item


TARGET_PERSONAS = {
    "dayi-left": "P31",
    "grand-right": "P20",
    "hua-left": "P31",
    "kai-left": "P25",
    "lan-right": "P29",
    "qing-left": "P25",
    "qing-right": "P25",
    "zheng-left": "P32",
    "zheng-right": "P29",
}


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


def stem(result: dict[str, Any]) -> str:
    return Path(result.get("image_file", "")).stem


def by_stem(results: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {stem(result): result for result in results}


def engine(result: dict[str, Any]) -> dict[str, Any]:
    return result.get("engine_result", {})


def features(result: dict[str, Any]) -> dict[str, Any]:
    return result.get("vision_vote", {}).get("final_features", {})


def persona_trace(result: dict[str, Any], persona_id: str) -> dict[str, Any]:
    return engine(result).get("score_trace", {}).get("persona_match_trace", {}).get(persona_id, {})


def matched_rules(result: dict[str, Any], persona_id: str) -> list[str]:
    trace = persona_trace(result, persona_id)
    rows = []
    for rule in trace.get("rules", []):
        if rule.get("matched"):
            rows.append(
                f"{rule['field_key']} {rule['operator']} {rule['threshold']} "
                f"(value={rule['value']}, weight={rule['weight']})"
            )
    return rows


def persona_score(result: dict[str, Any], persona_id: str) -> tuple[Any, Any, list[str]]:
    trace = persona_trace(result, persona_id)
    return trace.get("final_score"), trace.get("raw_score"), trace.get("required_failed", [])


def write_boundary_diagnosis(v09_results: list[dict[str, Any]], output_path: Path) -> None:
    rows = by_stem(v09_results)
    dayi = rows["dayi-left"]
    grand = rows["grand-right"]
    dayi_p25 = persona_score(dayi, "P25")
    dayi_p31 = persona_score(dayi, "P31")
    grand_p31 = persona_score(grand, "P31")
    grand_p20 = persona_score(grand, "P20")
    grand_scores = engine(grand).get("score_trace", {}).get("mother_scores", {})
    grand_features = features(grand)
    lines = [
        "# PalmTag V0.10 Boundary Diagnosis",
        "",
        "## 1. dayi-left 为什么被 P25 吃掉",
        "",
        f"- V0.9 输出：{engine(dayi).get('persona_id')} {engine(dayi).get('persona_name')}",
        f"- P25 final/raw/failed：{dayi_p25[0]} / {dayi_p25[1]} / {dayi_p25[2]}",
        f"- P31 final/raw/failed：{dayi_p31[0]} / {dayi_p31[1]} / {dayi_p31[2]}",
        f"- raw 差距：{(dayi_p25[1] or 0) - (dayi_p31[1] or 0)}",
        f"- P25 命中字段：{'; '.join(matched_rules(dayi, 'P25'))}",
        f"- P31 命中字段：{'; '.join(matched_rules(dayi, 'P31'))}",
        "",
        "判断：dayi-left 的 P25 并不是完整过线，P25 因 LINE_COMPLEXITY=2 required 失败；P31 因 FATE_LINE_CLARITY=2 required 失败。所有 M1 候选失败后，旧兜底按 raw score 选择 P25。V0.10 需要让 HEAD_LIFE_GAP>=1 成为 P31 的“留后手/观察”支撑，避免被 P25 raw score 误吞。",
        "",
        "## 2. grand-right 为什么从 P20 掉到 P31",
        "",
        f"- V0.9 输出：{engine(grand).get('persona_id')} {engine(grand).get('persona_name')}",
        f"- M1 分数：{grand_scores.get('M1')}",
        f"- M3 分数：{grand_scores.get('M3')}",
        f"- P31 final/raw/failed：{grand_p31[0]} / {grand_p31[1]} / {grand_p31[2]}",
        f"- P20 final/raw/failed：{grand_p20[0]} / {grand_p20[1]} / {grand_p20[2]}",
        f"- LINE_COMPLEXITY：{grand_features.get('LINE_COMPLEXITY')}",
        f"- HEART_LINE_DEPTH：{grand_features.get('HEART_LINE_DEPTH')}",
        f"- HEAD_LINE_DEPTH：{grand_features.get('HEAD_LINE_DEPTH')}",
        f"- OVERALL_CLARITY：{grand_features.get('OVERALL_CLARITY')}",
        "",
        "判断：grand-right 的核心字段是 HEAD_LINE_DEPTH>=2、HEAD_LINE_LENGTH=3、HEART_LINE_DEPTH>=2、HEART_LINE_LENGTH=3、LINE_COMPLEXITY>=2。V0.9 中 primary_mother 为 M1，P20 只在 M3 下，导致 P20 没进入候选。V0.10 需要给 P20 一个极窄的 M1 高复盘入口，并增加 P20/P31 分流规则。",
        "",
    ]
    _write_text(output_path, "\n".join(lines))


def change_reason(v09: dict[str, Any] | None, v10: dict[str, Any]) -> str:
    if not v09:
        return "No V0.9 comparison result."
    parts = []
    if engine(v09).get("persona_id") != engine(v10).get("persona_id"):
        parts.append(f"{engine(v09).get('persona_id')} -> {engine(v10).get('persona_id')}")
    if engine(v09).get("primary_mother") != engine(v10).get("primary_mother"):
        parts.append(f"mother {engine(v09).get('primary_mother')} -> {engine(v10).get('primary_mother')}")
    return "; ".join(parts) if parts else "No persona change."


def write_compare_report(v09_results: list[dict[str, Any]], v10_results: list[dict[str, Any]], output_path: Path) -> None:
    v09_by_stem = by_stem(v09_results)
    v10_by_stem = by_stem(v10_results)
    lines = [
        "# PalmTag V0.9 vs V0.10 Compare Report",
        "",
        "| image_file | V0.9 | V0.10 | 人工目标 | 是否达标 |",
        "|---|---|---|---|---|",
    ]
    for sample_id, target in TARGET_PERSONAS.items():
        old = engine(v09_by_stem[sample_id]).get("persona_id")
        new = engine(v10_by_stem[sample_id]).get("persona_id")
        lines.append(
            f"| {sample_id}.jpg | {old} | {new} | {target} | {'是' if new == target else '否'} |"
        )

    old_counts = Counter(engine(result).get("persona_id") for result in v09_results)
    new_counts = Counter(engine(result).get("persona_id") for result in v10_results)
    lines.extend(
        [
            "",
            "## 汇总",
            "",
            f"- P31 数量变化：{old_counts.get('P31', 0)} -> {new_counts.get('P31', 0)}",
            f"- P25 数量变化：{old_counts.get('P25', 0)} -> {new_counts.get('P25', 0)}",
            f"- P20 是否恢复：{'是' if engine(v10_by_stem['grand-right']).get('persona_id') == 'P20' else '否'}",
            f"- P29 是否保持：{'是' if engine(v10_by_stem['lan-right']).get('persona_id') == 'P29' and engine(v10_by_stem['zheng-right']).get('persona_id') == 'P29' else '否'}",
            f"- P32 是否保持：{'是' if engine(v10_by_stem['zheng-left']).get('persona_id') == 'P32' else '否'}",
            "",
        ]
    )
    _write_text(output_path, "\n".join(lines))


def write_review_pack(
    v09_results: list[dict[str, Any]],
    v10_results: list[dict[str, Any]],
    markdown_path: Path,
    json_path: Path,
) -> None:
    v09_by_stem = by_stem(v09_results)
    items = []
    for result in v10_results:
        sample_id = stem(result)
        old = v09_by_stem.get(sample_id)
        item = build_review_item(result)
        item["v09_result"] = {
            "primary_mother": engine(old or {}).get("primary_mother"),
            "persona_id": engine(old or {}).get("persona_id"),
            "persona_name": engine(old or {}).get("persona_name"),
        }
        item["v10_result"] = {
            "primary_mother": engine(result).get("primary_mother"),
            "persona_id": engine(result).get("persona_id"),
            "persona_name": engine(result).get("persona_name"),
        }
        item["human_target"] = TARGET_PERSONAS.get(sample_id)
        item["target_met"] = engine(result).get("persona_id") == item["human_target"]
        item["change_reason"] = change_reason(old, result)
        items.append(item)

    lines = [
        "# PalmTag qwen3.6-plus V0.10 Human Re-review Pack",
        "",
        f"- Total images: {len(items)}",
        "- Model: qwen3.6-plus",
        "- Prompt: palm_feature_extraction_prompt_v09.md",
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
                f"- V0.9 结果: `{item['v09_result']['primary_mother']}` / `{item['v09_result']['persona_id']}` {item['v09_result']['persona_name']}",
                f"- V0.10 结果: `{item['v10_result']['primary_mother']}` / `{item['v10_result']['persona_id']}` {item['v10_result']['persona_name']}",
                f"- 人工目标: `{item['human_target']}`",
                f"- 是否达标: {'是' if item['target_met'] else '否'}",
                f"- 变化原因: {item['change_reason']}",
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
                "| V0.10是否比V0.9更合理 | 是/否/不确定 |",
                "| 最大问题 | 手填 |",
                "| 建议修正 | 手填 |",
                "",
            ]
        )
    _write_text(markdown_path, "\n".join(lines))
    _write_json(json_path, items)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build V0.10 boundary diagnosis, compare report, and review pack.")
    parser.add_argument("--v09-result-dir", type=Path, default=PROJECT_ROOT / "outputs" / "qwen_real_image_batch_v09")
    parser.add_argument("--v10-result-dir", type=Path, default=PROJECT_ROOT / "outputs" / "qwen_real_image_batch_v10")
    parser.add_argument("--outputs-dir", type=Path, default=PROJECT_ROOT / "outputs")
    args = parser.parse_args()

    v09_results = load_results(args.v09_result_dir)
    v10_results = load_results(args.v10_result_dir)
    write_boundary_diagnosis(v09_results, args.outputs_dir / "v10_boundary_diagnosis.md")
    write_compare_report(v09_results, v10_results, args.outputs_dir / "v09_v10_compare_report.md")
    write_review_pack(
        v09_results,
        v10_results,
        args.outputs_dir / "human_review" / "qwen36plus_review_pack_v10.md",
        args.outputs_dir / "human_review" / "qwen36plus_review_pack_v10.json",
    )
    print("Wrote outputs/v10_boundary_diagnosis.md")
    print("Wrote outputs/v09_v10_compare_report.md")
    print("Wrote outputs/human_review/qwen36plus_review_pack_v10.md")
    print("Wrote outputs/human_review/qwen36plus_review_pack_v10.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

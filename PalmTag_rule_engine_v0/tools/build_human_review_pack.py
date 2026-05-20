from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.vision_vote import low_confidence_fields as vote_low_confidence_fields


KEY_FIELDS = [
    "HEAD_LINE_DEPTH",
    "HEAD_LINE_LENGTH",
    "HEART_LINE_DEPTH",
    "HEART_LINE_LENGTH",
    "LIFE_LINE_DEPTH",
    "LIFE_LINE_LENGTH",
    "LINE_COMPLEXITY",
    "OVERALL_CLARITY",
    "FATE_LINE_CLARITY",
    "SIMIAN_LINE",
    "CHUAN_PALM",
    "HEAD_LIFE_GAP",
]


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def unstable_fields(passes: list[dict[str, Any]]) -> list[str]:
    if not passes:
        return []
    field_keys = sorted({field_key for one_pass in passes for field_key in one_pass})
    unstable: list[str] = []
    for field_key in field_keys:
        values = [one_pass.get(field_key) for one_pass in passes]
        non_null = [value for value in values if value is not None]
        if len(set(non_null)) > 1:
            unstable.append(field_key)
    return unstable


def canonical_image_file(image_file: str) -> str:
    if not image_file:
        return ""

    original = Path(image_file)
    sample_candidate = PROJECT_ROOT / "samples" / "palms" / original.name
    if sample_candidate.exists():
        return str(sample_candidate.relative_to(PROJECT_ROOT))

    return image_file


def build_review_item(result: dict[str, Any]) -> dict[str, Any]:
    vote = result.get("vision_vote", {})
    engine = result.get("engine_result", {})
    score_trace = engine.get("score_trace", {})
    resolver_trace = score_trace.get("resolver_trace", {})
    final_features = vote.get("final_features", {})
    field_confidence = vote.get("field_confidence", {})
    low_fields = sorted(set(unstable_fields(vote.get("passes", []))) | set(vote_low_confidence_fields(vote)))
    return {
        "image_file": canonical_image_file(result.get("image_file", "")),
        "person_id": result.get("person_id", ""),
        "hand_side": result.get("hand_side", ""),
        "key_features": {field_key: final_features.get(field_key) for field_key in KEY_FIELDS},
        "final_features": final_features,
        "field_confidence": field_confidence,
        "low_confidence_fields": low_fields,
        "primary_mother": engine.get("primary_mother"),
        "secondary_mother": engine.get("secondary_mother"),
        "persona_id": engine.get("persona_id"),
        "persona_name": engine.get("persona_name"),
        "resolver_used": bool(score_trace.get("resolver_used")),
        "resolver_before": resolver_trace.get("before"),
        "resolver_after": resolver_trace.get("after"),
        "display_content": engine.get("display_content", {}),
    }


def load_review_items(result_dir: Path) -> list[dict[str, Any]]:
    return [
        build_review_item(_load_json(path))
        for path in sorted(result_dir.glob("*_result.json"))
    ]


def _fmt_value(value: Any) -> str:
    return "" if value is None else str(value)


def write_json_pack(items: list[dict[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_markdown_pack(items: list[dict[str, Any]], output_path: Path) -> None:
    lines = [
        "# PalmTag qwen3.6-plus Human Review Pack",
        "",
        f"- Total images: {len(items)}",
        "- Model: qwen3.6-plus",
        "- Purpose: 人工评审真实图片人格结果是否准确、有无命中感",
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
            lines.append(f"| {field_key} | {_fmt_value(item['key_features'].get(field_key))} |")

        low_fields = item.get("low_confidence_fields") or []
        lines.extend(
            [
                "",
                "### 3. 低置信字段",
                "",
                ", ".join(low_fields) if low_fields else "None",
                "",
                "### 4. 规则结果",
                "",
                f"- primary_mother: `{item['primary_mother']}`",
                f"- secondary_mother: `{item['secondary_mother']}`",
                f"- persona_id: `{item['persona_id']}`",
                f"- persona_name: `{item['persona_name']}`",
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
                "| 最大问题 | 手填 |",
                "| 建议修正 | 手填 |",
                "",
            ]
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines), encoding="utf-8")


def build_human_review_pack(result_dir: Path, output_dir: Path) -> list[dict[str, Any]]:
    items = load_review_items(result_dir)
    write_markdown_pack(items, output_dir / "qwen36plus_review_pack.md")
    write_json_pack(items, output_dir / "qwen36plus_review_pack.json")
    return items


def main() -> int:
    parser = argparse.ArgumentParser(description="Build qwen3.6-plus human review pack.")
    parser.add_argument(
        "--result-dir",
        type=Path,
        default=PROJECT_ROOT / "outputs" / "qwen_real_image_batch_qwen3_6_plus",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=PROJECT_ROOT / "outputs" / "human_review",
    )
    args = parser.parse_args()

    items = build_human_review_pack(args.result_dir, args.output_dir)
    print(f"Wrote {len(items)} review items to outputs/human_review/qwen36plus_review_pack.md")
    print("Wrote outputs/human_review/qwen36plus_review_pack.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

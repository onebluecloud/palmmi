from __future__ import annotations

from collections import Counter
from pathlib import Path
from typing import Any

from src.loader import load_field_schema


BINARY_FIELDS = {
    field["field_key"]
    for field in load_field_schema()
    if str(field["value_range"]).strip() == "0/1"
}


def _defaults() -> dict[str, Any]:
    return {field["field_key"]: field["default_value"] for field in load_field_schema()}


def _field_keys() -> list[str]:
    return [field["field_key"] for field in load_field_schema()]


def _normalize_value(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value).strip()
    if not text or text.lower() == "null":
        return None
    return int(float(text))


def _fuse_values(field_key: str, values: list[int | None], default_value: int) -> tuple[int, str]:
    non_null = [value for value in values if value is not None]
    if len(non_null) <= 1:
        return int(default_value), "fallback"

    counts = Counter(non_null)
    if len(non_null) == 3 and len(counts) == 1:
        return non_null[0], "high"
    if counts.most_common(1)[0][1] >= 2:
        return counts.most_common(1)[0][0], "medium"

    if field_key in BINARY_FIELDS:
        return sorted(non_null)[len(non_null) // 2], "low"
    return sorted(non_null)[len(non_null) // 2], "low"


def merge_three_passes(
    image_file: str,
    person_id: str,
    hand_side: str,
    passes: list[dict[str, Any]],
) -> dict[str, Any]:
    if len(passes) != 3:
        raise ValueError("merge_three_passes expects exactly 3 passes")

    defaults = _defaults()
    final_features: dict[str, int] = {}
    field_confidence: dict[str, str] = {}
    normalized_passes: list[dict[str, int | None]] = []
    for one_pass in passes:
        normalized_passes.append(
            {field_key: _normalize_value(one_pass.get(field_key)) for field_key in _field_keys()}
        )

    for field_key in _field_keys():
        values = [one_pass[field_key] for one_pass in normalized_passes]
        final_value, confidence = _fuse_values(field_key, values, int(defaults[field_key]))
        final_features[field_key] = final_value
        field_confidence[field_key] = confidence

    return {
        "image_file": str(image_file),
        "person_id": person_id,
        "hand_side": hand_side,
        "passes": normalized_passes,
        "final_features": final_features,
        "field_confidence": field_confidence,
    }


def low_confidence_fields(vote_result: dict[str, Any]) -> list[str]:
    return [
        field_key
        for field_key, confidence in vote_result.get("field_confidence", {}).items()
        if confidence in {"low", "fallback"}
    ]


def load_three_pass_jsons(image_stem: str, vision_json_dir: Path) -> list[dict[str, Any]] | None:
    passes: list[dict[str, Any]] = []
    for index in range(1, 4):
        path = vision_json_dir / f"{image_stem}_pass_{index}.json"
        if not path.exists():
            return None
        import json

        passes.append(json.loads(path.read_text(encoding="utf-8")))
    return passes

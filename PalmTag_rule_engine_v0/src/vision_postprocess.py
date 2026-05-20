from __future__ import annotations

import copy
from typing import Any


MAIN_LINE_DEPTH_FIELDS = ["HEAD_LINE_DEPTH", "HEART_LINE_DEPTH", "LIFE_LINE_DEPTH"]
MAIN_LINE_CONFIDENCE_FIELDS = [
    "HEAD_LINE_DEPTH",
    "HEAD_LINE_LENGTH",
    "HEAD_LINE_CURVE",
    "HEART_LINE_DEPTH",
    "HEART_LINE_LENGTH",
    "HEART_LINE_CURVE",
    "LIFE_LINE_DEPTH",
    "LIFE_LINE_LENGTH",
    "LIFE_LINE_CURVE",
]
MOUNT_FIELDS = [
    "MOUNT_VENUS",
    "MOUNT_JUPITER",
    "MOUNT_SATURN",
    "MOUNT_APOLLO",
    "MOUNT_MERCURY",
    "MOUNT_LUNA",
]
SPECIAL_LINE_FIELDS = ["SIMIAN_LINE", "CHUAN_PALM"]
LINE_GROUPS = {
    "HEAD_LINE_DEPTH": "head",
    "HEAD_LINE_LENGTH": "head",
    "HEAD_LINE_CURVE": "head",
    "HEART_LINE_DEPTH": "heart",
    "HEART_LINE_LENGTH": "heart",
    "HEART_LINE_CURVE": "heart",
    "LIFE_LINE_DEPTH": "life",
    "LIFE_LINE_LENGTH": "life",
    "LIFE_LINE_CURVE": "life",
}


def _pass_values(vote_result: dict[str, Any], field_key: str) -> list[Any]:
    return [one_pass.get(field_key) for one_pass in vote_result.get("passes", [])]


def _non_null(values: list[Any]) -> list[int]:
    return [int(value) for value in values if value is not None]


def _confidence_note_low_fields(vision_passes: list[dict[str, Any]] | None) -> list[str]:
    low_fields: list[str] = []
    for item in vision_passes or []:
        notes = item.get("confidence_notes") or {}
        fields = notes.get("low_confidence_fields") or []
        low_fields.extend(str(field_key) for field_key in fields)
    return low_fields


def _add_adjustment(
    adjustments: list[dict[str, Any]],
    features: dict[str, Any],
    field_key: str,
    new_value: int,
    reason: str,
) -> None:
    old_value = features.get(field_key)
    if old_value == new_value:
        return
    features[field_key] = new_value
    adjustments.append(
        {
            "field_key": field_key,
            "before": old_value,
            "after": new_value,
            "reason": reason,
        }
    )


def apply_vision_postprocess(
    vote_result: dict[str, Any],
    vision_passes: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    updated = copy.deepcopy(vote_result)
    features = updated.setdefault("final_features", {})
    confidence = updated.get("field_confidence", {})
    adjustments: list[dict[str, Any]] = []

    low_main_fields = [
        field_key
        for field_key in MAIN_LINE_CONFIDENCE_FIELDS
        if confidence.get(field_key) in {"low", "fallback"}
    ]
    note_low_main_fields = [
        field_key
        for field_key in _confidence_note_low_fields(vision_passes)
        if field_key in MAIN_LINE_CONFIDENCE_FIELDS
    ]
    note_low_line_groups = {LINE_GROUPS[field_key] for field_key in note_low_main_fields}
    shallow_main_depths = all(int(features.get(field_key, 0) or 0) <= 1 for field_key in MAIN_LINE_DEPTH_FIELDS)
    if (
        len(low_main_fields) >= 2
        or len(note_low_line_groups) >= 2
        or shallow_main_depths
    ) and int(features.get("OVERALL_CLARITY", 0) or 0) > 1:
        _add_adjustment(
            adjustments,
            features,
            "OVERALL_CLARITY",
            1,
            "Cap OVERALL_CLARITY because major line depth/confidence is weak.",
        )

    fate_values = _non_null(_pass_values(updated, "FATE_LINE_CLARITY"))
    if int(features.get("FATE_LINE_CLARITY", 0) or 0) == 0 and any(value in {1, 2} for value in fate_values):
        _add_adjustment(
            adjustments,
            features,
            "FATE_LINE_CLARITY",
            1,
            "Keep shallow fate line because at least one pass saw value 1 or 2.",
        )

    for field_key in MOUNT_FIELDS:
        values = _non_null(_pass_values(updated, field_key))
        if len(set(values)) > 1:
            _add_adjustment(
                adjustments,
                features,
                field_key,
                1,
                "Default unstable mount field to middle value 1.",
            )

    for field_key in SPECIAL_LINE_FIELDS:
        positives = sum(1 for value in _non_null(_pass_values(updated, field_key)) if value == 1)
        final_value = 1 if positives >= 2 else 0
        _add_adjustment(
            adjustments,
            features,
            field_key,
            final_value,
            "Require at least two positive passes for special line fields.",
        )

    return {"vote_result": updated, "adjustments": adjustments}

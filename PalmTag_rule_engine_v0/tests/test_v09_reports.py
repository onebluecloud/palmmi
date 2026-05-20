from __future__ import annotations

import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from tools.build_v09_reports import feature_average, persona_change_rows, review_change_reason


def _result(image_file: str, persona_id: str, mother: str, features: dict) -> dict:
    return {
        "image_file": image_file,
        "person_id": Path(image_file).stem.split("-")[0],
        "hand_side": "left",
        "vision_vote": {
            "final_features": features,
            "field_confidence": {},
            "passes": [features, features, features],
        },
        "engine_result": {
            "primary_mother": mother,
            "secondary_mother": None,
            "persona_id": persona_id,
            "persona_name": persona_id,
            "display_content": {
                "hook": "hook",
                "quote": "quote",
                "final_judgement": "judgement",
            },
            "score_trace": {
                "mother_scores": {mother: 70},
                "persona_scores": {persona_id: 80},
                "resolver_used": False,
                "resolver_trace": {"before": persona_id, "after": persona_id},
            },
        },
    }


def test_feature_average_ignores_missing_values() -> None:
    results = [
        _result("samples/palms/a-left.jpg", "P31", "M1", {"HEAD_LIFE_GAP": 0}),
        _result("samples/palms/b-left.jpg", "P25", "M1", {"HEAD_LIFE_GAP": 2}),
        _result("samples/palms/c-left.jpg", "P29", "M7", {}),
    ]

    assert feature_average(results, "HEAD_LIFE_GAP") == 1.0


def test_persona_change_rows_pair_v08_and_v09_by_image_stem() -> None:
    v08 = [_result("samples/palms/kai-left.jpg", "P31", "M1", {"HEAD_LIFE_GAP": 0})]
    v09 = [_result("samples/palms/kai-left.jpg", "P25", "M1", {"HEAD_LIFE_GAP": 1})]

    rows = persona_change_rows(v08, v09)

    assert rows == [
        {
            "image_file": "kai-left.jpg",
            "v08_persona": "P31",
            "v09_persona": "P25",
            "changed": True,
            "judgement": "P31 default-outlet risk reduced.",
        }
    ]


def test_review_change_reason_mentions_field_and_persona_changes() -> None:
    old = _result("samples/palms/qing-left.jpg", "P31", "M1", {"HEAD_LIFE_GAP": 0})
    new = _result("samples/palms/qing-left.jpg", "P25", "M1", {"HEAD_LIFE_GAP": 1})

    reason = review_change_reason(old, new)

    assert "P31 -> P25" in reason
    assert "HEAD_LIFE_GAP 0 -> 1" in reason

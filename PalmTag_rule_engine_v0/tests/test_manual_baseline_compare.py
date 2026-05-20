from __future__ import annotations

import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from tools.compare_manual_baseline import average_features, closer_to_manual


def test_average_features_uses_annotation_features() -> None:
    annotations = [
        {"image_id": "a", "features": {"HEAD_LINE_DEPTH": 1, "OVERALL_CLARITY": 2}},
        {"image_id": "b", "features": {"HEAD_LINE_DEPTH": 3, "OVERALL_CLARITY": 1}},
    ]

    averages = average_features(annotations)

    assert averages["HEAD_LINE_DEPTH"] == 2
    assert averages["OVERALL_CLARITY"] == 1.5


def test_closer_to_manual_compares_absolute_error() -> None:
    assert closer_to_manual(v05_value=2.0, v06_value=1.6, manual_value=1.5) == "Yes"
    assert closer_to_manual(v05_value=1.4, v06_value=1.9, manual_value=1.5) == "No"
    assert closer_to_manual(v05_value=1.4, v06_value=1.6, manual_value=1.5) == "Tie"

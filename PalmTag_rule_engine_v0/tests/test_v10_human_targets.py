from __future__ import annotations

import json
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from src.result_builder import build_result


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


def _v09_features(sample_id: str) -> dict:
    path = PROJECT_ROOT / "outputs" / "qwen_real_image_batch_v09" / f"{sample_id}_result.json"
    return json.loads(path.read_text(encoding="utf-8"))["vision_vote"]["final_features"]


def test_v10_human_targets_are_met_from_v09_features() -> None:
    actual = {
        sample_id: build_result(_v09_features(sample_id))["persona_id"]
        for sample_id in TARGET_PERSONAS
    }

    assert actual == TARGET_PERSONAS

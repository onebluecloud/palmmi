from __future__ import annotations

import json
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from tools.random_batch_test import (
    build_batch_results,
    compare_distribution_files,
    generate_random_inputs,
    options_for_value_range,
    run_batch,
    write_distribution_report,
)


def test_options_for_value_range() -> None:
    assert options_for_value_range("0/1") == [0, 1]
    assert options_for_value_range("0-2") == [0, 1, 2]
    assert options_for_value_range("0-3") == [0, 1, 2, 3]
    assert options_for_value_range("0-3离散") == [0, 1, 2, 3]


def test_generate_random_inputs_are_complete(tmp_path: Path) -> None:
    input_dir = tmp_path / "random_inputs"
    records = generate_random_inputs(count=5, output_dir=input_dir, seed=7)

    assert len(records) == 5
    assert len(list(input_dir.glob("random_*.json"))) == 5
    assert all(len(record["features"]) == 33 for record in records)
    assert all(record["input_id"].startswith("random_") for record in records)


def test_build_batch_results_shape(tmp_path: Path) -> None:
    records = generate_random_inputs(count=3, output_dir=tmp_path / "inputs", seed=11)
    results = build_batch_results(records)

    assert len(results) == 3
    for item in results:
        assert set(item) == {
            "input_id",
            "primary_mother",
            "secondary_mother",
            "persona_id",
            "persona_name",
            "mother_scores",
            "persona_scores",
            "resolver_used",
            "resolver_pair",
            "core_support_count",
            "display_content_loaded",
            "dominant_fields",
        }
        assert item["persona_id"]
        assert item["persona_name"]
        assert item["display_content_loaded"] is True
        assert isinstance(item["dominant_fields"], list)


def test_write_distribution_report_flags_extreme_distribution(tmp_path: Path) -> None:
    results = [
        {
            "input_id": f"random_{index:04d}",
            "primary_mother": "M1",
            "secondary_mother": None,
            "persona_id": "P01",
            "persona_name": "人生排位赛选手",
            "mother_scores": {"M1": 100},
            "persona_scores": {"P01": 100},
            "resolver_used": False,
            "resolver_pair": None,
            "core_support_count": 2,
            "display_content_loaded": True,
        }
        for index in range(1, 21)
    ]
    report_path = tmp_path / "report.md"
    write_distribution_report(results=results, report_path=report_path)

    report = report_path.read_text(encoding="utf-8")
    assert "严重偏斜" in report
    assert "规则无法命中" in report
    assert "规则调整建议" in report


def test_run_batch_accepts_custom_output_paths(tmp_path: Path) -> None:
    summary = run_batch(
        count=2,
        seed=3,
        inputs_dir=tmp_path / "inputs",
        results_output=tmp_path / "custom_results.json",
        report_output=tmp_path / "custom_report.md",
    )

    assert len(summary["records"]) == 2
    assert len(summary["results"]) == 2
    assert (tmp_path / "custom_results.json").exists()
    assert (tmp_path / "custom_report.md").exists()


def test_compare_distribution_files_writes_metric_table(tmp_path: Path) -> None:
    v01 = tmp_path / "v01.json"
    v02 = tmp_path / "v02.json"
    out = tmp_path / "compare.md"
    base = {
        "input_id": "random_0001",
        "primary_mother": "M8",
        "secondary_mother": None,
        "persona_id": "P01",
        "persona_name": "人生排位赛选手",
        "mother_scores": {"M8": 100},
        "persona_scores": {"P01": 80},
        "resolver_used": False,
        "resolver_pair": None,
        "core_support_count": 2,
        "display_content_loaded": True,
        "dominant_fields": ["HEART_LINE_DEPTH"],
    }
    improved = dict(base)
    improved.update({"primary_mother": "M7", "persona_id": "P29", "dominant_fields": []})
    v01.write_text(json.dumps([base], ensure_ascii=False), encoding="utf-8")
    v02.write_text(json.dumps([improved], ensure_ascii=False), encoding="utf-8")

    compare_distribution_files(v01_path=v01, v02_path=v02, output_path=out)

    report = out.read_text(encoding="utf-8")
    assert "V0.1" in report
    assert "V0.2" in report
    assert "HEART_LINE_DEPTH" in report

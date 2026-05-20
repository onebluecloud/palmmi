from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.result_builder import build_result


def main() -> int:
    parser = argparse.ArgumentParser(description="Run PalmTag rule engine V0.1.")
    parser.add_argument("--input", required=True, help="Path to a JSON file with palm features.")
    parser.add_argument("--output", required=True, help="Path to write the result JSON.")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)
    features = json.loads(input_path.read_text(encoding="utf-8"))
    result = build_result(features)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

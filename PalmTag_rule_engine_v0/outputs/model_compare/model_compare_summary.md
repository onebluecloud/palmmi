# Model Compare Summary

| Model | Success | API failed images | JSON parse failures | 33-field complete rate | Avg manual error | M1 share | P06 share | Persona distribution | Failure reason |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| qwen-vl-plus | Yes | 0 | 0 | 100.0% | 0.22 | 9/9 | 2/9 | {"P31": 5, "P12": 2, "P06": 2} | None |
| qwen3-vl-plus | Yes | 0 | 0 | 100.0% | 0.46 | 0/9 | 0/9 | {"P28": 8, "P35": 1} | None |
| qwen3.5-plus | Yes | 0 | 0 | 100.0% | 0.26 | 7/9 | 0/9 | {"P31": 7, "P20": 1, "P02": 1} | None |
| qwen3.5-flash | Yes | 0 | 0 | 85.2% | 0.26 | 9/9 | 2/9 | {"P31": 7, "P06": 2} | Missing field: HEAD_LINE_END_FORK |
| qwen3.6-plus | Yes | 0 | 0 | 100.0% | 0.22 | 4/9 | 0/9 | {"P31": 4, "P20": 1, "P29": 2, "P32": 2} | None |
| qwen3.6-flash | Yes | 0 | 0 | 100.0% | 0.23 | 6/9 | 1/9 | {"P31": 5, "P28": 1, "P06": 1, "P14": 2} | None |

## Recommendation

- Most recommended for PalmTag: qwen3.6-plus (best balanced score: 0.244; manual-baseline average error=0.22; M1=4/9, P06=0/9, 33-field complete rate=100.0%)

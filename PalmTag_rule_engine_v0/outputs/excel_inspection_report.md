# Excel Inspection Report

Source workbook used: `E:\其他\Palmmi\PalmTag_三层数据总表_V3.xlsx`

## Sheet Summary

| Sheet | Columns | Effective rows | Empty rows inside used range | Missing required columns |
|---|---:|---:|---:|---|
| 01_field_schema_33 | 11 | 33 | 0 | None |
| 02a_mother_scoring | 8 | 33 | 0 | None |
| 02b_persona_rules | 9 | 145 | 0 | None |
| 02c_adjacent_resolver | 8 | 12 | 0 | None |
| 02d_scoring_constraints | 5 | 4 | 0 | None |
| 03_display_content | 12 | 36 | 0 | None |

## Sheet Columns

### 01_field_schema_33
seq, group, field_name, cn_name, range, source, confidence, is_core, can_decide_persona, default_val, note

### 02a_mother_scoring
mother_id, mother_name, field, operator, weight, score_formula, field_level, note

### 02b_persona_rules
persona_id, persona_name, mother_id, seq, field, condition, required, weight, note

### 02c_adjacent_resolver
pair_id, persona_a, name_a, persona_b, name_b, field, condition, result

### 02d_scoring_constraints
constraint_id, description, condition, action, scope

### 03_display_content
persona_id, code, persona_name, mother_type, hook, tagline, final_judgment, first_line, poster_title, poster_subtitle, three_keywords, share_copy

## Validation Checklist

- P01-P36 display copy complete: Yes
- 33 palm fields complete: Yes
- 8 mother types complete: Yes
- 12 adjacent resolver rules complete: Yes
- Unparseable executable rules: None
- Unknown referenced fields: None

## Column Mapping

- `01_field_schema_33.field_name` -> `field_key`
- `01_field_schema_33.cn_name` -> `chinese_name`
- `01_field_schema_33.range` -> `value_range`
- `01_field_schema_33.source` -> `source`
- `01_field_schema_33.confidence` -> `confidence_tier`
- `01_field_schema_33.can_decide_persona` -> `can_decide_persona`
- `01_field_schema_33.default_val` -> `default_value`
- `01_field_schema_33.note` -> `notes`
- `02a_mother_scoring.field` -> `field_key`
- `02b_persona_rules.condition` -> `operator` + `threshold`
- `02c_adjacent_resolver.field` + `condition` -> `resolver_field` + `conditions`
- `03_display_content.tagline` -> `quote`
- `03_display_content.final_judgment` -> `final_judgement`

## Notes

- The workbook was not present in the project root; the user-provided file path was used.
- Compound adjacent resolver rows were normalized into executable `conditions` arrays while preserving the required top-level fields.

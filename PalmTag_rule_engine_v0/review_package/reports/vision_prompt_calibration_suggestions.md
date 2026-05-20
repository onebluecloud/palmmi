# Vision Prompt Calibration Suggestions

This report only suggests visual-prompt calibration. It does not recommend changing persona names, display copy, 36-persona structure, or rule weights in this phase.

## Fields Needing Stricter Standards

- HEAD_LINE_DEPTH: require visible continuity, clear boundaries, and resistance to lighting artifacts before allowing the highest grade.
- HEAD_LINE_LENGTH: require visible continuity, clear boundaries, and resistance to lighting artifacts before allowing the highest grade.
- OVERALL_CLARITY: require visible continuity, clear boundaries, and resistance to lighting artifacts before allowing the highest grade.
- FATE_LINE_CLARITY: require visible continuity, clear boundaries, and resistance to lighting artifacts before allowing the highest grade.

## Fields Needing More Conservative Output

- HEAD_LINE_LENGTH: V0.4 average is high; prompt should prefer middle values unless the feature is unmistakable.
- HEART_LINE_DEPTH: V0.4 average is high; prompt should prefer middle values unless the feature is unmistakable.
- MOUNT_JUPITER: V0.4 average is high; prompt should prefer middle values unless the feature is unmistakable.
- OVERALL_CLARITY: V0.4 average is high; prompt should prefer middle values unless the feature is unmistakable.
- MOUNT_* fields: if palm mound fullness is hard to judge from lighting or camera angle, output 1 instead of 2.

## Fields Likely Misread by Qwen

- FATE_LINE_CLARITY: three-pass consistency is low or has large swings; add specific visual criteria.
- HEAD_LIFE_GAP: three-pass consistency is low or has large swings; add specific visual criteria.
- MOUNT_JUPITER: three-pass consistency is low or has large swings; add specific visual criteria.
- MOUNT_SATURN: three-pass consistency is low or has large swings; add specific visual criteria.

## Fields To Treat As Auxiliary Observation For Now

- FATE_LINE_CLARITY: unstable/angle-sensitive. Used by mothers ['M5', 'M6'] and personas ['P01', 'P03', 'P05', 'P07', 'P08', 'P13', 'P16', 'P23', 'P24', 'P26', 'P31', 'P36']; keep for observation before changing weights.
- HAND_ASPECT_RATIO: unstable/angle-sensitive. Used by mothers [] and personas []; keep for observation before changing weights.
- HEAD_LIFE_GAP: unstable/angle-sensitive. Used by mothers ['M4'] and personas ['P09', 'P12', 'P15', 'P17', 'P23', 'P34']; keep for observation before changing weights.
- MOUNT_APOLLO: unstable/angle-sensitive. Used by mothers [] and personas ['P11', 'P19', 'P27']; keep for observation before changing weights.
- MOUNT_JUPITER: unstable/angle-sensitive. Used by mothers ['M1'] and personas ['P01', 'P03']; keep for observation before changing weights.
- MOUNT_LUNA: unstable/angle-sensitive. Used by mothers ['M3', 'M7'] and personas ['P02', 'P10', 'P18', 'P22', 'P28']; keep for observation before changing weights.
- MOUNT_MERCURY: unstable/angle-sensitive. Used by mothers ['M3'] and personas ['P22']; keep for observation before changing weights.
- MOUNT_SATURN: unstable/angle-sensitive. Used by mothers ['M4'] and personas ['P06', 'P09']; keep for observation before changing weights.
- MOUNT_VENUS: unstable/angle-sensitive. Used by mothers ['M2'] and personas ['P14', 'P30', 'P35']; keep for observation before changing weights.
- PINKY_LENGTH_RATIO: unstable/angle-sensitive. Used by mothers [] and personas []; keep for observation before changing weights.

## Prompt Scale Notes To Add

- Highest grade 3 should mean very obvious, continuous, and shape-stable across the visible palm, not merely visible.
- Normal visibility should usually be 2, not 3.
- Uncertain cases should use middle values rather than extremes.
- LINE_COMPLEXITY must include fine cross-lines in the palm center, mounts, and around the three major lines.
- A clear hand photo is not equal to OVERALL_CLARITY=3; the palm lines themselves must be crisp and low-noise.
- FATE_LINE_CLARITY should not be high unless a vertical fate line is independently visible and continuous.

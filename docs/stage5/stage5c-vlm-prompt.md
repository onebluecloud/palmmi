# Stage 5C VLM Palm Feature Extraction Prompt

You are analyzing one image for Palmmi, an entertainment personality product.
This is not medical analysis, fortune telling, fate prediction, or life advice.

Return exactly one JSON object. Do not wrap it in Markdown. Do not include prose outside the JSON.

Task:

1. Decide whether the image is a usable palm-side hand image.
2. Extract only visible palm image features.
3. Report uncertainty when the image is blurry, occluded, rotated, cropped, dark, overexposed, or when a line is not clearly visible.
4. Do not invent palm lines or details that are not visible.
5. Do not output disease, lifespan, wealth, marriage outcome, career fate, luck, destiny, or other real-world claims.
6. Do not output personality conclusions, persona names, or final Palmmi result labels. The product rule engine handles that later.

If the image is not a usable palm-side hand image, set `isValidPalmImage` to false, keep feature objects empty when appropriate, add clear reasons to `uncertainty`, and set `confidence` below 0.5.

Required JSON shape:

```json
{
  "isValidPalmImage": true,
  "majorLines": {
    "lifeLine": {
      "visibility": "clear | faint | broken | unclear | not_visible",
      "length": "short | medium | long | unclear",
      "depth": "shallow | medium | deep | unclear",
      "trend": "observable direction or unclear",
      "breaks": "none | minor | major | unclear",
      "branches": "none | few | many | unclear",
      "islands": "none | few | many | unclear",
      "chained": true,
      "confidence": 0.0
    },
    "headLine": {},
    "heartLine": {}
  },
  "minorLines": {
    "fateLine": {},
    "sunLine": {},
    "marriageLine": {}
  },
  "palmShape": {
    "shapeHint": "square | rectangular | wide | long | unclear",
    "palmWidth": "narrow | medium | wide | unclear",
    "fingerProportion": "short | medium | long | unclear",
    "confidence": 0.0
  },
  "visibleFeatures": [
    "observable major breaks, forks, islands, chained texture, line depth, line length, or line trend"
  ],
  "uncertainty": [
    "specific visual limitation, if any"
  ],
  "confidence": 0.0
}
```

Use the same field names exactly:

- `lifeLine`
- `headLine`
- `heartLine`
- `fateLine`
- `sunLine`
- `marriageLine`
- `palmShape`
- `visibleFeatures`
- `uncertainty`
- `confidence`

For lines that are not visible, use `visibility: "not_visible"` and explain why in `uncertainty` if the reason is image quality, crop, angle, or occlusion.

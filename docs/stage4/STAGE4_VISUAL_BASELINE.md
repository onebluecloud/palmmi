# Palmmi Stage 4 Visual Baseline

## Visual Goal

Palmmi should feel like a premium mobile personality test with strong social sharing value.

It should be closer to:

- 娱乐人格测试
- MBTI / SBTI style personality labels
- 高级感社交分享卡片
- 微信 / 小红书传播物料

It must not feel like:

- 传统算命网站
- 医疗诊断工具
- 后台测试工具
- 工程 debug 面板
- 恐怖或玄学惊悚视觉

## Mobile-First Baseline

Stage 4 visual decisions start from mobile.

Priority viewports:

- 390px width
- 430px width

Rules:

- Every key page must have a strong mobile first screen.
- The first screen must explain the current action or result without requiring desktop space.
- Desktop is basic responsive adaptation only.
- Screenshots for acceptance must include mobile screenshots.
- Touch targets must be comfortable for phone usage.
- Content density should be compact but not dashboard-like.

## Brand Temperament

Palmmi should feel:

- playful but not childish
- perceptive but not medical
- social but not noisy
- polished but not luxury-heavy
- personal but not invasive
- mysterious only through subtle texture, not fortune-telling cliches

Recommended product tone:

- "发现你的掌纹人格"
- "生成一个适合分享的人格标签"
- "照片信息不稳定时给温和提示"

Avoid product tone:

- "预测命运"
- "诊断心理/健康问题"
- "AI 判断你的一生"
- "字段识别失败 / schema error / rule engine output"

## Color Direction

Preferred direction:

- Warm ivory or soft off-white as the main surface.
- Ink-like deep text for readability.
- Soft coral / rose / peach as human warmth accents.
- Fresh teal / mint as scan or recognition accent.
- Small amount of gold or champagne for premium highlights.

Avoid:

- heavy purple-blue mysticism
- black-gold fortune-telling style
- hospital green / clinical blue
- backend gray dashboard palette
- single-hue monotone pages
- large noisy gradients as the whole identity

## Typography Baseline

Mobile reading hierarchy:

- Product title / result persona name: large but controlled.
- Page title: concise and readable in one or two lines.
- Body copy: friendly, short, non-technical.
- Helper text: smaller, warm, practical.
- Debug or technical text: not visible to users.

Rules:

- Use stable line heights.
- Do not use negative letter spacing.
- Do not use viewport-width based font scaling.
- Long Chinese labels must wrap cleanly on 390px.
- Result names and persona labels must not overflow cards or buttons.

## Layout Baseline

Mobile layout should use:

- one primary action per screen
- clear vertical rhythm
- constrained card widths
- sticky or bottom-safe primary action only when needed
- enough top padding for phone browser / WeChat webview
- clear safe area around upload and share actions

Avoid:

- desktop-first hero split layouts
- dense admin tables in user-facing pages
- nested cards
- decorative floating card sections
- text overlapping palm textures
- forcing the full result hierarchy above the fold

## Palm Line Visual Principle

Palmmi may use palm visual elements, but they should be abstract and elegant.

Allowed:

- abstract palm line fragments
- partial line texture
- fine contour lines
- soft scan line motion in later UI stages
- cropped line patterns behind cards when contrast is safe
- poster-friendly line motifs

Avoid:

- full large hand as a scary or forensic object
- realistic palm photo as dominant background
- occult symbols
- medical scan visuals
- aggressive biometric surveillance styling
- line textures behind small text

## Card Baseline

Cards should feel like shareable personality cards, not backend panels.

Rules:

- Border radius should generally stay at or below 8px unless a later design reason is documented.
- Cards need clear content hierarchy: label, result, short explanation, action.
- Result cards may use stronger contrast and richer texture than utility cards.
- Do not put cards inside other cards.
- Technical details must not appear in user-facing cards.

## Button Baseline

Buttons should be direct and mobile-friendly.

Rules:

- Primary button: one clear action per screen.
- Secondary button: retake, back, or view details.
- Destructive or failure recovery buttons should use plain human wording.
- Buttons must not wrap awkwardly at 390px.
- Icons can be used later when a design system exists, but Stage 4A does not implement UI.

## State Visual Baseline

| State | Visual treatment |
| --- | --- |
| Home | Warm, immediate, product-forward, with subtle palm texture. |
| Upload | Practical photo guidance, clear input affordance, privacy-light wording. |
| Loading | Calm scanning / analysis feeling without fake scientific claims. |
| Success result | High personality-label impact, readable explanation, clear poster entry. |
| Low confidence | Same result hierarchy with gentle conservative-result hint. |
| Retry required | Helpful photo guidance, no blame, no persona output. |
| Rejected | Plain reason and clear re-upload path, no raw error code. |
| Poster | Share-card first, strong label, minimal copy, platform-friendly composition. |

## Poster Visual Baseline

Poster pages should optimize for phone sharing.

Rules:

- The persona name must be the strongest signal.
- Palmmi brand must be visible but not overpower the result.
- The poster should crop well in WeChat, Xiaohongshu, and Moments previews.
- Use abstract palm lines or scan motifs, not full scary hands.
- Keep copy short enough for screenshots and social feeds.
- Avoid debug fields, schema data, scores with decimals, and raw Top3 score tables.

## Screenshot Acceptance Baseline

Every future visual stage must save screenshots under:

```text
docs/stage4/screenshots/
```

Every key page must include mobile screenshots. Recommended mobile widths:

- 390px
- 430px

Desktop screenshots are useful but secondary.

## Visual Forbidden List

Palmmi Stage 4 visuals must not include:

- tarot, crystal ball, zodiac, talisman, or fortune booth motifs
- medical diagnosis language or medical scan styling
- raw JSON, schema, VLM, rule engine, or debug text in user pages
- dark horror palms or forensic hand imagery
- dense backend dashboard tables as the main result presentation
- fake precision such as exact decimals presented as truth
- claims that the product predicts health, fate, wealth, marriage, or lifespan

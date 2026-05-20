# Palmmi Stage 4 Design Tokens

This file is documentation only.

Stage 4A does not create `design-tokens.ts`, CSS variables, Tailwind config, component files, or any formal code token implementation.

## Brand Essence Tokens

| Token | Value |
| --- | --- |
| Product feel | premium social personality test |
| Emotional tone | warm, perceptive, shareable |
| Visual metaphor | abstract palm lines + soft scan traces |
| Primary medium | mobile web / WeChat webview |
| Main outcome | personality label + share poster |

## Color Tokens

These are Stage 4 visual baseline references, not implemented code.

| Token | Suggested value | Usage |
| --- | --- | --- |
| `surface.base` | `#FFF7EF` | Main warm page background. |
| `surface.card` | `#FFFFFF` | Cards and elevated result surfaces. |
| `surface.soft` | `#F8ECE3` | Soft bands, subtle containers. |
| `text.primary` | `#221B18` | Main copy and titles. |
| `text.secondary` | `#6F5F58` | Supporting copy. |
| `text.muted` | `#9A8A82` | Helper text and metadata. |
| `accent.warm` | `#F06F61` | Primary action warmth and highlights. |
| `accent.scan` | `#34B8A6` | Scan / analysis accents. |
| `accent.gold` | `#D7A84F` | Small premium highlight, never dominant. |
| `status.success` | `#2FA66A` | Positive state accent. |
| `status.warning` | `#D78A2D` | Low confidence / retry accent. |
| `status.error` | `#C84E4E` | Rejected / failure accent. |
| `line.subtle` | `#E8D8CE` | Borders and palm line texture. |

Color rules:

- Keep off-white / ink / warm accent as the core identity.
- Use teal only as scan or progress accent.
- Use gold sparingly for polish, not fortune-telling.
- Do not make the interface dominated by purple, dark blue, beige-only, or black-gold.

## Typography Tokens

Suggested mobile hierarchy:

| Token | Size | Line height | Usage |
| --- | --- | --- | --- |
| `type.hero` | 32px | 38px | Homepage product title or major result label. |
| `type.title` | 26px | 32px | Page title / result page heading. |
| `type.section` | 20px | 28px | Section heading. |
| `type.body` | 16px | 24px | Main readable copy. |
| `type.caption` | 13px | 18px | Helper copy and small labels. |
| `type.micro` | 12px | 16px | Internal labels when needed. |

Typography rules:

- Use 0 letter spacing unless a future design document explicitly justifies otherwise.
- Do not scale font sizes by viewport width.
- Keep user-facing copy short and concrete.
- Do not expose engineering terms to users.

## Spacing Tokens

Suggested mobile spacing:

| Token | Value | Usage |
| --- | --- | --- |
| `space.2xs` | 4px | Fine internal gaps. |
| `space.xs` | 8px | Small label gaps. |
| `space.sm` | 12px | Button inner rhythm and compact groups. |
| `space.md` | 16px | Default mobile page padding. |
| `space.lg` | 24px | Section gaps. |
| `space.xl` | 32px | Major page blocks. |
| `space.2xl` | 48px | Large top or bottom breathing room. |

Layout rules:

- Default mobile horizontal padding should start from 16px.
- Result cards can use 20px to 24px internal padding.
- Avoid cramming multiple unrelated decisions into one first screen.
- Keep bottom actions away from phone browser controls and safe areas.

## Radius Tokens

| Token | Value | Usage |
| --- | --- | --- |
| `radius.xs` | 4px | Small chips or inline labels. |
| `radius.sm` | 6px | Utility controls. |
| `radius.md` | 8px | Standard cards and buttons. |
| `radius.full` | 999px | Pills only when semantically useful. |

Rules:

- Cards should generally use 8px or less.
- Avoid overly bubbly rounded rectangles.
- Do not use nested rounded cards.

## Card Tokens

| Token | Value |
| --- | --- |
| `card.background` | `surface.card` |
| `card.border` | 1px solid `line.subtle` |
| `card.radius` | `radius.md` |
| `card.padding.mobile` | 20px |
| `card.shadow.default` | soft, low contrast |
| `card.shadow.poster` | richer but still clean |

Card rules:

- Result card may be more expressive than utility cards.
- Upload guidance cards must stay practical and readable.
- Do not show raw score/debug tables in user-facing cards.

## Button Tokens

| Token | Value |
| --- | --- |
| `button.height.primary` | 48px minimum |
| `button.height.secondary` | 44px minimum |
| `button.radius` | 8px |
| `button.primary.background` | `accent.warm` |
| `button.primary.text` | `#FFFFFF` |
| `button.secondary.background` | `surface.soft` |
| `button.secondary.text` | `text.primary` |

Button rules:

- One primary action per screen.
- Use plain verbs: 开始测试, 上传照片, 重新拍一张, 生成海报, 再测一次.
- Do not use technical commands like "run pipeline" or "reload schema".
- Text must fit at 390px.

## Shadow Tokens

| Token | Suggested value | Usage |
| --- | --- | --- |
| `shadow.card` | `0 10px 30px rgba(34, 27, 24, 0.08)` | Standard cards. |
| `shadow.poster` | `0 18px 48px rgba(34, 27, 24, 0.14)` | Poster preview. |
| `shadow.button` | `0 8px 18px rgba(240, 111, 97, 0.22)` | Primary CTA only. |

Rules:

- Shadows should add warmth, not dashboard depth.
- Avoid hard black shadows.
- Avoid glow-heavy mystic effects.

## Background Texture Tokens

| Token | Direction |
| --- | --- |
| `texture.palmLine` | Abstract palm line fragments with low contrast. |
| `texture.scan` | Thin horizontal or curved scan traces, used sparingly. |
| `texture.paper` | Very subtle warm paper grain if implemented later. |

Rules:

- Texture must never reduce text readability.
- Full-hand backgrounds are discouraged.
- Use local motifs rather than large ominous palm photos.

## Mobile Density Tokens

| Token | Direction |
| --- | --- |
| `density.home` | Clear first screen, one primary CTA. |
| `density.upload` | Practical guidance with 3 to 5 short tips. |
| `density.loading` | Minimal copy, calm progress. |
| `density.result` | Persona first, details below. |
| `density.poster` | Share-card composition, very short text. |

Rules:

- 390px must remain readable.
- 430px should feel richer but not structurally different.
- Desktop may widen content but should not change product meaning.

## Poster Tokens

| Token | Direction |
| --- | --- |
| `poster.aspect.primary` | Future Stage 4B should choose social-first aspect ratios. |
| `poster.signal.primary` | Persona name. |
| `poster.signal.secondary` | Mother type / one-line explanation. |
| `poster.brand` | Palmmi visible but secondary. |
| `poster.texture` | Abstract palm lines or scan motif. |

Poster rules:

- Poster must be understandable as a standalone image.
- Avoid long paragraphs.
- Avoid raw Top3 score tables.
- Avoid claims of fate, health, or diagnosis.

## Forbidden Visual Directions

Do not use:

- traditional fortune-telling visuals
- horror or forensic full-hand imagery
- medical diagnostic interface patterns
- backend/admin dashboards
- raw JSON / schema / model output in user UI
- dark purple mysticism as the whole brand
- fake scientific precision
- PalmTag as user-facing product name

# Palmmi Stage 4B Design Tokens Spec

## Purpose

This document extracts engineering-facing visual tokens from existing Stage 2 UI assets.

It is a specification document only. Stage 4B does not create `design-tokens.ts`, CSS variables, Tailwind config, global CSS, components, or page files.

## Source Basis

Stage 2 sources used:

- `palmtag-visual-direction.html`
- `assets/palmtag-topology.svg`
- `docs/stage2/ui-guideline.md`
- `docs/stage2/context.md`
- `docs/stage2/page-flow.md`
- `docs/stage2/scope.md`
- `docs/stage2/acceptance.md`
- `docs/stage2/todo.md`

Existing Stage 4 token document found:

- `docs/stage4/STAGE4_DESIGN_TOKENS.md`

No implementation token files were found:

- `design-tokens.ts`: not found
- `tokens.ts`: not found
- `theme.ts`: not found
- `tailwind.config.*`: not found
- `globals.css`: not found
- `variables.css`: not found

Recommended landing place for later implementation:

- If a CSS-first app is created, use `globals.css` or `variables.css`.
- If a TypeScript token system is created later, use `design-tokens.ts`.
- Stage 4B does not create either structure.

## Naming Rule

Stage 2 source files use `PalmTag`. Stage 4 user-facing implementation must use `Palmmi`.

Token names should use `palmmi` or neutral semantic names, not `palmtag`, except when referring to existing file paths.

## Color Tokens

### Stage 2 Source Palette

Extracted from `palmtag-visual-direction.html` and `assets/palmtag-topology.svg`.

| Token | Stage 2 value | Source usage | Stage 4B decision |
| --- | --- | --- | --- |
| `color.ink.base` | `#0B0C0E` | Main dark background, SVG background | Keep as dark surface option |
| `color.ink.2` | `#12151A` | Dark panels | Keep for dark cards/panels |
| `color.ink.3` | `#191D23` | Deeper dark variation | Keep as secondary dark depth |
| `color.paper.base` | `#F4F1EA` | Light paper sections and cards | Keep as light surface |
| `color.paper.2` | `#E9E3D8` | Secondary paper tone | Keep as soft surface |
| `color.silver` | `#B8BDC6` | Lines, secondary stroke, muted text | Keep for line and muted UI |
| `color.jade` | `#7FE0C3` | CTA, scan lines, palm topology highlight | Keep as primary scan/CTA accent |
| `color.violet` | `#A58CFF` | Small SVG accent point | Keep only as rare/secondary accent, not dominant |
| `line.light` | `rgba(184, 189, 198, .22)` | Borders on dark surfaces | Keep |
| `line.dark` | `rgba(11, 12, 14, .15)` | Borders on paper surfaces | Keep |
| `surface.soft.dark` | `rgba(11, 12, 14, .64)` | Dark overlay | Keep as overlay |
| `surface.soft.light` | `rgba(244, 241, 234, .68)` | Light overlay | Keep as overlay |

### Required Color Roles

| Required role | Stage 2 extracted value | Notes |
| --- | --- | --- |
| 主色 | `#0B0C0E` + `#7FE0C3` | Stage 2 identity is dark ink surface with jade action/scan accent |
| 辅助色 | `#F4F1EA`, `#E9E3D8`, `#B8BDC6`, `#A58CFF` | Paper, silver, and rare violet accent |
| 背景色 | `#0B0C0E` dark mode, `#F4F1EA` paper mode | Both appear in Stage 2 visual exploration |
| 文字色 | `#F4F1EA` on dark, `#0B0C0E` on paper | Must preserve contrast |
| 弱文字色 | `rgba(244, 241, 234, .62-.76)`, `rgba(11, 12, 14, .42-.62)` | Use for helper copy only |
| 卡片背景 | `#12151A`, `#F4F1EA`, `rgba(244, 241, 234, .06)` | Choose based on page surface |

TBD:

- Stage 2 does not define coral/rose primary actions. Existing `docs/stage4/STAGE4_DESIGN_TOKENS.md` contains a warmer coral token, but that token is not directly present in Stage 2 assets. If Stage 4C uses coral, it must be treated as Stage 4A baseline, not Stage 2 extraction.

## Button Tokens

Extracted from Stage 2 HTML:

| Token | Value |
| --- | --- |
| `button.height.primary.min` | `46px` |
| `button.padding.inline` | `17px` |
| `button.padding.block` | `12px` |
| `button.primary.background` | `#7FE0C3` |
| `button.primary.text` | `#0B0C0E` |
| `button.dark.background` | `#0B0C0E` |
| `button.dark.text` | `#F4F1EA` |
| `button.border.darkSurface` | `1px solid rgba(184, 189, 198, .28)` |
| `button.hover.border` | `rgba(127, 224, 195, .72)` |
| `button.transition` | `transform .18s ease, border-color .18s ease, background .18s ease` |

Rules:

- One primary action per screen.
- Use direct action copy.
- Buttons must fit at 390px.
- Do not use technical labels such as `run pipeline`, `schema`, or `VLM`.

## Border Tokens

| Token | Stage 2 value | Usage |
| --- | --- | --- |
| `border.default.dark` | `1px solid rgba(184, 189, 198, .18-.28)` | Dark cards and panels |
| `border.default.paper` | `1px solid rgba(11, 12, 14, .14-.16)` | Paper cards and guide blocks |
| `border.grid.dark` | `1px solid rgba(11, 12, 14, .15)` | Paper grid separators |
| `border.grid.light` | `1px solid rgba(184, 189, 198, .18)` | Dark grid separators |

Rules:

- Borders are thin and quiet.
- Avoid heavy framed panels.
- Do not make result pages look like admin dashboards.

## Radius Tokens

Stage 2 HTML uses mostly squared cards and panels. It only uses large radius for decorative palm-line curves and circular guide marks.

| Token | Value | Decision |
| --- | --- | --- |
| `radius.card` | `0px` in Stage 2 HTML | Stage 4 may keep squared editorial cards |
| `radius.decorative.line` | `999px` / `50%` | Only for palm-line illustration curves |
| `radius.future.max` | `8px` | From Stage 4 visual baseline, if future UI needs softened cards/buttons |

TBD:

- Final card/button radius should be decided in Stage 4C implementation screenshots. It must not exceed Stage 4 visual baseline unless a later stage documents why.

## Shadow Tokens

| Token | Stage 2 value | Usage |
| --- | --- | --- |
| `shadow.heroPreview` | `0 26px 70px rgba(0, 0, 0, .35)` | Home result preview shell |
| `shadow.poster` | `0 34px 80px rgba(0, 0, 0, .32)` | Poster preview |

Rules:

- Shadows are allowed mainly for result/poster preview depth.
- Avoid glow-heavy mystic effects.
- Avoid hard black panel depth on utility sections.

## Spacing Tokens

Extracted from Stage 2 HTML:

| Token | Value | Source usage |
| --- | --- | --- |
| `layout.maxWidth` | `1160px` | `--max` shell width |
| `layout.shell.desktopInset` | `14px each side` | `calc(100% - 28px)` |
| `layout.shell.mobileInset` | `12px each side` | `100% - 24px` under mobile media query |
| `space.gridHairline` | `1px` | Grid separators |
| `space.inlineGap.xs` | `8px` | Poster controls / chips |
| `space.inlineGap.sm` | `10px-12px` | Actions / status items |
| `space.block.md` | `18px-24px` | Quote and card internals |
| `space.panel` | `28px-30px` | Upload/result/poster panels |
| `space.sectionGap` | `32px` | Section head and poster wrap |
| `space.heroGap` | `48px` | Desktop hero grid |
| `space.sectionY` | `86px` | Section vertical padding |

Rules:

- Mobile implementation may normalize shell padding to 16px if needed for Stage 4 consistency, but Stage 2 source minimum is 12-14px.
- Keep page rhythm vertical and compact.
- Do not cram multiple unrelated choices into one first screen.

## Typography Tokens

Stage 2 HTML font families:

| Token | Value |
| --- | --- |
| `font.sans` | `"Aptos", "HarmonyOS Sans SC", "Microsoft YaHei UI", "Source Han Sans SC", system-ui, sans-serif` |
| `font.display` | `"Arial Narrow", "Aptos Display", "HarmonyOS Sans SC", system-ui, sans-serif` |
| `font.mono` | `"IBM Plex Mono", "JetBrains Mono", "SFMono-Regular", Consolas, monospace` |

Stage 2 source type scale:

| Token | Stage 2 value | Usage |
| --- | --- | --- |
| `type.brand` | `22px` | Topbar brand |
| `type.nav` | `13px` | Topbar nav |
| `type.eyebrow` | `12px` | Mono label |
| `type.hero.desktop` | `54px-112px` | Home hero |
| `type.hero.mobile` | `40px-46px` | Mobile hero |
| `type.copy.hero` | `17px-22px` desktop, `15px` mobile | Home explanation |
| `type.persona.preview` | `46px-70px` | Preview card persona |
| `type.persona.result` | `64px-96px` | Result page persona |
| `type.poster.title` | `44px-72px` | Poster persona |
| `type.section.title` | `36px-72px` | Section headings |
| `type.body` | `14px-18px` | Page body and quotes |
| `type.micro` | `11px-12px` | Codes, labels, metadata |

Stage 4 implementation rule:

- Stage 2 uses `clamp(...vw...)` in the exploration file. Later implementation should convert these into stable breakpoint-based sizes to satisfy Stage 4 text stability rules.
- Letter spacing stays `0`.
- Long Chinese persona names must wrap safely at 390px.

## Breakpoint Tokens

Stage 2 HTML breakpoints:

| Token | Value | Source |
| --- | --- | --- |
| `breakpoint.tabletCollapse` | `940px` | `@media (max-width: 940px)` |
| `breakpoint.mobileCompact` | `620px` | `@media (max-width: 620px)` |
| `viewport.mobile.acceptance.1` | `390px` | Stage 4 visual/screenshot baseline |
| `viewport.mobile.acceptance.2` | `430px` | Stage 4 visual/screenshot baseline |
| `viewport.desktop.acceptance` | `1440px x 900px` | Stage 4B screenshot mechanism |

Rules:

- Mobile is primary.
- Desktop is supplemental.
- 390px and 430px screenshots are mandatory for visual stages.

## Palm Texture Rules

Source:

- `assets/palmtag-topology.svg`
- `palmtag-visual-direction.html`
- `docs/stage2/ui-guideline.md`

Allowed:

- Abstract palm-line topology.
- Low-opacity palm-line texture behind large cards.
- Fine line/grid texture.
- Scan-like line treatment for analyzing/loading.
- Cropped texture in result and poster cards.

Forbidden:

- Large realistic palm photo as dominant background.
- Horror, forensic, occult, talisman, or old fortune-telling imagery.
- Palm lines behind small text where readability drops.
- Medical scan styling.

## Gradient Rules

Stage 2 source gradients:

- Dark page grid overlay: subtle 64px grid on `#0B0C0E`.
- Hero overlay: dark linear gradients over topology texture.
- Poster light overlay: paper gradient over topology texture.
- Poster dark overlay: dark gradient over topology texture.

Rules:

- Gradients are used for readability over texture, not as the brand itself.
- Avoid large noisy gradients.
- Do not turn Palmmi into a purple-blue mystic gradient product.

## Card Rules

Stage 2 card patterns:

- Result preview card on dark topology background.
- Sample result cards in dark and paper variants.
- Upload guide panel with paper surface.
- Analysis/status panel with dark surface.
- Poster card with 3:4 aspect ratio.

Tokens:

| Token | Value |
| --- | --- |
| `card.result.background` | dark gradient + topology SVG + `#0B0C0E` |
| `card.utility.light` | `#F4F1EA` |
| `card.utility.dark` | `#12151A` |
| `card.border` | `1px solid` semantic line token |
| `card.padding.compact` | `23px-24px` |
| `card.padding.rich` | `28px-30px` |

Rules:

- Cards must serve content hierarchy, not decoration.
- Do not nest cards inside cards.
- User-facing cards must not show raw technical fields.

## Poster Visual Rules

Source:

- `docs/stage2/ui-guideline.md`
- `docs/stage2/todo.md`
- `palmtag-visual-direction.html`

Tokens:

| Token | Value |
| --- | --- |
| `poster.aspect` | `3 / 4` |
| `poster.width.desktopColumn` | `290px-430px` |
| `poster.padding` | `30px` |
| `poster.qr.size` | `58px` |
| `poster.title.size` | `44px-72px` source range |
| `poster.shadow` | `0 34px 80px rgba(0, 0, 0, .32)` |
| `poster.texture` | topology SVG over paper or dark gradient |

Rules:

- Persona name is the primary signal.
- One quote or short result line only.
- Palmmi brand visible but secondary.
- QR can remain a placeholder until a later stage defines real sharing.
- Do not include debug fields, raw scores, schema info, or long paragraphs.
- Formal PNG export is out of Stage 4B scope.

## Page Density Tokens

| Page | Density rule from Stage 2 |
| --- | --- |
| Home | One strong product hook + CTA + sample result card |
| Upload | Practical guidance, clear upload area, short tips |
| Analyzing | Minimal text, palm scan feeling, 1-2 second mock wait in Stage 2 |
| Result | Persona first, quote second, explanation and actions below |
| Poster | Share-card first, minimal copy, social-friendly vertical card |
| Error | Friendly retry guidance, no technical terms |

## Implementation Placement

Current repository state:

- No `app/` directory found.
- No `components/` directory found.
- No `public/` directory found.
- No token implementation file found.
- Existing token work is documentation-only in `docs/stage4/STAGE4_DESIGN_TOKENS.md`.

Stage 4B decision:

- Do not create token code.
- Do not create global CSS.
- Do not modify Stage 3 files.
- Later Stage 4C should decide front-end structure first, then implement these tokens minimally in the chosen structure.

## Token Sufficiency For Stage 4C

Enough for Stage 4C:

- Home page color, typography direction, CTA style, topology motif, card hierarchy.
- Upload page guidance layout, button treatment, paper/dark panel contrast, friendly state tone.
- Mobile-first acceptance sizes.

Not enough for later stages without further screenshot validation:

- Full analyzing page composition.
- All result states across 36 personas.
- Poster polish across all persona names.
- Complete error-state visual library.

Conclusion:

The Stage 2 token extraction is sufficient to start Stage 4C homepage and upload-page implementation, but later visual stages must validate with screenshots before claiming full UI completion.

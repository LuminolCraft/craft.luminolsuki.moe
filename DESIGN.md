# LuminolCraft Design System

## 1. Design Philosophy

LuminolCraft is a Minecraft server website whose visual identity grew out of a close study of Vercel's Geist design system — the restrained engineering aesthetic, shadow-as-border discipline, negative-tracking typography. That inheritance remains visible in the token layer, but the thesis has diverged: where Vercel's pages are symmetric, white, and still, LuminolCraft is **violet-tinted, asymmetric, and in constant motion**.

Five commitments define the doctrine:

- **Irregular but ordered Bento layouts.** No center-axis stacking. The features grid allocates one 2×2 hero card and two compact cards via explicit `grid-template-areas`; the team section offers three entirely different compositions (Z-diagonal, cinema four-corner, ball scatter), any of which may load on a given visit.
- **Small radii, hard geometry.** Cards at 16–20px, icons at 16px or 50%, buttons at 10px. Circles only where they mean something: avatars, ball members, status dots.
- **Deep GSAP scroll narrative.** Pinned sections are not "stuck" — they are stages. While pinned, backgrounds parallax, watermarks drift, and cards arrive sequentially across the pin's scroll distance. A pin that freezes content is a bug of choreography, not a feature.
- **MiSans for a Chinese-first context.** All text runs through MiSans VF — CJK glyphs and Latin companion in one file, one weight axis, one rendering pipeline.
- **Violet as the anchor.** `#a78bfa` (light) and `#9370db` (dark) carry the brand; glass, shadows, gradient text, and wave dividers all harmonize with it.

## 2. Typography

### Font Loading & Global Features

One variable font serves the entire site: `fonts.css` imports MiSans VF (Chinese Simplified + Latin) from `cdn-font.hyperos.mi.com`, and `index.html` preloads the woff2 (`as="font" type="font/woff2-variations" crossorigin`) plus a preconnect to the same host. Primary stack: `--font-primary: 'MiSans VF', 'MiSans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif`. The monospace voice is a pure system chain — there is no Geist Mono webfont here: `--font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, Monaco, 'Courier New', monospace`.

OpenType `"liga"` and `"kern"` are enabled on every element — declared identically in `fonts.css`, `typography.css`, and `vercel-design-system.css`. Text selection is styled once: `::selection { background-color: hsla(0, 0%, 95%, 1); color: inherit; }`. Rendering is normalized with antialiased smoothing and `text-rendering: optimizeLegibility`.

### Type Scale Tokens

The three-weight system is strict: **400** reads, **500** interacts, **600** announces; **700** belongs to the 7px micro badge, and homepage components extend to 800/900 for display headlines.

| Token | Value |
|---|---|
| `--font-size-micro / caption / small / body` | 0.4375rem (7px) / 0.75rem / 0.875rem / 1–1.125rem |
| `--font-size-body-large / card-title / subheading / section / display` | 1.125–1.25rem / 1.5rem (24px) / 2rem (32px) / 2.5rem (40px) / 3rem (48px) |
| `--font-weight-normal / medium / semibold / bold` | 400 / 500 / 600 / 700 |
| `--letter-spacing-tightest / tighter / tight / normal / relaxed / none` | -2.4px / -2.0px / -1.28px / -0.96px / -0.32px / 0 — mapped to 48 / 40 / 32 / 24 / 16 / ≤14px |
| `--line-height-tightest / tight / snug / normal` | 1.00 / 1.20 / 1.25 / 1.33 (headings) |
| `--line-height-base / relaxed / loose / button` | 1.50 / 1.56 / 1.80 / 1.43 (body & UI) |
| `--line-height-mono / mono-caption / mono-tight` | 1.50 / 1.54 / 1.00 (code & labels) |

The tracking ladder compresses as size grows and relaxes to zero at reading sizes — the "minified code" logic inherited from the Vercel study, applied to a font whose CJK glyphs tolerate it well.

### Maintenance Note

`fonts.css` and `typography.css` both define the same batch of `--font-*`, `--letter-spacing-*`, and `--line-height-*` tokens, and some values disagree (`--font-size-body-large` is 1.125rem in `fonts.css` but 1.25rem in `typography.css`). Because `App.vue` imports `fonts.css` before `typography.css`, the latter silently wins — editing type tokens only in `fonts.css` will appear to do nothing.

## 3. Color System

`theme-colors.css` organizes color in three layers: raw source tokens, theme bases, and semantic mappings.

### Layer 1 — `--vercel-*` Raw Tokens

The neutral, workflow, console, and interactive palettes inherited from the Vercel study, defined in `theme-colors.css` **and** duplicated in `vercel-design-system.css` with identical values (see maintenance note below). Primaries: `--vercel-black` #171717, `--vercel-white` #ffffff, `--vercel-true-black` #000000. Gray scale `--vercel-gray-900 → 50`: #171717, #2a2a2a, #404040, #4d4d4d, #666666, #808080, #999999, #b3b3b3, #ebebeb, #fafafa. Workflow accents: `--vercel-ship-red` #ff5b4f, `--vercel-preview-pink` #de1d8d, `--vercel-develop-blue` #0a72ef. Console/code: `--vercel-console-blue` #0070f3, `--vercel-console-purple` #7928ca, `--vercel-console-pink` #eb367f. Interactive: `--vercel-link-blue` #0072f5, `--vercel-link-hover` #0051cc, `--vercel-focus-blue` hsla(212, 100%, 48%, 1), `--vercel-ring-color` rgba(147, 197, 253, 0.5). Surface/overlay: `--vercel-overlay-backdrop` hsla(0, 0%, 98%, 1), `--vercel-selection-text` hsla(0, 0%, 95%, 1), `--vercel-badge-blue-bg` #ebf5ff, `--vercel-badge-blue-text` #0068d6.

### Layer 2 — `--bases-*` Theme Bases

Light (`--bases-*`) and dark (`--bases-dark-*`) bases define every surface, text, glass, shadow, and status color. Identity: **primary** `#a78bfa` / `#9370db` (gradients `linear-gradient(135deg, #9e94d8, #b6ade6)` and `linear-gradient(135deg, #7b68ee, #9370db)`); **background** `#f2eefc` — the signature violet-tinted canvas — / `#0f0f14`; **text** resolves to `--bases-indigo` `#2c3e50` with secondary `#3c3c3ca8`, flipping to `#f2eefc` on near-black in dark mode.

| Variable | Light | Dark |
|---|---|---|
| `--bases-primary` / `--bases-dark-primary` | #a78bfa | #9370db |
| `--bases-background-color` | #f2eefc | #0f0f14 |
| `--bases-card-bg` / `-hover` | rgba(255, 255, 255, 0.8 / 0.9) | #18181e / #222228 |
| `--bases-glass-bg` / `--bases-glass-border` | rgba(255, 255, 255, 0.6) / rgba(158, 148, 216, 0.3) | rgba(24, 24, 30, 0.6) / rgba(158, 148, 216, 0.2) |
| `--bases-shadow-color` / `--bases-shadow-hover` | rgba(109, 91, 154, 0.2 / 0.3) | rgba(0, 0, 0, 0.3 / 0.4) |
| `--bases-button-hover` | #c4b5fd | #9370db |
| `--bases-nav-bg` | rgba(0, 0, 0, 0.7) | rgba(0, 0, 0, 0.9) |
| `--bases-online-dot` | #00BFA6 | #009688 |
| `--bases-footer-background-color` / `-text-color` | #000000 / #888888 | #080810 / #555566 |
| `--bases-success / error / warning / info` | #00BFA6 / #dc3545 / #ffc107 / #3b82f6 | #009688 / #c62828 / #f57c00 / #1976d2 |
| `--bases-accent-color` | #f59e0b | #f59e0b |

### Layer 3 — Semantic Mapping

Components never read `--bases-*` directly for themeable surfaces; they read the semantic layer, remapped wholesale under `html[data-theme="dark"]`. The mapped set covers `--background-color`, `--background-gradient`, `--text-color`, `--text-secondary`, `--primary-color`, `--primary-gradient`, `--card-bg(-hover)`, `--glass-bg`, `--glass-border`, `--shadow-color`, `--shadow-hover`, `--nav-bg`, `--nav-bg-scroll`, `--button-hover`, `--link-hover-color`, `--accent-color`, `--online-color`, `--footer-*`, `--white`/`--black`, the four status colors, and `--border-color`/`--divider-color` — the latter at `--vercel-gray-100` (#ebebeb) light / `--vercel-gray-800` (#2a2a2a) dark, the one place the Vercel gray scale actively feeds the project's own chrome.

### Shadow-as-Border System

The border-replacement technique survives as four composable tokens, defined in `theme-colors.css` (mirrored in `typography.css` and `responsive.css`):

| Token | Value | Use |
|---|---|---|
| `--shadow-border` | rgba(0, 0, 0, 0.08) 0px 0px 0px 1px | Hairline border without `border` |
| `--shadow-light-border` | rgb(235, 235, 235) 0px 0px 0px 1px | Light ring |
| `--shadow-subtle` | rgba(0, 0, 0, 0.04) 0px 2px 2px | Minimal lift |
| `--shadow-card` | ring + subtle + rgba(0,0,0,0.04) 0px 8px 8px -8px + #fafafa 0px 0px 0px 1px | Full card stack with inner glow |
| `--shadow-hover` | ring + rgba(0,0,0,0.06) 0px 4px 8px + rgba(0,0,0,0.02) 0px 12px 16px -4px | Hover elevation |

In practice, homepage cards lean on the project's violet shadows (`0 10px 30px var(--shadow-color)`); the Vercel stacks serve pages consuming `.vercel-*` classes. **Maintenance note:** the `--vercel-*` block appears in both `theme-colors.css` and `vercel-design-system.css`; shadow tokens exist in three files. Treat `theme-colors.css` as the source of truth and keep the copies in sync.

## 4. Theme Switching & View Transitions

Dark mode is carried entirely by the `data-theme` attribute on `<html>`. `TocToggles.vue` owns the toggle; `theme-colors.css` owns the CSS machinery. The signature is a **pixelated circular reveal** via the View Transitions API. On click, the component computes the click point and `maxDist` (distance to the farthest viewport corner), then generates a **32×32 pixelated SVG circle mask** at runtime — a loop emits 1.1×1.1 `<rect>` cells for every grid position inside the circle radius, with `shape-rendering="crispEdges"`, inlined as a data URI. `document.startViewTransition()` wraps the theme application; inside its callback the root briefly gets `data-vt`, the attribute flips, a forced reflow guarantees the new theme is snapshotted, and `data-vt` is removed. On `transition.ready`, an injected `<style data-theme-reveal>` applies the mask to `::view-transition-new(root)` — `mask-size: var(--reveal-size)`, `mask-position` centered on the click coordinates — alongside a no-op `theme-reveal-keepalive` keyframe (10s, forwards) that keeps the pseudo-element alive. GSAP then tweens the registered custom property `@property --reveal-size { syntax: "<length>"; inherits: true; initial-value: 0px }` from `0px` to `maxDist * 2` over **0.8s** with `EASINGS.smooth` (power2.inOut): the old theme stays visible beneath while the new theme expands through the pixelated circle. A click mid-animation plays/reverses the running tween once instead of starting a conflicting second reveal.

Supporting CSS: `::view-transition-old(root), ::view-transition-new(root) { animation: none; mix-blend-mode: normal; }` disables the default cross-fade so the mask alone tells the story, with `pointer-events: none` on all `::view-transition-*` pseudos; `:root[data-vt] *:not(.theme-icon) { transition-duration: 0s !important; }` freezes every CSS transition during the snapshot frame. Gradient-text elements (`.feature-title`, `.server-index`, `.section-title`, `.contributor-name`, `.team-ball-name`, the watermark) carry `:root[data-vt]` overrides swapping `background-clip: text` for solid `var(--text-color)` to prevent transparent-text flicker. The hero opts out entirely (`view-transition-name: none !important` on `.hero-section`, `.hero-overlay`, `.header-background`, and its `::after`).

**Degradation.** Without View Transitions support, a fixed `.theme-reveal` overlay (z-index 9998) is painted with the *old* `--background-color` and GSAP fades it out over 0.4s power1.out; under `prefers-reduced-motion: reduce` the theme switches directly. **Persistence:** a cookie `theme=dark|light; path=/; max-age=31536000` — one year — re-read on load, with `data-theme` applied immediately by an `immediate` watcher.

## 5. Layout & Components

### Home Composition

The homepage is fixed to the "Layout C" Bento composition (`home-layout.ts`), rendered by `LayoutCSections.vue`: features → servers → team. The team slot is style-pluggable — `CURRENT_TEAM_STYLE` may be `'artistic'`, `'cinema'`, `'bento'`, or `'random'` (currently `'random'`, with `resolveTeamStyle()` caching one pick per page lifetime so every consumer agrees).

### Features — Irregular Bento + Spotlight + 3D Tilt

Three columns, two rows, one explicit area map — `grid-template-areas: "responsive responsive multiplatform" / "responsive responsive secure"` — giving the large card a 2×2 footprint while the two small cards stack in the third column. Cards are glass-matted (20px radius, 1px `--glass-border`, `backdrop-filter: blur(10px)`, 32px padding) with per-position gradient tints — indigo for the large card, cyan and purple for the small ones — and kinetic gradient-text titles. Interaction is layered: a **section-level spotlight** follows the cursor as a 300px radial gradient at `--cursor-x`/`--cursor-y` (rgba(99, 102, 241, 0.08)) via `gsap.quickTo` on CSS custom properties; each card adds a **local 200px spotlight** and a **3D tilt of ±6°** (rotation quickTo, 0.3s power2.out) under `perspective: 1000px`. Icons (80px, 96px on the large card; 16px-radius squares or circles in the primary gradient) float along a hidden MotionPath — `M0,0 Q8,-10 16,0 T32,0` — over 6s, yoyoing on sine.inOut, started after the entrance completes. Entrance: the large card lands first, the small cards stagger with `STAGGERS.cards`, once at `top 75%`. On `(pointer: coarse)` spotlight layers and hover scale are disabled in CSS.

### Servers — Counter-Numbered Extensible Panels

`grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` plus a CSS counter do the bookkeeping. Each `.server-panel` carries `counter-increment: server-counter`, and its giant index — `clamp(4rem, 12vw, 10rem)`, weight 900, gradient-clipped, resting at 0.15 opacity — renders via `.server-index::before { content: counter(server-counter, decimal-leading-zero) }`: `01`, `02`, `03`… Copy a panel node and the numbering extends itself. Panels are pre-tinted by position (`:nth-child(1..4)` → indigo/purple/cyan/amber gradients) so future panels inherit a color identity. Hover lifts to `scale(1.03)`, brightens the border to `--primary-color`, raises index opacity to 0.35. Entrance staggers 0.15s at `top 85%`.

### Team — Three Personalities, One Data Source

All three team styles consume the same `contributors` array from `config/team-members.ts` (six members; exactly one `isOwner`).

**TeamArtistic — Z-diagonal flow with organic cards.** The container shifts `translateX(-3%)` to rhyme with features and form a Z-path; a `skewY(-2deg)` hairline separates it from the section above. The 4×3 asymmetric bento gives the owner a 2×2 block, two singles to the right, a wide pair below. Cards wear a **conic-gradient stroke** — `border: 2px solid transparent` over a two-layer background of `linear-gradient(var(--card-bg), var(--card-bg)) padding-box` and `conic-gradient(from var(--border-angle), var(--primary-color), transparent 30%, var(--primary-color)) border-box` — where `--border-angle` tracks the mouse via `atan2`, so the violet stroke sweeps around the cursor. Non-owner cards rest at ±2° rotations alternating by `nth-child`; the owner stays level at 0°. Names are kinetic gradient type (`clamp(1.5rem, 3vw, 2.5rem)`; owner `clamp(2.5rem, 5vw, 4rem)`). Hover at `(min-width: 769px) and (pointer: fine)`: ±8° 3D tilt, a 60px **avatar glow** following the cursor (±25% around its 50% anchor), **name counter-parallax** (±8px opposite the cursor), and **magnetic links** — links within 80px are attracted by `(1 − dist/80) × 6` px. Desktop is a pin-scrub (`end: '+=120%'`, `scrub: 1`): headers fly in from x −80, the owner card lands from x −60 / y 30 / scale 0.95, the rest from x +60 / y 30 — each arriving at its CSS-designed ±2° rotation — then avatar → name → role reveal across the final 20%. Below 1024px, coarse pointers, or reduced motion degrade to a single-column once-entrance list with no offset or rotation.

**TeamCinema — asymmetric four-corner impact.** Mobile-first (single column below 1024px); at `≥1024px` the section becomes a `min-height: 100vh` stage. The header floats at `top: 6vh; left: 5vw`; the title explodes to `clamp(5rem, 12vw, 12rem)` weight 900; a giant numeral watermark ("03", `clamp(15rem, 35vw, 30rem)`, opacity 0.08, gradient-clipped) bleeds off the top-right (`top: -5vh; right: -2vw`). The six cards abandon the grid for **absolute four-corner positioning** in a `100vh` board: the owner holds a 38vw × 64vh left-center slab, three 24vw cards stack down the right edge at 7vh/38vh/69vh, two 20vw cards sit top-center and bottom-center — every gap ≥4vw, no overlaps. The pin-scrub runs for `0.8 × innerHeight` with `scrub: 1`: the background parallaxes (`yPercent: 0 → −20`), the watermark drifts up and brightens to 0.15, the **owner scales in from 0.5 → 1**, and the other five arrive from alternating x ±80px with y 60 and rotationZ ±5°, staggered by `STAGGERS.cards.each`. Touch/narrow fallback is a plain once entrance.

**TeamBento — ball scatter with cursor repulsion.** Members render as **circular balls**: regular at `clamp(90px, 14vw, 150px)`, owner at `clamp(140px, 20vw, 260px)` with a 3px primary border and 50px glow. On desktop (`min-width: 1024px` + fine pointer) home positions come from **rejection sampling**: up to `MAX_ATTEMPTS = 60` draws per ball, constrained by a 30px ball-to-ball gap (`GAP`), a 30px section-edge margin (`SECTION_MARGIN`), and a **safe zone** from the header rect expanded by `SAFE_PADDING = 40px` so no ball covers the title. **Cursor repulsion**: within a 220px radius (`REPEL_RADIUS`), each ball is pushed along the cursor-to-ball vector with force mapped 0 → `MAX_REPEL_FORCE = 120px`, clamped to safe bounds, eased by `quickTo` at 0.4s power3.out; balls within 80px also scale to 1.12. Leaving the section springs everything home; resize regenerates after a 300ms debounce, gliding balls to new homes over 0.4s. Entrance is owner-first with `back.out(1.4)` at 0.5s and 0.12s stagger. Below 1024px or coarse pointers, CSS takes over: a vertical flex stack (`gap: 2rem`) with `transform: none !important`, only the opacity entrance playing.

### Hero

A full-viewport photographic stage: **22 background images** (7 AVIF, 15 WebP) crossfade through **two stacked `.header-background` layers**, each fading over 2s (`cubic-bezier(0.4, 0, 0.2, 1)`), with a random, never-immediately-repeating selection every 3600ms; the first image is preloaded with `fetchpriority="high"`. A dark violet overlay (`rgba(11, 14, 23, 0.55 → 0.95)`) guarantees contrast; the title is gradient-clipped at `clamp(3rem, 10vw, 8rem)`, weight 800, line-height 0.95. A glass status card (blur 20px, rotated −2°) floats bottom-right beside a "SCROLL ↓" indicator. The hero's scroll choreography — parallax, SplitText entrance, a `--reveal-size` gradient blend strip into features — is defined but parked (commented out), leaving the crossfade as the hero's sole motion.

### Navbar & Footer

The **navbar** is a 64px fixed glass bar (`backdrop-filter: blur(20px) saturate(1.5)` over `--bases-nav-bg`) in a three-column grid, scroll-aware at `≥1024px`: a ScrollTrigger from `top -50px` ramps `self.progress × 3` (capped at 1) into `--nav-alpha` over 0.1s, solidifying as you leave the top. Below 896px it becomes a left drawer: a burger-driven timeline fades the overlay (0.25s), slides the panel (`xPercent: −100 → 0`, 0.35s power3.out), and staggers the three burger lines into an X. The **footer** closes with a **double-layer SVG wave divider**: two paths (`.footer-wave-path-a` front, `.footer-wave-path-b` back, each with its own gradient) morph into one another via MorphSVG — `morph: { shape: '.footer-wave-path-b', shapeIndex: 'auto' }`, duration 8s, `yoyo: true`, `EASINGS.smooth`, repeating forever. Footer columns and status items enter once via ScrollTrigger (stagger 0.15 / 0.1); social icons scale 1.15 in a staggered wave on list hover.

## 6. Motion System

### Setup & Defaults

`setupGsap()` (called once in `main.ts`) registers **ScrollTrigger, ScrollToPlugin, SplitText, Flip, CustomEase, DrawSVGPlugin, MotionPathPlugin, MorphSVGPlugin** and applies global defaults — `gsap.defaults({ duration: 0.6, ease: 'power2.out', overwrite: 'auto' })`. Every un-specified tween runs 0.6s on power2.out, and `overwrite: 'auto'` kills conflicting tweens on the same properties. A `useGsap()` composable wraps `gsap.context(callback, scope)` with automatic `revert()` on unmount, plus a `reduceMotion()` helper.

### Token Tables

**DURATIONS** (`gsap/config/durations.ts`) — `hover` 0.2, `press` 0.1, `focus` 0.15, `fast` 0.25, `standard` 0.4, `entrance` 0.6, `pageIn` 0.5, `pageOut` 0.3, `exit` 0.3, `scrollReveal` 0.8, `slow` 1.0, `parallax` 1.0, `charStagger` 0.03, `wordStagger` 0.08, `lineStagger` 0.15.

**EASINGS** (`gsap/config/easings.ts`) — `entrance` power3.out, `exit` power3.in, `hover` power2.out, `press` power1.in, `bounce` back.out(1.7), `elastic` elastic.out(1, 0.3), `smooth` power2.inOut, `snappy` power4.out, `parallax` none, `tilt` power3.out, and `heroReveal` — a lazy-created `CustomEase` from the path `M0,0 C0.25,1 0.5,1 1,1`.

**STAGGERS** (`gsap/config/staggers.ts`) — `cards` each 0.1 from start, `list` each 0.08 from start, `grid` each 0.06 from center (`grid: 'auto'`), `rules` each 0.12 from start, `characters` each 0.03 random, `words` each 0.08 from start, `parallaxChars` each 0.04 from center, `tiltIcons` each 0.06 random.

Consumption is uneven: the workhorses — easings `entrance`/`hover`/`smooth`/`exit`, staggers `cards`/`list`/`parallaxChars`, durations `hover`/`entrance`/`scrollReveal`/`slow`/`exit`/`standard`/`fast`/`pageIn`/`press` — are consumed across TocToggles, the team components, Footer, CookieConsentBanner, the useNewsData/useArticleAnimations/useLightbox/useHoverAnimation composables, and the News/Archive/Support/SimpleRules/NotFound pages. **Reserved keys with no consumers today**: durations `focus`, `pageOut`, `parallax`, `lineStagger` (plus `charStagger`/`wordStagger`, referenced only by the unused `STAGGERS.characters`/`words`); easings `elastic`, `snappy`, `parallax`, `tilt`; staggers `grid`, `rules`, `characters`, `words`, `tiltIcons`. They are kept deliberately — they document intended rhythm and cost nothing at runtime.

### matchMedia Strategy

Motion is gated by three co-operating conditions: **interaction micro-motion** (3D tilt, spotlight, magnetic links) and the **global Lenis instance** run under `(min-width: 769px) and (pointer: fine)`; **pin sections** (TeamArtistic, TeamCinema) run under `(min-width: 1024px) and (pointer: fine)`, with an explicit `fallback` branch for `(max-width: 1023px), (pointer: coarse)` that swaps the pin for a once-only entrance; and **`prefers-reduced-motion: reduce`** is honored twice — a top-level reduce branch in every animated component sets final states via `g.set(...)` (everything visible, nothing moving) while every conditional block early-returns when reduce is true. Under reduce, TeamBento's desktop branch still generates random ball positions (layout preserved), just without entrance animation or cursor interaction.

### Pin-Scrub Principles

1. **A pin is a stage, not a parking spot.** While pinned, elements keep transforming — backgrounds parallax, watermarks drift and brighten, cards arrive in sequence across the pin's scroll distance. Pin distance is budgeted to the choreography (TeamArtistic `+=120%`; TeamCinema `0.8 × innerHeight`), both with `scrub: 1` buffering.
2. **GSAP rotation end values equal CSS design values.** When CSS gives an element a resting rotation (TeamArtistic's ±2° `nth-child` rotations), the scrub timeline animates from an exaggerated offset *to exactly that value*, so tween end state and stylesheet agree.
3. **Section offsets use margin; card offsets use transform.** Layout-level shifts stay out of the per-card transform space so GSAP's x/y never fight the layout; degenerate breakpoints cancel container shifts via `transform: none`.

### Fine-Tuning Point Convention

Every tunable magic number in team components and their CSS carries a `微调点：` comment, and each component's `<script setup>` opens with an indexed list of its tuning points (CSS and GSAP constants separately). Searching for `微调点：` yields the complete adjustment surface — ball radii, repulsion forces, pin distances, tilt angles, card coordinates — without reading the choreography code.

### Lenis Inertial Scrolling

Global scroll is Lenis-driven, desktop-only — instantiated under the same `(min-width: 769px) and (pointer: fine)` + not-reduced gate:

```ts
new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),  // exponential ease-out
  smoothWheel: true,
  wheelMultiplier: 1.2,
  touchMultiplier: 1.5,
  prevent: (node) => { /* walk ancestors */ },
})
```

The `prevent` callback walks up the DOM from the event target: any ancestor with `overflow-y: auto|scroll` that actually overflows is skipped (it keeps native scrolling), as is anything inside a `[data-lenis-scroll]` element (which manages its own Lenis via the `v-lenis-scroll` directive) — stopping the global smoother from hijacking modals, code blocks, and internal scroll panes. All Lenis instances — the global window smoother plus directive-created container instances, tracked in a shared `lenisInstances` registry — are driven by a **single `gsap.ticker` callback**; the global instance pipes its scroll events into `ScrollTrigger.update`, and a media-query cleanup destroys everything when conditions change.

## 7. Responsive & CSS Organization

### Breakpoint Landscape

Two coexisting breakpoint systems, by design. **CSS variable breakpoints** in `responsive.css`: `--breakpoint-mobile-small: 400px`, `--breakpoint-mobile: 600px`, `--breakpoint-tablet-small: 768px`, `--breakpoint-tablet: 1024px`, `--breakpoint-desktop-small: 1200px`, `--breakpoint-desktop: 1400px`; actual media queries step down at 1200 / 1024 / 768 / 600 / 400 (plus a `min-width: 1400px` container-padding bump). **GSAP matchMedia thresholds**: 769px + fine pointer for interaction micro-motion and Lenis, 1024px + fine pointer for pins, 896px for the navbar drawer — behavior thresholds (input capability + layout mode), not styling breakpoints, and intentionally not reusing the CSS numbers.

### Container & Collapse

The default container is `max-width: 1200px` with 32px padding (40px above 1400px, 24px at 1024, 16px at 768/600/400); `container-narrow` caps at 800px, `container-wide` at 1400px. Grids collapse progressively: 4→3 columns at 1200, 3→2 and 4→2 at 1024, everything→1 at 768. Typography steps down at 1024, 768, and 480 in `typography.css`. Homepage Bento layouts flatten to single columns at 768 with their `grid-template-areas` explicitly neutralized; team sections use their own thresholds (1024/1023px) per §5. Below 768px, interactive elements — `button`, `a`, `.btn`, `.nav-link`, `.menu-item` — are enforced to `min-width: 44px; min-height: 44px`, with form controls at `min-height: 44px`.

### Stylesheet Directory Layout

Global CSS lives in `src/styles/`, imported once, in order, from `App.vue`: `fonts.css` → `theme-colors.css` → `typography.css` → `vercel-design-system.css` → `responsive.css` → `gsap-splittext.css` (SplitText's `.split-char/.split-word/.split-line` classes with `will-change` and `.is-visible` release states). The `desktop/` and `mobile/` subdirectories hold per-page styles, imported by the components that own them:

| File | Imported by |
|---|---|
| `desktop/navigation.css` | Navbar.vue |
| `desktop/news-styles.css` | News.vue |
| `desktop/markdown-body.css` | NewsDetail.vue (JS import) |
| `mobile/navigation-mobile.css` | Navbar.vue |
| `mobile/home-mobile.css` | Home.vue and LayoutCSections.vue |

Other files in those directories are currently unreferenced. `App.vue`'s own style block carries only the global reset, body typography wiring (`--vercel-font-family` falling back to `--font-primary`), and shared `.section-title`/`.section-subtitle`/`.container` definitions.

## 8. Vercel Inspiration

`vercel-design-system.css` is the site's fossil record of its Vercel study: a complete parallel token system (`--vercel-*` colors, spacing, radii, durations, easings, breakpoints) plus `.vercel-*` utility and component classes — display/heading/body typography, `vercel-btn(-primary/-secondary)`, `vercel-badge(-red/-pink/-blue)`, `vercel-card`, `vercel-input`, `vercel-link`, the workflow pipeline (develop/preview/ship), metric cards, trust bar, and layout utilities. Pages consuming it directly include **Support**, **SimpleRules**, and **NotFound**.

The inspiration is honored at the token layer and politely overruled everywhere else. Kept from Vercel: shadow-as-border, the compressed negative-tracking type ladder, the three-weight discipline, `liga`/`kern` everywhere, the quiet 150–350ms transition range. Diverged: the achromatic canvas became violet-tinted (`#f2eefc` / `#0f0f14`), centered symmetric sections became asymmetric Bento areas, and the still page became a pinned, scrubbed, continuously moving narrative. The `--vercel-*` tokens remain the neutral vocabulary; the site's own voice is spoken in `--bases-*`.

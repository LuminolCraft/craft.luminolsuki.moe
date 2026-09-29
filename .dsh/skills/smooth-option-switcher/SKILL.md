---
name: smooth-option-switcher
description: Implement smooth mutually exclusive option selectors with CSS radio states and moving indicators, including a nested plan/billing selector that expands a compact submenu. Use for pricing plans, monthly/yearly billing, view modes, or segmented configuration controls. Adapt the demonstrated interaction to the project's UI system.
---

# Smooth Option Switcher

Implement the source-based CSS interaction in the bundled reference. Its distinctive form is a Free/Premium selector whose Premium subtitle expands into Monthly/Annual controls, with a second indicator inside the main one. A plain two- or multi-option control is an adaptation, not the full demonstrated component.

## Start with the project

Inspect the target's components, styling tokens, typography, motion conventions, framework, form/state patterns, and browser targets. Reuse those conventions. Do not impose the reference's monochrome palette, font, pill shape, shadows, or fixed demo dimensions.

Use this pattern for a small set of mutually exclusive choices where a traveling indicator helps show selection. Use the nested form only when a secondary choice genuinely belongs to one primary option. Avoid it for independent toggles, action buttons, large/wrapping option lists, or navigation that needs links. Use tab semantics only for actual tab panels.

## Read the reference

DSH prints this skill's base directory in `<skill_resources>` as `Base directory for this skill:`. Resolve every path below against that directory; a bare `references/…` would otherwise resolve against the target project.

- [references/example.html](references/example.html) and [references/styles.css](references/styles.css): runnable canonical reconstruction, plain HTML and native nested CSS, no JavaScript or build step.
- [references/README.md](references/README.md): source provenance, observed/reconstructed/additional code, state behavior, and reproduction instructions. Read this before changing the technique or claiming source fidelity.
- [references/production.md](references/production.md): accessibility, responsive geometry, scoped instances, framework integration, and flat/multiple-option adaptations. Apply when shipping a component.
- [references/accessible.html](references/accessible.html) and [references/production.css](references/production.css): separate keyboard-accessible, responsive, reduced-motion adaptation; reuse the canonical stylesheet.
- [references/verification.md](references/verification.md): checks performed and remaining limits; repeat relevant checks in the target project.

## Preserve the interaction

Four native radios precede the visual wrapper: two independent groups for the primary mode and billing version. Their order matters to chained `:checked ~` selectors. Labels activate them; no JS is needed for the canonical interaction.

The main content is absolutely positioned over a normal-flow indicator occupying half the padded track. Changing mode translates that indicator by its own width (`translateX(100%)`). The full-size Premium label initially sits above the compact submenu, so a click anywhere on that half selects Premium first.

The submenu stays mounted. Its `top: 66%; left: 50%; translate(-50%, -50%) scale(0.6)` state becomes `top: 0; left: 0; translate(0, 0); gap: 0`. Premium fades and moves down by `10px`, scaling to `0.7`, while its stacking order drops to expose the submenu. The secondary indicator is an actual absolutely positioned element, `48%` wide and `80%` high, animated with **left**, not a substituted transform technique. The dot collapses; selected text changes color. Returning to Free collapses the menu and retains the billing selection.

Preserve persistent indicators, continuous reversible transitions, equal segment geometry, stacking/hit targets, and synchronized text changes. The observed easing is `cubic-bezier(0.34, 0.96, 0.6, 0.99)`. The reference preserves the observed `0.1s` Free text transition, `0.3s` Premium transition, and `0.5s` selected billing text transition. Its other `0.5s` transitions are explicitly reconstructed, not transcribed. Tune timing for the existing motion system without replacing the coordinated expansion with an unrelated animation.

Do not add hover-driven selection, remount indicators on change, flatten the nested interaction without a product reason, or introduce an animation library solely for this effect. No pseudo-elements or CSS variables are required by the observed code. Adding design tokens in a target project is appropriate.

## Adapt and verify

Customize colors, contrast, fonts, labels, spacing, dimensions, radii, and shadows through existing tokens. Scope IDs and radio names per instance; coordinate track padding, content geometry, and indicator endpoints when changing sizes. Keep the original reference unchanged when implementing a project adaptation.

Use existing framework state only for application integration, preserve native input semantics where practical, and keep animation in CSS. The canonical `hidden` inputs intentionally preserve the demonstration and are not keyboard accessible: implement the production guidance before shipping.

Verify all states, both switching directions, rapid reversals, remembered secondary selection, pointer hit targets, keyboard/focus behavior, reduced motion, narrow containers, long labels, and multiple instances. Check intermediate motion as well as endpoints. Report reconstructed details and actual verification limits honestly.

`scripts/verify.cjs` is the optional Playwright replay of `references/verification.md`; it needs a Playwright install plus Chromium and is not part of the canonical examples. Without it, verify by opening `references/example.html` and `references/accessible.html` in a real browser (they need no build step or JS) and by checking rendered geometry and intermediate transition frames.

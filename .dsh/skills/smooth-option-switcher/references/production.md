# Production adaptations (not video source)

`accessible.html` + `production.css` provide a separately runnable keyboard/reduced-motion example. They reuse the canonical stylesheet; they do not replace it. All content in this document and those two files is added guidance, not extracted source.

## Native controls and focus

The source's `hidden` attribute removes radios from keyboard navigation. The adaptation removes that attribute, visually hides the inputs without hiding them from assistive technology, and lets the browser provide native checked semantics, Tab entry into each radio group, arrow-key selection and Space activation. Do not put a second competing ARIA checked state on labels or add button roles to native inputs.

A fieldset/legend names the overall control. The two radio `name` groups remain independent. Billing inputs have explicit names that retain their meaning when the visible Premium text disappears. The Free/Premium label associations remain intact. Indicators and the dot are marked decorative. Focus rings are drawn on the corresponding visible labels; Premium focus uses its persistent parent rather than the label that fades to opacity zero.

While Free is checked, CSS removes the two billing radios from layout/accessibility/focus order. Their miniature text is a preview. When Premium becomes checked, the native inputs become available again. The remembered checked billing value survives. In a form submit handler, ignore `version` unless `mode` is Premium; CSS hiding does not disable submitted form values. If application state changes to Free while focus is in Billing, move focus to the primary Free radio before hiding Billing. The static example needs no JavaScript because ordinary user interaction moves focus between groups naturally; application-driven state changes may require a small focus-management effect.

Test with the target browser and screen reader. This example is a starting point, not a claim of a complete accessibility audit. If the product needs separately named Plan and Billing fieldsets, adapt the selector scope or use the framework's state attributes while retaining the motion and hit-target model; do not break the original sibling chain accidentally.

## Motion and contrast

The optional stylesheet disables transitions under `prefers-reduced-motion: reduce` while keeping all selected states and final geometry intact. It also responds to preference changes during an animation. Keep focus rings visible and outside clipping regions. Replace demonstration colors with the design system's accessible pairs; the adaptation darkens inactive text on the light track to `#666`. Use a production-specific focus token instead of assuming its blue ring suits every theme.

Do not introduce hover-driven state changes. A pointer cursor is the demonstrated hover affordance. Hover styling may be added through the host UI system without changing checked state.

## Geometry and responsiveness

The canonical track is `395px × 52px`; the adaptation caps width at available viewport width minus `32px`. Original `overflow-x: hidden` is overridden so real overflow is detectable. For embedded controls, constrain width to the **parent's** available inline size, not just the viewport. Test 320px viewport width, 280/395/560px containers, font scaling, and long translated labels. If labels cannot fit, choose a larger control or simpler layout; do not wrap the equal-width track while retaining a horizontal sliding indicator.

The main slider's 100% translation is relative to its own 50% width. Main content covers the track's padding box, whereas the normal-flow slider uses the content box. Changing border/padding can introduce small alignment differences; verify rendered rectangles rather than independently modifying offsets. Secondary width is 48% of the Premium region and its reconstructed left endpoints are 2% and 50%; changing these values requires keeping both end insets symmetric.

Keep at least usable touch targets in expanded states; the compact Billing preview is intentionally not a target. Avoid hiding overflow in a way that clips focus rings or expanded content. Preserve stable dimensions during state changes so adjacent layout does not jump.

## Scoped instances and framework integration

All four inputs and the visual wrapper must remain siblings in their given order for the canonical selectors. A shared outer fieldset is safe; putting a separate wrapper around only the radios is not. Scope CSS to the component and allocate unique IDs and distinct radio names **per instance**. Update every label `for` and state selector consistently. Static copies with `name="mode"` on one page otherwise control each other.

For React/Vue/Svelte or another existing framework, retain the same DOM/animation mechanism where practical. Generate stable instance IDs, use the application's selection state, and handle change events through its established conventions. Do not add the framework to a plain HTML project, use DOM measurement for equal segments, or add an animation library solely for this pattern. Maintain indicators in the DOM across state changes so interrupted transitions continue from their current visual position.

The reference uses native CSS nesting. If a project's browser targets require flat CSS, expand nesting without changing selector meaning or specificity; use its existing CSS pipeline if present.

## Flat two- or multi-option adaptations

For Monthly/Yearly, view modes, or Basic/Pro/Enterprise, a single radio group with one persistent indicator is usually sufficient. This generalizes the demonstrated main track; the nested submenu and its expansion are unnecessary if the product has no secondary choice. Explicitly describe this as an adaptation.

For N equal-width options, use indicator width `100% / N` of the padded content track and translate it by `selectedIndex × 100%` of its own width. Use per-state CSS selectors (or a framework state attribute/custom property), not a remounted indicator. Align the option row to that same track. CSS custom properties/calculations for this generalization are additions, not source code observed in the video. For unequal widths, this formula does not apply: prefer equal segments or explicitly design and test a measured adaptation rather than quietly misalign the indicator.

Preserve continuous reverse/repeated switching and synchronized selected text. Apply the project's semantics: radios for an exclusive choice, tabs only for corresponding tab panels with the proper keyboard model. A hierarchical four-radio demo must not accidentally become a flat control with two simultaneous selected options.

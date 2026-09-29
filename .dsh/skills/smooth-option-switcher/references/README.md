# Canonical source reconstruction

Source: [教你做一个超丝滑的方案切换组件](https://www.bilibili.com/video/BV1g3t96kEEF/), by 原子软糖At, supplied as a 61.14-second screen recording. The linked short URL is https://b23.tv/VxczpVE. The recording, rather than another implementation or a visual-only guess, is the primary evidence. The closing Pinterest shot is inspiration credited by the creator; it is not an additional implementation source.

The recording was inspected across its full duration using sequential frames, with denser inspection of the brief scrolling source near the start and of switching motion. Timestamps below refer approximately to elapsed recording time, not frame numbers; playback/edit timing can differ slightly from the overlaid player clock. No complete downloadable stylesheet was supplied. This is a runnable reconstruction, not a claim to possess the creator's original files.

## Files and running

Open `example.html` directly in a current browser supporting native CSS nesting, or serve this directory with `python3 -m http.server 8000` and open `/example.html`. There is no dependency installation, JavaScript, network request, framework, or compilation step.

`styles.css` marks source status by section:

- **O:** source code directly read in the recording.
- **D:** literal declarations shown in explanatory diagrams; attaching those declarations to the corresponding named selector reconstructs their context.
- **R:** minimum missing implementation inferred from the observed structure, rules, and demonstrated behavior.
- **A:** additions to make a standalone page runnable.

## Directly observed evidence

| Recording interval | Evidence preserved |
| --- | --- |
| About 2.8–4.4s, scrolling CSS behind the title/demo | Body flex centering, `overflow-x: hidden`, `min-height: 100vh`; wrapper `position: relative`, `width: 395px`, `height: 52px`, `padding: 3px`, `#FAFAFA`, `999px` radius, `1.5px solid #e4e4e4`; three shadow layers with their exact offsets/alphas. |
| Same scrolling shot, combined across frames | `.main-content` absolute positioning, `z-index: 100`, centered `left/top: 50%`, `translate(-50%, -50%)`, flex, full width/height and `999px` radius. Free flex centering, cursor, `#EFEFEF`, `0.1s` easing. Premium wrapper relative positioning, flex, `#acacac`; Premium label `z-index: 200`, full height, flex, `padding-top: 8px`, radius, cursor, `0.3s` easing. Submenu absolute positioning, `z-index: 150`, full width/height, flex centering, `top: 66%`, `left: 50%`. |
| About 5–15s | Main content above normal-flow main slider; equal flex halves; slider `width: 50%; height: 100%`; `translateX(0)` to `translateX(100%)`. |
| About 17–24s | Submenu is absolute below Premium text; Premium uses `padding-top: 8px`. Whole right half selects Premium before secondary interaction. |
| About 24–29s | Submenu HTML, including `.dot` and `.menu-slider`; label flex centering and full height; secondary slider absolute, `48%` width, `80%` height; caption explicitly says movement uses `left`. |
| About 30–34s | Compact submenu `top: 66%; left: 50%; transform: translate(-50%, -50%) scale(0.6)` changes to `left: 0; top: 0; transform: translate(0, 0); gap: 0`. |
| About 35–43s | Radio `checked` state and general-sibling `~` selector explanation. |
| About 43–52s | Full component hierarchy: four radios, names `mode`/`version`, IDs `free`/`premium`/`monthly`/`annual`, initial Free and Monthly checked, `hidden`; wrapper/content/labels and two separate slider divs. HTML nesting and class names retained. |
| About 52–55s | Nested `#premium:checked ~ .btn-wrapper` rule: Free `#acacac`; Premium `z-index: 1; opacity: 0; transform: translateY(10px) scale(0.7)`; submenu expanded offsets/transform, `.monthly,.annual { color: #b8b8b8; }`; main slider translate. Complete Monthly chained selector and `transition: 0.5s cubic-bezier(0.34,0.96,0.6,0.99); color: #000;`. Annual and menu-slider selector heads are shown with elided bodies. |

All observed easing occurrences use `cubic-bezier(0.34,0.96,0.6,0.99)`. The intro's moving title and demo obscure different lines at different times; combining adjacent frames recovers the declarations listed above. Code formatting and comments are normalized, but selectors, names, values and native nesting are retained.

No `:hover` rule, pseudo-element, custom property, CSS calculation, or JavaScript source is visible. Selection follows radio activation, not hover. Do not describe their absence from this recording as proof that the creator's unseen file contained none.

## Reconstructed, not extracted

The creator intentionally uses `...` for some declarations. The following are explicit reconstruction choices:

- Global `border-box`, necessary to keep the full-height padded label/track geometry coherent. Original reset is not visible.
- Submenu gap `8px`; dot width `4px`, overflow clipping, and expanded width/opacity zero. Dot removal is visible in behavior, not in its elided rule body.
- Main slider black fill/radius; secondary slider light fill/radius and hidden/visible opacity. The rendered result supports these, but their declarations are unshown.
- Secondary slider `top: 10%` centers its observed `80%` height. `left: 2%` and Annual `left: 50%` symmetrically inset the observed `48%` width. Exact offsets are unshown. This leaves a small center difference from the equal-half labels (about 2px at the canonical width) in exchange for keeping the white pill within the padded black pill. Using `left` itself is explicitly demonstrated.
- Submenu label relative positioning and `z-index: 1` keep text above its slider. Base cursor and transitions for these labels are completed from surrounding code.
- Main slider, submenu, secondary slider, dot, and unselected billing transitions use `0.5s` with the observed curve. That duration is directly visible only in the selected Monthly text rule; its use elsewhere is inferred.
- Annual selected-text declarations mirror the complete Monthly block. The Annual selector itself is directly visible.

These choices fill missing rules rather than introduce another state or animation model. Changes to these inferred values should be described as reconstruction adjustments, not corrections to the creator's source.

## Standalone additions and limitations

Added doctype, title, UTF-8/viewport metadata, body margin reset, white page background, and `700 16px Arial, sans-serif` typography. The exact font/reset was not recoverable. Styling of the instructional overlays, video pointer, and playback UI is outside the component and excluded.

No production accessibility modifications are mixed into this canonical example. In particular, its observed `hidden` radios cannot receive keyboard focus and its gray text is not a production contrast recommendation. See `production.md` for explicitly separate additions. Fixed sizing and `overflow-x: hidden` are retained for fidelity, not recommended as responsive application defaults.

## State behavior

Initial state is Free + remembered Monthly. Clicking anywhere on the Premium half activates Premium via the full-size label that is above the submenu. Premium then fades and lowers its stacking order, exposing Monthly/Annual. Clicking Annual moves the secondary indicator using `left` and changes selected text color. Clicking Free slides the main indicator back and shrinks the submenu; Annual remains checked. Reopening Premium restores Annual.

This is two independent binary radio groups, not three radios in one group. A flat three-plan selector is a documented adaptation, not what the video demonstrates.

// Diagnose corner-bracket rect mismatches and compare-section layout.
// Usage: node tools/home-check/diag.mjs [url]
import { launchBrowser } from './cdp.mjs'

const [, , url = 'http://localhost:51640/'] = process.argv
const browser = await launchBrowser({ port: 9390, width: 1440, height: 900, profileName: 'diag' })

await browser.goto(url)

/* 1. 每个 frame：自身的 rect 与四个角的实际位置是否吻合 */
const frames = await browser.json(
  `(() => {
     const out = []
     document.querySelectorAll('.magnetic-corner-frame').forEach((f, i) => {
       const r = f.getBoundingClientRect()
       const cs = getComputedStyle(f)
       const corners = Array.from(f.querySelectorAll(':scope > .magnetic-corner-frame__corner'))
       out.push({
         i,
         cls: f.className,
         display: cs.display,
         w: Math.round(r.width),
         h: Math.round(r.height),
         top: Math.round(r.top),
         corners: corners.map((c) => {
           const cr = c.getBoundingClientRect()
           return { w: Math.round(cr.width), h: Math.round(cr.height), vis: getComputedStyle(c).visibility }
         })
       })
     })
     return JSON.stringify(out)
   })()`,
)

console.log(
  'frames:',
  JSON.stringify(
    frames.filter((f) => f.display !== 'block'),
    null,
    2,
  ),
)

/* 2. compare 区布局 */
const compare = await browser.json(
  `(() => {
     const grid = document.querySelector('.compare__grid')
     const cols = Array.from(document.querySelectorAll('.compare__col'))
     const tags = Array.from(document.querySelectorAll('.compare .tags'))
     return JSON.stringify({
       grid: grid ? { display: getComputedStyle(grid).display, cols: getComputedStyle(grid).gridTemplateColumns, gap: getComputedStyle(grid).gap, align: getComputedStyle(grid).alignItems } : null,
       colsInfo: cols.map((c) => ({
         cls: c.className,
         display: getComputedStyle(c).display,
         w: Math.round(c.getBoundingClientRect().width),
         h: Math.round(c.getBoundingClientRect().height),
         childDisplay: c.firstElementChild ? getComputedStyle(c.firstElementChild).display : null
       })),
       tags: tags.map((t) => ({ display: getComputedStyle(t).display, gap: getComputedStyle(t).gap, w: Math.round(t.getBoundingClientRect().width), children: t.children.length }))
     })
   })()`,
)
console.log('compare:', JSON.stringify(compare, null, 2))

/* 3. 光标 HUD 角标尺寸 */
const hud = await browser.json(
  `(() => {
     const b = document.querySelector('.cursor-hud__brackets')
     if (!b) return JSON.stringify({ found: false })
     const r = b.getBoundingClientRect()
     return JSON.stringify({ found: true, w: Math.round(r.width), h: Math.round(r.height), transform: getComputedStyle(b).transform })
   })()`,
)
console.log('cursorHud:', JSON.stringify(hud))

/* 4. demo 区 item 的包裹层与内容宽度 */
const demo = await browser.json(
  `(() => {
     const left = document.querySelector('.demo__left')
     const wraps = Array.from(left ? left.children : [])
     return JSON.stringify(wraps.map((w, i) => {
       const inner = w.querySelector('.demo__item')
       return {
         i,
         wrapCls: w.className,
         wrapW: Math.round(w.getBoundingClientRect().width),
         wrapH: Math.round(w.getBoundingClientRect().height),
         innerW: inner ? Math.round(inner.getBoundingClientRect().width) : null,
         innerH: inner ? Math.round(inner.getBoundingClientRect().height) : null
       }
     }))
   })()`,
)
console.log('demo:', JSON.stringify(demo, null, 2))

await browser.close()
process.exit(0)

// Verify corner brackets: arm adapts to element size, nested frames single-select,
// cursor HUD aligns to target rect, compare layout intact, and site-wide coverage.
// Usage: node tools/home-check/frames.mjs [url]
import { launchBrowser } from './cdp.mjs'

const [, , url = 'http://localhost:51640/'] = process.argv
const browser = await launchBrowser({ port: 9400, width: 1440, height: 900, profileName: 'frames' })

await browser.goto(url)
await new Promise((r) => setTimeout(r, 1500))

const report = {}

/* ---------- 1. 角标形状：必须是正方形且等于该框的 arm ─---------- */
report.cornerShape = await browser.json(
  `(() => {
     const bad = []
     const ok = []
     document.querySelectorAll('.magnetic-corner-frame').forEach((f, i) => {
       const fr = f.getBoundingClientRect()
       const corners = Array.from(f.querySelectorAll(':scope > .magnetic-corner-frame__corner'))
       const entry = {
         i,
         cls: String(f.className).slice(0, 40),
         w: Math.round(fr.width),
         h: Math.round(fr.height),
         corner: corners.map((c) => {
           const r = c.getBoundingClientRect()
           return { w: Math.round(r.width), h: Math.round(r.height) }
         })[0] ?? null
       }
       const c0 = entry.corner
       if (!c0 || c0.w !== c0.h || c0.w === 0) bad.push(entry)
       else ok.push(entry)
     })
     return JSON.stringify({ total: ok.length + bad.length, bad, sample: ok.slice(0, 8) })
   })()`,
)

/* ---------- 2. 自适应：arm 随元素尺寸变化 ─---------- */
report.adaptive = await browser.json(
  `(() => {
     const rows = []
     document.querySelectorAll('.magnetic-corner-frame').forEach((f) => {
       const r = f.getBoundingClientRect()
       const c = f.querySelector(':scope > .magnetic-corner-frame__corner')
       if (!c) return
       const arm = getComputedStyle(c).width
       rows.push({ w: Math.round(r.width), h: Math.round(r.height), arm, short: Math.round(Math.min(r.width, r.height)) })
     })
     return JSON.stringify(rows.slice(0, 12))
   })()`,
)

/* ---------- 3. compare 布局回归 ---------- */
report.compare = await browser.json(
  `(() => {
     const grid = document.querySelector('.compare__grid')
     const cols = Array.from(document.querySelectorAll('.compare__col'))
     const tags = Array.from(document.querySelectorAll('.compare .tags'))
     return JSON.stringify({
       gridCols: grid ? getComputedStyle(grid).gridTemplateColumns : null,
       colDisplay: cols.map((c) => getComputedStyle(c).display),
       tagWidths: tags.map((t) => Math.round(t.getBoundingClientRect().width)),
       colWidths: cols.map((c) => Math.round(c.getBoundingClientRect().width))
     })
   })()`,
)

/* ---------- 4. 嵌套单选：hover team-row__gh 时只有它亮 ─---------- */
const ghBox = await browser.json(
  `(() => {
     const el = document.querySelector('.team-row__gh')
     if (!el) return JSON.stringify({ found: false })
     el.scrollIntoView({ block: 'center', behavior: 'instant' })
     return JSON.stringify({ found: true })
   })()`,
)
if (ghBox.found) {
  await new Promise((r) => setTimeout(r, 700))
  const box = await browser.json(
    `(() => { const el = document.querySelector('.team-row__gh'); const r = el.getBoundingClientRect(); return JSON.stringify({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }) })()`,
  )
  await browser.send(
    'Input.dispatchMouseEvent',
    { type: 'mouseMoved', x: box.x, y: box.y, buttons: 0, pointerType: 'mouse' },
    browser.sessionId,
  )
  await new Promise((r) => setTimeout(r, 900))
  report.nested = await browser.json(
    `(() => {
       const visible = []
       document.querySelectorAll('.magnetic-corner-frame').forEach((f) => {
         const c = f.querySelector(':scope > .magnetic-corner-frame__corner')
         if (!c) return
         const cs = getComputedStyle(c)
         if (cs.visibility !== 'hidden' && Number(cs.opacity) > 0.5) {
           visible.push(String(f.className).slice(0, 40))
         }
       })
       return JSON.stringify({ visibleCount: visible.length, visible })
     })()`,
  )
}

/* ---------- 5. 光标 HUD 对齐目标 ─---------- */
report.cursor = await browser.json(
  `(() => {
     const layer = document.querySelector('.cursor-layer')
     const brackets = document.querySelector('.cursor-layer__brackets')
     const corner = document.querySelector('.cursor-layer__corner')
     return JSON.stringify({
       layer: !!layer,
       bracketsRect: brackets ? { w: Math.round(brackets.getBoundingClientRect().width), h: Math.round(brackets.getBoundingClientRect().height) } : null,
       cornerSize: corner ? Math.round(corner.getBoundingClientRect().width) : null
     })
   })()`,
)

/* ---------- 6. 全站覆盖 ---------- */
report.coverage = {}
for (const path of ['/', '/News', '/Support', '/SimpleRules', '/login']) {
  await browser.goto(new URL(path, url).toString())
  await new Promise((r) => setTimeout(r, 1200))
  const count = await browser.evaluate(`document.querySelectorAll('[data-mcf]').length`)
  report.coverage[path] = { frames: count, errors: [...browser.pageErrors].slice(-2) }
}

console.log(JSON.stringify(report, null, 2))
await browser.close()
process.exit(0)

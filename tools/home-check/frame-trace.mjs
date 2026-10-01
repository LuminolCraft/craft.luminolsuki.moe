// Trace enter/leave events and corner positions while the pointer travels inside an element.
// Usage: node tools/home-check/frame-trace.mjs [url] [selector]
import { launchBrowser } from './cdp.mjs'

const [, , url = 'http://localhost:51642/', selector = '.tag'] = process.argv
const browser = await launchBrowser({
  port: 9533,
  width: 1440,
  height: 900,
  profileName: 'frame-trace',
})

await browser.goto(url)
await new Promise((r) => setTimeout(r, 1800))

await browser.evaluate(
  `(() => {
     const el = document.querySelector(${JSON.stringify(selector)})
     if (!el) return 'no'
     el.scrollIntoView({ block: 'center', behavior: 'instant' })
     window.__evt = []
     ;['mouseenter','mouseleave','mouseover','mouseout'].forEach((t) =>
       el.addEventListener(t, () => window.__evt.push(t)))
     return 'ok'
   })()`,
)
await new Promise((r) => setTimeout(r, 700))

const box = JSON.parse(
  await browser.evaluate(
    `(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return JSON.stringify({ l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }) })()`,
  ),
)

const points = [
  ['left', box.l + 3, box.t + Math.round(box.h / 2)],
  ['topLeft', box.l + 3, box.t + 3],
  ['center', box.l + Math.round(box.w / 2), box.t + Math.round(box.h / 2)],
  ['bottomRight', box.l + box.w - 4, box.t + box.h - 4],
  ['right', box.l + box.w - 3, box.t + Math.round(box.h / 2)],
]

const out = []
for (const [name, x, y] of points) {
  const before = await browser.evaluate(`window.__evt = []; 'reset'`)
  void before
  await browser.send(
    'Input.dispatchMouseEvent',
    { type: 'mouseMoved', x, y, buttons: 0, pointerType: 'mouse' },
    browser.sessionId,
  )
  await new Promise((r) => setTimeout(r, 1200))
  const state = await browser.evaluate(
    `(() => {
       const el = document.querySelector(${JSON.stringify(selector)})
       const hit = document.elementFromPoint(${x}, ${y})
       const corners = Array.from(el.querySelectorAll(':scope > .magnetic-corner-frame__corner')).map((c) => {
         const r = c.getBoundingClientRect()
         return [Math.round(r.left), Math.round(r.top)]
       })
       return JSON.stringify({
         evt: window.__evt.slice(),
         hit: hit ? String(hit.className || hit.tagName).slice(0, 40) : null,
         inTag: hit ? el.contains(hit) : null,
         corners,
       })
     })()`,
  )
  out.push({ name, x, y, ...JSON.parse(state) })
}

console.log(JSON.stringify({ selector, box, out }, null, 2))
await browser.close()
process.exit(0)

// Inspect why one specific element does not light its corners on hover.
// Usage: node tools/home-check/one-probe.mjs [url] [selector]
import { launchBrowser } from './cdp.mjs'

const [, , url = 'http://localhost:51640/', selector = '.team-row__gh'] = process.argv
const browser = await launchBrowser({
  port: 9444,
  width: 1440,
  height: 900,
  profileName: 'one-probe',
})

await browser.goto(url)
await new Promise((r) => setTimeout(r, 1600))

await browser.evaluate(
  `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' }); return 'ok' })()`,
)
await new Promise((r) => setTimeout(r, 800))

const info = await browser.json(
  `(() => {
     const el = document.querySelector(${JSON.stringify(selector)})
     if (!el) return JSON.stringify({ present: false })
     const r = el.getBoundingClientRect()
     const cs = getComputedStyle(el)
     return JSON.stringify({
       present: true,
       rect: { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) },
       display: cs.display,
       visibility: cs.visibility,
       mcf: el.hasAttribute('data-mcf'),
       corners: el.querySelectorAll(':scope > .magnetic-corner-frame__corner').length,
       innerFrames: el.querySelectorAll('[data-mcf]').length,
       maxArm: el.dataset.mcfMaxArm ?? null,
       gap: el.dataset.mcfGap ?? null,
       elAtPoint: (() => {
         const hit = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2))
         return hit ? String(hit.className || hit.tagName).slice(0, 60) : null
       })()
     })
   })()`,
)

// 记录 mouseenter 是否真的到达了元素
await browser.evaluate(
  `(() => {
     const el = document.querySelector(${JSON.stringify(selector)})
     if (!el) return 'no'
     window.__enterLog = []
     el.addEventListener('mouseenter', () => { window.__enterLog.push(Date.now()) })
     el.addEventListener('mouseover', () => { window.__enterLog.push('over:' + Date.now()) })
     return 'armed'
   })()`,
)

await browser.send(
  'Input.dispatchMouseEvent',
  { type: 'mouseMoved', x: info.rect.x - 60, y: info.rect.y, buttons: 0, pointerType: 'mouse' },
  browser.sessionId,
)
await new Promise((r) => setTimeout(r, 120))
await browser.send(
  'Input.dispatchMouseEvent',
  { type: 'mouseMoved', x: info.rect.x, y: info.rect.y, buttons: 0, pointerType: 'mouse' },
  browser.sessionId,
)
await new Promise((r) => setTimeout(r, 1000))

const after = await browser.json(
  `(() => {
     const el = document.querySelector(${JSON.stringify(selector)})
     const corners = Array.from(el ? el.querySelectorAll(':scope > .magnetic-corner-frame__corner') : [])
     const visibility = corners.map((c) => {
       const cs = getComputedStyle(c)
       return { op: cs.opacity, vis: cs.visibility, w: Math.round(c.getBoundingClientRect().width) }
     })
     const managerInfo = window.__uiFx ?? null
     const enterLog = window.__enterLog ?? []
     return JSON.stringify({ cornerStates: visibility, managerInfo, enterLog })
   })()`,
)

console.log(JSON.stringify({ selector, info, after }, null, 2))
await browser.close()
process.exit(0)

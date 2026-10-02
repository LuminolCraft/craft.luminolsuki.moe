// Verify Magnetic Corner Brackets: corners fade in on hover, edge-proximity increases
// magnet offset, they reset on leave, and no tweens accumulate.
// Usage: node tools/home-check/corners.mjs [url]
import { launchBrowser } from './cdp.mjs'

const [, , url = 'http://localhost:51640/'] = process.argv
const browser = await launchBrowser({
  port: 9360,
  width: 1440,
  height: 900,
  profileName: 'corners',
})

await browser.goto(url)

const SELECTOR = '.magnetic-corner-frame'

const probe = (label) =>
  browser.json(
    `(() => {
       const root = document.querySelector('${SELECTOR}')
       if (!root) return JSON.stringify({ label: '${label}', found: false })
       const corners = Array.from(root.querySelectorAll(':scope > .magnetic-corner-frame__corner'))
       return JSON.stringify({
         label: '${label}',
         found: true,
         count: corners.length,
         corners: corners.map((c) => {
           const cs = getComputedStyle(c)
           return {
             cls: c.className,
             opacity: Number(cs.opacity).toFixed(2),
             visibility: cs.visibility,
             transform: cs.transform,
             active: cs.getPropertyValue('--corner-active').trim()
           }
         }),
         tweenCount: window.gsap ? window.gsap.globalTimeline.getChildren().length : 'n/a'
       })
     })()`,
  )

const rect = await browser.json(
  `(() => {
     const root = document.querySelector('${SELECTOR}')
     if (!root) return JSON.stringify({ found: false })
     const r = root.getBoundingClientRect()
     return JSON.stringify({ found: true, left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) })
   })()`,
)

const report = { rect }
if (!rect.found) {
  console.log(JSON.stringify({ ...report, error: 'selector not found' }, null, 2))
  await browser.close()
  process.exit(0)
}

const center = {
  x: rect.left + Math.round(rect.width / 2),
  y: rect.top + Math.round(rect.height / 2),
}
const nearTopLeft = { x: rect.left + 6, y: rect.top + 6 }

report.beforeHover = await probe('before-hover')

await browser.send(
  'Input.dispatchMouseEvent',
  { type: 'mouseMoved', x: center.x, y: center.y, buttons: 0 },
  browser.sessionId,
)
await new Promise((r) => setTimeout(r, 250))
await browser.send(
  'Input.dispatchMouseEvent',
  { type: 'mouseMoved', x: center.x + 1, y: center.y + 1, buttons: 0 },
  browser.sessionId,
)
await new Promise((r) => setTimeout(r, 900))
report.hoverCenter = await probe('hover-center')

await browser.send(
  'Input.dispatchMouseEvent',
  { type: 'mouseMoved', x: nearTopLeft.x, y: nearTopLeft.y, buttons: 0 },
  browser.sessionId,
)
await new Promise((r) => setTimeout(r, 900))
report.hoverTopLeft = await probe('hover-top-left')

// 离开：移到视口外，并补发一次 mouseleave（CDP 的 Input 域没有 mouseleave 类型）
await browser.send(
  'Input.dispatchMouseEvent',
  { type: 'mouseMoved', x: 5, y: 890, buttons: 0 },
  browser.sessionId,
)
await browser.evaluate(
  `(() => { const el = document.querySelector('${SELECTOR}'); if (!el) return 'no-el'; el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false })); return 'left'; })()`,
)
await new Promise((r) => setTimeout(r, 1200))
report.afterLeave = await probe('after-leave')

const parseXY = (t) => {
  const m = /matrix\(([^)]+)\)/.exec(t || '')
  if (!m) return { x: 0, y: 0 }
  const parts = m[1].split(',').map((v) => Number(v.trim()))
  return { x: Math.round(parts[4] ?? 0), y: Math.round(parts[5] ?? 0) }
}

report.summary = {
  cornersRendered: report.beforeHover.count,
  hiddenBeforeHover: report.beforeHover.corners.every((c) => Number(c.opacity) === 0),
  visibleOnHover: report.hoverCenter.corners.every((c) => Number(c.opacity) > 0.9),
  topLeftMagnetAtCorner: parseXY(report.hoverTopLeft.corners[0]?.transform),
  topLeftMagnetAtCenter: parseXY(report.hoverCenter.corners[0]?.transform),
  edgeBiasWorks: null,
  resetAfterLeave: report.afterLeave.corners.every((c) => Number(c.opacity) < 0.05),
  tweenCountBefore: report.beforeHover.tweenCount,
  tweenCountAfter: report.afterLeave.tweenCount,
}

const centerXY = report.summary.topLeftMagnetAtCenter
const cornerXY = report.summary.topLeftMagnetAtCorner
report.summary.edgeBiasWorks =
  Math.abs(cornerXY.x) + Math.abs(cornerXY.y) > Math.abs(centerXY.x) + Math.abs(centerXY.y)

console.log(JSON.stringify(report, null, 2))
await browser.close()
process.exit(0)

// Pointer interaction check: magnet offset, grid spotlight vars, card tilt, rail progress.
// Usage: node tools/home-check/pointer.mjs [url]
import { launchBrowser } from './cdp.mjs'

const [, , url = 'http://localhost:51640/'] = process.argv
const browser = await launchBrowser({
  port: 9340,
  width: 1440,
  height: 900,
  profileName: 'pointer',
})

await browser.goto(url)

const report = {}

const btn = await browser.json(
  `(() => { const b = document.querySelector('.hero-actions .btn-primary'); const r = b.getBoundingClientRect(); return JSON.stringify({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }); })()`,
)
await browser.send(
  'Input.dispatchMouseEvent',
  { type: 'mouseMoved', x: btn.x + 44, y: btn.y + 22, buttons: 0 },
  browser.sessionId,
)
await new Promise((r) => setTimeout(r, 700))
report.magnetTransform = await browser.evaluate(
  `(() => { const inner = document.querySelector('.magnetic__inner'); return inner ? getComputedStyle(inner).transform : null; })()`,
)

await browser.evaluate(
  `document.querySelector('.features-grid').scrollIntoView({ block: 'center' }); 'ok'`,
)
await new Promise((r) => setTimeout(r, 800))
const grid = await browser.json(
  `(() => { const g = document.querySelector('.features-grid'); const r = g.getBoundingClientRect(); return JSON.stringify({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }); })()`,
)
await browser.send(
  'Input.dispatchMouseEvent',
  { type: 'mouseMoved', x: grid.x, y: grid.y, buttons: 0 },
  browser.sessionId,
)
await new Promise((r) => setTimeout(r, 900))
report.gridGlow = await browser.json(
  `(() => {
     const g = document.querySelector('.features-grid')
     const cs = getComputedStyle(g)
     return JSON.stringify({
       x: cs.getPropertyValue('--glow-x').trim(),
       y: cs.getPropertyValue('--glow-y').trim(),
       intensity: cs.getPropertyValue('--glow-intensity').trim(),
       cardIntensity: Array.from(document.querySelectorAll('.glow-card')).map(c => getComputedStyle(c).getPropertyValue('--glow-intensity').trim())
     })
   })()`,
)
report.cardTilt = await browser.evaluate(
  `(() => { const c = document.querySelector('.glow-card'); return c ? getComputedStyle(c).transform : null; })()`,
)

for (const y of [2400, 2700, 3000]) await browser.scrollTo(y, 500)
await new Promise((r) => setTimeout(r, 900))
report.rail = await browser.json(
  `(() => {
     const t = document.querySelector('.servers-track')
     const bar = document.querySelector('.servers-progress__bar')
     return JSON.stringify({
       trackLeft: t ? Math.round(t.getBoundingClientRect().left) : null,
       progressBar: bar ? bar.style.transform : null
     })
   })()`,
)

console.log(JSON.stringify(report, null, 2))
await browser.close()
process.exit(0)

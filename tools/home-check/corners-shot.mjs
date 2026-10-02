// Hover a MagneticCornerFrame and screenshot it, for visual confirmation.
// Usage: node tools/home-check/corners-shot.mjs [url] [outFile]
import { launchBrowser } from './cdp.mjs'

const [, , url = 'http://localhost:51640/', outFile = '.tmp-build/shots/corners.png'] = process.argv
const browser = await launchBrowser({
  port: 9361,
  width: 1440,
  height: 900,
  profileName: 'corners-shot',
})

await browser.goto(url)

const info = await browser.json(
  `(() => {
     const els = Array.from(document.querySelectorAll('.magnetic-corner-frame'))
     return JSON.stringify(els.map((el, i) => {
       const r = el.getBoundingClientRect()
       return { i, cls: el.className, top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) }
     }))
   })()`,
)

console.log('frames:', JSON.stringify(info))

const target = Array.isArray(info) ? info.find((f) => f.height > 100 && f.top > 0) : null
if (!target) {
  console.log('no visible frame to hover')
  await browser.close()
  process.exit(0)
}

// 移到该元素内部但靠近左上角，让磁吸与激活色都体现出来
const x = target.left + Math.round(target.width * 0.18)
const y = target.top + Math.round(target.height * 0.22)
await browser.send(
  'Input.dispatchMouseEvent',
  { type: 'mouseMoved', x, y, buttons: 0 },
  browser.sessionId,
)
await new Promise((r) => setTimeout(r, 200))
await browser.send(
  'Input.dispatchMouseEvent',
  { type: 'mouseMoved', x: x + 3, y: y + 2, buttons: 0 },
  browser.sessionId,
)
await new Promise((r) => setTimeout(r, 1000))

const file = await browser.screenshot(outFile)
console.log(JSON.stringify({ file, hoveredAt: { x, y }, target }, null, 2))

await browser.close()
process.exit(0)

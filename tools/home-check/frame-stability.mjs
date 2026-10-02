// Assert the corner frame does NOT move while the cursor travels inside the element.
// Sample the four corner rects at several pointer positions across the element and diff them.
// Usage: node tools/home-check/frame-stability.mjs [url] [selector]
import { launchBrowser } from './cdp.mjs'

const [, , url = 'http://localhost:51642/', selector = '.tag'] = process.argv
const browser = await launchBrowser({
  port: 9522,
  width: 1440,
  height: 900,
  profileName: 'frame-stability',
})

await browser.goto(url)
await new Promise((r) => setTimeout(r, 1800))

await browser.evaluate(
  `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' }); return 'ok' })()`,
)
await new Promise((r) => setTimeout(r, 700))

const boxRaw = await browser.evaluate(
  `(() => { const el = document.querySelector(${JSON.stringify(selector)}); const r = el.getBoundingClientRect(); return JSON.stringify({ l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }) })()`,
)
const box = JSON.parse(boxRaw)

const SAMPLE = `(() => {
  const el = document.querySelector(${JSON.stringify(selector)})
  const rows = Array.from(el.querySelectorAll(':scope > .magnetic-corner-frame__corner')).map((c) => {
    const r = c.getBoundingClientRect()
    return [Math.round(r.left), Math.round(r.top)]
  })
  return JSON.stringify(rows)
})()`

// 元素内五个采样点。留 10px 内缩：角标本身在元素外侧，太贴边容易蹭到相邻元素，
// 那时指针已离开本元素、命中别的元素，测出的位移是正常的「离开收角」而非跟随漂移。
const inset = 10
const points = [
  { name: 'left', x: box.l + inset, y: box.t + Math.round(box.h / 2) },
  { name: 'topLeft', x: box.l + inset, y: box.t + inset },
  { name: 'center', x: box.l + Math.round(box.w / 2), y: box.t + Math.round(box.h / 2) },
  { name: 'bottomRight', x: box.l + box.w - inset, y: box.t + box.h - inset },
  { name: 'right', x: box.l + box.w - inset, y: box.t + Math.round(box.h / 2) },
]

// 预热：先进入元素并等入场补间彻底结束，避免把「正在展开」的第一帧当成静止基准
await browser.send(
  'Input.dispatchMouseEvent',
  {
    type: 'mouseMoved',
    x: box.l + Math.round(box.w / 2),
    y: box.t + Math.round(box.h / 2),
    buttons: 0,
    pointerType: 'mouse',
  },
  browser.sessionId,
)
await new Promise((r) => setTimeout(r, 1600))

const samples = []
for (const point of points) {
  await browser.send(
    'Input.dispatchMouseEvent',
    { type: 'mouseMoved', x: point.x, y: point.y, buttons: 0, pointerType: 'mouse' },
    browser.sessionId,
  )
  await new Promise((r) => setTimeout(r, 1400))
  const hit = await browser.evaluate(
    `(() => { const el = document.querySelector(${JSON.stringify(selector)}); const h = document.elementFromPoint(${point.x}, ${point.y}); return JSON.stringify({ inside: !!(h && el.contains(h)), hit: h ? String(h.className || h.tagName).slice(0, 30) : null }) })()`,
  )
  samples.push({
    name: point.name,
    ...JSON.parse(hit),
    corners: JSON.parse(await browser.evaluate(SAMPLE)),
  })
}

const inside = samples.filter((s) => s.inside)
const first = inside[0]?.corners ?? []
const drift = inside.slice(1).map((s) => ({
  name: s.name,
  delta: s.corners.map((c, i) => [
    (c[0] ?? 0) - (first[i]?.[0] ?? 0),
    (c[1] ?? 0) - (first[i]?.[1] ?? 0),
  ]),
}))

const maxDrift = Math.max(
  0,
  ...drift.flatMap((d) => d.delta.flatMap((pair) => [Math.abs(pair[0]), Math.abs(pair[1])])),
)

console.log(
  JSON.stringify(
    {
      selector,
      box,
      cornerCount: first.length,
      samplesInside: inside.map((s) => s.name),
      samplesOutside: samples.filter((s) => !s.inside).map((s) => s.name),
      firstSample: first,
      drift,
      maxDriftPx: maxDrift,
      stable: maxDrift === 0,
    },
    null,
    2,
  ),
)
await browser.close()
process.exit(0)

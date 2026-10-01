// Verify the rail (drag + auto loop scroll) and the custom cursor HUD.
// Usage: node tools/home-check/rail-cursor.mjs [url]
import { launchBrowser } from './cdp.mjs'

const [, , url = 'http://localhost:51640/'] = process.argv
const browser = await launchBrowser({
  port: 9380,
  width: 1440,
  height: 900,
  profileName: 'rail-cursor',
})

await browser.goto(url)
await new Promise((r) => setTimeout(r, 1200))

const report = {}

/* ---------- 1. 自定义光标 ---------- */
report.cursor = await browser.json(
  `(() => {
     const hud = document.querySelector('.cursor-hud')
     const dot = document.querySelector('.cursor-hud__dot')
     const ring = document.querySelector('.cursor-hud__ring')
     const brackets = document.querySelector('.cursor-hud__brackets')
     const root = document.querySelector('.page')
     return JSON.stringify({
       hudRendered: !!hud,
       dot: !!dot,
       ring: !!ring,
       corners: document.querySelectorAll('.cursor-hud__corner').length,
       pageCursorNone: root ? root.classList.contains('cursor-none') : null,
       hudPointerEvents: hud ? getComputedStyle(hud).pointerEvents : null
     })
   })()`,
)

// 移动指针，检查中心点是否跟手、角标在可交互元素上是否展开
await browser.send(
  'Input.dispatchMouseEvent',
  { type: 'mouseMoved', x: 700, y: 400, buttons: 0 },
  browser.sessionId,
)
await new Promise((r) => setTimeout(r, 220))
const afterMove = await browser.json(
  `(() => {
     const dot = document.querySelector('.cursor-hud__dot')
     const ring = document.querySelector('.cursor-hud__ring')
     const brackets = document.querySelector('.cursor-hud__brackets')
     const cs = (el) => (el ? getComputedStyle(el) : null)
     return JSON.stringify({
       dotTransform: cs(dot)?.transform,
       dotVisibility: cs(dot)?.visibility,
       dotOpacity: cs(dot)?.opacity,
       ringOpacity: cs(ring)?.opacity,
       bracketsOpacity: cs(brackets)?.opacity
     })
   })()`,
)
report.cursorAfterMove = afterMove

// 悬停到主 CTA 按钮附近，角标应展开
const btn = await browser.json(
  `(() => { const b = document.querySelector('.hero__actions .btn--primary'); if (!b) return JSON.stringify({ found: false }); const r = b.getBoundingClientRect(); return JSON.stringify({ found: true, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }) })()`,
)
if (btn.found) {
  await browser.send(
    'Input.dispatchMouseEvent',
    { type: 'mouseMoved', x: btn.x, y: btn.y, buttons: 0 },
    browser.sessionId,
  )
  await new Promise((r) => setTimeout(r, 420))
  report.cursorOnButton = await browser.json(
    `(() => {
       const brackets = document.querySelector('.cursor-hud__brackets')
       const ring = document.querySelector('.cursor-hud__ring')
       const cs = (el) => (el ? getComputedStyle(el) : null)
       return JSON.stringify({ bracketsOpacity: cs(brackets)?.opacity, bracketsTransform: cs(brackets)?.transform, ringScale: cs(ring)?.transform })
     })()`,
  )
}

/* ---------- 2. 截图带 ---------- */
report.rail = await browser.json(
  `(() => {
     const rail = document.querySelector('.gallery__rail')
     if (!rail) return JSON.stringify({ found: false })
     return JSON.stringify({
       found: true,
       items: rail.querySelectorAll('.gallery__item').length,
       scrollWidth: Math.round(rail.scrollWidth),
       clientWidth: Math.round(rail.clientWidth),
       snapType: getComputedStyle(rail).scrollSnapType,
       cursor: getComputedStyle(rail).cursor,
       dataDrag: rail.hasAttribute('data-drag')
     })
   })()`,
)

// 等 1.2s 看自动滚动是否推进
const before = await browser.evaluate(
  `(() => { const r = document.querySelector('.gallery__rail'); return r ? r.scrollLeft : -1 })()`,
)
await new Promise((r) => setTimeout(r, 1400))
const after = await browser.evaluate(
  `(() => { const r = document.querySelector('.gallery__rail'); return r ? r.scrollLeft : -1 })()`,
)
report.autoScroll = {
  before,
  after,
  advanced: typeof before === 'number' && typeof after === 'number' && after > before,
}
report.progressAfterScroll = await browser.evaluate(
  `(() => { const bar = document.querySelector('.progress__bar'); return bar ? getComputedStyle(bar).transform : null })()`,
)

/* ---------- 2b. 拖拽拖动 ---------- */
// 先把 rail 滚进视口并等它稳定，否则坐标拿到的位置在视口外，mousedown 命中不到元素
await browser.evaluate(
  `(() => { const rail = document.querySelector('.gallery__rail'); if (rail) rail.scrollIntoView({ block: 'center', behavior: 'instant' }); return 'ok' })()`,
)
await new Promise((r) => setTimeout(r, 600))

const railBox = await browser.json(
  `(() => {
     const rail = document.querySelector('.gallery__rail')
     if (!rail) return JSON.stringify({ found: false })
     const r = rail.getBoundingClientRect()
     return JSON.stringify({ found: true, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), top: Math.round(r.top), height: Math.round(r.height) })
   })()`,
)
if (railBox.found) {
  const beforeDrag = await browser.evaluate(`document.querySelector('.gallery__rail').scrollLeft`)
  report.dragHitTarget = await browser.evaluate(
    `(() => { const el = document.elementFromPoint(${railBox.x}, ${railBox.y}); return el ? (el.className || el.tagName) : 'none' })()`,
  )
  await browser.send(
    'Input.dispatchMouseEvent',
    { type: 'mouseMoved', x: railBox.x, y: railBox.y, buttons: 0, pointerType: 'mouse' },
    browser.sessionId,
  )
  await new Promise((r) => setTimeout(r, 150))
  await browser.send(
    'Input.dispatchMouseEvent',
    {
      type: 'mousePressed',
      x: railBox.x,
      y: railBox.y,
      button: 'left',
      buttons: 1,
      clickCount: 1,
      pointerType: 'mouse',
    },
    browser.sessionId,
  )
  await browser.send(
    'Input.dispatchMouseEvent',
    {
      type: 'mouseMoved',
      x: railBox.x - 120,
      y: railBox.y,
      button: 'left',
      buttons: 1,
      pointerType: 'mouse',
    },
    browser.sessionId,
  )
  await new Promise((r) => setTimeout(r, 120))
  await browser.send(
    'Input.dispatchMouseEvent',
    {
      type: 'mouseMoved',
      x: railBox.x - 260,
      y: railBox.y,
      button: 'left',
      buttons: 1,
      pointerType: 'mouse',
    },
    browser.sessionId,
  )
  await new Promise((r) => setTimeout(r, 120))
  const duringDrag = await browser.evaluate(
    `(() => { const r = document.querySelector('.gallery__rail'); return { left: r.scrollLeft, dragging: r.classList.contains('is-dragging') } })()`,
  )
  await browser.send(
    'Input.dispatchMouseEvent',
    {
      type: 'mouseReleased',
      x: railBox.x - 260,
      y: railBox.y,
      button: 'left',
      buttons: 0,
      clickCount: 1,
    },
    browser.sessionId,
  )
  await new Promise((r) => setTimeout(r, 300))
  const afterDrag = await browser.evaluate(`document.querySelector('.gallery__rail').scrollLeft`)
  report.drag = {
    beforeDrag: Math.round(beforeDrag),
    duringDrag: Math.round(duringDrag.left),
    draggingClassApplied: duringDrag.dragging,
    afterDrag: Math.round(afterDrag),
    moved: Math.abs(duringDrag.left - beforeDrag) > 40,
  }
}

/* ---------- 3. 角标框数量 ---------- */
report.frames = await browser.evaluate(`document.querySelectorAll('.magnetic-corner-frame').length`)
report.cornerElements = await browser.evaluate(
  `document.querySelectorAll('.magnetic-corner-frame__corner').length`,
)

/* ---------- 4. 环境与诊断 ---------- */
report.env = await browser.json(
  `JSON.stringify({
     reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
     pointerFine: window.matchMedia('(pointer: fine)').matches,
     rafRunning: typeof requestAnimationFrame === 'function'
   })`,
)

// 再等一段时间，确认自动滚动确实在跑（同时禁止任何用户操作干扰）
await browser.evaluate(
  `(() => { const r = document.querySelector('.gallery__rail'); if (r) r.scrollLeft = 0; return 'ok' })()`,
)
await new Promise((r) => setTimeout(r, 2500))
report.autoScrollLong = await browser.evaluate(
  `(() => { const r = document.querySelector('.gallery__rail'); return r ? Math.round(r.scrollLeft) : -1 })()`,
)

console.log(JSON.stringify(report, null, 2))
await browser.close()
process.exit(0)

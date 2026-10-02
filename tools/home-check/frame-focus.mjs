// Reproduce the "frame never clears" bug: focus lands on a frameable element while the pointer
// has already left, so `focusActive` blocks leave(). Mirrors clicking a RouterLink in the sidebar.
// Usage: node tools/home-check/frame-focus.mjs [url] [selector]
import { launchBrowser } from './cdp.mjs'

const [, , url = 'http://localhost:51641/', selector = '.btn'] = process.argv
const browser = await launchBrowser({ port: 9732, width: 1440, height: 900, profileName: 'frame-focus' })

await browser.goto(url)
await new Promise((r) => setTimeout(r, 1800))

const boxRaw = await browser.evaluate(
  `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return 'null'; const r = el.getBoundingClientRect(); return JSON.stringify({ l: Math.round(r.left + r.width / 2), t: Math.round(r.top + r.height / 2) }) })()`,
)
if (boxRaw === 'null') {
  console.log(JSON.stringify({ selector, found: false }))
  await browser.close()
  process.exit(0)
}
const box = JSON.parse(boxRaw)

const lit = async () => {
  const raw = await browser.evaluate(
    `(() => {
       const out = []
       document.querySelectorAll('[data-mcf]').forEach((f) => {
         const c = f.querySelector(':scope > .magnetic-corner-frame__corner')
         if (!c) return
         const cs = getComputedStyle(c)
         if (cs.visibility !== 'hidden' && Number(cs.opacity) > 0.5) out.push(String(f.className).slice(0, 40))
       })
       return JSON.stringify(out)
     })()`,
  )
  return raw ? JSON.parse(raw) : []
}

const move = async (x, y) => {
  await browser.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0, pointerType: 'mouse' }, browser.sessionId)
  await new Promise((r) => setTimeout(r, 900))
}

await move(box.l, box.t)
const afterHover = await lit()

// 模拟真实点击：先 pointerdown（我们的监听会标记「这是鼠标交互」），再由浏览器把焦点给元素
const focusInfo = await browser.evaluate(
  `(() => {
     const el = document.querySelector(${JSON.stringify(selector)})
     el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
     el.focus()
     return JSON.stringify({ active: document.activeElement === el, focusVisible: el.matches(':focus-visible') })
   })()`,
)
await new Promise((r) => setTimeout(r, 600))

await move(5, 5)
const afterLeave = await lit()

console.log(
  JSON.stringify(
    {
      selector,
      afterHover,
      focus: JSON.parse(focusInfo),
      afterLeave,
      bugReproduced: afterLeave.length > 0,
    },
    null,
    2,
  ),
)
await browser.close()
process.exit(0)

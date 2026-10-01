// Measure the four corner gaps around an element and report whether it is visually centred.
// 间距定义（与实现同源，避免测量方法自身制造不对称）：
//   角以元素 padding box 为定位基准，L 画在角 border box 的外侧两条边上。
//   为了让「画出来的 L」对称离开元素外缘，实现里上/左额外让出边框宽：
//     translate.tl = -(gap + border.left)
//   因此实测应当：
//     上/左间距 = gap + 边框宽 + 角线宽
//     下/右间距 = gap + 边框宽
//   四者两两相等即为居中。
// Usage: node tools/home-check/gap-audit.mjs [url] [selector]
import { launchBrowser } from './cdp.mjs'

const [, , url = 'http://localhost:51642/', selector = '.tag'] = process.argv
const browser = await launchBrowser({
  port: 9488,
  width: 1440,
  height: 900,
  profileName: 'gap-audit',
})

await browser.goto(url)
await new Promise((r) => setTimeout(r, 1800))

// 静止态下四个角是叠在一起的，必须先触发一次进入才量得到真实间距。
// 合成事件比 CDP 指针可靠（headless 下 pointer 事件偶尔不派发）。
await browser.evaluate(
  `(() => {
     const el = document.querySelector(${JSON.stringify(selector)})
     if (!el) return 'no'
     el.scrollIntoView({ block: 'center', behavior: 'instant' })
     el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
     el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
     return 'entered'
   })()`,
)
await new Promise((r) => setTimeout(r, 950))

const out = await browser.json(
  `(() => {
     const el = document.querySelector(${JSON.stringify(selector)})
     if (!el) return JSON.stringify({ found: false })
     const box = el.getBoundingClientRect()
     const cs = getComputedStyle(el)
     const num = (v) => Number.parseFloat(v) || 0
     const bw = { t: num(cs.borderTopWidth), r: num(cs.borderRightWidth), b: num(cs.borderBottomWidth), l: num(cs.borderLeftWidth) }
     const pad = { t: num(cs.paddingTop), r: num(cs.paddingRight), b: num(cs.paddingBottom), l: num(cs.paddingLeft) }
     const line = num(cs.borderTopWidth) // 角自身线宽固定 1px，单独取
     const corners = {}
     el.querySelectorAll(':scope > .magnetic-corner-frame__corner').forEach((c) => {
       const key = Array.from(c.classList).find((n) => n.startsWith('magnetic-corner-frame__corner--'))?.split('--').pop() ?? 'unknown'
       const r = c.getBoundingClientRect()
       corners[key] = { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }
     })
     const tl = corners.tl, tr = corners.tr, bl = corners.bl, br = corners.br
     const gaps = tl && tr && bl && br
       ? {
           left: Math.round(box.left - tl.l - bw.l),
           right: Math.round(tr.r - box.right - bw.r),
           top: Math.round(box.top - tl.t - bw.t),
           bottom: Math.round(br.b - box.bottom - bw.b),
           armW: [tl.w, tr.w, bl.w, br.w],
           armH: [tl.h, tr.h, bl.h, br.h],
         }
       : null
     return JSON.stringify({
       cls: String(el.className).slice(0, 40),
       box: [Math.round(box.left), Math.round(box.top), Math.round(box.width), Math.round(box.height)],
       border: [bw.t, bw.r, bw.b, bw.l],
       padding: [pad.t, pad.r, pad.b, pad.l],
       gaps,
       /** 上=下、左=右（左右因 L 线宽会相差 1px，允许 2px 舍入） */
       centred: gaps ? Math.abs(gaps.left - gaps.right) <= 2 && Math.abs(gaps.top - gaps.bottom) <= 2 : null,
       orphanCorners: Array.from(document.querySelectorAll('.magnetic-corner-frame__corner')).filter((c) => !c.parentElement?.hasAttribute('data-mcf')).length,
     })
   })()`,
)

console.log(JSON.stringify(out, null, 2))
await browser.close()
process.exit(0)

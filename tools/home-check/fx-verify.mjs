// Regression check for the corner-bracket micro-interaction:
//   1. no orphan corner (a stray L pinned to the document / a parent's top-left)
//   2. corners anchored to the element itself (li / div / a are position: static)
//   3. four visible corners are a square of the fixed arm length
//   4. parents keep their own frame while a child is hovered (nested double frame)
// Usage: node tools/home-check/fx-verify.mjs [url]
import { launchBrowser } from './cdp.mjs'

const [, , url = 'http://localhost:51642/'] = process.argv
const browser = await launchBrowser({
  port: 9511,
  width: 1440,
  height: 900,
  profileName: 'fx-verify',
})

const report = {}

const PROBE = (selector) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)})
  if (!el) return JSON.stringify({ found: false })
  el.scrollIntoView({ block: 'center', behavior: 'instant' })
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
  return new Promise((res) => setTimeout(() => {
    const box = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    const num = (v) => Number.parseFloat(v) || 0
    const owned = new Set(Array.from(document.querySelectorAll('[data-mcf]')))
    const orphans = Array.from(document.querySelectorAll('.magnetic-corner-frame__corner'))
      .filter((c) => !c.parentElement || !c.parentElement.hasAttribute('data-mcf')).length
    const stale = Array.from(document.querySelectorAll('.magnetic-corner-frame__corner'))
      .filter((c) => c.parentElement && c.parentElement.hasAttribute('data-mcf') && !owned.has(c.parentElement)).length
    const own = Array.from(el.querySelectorAll(':scope > .magnetic-corner-frame__corner'))
    const rects = own.map((c) => {
      const r = c.getBoundingClientRect()
      return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }
    })
    const [tl, tr, bl, br] = rects
    // 角的外缘应分别落在元素盒的上/左之外与右/下之外，且四条留白一致
    const gaps = tl && tr && bl && br ? {
      left: Math.round(box.left - tl.l),
      right: Math.round(tr.r - box.right),
      top: Math.round(box.top - tl.t),
      bottom: Math.round(br.b - box.bottom),
    } : null
    const lit = Array.from(document.querySelectorAll('[data-mcf]')).filter((f) => {
      const c = f.querySelector(':scope > .magnetic-corner-frame__corner')
      return c && getComputedStyle(c).visibility !== 'hidden' && Number(getComputedStyle(c).opacity) > 0.5
    }).map((f) => String(f.className).slice(0, 40))
    return res(JSON.stringify({
      found: true,
      display: cs.display,
      position: cs.position,
      corners: own.length,
      square: rects.every((r) => r.w === r.h && r.w > 0),
      arm: rects[0] ? rects[0].w : null,
      placeds: rects.map((r) => r.w > 0),
      gaps,
      centred: gaps ? Math.abs(gaps.left - gaps.right) <= 2 && Math.abs(gaps.top - gaps.bottom) <= 2 : null,
      orphans,
      stale,
      lit,
    }))
  }, 950))
})()`

await browser.goto(url)
await new Promise((r) => setTimeout(r, 1800))

for (const selector of [
  '.tag',
  '.team-row__id',
  '.team-row__gh',
  '.team-row__icon',
  '.team-row__avatar',
  '.btn--primary',
  '.status__cell',
  '.compare__col',
]) {
  const raw = await browser.evaluate(PROBE(selector))
  report[selector] = raw ? JSON.parse(raw) : { found: false }
}

console.log(JSON.stringify(report, null, 2))
console.log('pageErrors:', JSON.stringify(browser.pageErrors))
await browser.close()
process.exit(0)

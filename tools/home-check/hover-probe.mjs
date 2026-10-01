// Focused probe: does hovering a frame light its corners? (template frame vs auto-enhanced frame)
// Usage: node tools/home-check/hover-probe.mjs [url]
import { launchBrowser } from './cdp.mjs'

const [, , url = 'http://localhost:51640/'] = process.argv
const browser = await launchBrowser({
  port: 9433,
  width: 1440,
  height: 900,
  profileName: 'hover-probe',
})

await browser.goto(url)
await new Promise((r) => setTimeout(r, 1500))

const VISIBLE_EXPR = `(() => {
  const out = []
  document.querySelectorAll('[data-mcf]').forEach((f) => {
    const corners = Array.from(f.querySelectorAll(':scope > .magnetic-corner-frame__corner'))
    const on = corners.filter((c) => {
      const cs = getComputedStyle(c)
      return cs.visibility !== 'hidden' && Number(cs.opacity) > 0.5
    }).length
    if (on) out.push({ cls: String(f.className).slice(0, 40), on })
  })
  return JSON.stringify(out)
})()`

async function litFrames() {
  const raw = await browser.evaluate(VISIBLE_EXPR)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function hover(selector, label) {
  const found = await browser.evaluate(
    `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return 'no'; el.scrollIntoView({ block: 'center', behavior: 'instant' }); return 'yes' })()`,
  )
  if (found !== 'yes') return { label, found: false }

  await new Promise((r) => setTimeout(r, 700))
  const posRaw = await browser.evaluate(
    `(() => { const el = document.querySelector(${JSON.stringify(selector)}); const r = el.getBoundingClientRect(); return JSON.stringify({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) }) })()`,
  )
  const pos = posRaw ? JSON.parse(posRaw) : { x: 0, y: 0, w: 0, h: 0 }

  await browser.send(
    'Input.dispatchMouseEvent',
    { type: 'mouseMoved', x: pos.x, y: pos.y, buttons: 0, pointerType: 'mouse' },
    browser.sessionId,
  )
  await new Promise((r) => setTimeout(r, 950))

  return { label, selector, pos, lit: await litFrames() }
}

const report = {
  hasMcf: await browser.evaluate(`document.querySelectorAll('[data-mcf]').length`),
  hasCorners: await browser.evaluate(
    `document.querySelectorAll('.magnetic-corner-frame__corner').length`,
  ),
  templateFrame: await hover('.status__cell', 'template .status__cell'),
  autoFrameGh: await hover('.team-row__gh', 'auto .team-row__gh'),
  autoFrameIcon: await hover('.team-row__icon', 'auto .team-row__icon'),
}

console.log(JSON.stringify(report, null, 2))
await browser.close()
process.exit(0)

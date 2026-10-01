// Cleanup + reduced-motion check: route round trips must not accumulate
// ScrollTriggers / WebGL canvases, and reduce mode must render a static, fully visible page.
// Usage: node tools/home-check/cleanup.mjs [url]
import { launchBrowser, sleep } from './cdp.mjs'

const [, , url = 'http://localhost:51640/'] = process.argv
const browser = await launchBrowser({
  port: 9350,
  width: 1440,
  height: 900,
  profileName: 'cleanup',
})

const snapshot = () =>
  browser.json(
    `JSON.stringify({
       path: location.pathname,
       cards: document.querySelectorAll('.glow-card').length,
       panels: document.querySelectorAll('.server-panel').length,
       canvases: document.querySelectorAll('canvas').length,
       pinSpacers: document.querySelectorAll('.pin-spacer').length
     })`,
  )

const rounds = []
await browser.goto(url)
rounds.push({ step: 'home first load', state: await snapshot() })

for (let i = 1; i <= 2; i++) {
  await browser.goto(new URL('/news', url).toString())
  const news = await snapshot()
  await browser.goto(url)
  const back = await snapshot()
  rounds.push({ step: `round trip ${i}`, news, homeBack: back })
}

await browser.send(
  'Emulation.setEmulatedMedia',
  { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] },
  browser.sessionId,
)
await browser.goto(url)
await sleep(1200)

const reducedMotion = await browser.json(
  `JSON.stringify({
     cards: document.querySelectorAll('.glow-card').length,
     panels: document.querySelectorAll('.server-panel').length,
     canvases: document.querySelectorAll('canvas').length,
     pinSpacers: document.querySelectorAll('.pin-spacer').length,
     heroTitle: (() => { const t = document.querySelector('.hero-title'); if (!t) return null; const cs = getComputedStyle(t); return { opacity: cs.opacity, visibility: cs.visibility }; })(),
     allCardsVisible: Array.from(document.querySelectorAll('.glow-card')).every(c => {
       const cs = getComputedStyle(c)
       return cs.visibility !== 'hidden' && Number(cs.opacity) > 0.9
     }),
     overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
   })`,
)

console.log(JSON.stringify({ rounds, reducedMotion, pageErrors: browser.pageErrors }, null, 2))
await browser.close()
process.exit(0)

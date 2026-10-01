// Scroll choreography check: pin engagement, horizontal rail progress, overflow.
// Usage: node tools/home-check/scroll.mjs [url]
import { launchBrowser } from './cdp.mjs'

const [, , url = 'http://localhost:51640/'] = process.argv
const browser = await launchBrowser({ port: 9320, width: 1440, height: 900, profileName: 'scroll' })

await browser.goto(url)

const sample = () =>
  browser.json(
    `(() => {
       const track = document.querySelector('.servers-track')
       const section = document.querySelector('.servers-section')
       const bar = document.querySelector('.servers-progress__bar')
       return JSON.stringify({
         y: Math.round(window.scrollY),
         trackLeft: track ? Math.round(track.getBoundingClientRect().left) : null,
         sectionTop: section ? Math.round(section.getBoundingClientRect().top) : null,
         sectionPinned: section ? getComputedStyle(section).position : null,
         progressBar: bar ? (bar.style.transform || getComputedStyle(bar).transform) : null,
         docH: document.documentElement.scrollHeight,
         overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
       })
     })()`,
  )

const rows = []
for (const y of [1800, 2100, 2350, 2600, 2850, 3100, 3400, 3800, 4400, 5200]) {
  await browser.scrollTo(y, 600)
  rows.push(await sample())
}
await browser.scrollTo(0, 900)
rows.push({ ...(await sample()), y: 'back-to-top' })

console.log(JSON.stringify({ rows, pageErrors: browser.pageErrors }, null, 2))
await browser.close()
process.exit(0)

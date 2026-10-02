// Homepage screenshot + basic DOM/overflow probe.
// Usage: node tools/home-check/capture.mjs [url] [outDir] [label] [width] [height] [scrollY] [waitMs] [eval]
import { launchBrowser, sleep } from './cdp.mjs'

const [
  ,
  ,
  url = 'http://localhost:51640/',
  outDir = '.tmp-build/shots',
  label = 'shot',
  w = '1440',
  h = '900',
  scrollY = '0',
  waitMs = '0',
  expression = '',
] = process.argv

const browser = await launchBrowser({
  port: 9310,
  width: Number(w),
  height: Number(h),
  profileName: 'capture',
})

await browser.goto(url)
if (Number(scrollY) > 0) await browser.scrollTo(scrollY, 2000)
if (Number(waitMs) > 0) await sleep(Number(waitMs))

const probe = await browser.json(
  `JSON.stringify({
     scrollWidth: document.documentElement.scrollWidth,
     clientWidth: document.documentElement.clientWidth,
     scrollHeight: document.documentElement.scrollHeight,
     heroTitle: document.querySelector('.hero-title')?.textContent?.trim() ?? null,
     cards: document.querySelectorAll('.glow-card').length,
     panels: document.querySelectorAll('.server-panel').length,
     canvases: document.querySelectorAll('canvas').length,
     pinSpacers: document.querySelectorAll('.pin-spacer').length,
     theme: document.documentElement.getAttribute('data-theme')
   })`,
)

const extra = expression ? await browser.evaluate(expression) : null
const file = await browser.screenshot(`${outDir}/${label}.png`)

console.log(
  JSON.stringify(
    {
      label,
      file,
      probe,
      extra,
      consoleErrors: browser.consoleErrors,
      pageErrors: browser.pageErrors,
    },
    null,
    2,
  ),
)

await browser.close()
process.exit(0)

// Theme switch check: pixel-circle reveal must stay intact across repeated clicks,
// reversed mid-animation clicks, and a click while the rail section is pinned.
// Usage: node tools/home-check/theme.mjs [url]
import { launchBrowser } from './cdp.mjs'

const [, , url = 'http://localhost:51640/'] = process.argv
const browser = await launchBrowser({ port: 9330, width: 1440, height: 900, profileName: 'theme' })

await browser.goto(url)

const state = () =>
  browser.json(
    `JSON.stringify({
       theme: document.documentElement.getAttribute('data-theme'),
       maskStyleTag: !!document.querySelector('style[data-theme-reveal]'),
       revealSize: getComputedStyle(document.documentElement).getPropertyValue('--reveal-size').trim(),
       scrollY: Math.round(window.scrollY),
       docH: document.documentElement.scrollHeight,
       overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
     })`,
  )

const clickTheme = () => browser.evaluate(`document.querySelector('#theme-btn').click(); 'ok'`)

const steps = []
steps.push({ name: 'initial', state: await state() })

await clickTheme()
steps.push({ name: 'single-click +0.2s (revealing)', state: await state() })
await browser.scrollTo(0, 0)
await new Promise((r) => setTimeout(r, 1700))
steps.push({ name: 'single-click +1.9s (done)', state: await state() })

await clickTheme()
await new Promise((r) => setTimeout(r, 250))
await clickTheme()
await new Promise((r) => setTimeout(r, 2400))
steps.push({ name: 'reverse mid-animation', state: await state() })

for (let i = 0; i < 6; i++) {
  await clickTheme()
  await new Promise((r) => setTimeout(r, 120))
}
await new Promise((r) => setTimeout(r, 2600))
steps.push({ name: 'six rapid clicks', state: await state() })

await browser.scrollTo(2700, 1200)
steps.push({ name: 'pinned rail before switch', state: await state() })
await clickTheme()
await new Promise((r) => setTimeout(r, 2200))
steps.push({ name: 'switch while pinned', state: await state() })

console.log(JSON.stringify({ steps, pageErrors: browser.pageErrors }, null, 2))
await browser.close()
process.exit(0)

// Inspect whether the corner-bracket FX is actually complete on a given page:
// which frames were enhanced, their corner colors, and whether colour tokens resolve.
// Usage: node tools/home-check/fx-audit.mjs [url] [path]
import { launchBrowser } from './cdp.mjs'

const [, , url = 'http://localhost:51641/', path = '/Support'] = process.argv
const browser = await launchBrowser({
  port: 9455,
  width: 1440,
  height: 900,
  profileName: 'fx-audit',
})

await browser.goto(new URL(path, url).toString())
await new Promise((r) => setTimeout(r, 1800))

const audit = await browser.json(
  `(() => {
     const frames = Array.from(document.querySelectorAll('[data-mcf]'))
     const sample = frames.slice(0, 12).map((f) => {
       const c = f.querySelector(':scope > .magnetic-corner-frame__corner')
       const cs = c ? getComputedStyle(c) : null
       const r = f.getBoundingClientRect()
       return {
         cls: String(f.className).slice(0, 44),
         w: Math.round(r.width),
         h: Math.round(r.height),
         cornerW: cs ? cs.width : null,
         borderColor: cs ? cs.borderTopColor : null,
         cornerColorVar: c ? c.style.getPropertyValue('--corner-color') : null,
       }
     })
     const root = document.documentElement
     const rootCS = getComputedStyle(root)
     return JSON.stringify({
       path: location.pathname,
       frames: frames.length,
       sample,
       tokensOnRoot: {
         ink: rootCS.getPropertyValue('--ink').trim() || null,
         accent: rootCS.getPropertyValue('--accent').trim() || null,
         hairline: rootCS.getPropertyValue('--hairline').trim() || null,
       },
       homeRootPresent: !!document.querySelector('#home-root'),
       cursorLayer: !!document.querySelector('.cursor-layer'),
     })
   })()`,
)

console.log(JSON.stringify(audit, null, 2))
console.log('pageErrors:', JSON.stringify(browser.pageErrors))
await browser.close()
process.exit(0)

// Dump computed styles for a fixed set of home-page selectors so a refactor can be diffed
// for visual parity. Usage: node tools/home-check/style-snapshot.mjs <url> <out.json>
import { writeFileSync } from 'node:fs'
import { launchBrowser } from './cdp.mjs'

const [, , url = 'http://localhost:51641/', out = '.tmp-build/style-snapshot.json'] = process.argv
const browser = await launchBrowser({ port: 9744, width: 1440, height: 900, profileName: 'style-snapshot' })

await browser.goto(url)
await new Promise((r) => setTimeout(r, 2600))

const PROPS = [
  'display',
  'position',
  'width',
  'height',
  'marginTop',
  'marginBottom',
  'paddingTop',
  'paddingLeft',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'color',
  'backgroundColor',
  'borderTopWidth',
  'borderRadius',
  'gap',
  'gridTemplateColumns',
  'flexDirection',
  'maxWidth',
  'opacity',
  'textTransform',
  'overflowX',
]

const SELECTORS = [
  '.home-page, .page',
  '.wrap',
  '.eyebrow',
  '.h2',
  '.h3',
  '.lead',
  '.btn',
  '.btn--primary',
  '.hero',
  '.hero__title',
  '.status',
  '.status__grid',
  '.status__cell',
  '.status__num',
  '.status__label',
  '.demo',
  '.demo__grid',
  '.gallery',
  '.gallery__rail',
  '.gallery__item',
  '.compare',
  '.compare__grid',
  '.compare__col',
  '.tag',
  '.team',
  '.team__list',
  '.team-row',
  '.team-row__inner',
  '.team-row__name',
  '.cta',
  '.cta__panel',
  '.progress',
]

const raw = await browser.json(
  `(() => {
     const props = ${JSON.stringify(PROPS)}
     const out = {}
     for (const sel of ${JSON.stringify(SELECTORS)}) {
       const el = document.querySelector(sel)
       if (!el) { out[sel] = null; continue }
       const cs = getComputedStyle(el)
       const entry = { __rect: [Math.round(el.getBoundingClientRect().width), Math.round(el.getBoundingClientRect().height)] }
       for (const p of props) entry[p] = cs[p]
       out[sel] = entry
     }
     return JSON.stringify(out)
   })()`,
)

const parsed = raw && typeof raw === 'object' ? raw : raw ? JSON.parse(raw) : null
writeFileSync(out, JSON.stringify(parsed, null, 2))
console.log(
  JSON.stringify({
    out,
    selectorsResolved: parsed ? Object.values(parsed).filter(Boolean).length : 0,
  }),
)
await browser.close()
process.exit(0)

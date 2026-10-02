// Dump full console/page error details for the homepage.
// Usage: node tools/home-check/errors.mjs [url]
import { launchBrowser } from './cdp.mjs'

const [, , url = 'http://localhost:51640/'] = process.argv
const browser = await launchBrowser({ port: 9372, width: 1440, height: 900, profileName: 'errors' })

await browser.goto(url)
await new Promise((r) => setTimeout(r, 3000))

console.log(
  JSON.stringify(
    {
      consoleErrors: browser.consoleErrors,
      pageErrors: browser.pageErrors,
    },
    null,
    2,
  ),
)

await browser.close()
process.exit(0)

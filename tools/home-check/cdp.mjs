// Shared CDP harness for local homepage acceptance checks (ASCII-only source on purpose:
// avoids PowerShell/console codepage damage when these scripts are edited on Windows).
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
]

export async function launchBrowser({
  port = 9300,
  width = 1440,
  height = 900,
  profileName = 'default',
} = {}) {
  const executable = CHROME_CANDIDATES.find((p) => existsSync(p))
  const bin = executable ?? CHROME_CANDIDATES[0]

  const child = spawn(
    bin,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-extensions',
      '--disable-sync',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${path.resolve('.tmp-build', 'cdp-' + profileName)}`,
      `--window-size=${width},${height}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  let wsUrl = null
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`)
      const json = await res.json()
      if (json.webSocketDebuggerUrl) {
        wsUrl = json.webSocketDebuggerUrl
        break
      }
    } catch {
      // browser not ready yet
    }
    await sleep(250)
  }
  if (!wsUrl) throw new Error(`CDP not reachable on port ${port}`)

  let msgId = 0
  const pending = new Map()
  const consoleErrors = []
  const pageErrors = []

  const ws = new WebSocket(wsUrl)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = () => reject(new Error('CDP websocket failed'))
  })

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(JSON.stringify(msg.error)))
      else resolve(msg.result)
      return
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      pageErrors.push(
        msg.params.exceptionDetails?.exception?.description ?? msg.params.exceptionDetails?.text,
      )
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(' '))
    }
  }

  const send = (method, params = {}, sessionId) => {
    const id = ++msgId
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
    })
  }

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  await send('Runtime.enable', {}, sessionId)
  await send('Log.enable', {}, sessionId)
  await send('Page.enable', {}, sessionId)
  await send(
    'Emulation.setDeviceMetricsOverride',
    { width, height, deviceScaleFactor: 1, mobile: width < 700 },
    sessionId,
  )

  const evaluate = async (expression) => {
    const res = await send(
      'Runtime.evaluate',
      { expression, returnByValue: true, awaitPromise: true },
      sessionId,
    )
    return res.result?.value ?? res.result?.description ?? null
  }

  const json = async (expression) => JSON.parse(await evaluate(expression))

  const goto = async (url, settleMs = 4200) => {
    await send('Page.navigate', { url }, sessionId)
    await sleep(settleMs)
  }

  const scrollTo = async (y, settleMs = 700) => {
    await evaluate(`window.scrollTo({ top: ${Number(y)}, behavior: 'instant' }); 'ok'`)
    await sleep(settleMs)
  }

  const screenshot = async (file) => {
    const shot = await send(
      'Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: false },
      sessionId,
    )
    const fs = await import('node:fs/promises')
    await fs.mkdir(path.dirname(path.resolve(file)), { recursive: true })
    await fs.writeFile(path.resolve(file), Buffer.from(shot.data, 'base64'))
    return path.resolve(file)
  }

  const close = async () => {
    ws.close()
    child.kill()
    await sleep(200)
  }

  return {
    send,
    sessionId,
    evaluate,
    json,
    goto,
    scrollTo,
    screenshot,
    close,
    consoleErrors,
    pageErrors,
  }
}

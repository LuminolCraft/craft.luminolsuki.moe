// Development-only checks. The examples themselves have no JavaScript.
// Requires Playwright and a Chromium installation; see references/verification.md.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const output = path.resolve(process.argv[2] || '/tmp/smooth-option-verification');
fs.mkdirSync(output, { recursive: true });
const root = path.resolve(__dirname, '..');
const url = name => pathToFileURL(path.join(root, 'references', name)).href;
const near = (a, b, tolerance = 1.2) => assert(Math.abs(a - b) <= tolerance, `${a} != ${b}`);

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {})
  });
  try {
    const context = await browser.newContext({ viewport: { width: 900, height: 440 }, deviceScaleFactor: 2, javaScriptEnabled: false });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const settle = () => page.waitForTimeout(600);
    const state = () => page.locator('input:checked').evaluateAll(es => es.map(e => e.id));
    const box = selector => page.locator(selector).boundingBox();
    const style = (selector, key) => page.locator(selector).evaluate((e, key) => getComputedStyle(e)[key], key);
    const shot = async name => {
      const b = await box('.btn-wrapper');
      await page.screenshot({ path: path.join(output, `${name}.png`), clip: { x: b.x - 24, y: b.y - 24, width: b.width + 48, height: b.height + 100 } });
    };

    await page.goto(url('example.html'));
    assert.equal(await page.locator('script').count(), 0);
    assert.deepEqual(await state(), ['free', 'monthly']);
    await shot('free');
    const initial = await box('.slider');
    // Click over the subtitle: the higher full-size Premium label receives it.
    const preview = await box('.version-menu');
    await page.mouse.click(preview.x + 10, preview.y + preview.height / 2);
    await settle();
    assert.deepEqual(await state(), ['premium', 'monthly']);
    const active = await box('.slider');
    near(active.x - initial.x, initial.width);
    assert.equal(await style('.premium', 'opacity'), '0');
    assert.equal(await style('.dot', 'width'), '0px');
    assert.equal(await style('.monthly', 'color'), 'rgb(0, 0, 0)');
    await shot('monthly');
    const monthly = await box('.menu-slider');
    await page.locator('.annual').click(); await settle();
    assert.deepEqual(await state(), ['premium', 'annual']);
    assert.equal(await style('.annual', 'color'), 'rgb(0, 0, 0)');
    assert.equal(await style('.monthly', 'color'), 'rgb(184, 184, 184)');
    const annual = await box('.menu-slider');
    near(annual.x - monthly.x, monthly.width);
    await shot('annual');
    await page.locator('.free-wrapper').click(); await settle();
    assert.deepEqual(await state(), ['free', 'annual']);
    assert.equal(await style('.premium', 'opacity'), '1');
    assert.equal(await style('.menu-slider', 'opacity'), '0');
    await page.locator('.premium').click(); await settle();
    assert.deepEqual(await state(), ['premium', 'annual']);

    // Freeze actual CSS transitions at intermediate times (test code only).
    await page.locator('.free-wrapper').click(); await settle();
    await page.locator('.premium').click();
    const primarySamples = await page.evaluate(() => {
      const animations = document.getAnimations();
      animations.forEach(a => a.pause());
      const samples = [0, 100, 250, 490].map(t => {
        animations.forEach(a => { a.currentTime = t; });
        const s = getComputedStyle(document.querySelector('.slider'));
        const m = getComputedStyle(document.querySelector('.version-menu'));
        return { t, x: new DOMMatrix(s.transform).m41, scale: new DOMMatrix(m.transform).m11 };
      });
      animations.forEach(a => { a.currentTime = 100; });
      return samples;
    });
    assert(primarySamples[1].x > 0 && primarySamples[1].x < initial.width);
    assert(primarySamples[1].scale > 0.6 && primarySamples[1].scale < 1);
    for (let i = 1; i < primarySamples.length; i++) assert(primarySamples[i].x > primarySamples[i - 1].x);
    await shot('primary-100ms');
    await page.evaluate(() => document.getAnimations().forEach(a => a.finish()));
    await settle();
    await page.locator('.monthly').click(); await settle();
    await page.locator('.annual').click();
    const secondarySamples = await page.evaluate(() => {
      const animations = document.getAnimations();
      animations.forEach(a => a.pause());
      const samples = [0, 100, 250, 490].map(t => {
        animations.forEach(a => { a.currentTime = t; });
        return { t, left: parseFloat(getComputedStyle(document.querySelector('.menu-slider')).left) };
      });
      animations.forEach(a => { a.currentTime = 100; });
      return samples;
    });
    for (let i = 1; i < secondarySamples.length; i++) assert(secondarySamples[i].left > secondarySamples[i - 1].left);
    await shot('secondary-100ms');
    await page.evaluate(() => document.getAnimations().forEach(a => a.finish()));
    await settle();

    // Rapid reversals use stable half-track coordinates, without locator waits.
    const track = await box('.btn-wrapper');
    for (let i = 0; i < 10; i++) {
      await page.mouse.click(track.x + track.width / 4, track.y + track.height / 2);
      await page.waitForTimeout(25);
      await page.mouse.click(track.x + track.width * 0.75, track.y + track.height / 2);
      await page.waitForTimeout(25);
    }
    await settle();
    assert.deepEqual(await state(), ['premium', 'annual']);
    near((await box('.slider')).x, active.x);
    const beforeHover = await state();
    await page.locator('.free-wrapper').hover(); await settle();
    assert.deepEqual(await state(), beforeHover);

    const widths = [];
    for (const width of [280, 395, 560]) {
      await page.locator('.btn-wrapper').evaluate((e, w) => { e.style.width = `${w}px`; }, width);
      await page.locator('.free-wrapper').click(); await settle();
      const start = await box('.slider');
      await page.locator('.premium').click(); await settle();
      near((await box('.slider')).x - start.x, start.width);
      for (const name of ['monthly', 'annual']) {
        await page.locator(`.${name}`).click(); await settle();
        const inner = await box('.menu-slider');
        const outer = await box('.slider');
        assert(inner.x >= outer.x - 1.2 && inner.x + inner.width <= outer.x + outer.width + 1.2);
        assert(inner.y >= outer.y - 1.2 && inner.y + inner.height <= outer.y + outer.height + 1.2);
        const label = await box(`.${name}`);
        // Reconstructed 2%/50% offsets trade a slight center offset for a
        // symmetric rim inside the padded black pill (under 3px at these sizes).
        near(label.x + label.width / 2, inner.x + inner.width / 2, 3);
      }
      widths.push(width);
    }

    await page.goto(url('accessible.html'));
    await page.setViewportSize({ width: 320, height: 440 });
    assert.equal(await style('.premium', 'color'), 'rgb(102, 102, 102)');
    assert.equal(await style('.monthly', 'color'), 'rgb(102, 102, 102)');
    assert.equal(await page.locator('#monthly').evaluate(e => getComputedStyle(e).display), 'none');
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'free');
    assert.equal(await style('.free-wrapper', 'outlineStyle'), 'solid');
    await page.keyboard.press('ArrowRight'); await settle();
    assert.deepEqual(await state(), ['premium', 'monthly']);
    assert.equal(await page.locator(':focus').getAttribute('id'), 'premium');
    assert.equal(await style('.free-wrapper', 'color'), 'rgb(102, 102, 102)');
    assert.equal(await style('.premium-wrapper', 'outlineStyle'), 'solid');
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'monthly');
    await page.keyboard.press('ArrowRight'); await settle();
    assert.deepEqual(await state(), ['premium', 'annual']);
    assert.equal(await style('.annual', 'outlineStyle'), 'solid');
    await shot('accessible-320');
    const responsive = await box('.btn-wrapper');
    assert(responsive.x >= 0 && responsive.x + responsive.width <= 320);
    // Change the preference while a CSS transition is running.
    await page.keyboard.press('ArrowLeft');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await style('.menu-slider', 'transitionDuration'), '0s');
    assert.equal(await page.evaluate(() => document.getAnimations().length), 0);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'premium');
    await page.keyboard.press('ArrowLeft');
    assert.deepEqual(await state(), ['free', 'monthly']);
    assert.equal(await page.locator('#annual').evaluate(e => getComputedStyle(e).display), 'none');
    assert.equal(await style('.slider', 'transform'), 'matrix(1, 0, 0, 1, 0, 0)');
    assert.equal(errors.length, 0);
    const report = { browser: await browser.version(), javaScriptEnabled: false, primarySamples, secondarySamples, testedContainerWidths: widths, accessibleViewportWidth: 320, rapidRoundTrips: 10, errors, result: 'PASS' };
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });

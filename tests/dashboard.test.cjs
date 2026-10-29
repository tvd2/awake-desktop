const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
let server, browser, base;
before(async () => {
  server = http.createServer((req, res) => {
    const file = path.join(__dirname, '..', req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
    try { res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html'); res.end(fs.readFileSync(file)); }
    catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
});
after(async () => { await browser?.close(); await new Promise(resolve => server?.close(resolve)); });
async function open(width = 1440) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('close', () => assert.deepEqual(errors, [], 'uncaught browser errors'));
  await page.route('https://**', route => route.abort());
  await page.route('**/api/**', route => {
    const url = route.request().url();
    if (url.includes('/weather')) return route.fulfill({ json: { daily: { time: ['2026-07-17', '2026-07-18', '2026-07-19', '2026-07-20', '2026-07-21'], weather_code: [0, 1, 2, 3, 61], temperature_2m_max: [21, 22, 23, 24, 20], temperature_2m_min: [12, 13, 14, 15, 11], wind_speed_10m_max: [10, 11, 12, 13, 14], precipitation_probability_max: [0, 0, 0, 0, 20] } } });
    const data = url.includes('/radio') ? [{ title: 'Test Jazz', playlists: [{ url: 'https://example.com/live.mp3', format: 'mp3' }] }] : Array.from({ length: 18 }, (_, i) => ({ title: `Story ${i + 1}`, url: `https://example.com/${i}`, source: 'Public source', creator: 'Community', publishedAt: new Date().toISOString() }));
    return route.fulfill({ json: data });
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'wakeLock', { value: { request: async () => { const lock = new EventTarget(); lock.release = async () => lock.dispatchEvent(new Event('release')); return lock; } } });
    HTMLMediaElement.prototype.play = function () { Object.defineProperty(this, 'paused', { configurable: true, value: false }); this.dispatchEvent(new Event('play')); return Promise.resolve(); };
    HTMLMediaElement.prototype.pause = function () { Object.defineProperty(this, 'paused', { configurable: true, value: true }); this.dispatchEvent(new Event('pause')); };
  });
  await page.goto(base);
  await page.waitForSelector('#newsList article');
  return page;
}
test('timer and radio remain in header and active across feed switches', async () => {
  const page = await open();
  try {
    assert.equal(await page.locator('header #awakeStartButton').count(), 1);
    assert.equal(await page.locator('header #radioChannel').count(), 1);
    await page.click('#awakeStartButton');
    await page.waitForTimeout(1100);
    assert.notEqual(await page.locator('#wakeElapsed').textContent(), '00:00:00');
    await page.click('#radioPlay');
    await page.click('[data-feed-tab="deals"]');
    assert.equal(await page.locator('#news').isVisible(), false);
    assert.equal(await page.locator('#deals').isVisible(), true);
    assert.equal(await page.locator('#wakeReadout').isVisible(), true);
    assert.equal(await page.locator('#radioPause').isVisible(), true);
    await page.click('#radioMute');
    assert.equal(await page.locator('#radioAudio').evaluate(el => el.muted), true);
    await page.click('#wakeStopButton');
    assert.equal(await page.locator('#awakeStartButton').isVisible(), true);
    const x = page.locator('a[href="https://x.com/home"]');
    assert.equal(await x.getAttribute('target'), '_blank');
    assert.match(await x.getAttribute('rel'), /noopener/);
  } finally { await page.close(); }
});
test('header places theme controls before radio and wake timer at the right edge', async () => {
  const page = await open();
  try {
    await page.click('#awakeStartButton');
    const theme = await page.locator('.theme-toggle').boundingBox();
    const radio = await page.locator('.radio-player').boundingBox();
    const wake = await page.locator('.wake-control').boundingBox();
    assert.ok(theme.x + theme.width <= radio.x, 'theme controls precede radio');
    assert.ok(radio.x + radio.width <= wake.x, 'wake controls follow radio');
    assert.equal(Math.round(wake.x + wake.width), 1408, 'timer aligns with right header padding');
    const order = await page.locator('.header-tools').evaluate(el => [...el.children].map(child => child.className));
    assert.deepEqual(order, ['theme-toggle', 'radio-player', 'wake-control compact']);
  } finally { await page.close(); }
});
test('feed disclosure reveals five more, keyboard selects tabs and refresh resets limit', async () => {
  const page = await open();
  try {
    assert.equal(await page.locator('#newsList article:visible').count(), 5);
    await page.click('[data-show-more="news"]');
    assert.equal(await page.locator('#newsList article:visible').count(), 10);
    await page.locator('[data-feed-tab="news"]').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[data-feed-tab="deals"]').getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#dealsList article:visible').count(), 5);
    await page.click('[data-show-more="deals"]');
    assert.equal(await page.locator('#dealsList article:visible').count(), 10);
    await page.click('#dealsButton');
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#dealsList article:visible').count(), 5);
  } finally { await page.close(); }
});
test('wallpaper actions and collapsible manual weather remain usable', async () => {
  const page = await open(390);
  try {
    const original = await page.locator('#wallpaperImage').getAttribute('src');
    await page.click('#wallpaperShuffle');
    assert.notEqual(await page.locator('#wallpaperImage').getAttribute('src'), original);
    const popupPromise = page.waitForEvent('popup');
    await page.click('#wallpaperDownload');
    const popup = await popupPromise;
    await popup.close();
    assert.equal(await page.locator('#weatherButton').isVisible(), false);
    await page.click('#weather summary');
    await page.click('#weatherButton');
    await page.waitForSelector('#locationForm:visible');
    await page.route('https://geocoding-api.open-meteo.com/**', route => route.fulfill({ json: { results: [{ name: 'Sydney', admin1: 'NSW', country: 'Australia', country_code: 'AU', latitude: -33.86, longitude: 151.21 }] } }));
    await page.fill('#locationCity', 'Sydney');
    await page.click('#locationSearch');
    await page.waitForSelector('.weather-card:not(.skeleton)');
    assert.equal(await page.locator('.weather-card').count(), 5);
    assert.equal(await page.locator('.weather-icon svg').first().evaluate(el => el.getBoundingClientRect().height <= 44), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } finally { await page.close(); }
});
test('responsive dashboard has no horizontal overflow and header stays visible', async () => {
  for (const width of [1440, 768, 390, 320]) {
    const page = await open(width);
    try {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px overflow`);
      await page.click('#awakeStartButton');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px active timer overflow`);
      if (process.env.SCREENSHOTS) await page.screenshot({ path: `/tmp/awake-desk-${width}.png`, fullPage: true });
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      assert.equal(await page.locator('header').evaluate(el => Math.round(el.getBoundingClientRect().top)), 0);
      await page.locator('.theme-option[data-theme="dark"]').click();
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    } finally { await page.close(); }
  }
});

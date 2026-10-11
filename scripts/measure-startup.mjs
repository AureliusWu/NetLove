import { spawn } from 'node:child_process';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { gzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';

// Local comparison only: fresh browser contexts, same build host and viewport.
const label = process.argv[2] || 'current';
if (!/^[a-z0-9-]+$/i.test(label)) throw new Error('Invalid measurement label');
const port = 4183;
const url = `http://127.0.0.1:${port}/`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '';
server.stdout.on('data', chunk => { serverLog += chunk; });
server.stderr.on('data', chunk => { serverLog += chunk; });
let browser;
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Preview stopped: ${serverLog}`);
    if (serverLog.includes(`:${port}/`) && await fetch(url).then(response => response.ok).catch(() => false)) break;
    if (attempt === 99) throw new Error('Preview did not start');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {});
  const samples = [];
  for (let run = 1; run <= 3; run++) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(() => localStorage.setItem('netlove:v1:settings', JSON.stringify({ textSpeed: 0, music: false })));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let start = performance.now();
    await page.goto(url);
    await page.locator('h1').waitFor();
    const coldTitleMs = performance.now() - start;
    const navigation = await page.evaluate(() => {
      const entry = performance.getEntriesByType('navigation')[0];
      return entry ? entry.toJSON() : null;
    });
    start = performance.now();
    const readingResponse = page.evaluate(() => new Promise((resolve, reject) => {
      const timer = setTimeout(() => { document.removeEventListener('click', clicked, true); reject(new Error('Reading response measurement timed out')); }, 15000);
      function clicked(event) {
        const button = event.target instanceof Element ? event.target.closest('button') : null;
        if (!button?.textContent?.trim().startsWith('开始阅读')) return;
        document.removeEventListener('click', clicked, true);
        const dispatched = performance.now();
        function rendered() {
          const game = document.querySelector('.game-screen');
          if (game && Array.from(game.querySelectorAll('img')).every(image => image.complete && image.naturalWidth > 0)) {
            requestAnimationFrame(() => { clearTimeout(timer); resolve(performance.now() - dispatched); });
          } else requestAnimationFrame(rendered);
        }
        requestAnimationFrame(rendered);
      }
      document.addEventListener('click', clicked, true);
    }));
    await page.getByRole('button', { name: '开始阅读', exact: true }).click();
    await page.locator('.game-screen[data-line="0"]').waitFor();
    await page.waitForFunction(() => Array.from(document.querySelectorAll('.game-screen img')).every(image => image.complete && image.naturalWidth > 0));
    const startReadingMs = performance.now() - start;
    const readingResponseMs = await readingResponse;
    await page.locator('.dialogue-text').click();
    await page.locator('.game-screen[data-line="1"]').waitFor();
    await page.getByRole('button', { name: '隐藏界面', exact: true }).click();
    await page.getByRole('button', { name: '恢复阅读界面', exact: true }).click();
    if (await page.locator('.game-screen').getAttribute('data-line') !== '1') throw new Error('Hide/restore advanced the story');
    await page.getByRole('button', { name: '返回标题', exact: true }).click();
    await page.getByRole('button', { name: '安装与离线', exact: true }).click();
    await page.getByRole('heading', { name: '可以离线阅读', exact: true }).waitFor({ timeout: 30000 });
    const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.toJSON()));
    await context.setOffline(true);
    start = performance.now();
    await page.reload();
    await page.getByRole('button', { name: '继续上次的故事', exact: true }).click();
    await page.locator('.game-screen[data-line="1"]').waitFor();
    await page.waitForFunction(() => Array.from(document.querySelectorAll('.game-screen img')).every(image => image.complete && image.naturalWidth > 0));
    const offlineResumeMs = performance.now() - start;
    if (errors.length) throw new Error(errors.join('\n'));
    samples.push({ run, coldTitleMs, startReadingMs, readingResponseMs, offlineResumeMs, navigation, resources, errors });
    await context.close();
  }
  const files = [];
  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const name = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await collect(name);
      else { const bytes = await readFile(name); files.push({ name, bytes: bytes.length, gzipBytes: gzipSync(bytes).length }); }
    }
  }
  await collect('dist');
  const metrics = {};
  for (const key of ['coldTitleMs', 'startReadingMs', 'readingResponseMs', 'offlineResumeMs']) {
    const values = samples.map(sample => sample[key]).sort((a, b) => a - b);
    metrics[key] = { median: values[1], worst: values[2] };
  }
  const result = { label, measuredAt: new Date().toISOString(), browserVersion: browser.version(), viewport: '1440x900', host: url, repetitions: 3, context: 'fresh context per run; cached disconnected resume in each context; local preview, not public/device performance', packageVersion: JSON.parse(await readFile('package.json', 'utf8')).version, samples, metrics, artifacts: { fileCount: files.length, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0), jsCssBytes: files.filter(file => /\.(js|css)$/.test(file.name)).reduce((sum, file) => sum + file.bytes, 0), jsCssGzipBytes: files.filter(file => /\.(js|css)$/.test(file.name)).reduce((sum, file) => sum + file.gzipBytes, 0), files } };
  await mkdir('tmp/measurements', { recursive: true });
  await writeFile(`tmp/measurements/${label}.json`, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ label, browserVersion: result.browserVersion, metrics, artifacts: { ...result.artifacts, files: undefined } }, null, 2));
} finally {
  if (browser) await browser.close();
  server.kill();
}

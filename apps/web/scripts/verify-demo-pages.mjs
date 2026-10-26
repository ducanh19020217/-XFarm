import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(webDir, '../..');
const outDir = path.resolve(webDir, 'out');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function startServer(port = 4321) {
  const server = http.createServer((req, res) => {
    let reqUrl = req.url || '/';
    // Remove query params
    const qIdx = reqUrl.indexOf('?');
    if (qIdx !== -1) reqUrl = reqUrl.slice(0, qIdx);

    // Only serve under /-XFarm
    if (reqUrl === '/') {
      res.writeHead(302, { Location: '/-XFarm/' });
      res.end();
      return;
    }

    if (reqUrl === '/-XFarm.txt') {
      const idxCandidate = path.join(outDir, 'index.txt');
      if (fs.existsSync(idxCandidate)) {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        fs.createReadStream(idxCandidate).pipe(res);
        return;
      }
    }

    if (!reqUrl.startsWith('/-XFarm')) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found outside /-XFarm');
      return;
    }

    const subPath = reqUrl.replace(/^\/-XFarm/, '') || '/';
    const decodedSubPath = decodeURIComponent(subPath);

    // Candidate file paths
    const candidates = [
      path.join(outDir, decodedSubPath),
      path.join(outDir, decodedSubPath, 'index.html'),
      path.join(outDir, `${decodedSubPath}.html`),
      decodedSubPath === '/.txt' || decodedSubPath === '.txt'
        ? path.join(outDir, 'index.txt')
        : null,
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const ext = path.extname(candidate).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(candidate).pipe(res);
        return;
      }
    }

    // Fallback to 404.html if exists
    const notFoundPath = path.join(outDir, '404.html');
    if (fs.existsSync(notFoundPath)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(notFoundPath).pipe(res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(
        `[server] Serving static demo from ${outDir} at http://localhost:${port}/-XFarm/`,
      );
      resolve(server);
    });
  });
}

async function verify() {
  const port = 4321;
  const server = await startServer(port);

  const errors = [];
  const networkErrors = [];
  const expectedFallbackPaths = [
    '/-XFarm/admin/animals/999',
    '/-XFarm/admin/equipment/real-id',
    '/-XFarm/admin/m/quick-log/unknown-worker-route',
  ];

  const isExpectedFallback = (url) => expectedFallbackPaths.some((route) => url.includes(route));

  let browser;
  try {
    browser = await chromium.launch({
      executablePath: fs.existsSync('/usr/bin/google-chrome')
        ? '/usr/bin/google-chrome'
        : undefined,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const context = await browser.newContext();

    // Abort third-party network requests like openstreetmap to prevent external network timeouts
    await context.route('**/*', (route) => {
      const u = route.request().url();
      if (u.includes('openstreetmap.org')) {
        return route.abort();
      }
      return route.continue();
    });

    const page = await context.newPage();

    page.on('pageerror', (err) => {
      console.error('[pageerror]', err.message);
      errors.push(`Page error: ${err.message}`);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('openstreetmap.org')) return;
        if (text.includes('status of 404') && isExpectedFallback(page.url())) return;
        console.error('[console.error]', text);
        errors.push(`Console error: ${text}`);
      }
    });

    page.on('response', (res) => {
      const url = res.url();
      const status = res.status();
      if (
        status >= 400 &&
        !url.includes('/favicon.ico') &&
        url.startsWith(`http://localhost:${port}`) &&
        !isExpectedFallback(url)
      ) {
        console.error(`[HTTP ${status}] ${url}`);
        networkErrors.push(`[${status}] ${url}`);
      }
    });

    // 1. Capture Desktop (1440px)
    console.log('[test] Testing Desktop view (1440px)...');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://localhost:${port}/-XFarm/`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});

    const screenshotDir = path.resolve(rootDir, 'docs/screenshots');
    fs.mkdirSync(screenshotDir, { recursive: true });

    const desktopPath = path.join(screenshotDir, 'demo-home-1440.png');
    await page.screenshot({ path: desktopPath, fullPage: true });
    console.log(`[screenshot] Saved desktop screenshot: ${desktopPath}`);

    // 2. Capture Mobile (375px)
    console.log('[test] Testing Mobile view (375px)...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`http://localhost:${port}/-XFarm/`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});

    const mobilePath = path.join(screenshotDir, 'demo-home-375.png');
    await page.screenshot({ path: mobilePath, fullPage: true });
    console.log(`[screenshot] Saved mobile screenshot: ${mobilePath}`);

    // 3. Test all main pages
    const routesToTest = [
      '/-XFarm/',
      '/-XFarm/gioi-thieu',
      '/-XFarm/san-pham',
      '/-XFarm/san-pham/cai-ngot-huu-co',
      '/-XFarm/san-pham/trung-ga-ta',
      '/-XFarm/tour',
      '/-XFarm/tour/mot-ngay-lam-nong-dan',
      '/-XFarm/tour/kham-pha-he-sinh-thai-tuan-hoan',
      '/-XFarm/blog',
      '/-XFarm/blog/vuon-rau-huu-co',
      '/-XFarm/trace/RAU-2026-001',
      '/-XFarm/trace/TRUNG-2026-002',
      '/-XFarm/trace/CA-2026-003',
      '/-XFarm/gio-hang',
      '/-XFarm/thanh-toan',
      '/-XFarm/lien-he',
      '/-XFarm/tra-cuu-don',
      '/-XFarm/admin',
      '/-XFarm/admin/m',
      '/-XFarm/admin/animals/123',
      '/-XFarm/admin/equipment/abc',
      '/-XFarm/login',
    ];

    const fallbackRoutes = expectedFallbackPaths;

    console.log(`[test] Verifying ${routesToTest.length} routes...`);
    for (const route of routesToTest) {
      const url = `http://localhost:${port}${route}`;
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});
      if (!response || response.status() >= 400) {
        throw new Error(`Route ${route} returned status ${response?.status()}`);
      }
      console.log(`  ✓ [${response.status()}] ${route}`);
    }

    console.log(`[test] Verifying ${fallbackRoutes.length} arbitrary restricted routes...`);
    for (const route of fallbackRoutes) {
      const url = `http://localhost:${port}${route}`;
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});
      const bodyText = await page.locator('body').innerText();
      if (
        !response ||
        response.status() !== 404 ||
        !bodyText.includes('Tính năng quản trị chỉ có ở bản cài đặt đầy đủ')
      ) {
        throw new Error(`Fallback route ${route} did not render the restricted demo page`);
      }
      console.log(`  ✓ [404 fallback] ${route}`);
    }

    if (errors.length > 0) {
      console.error(`Found ${errors.length} page/console errors:`, errors);
      throw new Error(`Verification failed with ${errors.length} page/console errors`);
    }

    if (networkErrors.length > 0) {
      console.error(`Found ${networkErrors.length} network errors:`, networkErrors);
      throw new Error(`Verification failed with ${networkErrors.length} network errors`);
    }

    console.log('[verify] All routes verified cleanly without errors or 404s!');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

verify().catch((err) => {
  console.error('[verify failed]', err);
  process.exit(1);
});

import { spawn } from 'node:child_process';
import http from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');

// Determine port and target URL
const webPort = process.env.WEB_PORT || '3250';
const envWebUrl = process.env.WEB_URL;
const targetUrl = process.argv[2] || envWebUrl || `http://localhost:${webPort}`;

async function isServerReady(url) {
  return new Promise((resolvePromise) => {
    const req = http.get(url, (res) => {
      resolvePromise(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolvePromise(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolvePromise(false);
    });
  });
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerReady(url)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

let serverProcess = null;

async function ensureServerRunning() {
  const ready = await isServerReady(targetUrl);
  if (ready) {
    console.log(`Web server is already running at ${targetUrl}`);
    return;
  }

  const parsedUrl = new URL(targetUrl);
  const port = parsedUrl.port || '3100';

  console.log(`Starting next server on port ${port}...`);
  serverProcess = spawn('npx', ['next', 'start', '-p', port], {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, PORT: port },
  });

  const isUp = await waitForServer(targetUrl, 30000);
  if (!isUp) {
    if (serverProcess) serverProcess.kill();
    throw new Error(`Server at ${targetUrl} did not start in time.`);
  }
  console.log(`Server started successfully at ${targetUrl}`);
}

async function runLighthouse() {
  let chrome = null;
  try {
    await ensureServerRunning();

    console.log(`Launching Chrome (/usr/bin/google-chrome, headless)...`);
    chrome = await chromeLauncher.launch({
      chromePath: '/usr/bin/google-chrome',
      chromeFlags: [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-extensions',
      ],
    });

    console.log(`Running Lighthouse audit on ${targetUrl}...`);
    const runnerResult = await lighthouse(targetUrl, {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['seo', 'accessibility'],
      logLevel: 'error',
    });

    const lhr = runnerResult.lhr;
    const seoScore = Math.round((lhr.categories.seo?.score ?? 0) * 100);
    const a11yScore = Math.round((lhr.categories.accessibility?.score ?? 0) * 100);

    console.log('\n========================================');
    console.log(`Lighthouse Audit Report for: ${targetUrl}`);
    console.log('----------------------------------------');
    console.log(`SEO Score:           ${seoScore}/100`);
    console.log(`Accessibility Score: ${a11yScore}/100`);
    console.log('========================================\n');

    if (seoScore < 90) {
      console.error(`FAILED: SEO score (${seoScore}) is below required 90!`);
      const failedSeoAudits = Object.values(lhr.audits).filter(
        (a) =>
          a.score !== null &&
          a.score < 1 &&
          lhr.categories.seo?.auditRefs?.some((r) => r.id === a.id),
      );
      if (failedSeoAudits.length > 0) {
        console.error('Failed SEO audits:');
        for (const audit of failedSeoAudits) {
          console.error(
            ` - [${audit.id}] ${audit.title}: ${audit.explanation || audit.description}`,
          );
        }
      }
      process.exit(1);
    }

    console.log(`SUCCESS: SEO score (${seoScore}) >= 90 requirement met.`);
  } finally {
    if (chrome) {
      await chrome.kill();
    }
    if (serverProcess) {
      console.log('Stopping local next server...');
      serverProcess.kill();
    }
  }
}

runLighthouse().catch((err) => {
  console.error('Error during Lighthouse run:', err);
  if (serverProcess) serverProcess.kill();
  process.exit(1);
});

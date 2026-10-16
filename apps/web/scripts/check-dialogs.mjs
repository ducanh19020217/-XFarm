import { chromium } from 'playwright-core';

const baseUrl = process.env.WEB_URL ?? 'http://localhost:3110';
const apiUrl = process.env.API_URL ?? 'http://localhost:4110/api/v1';
const executablePath = '/usr/bin/google-chrome';
const viewport = { width: 1400, height: 900 };

const dialogChecks = [
  { path: '/admin/users', button: 'Thêm người dùng mới' },
  { path: '/admin/areas', button: 'Thêm khu/lô mới' },
  { path: '/admin/cycles', button: 'Thêm mùa vụ' },
  { path: '/admin/activities', button: 'Ghi nhật ký' },
  { path: '/admin/animals', button: 'Thêm đàn mới' },
];

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport });
context.setDefaultTimeout(30_000);

try {
  const loginResponse = await context.request.post(`${apiUrl}/auth/login`, {
    data: { email: 'admin@xfarm.local', password: 'Admin@123' },
  });
  if (!loginResponse.ok()) throw new Error(`Login failed with HTTP ${loginResponse.status()}`);

  // The API and web use separate localhost ports in the dev slot. Copy the
  // API session cookie to the web origin so Next middleware accepts the login.
  const apiCookies = (await context.request.storageState()).cookies;
  const sessionCookie = apiCookies.find((cookie) => cookie.name === 'session');
  if (!sessionCookie) throw new Error('Login did not return a session cookie');
  await context.addCookies(
    apiCookies.map((cookie) => ({ ...cookie, domain: 'localhost', path: cookie.path || '/' })),
  );
  await context.addCookies(
    apiCookies
      .filter((cookie) => ['access_token', 'session'].includes(cookie.name))
      .map((cookie) => ({ name: cookie.name, value: cookie.value, url: baseUrl })),
  );
  const authCookieHeader = apiCookies
    .filter((cookie) => ['access_token', 'session'].includes(cookie.name))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
  await context.route('**/admin**', (route) =>
    route.continue({
      headers: { ...route.request().headers(), cookie: authCookieHeader },
    }),
  );

  for (const check of dialogChecks) {
    const checkPage = await context.newPage();
    await checkPage.goto(`${baseUrl}${check.path}`, { waitUntil: 'domcontentloaded' });
    await checkPage.waitForTimeout(1_000);
    const trigger = checkPage.getByRole('button', { name: check.button, exact: true });
    await trigger.waitFor({ state: 'visible' });
    await trigger.click();

    const dialog = checkPage.locator('[role="dialog"]');
    await dialog.waitFor({ state: 'visible' });
    const box = await dialog.boundingBox();
    const transform = await dialog.evaluate((element) => getComputedStyle(element).transform);

    if (!box) throw new Error(`${check.path}: dialog has no bounding box`);
    const insideViewport =
      box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= viewport.width &&
      box.y + box.height <= viewport.height;

    if (!insideViewport || transform === 'none') {
      throw new Error(
        `${check.path}: dialog out of viewport or not transformed ` +
          `(x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height}, transform=${transform})`,
      );
    }

    console.log(
      `PASS ${check.path}: x=${box.x.toFixed(1)} y=${box.y.toFixed(1)} ` +
        `w=${box.width.toFixed(1)} h=${box.height.toFixed(1)} transform=${transform}`,
    );
    await checkPage.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    await checkPage.close();
  }
} finally {
  await browser.close();
}

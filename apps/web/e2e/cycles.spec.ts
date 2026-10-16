import { api, expect, loginAs, test } from './fixtures';

test('tạo mùa vụ CROP và chuyển trạng thái đến CLOSED', async ({ page, errors }) => {
  await loginAs(page);
  const sameDatePrefix = `Ổn định thứ tự ${Date.now()}`;
  const areas = await api<{ data: Array<{ id: string }> }>(page, '/areas?pageSize=1');
  const areaId = areas.data[0]?.id;
  expect(areaId).toBeTruthy();
  for (const suffix of ['1', '2', '3']) {
    await api(page, '/cycles', {
      method: 'POST',
      body: JSON.stringify({
        name: `${sameDatePrefix}-${suffix}`,
        kind: 'CROP',
        areaId,
        species: 'Cải E2E',
        startDate: '2026-10-16',
      }),
    });
  }
  const ordered = await api<{ data: Array<{ name: string }> }>(
    page,
    `/cycles?search=${encodeURIComponent(sameDatePrefix)}&pageSize=3`,
  );
  expect(ordered.data.map((cycle) => cycle.name)).toEqual([
    `${sameDatePrefix}-3`,
    `${sameDatePrefix}-2`,
    `${sameDatePrefix}-1`,
  ]);

  await page.goto('/admin/cycles');
  const name = `Vụ E2E ${Date.now()}`;
  await page.getByRole('button', { name: /thêm mùa vụ/i }).click();
  await page.getByLabel('Tên mùa vụ').fill(name);
  await page.locator('#cycle-area').selectOption({ index: 1 });
  await page.locator('#cycle-species').fill('Cải E2E');
  await page.getByRole('button', { name: /tạo mùa vụ/i }).click();
  await page.getByPlaceholder(/tìm theo mã, tên/i).fill(name);
  await expect(page.getByText(name)).toBeVisible();
  await page.getByText(name).locator('xpath=ancestor::tr').getByRole('link').click();
  for (const status of [/bắt đầu hoạt động/i, /bắt đầu thu hoạch/i, /đóng mùa vụ/i]) {
    await page.getByRole('button', { name: status }).click();
    await page.getByRole('button', { name: /xác nhận/i }).click();
  }
  await expect(page.getByRole('button', { name: /ghi nhật ký/i })).toHaveCount(0);
  errors.assertClean();
});

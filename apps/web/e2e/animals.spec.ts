import { expect, api, loginAs, test } from './fixtures';

test('tạo cá thể, ghi WEIGHING và chặn sự kiện sau khi chết', async ({ page, errors }) => {
  await loginAs(page);
  const areas = await api<{ data: Array<{ id: string }> }>(page, '/areas?pageSize=1');
  const areaId = areas.data[0]?.id;
  expect(areaId).toBeTruthy();
  const cycleResult = await api<{ data: { id: string } }>(page, '/cycles', {
    method: 'POST',
    body: JSON.stringify({
      name: `Lứa E2E ${Date.now()}`,
      kind: 'LIVESTOCK',
      areaId,
      species: 'Gà E2E',
      startDate: new Date().toISOString(),
    }),
  });
  const groupResult = await api<{ data: { id: string } }>(page, '/animal-groups', {
    method: 'POST',
    body: JSON.stringify({
      cycleId: cycleResult.data.id,
      areaId,
      species: 'Gà E2E',
      headCount: 1,
    }),
  });
  const tag = `E2E-${Date.now()}`;
  const animalResult = await api<{ data: { id: string } }>(page, '/animals', {
    method: 'POST',
    body: JSON.stringify({
      tag,
      species: 'Gà E2E',
      sex: 'UNKNOWN',
      status: 'ALIVE',
      groupId: groupResult.data.id,
    }),
  });
  const animal = animalResult.data;

  await page.goto('/admin/animals');
  await expect(page.getByRole('button', { name: 'Đàn vật nuôi' })).toBeVisible();
  await page.getByRole('button', { name: /cá thể vật nuôi/i }).click();
  await expect(page.getByText(tag)).toBeVisible();
  await page.getByRole('link', { name: tag, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/animals/${animal.id}`));
  await page.getByRole('button', { name: 'Ghi sự kiện', exact: true }).click();
  await page.getByLabel('Loại sự kiện').click();
  await page.getByRole('option', { name: /cân trọng lượng/i }).click();
  await page.getByLabel(/trọng lượng/i).fill('12.5');
  await page.getByRole('button', { name: /lưu sự kiện|ghi sự kiện/i }).click();
  await expect(page.getByText(/12,5 kg|12.5 kg/i)).toBeVisible();

  await api(page, `/animals/${animal.id}/events`, {
    method: 'POST',
    body: JSON.stringify({
      type: 'DEATH',
      date: new Date().toISOString(),
      data: { cause: 'E2E' },
    }),
  });
  await page.reload();
  await expect(page.getByText('Đã chết').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /ghi sự kiện/i })).toHaveCount(0);
  errors.assertClean();
});

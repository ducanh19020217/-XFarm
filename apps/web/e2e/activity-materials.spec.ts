import { expect, loginAs, test } from './fixtures';

test.describe('Nhật ký sản xuất có vật tư sử dụng', () => {
  test.fixme('ghi bón phân dùng 3 kg thì tồn NPK giảm 3 (Chờ API p2-activity-materials và phase-2-inventory merge vào nhánh)', async ({
    page,
    errors,
  }) => {
    await loginAs(page, 'OWNER');
    await page.goto('/admin/activities');

    // Mở dialog ghi nhật ký
    await page.getByRole('button', { name: /ghi nhật ký/i }).click();

    // Chọn khu/lô
    await page.getByLabel('Khu/lô *').selectOption({ index: 1 });

    // Chọn loại bón phân FERTILIZING
    await page.getByLabel('Loại nhật ký *').selectOption('FERTILIZING');

    // Form tự động gợi ý nhóm FERTILIZER (Phân NPK 16-16-8)
    // Điền số lượng 3 kg
    const qtyInput = page.getByLabel('Số lượng vật tư').first();
    await qtyInput.fill('3');

    // Lưu nhật ký
    await page.getByRole('button', { name: /lưu nhật ký/i }).click();

    // Kiểm tra dòng nhật ký bón phân xuất hiện trong bảng và có vật tư NPK
    await expect(page.getByRole('cell', { name: /bón phân/i }).first()).toBeVisible();
    await expect(page.getByText(/phân npk 16-16-8/i).first()).toBeVisible();

    // Kiểm tra tồn kho NPK giảm 3 (từ 10 xuống 7 kg)
    await page.goto('/admin/inventory');
    await expect(page.getByText(/7\s*kg/i)).toBeVisible();

    errors.assertClean();
  });
});

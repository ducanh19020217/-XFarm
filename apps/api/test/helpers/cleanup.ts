import { prisma as defaultPrisma, PrismaClient } from '@xfarm/db';

type DatabaseClient = PrismaClient;

/**
 * Dọn toàn bộ dữ liệu test theo thứ tự từ bảng con đến bảng cha.
 * Khi thêm bảng có FK mới, cập nhật thứ tự tại một nơi duy nhất.
 */
export async function cleanupDatabase(client: DatabaseClient = defaultPrisma): Promise<void> {
  await client.$transaction(
    async (tx) => {
      await tx.payroll.deleteMany();
      await tx.attendance.deleteMany();
      await tx.task.deleteMany();
      await tx.payment.deleteMany();
      await tx.booking.deleteMany();
      await tx.tourSlot.deleteMany();
      await tx.tour.deleteMany();
      await tx.salesOrderLine.deleteMany();
      await tx.salesOrder.deleteMany();
      await tx.customer.deleteMany();
      await tx.transaction.deleteMany();
      await tx.financeCategory.updateMany({ data: { parentId: null } });
      await tx.financeCategory.deleteMany();
      await tx.product.deleteMany();
      await tx.harvestLot.deleteMany();
      await tx.activityMaterial.deleteMany();
      await tx.stockMove.deleteMany();
      await tx.stockLot.deleteMany();
      await tx.purchaseOrderLine.deleteMany();
      await tx.purchaseOrder.deleteMany();
      await tx.supplier.deleteMany();
      await tx.alert.deleteMany();
      await tx.animalEvent.deleteMany();
      await tx.animal.deleteMany();
      await tx.animalGroup.deleteMany();
      await tx.activity.deleteMany();
      await tx.cycle.deleteMany();
      // The shared test database can contain IoT rows from another worktree.
      // Delete them when present so their Area FK does not block production cleanup.
      await tx.$executeRawUnsafe(`
        DO $$
        DECLARE table_name text;
        BEGIN
          FOREACH table_name IN ARRAY ARRAY['sensor_readings', 'alerts_rules', 'sensors', 'equipment', 'maintenance_logs', 'maintenance_schedules'] LOOP
            IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
              EXECUTE format('DELETE FROM %I', table_name);
            END IF;
          END LOOP;
        END $$;
      `);
      await tx.area.deleteMany();
      await tx.employee.deleteMany();
      await tx.auditLog.deleteMany();
      await tx.refreshToken.deleteMany();
      await tx.media.deleteMany();
      await tx.post.deleteMany();
      await tx.page.deleteMany();
      await tx.siteSetting.deleteMany();
      await tx.sequence.deleteMany();
      await tx.item.deleteMany();
      await tx.warehouse.deleteMany();
      await tx.user.deleteMany();
    },
    { maxWait: 10000, timeout: 20000 },
  );
}

export async function cleanupInventoryData(
  client: DatabaseClient = defaultPrisma,
  input: { itemIds?: string[]; warehouseIds?: string[] } = {},
): Promise<void> {
  const { itemIds = [], warehouseIds = [] } = input;
  const itemFilter = itemIds.length > 0 ? { itemId: { in: itemIds } } : undefined;
  const warehouseFilter =
    warehouseIds.length > 0
      ? { OR: [{ fromWarehouseId: { in: warehouseIds } }, { toWarehouseId: { in: warehouseIds } }] }
      : undefined;

  await client.$transaction(async (tx) => {
    if (itemFilter || warehouseFilter) {
      await tx.stockMove.deleteMany({
        where: {
          ...(itemFilter ?? {}),
          ...(warehouseFilter ?? {}),
        },
      });
    }
    if (itemFilter) {
      await tx.stockLot.deleteMany({ where: itemFilter });
      await tx.item.deleteMany({ where: { id: { in: itemIds } } });
    }
    if (warehouseIds.length > 0) {
      await tx.warehouse.deleteMany({ where: { id: { in: warehouseIds } } });
    }
  });
}

export async function cleanupProductionData(client: DatabaseClient = defaultPrisma): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.payroll.deleteMany();
    await tx.attendance.deleteMany();
    await tx.task.deleteMany();
    await tx.harvestLot.deleteMany();
    await tx.activityMaterial.deleteMany();
    await tx.stockMove.deleteMany();
    await tx.stockLot.deleteMany();
    await tx.animalEvent.deleteMany();
    await tx.animal.deleteMany();
    await tx.animalGroup.deleteMany();
    await tx.activity.deleteMany();
    await tx.cycle.deleteMany();
    await tx.$executeRawUnsafe(`
      DO $$
      DECLARE table_name text;
      BEGIN
        FOREACH table_name IN ARRAY ARRAY['sensor_readings', 'alerts_rules', 'sensors', 'equipment', 'maintenance_logs', 'maintenance_schedules'] LOOP
          IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
            EXECUTE format('DELETE FROM %I', table_name);
          END IF;
        END LOOP;
      END $$;
    `);
    await tx.area.updateMany({ data: { parentId: null } });
    await tx.area.deleteMany();
    await tx.employee.deleteMany();
    await tx.sequence.deleteMany();
  });
}

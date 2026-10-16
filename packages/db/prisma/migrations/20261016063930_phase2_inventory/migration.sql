-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('SEED', 'FERTILIZER', 'PESTICIDE', 'FEED', 'VETERINARY', 'TOOL', 'PACKAGING', 'PRODUCE', 'LIVESTOCK_PRODUCT', 'AQUA_PRODUCT', 'OTHER');

-- CreateEnum
CREATE TYPE "StockMoveType" AS ENUM ('IN', 'OUT', 'TRANSFER', 'ADJUST');

-- CreateEnum
CREATE TYPE "StockMoveDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'ORDERED', 'PARTIAL', 'RECEIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ItemCategory" NOT NULL,
    "unit" TEXT NOT NULL,
    "minStock" DECIMAL(18,3),
    "isSellable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "areaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_lots" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotCode" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "harvestLotId" TEXT,
    "warehouseId" TEXT,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_moves" (
    "id" TEXT NOT NULL,
    "type" "StockMoveType" NOT NULL,
    "itemId" TEXT NOT NULL,
    "stockLotId" TEXT,
    "fromWarehouseId" TEXT,
    "toWarehouseId" TEXT,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "direction" "StockMoveDirection",
    "refType" TEXT,
    "refId" TEXT,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_materials" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "stockLotId" TEXT,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "taxCode" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" DECIMAL(18,2) NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_lines" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "receivedQty" DECIMAL(18,3) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "items_sku_key" ON "items"("sku");

-- CreateIndex
CREATE INDEX "items_category_isActive_idx" ON "items"("category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE INDEX "warehouses_areaId_idx" ON "warehouses"("areaId");

-- CreateIndex
CREATE INDEX "stock_lots_itemId_expiryDate_idx" ON "stock_lots"("itemId", "expiryDate");

-- CreateIndex
CREATE INDEX "stock_lots_warehouseId_idx" ON "stock_lots"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_lots_itemId_lotCode_key" ON "stock_lots"("itemId", "lotCode");

-- CreateIndex
CREATE INDEX "stock_moves_itemId_stockLotId_idx" ON "stock_moves"("itemId", "stockLotId");

-- CreateIndex
CREATE INDEX "stock_moves_refType_refId_idx" ON "stock_moves"("refType", "refId");

-- CreateIndex
CREATE INDEX "stock_moves_fromWarehouseId_idx" ON "stock_moves"("fromWarehouseId");

-- CreateIndex
CREATE INDEX "stock_moves_toWarehouseId_idx" ON "stock_moves"("toWarehouseId");

-- CreateIndex
CREATE INDEX "activity_materials_activityId_idx" ON "activity_materials"("activityId");

-- CreateIndex
CREATE INDEX "activity_materials_itemId_idx" ON "activity_materials"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_code_key" ON "purchase_orders"("code");

-- CreateIndex
CREATE INDEX "purchase_orders_supplierId_status_idx" ON "purchase_orders"("supplierId", "status");

-- CreateIndex
CREATE INDEX "purchase_order_lines_poId_idx" ON "purchase_order_lines"("poId");

-- CreateIndex
CREATE INDEX "purchase_order_lines_itemId_idx" ON "purchase_order_lines"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "alerts_dedupeKey_key" ON "alerts"("dedupeKey");

-- CreateIndex
CREATE INDEX "alerts_ruleId_idx" ON "alerts"("ruleId");

-- CreateIndex
CREATE INDEX "alerts_refType_refId_idx" ON "alerts"("refType", "refId");

-- CreateIndex
CREATE INDEX "alerts_readAt_idx" ON "alerts"("readAt");

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_stockLotId_fkey" FOREIGN KEY ("stockLotId") REFERENCES "stock_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_materials" ADD CONSTRAINT "activity_materials_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_materials" ADD CONSTRAINT "activity_materials_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_materials" ADD CONSTRAINT "activity_materials_stockLotId_fkey" FOREIGN KEY ("stockLotId") REFERENCES "stock_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_materials" ADD CONSTRAINT "activity_materials_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Quantities are stored as positive magnitudes. ADJUST uses direction to select
-- whether the magnitude is added to or removed from the warehouse balance.
ALTER TABLE "stock_moves"
  ADD CONSTRAINT "stock_moves_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "activity_materials"
  ADD CONSTRAINT "activity_materials_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "purchase_order_lines"
  ADD CONSTRAINT "purchase_order_lines_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "purchase_order_lines"
  ADD CONSTRAINT "purchase_order_lines_received_nonnegative" CHECK ("receivedQty" >= 0);

CREATE OR REPLACE VIEW "stock_balances" AS
WITH movements AS (
  SELECT "itemId", "stockLotId", "toWarehouseId" AS "warehouseId", "quantity" AS quantity
  FROM "stock_moves"
  WHERE "type" = 'IN' AND "toWarehouseId" IS NOT NULL
  UNION ALL
  SELECT "itemId", "stockLotId", "fromWarehouseId", -"quantity"
  FROM "stock_moves"
  WHERE "type" = 'OUT' AND "fromWarehouseId" IS NOT NULL
  UNION ALL
  SELECT "itemId", "stockLotId", "fromWarehouseId", -"quantity"
  FROM "stock_moves"
  WHERE "type" = 'TRANSFER' AND "fromWarehouseId" IS NOT NULL
  UNION ALL
  SELECT "itemId", "stockLotId", "toWarehouseId", "quantity"
  FROM "stock_moves"
  WHERE "type" = 'TRANSFER' AND "toWarehouseId" IS NOT NULL
  UNION ALL
  SELECT "itemId", "stockLotId", "toWarehouseId", CASE WHEN "direction" = 'IN' THEN "quantity" ELSE -"quantity" END
  FROM "stock_moves"
  WHERE "type" = 'ADJUST' AND "toWarehouseId" IS NOT NULL
)
SELECT "itemId", "stockLotId", "warehouseId", SUM(quantity) AS quantity
FROM movements
GROUP BY "itemId", "stockLotId", "warehouseId";

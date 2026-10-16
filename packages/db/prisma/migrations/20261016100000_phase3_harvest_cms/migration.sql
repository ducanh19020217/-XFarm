-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "harvest_lots" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "traceCode" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "harvestedAt" TIMESTAMP(3) NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "qualityGrade" TEXT,
    "certification" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "harvest_lots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "mediaIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "coverMediaId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "harvest_lots_code_key" ON "harvest_lots"("code");
CREATE UNIQUE INDEX "harvest_lots_traceCode_key" ON "harvest_lots"("traceCode");
CREATE UNIQUE INDEX "harvest_lots_activityId_key" ON "harvest_lots"("activityId");
CREATE INDEX "harvest_lots_cycleId_harvestedAt_idx" ON "harvest_lots"("cycleId", "harvestedAt");
CREATE INDEX "harvest_lots_itemId_idx" ON "harvest_lots"("itemId");
CREATE INDEX "harvest_lots_warehouseId_idx" ON "harvest_lots"("warehouseId");
CREATE INDEX "harvest_lots_isPublic_harvestedAt_idx" ON "harvest_lots"("isPublic", "harvestedAt");
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE INDEX "products_isPublished_sortOrder_idx" ON "products"("isPublished", "sortOrder");
CREATE INDEX "products_itemId_idx" ON "products"("itemId");
CREATE UNIQUE INDEX "posts_slug_key" ON "posts"("slug");
CREATE INDEX "posts_status_publishedAt_idx" ON "posts"("status", "publishedAt");
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");
CREATE UNIQUE INDEX "site_settings_key_key" ON "site_settings"("key");
CREATE UNIQUE INDEX "stock_lots_harvestLotId_key" ON "stock_lots"("harvestLotId");

ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_harvestLotId_fkey" FOREIGN KEY ("harvestLotId") REFERENCES "harvest_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "harvest_lots" ADD CONSTRAINT "harvest_lots_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "harvest_lots" ADD CONSTRAINT "harvest_lots_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "harvest_lots" ADD CONSTRAINT "harvest_lots_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "harvest_lots" ADD CONSTRAINT "harvest_lots_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "harvest_lots" ADD CONSTRAINT "harvest_lots_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "posts" ADD CONSTRAINT "posts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pages" ADD CONSTRAINT "pages_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

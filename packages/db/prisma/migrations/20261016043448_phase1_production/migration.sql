-- CreateEnum
CREATE TYPE "AreaType" AS ENUM ('ZONE', 'FIELD', 'GREENHOUSE', 'BARN', 'POND', 'VISITOR_ZONE', 'WAREHOUSE_ZONE');

-- CreateEnum
CREATE TYPE "CycleKind" AS ENUM ('CROP', 'LIVESTOCK', 'AQUA');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('PLANNED', 'ACTIVE', 'HARVESTING', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('SOWING', 'PLANTING', 'FERTILIZING', 'SPRAYING', 'IRRIGATION', 'PRUNING', 'WEEDING', 'FEEDING', 'VACCINATION', 'TREATMENT', 'WATER_TEST', 'STOCKING', 'MORTALITY', 'WEIGHING', 'HARVEST', 'CLEANING', 'OTHER');

-- CreateEnum
CREATE TYPE "AnimalSex" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AnimalStatus" AS ENUM ('ALIVE', 'SOLD', 'DEAD');

-- CreateEnum
CREATE TYPE "AnimalEventType" AS ENUM ('VACCINATION', 'TREATMENT', 'BREEDING', 'BIRTH', 'WEIGHING', 'DEATH', 'SALE');

-- CreateTable
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AreaType" NOT NULL,
    "parentId" TEXT,
    "areaM2" DECIMAL(18,3),
    "geojson" JSONB,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "CycleKind" NOT NULL,
    "areaId" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "variety" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "expectedEndDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "CycleStatus" NOT NULL DEFAULT 'PLANNED',
    "expectedYield" DECIMAL(18,3),
    "yieldUnit" TEXT,
    "initialQuantity" DECIMAL(18,3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT,
    "areaId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedById" TEXT,
    "quantity" DECIMAL(18,3),
    "unit" TEXT,
    "data" JSONB,
    "notes" TEXT,
    "mediaIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animal_groups" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "headCount" INTEGER NOT NULL DEFAULT 0,
    "areaId" TEXT NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animal_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animals" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "groupId" TEXT,
    "species" TEXT NOT NULL,
    "breed" TEXT,
    "sex" "AnimalSex" NOT NULL DEFAULT 'UNKNOWN',
    "birthDate" TIMESTAMP(3),
    "status" "AnimalStatus" NOT NULL DEFAULT 'ALIVE',
    "motherId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animal_events" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "type" "AnimalEventType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "animal_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "areas_code_key" ON "areas"("code");

-- CreateIndex
CREATE INDEX "areas_parentId_idx" ON "areas"("parentId");

-- CreateIndex
CREATE INDEX "areas_type_idx" ON "areas"("type");

-- CreateIndex
CREATE UNIQUE INDEX "cycles_code_key" ON "cycles"("code");

-- CreateIndex
CREATE INDEX "cycles_areaId_status_idx" ON "cycles"("areaId", "status");

-- CreateIndex
CREATE INDEX "cycles_status_idx" ON "cycles"("status");

-- CreateIndex
CREATE INDEX "activities_cycleId_performedAt_idx" ON "activities"("cycleId", "performedAt");

-- CreateIndex
CREATE INDEX "activities_areaId_performedAt_idx" ON "activities"("areaId", "performedAt");

-- CreateIndex
CREATE INDEX "activities_type_idx" ON "activities"("type");

-- CreateIndex
CREATE UNIQUE INDEX "animal_groups_code_key" ON "animal_groups"("code");

-- CreateIndex
CREATE INDEX "animal_groups_cycleId_idx" ON "animal_groups"("cycleId");

-- CreateIndex
CREATE INDEX "animal_groups_areaId_idx" ON "animal_groups"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "animals_tag_key" ON "animals"("tag");

-- CreateIndex
CREATE INDEX "animals_groupId_idx" ON "animals"("groupId");

-- CreateIndex
CREATE INDEX "animals_motherId_idx" ON "animals"("motherId");

-- CreateIndex
CREATE INDEX "animals_status_idx" ON "animals"("status");

-- CreateIndex
CREATE INDEX "animal_events_animalId_date_idx" ON "animal_events"("animalId", "date");

-- CreateIndex
CREATE INDEX "animal_events_type_idx" ON "animal_events"("type");

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_groups" ADD CONSTRAINT "animal_groups_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_groups" ADD CONSTRAINT "animal_groups_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_groups" ADD CONSTRAINT "animal_groups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "animal_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "animals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_events" ADD CONSTRAINT "animal_events_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "animal_events" ADD CONSTRAINT "animal_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes for the paginated/list and time-series workload measured by perf-probe.
CREATE INDEX "activities_performedById_performedAt_idx" ON "activities"("performedById", "performedAt");
CREATE INDEX "stock_moves_movedAt_idx" ON "stock_moves"("movedAt");
CREATE INDEX "stock_moves_fromWarehouseId_movedAt_idx" ON "stock_moves"("fromWarehouseId", "movedAt");
CREATE INDEX "stock_moves_toWarehouseId_movedAt_idx" ON "stock_moves"("toWarehouseId", "movedAt");
CREATE INDEX "transactions_categoryId_date_idx" ON "transactions"("categoryId", "date");
CREATE INDEX "bookings_slotId_createdAt_idx" ON "bookings"("slotId", "createdAt");

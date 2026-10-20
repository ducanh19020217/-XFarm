-- Dashboard aggregate query indexes
CREATE INDEX "stock_moves_itemId_stockLotId_type_idx" ON "stock_moves"("itemId", "stockLotId", "type");
CREATE INDEX "transactions_type_date_idx" ON "transactions"("type", "date");
CREATE INDEX "tour_slots_startAt_isActive_idx" ON "tour_slots"("startAt", "isActive");

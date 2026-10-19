export interface StockBalanceItem {
  id?: string;
  itemId: string;
  itemSku?: string;
  itemName: string;
  category: string;
  unit: string;
  warehouseId: string;
  warehouseName?: string;
  stockLotId?: string | null;
  lotCode?: string | null;
  expiryDate?: string | null;
  quantity: number;
  unitCost: number;
  totalValue?: number;
  totalCost?: number;
}

export interface StockBalancesResponse {
  data: StockBalanceItem[];
  total: number;
  page: number;
  pageSize: number;
  totalAmount?: number;
  totalExpiring?: number;
}

export interface StockMoveItem {
  id: string;
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUST' | string;
  direction?: 'IN' | 'OUT' | null;
  itemId: string;
  itemSku?: string;
  itemName?: string;
  unit?: string;
  stockLotId?: string | null;
  lotCode?: string | null;
  fromWarehouseId?: string | null;
  fromWarehouseName?: string | null;
  toWarehouseId?: string | null;
  toWarehouseName?: string | null;
  quantity: number;
  unitCost: number;
  refType?: string | null;
  refId?: string | null;
  movedAt: string;
  notes?: string | null;
  createdAt?: string;
}

export interface StockMovesResponse {
  data: StockMoveItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StockDocumentLine {
  id?: string;
  itemId: string;
  itemSku?: string;
  itemName?: string;
  unit?: string;
  stockLotId?: string | null;
  lotCode?: string | null;
  expiryDate?: string | null;
  quantity: number;
  unitCost?: number;
  amount?: number;
  bookQuantity?: number;
  actualQuantity?: number;
  diffQuantity?: number;
}

export interface StockDocumentItem {
  code: string;
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUST' | string;
  refType?: string | null;
  refId?: string | null;
  warehouseId?: string | null;
  warehouseName?: string | null;
  fromWarehouseId?: string | null;
  fromWarehouseName?: string | null;
  toWarehouseId?: string | null;
  toWarehouseName?: string | null;
  movedAt: string;
  notes?: string | null;
  totalLines?: number;
  totalAmount?: number;
  totalQuantity?: number;
  lines?: StockDocumentLine[];
}

export interface StockDocumentsResponse {
  data: StockDocumentItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  areaId?: string | null;
}

export interface ItemRecord {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  minStock?: number | null;
  isSellable?: boolean;
  isActive?: boolean;
}

import { PurchaseOrderStatus } from '@xfarm/shared';

export interface SupplierOption {
  id: string;
  code: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  taxCode?: string | null;
}

export interface ItemOption {
  id: string;
  sku: string;
  name: string;
  unit: string;
}

export interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}

export interface PurchaseOrderLineItem {
  id: string;
  poId: string;
  itemId: string;
  item?: {
    id: string;
    sku: string;
    name: string;
    unit: string;
  };
  quantity: number | string;
  unitPrice: number | string;
  receivedQty: number | string;
}

export interface PurchaseOrderItem {
  id: string;
  code: string;
  supplierId: string;
  supplier?: {
    id: string;
    code?: string;
    name: string;
    phone?: string | null;
    address?: string | null;
    taxCode?: string | null;
  };
  status: PurchaseOrderStatus;
  orderDate: string;
  total: number | string;
  paidAmount?: number | string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lines?: PurchaseOrderLineItem[];
}

export interface PurchaseOrderDetail extends PurchaseOrderItem {
  lines: PurchaseOrderLineItem[];
}

export interface PurchaseOrderListResponse {
  data: PurchaseOrderItem[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface CreatePOLineFormValue {
  itemId: string;
  quantity: number | '';
  unitPrice: number | '';
}

export interface CreatePOFormValues {
  supplierId: string;
  orderDate: string;
  notes: string;
  lines: CreatePOLineFormValue[];
}

export interface ReceivePOLineFormValue {
  lineId: string;
  quantity: number | '';
  lotCode?: string;
  expiryDate?: string;
  unitCost?: number | '';
}

export interface ReceivePOFormValues {
  warehouseId: string;
  lines: ReceivePOLineFormValue[];
}

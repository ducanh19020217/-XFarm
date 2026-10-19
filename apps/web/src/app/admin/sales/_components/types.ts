import {
  CustomerType,
  PaymentMethod,
  PaymentStatus,
  SalesChannel,
  SalesOrderStatus,
} from '@xfarm/shared';

export interface CustomerRecord {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  type: CustomerType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    salesOrders: number;
  };
  totalPurchase?: number | string;
  debt?: number | string;
}

export interface CustomerDetailRecord extends CustomerRecord {
  totalPurchase: number | string;
  debt: number | string;
}

export interface SalesOrderLineRecord {
  id: string;
  orderId: string;
  productId?: string | null;
  itemId: string;
  stockLotId?: string | null;
  quantity: number | string;
  unitPrice: number | string;
  item?: {
    id: string;
    sku: string;
    name: string;
    unit: string;
  };
  product?: {
    id: string;
    slug: string;
    name: string;
    price: number | string;
    unit: string;
  } | null;
  stockLot?: {
    id: string;
    lotCode: string;
  } | null;
}

export interface PaymentRecord {
  id: string;
  code?: string;
  orderId?: string | null;
  amount: number | string;
  method: PaymentMethod;
  paidAt: string;
  transactionId?: string | null;
  notes?: string | null;
}

export interface StockMoveRecord {
  id: string;
  type: string;
  itemId: string;
  stockLotId?: string | null;
  fromWarehouseId?: string | null;
  toWarehouseId?: string | null;
  quantity: number | string;
  unitCost: number | string;
  refType?: string | null;
  refId?: string | null;
  movedAt: string;
  createdAt: string;
  stockLot?: {
    id: string;
    lotCode: string;
  } | null;
}

export interface SalesOrderRecord {
  id: string;
  code: string;
  customerId: string;
  channel: SalesChannel;
  status: SalesOrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  shippingAddress: string;
  subtotal: number | string;
  discount: number | string;
  shippingFee: number | string;
  total: number | string;
  warehouseId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  customer: {
    id: string;
    code: string;
    name: string;
    phone: string;
    email?: string | null;
    address?: string | null;
    type: CustomerType;
  };
  warehouse?: {
    id: string;
    code: string;
    name: string;
  } | null;
  lines: SalesOrderLineRecord[];
  payments: PaymentRecord[];
  stockMoves?: StockMoveRecord[];
  _count?: {
    lines: number;
    payments: number;
  };
}

export interface ProductOption {
  id: string;
  slug: string;
  name: string;
  itemId: string;
  price: number;
  unit: string;
  isPublished?: boolean;
}

export interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}

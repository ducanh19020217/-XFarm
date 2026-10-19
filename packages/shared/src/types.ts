export enum Role {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  SALES = 'SALES',
  WORKER = 'WORKER',
}

export enum AreaType {
  ZONE = 'ZONE',
  FIELD = 'FIELD',
  GREENHOUSE = 'GREENHOUSE',
  BARN = 'BARN',
  POND = 'POND',
  VISITOR_ZONE = 'VISITOR_ZONE',
  WAREHOUSE_ZONE = 'WAREHOUSE_ZONE',
}

export enum CycleKind {
  CROP = 'CROP',
  LIVESTOCK = 'LIVESTOCK',
  AQUA = 'AQUA',
}

export enum CycleStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  HARVESTING = 'HARVESTING',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum ActivityType {
  SOWING = 'SOWING',
  PLANTING = 'PLANTING',
  FERTILIZING = 'FERTILIZING',
  SPRAYING = 'SPRAYING',
  IRRIGATION = 'IRRIGATION',
  PRUNING = 'PRUNING',
  WEEDING = 'WEEDING',
  FEEDING = 'FEEDING',
  VACCINATION = 'VACCINATION',
  TREATMENT = 'TREATMENT',
  WATER_TEST = 'WATER_TEST',
  STOCKING = 'STOCKING',
  MORTALITY = 'MORTALITY',
  WEIGHING = 'WEIGHING',
  HARVEST = 'HARVEST',
  CLEANING = 'CLEANING',
  OTHER = 'OTHER',
}

export enum AnimalSex {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  UNKNOWN = 'UNKNOWN',
}

export enum AnimalStatus {
  ALIVE = 'ALIVE',
  SOLD = 'SOLD',
  DEAD = 'DEAD',
}

export enum AnimalEventType {
  VACCINATION = 'VACCINATION',
  TREATMENT = 'TREATMENT',
  BREEDING = 'BREEDING',
  BIRTH = 'BIRTH',
  WEIGHING = 'WEIGHING',
  DEATH = 'DEATH',
  SALE = 'SALE',
}

export enum ItemCategory {
  SEED = 'SEED',
  FERTILIZER = 'FERTILIZER',
  PESTICIDE = 'PESTICIDE',
  FEED = 'FEED',
  VETERINARY = 'VETERINARY',
  TOOL = 'TOOL',
  PACKAGING = 'PACKAGING',
  PRODUCE = 'PRODUCE',
  LIVESTOCK_PRODUCT = 'LIVESTOCK_PRODUCT',
  AQUA_PRODUCT = 'AQUA_PRODUCT',
  OTHER = 'OTHER',
}

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  [ItemCategory.SEED]: 'Hạt giống / Cây giống',
  [ItemCategory.FERTILIZER]: 'Phân bón',
  [ItemCategory.PESTICIDE]: 'Thuốc BVTV',
  [ItemCategory.FEED]: 'Thức ăn chăn nuôi',
  [ItemCategory.VETERINARY]: 'Thuốc thú y / Thủy sản',
  [ItemCategory.TOOL]: 'Công cụ / Dụng cụ',
  [ItemCategory.PACKAGING]: 'Bao bì / Đóng gói',
  [ItemCategory.PRODUCE]: 'Nông sản',
  [ItemCategory.LIVESTOCK_PRODUCT]: 'Sản phẩm chăn nuôi',
  [ItemCategory.AQUA_PRODUCT]: 'Sản phẩm thủy sản',
  [ItemCategory.OTHER]: 'Khác',
};

export enum StockMoveType {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER = 'TRANSFER',
  ADJUST = 'ADJUST',
}

export enum StockMoveDirection {
  IN = 'IN',
  OUT = 'OUT',
}

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  ORDERED = 'ORDERED',
  PARTIAL = 'PARTIAL',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum AlertType {
  LOW_STOCK = 'LOW_STOCK',
  LOT_EXPIRING = 'LOT_EXPIRING',
  LOT_EXPIRED = 'LOT_EXPIRED',
}

export enum CustomerType {
  RETAIL = 'RETAIL',
  WHOLESALE = 'WHOLESALE',
  AGENT = 'AGENT',
}

export enum SalesChannel {
  ADMIN = 'ADMIN',
  WEBSHOP = 'WEBSHOP',
}

export enum SalesOrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PACKING = 'PACKING',
  SHIPPING = 'SHIPPING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
}

export enum PaymentMethod {
  COD = 'COD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
  VNPAY = 'VNPAY',
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

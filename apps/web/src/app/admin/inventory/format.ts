import { ItemCategory, StockMoveType } from '@xfarm/shared';

export function formatNumber(
  val: number | string | null | undefined,
  maximumFractionDigits = 3,
): string {
  if (val == null || val === '') return '0';
  const num = typeof val === 'string' ? Number(val) : val;
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString('vi-VN', {
    maximumFractionDigits,
  });
}

export function formatCurrency(val: number | string | null | undefined): string {
  if (val == null || val === '') return '0 ₫';
  const num = typeof val === 'string' ? Number(val) : val;
  if (Number.isNaN(num)) return '0 ₫';
  return `${num.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} ₫`;
}

export function formatDate(val: string | Date | null | undefined): string {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('vi-VN');
  } catch {
    return '—';
  }
}

export function formatDateTime(val: string | Date | null | undefined): string {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export interface ExpiryStatus {
  variant: 'destructive' | 'warning' | 'secondary' | 'outline';
  label: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
  formattedDate: string;
}

export function getExpiryStatus(expiryDate: string | Date | null | undefined): ExpiryStatus | null {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate);
  if (Number.isNaN(exp.getTime())) return null;

  const now = new Date();
  const expZero = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
  const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = expZero.getTime() - nowZero.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const formattedDate = exp.toLocaleDateString('vi-VN');

  if (diffDays < 0) {
    return {
      variant: 'destructive',
      label: 'Đã hết hạn',
      isExpired: true,
      isExpiringSoon: false,
      formattedDate,
    };
  }

  if (diffDays <= 30) {
    return {
      variant: 'warning',
      label: diffDays === 0 ? 'Hết hạn hôm nay' : `Còn ${diffDays} ngày`,
      isExpired: false,
      isExpiringSoon: true,
      formattedDate,
    };
  }

  return {
    variant: 'outline',
    label: formattedDate,
    isExpired: false,
    isExpiringSoon: false,
    formattedDate,
  };
}

export const categoryLabels: Record<string, string> = {
  [ItemCategory.SEED]: 'Hạt giống',
  [ItemCategory.FERTILIZER]: 'Phân bón',
  [ItemCategory.PESTICIDE]: 'Thuốc BVTV',
  [ItemCategory.FEED]: 'Thức ăn chăn nuôi',
  [ItemCategory.VETERINARY]: 'Thuốc thú y',
  [ItemCategory.TOOL]: 'Dụng cụ / Công cụ',
  [ItemCategory.PACKAGING]: 'Bao bì',
  [ItemCategory.PRODUCE]: 'Nông sản',
  [ItemCategory.LIVESTOCK_PRODUCT]: 'Sản phẩm chăn nuôi',
  [ItemCategory.AQUA_PRODUCT]: 'Thủy sản',
  [ItemCategory.OTHER]: 'Khác',
};

export const moveTypeLabels: Record<string, string> = {
  [StockMoveType.IN]: 'Nhập kho',
  [StockMoveType.OUT]: 'Xuất kho',
  [StockMoveType.TRANSFER]: 'Điều chuyển',
  [StockMoveType.ADJUST]: 'Kiểm kê',
  RECEIPT: 'Nhập kho',
  ISSUE: 'Xuất kho',
  TRANSFER_IN: 'Nhập điều chuyển',
  TRANSFER_OUT: 'Xuất điều chuyển',
};

export function getDocumentTypeInfo(
  code: string,
  type?: string,
): { label: string; badgeVariant: 'default' | 'secondary' | 'info' | 'warning' } {
  if (code.startsWith('NK-') || type === 'IN' || type === 'RECEIPT') {
    return { label: 'Phiếu nhập', badgeVariant: 'default' };
  }
  if (code.startsWith('XK-') || type === 'OUT' || type === 'ISSUE') {
    return { label: 'Phiếu xuất', badgeVariant: 'secondary' };
  }
  if (code.startsWith('DC-') || type === 'TRANSFER') {
    return { label: 'Điều chuyển', badgeVariant: 'info' };
  }
  if (code.startsWith('KK-') || type === 'ADJUST' || type === 'COUNT') {
    return { label: 'Kiểm kê', badgeVariant: 'warning' };
  }
  return { label: type || 'Khác', badgeVariant: 'secondary' };
}

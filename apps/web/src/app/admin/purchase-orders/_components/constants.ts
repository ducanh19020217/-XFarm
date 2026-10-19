import { PurchaseOrderStatus } from '@xfarm/shared';

export const poStatusLabels: Record<PurchaseOrderStatus, string> = {
  [PurchaseOrderStatus.DRAFT]: 'Nháp',
  [PurchaseOrderStatus.ORDERED]: 'Đã đặt',
  [PurchaseOrderStatus.PARTIAL]: 'Nhận một phần',
  [PurchaseOrderStatus.RECEIVED]: 'Đã nhận đủ',
  [PurchaseOrderStatus.CANCELLED]: 'Đã hủy',
};

export function canCreatePO(role?: string | null): boolean {
  if (!role) return false;
  return role === 'OWNER' || role === 'MANAGER' || role === 'ACCOUNTANT';
}

export function canOrderPO(role?: string | null): boolean {
  if (!role) return false;
  return role === 'OWNER' || role === 'MANAGER' || role === 'ACCOUNTANT';
}

export function canCancelPO(role?: string | null): boolean {
  if (!role) return false;
  return role === 'OWNER' || role === 'MANAGER' || role === 'ACCOUNTANT';
}

export function canReceivePO(role?: string | null): boolean {
  if (!role) return false;
  return role === 'OWNER' || role === 'MANAGER';
}

export function canPayPO(role?: string | null): boolean {
  if (!role) return false;
  return role === 'OWNER' || role === 'MANAGER' || role === 'ACCOUNTANT';
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '0 ₫';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (Number.isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

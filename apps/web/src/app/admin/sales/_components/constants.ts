import {
  CustomerType,
  PaymentMethod,
  PaymentStatus,
  SalesChannel,
  SalesOrderStatus,
} from '@xfarm/shared';

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '0 ₫';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0 ₫';
  return `${new Intl.NumberFormat('vi-VN').format(num)} ₫`;
}

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateOnly(dateString: string | Date | null | undefined): string {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export const orderStatusLabels: Record<SalesOrderStatus, string> = {
  [SalesOrderStatus.PENDING]: 'Chờ xử lý',
  [SalesOrderStatus.CONFIRMED]: 'Đã xác nhận',
  [SalesOrderStatus.PACKING]: 'Đang đóng gói',
  [SalesOrderStatus.SHIPPING]: 'Đang giao hàng',
  [SalesOrderStatus.COMPLETED]: 'Hoàn tất',
  [SalesOrderStatus.CANCELLED]: 'Đã hủy',
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  [PaymentStatus.UNPAID]: 'Chưa thanh toán',
  [PaymentStatus.PARTIAL]: 'Thanh toán 1 phần',
  [PaymentStatus.PAID]: 'Đã thanh toán',
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.COD]: 'Thu hộ (COD)',
  [PaymentMethod.BANK_TRANSFER]: 'Chuyển khoản ngân hàng',
  [PaymentMethod.CASH]: 'Tiền mặt',
  [PaymentMethod.VNPAY]: 'VNPay',
};

export const channelLabels: Record<SalesChannel, string> = {
  [SalesChannel.ADMIN]: 'Bán tại quầy (Admin)',
  [SalesChannel.WEBSHOP]: 'Webshop',
};

export const customerTypeLabels: Record<CustomerType, string> = {
  [CustomerType.RETAIL]: 'Khách lẻ',
  [CustomerType.WHOLESALE]: 'Khách sỉ',
  [CustomerType.AGENT]: 'Đại lý',
};

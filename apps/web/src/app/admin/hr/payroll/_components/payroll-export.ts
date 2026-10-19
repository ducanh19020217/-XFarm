import { getPayTypeLabel, getPayrollStatusLabel } from '../../common/format';
import type { PayrollItem } from '../../common/types';

export function exportPayrollToCSV(items: PayrollItem[], periodStart: string, periodEnd: string) {
  const headers = [
    'Mã nhân viên',
    'Họ và tên',
    'Vị trí',
    'Hình thức lương',
    'Mức lương cơ sở (VND)',
    'Số công / giờ / sản phẩm',
    'Thành tiền (VND)',
    'Trạng thái',
    'Kỳ bắt đầu',
    'Kỳ kết thúc',
  ];

  const escapeCSV = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = items.map((item) => {
    const emp = item.employee || {
      code: '-',
      fullName: 'Không rõ',
      position: '-',
      payType: '-',
      baseRate: 0,
    };

    let quantityDisplay = '-';
    if (item.details?.days !== undefined) {
      quantityDisplay = `${item.details.days} ngày`;
    } else if (item.details?.actualDays !== undefined) {
      quantityDisplay = `${item.details.actualDays} / ${item.details.standardDays || 26} ngày`;
    } else if (item.details?.pieceQty !== undefined) {
      quantityDisplay = `${item.details.pieceQty} SP`;
    } else if (item.details?.hours !== undefined) {
      quantityDisplay = `${item.details.hours} giờ`;
    }

    return [
      escapeCSV(emp.code),
      escapeCSV(emp.fullName),
      escapeCSV(emp.position),
      escapeCSV(getPayTypeLabel(emp.payType)),
      escapeCSV(emp.baseRate),
      escapeCSV(quantityDisplay),
      escapeCSV(item.amount),
      escapeCSV(getPayrollStatusLabel(item.status)),
      escapeCSV(item.periodStart?.slice(0, 10) || periodStart),
      escapeCSV(item.periodEnd?.slice(0, 10) || periodEnd),
    ].join(',');
  });

  // UTF-8 BOM for Excel Vietnamese compatibility
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `bang-luong-${periodStart}-den-${periodEnd}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

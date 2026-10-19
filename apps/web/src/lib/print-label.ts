import { buildTraceUrl } from './trace-url';

export type PrintLayoutType = 'a4' | 'label';

export interface PrintLabelItem {
  id: string;
  index: number;
  lotCode: string;
  traceCode: string;
  traceUrl: string;
  productName: string;
  harvestedAt: string;
  farmName: string;
}

export interface HarvestLotPrintSource {
  code: string;
  traceCode: string;
  harvestedAt: string | Date;
  item?: {
    name?: string;
  } | null;
}

/**
 * Sinh danh sách tem in dựa vào cấu hình layout và số bản in (copies).
 * - Layout A4: mặc định 24 tem (lưới 3x8), hoặc theo số copies chỉ định.
 * - Layout label (50x30mm): mặc định 1 tem hoặc theo số copies chỉ định.
 */
export function generatePrintLabels(
  lot: HarvestLotPrintSource,
  farmName: string,
  layout: PrintLayoutType = 'a4',
  copies?: number,
): PrintLabelItem[] {
  const defaultCopies = layout === 'a4' ? 24 : 1;
  const count = typeof copies === 'number' && copies > 0 ? Math.floor(copies) : defaultCopies;
  const traceUrl = buildTraceUrl(lot.traceCode);

  let formattedDate = '';
  if (typeof lot.harvestedAt === 'string') {
    formattedDate = lot.harvestedAt.slice(0, 10);
  } else if (lot.harvestedAt instanceof Date && !isNaN(lot.harvestedAt.getTime())) {
    formattedDate = lot.harvestedAt.toISOString().slice(0, 10);
  }

  return Array.from({ length: count }, (_, i) => ({
    id: `${lot.code}-${i + 1}`,
    index: i + 1,
    lotCode: lot.code,
    traceCode: lot.traceCode,
    traceUrl,
    productName: lot.item?.name || 'Nông sản',
    harvestedAt: formattedDate,
    farmName: farmName || 'XFarm',
  }));
}

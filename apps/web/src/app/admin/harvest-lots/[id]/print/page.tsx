'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { Button, Input, Label } from '@xfarm/ui';
import { apiFetch } from '@/lib/api';
import { buildTraceUrl } from '@/lib/trace-url';
import { generatePrintLabels, type PrintLayoutType } from '@/lib/print-label';
import type { HarvestLotRecord } from '../../types';

export default function HarvestLotPrintPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialLayout = (searchParams.get('layout') as PrintLayoutType) || 'a4';
  const initialCopies = searchParams.get('copies')
    ? parseInt(searchParams.get('copies')!, 10)
    : undefined;

  const [lot, setLot] = React.useState<HarvestLotRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [farmName, setFarmName] = React.useState('XFarm');
  const [layout, setLayout] = React.useState<PrintLayoutType>(
    initialLayout === 'label' ? 'label' : 'a4',
  );
  const [copies, setCopies] = React.useState<number>(
    initialCopies && initialCopies > 0 ? initialCopies : initialLayout === 'label' ? 1 : 24,
  );
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('');

  // Load lot details
  React.useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch<HarvestLotRecord | { data: HarvestLotRecord }>(`/harvest-lots/${params.id}`)
      .then((res) => {
        if (!active) return;
        const data = (res && 'data' in res ? res.data : res) as HarvestLotRecord;
        setLot(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.id]);

  // Load site-settings farm.name
  React.useEffect(() => {
    let active = true;
    const fetchFarmName = async () => {
      try {
        const res = await apiFetch<
          | { key: string; value: string | { name?: string } }
          | { data: { key: string; value: string | { name?: string } } }
          | Array<{ key: string; value: string | { name?: string } }>
        >('/site-settings/farm.name');
        if (!active) return;
        const raw = res && 'data' in res ? res.data : res;
        const setting = Array.isArray(raw) ? raw[0] : raw;
        if (setting && setting.value) {
          const val =
            typeof setting.value === 'string' ? setting.value : setting.value.name || 'XFarm';
          setFarmName(val);
        }
      } catch {
        // Fallback to default farm name
      }
    };
    void fetchFarmName();
    return () => {
      active = false;
    };
  }, []);

  // Update copies when layout changes if not manually customized
  const handleLayoutChange = (nextLayout: PrintLayoutType) => {
    setLayout(nextLayout);
    if (!initialCopies) {
      setCopies(nextLayout === 'a4' ? 24 : 1);
    }
    const url = new URL(window.location.href);
    url.searchParams.set('layout', nextLayout);
    router.replace(url.pathname + url.search);
  };

  const handleCopiesChange = (val: number) => {
    const safeVal = Math.max(1, isNaN(val) ? 1 : val);
    setCopies(safeVal);
    const url = new URL(window.location.href);
    url.searchParams.set('copies', String(safeVal));
    router.replace(url.pathname + url.search);
  };

  // Generate QR code Data URL
  React.useEffect(() => {
    if (!lot) return;
    const traceUrl = buildTraceUrl(lot.traceCode);
    QRCode.toDataURL(traceUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [lot]);

  const labels = React.useMemo(() => {
    if (!lot) return [];
    return generatePrintLabels(lot, farmName, layout, copies);
  }, [lot, farmName, layout, copies]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.push('/admin/harvest-lots')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Danh sách lô thu hoạch
        </Button>
        <p className="text-slate-500">Không tìm thấy lô thu hoạch.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Print Controls Bar - Hidden when printing */}
      <div className="print:hidden rounded-lg border border-line bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href={`/admin/harvest-lots/${lot.id}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Chi tiết lô
              </Button>
            </Link>
            <div>
              <h1 className="text-base font-bold text-fg">In tem nhãn lô {lot.code}</h1>
              <span className="text-xs text-muted">
                {lot.item?.name} · Mã truy xuất: {lot.traceCode}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="layout-select" className="text-xs font-medium">
                Khổ tem:
              </Label>
              <select
                id="layout-select"
                aria-label="Chọn khổ tem"
                value={layout}
                onChange={(e) => handleLayoutChange(e.target.value as PrintLayoutType)}
                className="h-9 rounded-md border border-line bg-surface px-2.5 text-xs font-medium text-fg focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="a4">A4 (Lưới 3x8 tem - 24 tem/trang)</option>
                <option value="label">Tem đơn (50x30 mm)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="copies-input" className="text-xs font-medium">
                Số lượng:
              </Label>
              <Input
                id="copies-input"
                aria-label="Số lượng tem"
                type="number"
                min={1}
                max={240}
                value={copies}
                onChange={(e) => handleCopiesChange(parseInt(e.target.value, 10))}
                className="h-9 w-20 text-center text-xs"
              />
            </div>

            <Button onClick={handlePrint}>
              <Printer className="mr-1.5 h-4 w-4" />
              In tem ngay
            </Button>
          </div>
        </div>
      </div>

      {/* Print Stylesheet */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          nav, aside, header, footer, .print\\:hidden {
            display: none !important;
          }
          @page {
            size: ${layout === 'label' ? '50mm 30mm' : 'A4 portrait'};
            margin: ${layout === 'label' ? '0' : '8mm'};
          }
        }
      `}</style>

      {/* Print Canvas / Sheet */}
      <div className="mx-auto bg-white p-4 dark:bg-slate-950 print:p-0">
        {layout === 'a4' ? (
          /* A4 3x8 grid */
          <div
            id="print-sheet-a4"
            data-testid="print-sheet-a4"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2 print:w-full"
          >
            {labels.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2.5 rounded border border-dashed border-slate-300 p-2.5 text-black bg-white shadow-sm print:shadow-none print:border-slate-400 print:break-inside-avoid print:page-break-inside-avoid"
                style={{ minHeight: '32mm' }}
              >
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt={`QR ${item.traceCode}`}
                    className="h-16 w-16 flex-shrink-0 object-contain"
                  />
                )}
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-[10px] font-bold uppercase tracking-wider text-emerald-800 print:text-black">
                    {item.farmName}
                  </p>
                  <p className="line-clamp-2 text-xs font-semibold leading-tight text-slate-900 print:text-black">
                    {item.productName}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-slate-600 print:text-black">
                    <span>Lô: {item.lotCode}</span>
                    <span>{item.harvestedAt}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Single label 50x30mm sheet */
          <div
            id="print-sheet-label"
            data-testid="print-sheet-label"
            className="flex flex-col items-center gap-3 print:block print:gap-0"
          >
            {labels.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded border border-dashed border-slate-300 p-2 text-black bg-white shadow-sm print:shadow-none print:border-none print:break-inside-avoid print:page-break-inside-avoid print:break-after-page print:page-break-after-always overflow-hidden"
                style={{
                  width: '50mm',
                  height: '30mm',
                  boxSizing: 'border-box',
                }}
              >
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt={`QR ${item.traceCode}`}
                    className="h-14 w-14 flex-shrink-0 object-contain"
                  />
                )}
                <div className="min-w-0 flex-1 overflow-hidden leading-tight">
                  <p className="truncate text-[9px] font-bold uppercase text-emerald-800 print:text-black">
                    {item.farmName}
                  </p>
                  <p className="truncate text-[11px] font-semibold text-slate-900 print:text-black">
                    {item.productName}
                  </p>
                  <p className="mt-0.5 truncate text-[9px] font-mono text-slate-600 print:text-black">
                    Lô: {item.lotCode}
                  </p>
                  <p className="text-[8px] text-slate-500 print:text-black">
                    Ngày: {item.harvestedAt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

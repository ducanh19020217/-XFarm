'use client';

import * as React from 'react';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button } from '@xfarm/ui';
import { Printer, QrCode, Sprout } from 'lucide-react';
import type { AreaItem } from '@/lib/area-constants';

interface AreaQrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area: AreaItem | null;
}

export function AreaQrDialog({ open, onOpenChange, area }: AreaQrDialogProps) {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);

  const qrPayload = React.useMemo(() => {
    if (!area) return '';
    return `xfarm:area:${area.code}`;
  }, [area]);

  React.useEffect(() => {
    if (!qrPayload || !open) return;
    QRCode.toDataURL(qrPayload, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error('Lỗi sinh mã QR:', err));
  }, [qrPayload, open]);

  const handlePrint = () => {
    if (typeof window === 'undefined') return;
    window.print();
  };

  if (!area) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-[90vw] rounded-2xl p-5">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-fg">
            <QrCode className="h-5 w-5 text-accent" />
            Mã QR Khu/Lô
          </DialogTitle>
        </DialogHeader>

        {/* Printable Area Card */}
        <div
          id="printable-area-qr"
          className="p-4 border border-line rounded-2xl bg-surface text-center space-y-3 text-fg"
        >
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-accent">
            <Sprout className="h-4 w-4" />
            <span>NÔNG TRẠI XFARM</span>
          </div>

          <div className="flex justify-center p-2 bg-white rounded-xl">
            {dataUrl ? (
              <img
                src={dataUrl}
                alt={`QR ${area.code}`}
                className="w-52 h-52 mx-auto object-contain"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-xs text-muted">
                Đang tạo mã QR...
              </div>
            )}
          </div>

          <div className="space-y-0.5 border-t border-line pt-2">
            <h3 className="text-base font-bold text-fg">{area.name}</h3>
            <p className="font-mono text-sm font-semibold text-accent">
              {area.code}
            </p>
            <p className="text-[11px] text-muted font-mono select-all">{qrPayload}</p>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 pt-2 sm:flex-col">
          <Button
            type="button"
            variant="default"
            size="lg"
            onClick={handlePrint}
            className="w-full h-11 text-sm font-bold rounded-xl flex items-center justify-center gap-2"
          >
            <Printer className="h-4 w-4" />
            In tem mã QR
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
            className="w-full h-11 text-sm rounded-xl"
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

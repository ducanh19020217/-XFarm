'use client';

import * as React from 'react';
import { Check, Copy, KeyRound, ShieldAlert, Terminal } from 'lucide-react';
import { Button, FormDialog } from '@xfarm/ui';
import { generateCurlExample } from '@/lib/iot-api';

interface ApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: string;
  sensorName?: string;
  sensorCode?: string;
}

export function ApiKeyDialog({
  open,
  onOpenChange,
  apiKey,
  sensorName,
  sensorCode,
}: ApiKeyDialogProps) {
  const [copiedKey, setCopiedKey] = React.useState(false);
  const [copiedCurl, setCopiedCurl] = React.useState(false);

  const curlCommand = React.useMemo(() => generateCurlExample(apiKey), [apiKey]);

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      // Fallback
      setCopiedKey(false);
    }
  };

  const handleCopyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curlCommand);
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    } catch {
      // Fallback
      setCopiedCurl(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Khóa API Cảm biến (Sensor API Key)"
      description={
        sensorName
          ? `Khóa xác thực cho cảm biến ${sensorName} (${sensorCode || ''})`
          : 'Khóa xác thực gửi dữ liệu đọc từ thiết bị cảm biến IoT'
      }
    >
      <div className="space-y-4 py-1" data-testid="api-key-dialog-content">
        {/* Warning banner */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <p className="font-semibold">Lưu ý quan trọng: Khóa chỉ hiển thị một lần!</p>
            <p className="mt-0.5 text-amber-800 dark:text-amber-300">
              Hãy sao chép và lưu trữ khóa này vào vi điều khiển (ESP32, Arduino) hoặc gateway IoT
              ngay bây giờ. Sau khi đóng cửa sổ này, bạn sẽ không thể xem lại khóa bí mật này nữa (chỉ
              có thể xoay khóa mới).
            </p>
          </div>
        </div>

        {/* API Key box */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-emerald-600" />
            Khóa bí mật (X-Sensor-Key)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={apiKey}
              data-testid="sensor-api-key"
              aria-label="Khóa bí mật X-Sensor-Key"
              className="h-10 flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 font-mono text-xs font-medium text-slate-800 select-all dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 focus:outline-none"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyKey}
              data-testid="copy-key-btn"
              className="h-10 shrink-0 px-3"
            >
              {copiedKey ? (
                <>
                  <Check className="h-4 w-4 mr-1 text-emerald-600" />
                  Đã chép
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Sao chép
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Curl example */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-slate-600" />
              Ví dụ lệnh cURL gửi dữ liệu (reading)
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyCurl}
              data-testid="copy-curl-btn"
              className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
            >
              {copiedCurl ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Đã chép cURL
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Sao chép cURL
                </>
              )}
            </Button>
          </div>
          <pre
            data-testid="curl-command-block"
            className="rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-emerald-400 overflow-x-auto whitespace-pre-wrap dark:border-slate-800"
          >
            {curlCommand}
          </pre>
        </div>

        <div className="flex justify-end pt-3">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            data-testid="close-api-key-dialog-btn"
          >
            Đã lưu khóa & Đóng
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}

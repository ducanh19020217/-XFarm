'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  CameraOff,
  RefreshCw,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Keyboard,
} from 'lucide-react';
import { Button, Input, Toast, useToast } from '@xfarm/ui';
import { mobileApi } from '@/lib/mobile-api';
import type { AreaOption } from '@/app/admin/hr/common/types';

interface NativeBarcodeResult {
  rawValue: string;
}

interface NativeBarcodeDetector {
  detect: (source: HTMLVideoElement) => Promise<NativeBarcodeResult[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => NativeBarcodeDetector;
  }
}

export default function MobileScanPage() {
  const router = useRouter();
  const { message, showToast, closeToast } = useToast();

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const zxingControlsRef = React.useRef<{ stop: () => void } | null>(null);
  const scanLoopRef = React.useRef<number | null>(null);

  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [engineUsed, setEngineUsed] = React.useState<'BarcodeDetector' | 'ZXing' | null>(null);

  // Scanned result
  const [scannedRaw, setScannedRaw] = React.useState<string | null>(null);
  const [scannedCode, setScannedCode] = React.useState<string | null>(null);
  const [matchedArea, setMatchedArea] = React.useState<AreaOption | null>(null);
  const [isLookingUp, setIsLookingUp] = React.useState(false);

  // Manual input fallback
  const [manualCode, setManualCode] = React.useState('');
  const [showManualInput, setShowManualInput] = React.useState(false);

  const stopScanner = React.useCallback(() => {
    if (scanLoopRef.current) {
      window.cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop();
      } catch {
        // ignore
      }
      zxingControlsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const parseQrText = (raw: string): string => {
    const trimmed = raw.trim();
    if (trimmed.startsWith('xfarm:area:')) {
      return trimmed.slice('xfarm:area:'.length).trim();
    }
    return trimmed;
  };

  const handleScanSuccess = React.useCallback(
    async (rawText: string) => {
      stopScanner();
      setScannedRaw(rawText);

      // Try tactile feedback
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(150);
        }
      } catch {
        // ignore
      }

      const code = parseQrText(rawText);
      setScannedCode(code);
      setIsLookingUp(true);

      try {
        const area = await mobileApi.getAreaByCode(code);
        setMatchedArea(area);
        if (area) {
          showToast(`Đã nhận diện khu: ${area.name} (${area.code})`);
        } else {
          showToast(`Mã khu "${code}" không tồn tại trong hệ thống!`);
        }
      } catch {
        showToast('Lỗi khi kiểm tra thông tin khu/lô!');
      } finally {
        setIsLookingUp(false);
      }
    },
    [showToast, stopScanner],
  );

  const startScanner = React.useCallback(async () => {
    stopScanner();
    setScannedRaw(null);
    setScannedCode(null);
    setMatchedArea(null);
    setCameraError(null);

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Trình duyệt không hỗ trợ truy cập camera');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Check if BarcodeDetector is supported natively
        if (typeof window !== 'undefined' && window.BarcodeDetector) {
          try {
            const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
            setEngineUsed('BarcodeDetector');

            const scanFrame = async () => {
              if (!videoRef.current || videoRef.current.readyState < 2) {
                scanLoopRef.current = window.requestAnimationFrame(scanFrame);
                return;
              }

              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  handleScanSuccess(barcodes[0].rawValue);
                  return;
                }
              } catch {
                // fall through
              }

              scanLoopRef.current = window.requestAnimationFrame(scanFrame);
            };

            scanLoopRef.current = window.requestAnimationFrame(scanFrame);
            return;
          } catch {
            // Fallback to ZXing below
          }
        }

        // Fallback to @zxing/browser
        setEngineUsed('ZXing');
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        const codeReader = new BrowserQRCodeReader();

        // Scan from video element
        const controls = await codeReader.decodeFromVideoElement(
          videoRef.current,
          (result, _error) => {
            if (result) {
              handleScanSuccess(result.getText());
            }
          },
        );
        zxingControlsRef.current = controls;
      }
    } catch (err: unknown) {
      console.warn('Lỗi khởi động camera:', err);
      const isDenied = err instanceof Error && err.name === 'NotAllowedError';
      setCameraError(
        isDenied
          ? 'Quyền truy cập máy ảnh đã bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.'
          : 'Không thể truy cập máy ảnh hoặc không tìm thấy thiết bị camera.',
      );
      setShowManualInput(true);
    }
  }, [handleScanSuccess, stopScanner]);

  React.useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScanSuccess(manualCode.trim());
  };

  const handleGoToQuickLog = () => {
    if (matchedArea) {
      router.push(`/admin/m/quick-log?areaId=${matchedArea.id}&areaCode=${matchedArea.code}`);
    } else if (scannedCode) {
      router.push(`/admin/m/quick-log?areaCode=${scannedCode}`);
    }
  };

  return (
    <div className="space-y-4">
      {message && <Toast message={message} onClose={closeToast} />}

      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h1 className="text-xl font-extrabold text-fg tracking-tight">
            Quét mã QR khu/lô
          </h1>
          <p className="text-xs font-medium text-muted">
            Đọc mã tem dán tại ruộng, luống hoặc chuồng nuôi
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowManualInput(!showManualInput)}
          className="h-10 px-3 flex items-center gap-1.5 border-line bg-surface text-fg hover:bg-hover rounded-xl active:scale-95 transition-transform"
        >
          <Keyboard className="h-4 w-4" />
          <span className="text-xs font-semibold">{showManualInput ? 'Ẩn nhập' : 'Nhập tay'}</span>
        </Button>
      </div>

      {/* Scanner Viewfinder Box */}
      {!scannedRaw && (
        <div className="relative rounded-3xl overflow-hidden border-2 border-line bg-black aspect-square max-w-sm mx-auto flex items-center justify-center shadow-lg">
          {cameraError ? (
            <div className="p-6 text-center text-slate-300 space-y-3">
              <CameraOff className="mx-auto h-12 w-12 text-warn" />
              <p className="text-xs leading-relaxed">{cameraError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startScanner()}
                className="text-xs border-line bg-surface text-fg hover:bg-hover rounded-xl"
              >
                Thử lại camera
              </Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
              />

              {/* Aiming Reticle Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-64 h-64 border-2 border-emerald-500/60 rounded-3xl">
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl" />

                  {/* Scanning beam animation */}
                  <div className="absolute top-2 left-2 right-2 h-0.5 bg-emerald-400 shadow-[0_0_12px_#10b981] animate-pulse" />
                </div>
              </div>

              {/* Instructions banner */}
              <div className="absolute bottom-3 left-4 right-4 bg-black/60 backdrop-blur-xs text-white text-center py-2 px-3 rounded-full text-xs font-semibold">
                Hướng camera về phía mã QR{' '}
                <span className="font-mono text-emerald-400">xfarm:area:...</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Manual Input Fallback */}
      {(showManualInput || cameraError) && !scannedRaw && (
        <form
          onSubmit={handleManualSubmit}
          className="rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-3 text-fg"
        >
          <label className="block text-xs font-bold text-fg-2 uppercase tracking-wider">
            Nhập mã khu/lô thủ công
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="VD: KV-0001 hoặc A1..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="h-12 rounded-xl text-base font-semibold bg-surface border-line text-fg placeholder:text-muted focus-visible:ring-accent"
            />
            <Button
              type="submit"
              variant="default"
              className="h-12 px-5 bg-accent hover:bg-accent-hover text-surface rounded-xl font-bold"
            >
              Tìm
            </Button>
          </div>
        </form>
      )}

      {/* Scanned Result Card */}
      {scannedRaw && (
        <div className="rounded-3xl border border-line bg-surface p-5 shadow-md space-y-4 text-fg">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-accent" />
              <h2 className="text-sm font-bold text-fg-2 uppercase tracking-wider">
                Kết quả quét mã
              </h2>
            </div>
            <span className="text-[11px] font-mono text-muted">
              {engineUsed ? `Engine: ${engineUsed}` : ''}
            </span>
          </div>

          {isLookingUp ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="h-6 w-6 animate-spin text-accent" />
              <p className="text-xs text-muted font-medium">Đang tra cứu khu/lô...</p>
            </div>
          ) : matchedArea ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-ok-bg border border-ok/20 space-y-1 text-ok">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-ok" />
                  <h3 className="text-lg font-bold">
                    {matchedArea.name}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium pl-7">
                  <span className="font-mono bg-surface px-2 py-0.5 rounded border border-ok/30 text-fg">
                    Mã: {matchedArea.code}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  variant="default"
                  size="lg"
                  onClick={handleGoToQuickLog}
                  className="w-full h-14 text-base font-extrabold bg-accent hover:bg-accent-hover text-surface rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>Ghi nhật ký tại khu này</span>
                  <ArrowRight className="h-5 w-5" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => startScanner()}
                  className="w-full h-12 text-sm font-semibold rounded-2xl border-line bg-surface text-fg hover:bg-hover"
                >
                  Quét mã khác
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-warn-bg border border-warn/20 space-y-2 text-warn">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warn shrink-0" />
                  <h3 className="text-sm font-bold">Không tìm thấy khu/lô trong hệ thống</h3>
                </div>
                <p className="text-xs pl-7">
                  Đã quét được chuỗi: <span className="font-mono font-bold">{scannedRaw}</span>
                </p>
                <p className="text-xs pl-7 opacity-80">
                  Mã này chưa được gán cho khu/lô nào hoặc chưa được đồng bộ về máy.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleGoToQuickLog()}
                  className="h-12 text-xs font-bold rounded-xl border-line bg-surface text-fg hover:bg-hover"
                >
                  Vẫn dùng mã này
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => startScanner()}
                  className="h-12 text-xs font-bold bg-accent hover:bg-accent-hover text-surface rounded-xl"
                >
                  Quét lại
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

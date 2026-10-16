'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Camera, QrCode, RefreshCw, X, Save } from 'lucide-react';
import {
  Button,
  Toast,
  useToast,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
} from '@xfarm/ui';
import { ActivityType } from '@xfarm/shared';
import { mobileApi, type QuickActivityPayload } from '@/lib/mobile-api';
import type { AreaOption, CycleOption } from '@/app/admin/hr/common/types';

const popularActivityTypes: { type: ActivityType; label: string; icon: string }[] = [
  { type: ActivityType.IRRIGATION, label: 'Tưới nước', icon: '🚿' },
  { type: ActivityType.FERTILIZING, label: 'Bón phân', icon: '🧪' },
  { type: ActivityType.SPRAYING, label: 'Phun thuốc', icon: '💧' },
  { type: ActivityType.FEEDING, label: 'Cho ăn', icon: '🌾' },
  { type: ActivityType.PRUNING, label: 'Tỉa cành', icon: '✂️' },
  { type: ActivityType.HARVEST, label: 'Thu hoạch', icon: '🧺' },
  { type: ActivityType.CLEANING, label: 'Vệ sinh', icon: '🧹' },
  { type: ActivityType.OTHER, label: 'Khác', icon: '📝' },
];

function QuickLogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAreaId = searchParams.get('areaId') || '';
  const initialAreaCode = searchParams.get('areaCode') || '';

  const { message, showToast, closeToast } = useToast();

  const [areas, setAreas] = React.useState<AreaOption[]>([]);
  const [cycles, setCycles] = React.useState<CycleOption[]>([]);
  const [loadingInitial, setLoadingInitial] = React.useState(true);

  // Form states
  const [selectedAreaId, setSelectedAreaId] = React.useState<string>(initialAreaId);
  const [selectedCycleId, setSelectedCycleId] = React.useState<string>('NONE');
  const [selectedType, setSelectedType] = React.useState<ActivityType>(ActivityType.IRRIGATION);
  const [metricValue, setMetricValue] = React.useState<string>('');
  const [metricUnit, setMetricUnit] = React.useState<string>('lít');
  const [notes, setNotes] = React.useState<string>('');

  // Camera / photo state
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load areas and cycles
  React.useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    Promise.all([mobileApi.getAreas(controller.signal), mobileApi.getCycles(controller.signal)])
      .then(([areasData, cyclesData]) => {
        if (!isMounted) return;
        setAreas(areasData || []);
        setCycles(cyclesData || []);

        if (initialAreaCode && !initialAreaId) {
          const match = (areasData || []).find(
            (a) => (a.code || '').toLowerCase() === initialAreaCode.toLowerCase(),
          );
          if (match) {
            setSelectedAreaId(match.id);
          }
        }
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        if (isMounted) setLoadingInitial(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [initialAreaCode, initialAreaId]);

  // Adjust default unit when activity type changes
  React.useEffect(() => {
    switch (selectedType) {
      case ActivityType.IRRIGATION:
        setMetricUnit('lít');
        break;
      case ActivityType.FERTILIZING:
      case ActivityType.SPRAYING:
        setMetricUnit('kg/lọ');
        break;
      case ActivityType.FEEDING:
      case ActivityType.HARVEST:
      case ActivityType.WEIGHING:
        setMetricUnit('kg');
        break;
      default:
        setMetricUnit('số lượng');
        break;
    }
  }, [selectedType]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAreaId) {
      showToast('Vui lòng chọn khu/lô thực hiện!');
      return;
    }

    setIsSubmitting(true);
    try {
      const clientId = crypto.randomUUID?.() || String(Date.now());
      const mediaIds: string[] = [];

      if (photoFile) {
        try {
          const uploaded = await mobileApi.uploadPhoto(photoFile);
          if (uploaded.id) {
            mediaIds.push(uploaded.id);
          }
        } catch {
          // Bỏ qua lỗi upload ảnh nếu gặp trục trặc mạng
        }
      }

      const metricsObj: Record<string, unknown> = {};
      let numVal: number | undefined;
      if (metricValue.trim()) {
        const num = parseFloat(metricValue.trim());
        if (!isNaN(num)) {
          numVal = num;
          metricsObj.amount = num;
          metricsObj.unit = metricUnit;
        } else {
          metricsObj.value = metricValue.trim();
        }
      }

      // Chuẩn bị dữ liệu đặc thù theo loại hoạt động (phù hợp với schema backend)
      const activityData: Record<string, unknown> = {};
      if (selectedType === ActivityType.IRRIGATION) {
        if (numVal && numVal > 0) {
          const unitLower = metricUnit.toLowerCase();
          if (
            unitLower.includes('phút') ||
            unitLower.includes('min') ||
            unitLower.includes('giờ') ||
            unitLower.includes('h')
          ) {
            activityData.durationMin =
              unitLower.includes('giờ') || unitLower.includes('h') ? numVal * 60 : numVal;
          } else {
            activityData.durationMin = 30;
            activityData.volumeL = numVal;
          }
        } else {
          activityData.durationMin = 30;
        }
      } else if (selectedType === ActivityType.FEEDING) {
        activityData.feedKg = numVal && numVal > 0 ? numVal : 1;
      } else if (selectedType === ActivityType.WEIGHING) {
        activityData.avgWeightKg = numVal && numVal > 0 ? numVal : 1;
        activityData.sampleSize = 1;
      } else if (selectedType === ActivityType.MORTALITY) {
        activityData.count = numVal && numVal >= 1 ? Math.floor(numVal) : 1;
      } else if (selectedType === ActivityType.STOCKING) {
        activityData.count = numVal && numVal >= 1 ? Math.floor(numVal) : 1;
      } else if (selectedType === ActivityType.FERTILIZING) {
        if (notes.trim()) activityData.product = notes.trim();
        if (numVal) activityData.dosage = `${numVal} ${metricUnit}`;
      } else if (selectedType === ActivityType.SPRAYING) {
        if (notes.trim()) activityData.product = notes.trim();
        if (numVal) activityData.dosage = `${numVal} ${metricUnit}`;
      }

      const now = new Date().toISOString();
      const payload: QuickActivityPayload = {
        clientId,
        type: selectedType,
        areaId: selectedAreaId,
        cycleId: selectedCycleId !== 'NONE' ? selectedCycleId : undefined,
        performedAt: now,
        date: now,
        data: activityData,
        quantity: numVal && numVal > 0 ? numVal : undefined,
        unit: numVal && numVal > 0 ? metricUnit : undefined,
        notes: notes.trim() || undefined,
        metrics: Object.keys(metricsObj).length > 0 ? metricsObj : undefined,
        mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
      };

      const res = (await mobileApi.createQuickActivity(payload)) as {
        pendingSync?: boolean;
      } | null;

      if (res?.pendingSync || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        showToast('Đã lưu ngoại tuyến (Chờ đồng bộ)!');
      } else {
        showToast('Đã lưu nhật ký thành công!');
      }
      // Reset form
      setNotes('');
      setMetricValue('');
      handleRemovePhoto();

      setTimeout(() => {
        router.push('/admin/m');
      }, 500);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể lưu nhật ký. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {message && <Toast message={message} onClose={closeToast} />}

      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Ghi nhanh nhật ký
          </h1>
          <p className="text-xs font-medium text-slate-500">
            Ghi chép hoạt động canh tác nhanh bằng 1 tay
          </p>
        </div>
        <Link href="/admin/m/scan">
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-3 flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800 font-bold rounded-xl active:scale-95"
          >
            <QrCode className="h-4 w-4" />
            <span className="text-xs">Quét QR</span>
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Chọn khu/lô & Quét QR */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            1. Khu/lô canh tác <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Select
                value={selectedAreaId}
                onValueChange={(val) => setSelectedAreaId(val)}
                disabled={loadingInitial}
              >
                <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-sm font-semibold">
                  <SelectValue placeholder="Chọn khu / lô..." />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mùa vụ liên quan (Tùy chọn) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Mùa vụ liên quan (tùy chọn)
            </label>
            <Select
              value={selectedCycleId}
              onValueChange={(val) => setSelectedCycleId(val)}
              disabled={loadingInitial}
            >
              <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-xs font-medium">
                <SelectValue placeholder="Chọn mùa vụ (nếu có)..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">— Không gắn mùa vụ —</SelectItem>
                {cycles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chọn loại nhật ký */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            2. Loại hoạt động <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {popularActivityTypes.map((item) => {
              const isSelected = selectedType === item.type;
              return (
                <button
                  type="button"
                  key={item.type}
                  onClick={() => setSelectedType(item.type)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all active:scale-95 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-xs dark:bg-emerald-950/60 dark:border-emerald-500 dark:text-emerald-300'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 dark:border-slate-800 dark:text-slate-300'
                  }`}
                >
                  <span className="text-xl mb-1">{item.icon}</span>
                  <span className="text-[11px] text-center leading-tight truncate w-full">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Số liệu chính & Ghi chú */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            3. Số liệu & Ghi chú
          </label>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Số lượng / Khối lượng
              </label>
              <Input
                type="number"
                step="any"
                inputMode="decimal"
                value={metricValue}
                onChange={(e) => setMetricValue(e.target.value)}
                placeholder="VD: 50"
                className="h-12 rounded-xl text-base font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Đơn vị tính
              </label>
              <Input
                type="text"
                value={metricUnit}
                onChange={(e) => setMetricUnit(e.target.value)}
                placeholder="lít, kg, cây..."
                className="h-12 rounded-xl text-sm font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Ghi chú thêm
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Tưới đẫm nước khu vực luống 1 đến 5..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Chụp ảnh thực tế bằng camera */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            4. Chụp ảnh hiện trường
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoSelect}
          />

          {photoPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black aspect-video flex items-center justify-center">
              <img
                src={photoPreview}
                alt="Ảnh hiện trường"
                className="object-contain max-h-56 w-full"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 p-2 rounded-full bg-black/70 text-white hover:bg-black"
                title="Xóa ảnh"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-20 border-2 border-dashed border-emerald-300 dark:border-emerald-800 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-sm active:bg-emerald-100/50 transition-colors"
            >
              <Camera className="h-6 w-6" />
              <span>Chụp ảnh bằng camera điện thoại</span>
            </button>
          )}
        </div>

        {/* Nút lưu lớn, tối ưu thao tác 1 tay */}
        <Button
          type="submit"
          variant="default"
          size="lg"
          disabled={isSubmitting}
          className="w-full h-14 text-base font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-98"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Đang lưu nhật ký...
            </div>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Lưu nhật ký
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

export default function QuickLogPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-slate-500">Đang tải...</p>
        </div>
      }
    >
      <QuickLogContent />
    </React.Suspense>
  );
}

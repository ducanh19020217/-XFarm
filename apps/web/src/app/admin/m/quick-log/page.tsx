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
import { ActivityType, activityDataSchemas } from '@xfarm/shared';
import { mobileApi, type QuickActivityPayload } from '@/lib/mobile-api';
import type { AreaOption, CycleOption } from '@/app/admin/hr/common/types';

const popularActivityTypes: { type: ActivityType; label: string; icon: string }[] = [
  { type: ActivityType.IRRIGATION, label: 'Tưới nước', icon: '🚿' },
  { type: ActivityType.FEEDING, label: 'Cho ăn', icon: '🌾' },
  { type: ActivityType.FERTILIZING, label: 'Bón phân', icon: '🧪' },
  { type: ActivityType.SPRAYING, label: 'Phun thuốc', icon: '💧' },
  { type: ActivityType.WEIGHING, label: 'Cân mẫu', icon: '⚖️' },
  { type: ActivityType.MORTALITY, label: 'Hao hụt', icon: '⚠️' },
  { type: ActivityType.STOCKING, label: 'Thả giống', icon: '🐟' },
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

  // Type-specific field states
  // Tưới nước
  const [durationMin, setDurationMin] = React.useState<string>('');
  const [volumeL, setVolumeL] = React.useState<string>('');

  // Cho ăn
  const [feedKg, setFeedKg] = React.useState<string>('');

  // Cân mẫu
  const [avgWeightKg, setAvgWeightKg] = React.useState<string>('');
  const [sampleSize, setSampleSize] = React.useState<string>('');

  // Hao hụt / Chết
  const [mortalityCount, setMortalityCount] = React.useState<string>('');
  const [mortalityCause, setMortalityCause] = React.useState<string>('');

  // Thả giống
  const [stockingCount, setStockingCount] = React.useState<string>('');
  const [stockingAvgWeightG, setStockingAvgWeightG] = React.useState<string>('');

  // Bón phân & Phun thuốc
  const [chemicalProduct, setChemicalProduct] = React.useState<string>('');
  const [chemicalDosage, setChemicalDosage] = React.useState<string>('');

  // Hoạt động thông thường khác
  const [genericValue, setGenericValue] = React.useState<string>('');
  const [genericUnit, setGenericUnit] = React.useState<string>('lít');

  // Ghi chú chung
  const [notes, setNotes] = React.useState<string>('');

  // Validation errors
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

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
    setFieldErrors({});
    switch (selectedType) {
      case ActivityType.IRRIGATION:
        setGenericUnit('lít');
        break;
      case ActivityType.FERTILIZING:
      case ActivityType.SPRAYING:
        setGenericUnit('kg/lọ');
        break;
      case ActivityType.FEEDING:
      case ActivityType.HARVEST:
      case ActivityType.WEIGHING:
        setGenericUnit('kg');
        break;
      default:
        setGenericUnit('số lượng');
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
      setFieldErrors((prev) => ({ ...prev, areaId: 'Vui lòng chọn khu/lô thực hiện!' }));
      showToast('Vui lòng chọn khu/lô thực hiện!');
      return;
    }

    // Chuẩn bị dữ liệu đặc thù theo loại hoạt động
    const activityData: Record<string, unknown> = {};
    let finalQuantity: number | undefined;
    let finalUnit: string | undefined;

    if (selectedType === ActivityType.IRRIGATION) {
      if (durationMin.trim()) {
        const num = Number(durationMin.trim());
        if (!isNaN(num)) activityData.durationMin = num;
      }
      if (volumeL.trim()) {
        const num = Number(volumeL.trim());
        if (!isNaN(num)) activityData.volumeL = num;
      }
      finalQuantity = activityData.durationMin as number | undefined;
      finalUnit = 'phút';
    } else if (selectedType === ActivityType.FEEDING) {
      if (feedKg.trim()) {
        const num = Number(feedKg.trim());
        if (!isNaN(num)) activityData.feedKg = num;
      }
      finalQuantity = activityData.feedKg as number | undefined;
      finalUnit = 'kg';
    } else if (selectedType === ActivityType.WEIGHING) {
      if (avgWeightKg.trim()) {
        const num = Number(avgWeightKg.trim());
        if (!isNaN(num)) activityData.avgWeightKg = num;
      }
      if (sampleSize.trim()) {
        const num = Number(sampleSize.trim());
        if (!isNaN(num)) activityData.sampleSize = num;
      }
      finalQuantity = activityData.avgWeightKg as number | undefined;
      finalUnit = 'kg';
    } else if (selectedType === ActivityType.MORTALITY) {
      if (mortalityCount.trim()) {
        const num = Number(mortalityCount.trim());
        if (!isNaN(num)) activityData.count = num;
      }
      if (mortalityCause.trim()) {
        activityData.cause = mortalityCause.trim();
      }
      finalQuantity = activityData.count as number | undefined;
      finalUnit = 'con';
    } else if (selectedType === ActivityType.STOCKING) {
      if (stockingCount.trim()) {
        const num = Number(stockingCount.trim());
        if (!isNaN(num)) activityData.count = num;
      }
      if (stockingAvgWeightG.trim()) {
        const num = Number(stockingAvgWeightG.trim());
        if (!isNaN(num)) activityData.avgWeightG = num;
      }
      finalQuantity = activityData.count as number | undefined;
      finalUnit = 'con';
    } else if (
      selectedType === ActivityType.FERTILIZING ||
      selectedType === ActivityType.SPRAYING
    ) {
      if (chemicalProduct.trim()) {
        activityData.product = chemicalProduct.trim();
      }
      if (chemicalDosage.trim()) {
        activityData.dosage = chemicalDosage.trim();
      }
    } else {
      if (genericValue.trim()) {
        const num = Number(genericValue.trim());
        if (!isNaN(num)) {
          finalQuantity = num;
          finalUnit = genericUnit.trim() || undefined;
        }
      }
    }

    // Validate dữ liệu theo schema từ @xfarm/shared (dùng chung, không viết lại quy tắc ở web)
    const schema = activityDataSchemas[selectedType];
    if (schema) {
      const parseResult = schema.safeParse(activityData);
      if (!parseResult.success) {
        const errors: Record<string, string> = {};
        for (const issue of parseResult.error.issues) {
          const key = issue.path[0] ? String(issue.path[0]) : 'general';
          if (!errors[key]) {
            errors[key] = issue.message;
          }
        }
        setFieldErrors(errors);
        const firstMessage =
          parseResult.error.issues[0]?.message || 'Vui lòng điền đủ các thông tin bắt buộc!';
        showToast(firstMessage);
        return;
      }
    }

    setFieldErrors({});
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

      const now = new Date().toISOString();
      const payload: QuickActivityPayload = {
        clientId,
        type: selectedType,
        areaId: selectedAreaId,
        cycleId: selectedCycleId !== 'NONE' ? selectedCycleId : undefined,
        performedAt: now,
        date: now,
        data: activityData,
        quantity: finalQuantity,
        unit: finalUnit,
        notes: notes.trim() || undefined,
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
      setDurationMin('');
      setVolumeL('');
      setFeedKg('');
      setAvgWeightKg('');
      setSampleSize('');
      setMortalityCount('');
      setMortalityCause('');
      setStockingCount('');
      setStockingAvgWeightG('');
      setChemicalProduct('');
      setChemicalDosage('');
      setGenericValue('');
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
          <h1 className="text-xl font-extrabold text-fg tracking-tight">
            Ghi nhanh nhật ký
          </h1>
          <p className="text-xs font-medium text-muted">
            Ghi chép hoạt động canh tác nhanh bằng 1 tay
          </p>
        </div>
        <Link href="/admin/m/scan">
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-3 flex items-center gap-1.5 text-accent bg-accent-bg border border-accent-fade font-bold rounded-xl active:scale-95 hover:bg-accent-fade/30"
          >
            <QrCode className="h-4 w-4" />
            <span className="text-xs">Quét QR</span>
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Chọn khu/lô & Quét QR */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-3 text-fg">
          <label className="block text-xs font-bold text-fg-2 uppercase tracking-wider">
            1. Khu/lô canh tác <span className="text-crit">*</span>
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Select
                value={selectedAreaId}
                onValueChange={(val) => {
                  setSelectedAreaId(val);
                  if (fieldErrors.areaId) {
                    setFieldErrors((prev) => ({ ...prev, areaId: '' }));
                  }
                }}
                disabled={loadingInitial}
              >
                <SelectTrigger className="h-12 rounded-xl bg-surface-2 border-line text-sm font-semibold text-fg">
                  <SelectValue placeholder="Chọn khu / lô..." />
                </SelectTrigger>
                <SelectContent className="bg-surface border-line text-fg">
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {fieldErrors.areaId && <p className="text-xs text-crit mt-1">{fieldErrors.areaId}</p>}

          {/* Mùa vụ liên quan (Tùy chọn) */}
          <div>
            <label className="block text-[11px] font-semibold text-muted mb-1">
              Mùa vụ liên quan (tùy chọn)
            </label>
            <Select
              value={selectedCycleId}
              onValueChange={(val) => setSelectedCycleId(val)}
              disabled={loadingInitial}
            >
              <SelectTrigger className="h-10 rounded-xl bg-surface-2 border-line text-xs font-medium text-fg">
                <SelectValue placeholder="Chọn mùa vụ (nếu có)..." />
              </SelectTrigger>
              <SelectContent className="bg-surface border-line text-fg">
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
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-3 text-fg">
          <label className="block text-xs font-bold text-fg-2 uppercase tracking-wider">
            2. Loại hoạt động <span className="text-crit">*</span>
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
                      ? 'border-accent bg-selected text-accent font-bold shadow-xs'
                      : 'border-line hover:border-line-strong text-fg-2 bg-surface hover:bg-hover'
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
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-3 text-fg">
          <label className="block text-xs font-bold text-fg-2 uppercase tracking-wider">
            3. Số liệu & Ghi chú
          </label>

          {/* Các ô nhập bắt buộc theo loại hoạt động */}
          {selectedType === ActivityType.IRRIGATION && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="durationMin"
                    className="block text-[11px] font-semibold text-muted mb-1"
                  >
                    Thời gian tưới (phút) <span className="text-crit">*</span>
                  </label>
                  <Input
                    id="durationMin"
                    name="durationMin"
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={durationMin}
                    onChange={(e) => {
                      setDurationMin(e.target.value);
                      if (fieldErrors.durationMin) {
                        setFieldErrors((prev) => ({ ...prev, durationMin: '' }));
                      }
                    }}
                    placeholder="VD: 20"
                    className={`h-12 rounded-xl text-base font-bold bg-surface border-line text-fg placeholder:text-muted ${
                      fieldErrors.durationMin ? 'border-crit focus-visible:ring-crit' : 'focus-visible:ring-accent'
                    }`}
                  />
                  {fieldErrors.durationMin && (
                    <p className="text-xs text-crit mt-1">{fieldErrors.durationMin}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="volumeL"
                    className="block text-[11px] font-semibold text-muted mb-1"
                  >
                    Lượng nước (lít - tùy chọn)
                  </label>
                  <Input
                    id="volumeL"
                    name="volumeL"
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={volumeL}
                    onChange={(e) => {
                      setVolumeL(e.target.value);
                      if (fieldErrors.volumeL) {
                        setFieldErrors((prev) => ({ ...prev, volumeL: '' }));
                      }
                    }}
                    placeholder="VD: 100"
                    className={`h-12 rounded-xl text-sm font-medium bg-surface border-line text-fg placeholder:text-muted ${
                      fieldErrors.volumeL ? 'border-crit focus-visible:ring-crit' : 'focus-visible:ring-accent'
                    }`}
                  />
                  {fieldErrors.volumeL && (
                    <p className="text-xs text-crit mt-1">{fieldErrors.volumeL}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedType === ActivityType.FEEDING && (
            <div>
              <label
                htmlFor="feedKg"
                className="block text-[11px] font-semibold text-muted mb-1"
              >
                Khối lượng thức ăn (kg) <span className="text-crit">*</span>
              </label>
              <Input
                id="feedKg"
                name="feedKg"
                type="number"
                step="any"
                inputMode="decimal"
                value={feedKg}
                onChange={(e) => {
                  setFeedKg(e.target.value);
                  if (fieldErrors.feedKg) {
                    setFieldErrors((prev) => ({ ...prev, feedKg: '' }));
                  }
                }}
                placeholder="VD: 5"
                className={`h-12 rounded-xl text-base font-bold bg-surface border-line text-fg placeholder:text-muted ${
                  fieldErrors.feedKg ? 'border-crit focus-visible:ring-crit' : 'focus-visible:ring-accent'
                }`}
              />
              {fieldErrors.feedKg && (
                <p className="text-xs text-crit mt-1">{fieldErrors.feedKg}</p>
              )}
            </div>
          )}

          {selectedType === ActivityType.WEIGHING && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="avgWeightKg"
                  className="block text-[11px] font-semibold text-muted mb-1"
                >
                  Khối lượng TB (kg) <span className="text-crit">*</span>
                </label>
                <Input
                  id="avgWeightKg"
                  name="avgWeightKg"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={avgWeightKg}
                  onChange={(e) => {
                    setAvgWeightKg(e.target.value);
                    if (fieldErrors.avgWeightKg) {
                      setFieldErrors((prev) => ({ ...prev, avgWeightKg: '' }));
                    }
                  }}
                  placeholder="VD: 1.5"
                  className={`h-12 rounded-xl text-base font-bold bg-surface border-line text-fg placeholder:text-muted ${
                    fieldErrors.avgWeightKg ? 'border-crit focus-visible:ring-crit' : 'focus-visible:ring-accent'
                  }`}
                />
                {fieldErrors.avgWeightKg && (
                  <p className="text-xs text-crit mt-1">{fieldErrors.avgWeightKg}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="sampleSize"
                  className="block text-[11px] font-semibold text-muted mb-1"
                >
                  Cỡ mẫu (số con) <span className="text-crit">*</span>
                </label>
                <Input
                  id="sampleSize"
                  name="sampleSize"
                  type="number"
                  step="1"
                  inputMode="numeric"
                  value={sampleSize}
                  onChange={(e) => {
                    setSampleSize(e.target.value);
                    if (fieldErrors.sampleSize) {
                      setFieldErrors((prev) => ({ ...prev, sampleSize: '' }));
                    }
                  }}
                  placeholder="VD: 10"
                  className={`h-12 rounded-xl text-sm font-medium bg-surface border-line text-fg placeholder:text-muted ${
                    fieldErrors.sampleSize ? 'border-crit focus-visible:ring-crit' : 'focus-visible:ring-accent'
                  }`}
                />
                {fieldErrors.sampleSize && (
                  <p className="text-xs text-crit mt-1">{fieldErrors.sampleSize}</p>
                )}
              </div>
            </div>
          )}

          {selectedType === ActivityType.MORTALITY && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="mortalityCount"
                  className="block text-[11px] font-semibold text-muted mb-1"
                >
                  Số lượng chết/hao hụt (con) <span className="text-crit">*</span>
                </label>
                <Input
                  id="mortalityCount"
                  name="count"
                  type="number"
                  step="1"
                  inputMode="numeric"
                  value={mortalityCount}
                  onChange={(e) => {
                    setMortalityCount(e.target.value);
                    if (fieldErrors.count) {
                      setFieldErrors((prev) => ({ ...prev, count: '' }));
                    }
                  }}
                  placeholder="VD: 2"
                  className={`h-12 rounded-xl text-base font-bold bg-surface border-line text-fg placeholder:text-muted ${
                    fieldErrors.count ? 'border-crit focus-visible:ring-crit' : 'focus-visible:ring-accent'
                  }`}
                />
                {fieldErrors.count && (
                  <p className="text-xs text-crit mt-1">{fieldErrors.count}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="mortalityCause"
                  className="block text-[11px] font-semibold text-muted mb-1"
                >
                  Nguyên nhân (tùy chọn)
                </label>
                <Input
                  id="mortalityCause"
                  name="cause"
                  type="text"
                  value={mortalityCause}
                  onChange={(e) => setMortalityCause(e.target.value)}
                  placeholder="VD: Sốc nhiệt, dịch bệnh..."
                  className="h-12 rounded-xl text-sm font-medium bg-surface border-line text-fg placeholder:text-muted focus-visible:ring-accent"
                />
              </div>
            </div>
          )}

          {selectedType === ActivityType.STOCKING && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="stockingCount"
                  className="block text-[11px] font-semibold text-muted mb-1"
                >
                  Số lượng thả giống (con) <span className="text-crit">*</span>
                </label>
                <Input
                  id="stockingCount"
                  name="count"
                  type="number"
                  step="1"
                  inputMode="numeric"
                  value={stockingCount}
                  onChange={(e) => {
                    setStockingCount(e.target.value);
                    if (fieldErrors.count) {
                      setFieldErrors((prev) => ({ ...prev, count: '' }));
                    }
                  }}
                  placeholder="VD: 1000"
                  className={`h-12 rounded-xl text-base font-bold bg-surface border-line text-fg placeholder:text-muted ${
                    fieldErrors.count ? 'border-crit focus-visible:ring-crit' : 'focus-visible:ring-accent'
                  }`}
                />
                {fieldErrors.count && (
                  <p className="text-xs text-crit mt-1">{fieldErrors.count}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="stockingAvgWeightG"
                  className="block text-[11px] font-semibold text-muted mb-1"
                >
                  Khối lượng TB (gam)
                </label>
                <Input
                  id="stockingAvgWeightG"
                  name="avgWeightG"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={stockingAvgWeightG}
                  onChange={(e) => {
                    setStockingAvgWeightG(e.target.value);
                    if (fieldErrors.avgWeightG) {
                      setFieldErrors((prev) => ({ ...prev, avgWeightG: '' }));
                    }
                  }}
                  placeholder="VD: 50"
                  className={`h-12 rounded-xl text-sm font-medium bg-surface border-line text-fg placeholder:text-muted ${
                    fieldErrors.avgWeightG ? 'border-crit focus-visible:ring-crit' : 'focus-visible:ring-accent'
                  }`}
                />
                {fieldErrors.avgWeightG && (
                  <p className="text-xs text-crit mt-1">{fieldErrors.avgWeightG}</p>
                )}
              </div>
            </div>
          )}

          {(selectedType === ActivityType.FERTILIZING ||
            selectedType === ActivityType.SPRAYING) && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="chemicalProduct"
                  className="block text-[11px] font-semibold text-muted mb-1"
                >
                  Tên phân / thuốc
                </label>
                <Input
                  id="chemicalProduct"
                  name="product"
                  type="text"
                  value={chemicalProduct}
                  onChange={(e) => setChemicalProduct(e.target.value)}
                  placeholder="VD: NPK 16-16-8"
                  className="h-12 rounded-xl text-sm font-medium bg-surface border-line text-fg placeholder:text-muted focus-visible:ring-accent"
                />
              </div>
              <div>
                <label
                  htmlFor="chemicalDosage"
                  className="block text-[11px] font-semibold text-muted mb-1"
                >
                  Liều lượng
                </label>
                <Input
                  id="chemicalDosage"
                  name="dosage"
                  type="text"
                  value={chemicalDosage}
                  onChange={(e) => setChemicalDosage(e.target.value)}
                  placeholder="VD: 2kg / 10L nước"
                  className="h-12 rounded-xl text-sm font-medium bg-surface border-line text-fg placeholder:text-muted focus-visible:ring-accent"
                />
              </div>
            </div>
          )}

          {/* Các loại hoạt động thông thường khác */}
          {![
            ActivityType.IRRIGATION,
            ActivityType.FEEDING,
            ActivityType.WEIGHING,
            ActivityType.MORTALITY,
            ActivityType.STOCKING,
            ActivityType.FERTILIZING,
            ActivityType.SPRAYING,
          ].includes(selectedType) && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="genericValue"
                  className="block text-[11px] font-semibold text-muted mb-1"
                >
                  Số lượng / Khối lượng
                </label>
                <Input
                  id="genericValue"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={genericValue}
                  onChange={(e) => setGenericValue(e.target.value)}
                  placeholder="VD: 50"
                  className="h-12 rounded-xl text-base font-bold bg-surface border-line text-fg placeholder:text-muted focus-visible:ring-accent"
                />
              </div>
              <div>
                <label
                  htmlFor="genericUnit"
                  className="block text-[11px] font-semibold text-muted mb-1"
                >
                  Đơn vị tính
                </label>
                <Input
                  id="genericUnit"
                  type="text"
                  value={genericUnit}
                  onChange={(e) => setGenericUnit(e.target.value)}
                  placeholder="lít, kg, cây..."
                  className="h-12 rounded-xl text-sm font-medium bg-surface border-line text-fg placeholder:text-muted focus-visible:ring-accent"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="notes" className="block text-[11px] font-semibold text-muted mb-1">
              Ghi chú thêm
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Tưới đẫm nước khu vực luống 1 đến 5..."
              rows={3}
              className="w-full rounded-xl border border-line bg-surface p-3 text-sm text-fg placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* Chụp ảnh thực tế bằng camera */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-3 text-fg">
          <label className="block text-xs font-bold text-fg-2 uppercase tracking-wider">
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
            <div className="relative rounded-xl overflow-hidden border border-line bg-black aspect-video flex items-center justify-center">
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
              className="w-full h-20 border-2 border-dashed border-accent/40 rounded-xl bg-surface-2 flex flex-col items-center justify-center gap-1.5 text-accent font-bold text-sm active:bg-hover transition-colors"
            >
              <Camera className="h-6 w-6" />
              <span>Chụp ảnh bằng camera điện thoại</span>
            </button>
          )}
        </div>

        {/* Nút lưu lớn, tối ưu thao tác 1 tay & rõ ngoài nắng */}
        <Button
          type="submit"
          variant="default"
          size="lg"
          disabled={isSubmitting}
          className="w-full h-14 text-base font-extrabold bg-accent hover:bg-accent-hover text-surface rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-98"
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
          <RefreshCw className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm font-medium text-muted">Đang tải...</p>
        </div>
      }
    >
      <QuickLogContent />
    </React.Suspense>
  );
}

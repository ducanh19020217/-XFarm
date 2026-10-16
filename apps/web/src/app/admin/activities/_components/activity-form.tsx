'use client';

import * as React from 'react';
import { ActivityType, activityDataSchemas, parseActivityData } from '@xfarm/shared';
import { Camera, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { Button, Input, Label } from '@xfarm/ui';
import { ApiError, apiFetch } from '@/lib/api';
import { activityFieldLabels, activityTypeLabels } from './constants';
import { uploadMediaFiles } from './upload-media';
import type { ActivityArea, ActivityCycle, AvailableItem } from './types';

export const ACTIVITY_CATEGORY_SUGGESTIONS: Partial<Record<ActivityType, string>> = {
  [ActivityType.FERTILIZING]: 'FERTILIZER',
  [ActivityType.SPRAYING]: 'PESTICIDE',
  [ActivityType.FEEDING]: 'FEED',
};

export async function fetchAvailableItems(): Promise<AvailableItem[]> {
  try {
    const res = await apiFetch<
      | {
          data: Array<{
            itemId: string;
            itemSku?: string;
            itemName?: string;
            category?: string;
            unit?: string;
            quantity?: number;
            warehouseId?: string;
          }>;
        }
      | Array<{
          itemId: string;
          itemSku?: string;
          itemName?: string;
          category?: string;
          unit?: string;
          quantity?: number;
          warehouseId?: string;
        }>
    >('/stock/balances?pageSize=100');
    const rawBalances = Array.isArray(res) ? res : res?.data || [];
    if (rawBalances.length > 0) {
      const itemMap = new Map<string, AvailableItem>();
      for (const b of rawBalances) {
        const existing = itemMap.get(b.itemId);
        const qty = Number(b.quantity) || 0;
        if (existing) {
          existing.currentStock += qty;
        } else {
          itemMap.set(b.itemId, {
            id: b.itemId,
            sku: b.itemSku,
            name: b.itemName || 'Vật tư',
            category: b.category || 'OTHER',
            unit: b.unit || '',
            currentStock: qty,
            warehouseId: b.warehouseId,
          });
        }
      }
      return Array.from(itemMap.values());
    }
  } catch {
    // fallback to /items if stock balances endpoint is not available
  }

  try {
    const res = await apiFetch<
      | {
          data: Array<{
            id: string;
            sku?: string;
            name: string;
            category?: string;
            unit: string;
            currentStock?: number;
          }>;
        }
      | Array<{
          id: string;
          sku?: string;
          name: string;
          category?: string;
          unit: string;
          currentStock?: number;
        }>
    >('/items?pageSize=100&isActive=true');
    const rawItems = Array.isArray(res) ? res : res?.data || [];
    return rawItems.map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category || 'OTHER',
      unit: item.unit,
      currentStock: Number(item.currentStock ?? 0),
    }));
  } catch {
    return [];
  }
}

export interface FormMaterialRow {
  id?: string;
  itemId: string;
  quantity: string;
  warehouseId?: string;
}

function fieldsForType(type: ActivityType) {
  const schema = activityDataSchemas[type];
  if (!('shape' in schema) || typeof schema.shape !== 'object') return [];
  return Object.keys(schema.shape as Record<string, unknown>);
}

export interface ActivityFormProps {
  areas: ActivityArea[];
  cycles: ActivityCycle[];
  initialCycleId?: string;
  availableItems?: AvailableItem[];
  onSaved: () => Promise<void> | void;
  onCancel?: () => void;
}

export function ActivityForm({
  areas,
  cycles,
  initialCycleId,
  availableItems: propAvailableItems,
  onSaved,
  onCancel,
}: ActivityFormProps) {
  const [type, setType] = React.useState<ActivityType>(ActivityType.OTHER);
  const [cycleId, setCycleId] = React.useState(initialCycleId ?? '');
  const [areaId, setAreaId] = React.useState('');
  const [performedAt, setPerformedAt] = React.useState(() => new Date().toISOString().slice(0, 16));
  const [data, setData] = React.useState<Record<string, string>>({});
  const [materials, setMaterials] = React.useState<FormMaterialRow[]>([]);
  const [fetchedItems, setFetchedItems] = React.useState<AvailableItem[]>([]);
  const [notes, setNotes] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [uploadMessage, setUploadMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const itemsList = propAvailableItems ?? fetchedItems;

  React.useEffect(() => {
    if (propAvailableItems) return;
    let active = true;
    fetchAvailableItems()
      .then((items) => {
        if (active) setFetchedItems(items);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [propAvailableItems]);

  React.useEffect(() => {
    const selectedCycle = cycles.find((cycle) => cycle.id === cycleId);
    if (selectedCycle) setAreaId(selectedCycle.areaId);
  }, [cycleId, cycles]);

  const applySuggestion = React.useCallback((targetType: ActivityType, items: AvailableItem[]) => {
    const targetCategory = ACTIVITY_CATEGORY_SUGGESTIONS[targetType];
    if (!targetCategory) return;
    const inStock = items.filter(
      (item) => item.category === targetCategory && item.currentStock > 0,
    );
    const candidate = inStock[0] || items.find((item) => item.category === targetCategory);
    if (candidate) {
      setMaterials([
        {
          itemId: candidate.id,
          quantity: '',
          warehouseId: candidate.warehouseId,
        },
      ]);
    } else {
      setMaterials([{ itemId: '', quantity: '' }]);
    }
  }, []);

  React.useEffect(() => {
    if (itemsList.length > 0 && materials.length === 0) {
      const targetCategory = ACTIVITY_CATEGORY_SUGGESTIONS[type];
      if (targetCategory) {
        applySuggestion(type, itemsList);
      }
    }
  }, [applySuggestion, itemsList, materials.length, type]);

  const fields = fieldsForType(type);
  const activeAreas = areas.filter((area) => area.isActive !== false);
  const availableCycles = cycles.filter(
    (cycle) => cycle.status !== 'CLOSED' && cycle.status !== 'CANCELLED',
  );

  const changeType = (nextType: ActivityType) => {
    setType(nextType);
    setData({});
    applySuggestion(nextType, itemsList);
  };

  const addMaterialRow = () => {
    setMaterials((current) => [...current, { itemId: '', quantity: '' }]);
  };

  const removeMaterialRow = (index: number) => {
    setMaterials((current) => current.filter((_, idx) => idx !== index));
  };

  const updateMaterialItem = (index: number, itemId: string) => {
    const selected = itemsList.find((item) => item.id === itemId);
    setMaterials((current) =>
      current.map((row, idx) =>
        idx === index
          ? {
              ...row,
              itemId,
              warehouseId: selected?.warehouseId ?? row.warehouseId,
            }
          : row,
      ),
    );
  };

  const updateMaterialQuantity = (index: number, quantity: string) => {
    setMaterials((current) =>
      current.map((row, idx) => (idx === index ? { ...row, quantity } : row)),
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setUploadMessage(null);
    try {
      const parsedData = parseActivityData(type, data);
      let mediaIds: string[] = [];
      if (files.length) {
        try {
          mediaIds = await uploadMediaFiles(files);
        } catch {
          setUploadMessage(
            'Không thể tải ảnh lên (MinIO có thể đang tạm dừng). Nhật ký vẫn sẽ được lưu không kèm ảnh.',
          );
        }
      }

      const payloadMaterials = materials
        .filter((row) => row.itemId.trim() !== '' && Number(row.quantity) > 0)
        .map((row) => ({
          itemId: row.itemId,
          quantity: Number(row.quantity),
          ...(row.warehouseId ? { warehouseId: row.warehouseId } : {}),
        }));

      await apiFetch('/activities', {
        method: 'POST',
        body: JSON.stringify({
          type,
          cycleId: cycleId || null,
          areaId,
          performedAt: new Date(performedAt).toISOString(),
          data: parsedData,
          notes: notes || null,
          mediaIds,
          ...(payloadMaterials.length > 0 ? { materials: payloadMaterials } : {}),
        }),
      });
      await onSaved();
    } catch (nextError) {
      if (nextError instanceof ApiError) setError(nextError.message);
      else if (nextError instanceof Error) setError(nextError.message);
      else setError('Không thể lưu nhật ký');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}
      {uploadMessage && (
        <p role="status" className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          {uploadMessage}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="activity-type">Loại nhật ký *</Label>
          <select
            id="activity-type"
            value={type}
            onChange={(event) => changeType(event.target.value as ActivityType)}
            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            {Object.values(ActivityType).map((value) => (
              <option key={value} value={value}>
                {activityTypeLabels[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="activity-cycle">Mùa vụ</Label>
          <select
            id="activity-cycle"
            value={cycleId}
            onChange={(event) => setCycleId(event.target.value)}
            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="">Không gắn mùa vụ</option>
            {availableCycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.code} - {cycle.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="activity-area">Khu/lô *</Label>
          <select
            id="activity-area"
            required
            value={areaId}
            onChange={(event) => setAreaId(event.target.value)}
            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="">Chọn khu/lô</option>
            {activeAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.code} - {area.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="activity-date">Thời điểm *</Label>
          <Input
            id="activity-date"
            type="datetime-local"
            required
            value={performedAt}
            onChange={(event) => setPerformedAt(event.target.value)}
          />
        </div>
      </div>
      {fields.length > 0 && (
        <fieldset className="rounded-md border border-slate-200 p-4">
          <legend className="px-1 text-sm font-medium">
            Chỉ số {activityTypeLabels[type].toLowerCase()}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const text = field === 'cause' || field === 'product' || field === 'dosage';
              return (
                <div key={field} className="space-y-1">
                  <Label htmlFor={`activity-data-${field}`}>{activityFieldLabels[field]}</Label>
                  <Input
                    id={`activity-data-${field}`}
                    type={text ? 'text' : 'number'}
                    step="any"
                    value={data[field] ?? ''}
                    onChange={(event) =>
                      setData((current) => ({ ...current, [field]: event.target.value }))
                    }
                  />
                </div>
              );
            })}
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-3 rounded-md border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <legend className="px-1 text-sm font-medium">Vật tư sử dụng</legend>
          <Button type="button" variant="outline" size="sm" onClick={addMaterialRow}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Thêm vật tư
          </Button>
        </div>
        {materials.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có vật tư nào được chọn.</p>
        ) : (
          <div className="space-y-3">
            {materials.map((row, index) => {
              const selectedItem = itemsList.find((i) => i.id === row.itemId);
              const inStockItems = itemsList.filter((item) => item.currentStock > 0);
              const itemOptions = inStockItems.some((i) => i.id === row.itemId)
                ? inStockItems
                : [
                    ...inStockItems,
                    ...(row.itemId ? itemsList.filter((i) => i.id === row.itemId) : []),
                  ];

              return (
                <div
                  key={index}
                  className="grid grid-cols-1 items-end gap-3 rounded-md bg-slate-50 p-3 sm:grid-cols-12"
                >
                  <div className="space-y-1 sm:col-span-5">
                    <Label htmlFor={`material-item-${index}`}>Vật tư</Label>
                    <select
                      id={`material-item-${index}`}
                      aria-label="Chọn vật tư"
                      value={row.itemId}
                      onChange={(event) => updateMaterialItem(index, event.target.value)}
                      className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                    >
                      <option value="">-- Chọn vật tư còn tồn --</option>
                      {itemOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} (Tồn: {item.currentStock} {item.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1 sm:col-span-3">
                    <Label htmlFor={`material-quantity-${index}`}>Số lượng</Label>
                    <Input
                      id={`material-quantity-${index}`}
                      aria-label="Số lượng vật tư"
                      type="number"
                      step="any"
                      min="0.001"
                      placeholder="Số lượng"
                      value={row.quantity}
                      onChange={(event) => updateMaterialQuantity(index, event.target.value)}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-3">
                    <span className="block text-xs font-medium text-slate-500">
                      Tồn &amp; Đơn vị
                    </span>
                    <div className="flex h-10 items-center rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
                      {selectedItem ? (
                        <span>
                          Tồn:{' '}
                          <strong className="font-semibold">{selectedItem.currentStock}</strong>{' '}
                          {selectedItem.unit}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end sm:col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Xóa vật tư dòng ${index + 1}`}
                      onClick={() => removeMaterialRow(index)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </fieldset>

      <div className="space-y-1">
        <Label htmlFor="activity-notes">Ghi chú</Label>
        <textarea
          id="activity-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="activity-images">
          <Camera className="mr-1 inline h-4 w-4" />
          Ảnh đính kèm
        </Label>
        <Input
          id="activity-images"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
        <div className="flex flex-wrap gap-2">
          {files.map((file) => (
            <span
              key={`${file.name}-${file.size}`}
              className="rounded bg-slate-100 px-2 py-1 text-xs"
            >
              {file.name}
              <button
                type="button"
                aria-label={`Bỏ ${file.name}`}
                onClick={() => setFiles((current) => current.filter((item) => item !== file))}
              >
                <X className="ml-1 inline h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Hủy
        </Button>
        <Button type="submit" disabled={saving || !areaId}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang lưu...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Lưu nhật ký
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export { activityDataSchemas };

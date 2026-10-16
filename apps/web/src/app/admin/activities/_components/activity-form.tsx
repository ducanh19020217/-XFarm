'use client';

import * as React from 'react';
import { ActivityType, activityDataSchemas, parseActivityData } from '@xfarm/shared';
import { Camera, Loader2, Save, X } from 'lucide-react';
import { Button, Input, Label } from '@xfarm/ui';
import { ApiError, apiFetch } from '@/lib/api';
import { activityFieldLabels, activityTypeLabels } from './constants';
import { uploadMediaFiles } from './upload-media';
import type { ActivityArea, ActivityCycle } from './types';

function fieldsForType(type: ActivityType) {
  const schema = activityDataSchemas[type];
  if (!('shape' in schema) || typeof schema.shape !== 'object') return [];
  return Object.keys(schema.shape as Record<string, unknown>);
}

export interface ActivityFormProps {
  areas: ActivityArea[];
  cycles: ActivityCycle[];
  initialCycleId?: string;
  onSaved: () => Promise<void> | void;
  onCancel?: () => void;
}

export function ActivityForm({
  areas,
  cycles,
  initialCycleId,
  onSaved,
  onCancel,
}: ActivityFormProps) {
  const [type, setType] = React.useState<ActivityType>(ActivityType.OTHER);
  const [cycleId, setCycleId] = React.useState(initialCycleId ?? '');
  const [areaId, setAreaId] = React.useState('');
  const [performedAt, setPerformedAt] = React.useState(() => new Date().toISOString().slice(0, 16));
  const [data, setData] = React.useState<Record<string, string>>({});
  const [notes, setNotes] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [uploadMessage, setUploadMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const selectedCycle = cycles.find((cycle) => cycle.id === cycleId);
    if (selectedCycle) setAreaId(selectedCycle.areaId);
  }, [cycleId, cycles]);

  const fields = fieldsForType(type);
  const activeAreas = areas.filter((area) => area.isActive !== false);
  const availableCycles = cycles.filter(
    (cycle) => cycle.status !== 'CLOSED' && cycle.status !== 'CANCELLED',
  );

  const changeType = (nextType: ActivityType) => {
    setType(nextType);
    setData({});
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
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
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

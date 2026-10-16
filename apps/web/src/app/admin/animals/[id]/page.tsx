'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@xfarm/ui';
import {
  ArrowLeft,
  Tag,
  Dna,
  Activity,
  Clock,
  PlusCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { apiFetch } from '../../../../lib/api';
import {
  AnimalItem,
  AnimalEventItem,
  AnimalStatus,
  AnimalEventType,
  ANIMAL_SEX_LABELS,
  ANIMAL_STATUS_LABELS,
  ANIMAL_EVENT_TYPE_LABELS,
  canRecordAnyEvent,
} from '../types';
import { AnimalStatusBadge } from '../animal-status-badge';
import { EventDialog } from '../event-dialog';

interface UserProfile {
  id: string;
  role: string;
}

export default function AnimalDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [animal, setAnimal] = React.useState<AnimalItem | null>(null);
  const [events, setEvents] = React.useState<AnimalEventItem[]>([]);
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = React.useState(false);

  // Fetch current user for role permission
  React.useEffect(() => {
    apiFetch<{ data: UserProfile }>('/auth/me')
      .then((res) => {
        if (res.data) setUserRole(res.data.role);
      })
      .catch(() => {
        // Fallback or ignore
      });
  }, []);

  const fetchAnimalDetails = React.useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: AnimalItem } | AnimalItem>(`/animals/${id}`);
      const data = 'data' in res && res.data ? res.data : (res as AnimalItem);
      setAnimal(data);

      // Check events from response or fetch separately
      if (data.events && Array.isArray(data.events)) {
        setEvents(data.events);
      } else {
        try {
          const eventsRes = await apiFetch<{ data: AnimalEventItem[] } | AnimalEventItem[]>(
            `/animals/${id}/events`,
          );
          const evList =
            'data' in eventsRes && Array.isArray(eventsRes.data)
              ? eventsRes.data
              : Array.isArray(eventsRes)
                ? eventsRes
                : [];
          setEvents(evList);
        } catch {
          // If separate events endpoint not available or fails, keep existing
        }
      }
    } catch (err: unknown) {
      console.error('Lỗi khi tải chi tiết cá thể:', err);
      setError('Không thể tải thông tin cá thể vật nuôi này');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    fetchAnimalDetails();
  }, [fetchAnimalDetails]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center text-zinc-500">
          <Activity className="mx-auto h-8 w-8 animate-spin text-emerald-600 mb-2" />
          <p>Đang tải thông tin cá thể vật nuôi...</p>
        </div>
      </div>
    );
  }

  if (error || !animal) {
    return (
      <div className="space-y-4">
        <Link href="/admin/animals">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Quay lại danh sách
          </Button>
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-900 dark:bg-red-950/30">
          <AlertCircle className="mx-auto h-8 w-8 mb-2" />
          <p className="font-medium">{error || 'Không tìm thấy cá thể vật nuôi'}</p>
        </div>
      </div>
    );
  }

  const isDeadOrSold = animal.status === AnimalStatus.DEAD || animal.status === AnimalStatus.SOLD;
  const canRecord = canRecordAnyEvent(userRole) && !isDeadOrSold;

  // Format event data preview
  const renderEventData = (ev: AnimalEventItem) => {
    if (!ev.data) return null;
    const d = ev.data;

    switch (ev.type) {
      case AnimalEventType.VACCINATION:
        return (
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            <span className="font-medium">Vắc-xin:</span> {String(d.vaccine || '—')}
            {d.dose ? ` • Liều: ${String(d.dose)}` : ''}
            {d.disease ? ` • Bệnh: ${String(d.disease)}` : ''}
          </div>
        );

      case AnimalEventType.TREATMENT:
        return (
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            <span className="font-medium">Thuốc:</span> {String(d.medicine || '—')}
            {d.dosage ? ` • Liều: ${String(d.dosage)}` : ''}
            {d.diagnosis ? ` • Chẩn đoán: ${String(d.diagnosis)}` : ''}
          </div>
        );

      case AnimalEventType.WEIGHING:
        return (
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            <span className="font-medium">Trọng lượng:</span>{' '}
            <strong className="text-emerald-700 dark:text-emerald-400">
              {Number(d.weightKg || 0).toLocaleString('vi-VN')} kg
            </strong>
          </div>
        );

      case AnimalEventType.BREEDING:
        return (
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            <span className="font-medium">Phối giống:</span>{' '}
            {d.mateTag ? `Đực giống ${String(d.mateTag)}` : ''}
            {d.method ? ` • ${String(d.method)}` : ''}
          </div>
        );

      case AnimalEventType.BIRTH: {
        const offspringArr = Array.isArray(d.offspring) ? d.offspring : [];
        return (
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            <span className="font-medium">Sinh sản:</span> Đã sinh{' '}
            <strong>{offspringArr.length}</strong> con non (
            {offspringArr.map((c: { tag?: string }) => c.tag || 'Chưa đặt mã').join(', ')})
          </div>
        );
      }

      case AnimalEventType.DEATH:
        return (
          <div className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
            Khai tử: {String(d.cause || 'Không rõ nguyên nhân')}
          </div>
        );

      case AnimalEventType.SALE:
        return (
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            <span className="font-medium">Xuất bán:</span>{' '}
            {d.price ? `${Number(d.price).toLocaleString('vi-VN')} đ` : 'Thương lượng'}
            {d.weightKg ? ` • ${Number(d.weightKg).toLocaleString('vi-VN')} kg` : ''}
            {d.buyer ? ` • Khách mua: ${String(d.buyer)}` : ''}
          </div>
        );

      default:
        return null;
    }
  };

  const getEventBadgeClass = (type: AnimalEventType) => {
    switch (type) {
      case AnimalEventType.VACCINATION:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case AnimalEventType.TREATMENT:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case AnimalEventType.WEIGHING:
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
      case AnimalEventType.BREEDING:
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400';
      case AnimalEventType.BIRTH:
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case AnimalEventType.SALE:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case AnimalEventType.DEATH:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top back button & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/animals">
            <Button variant="outline" size="sm" className="h-9">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Vật nuôi
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Thẻ cá thể: {animal.tag}
              </h1>
              <AnimalStatusBadge status={animal.status} />
            </div>
            <p className="text-xs text-zinc-500">
              Loài: {animal.species} {animal.breed ? `• Giống: ${animal.breed}` : ''}
            </p>
          </div>
        </div>

        <div>
          {canRecord && (
            <Button
              onClick={() => setEventDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Ghi sự kiện
            </Button>
          )}
          {isDeadOrSold && (
            <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-3 py-1.5 rounded-md font-medium">
              Cá thể đã {animal.status === AnimalStatus.DEAD ? 'chết' : 'xuất bán'} — Không thể ghi
              thêm sự kiện
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Cột trái: Thông tin chi tiết cá thể & Cây phả hệ (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card Thông tin cá thể */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
              <Tag className="h-5 w-5 text-emerald-600" />
              Thông tin hồ sơ cá thể
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs text-zinc-500 block">Mã tai / Thẻ</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{animal.tag}</span>
              </div>

              <div>
                <span className="text-xs text-zinc-500 block">Loài & Giống</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {animal.species} {animal.breed ? `(${animal.breed})` : ''}
                </span>
              </div>

              <div>
                <span className="text-xs text-zinc-500 block">Giới tính</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {ANIMAL_SEX_LABELS[animal.sex] || animal.sex}
                </span>
              </div>

              <div>
                <span className="text-xs text-zinc-500 block">Ngày sinh</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {animal.birthDate
                    ? new Date(animal.birthDate).toLocaleDateString('vi-VN')
                    : 'Chưa rõ'}
                </span>
              </div>

              <div>
                <span className="text-xs text-zinc-500 block">Thuộc đàn</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {animal.group ? `${animal.group.code} (${animal.group.species})` : '—'}
                </span>
              </div>

              <div>
                <span className="text-xs text-zinc-500 block">Trạng thái</span>
                <div className="mt-0.5">
                  <AnimalStatusBadge status={animal.status} />
                </div>
              </div>
            </div>

            {animal.notes && (
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-sm">
                <span className="text-xs text-zinc-500 block mb-1">Ghi chú đặc điểm</span>
                <p className="text-zinc-700 dark:text-zinc-300 italic">{animal.notes}</p>
              </div>
            )}
          </div>

          {/* Card Cây phả hệ đơn giản (mẹ → con) */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
              <Dna className="h-5 w-5 text-emerald-600" />
              Cây phả hệ đơn giản (Mẹ → Con)
            </h2>

            <div className="space-y-4">
              {/* Tầng 1: Mẹ */}
              <div>
                <span className="text-xs font-semibold uppercase text-zinc-400 block mb-1">
                  Cấp 1: Cá thể mẹ (Mother)
                </span>
                {animal.mother ? (
                  <Link
                    href={`/admin/animals/${animal.mother.id}`}
                    className="flex items-center justify-between rounded-lg border border-pink-200 bg-pink-50/50 p-3 hover:bg-pink-100/50 transition-colors dark:border-pink-900/50 dark:bg-pink-950/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-200 text-pink-700 dark:bg-pink-900 dark:text-pink-300 font-bold text-xs">
                        MẸ
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                          {animal.mother.tag}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {animal.mother.species}{' '}
                          {animal.mother.breed ? `• ${animal.mother.breed}` : ''}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </Link>
                ) : (
                  <div className="rounded-lg border border-dashed border-zinc-200 p-3 text-xs text-zinc-500 text-center dark:border-zinc-800">
                    Không có thông tin mẹ (Cá thể gốc giống / Con nhập ngoài)
                  </div>
                )}
              </div>

              {/* Đường nối */}
              <div className="flex justify-center my-1">
                <div className="h-6 w-0.5 bg-emerald-400"></div>
              </div>

              {/* Tầng 2: Cá thể hiện tại */}
              <div>
                <span className="text-xs font-semibold uppercase text-zinc-400 block mb-1">
                  Cấp 2: Cá thể hiện tại
                </span>
                <div className="rounded-lg border-2 border-emerald-500 bg-emerald-50/60 p-3.5 dark:bg-emerald-950/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-base text-emerald-900 dark:text-emerald-200">
                        {animal.tag} (Hiện tại)
                      </div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-400">
                        {animal.species} • {ANIMAL_SEX_LABELS[animal.sex]} • Trạng thái:{' '}
                        {ANIMAL_STATUS_LABELS[animal.status]}
                      </div>
                    </div>
                    <AnimalStatusBadge status={animal.status} />
                  </div>
                </div>
              </div>

              {/* Đường nối */}
              <div className="flex justify-center my-1">
                <div className="h-6 w-0.5 bg-emerald-400"></div>
              </div>

              {/* Tầng 3: Danh sách con non */}
              <div>
                <span className="text-xs font-semibold uppercase text-zinc-400 block mb-2">
                  Cấp 3: Danh sách con non ({animal.offspring?.length || 0} con)
                </span>

                {animal.offspring && animal.offspring.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {animal.offspring.map((child) => (
                      <Link
                        key={child.id}
                        href={`/admin/animals/${child.id}`}
                        className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 hover:bg-zinc-100 transition-colors dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-800"
                      >
                        <div>
                          <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                            {child.tag}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {ANIMAL_SEX_LABELS[child.sex]}
                            {child.birthDate
                              ? ` • ${new Date(child.birthDate).toLocaleDateString('vi-VN')}`
                              : ''}
                          </div>
                        </div>
                        <AnimalStatusBadge status={child.status} />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-zinc-200 p-3 text-xs text-zinc-500 text-center dark:border-zinc-800">
                    Chưa có ghi nhận sinh sản con non nào
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải: Timeline sự kiện (1 col) */}
        <div className="space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-600" />
                Dòng thời gian sự kiện
              </h2>
              <span className="text-xs text-zinc-500">{events.length} sự kiện</span>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-500">
                <Activity className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700 mb-2" />
                <p>Chưa có sự kiện nào được ghi nhận cho cá thể này</p>
                {canRecord && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEventDialogOpen(true)}
                    className="mt-3 text-xs"
                  >
                    + Ghi sự kiện đầu tiên
                  </Button>
                )}
              </div>
            ) : (
              <div className="relative border-l-2 border-zinc-200 pl-4 space-y-5 dark:border-zinc-800">
                {events.map((ev) => (
                  <div key={ev.id} className="relative group">
                    {/* Chấm tròn mốc timeline */}
                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-600 border-2 border-white dark:border-zinc-900"></div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${getEventBadgeClass(
                            ev.type,
                          )}`}
                        >
                          {ANIMAL_EVENT_TYPE_LABELS[ev.type] || ev.type}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {new Date(ev.date).toLocaleDateString('vi-VN')}
                        </span>
                      </div>

                      {renderEventData(ev)}

                      {ev.notes && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                          "{ev.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog Ghi sự kiện */}
      <EventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        animal={animal}
        userRole={userRole}
        onSuccess={fetchAnimalDetails}
      />
    </div>
  );
}

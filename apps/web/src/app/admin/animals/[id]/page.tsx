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
        <div className="text-center text-muted">
          <Activity className="mx-auto h-8 w-8 animate-spin text-accent mb-2" />
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
        <div className="rounded-lg border border-crit/20 bg-crit-bg p-6 text-center text-crit">
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
          <div className="text-xs text-muted mt-1">
            <span className="font-medium text-fg">Vắc-xin:</span> {String(d.vaccine || '—')}
            {d.dose ? ` • Liều: ${String(d.dose)}` : ''}
            {d.disease ? ` • Bệnh: ${String(d.disease)}` : ''}
          </div>
        );

      case AnimalEventType.TREATMENT:
        return (
          <div className="text-xs text-muted mt-1">
            <span className="font-medium text-fg">Thuốc:</span> {String(d.medicine || '—')}
            {d.dosage ? ` • Liều: ${String(d.dosage)}` : ''}
            {d.diagnosis ? ` • Chẩn đoán: ${String(d.diagnosis)}` : ''}
          </div>
        );

      case AnimalEventType.WEIGHING:
        return (
          <div className="text-xs text-muted mt-1">
            <span className="font-medium text-fg">Trọng lượng:</span>{' '}
            <strong className="text-accent">
              {Number(d.weightKg || 0).toLocaleString('vi-VN')} kg
            </strong>
          </div>
        );

      case AnimalEventType.BREEDING:
        return (
          <div className="text-xs text-muted mt-1">
            <span className="font-medium text-fg">Phối giống:</span>{' '}
            {d.mateTag ? `Đực giống ${String(d.mateTag)}` : ''}
            {d.method ? ` • ${String(d.method)}` : ''}
          </div>
        );

      case AnimalEventType.BIRTH: {
        const offspringArr = Array.isArray(d.offspring) ? d.offspring : [];
        return (
          <div className="text-xs text-muted mt-1">
            <span className="font-medium text-fg">Sinh sản:</span> Đã sinh{' '}
            <strong className="text-fg">{offspringArr.length}</strong> con non (
            {offspringArr.map((c: { tag?: string }) => c.tag || 'Chưa đặt mã').join(', ')})
          </div>
        );
      }

      case AnimalEventType.DEATH:
        return (
          <div className="text-xs text-crit mt-1 font-medium">
            Khai tử: {String(d.cause || 'Không rõ nguyên nhân')}
          </div>
        );

      case AnimalEventType.SALE:
        return (
          <div className="text-xs text-muted mt-1">
            <span className="font-medium text-fg">Xuất bán:</span>{' '}
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
        return 'bg-info-bg text-info border border-info/20';
      case AnimalEventType.TREATMENT:
        return 'bg-accent-bg text-accent border border-accent/20';
      case AnimalEventType.WEIGHING:
        return 'bg-surface-2 text-fg border border-line';
      case AnimalEventType.BREEDING:
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400 border border-pink-300/30';
      case AnimalEventType.BIRTH:
        return 'bg-ok-bg text-ok border border-ok/20';
      case AnimalEventType.SALE:
        return 'bg-warn-bg text-warn border border-warn/20';
      case AnimalEventType.DEATH:
        return 'bg-crit-bg text-crit border border-crit/20';
      default:
        return 'bg-surface-2 text-fg border border-line';
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
              <h1 className="text-xl font-bold text-fg">Thẻ cá thể: {animal.tag}</h1>
              <AnimalStatusBadge status={animal.status} />
            </div>
            <p className="text-xs text-muted">
              Loài: {animal.species} {animal.breed ? `• Giống: ${animal.breed}` : ''}
            </p>
          </div>
        </div>

        <div>
          {canRecord && (
            <Button onClick={() => setEventDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Ghi sự kiện
            </Button>
          )}
          {isDeadOrSold && (
            <div className="text-xs text-warn bg-warn-bg border border-warn/20 px-3 py-1.5 rounded-md font-medium">
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
          <div className="rounded-lg border border-line bg-surface p-5 shadow-sm">
            <h2 className="text-base font-semibold text-fg mb-4 flex items-center gap-2">
              <Tag className="h-5 w-5 text-accent" />
              Thông tin hồ sơ cá thể
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs text-muted block">Mã tai / Thẻ</span>
                <span className="font-semibold text-fg">{animal.tag}</span>
              </div>

              <div>
                <span className="text-xs text-muted block">Loài & Giống</span>
                <span className="font-medium text-fg">
                  {animal.species} {animal.breed ? `(${animal.breed})` : ''}
                </span>
              </div>

              <div>
                <span className="text-xs text-muted block">Giới tính</span>
                <span className="font-medium text-fg">
                  {ANIMAL_SEX_LABELS[animal.sex] || animal.sex}
                </span>
              </div>

              <div>
                <span className="text-xs text-muted block">Ngày sinh</span>
                <span className="font-medium text-fg">
                  {animal.birthDate
                    ? new Date(animal.birthDate).toLocaleDateString('vi-VN')
                    : 'Chưa rõ'}
                </span>
              </div>

              <div>
                <span className="text-xs text-muted block">Thuộc đàn</span>
                <span className="font-medium text-fg">
                  {animal.group ? `${animal.group.code} (${animal.group.species})` : '—'}
                </span>
              </div>

              <div>
                <span className="text-xs text-muted block">Trạng thái</span>
                <div className="mt-0.5">
                  <AnimalStatusBadge status={animal.status} />
                </div>
              </div>
            </div>

            {animal.notes && (
              <div className="mt-4 pt-3 border-t border-line text-sm">
                <span className="text-xs text-muted block mb-1">Ghi chú đặc điểm</span>
                <p className="text-fg italic">{animal.notes}</p>
              </div>
            )}
          </div>

          {/* Card Cây phả hệ đơn giản (mẹ → con) */}
          <div className="rounded-lg border border-line bg-surface p-5 shadow-sm">
            <h2 className="text-base font-semibold text-fg mb-4 flex items-center gap-2">
              <Dna className="h-5 w-5 text-accent" />
              Cây phả hệ đơn giản (Mẹ → Con)
            </h2>

            <div className="space-y-4">
              {/* Tầng 1: Mẹ */}
              <div>
                <span className="text-xs font-semibold uppercase text-muted block mb-1">
                  Cấp 1: Cá thể mẹ (Mother)
                </span>
                {animal.mother ? (
                  <Link
                    href={`/admin/animals/${animal.mother.id}`}
                    className="flex items-center justify-between rounded-lg border border-line bg-surface-2 p-3 hover:bg-surface transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-pink-700 font-bold text-xs">
                        MẸ
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-fg">{animal.mother.tag}</div>
                        <div className="text-xs text-muted">
                          {animal.mother.species}{' '}
                          {animal.mother.breed ? `• ${animal.mother.breed}` : ''}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </Link>
                ) : (
                  <div className="rounded-lg border border-dashed border-line p-3 text-xs text-muted text-center">
                    Không có thông tin mẹ (Cá thể gốc giống / Con nhập ngoài)
                  </div>
                )}
              </div>

              {/* Đường nối */}
              <div className="flex justify-center my-1">
                <div className="h-6 w-0.5 bg-accent/40"></div>
              </div>

              {/* Tầng 2: Cá thể hiện tại */}
              <div>
                <span className="text-xs font-semibold uppercase text-muted block mb-1">
                  Cấp 2: Cá thể hiện tại
                </span>
                <div className="rounded-lg border-2 border-accent bg-accent-bg/30 p-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-base text-fg">{animal.tag} (Hiện tại)</div>
                      <div className="text-xs text-accent">
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
                <div className="h-6 w-0.5 bg-accent/40"></div>
              </div>

              {/* Tầng 3: Danh sách con non */}
              <div>
                <span className="text-xs font-semibold uppercase text-muted block mb-2">
                  Cấp 3: Danh sách con non ({animal.offspring?.length || 0} con)
                </span>

                {animal.offspring && animal.offspring.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {animal.offspring.map((child) => (
                      <Link
                        key={child.id}
                        href={`/admin/animals/${child.id}`}
                        className="flex items-center justify-between rounded-lg border border-line bg-surface-2 p-2.5 hover:bg-surface transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-xs text-fg">{child.tag}</div>
                          <div className="text-[11px] text-muted">
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
                  <div className="rounded-lg border border-dashed border-line p-3 text-xs text-muted text-center">
                    Chưa có ghi nhận sinh sản con non nào
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cột phải: Timeline sự kiện (1 col) */}
        <div className="space-y-6">
          <div className="rounded-lg border border-line bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-fg flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                Dòng thời gian sự kiện
              </h2>
              <span className="text-xs text-muted">{events.length} sự kiện</span>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted">
                <Activity className="mx-auto h-8 w-8 text-muted mb-2" />
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
              <div className="relative border-l-2 border-line pl-4 space-y-5">
                {events.map((ev) => (
                  <div key={ev.id} className="relative group">
                    {/* Chấm tròn mốc timeline */}
                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-accent border-2 border-surface"></div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${getEventBadgeClass(
                            ev.type,
                          )}`}
                        >
                          {ANIMAL_EVENT_TYPE_LABELS[ev.type] || ev.type}
                        </span>
                        <span className="text-[11px] text-muted">
                          {new Date(ev.date).toLocaleDateString('vi-VN')}
                        </span>
                      </div>

                      {renderEventData(ev)}

                      {ev.notes && <p className="text-xs text-muted italic">"{ev.notes}"</p>}
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

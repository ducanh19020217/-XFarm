'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CycleKind,
  ActivityType,
  buildMonthGrid,
  groupCalendarItemsByDay,
  toVietnamDateString,
  type CalendarActivityItem,
  type CalendarCycleEvent,
  type CalendarData,
  type CalendarGridDay,
} from '@xfarm/shared';
import {
  PageHeader,
  Button,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@xfarm/ui';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Sprout,
  CheckCircle2,
  AlertCircle,
  Flag,
  Filter,
} from 'lucide-react';
import { apiFetch, isAbortError } from '@/lib/api';

const WEEKDAY_NAMES = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

const CYCLE_KIND_CONFIG: Record<
  CycleKind,
  { label: string; dotClass: string; badgeClass: string; borderClass: string }
> = {
  [CycleKind.CROP]: {
    label: 'Trồng trọt',
    dotClass: 'bg-accent',
    badgeClass: 'bg-accent-bg text-accent border border-accent/20',
    borderClass: 'border-l-4 border-l-accent',
  },
  [CycleKind.LIVESTOCK]: {
    label: 'Chăn nuôi',
    dotClass: 'bg-warn',
    badgeClass: 'bg-warn-bg text-warn border border-warn/20',
    borderClass: 'border-l-4 border-l-warn',
  },
  [CycleKind.AQUA]: {
    label: 'Thủy sản',
    dotClass: 'bg-info',
    badgeClass: 'bg-info-bg text-info border border-info/20',
    borderClass: 'border-l-4 border-l-info',
  },
};

const CYCLE_EVENT_KIND_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  start: { label: 'Bắt đầu', icon: <Flag className="h-3 w-3 text-accent inline mr-1" /> },
  expectedEnd: {
    label: 'Dự kiến xong',
    icon: <AlertCircle className="h-3 w-3 text-warn inline mr-1" />,
  },
  end: {
    label: 'Kết thúc',
    icon: <CheckCircle2 className="h-3 w-3 text-ok inline mr-1" />,
  },
};

const ACTIVITY_TYPE_LABELS: Record<ActivityType | string, string> = {
  SOWING: 'Gieo hạt',
  PLANTING: 'Trồng cây',
  FERTILIZING: 'Bón phân',
  SPRAYING: 'Phun thuốc',
  IRRIGATION: 'Tưới nước',
  PRUNING: 'Tỉa cành',
  WEEDING: 'Làm cỏ',
  FEEDING: 'Cho ăn',
  VACCINATION: 'Tiêm phòng',
  TREATMENT: 'Điều trị',
  WATER_TEST: 'Kiểm tra nước',
  STOCKING: 'Thả giống',
  MORTALITY: 'Hao hụt',
  WEIGHING: 'Cân trọng lượng',
  HARVEST: 'Thu hoạch',
  CLEANING: 'Vệ sinh',
  OTHER: 'Khác',
};

function formatVietnamTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const vnTime = new Date(d.getTime() + 7 * 3600 * 1000);
    const hh = String(vnTime.getUTCHours()).padStart(2, '0');
    const mm = String(vnTime.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return '';
  }
}

interface AreaItem {
  id: string;
  name: string;
  code: string;
}

export default function CalendarPage() {
  const todayStr = React.useMemo(() => toVietnamDateString(new Date()), []);
  const initialYear = parseInt(todayStr.split('-')[0], 10);
  const initialMonth = parseInt(todayStr.split('-')[1], 10);

  const [year, setYear] = React.useState(initialYear);
  const [month, setMonth] = React.useState(initialMonth);
  const [selectedDate, setSelectedDate] = React.useState(todayStr);

  const [areaId, setAreaId] = React.useState<string>('ALL');
  const [kind, setKind] = React.useState<string>('ALL');

  const [activities, setActivities] = React.useState<CalendarActivityItem[]>([]);
  const [cycleEvents, setCycleEvents] = React.useState<CalendarCycleEvent[]>([]);
  const [areas, setAreas] = React.useState<AreaItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const monthStr = React.useMemo(() => {
    return `${year}-${String(month).padStart(2, '0')}`;
  }, [year, month]);

  // Load areas for filter
  React.useEffect(() => {
    const controller = new AbortController();
    async function loadAreas() {
      try {
        const res = await apiFetch<{ data: AreaItem[] } | AreaItem[]>('/areas?pageSize=100', {
          signal: controller.signal,
        });
        if (Array.isArray(res)) {
          setAreas(res);
        } else if (res && Array.isArray(res.data)) {
          setAreas(res.data);
        }
      } catch (error) {
        if (isAbortError(error)) return;
        // Fallback: will populate from activities
      }
    }
    void loadAreas();
    return () => controller.abort();
  }, []);

  // Fetch calendar events
  const fetchCalendar = React.useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('month', monthStr);
        if (areaId && areaId !== 'ALL') params.set('areaId', areaId);
        if (kind && kind !== 'ALL') params.set('kind', kind);

        const res = await apiFetch<CalendarData>(`/calendar?${params.toString()}`, { signal });
        setActivities(res.activities || []);
        setCycleEvents(res.cycleEvents || []);
      } catch (err) {
        if (!isAbortError(err)) console.error('Không thể tải dữ liệu lịch:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [monthStr, areaId, kind],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void fetchCalendar(controller.signal);
    return () => controller.abort();
  }, [fetchCalendar]);

  // Derived grid & grouped events
  const gridDays = React.useMemo(() => {
    return buildMonthGrid(year, month, todayStr);
  }, [year, month, todayStr]);

  const eventsByDay = React.useMemo(() => {
    return groupCalendarItemsByDay(activities, cycleEvents);
  }, [activities, cycleEvents]);

  // Merge discovered areas from activities if area list was empty
  const availableAreas = React.useMemo(() => {
    if (areas.length > 0) return areas;
    const map = new Map<string, AreaItem>();
    for (const act of activities) {
      if (act.area && !map.has(act.area.id)) {
        map.set(act.area.id, act.area);
      }
    }
    return Array.from(map.values());
  }, [areas, activities]);

  // Handlers for month switcher
  const handlePrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const today = toVietnamDateString(new Date());
    const y = parseInt(today.split('-')[0], 10);
    const m = parseInt(today.split('-')[1], 10);
    setYear(y);
    setMonth(m);
    setSelectedDate(today);
  };

  // Selected day items
  const selectedDayData = eventsByDay[selectedDate] || { activities: [], cycleEvents: [] };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lịch sản xuất"
        description="Theo dõi hoạt động canh tác, sự kiện mùa vụ theo tháng"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleToday}
          className="flex items-center gap-1.5"
        >
          <CalendarIcon className="h-4 w-4" />
          Hôm nay
        </Button>
      </PageHeader>

      {/* Filter & Month Navigation Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Month Switcher */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevMonth}
            aria-label="Tháng trước"
            className="h-9 w-9 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-[140px] text-center font-semibold text-fg">
            Tháng {String(month).padStart(2, '0')}/{year}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            aria-label="Tháng sau"
            className="h-9 w-9 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Filter className="h-3.5 w-3.5" />
            <span>Lọc:</span>
          </div>

          {/* Filter Area */}
          <div className="w-44">
            <Select value={areaId} onValueChange={(val) => setAreaId(val)}>
              <SelectTrigger className="h-9 text-xs border-line bg-surface text-fg">
                <SelectValue placeholder="Tất cả khu/lô" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả khu/lô</SelectItem>
                {availableAreas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter Kind */}
          <div className="w-40">
            <Select value={kind} onValueChange={(val) => setKind(val)}>
              <SelectTrigger className="h-9 text-xs border-line bg-surface text-fg">
                <SelectValue placeholder="Tất cả loại vụ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả loại vụ</SelectItem>
                <SelectItem value={CycleKind.CROP}>Trồng trọt</SelectItem>
                <SelectItem value={CycleKind.LIVESTOCK}>Chăn nuôi</SelectItem>
                <SelectItem value={CycleKind.AQUA}>Thủy sản</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Grid & Day Detail Panel */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        {/* Calendar Grid (3 cols on xl) */}
        <div className="xl:col-span-3 space-y-3">
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
            {/* Weekday headers (Thứ 2 -> Chủ nhật) */}
            <div className="grid grid-cols-7 border-b border-line bg-surface-2 text-center text-xs font-semibold text-fg">
              {WEEKDAY_NAMES.map((w, idx) => (
                <div key={w} className={`py-2.5 ${idx >= 5 ? 'text-crit' : ''}`}>
                  {w}
                </div>
              ))}
            </div>

            {/* Grid days */}
            <div className="grid grid-cols-7 divide-x divide-y divide-line">
              {gridDays.map((day: CalendarGridDay) => {
                const dayData = eventsByDay[day.date];
                const dayActivities = dayData?.activities || [];
                const dayCycles = dayData?.cycleEvents || [];
                const totalItems = dayActivities.length + dayCycles.length;
                const isSelected = day.date === selectedDate;

                // Group dots by kind
                const cropCount =
                  dayCycles.filter((c) => c.cycleKind === CycleKind.CROP).length +
                  dayActivities.filter((a) => a.cycleKind === CycleKind.CROP).length;
                const livestockCount =
                  dayCycles.filter((c) => c.cycleKind === CycleKind.LIVESTOCK).length +
                  dayActivities.filter((a) => a.cycleKind === CycleKind.LIVESTOCK).length;
                const aquaCount =
                  dayCycles.filter((c) => c.cycleKind === CycleKind.AQUA).length +
                  dayActivities.filter((a) => a.cycleKind === CycleKind.AQUA).length;
                const otherActCount = dayActivities.filter((a) => !a.cycleKind).length;

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDate(day.date)}
                    className={`relative flex min-h-[96px] flex-col p-1.5 text-left transition-colors focus:outline-none md:min-h-[110px] ${
                      !day.isCurrentMonth
                        ? 'bg-surface-2/40 text-muted'
                        : 'bg-surface hover:bg-surface-2'
                    } ${isSelected ? 'ring-2 ring-inset ring-accent bg-accent-bg/20' : ''}`}
                  >
                    {/* Day number header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          day.isToday
                            ? 'bg-accent text-white shadow-xs'
                            : isSelected
                              ? 'text-accent font-bold'
                              : day.isCurrentMonth
                                ? 'text-fg'
                                : 'text-muted'
                        }`}
                      >
                        {day.day}
                      </span>

                      {totalItems > 0 && (
                        <span className="text-[10px] font-medium text-muted">{totalItems}</span>
                      )}
                    </div>

                    {/* Events indicator dots or mini badges */}
                    <div className="mt-1 flex flex-1 flex-col gap-1 overflow-hidden">
                      {/* Dots by kind */}
                      <div className="flex flex-wrap items-center gap-1">
                        {cropCount > 0 && (
                          <span
                            title={`${cropCount} việc trồng trọt`}
                            className="inline-block h-2 w-2 rounded-full bg-accent"
                          />
                        )}
                        {livestockCount > 0 && (
                          <span
                            title={`${livestockCount} việc chăn nuôi`}
                            className="inline-block h-2 w-2 rounded-full bg-warn"
                          />
                        )}
                        {aquaCount > 0 && (
                          <span
                            title={`${aquaCount} việc thủy sản`}
                            className="inline-block h-2 w-2 rounded-full bg-info"
                          />
                        )}
                        {otherActCount > 0 && (
                          <span
                            title={`${otherActCount} việc chung`}
                            className="inline-block h-2 w-2 rounded-full bg-muted"
                          />
                        )}
                      </div>

                      {/* Mini pill preview (first 1-2 items) */}
                      {dayCycles.slice(0, 1).map((evt) => {
                        const conf =
                          CYCLE_KIND_CONFIG[evt.cycleKind] || CYCLE_KIND_CONFIG[CycleKind.CROP];
                        return (
                          <div
                            key={`c-${evt.cycleId}-${evt.kind}`}
                            className={`truncate rounded px-1 py-0.5 text-[10px] font-medium border leading-tight ${conf.badgeClass}`}
                            title={`Mùa vụ: ${evt.name} (${CYCLE_EVENT_KIND_LABELS[evt.kind]?.label || evt.kind})`}
                          >
                            {evt.code}: {CYCLE_EVENT_KIND_LABELS[evt.kind]?.label || evt.kind}
                          </div>
                        );
                      })}

                      {dayActivities.slice(0, dayCycles.length > 0 ? 1 : 2).map((act) => {
                        const actKind = act.cycleKind || CycleKind.CROP;
                        const conf = CYCLE_KIND_CONFIG[actKind];
                        return (
                          <div
                            key={`a-${act.id}`}
                            className={`truncate rounded px-1 py-0.5 text-[10px] font-medium border leading-tight ${conf.badgeClass}`}
                            title={`Nhật ký: ${ACTIVITY_TYPE_LABELS[act.type] || act.type} - ${act.area.name}`}
                          >
                            {ACTIVITY_TYPE_LABELS[act.type] || act.type}
                          </div>
                        );
                      })}

                      {totalItems > 2 && (
                        <div className="text-[9px] text-muted">+{totalItems - 2} mục khác</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-surface p-3 text-xs text-muted shadow-xs">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-medium text-fg">Chú thích loại mùa vụ:</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                <span>Trồng trọt (CROP)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-warn" />
                <span>Chăn nuôi (LIVESTOCK)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-info" />
                <span>Thủy sản (AQUA)</span>
              </div>
            </div>

            {isLoading && <span className="text-muted animate-pulse text-[11px]">Đang tải...</span>}
          </div>
        </div>

        {/* Day Details Panel (1 col on xl) */}
        <div className="space-y-4 rounded-xl border border-line bg-surface p-5 shadow-sm">
          <div>
            <div className="text-xs uppercase font-semibold tracking-wider text-muted">
              Chi tiết trong ngày
            </div>
            <h3 className="mt-1 text-base font-bold text-fg flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-accent" />
              Ngày {selectedDate.split('-').reverse().join('/')}
            </h3>
          </div>

          {/* Cycle Milestones */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-line pb-1.5 text-xs font-semibold text-fg">
              <span>Mốc mùa vụ ({selectedDayData.cycleEvents.length})</span>
            </div>

            {selectedDayData.cycleEvents.length === 0 ? (
              <p className="text-xs text-muted italic">Không có mốc mùa vụ</p>
            ) : (
              <div className="space-y-2">
                {selectedDayData.cycleEvents.map((evt) => {
                  const conf =
                    CYCLE_KIND_CONFIG[evt.cycleKind] || CYCLE_KIND_CONFIG[CycleKind.CROP];
                  const kindInfo = CYCLE_EVENT_KIND_LABELS[evt.kind] || {
                    label: evt.kind,
                    icon: null,
                  };
                  return (
                    <div
                      key={`evt-${evt.cycleId}-${evt.kind}`}
                      className={`rounded-lg border p-3 text-xs ${conf.badgeClass} ${conf.borderClass}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold">{conf.label}</span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-surface/60">
                          {kindInfo.icon}
                          {kindInfo.label}
                        </Badge>
                      </div>

                      <div className="mt-1.5 font-medium">
                        <Link
                          href={`/admin/cycles?id=${evt.cycleId}`}
                          className="hover:underline text-fg flex items-center gap-1"
                        >
                          <Sprout className="h-3.5 w-3.5 text-accent shrink-0" />
                          <span>{evt.name}</span>
                        </Link>
                      </div>

                      <div className="mt-1 text-[11px] text-muted">
                        Mã vụ: <span className="font-mono">{evt.code}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Activities List */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-line pb-1.5 text-xs font-semibold text-fg">
              <span>Nhật ký hoạt động ({selectedDayData.activities.length})</span>
            </div>

            {selectedDayData.activities.length === 0 ? (
              <p className="text-xs text-muted italic">Không có nhật ký công việc</p>
            ) : (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {selectedDayData.activities.map((act) => {
                  return (
                    <div
                      key={`act-${act.id}`}
                      className="rounded-lg border border-line bg-surface-2 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-fg">
                          {ACTIVITY_TYPE_LABELS[act.type] || act.type}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-muted">
                          <Clock className="h-3 w-3" />
                          {formatVietnamTime(act.performedAt)}
                        </span>
                      </div>

                      {act.cycle && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                          <span className="text-muted">Vụ:</span>
                          <Link
                            href={`/admin/cycles?id=${act.cycle.id}`}
                            className="font-medium text-accent hover:underline truncate"
                          >
                            {act.cycle.name} ({act.cycle.code})
                          </Link>
                        </div>
                      )}

                      <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                        <MapPin className="h-3 w-3 text-muted" />
                        <span>{act.area.name}</span>
                        <span className="font-mono">({act.area.code})</span>
                      </div>

                      {act.performedBy && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                          <User className="h-3 w-3" />
                          <span>{act.performedBy.fullName}</span>
                        </div>
                      )}

                      {act.quantity !== null && act.quantity !== undefined && (
                        <div className="mt-1 text-[11px] text-fg">
                          Lượng:{' '}
                          <span className="font-semibold">
                            {act.quantity} {act.unit || ''}
                          </span>
                        </div>
                      )}

                      {act.notes && (
                        <div className="mt-1.5 rounded bg-surface p-1.5 text-[11px] text-muted italic border border-line">
                          &ldquo;{act.notes}&rdquo;
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

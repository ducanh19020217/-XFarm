'use client';

import * as React from 'react';
import {
  CheckCircle2,
  Play,
  Calendar,
  MapPin,
  Sprout,
  RefreshCw,
  Camera,
  X,
  FileCheck2,
} from 'lucide-react';
import {
  Button,
  Toast,
  useToast,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@xfarm/ui';
import { ActivityType, TaskStatus } from '@xfarm/shared';
import { mobileApi, type CompleteTaskPayload } from '@/lib/mobile-api';
import type { TaskItem } from '@/app/admin/hr/common/types';
import { activityTypeLabels } from '@/app/admin/activities/_components/constants';

const statusLabels: Record<TaskStatus, { text: string; color: string }> = {
  [TaskStatus.TODO]: {
    text: 'Cần làm',
    color: 'bg-surface-2 text-fg-2 border border-line',
  },
  [TaskStatus.IN_PROGRESS]: {
    text: 'Đang làm',
    color: 'bg-info-bg text-info border border-info/20',
  },
  [TaskStatus.DONE]: {
    text: 'Đã xong',
    color: 'bg-ok-bg text-ok border border-ok/20',
  },
  [TaskStatus.CANCELLED]: {
    text: 'Đã hủy',
    color: 'bg-crit-bg text-crit border border-crit/20',
  },
};

export default function TodayTasksPage() {
  const { message, showToast, closeToast } = useToast();
  const [tasks, setTasks] = React.useState<TaskItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submittingTaskId, setSubmittingTaskId] = React.useState<string | null>(null);

  // Complete Dialog state
  const [completingTask, setCompletingTask] = React.useState<TaskItem | null>(null);
  const [withActivity, setWithActivity] = React.useState(false);
  const [activityType, setActivityType] = React.useState<ActivityType>(ActivityType.IRRIGATION);
  const [completionNotes, setCompletionNotes] = React.useState('');
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const [isSubmittingCompletion, setIsSubmittingCompletion] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadTasks = React.useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const data = await mobileApi.getMyTasks(undefined, signal);
        setTasks(data || []);
      } catch {
        showToast('Không thể tải danh sách công việc. Vui lòng thử lại!');
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    loadTasks(controller.signal);
    return () => controller.abort();
  }, [loadTasks]);

  const handleStartTask = async (task: TaskItem) => {
    setSubmittingTaskId(task.id);
    try {
      const updated = await mobileApi.startTask(task.id, {
        clientId: crypto.randomUUID?.() || String(Date.now()),
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: updated?.status || TaskStatus.IN_PROGRESS } : t,
        ),
      );
      showToast(`Đã bắt đầu công việc: ${task.title}`);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Không thể bắt đầu công việc. Vui lòng thử lại!',
      );
    } finally {
      setSubmittingTaskId(null);
    }
  };

  const handleOpenCompleteDialog = (task: TaskItem) => {
    setCompletingTask(task);
    setWithActivity(false);
    setActivityType(ActivityType.IRRIGATION);
    setCompletionNotes('');
    setPhotoFile(null);
    setPhotoPreview(null);
  };

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

  const handleSubmitCompletion = async () => {
    if (!completingTask) return;
    setIsSubmittingCompletion(true);

    try {
      const clientId = crypto.randomUUID?.() || String(Date.now());
      const mediaIds: string[] = [];

      if (withActivity && photoFile) {
        try {
          const uploaded = await mobileApi.uploadPhoto(photoFile);
          if (uploaded.id) {
            mediaIds.push(uploaded.id);
          }
        } catch {
          // Bỏ qua lỗi upload ảnh nếu offline, tiếp tục lưu
        }
      }

      const payload: CompleteTaskPayload = {
        clientId,
        notes: completionNotes.trim() || undefined,
        activity: withActivity
          ? {
              type: activityType,
              areaId: completingTask.areaId || undefined,
              cycleId: completingTask.cycleId || undefined,
              notes: completionNotes.trim() || undefined,
              mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
            }
          : undefined,
      };

      const updated = await mobileApi.completeTask(completingTask.id, payload);

      setTasks((prev) =>
        prev.map((t) =>
          t.id === completingTask.id
            ? {
                ...t,
                status: updated?.status || TaskStatus.DONE,
                completedAt: new Date().toISOString(),
                pendingSync: Boolean(updated?.pendingSync),
              }
            : t,
        ),
      );

      setCompletingTask(null);
      showToast(`Đã hoàn thành công việc: ${completingTask.title}`);
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : 'Không thể ghi nhận hoàn thành. Vui lòng thử lại!',
      );
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  const todayStr = React.useMemo(() => {
    return new Date().toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const taskCounts = React.useMemo(() => {
    let todo = 0;
    let inProgress = 0;
    let done = 0;
    for (const t of tasks) {
      if (t.status === TaskStatus.TODO) todo++;
      else if (t.status === TaskStatus.IN_PROGRESS) inProgress++;
      else if (t.status === TaskStatus.DONE) done++;
    }
    return { todo, inProgress, done, total: tasks.length };
  }, [tasks]);

  return (
    <div className="space-y-4">
      {message && <Toast message={message} onClose={closeToast} />}

      {/* Header Info */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h1 className="text-xl font-extrabold text-fg tracking-tight">Việc hôm nay</h1>
          <p className="text-xs font-medium text-muted capitalize">{todayStr}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadTasks()}
          disabled={loading}
          className="h-10 px-3 flex items-center gap-1.5 rounded-lg border-line bg-surface text-fg hover:bg-hover active:scale-95 transition-transform"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-accent' : ''}`} />
          <span className="text-xs font-semibold">Tải lại</span>
        </Button>
      </div>

      {/* Mini summary stats for quick glance */}
      {!loading && tasks.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface border border-line rounded-xl p-2.5 text-center shadow-xs">
            <span className="block text-[11px] font-semibold text-muted">Cần làm</span>
            <span className="text-lg font-extrabold text-fg">{taskCounts.todo}</span>
          </div>
          <div className="bg-info-bg border border-info/20 rounded-xl p-2.5 text-center shadow-xs">
            <span className="block text-[11px] font-semibold text-info">Đang làm</span>
            <span className="text-lg font-extrabold text-info">{taskCounts.inProgress}</span>
          </div>
          <div className="bg-ok-bg border border-ok/20 rounded-xl p-2.5 text-center shadow-xs">
            <span className="block text-[11px] font-semibold text-ok">Đã xong</span>
            <span className="text-lg font-extrabold text-ok">{taskCounts.done}</span>
          </div>
        </div>
      )}

      {/* Task List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm font-medium text-muted">Đang tải danh sách việc...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-bg text-accent">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-base font-bold text-fg">Không có công việc nào</h3>
          <p className="mt-1 text-xs text-muted leading-relaxed max-w-xs mx-auto">
            Hôm nay bạn chưa có công việc nào được giao hoặc đã hoàn thành hết. Chúc bạn một ngày
            làm việc hiệu quả!
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadTasks()}
            className="mt-5 h-11 px-5 rounded-xl text-accent border-line hover:bg-hover font-semibold"
          >
            Kiểm tra lại
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const statusConfig = statusLabels[task.status] || statusLabels[TaskStatus.TODO];
            const isTodo = task.status === TaskStatus.TODO;
            const isInProgress = task.status === TaskStatus.IN_PROGRESS;
            const isDone = task.status === TaskStatus.DONE;
            const isBusy = submittingTaskId === task.id;

            return (
              <div
                key={task.id}
                className="rounded-2xl border border-line bg-surface p-4 shadow-xs space-y-3.5 transition-all text-fg"
              >
                {/* Title & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-fg leading-snug">{task.title}</h3>
                    {task.description && (
                      <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`inline-flex shrink-0 items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${statusConfig.color}`}
                    >
                      {statusConfig.text}
                    </span>
                    {task.pendingSync && (
                      <span className="inline-flex shrink-0 items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-warn-bg text-warn border border-warn/20">
                        Chờ đồng bộ
                      </span>
                    )}
                  </div>
                </div>

                {/* Metadata badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-fg-2">
                  {task.area && (
                    <div className="inline-flex items-center gap-1 bg-surface-2 border border-line px-2 py-1 rounded-md">
                      <MapPin className="h-3.5 w-3.5 text-accent" />
                      <span className="font-medium text-[11px]">{task.area.name}</span>
                    </div>
                  )}
                  {task.cycle && (
                    <div className="inline-flex items-center gap-1 bg-surface-2 border border-line px-2 py-1 rounded-md">
                      <Sprout className="h-3.5 w-3.5 text-accent" />
                      <span className="font-medium text-[11px]">{task.cycle.name}</span>
                    </div>
                  )}
                  {task.dueDate && (
                    <div className="inline-flex items-center gap-1 bg-surface-2 border border-line px-2 py-1 rounded-md">
                      <Calendar className="h-3.5 w-3.5 text-muted" />
                      <span className="font-medium text-[11px]">
                        Hạn: {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions (Large buttons for 1-hand touch & outdoor visibility) */}
                <div className="pt-1">
                  {isTodo && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="lg"
                        disabled={isBusy}
                        onClick={() => handleStartTask(task)}
                        className="h-12 text-sm font-bold border-info/30 text-info bg-info-bg hover:bg-info/20 rounded-xl flex items-center justify-center gap-2 active:scale-98"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        Bắt đầu
                      </Button>
                      <Button
                        variant="default"
                        size="lg"
                        disabled={isBusy}
                        onClick={() => handleOpenCompleteDialog(task)}
                        className="h-12 text-sm font-bold bg-accent hover:bg-accent-hover text-surface rounded-xl flex items-center justify-center gap-2 active:scale-98 shadow-xs"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Hoàn thành
                      </Button>
                    </div>
                  )}

                  {isInProgress && (
                    <Button
                      variant="default"
                      size="lg"
                      disabled={isBusy}
                      onClick={() => handleOpenCompleteDialog(task)}
                      className="w-full h-12 text-sm font-bold bg-accent hover:bg-accent-hover text-surface rounded-xl flex items-center justify-center gap-2 shadow-xs active:scale-98"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Hoàn thành công việc
                    </Button>
                  )}

                  {isDone && (
                    <div className="flex items-center justify-between text-xs text-ok bg-ok-bg border border-ok/20 p-2.5 rounded-xl font-medium">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        Đã hoàn thành xong việc
                      </span>
                      {task.completedAt && (
                        <span className="text-[11px] font-mono opacity-80">
                          {new Date(task.completedAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completion Dialog with optional quick activity */}
      <Dialog
        open={Boolean(completingTask)}
        onOpenChange={(open) => !open && setCompletingTask(null)}
      >
        <DialogContent className="max-w-md w-[92vw] rounded-2xl p-5 max-h-[90vh] overflow-y-auto bg-surface border border-line text-fg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-fg flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-accent" />
              Hoàn thành công việc
            </DialogTitle>
            <DialogDescription className="text-xs text-muted">
              {completingTask?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Toggle ghi nhật ký kèm theo */}
            <label className="flex items-center gap-3 p-3 rounded-xl border border-line bg-surface-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={withActivity}
                onChange={(e) => setWithActivity(e.target.checked)}
                className="h-5 w-5 rounded text-accent focus:ring-accent cursor-pointer"
              />
              <div className="flex-1">
                <span className="text-sm font-bold text-fg">Ghi nhật ký canh tác kèm theo</span>
                <p className="text-[11px] text-muted mt-0.5">
                  Tự động tạo bản ghi nhật ký gắn với công việc này
                </p>
              </div>
            </label>

            {/* Detailed activity fields when toggled */}
            {withActivity && (
              <div className="space-y-3 p-3 rounded-xl border border-line bg-surface-2">
                <div>
                  <label className="block text-xs font-bold text-fg-2 mb-1">Loại nhật ký</label>
                  <Select
                    value={activityType}
                    onValueChange={(val) => setActivityType(val as ActivityType)}
                  >
                    <SelectTrigger className="h-11 rounded-lg bg-surface border-line text-sm text-fg">
                      <SelectValue placeholder="Chọn loại nhật ký" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface border-line text-fg">
                      {Object.entries(activityTypeLabels).map(([type, label]) => (
                        <SelectItem key={type} value={type}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-fg-2 mb-1">Chụp ảnh thực tế</label>
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
                        alt="Ảnh chụp thực tế"
                        className="object-contain max-h-48 w-full"
                      />
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-16 border-2 border-dashed border-accent/40 rounded-xl bg-surface flex items-center justify-center gap-2 text-accent font-semibold text-sm active:bg-hover transition-colors"
                    >
                      <Camera className="h-5 w-5" />
                      Chụp ảnh bằng camera
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Ghi chú */}
            <div>
              <label className="block text-xs font-bold text-fg-2 mb-1">Ghi chú thực hiện</label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Nhập tình hình thực tế, lưu ý hoặc số liệu..."
                rows={3}
                className="w-full rounded-xl border border-line bg-surface p-3 text-sm text-fg placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 pt-2 sm:flex-col">
            <Button
              variant="default"
              size="lg"
              disabled={isSubmittingCompletion}
              onClick={handleSubmitCompletion}
              className="w-full h-12 text-base font-bold bg-accent hover:bg-accent-hover text-surface rounded-xl active:scale-98"
            >
              {isSubmittingCompletion ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Đang ghi nhận...
                </div>
              ) : (
                'Xác nhận hoàn thành'
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={isSubmittingCompletion}
              onClick={() => setCompletingTask(null)}
              className="w-full h-11 text-sm rounded-xl border-line bg-surface text-fg hover:bg-hover"
            >
              Hủy bỏ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

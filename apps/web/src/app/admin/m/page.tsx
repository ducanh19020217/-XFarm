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
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  [TaskStatus.IN_PROGRESS]: {
    text: 'Đang làm',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  },
  [TaskStatus.DONE]: {
    text: 'Đã xong',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  [TaskStatus.CANCELLED]: {
    text: 'Đã hủy',
    color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
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

  return (
    <div className="space-y-4">
      {message && <Toast message={message} onClose={closeToast} />}

      {/* Header Info */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Việc hôm nay
          </h1>
          <p className="text-xs font-medium text-slate-500 capitalize">{todayStr}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadTasks()}
          disabled={loading}
          className="h-10 px-3 flex items-center gap-1.5 text-slate-600 rounded-lg active:scale-95 transition-transform"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          <span className="text-xs font-semibold">Tải lại</span>
        </Button>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium text-slate-500">Đang tải danh sách việc...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-slate-100">
            Không có công việc nào
          </h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            Hôm nay bạn chưa có công việc nào được giao hoặc đã hoàn thành hết. Chúc bạn một ngày
            làm việc hiệu quả!
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadTasks()}
            className="mt-5 h-11 px-5 rounded-xl text-emerald-600 border-emerald-200 font-semibold"
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
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3.5 transition-all"
              >
                {/* Title & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${statusConfig.color}`}
                  >
                    {statusConfig.text}
                  </span>
                </div>

                {/* Metadata badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  {task.area && (
                    <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded-md">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="font-medium text-[11px]">{task.area.name}</span>
                    </div>
                  )}
                  {task.cycle && (
                    <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded-md">
                      <Sprout className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="font-medium text-[11px]">{task.cycle.name}</span>
                    </div>
                  )}
                  {task.dueDate && (
                    <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded-md">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-medium text-[11px]">
                        Hạn: {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions (Large buttons for 1-hand touch) */}
                <div className="pt-1">
                  {isTodo && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="lg"
                        disabled={isBusy}
                        onClick={() => handleStartTask(task)}
                        className="h-12 text-sm font-bold border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 rounded-xl flex items-center justify-center gap-2 active:scale-98"
                      >
                        <Play className="h-4 w-4 fill-current" />
                        Bắt đầu
                      </Button>
                      <Button
                        variant="default"
                        size="lg"
                        disabled={isBusy}
                        onClick={() => handleOpenCompleteDialog(task)}
                        className="h-12 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-2 active:scale-98"
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
                      className="w-full h-12 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-2 shadow-sm active:scale-98"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Hoàn thành công việc
                    </Button>
                  )}

                  {isDone && (
                    <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl font-medium">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        Đã hoàn thành xong việc
                      </span>
                      {task.completedAt && (
                        <span className="text-[11px] text-emerald-600">
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
        <DialogContent className="max-w-md w-[92vw] rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-emerald-600" />
              Hoàn thành công việc
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {completingTask?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Toggle ghi nhật ký kèm theo */}
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={withActivity}
                onChange={(e) => setWithActivity(e.target.checked)}
                className="h-5 w-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <div className="flex-1">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Ghi nhật ký canh tác kèm theo
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tự động tạo bản ghi nhật ký gắn với công việc này
                </p>
              </div>
            </label>

            {/* Detailed activity fields when toggled */}
            {withActivity && (
              <div className="space-y-3 p-3 rounded-xl border border-emerald-100 dark:border-emerald-950/70 bg-emerald-50/40 dark:bg-emerald-950/20">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Loại nhật ký
                  </label>
                  <Select
                    value={activityType}
                    onValueChange={(val) => setActivityType(val as ActivityType)}
                  >
                    <SelectTrigger className="h-11 rounded-lg bg-white dark:bg-slate-900 text-sm">
                      <SelectValue placeholder="Chọn loại nhật ký" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(activityTypeLabels).map(([type, label]) => (
                        <SelectItem key={type} value={type}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Chụp ảnh thực tế
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
                      className="w-full h-16 border-2 border-dashed border-emerald-300 dark:border-emerald-800 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm active:bg-emerald-50"
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ghi chú thực hiện
              </label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Nhập tình hình thực tế, lưu ý hoặc số liệu..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 pt-2 sm:flex-col">
            <Button
              variant="default"
              size="lg"
              disabled={isSubmittingCompletion}
              onClick={handleSubmitCompletion}
              className="w-full h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
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
              className="w-full h-11 text-sm rounded-xl"
            >
              Hủy bỏ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

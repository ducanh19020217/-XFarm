'use client';

import * as React from 'react';
import { Bell, Check, Edit2, Loader2, Plus, Power, Trash2, X } from 'lucide-react';
import { Badge, Button, FormDialog, Input, Label } from '@xfarm/ui';
import {
  type SensorItem,
  type AlertRuleItem,
  AlertOp,
  ALERT_OP_LABELS,
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
} from '@/lib/iot-api';

interface AlertRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sensor: SensorItem | null;
  canManage?: boolean;
  onRulesChanged?: () => void;
}

export function AlertRulesDialog({
  open,
  onOpenChange,
  sensor,
  canManage = false,
  onRulesChanged,
}: AlertRulesDialogProps) {
  const [rules, setRules] = React.useState<AlertRuleItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Form state for creating / editing a rule
  const [isEditingRule, setIsEditingRule] = React.useState<AlertRuleItem | null>(null);
  const [op, setOp] = React.useState<AlertOp>(AlertOp.GT);
  const [threshold, setThreshold] = React.useState<string>('');
  const [cooldownMinutes, setCooldownMinutes] = React.useState<string>('30');
  const [isActive, setIsActive] = React.useState(true);
  const [formError, setFormError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchRules = React.useCallback(async () => {
    if (!sensor?.id) return;
    setIsLoading(true);
    try {
      const res = await getAlertRules({ sensorId: sensor.id, pageSize: 50 });
      setRules(res.data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [sensor?.id]);

  React.useEffect(() => {
    if (open && sensor?.id) {
      void fetchRules();
      resetForm();
    }
  }, [open, sensor?.id, fetchRules]);

  const resetForm = () => {
    setIsEditingRule(null);
    setOp(AlertOp.GT);
    setThreshold('');
    setCooldownMinutes('30');
    setIsActive(true);
    setFormError('');
  };

  const handleStartEdit = (rule: AlertRuleItem) => {
    setIsEditingRule(rule);
    setOp(rule.op);
    setThreshold(String(rule.threshold));
    setCooldownMinutes(String(rule.cooldownMinutes ?? 30));
    setIsActive(rule.isActive ?? true);
    setFormError('');
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !sensor?.id) return;

    if (!threshold.trim() || Number.isNaN(Number(threshold))) {
      setFormError('Vui lòng nhập giá trị ngưỡng hợp lệ');
      return;
    }

    const numThreshold = Number(threshold);
    const numCooldown = Number(cooldownMinutes) || 30;

    setIsSubmitting(true);
    setFormError('');
    try {
      if (isEditingRule) {
        await updateAlertRule(isEditingRule.id, {
          op,
          threshold: numThreshold,
          cooldownMinutes: numCooldown,
          isActive,
        });
      } else {
        await createAlertRule({
          sensorId: sensor.id,
          op,
          threshold: numThreshold,
          cooldownMinutes: numCooldown,
          isActive,
        });
      }
      resetForm();
      await fetchRules();
      onRulesChanged?.();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Lỗi khi lưu ngưỡng');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (rule: AlertRuleItem) => {
    if (!canManage) return;
    try {
      await updateAlertRule(rule.id, { isActive: !rule.isActive });
      await fetchRules();
      onRulesChanged?.();
    } catch {
      // ignore
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!canManage) return;
    try {
      await deleteAlertRule(ruleId);
      await fetchRules();
      onRulesChanged?.();
    } catch {
      // ignore
    }
  };

  const selectClass =
    'h-9 rounded-md border border-line bg-surface px-2.5 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent/20';

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        canManage
          ? `Cấu hình Ngưỡng Cảnh Báo – ${sensor?.name || ''}`
          : `Ngưỡng Cảnh Báo – ${sensor?.name || ''}`
      }
      description={
        canManage
          ? `Cảm biến ${sensor?.code || ''} (${sensor?.unit || ''}). Hệ thống sẽ tạo thông báo chuông khi giá trị đo vượt ngưỡng.`
          : `Cảm biến ${sensor?.code || ''} (${sensor?.unit || ''}). Danh sách ngưỡng cảnh báo đã thiết lập (chỉ xem).`
      }
    >
      <div className="space-y-4 py-1" data-testid="alert-rules-dialog-content">
        {/* Form add / edit */}
        {canManage && (
          <form
            onSubmit={handleSaveRule}
            className="rounded-lg border border-line bg-surface-2 p-3.5 space-y-3"
            data-testid="alert-rule-form"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-fg flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 text-accent" />
                {isEditingRule ? 'Chỉnh sửa ngưỡng cảnh báo' : 'Thêm ngưỡng cảnh báo mới'}
              </span>
              {isEditingRule && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                  className="h-6 text-[11px] text-muted hover:text-fg"
                >
                  <X className="h-3 w-3 mr-1" />
                  Hủy sửa
                </Button>
              )}
            </div>

            {formError && <p className="text-xs text-crit">{formError}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="rule-op" className="text-xs">
                  Điều kiện
                </Label>
                <select
                  id="rule-op"
                  value={op}
                  onChange={(e) => setOp(e.target.value as AlertOp)}
                  className={`w-full ${selectClass}`}
                >
                  <option value={AlertOp.GT}>{ALERT_OP_LABELS[AlertOp.GT]}</option>
                  <option value={AlertOp.LT}>{ALERT_OP_LABELS[AlertOp.LT]}</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="rule-threshold" className="text-xs">
                  Ngưỡng ({sensor?.unit || 'giá trị'})
                </Label>
                <Input
                  id="rule-threshold"
                  type="number"
                  step="any"
                  placeholder="Ví dụ: 35"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="rule-cooldown" className="text-xs">
                  Chờ lặp lại (phút)
                </Label>
                <Input
                  id="rule-cooldown"
                  type="number"
                  min="1"
                  placeholder="30"
                  value={cooldownMinutes}
                  onChange={(e) => setCooldownMinutes(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rule-is-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-line text-accent focus:ring-accent"
                />
                <Label htmlFor="rule-is-active" className="cursor-pointer text-xs text-fg">
                  Kích hoạt ngưỡng này
                </Label>
              </div>

              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                data-testid="submit-alert-rule-btn"
                className="h-8 text-xs"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : isEditingRule ? (
                  <Check className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <Plus className="h-3.5 w-3.5 mr-1" />
                )}
                {isEditingRule ? 'Cập nhật' : 'Thêm ngưỡng'}
              </Button>
            </div>
          </form>
        )}

        {/* Existing rules list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-fg-2">
            <span>Danh sách ngưỡng hiện tại ({rules.length})</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Đang tải danh sách ngưỡng...
            </div>
          ) : rules.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line p-6 text-center text-xs text-muted">
              Chưa có ngưỡng cảnh báo nào cho cảm biến này.
            </div>
          ) : (
            <div className="divide-y divide-line rounded-lg border border-line bg-surface overflow-hidden">
              {rules.map((rule) => {
                const opText = rule.op === AlertOp.GT ? 'Vượt quá (>)' : 'Thấp hơn (<)';
                return (
                  <div
                    key={rule.id}
                    data-testid={`alert-rule-row-${rule.id}`}
                    className={`flex items-center justify-between p-3 text-xs ${
                      !rule.isActive ? 'opacity-60 bg-surface-2/50' : ''
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-fg">
                          {opText} {rule.threshold} {sensor?.unit}
                        </span>
                        {rule.isActive ? (
                          <Badge
                            variant="default"
                            className="text-[10px] px-1.5 py-0 bg-ok-bg text-ok border border-ok/30"
                          >
                            Đang bật
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 bg-surface-2 text-muted border border-line"
                          >
                            Đã tắt
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted">
                        Thời gian chờ báo lại (cooldown): {rule.cooldownMinutes ?? 30} phút
                      </p>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(rule)}
                          className={`h-7 w-7 p-0 ${
                            rule.isActive ? 'text-ok hover:text-crit' : 'text-muted hover:text-ok'
                          }`}
                          title={rule.isActive ? 'Tắt ngưỡng' : 'Bật ngưỡng'}
                          data-testid={`toggle-rule-btn-${rule.id}`}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(rule)}
                          className="h-7 w-7 p-0 text-muted hover:text-accent"
                          title="Chỉnh sửa"
                          data-testid={`edit-rule-btn-${rule.id}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="h-7 w-7 p-0 text-crit hover:text-crit/80"
                          title="Xóa ngưỡng"
                          data-testid={`delete-rule-btn-${rule.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="close-alert-rules-dialog-btn"
          >
            Đóng
          </Button>
        </div>
      </div>
    </FormDialog>
  );
}

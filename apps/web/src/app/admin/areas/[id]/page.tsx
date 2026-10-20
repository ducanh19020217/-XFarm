'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit2,
  Lock,
  Unlock,
  Sprout,
  MapPin,
  Layers,
  FileText,
  AlertCircle,
  RefreshCw,
  FolderTree,
  QrCode,
} from 'lucide-react';
import { Button, StatusBadge, Badge, ConfirmDialog } from '@xfarm/ui';
import { Role, type CreateAreaInput } from '@xfarm/shared';
import { apiFetch, ApiError } from '@/lib/api';
import { AreaItem, AREA_TYPE_LABELS, AREA_TYPE_COLORS } from '@/lib/area-constants';
import { GeoJsonPolygon } from '@/lib/geojson';
import { AreaFormDialog } from '@/components/area/area-form-dialog';
import { AreaQrDialog } from '@/components/area/area-qr-dialog';
import { DynamicAreaMapEditor } from '@/components/map';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export default function AreaDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(null);
  const canWrite = currentUser?.role === Role.OWNER || currentUser?.role === Role.MANAGER;

  const [area, setArea] = React.useState<AreaItem | null>(null);
  const [allAreas, setAllAreas] = React.useState<AreaItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Form Edit Dialog State
  const [formOpen, setFormOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isFormSubmitting, setIsFormSubmitting] = React.useState(false);

  // Confirm Lock / Unlock Dialog State
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);
  const [statusError, setStatusError] = React.useState<string | null>(null);
  const [isStatusSubmitting, setIsStatusSubmitting] = React.useState(false);

  // QR Dialog state
  const [qrDialogOpen, setQrDialogOpen] = React.useState(false);

  // Map saving state
  const [isMapSaving, setIsMapSaving] = React.useState(false);

  // 1. Lấy thông tin user hiện tại để phân quyền
  React.useEffect(() => {
    let isMounted = true;
    apiFetch<{ data: UserProfile }>('/auth/me')
      .then((res) => {
        if (isMounted) setCurrentUser(res.data);
      })
      .catch((err) => {
        console.warn('Lỗi lấy thông tin người dùng:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Tải chi tiết khu vực (/areas/:id)
  const fetchAreaDetail = React.useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch<{ data: AreaItem } | AreaItem>(`/areas/${id}`);
      const data = 'data' in res && res.data ? res.data : (res as AreaItem);
      setArea(data);
    } catch (err) {
      console.error('Lỗi khi tải thông tin chi tiết khu vực:', err);
      if (err instanceof ApiError && err.statusCode === 404) {
        setErrorMessage('Không tìm thấy khu/lô này trong hệ thống.');
      } else {
        setErrorMessage('Đã có lỗi xảy ra khi tải dữ liệu khu vực.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // 3. Tải danh sách toàn bộ khu để làm tùy chọn cha khi sửa
  const fetchAllAreas = React.useCallback(async () => {
    try {
      const res = await apiFetch<{ data: AreaItem[] }>('/areas?page=1&pageSize=100');
      setAllAreas(res.data || []);
    } catch {
      // bỏ qua
    }
  }, []);

  React.useEffect(() => {
    fetchAreaDetail();
    fetchAllAreas();
  }, [fetchAreaDetail, fetchAllAreas]);

  // Xử lý cập nhật thông tin chung từ dialog form
  const handleFormSubmit = async (values: CreateAreaInput) => {
    if (!area) return;
    setIsFormSubmitting(true);
    setFormError(null);
    try {
      await apiFetch(`/areas/${area.id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
      setFormOpen(false);
      fetchAreaDetail();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message || 'Lỗi từ máy chủ khi cập nhật');
      } else {
        setFormError('Đã có lỗi xảy ra khi cập nhật');
      }
    } finally {
      setIsFormSubmitting(false);
    }
  };

  // Xử lý lưu riêng tọa độ Polygon từ bản đồ
  const handleSaveMapGeoJson = async (geojson: GeoJsonPolygon | null) => {
    if (!area) return;
    setIsMapSaving(true);
    try {
      await apiFetch(`/areas/${area.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ geojson }),
      });
      fetchAreaDetail();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Lỗi khi lưu tọa độ polygon lên hệ thống';
      throw new Error(msg);
    } finally {
      setIsMapSaving(false);
    }
  };

  // Xử lý khóa / mở khóa khu vực
  const handleToggleStatus = async () => {
    if (!area) return;
    setIsStatusSubmitting(true);
    setStatusError(null);
    try {
      await apiFetch(`/areas/${area.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !area.isActive }),
      });
      setStatusDialogOpen(false);
      fetchAreaDetail();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 422) {
          setStatusError(
            err.message ||
              'Không thể khóa khu vực đang có mùa vụ hoạt động (ACTIVE hoặc HARVESTING).',
          );
        } else {
          setStatusError(err.message || `Lỗi: ${err.statusCode}`);
        }
      } else {
        setStatusError('Đã có lỗi không xác định xảy ra khi cập nhật trạng thái.');
      }
    } finally {
      setIsStatusSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-line bg-surface">
        <div className="flex items-center gap-2 text-sm text-muted">
          <RefreshCw className="h-5 w-5 animate-spin text-accent" />
          <span>Đang tải thông tin khu/lô...</span>
        </div>
      </div>
    );
  }

  if (errorMessage || !area) {
    return (
      <div className="space-y-4">
        <Link href="/admin/areas">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Quay lại danh sách
          </Button>
        </Link>
        <div className="rounded-lg border border-crit/30 bg-crit-bg p-6 text-center text-crit">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-crit" />
          <h3 className="text-base font-semibold">Không tìm thấy khu vực</h3>
          <p className="mt-1 text-sm">{errorMessage || 'Khu vực không tồn tại hoặc đã bị xóa.'}</p>
        </div>
      </div>
    );
  }

  const typeStyle = AREA_TYPE_COLORS[area.type];
  const cyclesCount = area.activeCyclesCount ?? area._count?.cycles ?? 0;
  const childAreas = area.children || [];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/areas')}
            className="h-9 w-9 p-0"
            title="Quay lại danh sách khu/lô"
          >
            <ArrowLeft className="h-4 w-4 text-muted" />
          </Button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-fg">{area.name}</h1>
              <span className="font-mono text-sm font-semibold text-muted">({area.code})</span>
              <Badge
                variant="outline"
                className="text-xs px-2 py-0.5"
                style={{
                  backgroundColor: `${typeStyle?.fill}15`,
                  color: typeStyle?.stroke,
                  borderColor: `${typeStyle?.stroke}40`,
                }}
              >
                {AREA_TYPE_LABELS[area.type] || area.type}
              </Badge>
              <StatusBadge status={area.isActive} />
            </div>
            <p className="text-xs text-muted mt-0.5">
              Tạo ngày {new Date(area.createdAt).toLocaleDateString('vi-VN')} • Cập nhật lần cuối{' '}
              {new Date(area.updatedAt).toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQrDialogOpen(true)}
            title="In tem mã QR khu/lô"
          >
            <QrCode className="mr-1.5 h-3.5 w-3.5 text-accent" />
            In QR khu/lô
          </Button>

          {canWrite && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormError(null);
                  setFormOpen(true);
                }}
              >
                <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                Sửa thông tin
              </Button>

              <Button
                variant={area.isActive ? 'outline' : 'default'}
                size="sm"
                className={area.isActive ? 'text-crit hover:bg-crit-bg hover:text-crit' : ''}
                onClick={() => {
                  setStatusError(null);
                  setStatusDialogOpen(true);
                }}
              >
                {area.isActive ? (
                  <>
                    <Lock className="mr-1.5 h-3.5 w-3.5" />
                    Khóa khu vực
                  </>
                ) : (
                  <>
                    <Unlock className="mr-1.5 h-3.5 w-3.5" />
                    Mở khóa khu vực
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Thông tin tổng quan & Khu con */}
        <div className="space-y-6 lg:col-span-1">
          {/* Card Thông tin cơ bản */}
          <div className="rounded-lg border border-line bg-surface p-5 shadow-xs text-fg">
            <h2 className="mb-4 text-sm font-bold text-fg uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent" />
              Thông tin chi tiết
            </h2>

            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-muted font-medium">Mã định danh</dt>
                <dd className="font-mono font-semibold text-fg mt-0.5">{area.code}</dd>
              </div>

              <div>
                <dt className="text-muted font-medium">Phân loại khu</dt>
                <dd className="font-medium text-fg mt-0.5">
                  {AREA_TYPE_LABELS[area.type] || area.type}
                </dd>
              </div>

              <div>
                <dt className="text-muted font-medium">Khu cha trực thuộc</dt>
                <dd className="mt-0.5">
                  {area.parent ? (
                    <Link
                      href={`/admin/areas/${area.parent.id}`}
                      className="font-medium text-accent hover:underline inline-flex items-center gap-1"
                    >
                      {area.parent.name} ({area.parent.code}) &rarr;
                    </Link>
                  ) : (
                    <span className="text-muted">Khu gốc (Root)</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-muted font-medium">Diện tích canh tác</dt>
                <dd className="font-semibold text-base text-fg mt-0.5">
                  {area.areaM2 != null
                    ? `${Number(area.areaM2).toLocaleString('vi-VN')} m²`
                    : 'Chưa đo đạc'}
                </dd>
              </div>

              <div>
                <dt className="text-muted font-medium">Số mùa vụ đang hoạt động</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <Sprout className="h-4 w-4 text-accent" />
                  <span className="font-semibold text-accent">{cyclesCount} vụ đang chạy</span>
                  <Link
                    href={`/admin/cycles`}
                    className="ml-auto text-[11px] text-accent hover:underline font-medium"
                  >
                    Xem mùa vụ &rarr;
                  </Link>
                </dd>
              </div>

              {area.description && (
                <div className="pt-2 border-t border-line">
                  <dt className="text-muted font-medium flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" /> Mô tả
                  </dt>
                  <dd className="mt-1 text-fg-2 leading-relaxed bg-surface-2 p-2.5 rounded border border-line">
                    {area.description}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Card Danh sách Khu con */}
          <div className="rounded-lg border border-line bg-surface p-5 shadow-xs text-fg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-fg uppercase tracking-wider flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-accent" />
                Khu con trực thuộc ({childAreas.length})
              </h2>
            </div>

            {childAreas.length === 0 ? (
              <p className="text-xs text-muted italic">
                Chưa có khu/lô con nào trực thuộc khu vực này.
              </p>
            ) : (
              <div className="space-y-2">
                {childAreas.map((child) => (
                  <Link
                    key={child.id}
                    href={`/admin/areas/${child.id}`}
                    className="group flex items-center justify-between rounded-md border border-line p-2.5 text-xs transition-colors hover:bg-hover"
                  >
                    <div>
                      <div className="font-semibold text-fg group-hover:text-accent">
                        {child.name}
                      </div>
                      <div className="font-mono text-[11px] text-muted">
                        {child.code} • {AREA_TYPE_LABELS[child.type]}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-fg-2">
                        {child.areaM2 ? `${Number(child.areaM2).toLocaleString('vi-VN')} m²` : '—'}
                      </div>
                      <StatusBadge status={child.isActive} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Bản đồ polygon Leaflet */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border border-line bg-surface p-4 shadow-xs text-fg">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-fg flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-accent" />
                  Bản đồ ranh giới & Polygon
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Hiển thị ranh giới của khu và các khu con. Có thể vẽ, sửa đỉnh và lưu lại polygon.
                </p>
              </div>

              {canWrite && (
                <span className="text-xs text-accent bg-accent-bg px-2.5 py-1 rounded-full font-medium">
                  Chế độ chỉnh sửa polygon khả dụng
                </span>
              )}
            </div>

            <DynamicAreaMapEditor
              area={area}
              childrenAreas={childAreas}
              value={area.geojson}
              readOnly={!canWrite}
              onSave={canWrite ? handleSaveMapGeoJson : undefined}
              isSaving={isMapSaving}
              className="h-[560px] w-full"
            />
          </div>
        </div>
      </div>

      {/* Form Dialog Sửa thông tin khu vực */}
      <AreaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        area={area}
        parentOptions={allAreas.map((a) => ({
          id: a.id,
          name: a.name,
          code: a.code,
        }))}
        onSubmit={handleFormSubmit}
        formError={formError}
        isSubmitting={isFormSubmitting}
      />

      {/* Confirm Dialog Khóa / Mở khóa */}
      <ConfirmDialog
        open={statusDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setStatusDialogOpen(false);
            setStatusError(null);
          }
        }}
        title={area.isActive ? 'Khóa Khu/lô' : 'Mở khóa Khu/lô'}
        description={
          statusError
            ? `LỖI: ${statusError}`
            : `Bạn có chắc chắn muốn ${
                area.isActive ? 'khóa' : 'mở khóa'
              } khu vực "${area.name}" (${area.code})? ${
                area.isActive
                  ? 'Khu vực bị khóa sẽ không thể gán mùa vụ hoặc hoạt động mới.'
                  : 'Khu vực sẽ được kích hoạt lại để canh tác bình thường.'
              }`
        }
        confirmText={statusError ? 'Đóng' : area.isActive ? 'Khóa khu vực' : 'Mở khóa'}
        cancelText={statusError ? undefined : 'Hủy bỏ'}
        isDanger={area.isActive && !statusError}
        isLoading={isStatusSubmitting}
        onConfirm={() => {
          if (statusError) {
            setStatusDialogOpen(false);
            setStatusError(null);
          } else {
            handleToggleStatus();
          }
        }}
      />

      {/* Dialog In mã QR Khu/Lô */}
      <AreaQrDialog open={qrDialogOpen} onOpenChange={setQrDialogOpen} area={area} />
    </div>
  );
}

'use client';

import * as React from 'react';
import { PageHeader, Button, Input, Label } from '@xfarm/ui';
import {
  Save,
  Loader2,
  Plus,
  Trash2,
  Building,
  Phone,
  Share2,
  Image as ImageIcon,
  CreditCard,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { apiFetch, ApiError, isAbortError } from '@/lib/api';
import { useAdminUser } from '../../admin-user-context';
import { Role } from '@xfarm/shared';
import { SingleImageUpload } from '@/components/ui/image-upload';

interface BannerItem {
  imageUrl: string;
  title: string;
  link?: string;
}

interface VietQRInfo {
  bankId: string;
  accountNo: string;
  accountName: string;
  template?: string;
}

interface SettingsState {
  'farm.name': string;
  'farm.slogan': string;
  'farm.about': string;
  'contact.phone': string;
  'contact.email': string;
  'contact.address': string;
  'social.facebook': string;
  'social.zalo': string;
  'social.youtube': string;
  'home.banners': BannerItem[];
  'bank.vietqr': VietQRInfo;
}

const defaultSettings: SettingsState = {
  'farm.name': 'XFarm - Nông trại sinh thái',
  'farm.slogan': 'Nông sản sạch từ tâm - Cho sức khỏe vững bền',
  'farm.about':
    'XFarm canh tác theo tiêu chuẩn hữu cơ, tuần hoàn không hóa chất, mang lại thực phẩm an toàn tuyệt đối.',
  'contact.phone': '0901 234 567',
  'contact.email': 'lienhe@xfarm.vn',
  'contact.address': 'Thôn Sinh Thái, Xã Nông Nghiệp, Huyện Xanh, Tỉnh Lâm Đồng',
  'social.facebook': 'https://facebook.com/xfarm.vietnam',
  'social.zalo': 'https://zalo.me/0901234567',
  'social.youtube': 'https://youtube.com/@xfarm-vietnam',
  'home.banners': [
    {
      imageUrl:
        'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80',
      title: 'Mùa thu hoạch bưởi da xanh hữu cơ',
      link: '/products',
    },
  ],
  'bank.vietqr': {
    bankId: 'VCB',
    accountNo: '1029384756',
    accountName: 'CONG TY CP NONG NGHIEP XFARM',
    template: 'compact2',
  },
};

export default function SettingsCmsPage() {
  const user = useAdminUser();
  // SALES is restricted from editing settings
  const canEdit = user?.role === Role.OWNER || user?.role === Role.MANAGER;

  const [settings, setSettings] = React.useState<SettingsState>(defaultSettings);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadSettings() {
      setIsLoading(true);
      try {
        const res = await apiFetch<
          { data: Array<{ key: string; value: unknown }> } | { data: Record<string, unknown> }
        >('/site-settings', { signal: controller.signal });

        if (isMounted && res.data) {
          const loaded: Partial<SettingsState> = {};
          if (Array.isArray(res.data)) {
            for (const item of res.data) {
              if (item.key in defaultSettings) {
                (loaded as Record<string, unknown>)[item.key] = item.value;
              }
            }
          } else if (typeof res.data === 'object') {
            for (const [k, v] of Object.entries(res.data)) {
              if (k in defaultSettings) {
                (loaded as Record<string, unknown>)[k] = v;
              }
            }
          }
          setSettings((prev) => ({ ...prev, ...loaded }));
        }
      } catch (err) {
        if (!isAbortError(err)) {
          // If endpoint is not ready, keep defaults
          console.warn('Chưa thể tải site-settings từ API, sử dụng giá trị mặc định:', err);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadSettings();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const handleChange = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleBannerChange = (index: number, field: keyof BannerItem, val: string) => {
    const updated = [...settings['home.banners']];
    updated[index] = { ...updated[index], [field]: val };
    handleChange('home.banners', updated);
  };

  const handleAddBanner = () => {
    const updated: BannerItem[] = [
      ...settings['home.banners'],
      { imageUrl: '', title: 'Banner mới', link: '' },
    ];
    handleChange('home.banners', updated);
  };

  const handleRemoveBanner = (index: number) => {
    const updated = settings['home.banners'].filter((_, i) => i !== index);
    handleChange('home.banners', updated);
  };

  const handleVietQRChange = (field: keyof VietQRInfo, val: string) => {
    handleChange('bank.vietqr', {
      ...settings['bank.vietqr'],
      [field]: val,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Save all keys to PUT /site-settings/:key
      const keys = Object.keys(settings) as Array<keyof SettingsState>;
      for (const k of keys) {
        await apiFetch(`/site-settings/${encodeURIComponent(k)}`, {
          method: 'PUT',
          body: JSON.stringify({ value: settings[k] }),
        });
      }
      setSuccessMessage('Đã lưu cấu hình website thành công!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Đã xảy ra lỗi khi lưu cấu hình');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cài đặt Website & Thông tin Chung"
        description="Quản lý thông tin công khai của nông trại, banner quảng cáo và tài khoản VietQR"
      >
        {canEdit && (
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                Lưu tất cả thay đổi
              </>
            )}
          </Button>
        )}
      </PageHeader>

      {!canEdit && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>
            Bạn đang xem ở chế độ chỉ đọc. Chỉ tài khoản vai trò <strong>Chủ trại (OWNER)</strong>{' '}
            hoặc <strong>Quản lý (MANAGER)</strong> mới có quyền lưu thay đổi cài đặt website.
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Thông tin nông trại */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <Building className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Thông tin nhận diện nông trại
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="farm-name">Tên nông trại (farm.name) *</Label>
              <Input
                id="farm-name"
                value={settings['farm.name']}
                onChange={(e) => handleChange('farm.name', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="farm-slogan">Khẩu hiệu / Slogan (farm.slogan)</Label>
              <Input
                id="farm-slogan"
                value={settings['farm.slogan']}
                onChange={(e) => handleChange('farm.slogan', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="farm-about">Giới thiệu ngắn (farm.about)</Label>
            <textarea
              id="farm-about"
              rows={3}
              value={settings['farm.about']}
              onChange={(e) => handleChange('farm.about', e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              disabled={!canEdit || isSaving}
            />
          </div>
        </div>

        {/* Section 2: Thông tin liên hệ */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <Phone className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Kênh liên hệ công khai
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="contact-phone">Số điện thoại hotline (contact.phone) *</Label>
              <Input
                id="contact-phone"
                value={settings['contact.phone']}
                onChange={(e) => handleChange('contact.phone', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="contact-email">Email tiếp nhận (contact.email) *</Label>
              <Input
                id="contact-email"
                type="email"
                value={settings['contact.email']}
                onChange={(e) => handleChange('contact.email', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="contact-address">Địa chỉ nông trại (contact.address)</Label>
            <Input
              id="contact-address"
              value={settings['contact.address']}
              onChange={(e) => handleChange('contact.address', e.target.value)}
              disabled={!canEdit || isSaving}
            />
          </div>
        </div>

        {/* Section 3: Mạng xã hội */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <Share2 className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Liên kết Mạng xã hội
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="social-fb">Facebook URL (social.facebook)</Label>
              <Input
                id="social-fb"
                placeholder="https://facebook.com/..."
                value={settings['social.facebook']}
                onChange={(e) => handleChange('social.facebook', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="social-zl">Zalo link / SĐT (social.zalo)</Label>
              <Input
                id="social-zl"
                placeholder="https://zalo.me/..."
                value={settings['social.zalo']}
                onChange={(e) => handleChange('social.zalo', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="social-yt">Youtube URL (social.youtube)</Label>
              <Input
                id="social-yt"
                placeholder="https://youtube.com/@..."
                value={settings['social.youtube']}
                onChange={(e) => handleChange('social.youtube', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Banner trang chủ */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Banner quảng bá trang chủ (home.banners)
              </h3>
            </div>
            {canEdit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddBanner}
                disabled={isSaving}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Thêm banner
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {settings['home.banners'].map((banner, index) => (
              <div
                key={index}
                className="rounded-md border border-slate-200 p-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Banner #{index + 1}
                  </span>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleRemoveBanner(index)}
                      disabled={isSaving}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Xóa
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Tiêu đề banner</Label>
                    <Input
                      value={banner.title}
                      onChange={(e) => handleBannerChange(index, 'title', e.target.value)}
                      placeholder="VD: Mùa thu hoạch cà chua bi hữu cơ"
                      disabled={!canEdit || isSaving}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Liên kết khi bấm vào (tùy chọn)</Label>
                    <Input
                      value={banner.link || ''}
                      onChange={(e) => handleBannerChange(index, 'link', e.target.value)}
                      placeholder="/products hoặc https://..."
                      disabled={!canEdit || isSaving}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Hình ảnh banner</Label>
                  <SingleImageUpload
                    value={banner.imageUrl}
                    onChange={(_id, url) => handleBannerChange(index, 'imageUrl', url || '')}
                    disabled={!canEdit || isSaving}
                    label="Tải ảnh banner lên"
                  />
                </div>
              </div>
            ))}

            {settings['home.banners'].length === 0 && (
              <p className="text-sm text-slate-500 italic py-2">
                Chưa có banner nào. Nhấn &quot;Thêm banner&quot; để tạo banner trang chủ.
              </p>
            )}
          </div>
        </div>

        {/* Section 5: Thông tin VietQR */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Cấu hình thanh toán VietQR (bank.vietqr)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="bank-id">Ngân hàng (Mã hoặc tên viết tắt) *</Label>
              <Input
                id="bank-id"
                placeholder="VD: VCB, MB, TCB, ACB, BIDV"
                value={settings['bank.vietqr'].bankId}
                onChange={(e) => handleVietQRChange('bankId', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="bank-no">Số tài khoản nhận tiền *</Label>
              <Input
                id="bank-no"
                placeholder="VD: 1029384756"
                value={settings['bank.vietqr'].accountNo}
                onChange={(e) => handleVietQRChange('accountNo', e.target.value)}
                disabled={!canEdit || isSaving}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="bank-name">Tên chủ tài khoản (in hoa) *</Label>
              <Input
                id="bank-name"
                placeholder="VD: NGUYEN VAN A"
                value={settings['bank.vietqr'].accountName}
                onChange={(e) => handleVietQRChange('accountName', e.target.value.toUpperCase())}
                disabled={!canEdit || isSaving}
              />
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end pt-2">
            <Button type="submit" size="lg" disabled={isSaving || isLoading}>
              {isSaving ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Đang lưu cài đặt...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Lưu tất cả cài đặt website
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}

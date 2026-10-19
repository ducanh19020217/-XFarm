'use client';

import * as React from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadMediaFile } from '@/lib/media-upload';
import { Button } from '@xfarm/ui';

export interface ImageUploadProps {
  value?: string | null;
  onChange?: (mediaId: string | null, url?: string) => void;
  disabled?: boolean;
  label?: string;
}

export function SingleImageUpload({
  value,
  onChange,
  disabled = false,
  label = 'Tải ảnh lên',
}: ImageUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string>(value || '');

  React.useEffect(() => {
    if (value) {
      setPreviewUrl(value);
    } else {
      setPreviewUrl('');
    }
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await uploadMediaFile(file);
      setPreviewUrl(res.url);
      onChange?.(res.id, res.url);
    } catch (err) {
      console.error('Lỗi khi tải ảnh lên:', err);
      alert('Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setPreviewUrl('');
    onChange?.(null);
  };

  return (
    <div className="space-y-2">
      {previewUrl ? (
        <div className="relative inline-block rounded-md border border-slate-200 overflow-hidden bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
          <img
            src={previewUrl}
            alt="Ảnh bìa"
            className="h-36 w-full max-w-sm object-cover"
            onError={(e) => {
              // fallback if URL is broken or media id
              e.currentTarget.style.display = 'none';
            }}
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/70 p-1 text-white hover:bg-red-600 transition-colors"
              title="Xóa ảnh"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Đang tải lên...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1.5" />
                {label}
              </>
            )}
          </Button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />
    </div>
  );
}

export interface MultiImageUploadProps {
  value?: string[];
  onChange?: (mediaIds: string[]) => void;
  disabled?: boolean;
}

export function MultiImageUpload({
  value = [],
  onChange,
  disabled = false,
}: MultiImageUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  // Track id to url mapping for preview
  const [items, setItems] = React.useState<{ id: string; url: string }[]>(
    value.map((id) => ({ id, url: id })),
  );

  React.useEffect(() => {
    setItems((prev) => {
      return value.map((id) => {
        const existing = prev.find((p) => p.id === id);
        return existing || { id, url: id };
      });
    });
  }, [value]);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      const newItems: { id: string; url: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const res = await uploadMediaFile(files[i]);
        newItems.push({ id: res.id, url: res.url });
      }
      const updated = [...items, ...newItems];
      setItems(updated);
      onChange?.(updated.map((item) => item.id));
    } catch (err) {
      console.error('Lỗi khi tải ảnh:', err);
      alert('Không thể tải một số ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);
    onChange?.(updated.map((item) => item.id));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {items.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="group relative h-20 w-20 rounded-md border border-slate-200 bg-slate-100 overflow-hidden dark:border-slate-800 dark:bg-slate-900"
          >
            <img
              src={item.url}
              alt={`Ảnh ${index + 1}`}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center -z-10 text-slate-400">
              <ImageIcon className="h-6 w-6" />
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute right-1 top-1 rounded-full bg-slate-900/80 p-0.5 text-white opacity-80 hover:bg-red-600 hover:opacity-100 transition-all"
                title="Xóa ảnh này"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {!disabled && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex h-20 w-20 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
            ) : (
              <>
                <Upload className="h-5 w-5 mb-1" />
                <span>Thêm ảnh</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
        disabled={disabled || isUploading}
      />
    </div>
  );
}

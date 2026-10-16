import { apiFetch } from '@/lib/api';

interface PresignResponse {
  uploadUrl: string;
  key: string;
}

export interface MediaUploader {
  requestPresign: (input: {
    filename: string;
    mime: string;
    size: number;
  }) => Promise<PresignResponse>;
  upload: (url: string, file: File) => Promise<void>;
  createMedia: (key: string, alt?: string) => Promise<{ id: string }>;
}

const defaultUploader: MediaUploader = {
  requestPresign: async (input) => {
    const result = await apiFetch<{ data: PresignResponse }>('/media/presign', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return result.data;
  },
  upload: async (url, file) => {
    const response = await fetch(url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
    if (!response.ok) throw new Error(`Tải ảnh thất bại (${response.status})`);
  },
  createMedia: async (key, alt) => {
    const result = await apiFetch<{ data: { id: string } }>('/media', {
      method: 'POST',
      body: JSON.stringify({ key, alt }),
    });
    return result.data;
  },
};

export async function uploadMediaFiles(files: File[], uploader: MediaUploader = defaultUploader) {
  const mediaIds: string[] = [];
  for (const file of files) {
    const presigned = await uploader.requestPresign({
      filename: file.name,
      mime: file.type,
      size: file.size,
    });
    await uploader.upload(presigned.uploadUrl, file);
    const media = await uploader.createMedia(presigned.key, file.name);
    mediaIds.push(media.id);
  }
  return mediaIds;
}

export function useUploadMedia(uploader: MediaUploader = defaultUploader) {
  return async (files: File[]) => uploadMediaFiles(files, uploader);
}

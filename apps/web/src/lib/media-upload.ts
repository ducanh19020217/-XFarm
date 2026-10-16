import { apiFetch } from './api';

export interface UploadMediaResult {
  id: string;
  url: string;
  key: string;
}

export async function uploadMediaFile(file: File): Promise<UploadMediaResult> {
  const presignRes = await apiFetch<{ data: { uploadUrl: string; key: string; url?: string } }>(
    '/media/presign',
    {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        mime: file.type || 'image/jpeg',
        size: file.size,
      }),
    },
  );

  const { uploadUrl, key, url: presignedPublicUrl } = presignRes.data;

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'image/jpeg',
    },
  });

  if (!uploadRes.ok) {
    throw new Error(`Tải tệp lên thất bại (${uploadRes.status})`);
  }

  const createRes = await apiFetch<{ data: { id: string; url?: string; key: string } }>('/media', {
    method: 'POST',
    body: JSON.stringify({
      key,
      alt: file.name,
    }),
  });

  return {
    id: createRes.data.id,
    url: createRes.data.url || presignedPublicUrl || '',
    key,
  };
}

export async function uploadMultipleMediaFiles(files: File[]): Promise<UploadMediaResult[]> {
  const results: UploadMediaResult[] = [];
  for (const file of files) {
    const uploaded = await uploadMediaFile(file);
    results.push(uploaded);
  }
  return results;
}

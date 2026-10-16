import { describe, expect, it, vi } from 'vitest';
import { uploadMediaFiles, type MediaUploader } from './upload-media';

const file = new File(['image'], 'pond.jpg', { type: 'image/jpeg' });

describe('uploadMediaFiles', () => {
  it('presigns, uploads and creates media for every file', async () => {
    const uploader: MediaUploader = {
      requestPresign: vi
        .fn()
        .mockResolvedValue({ uploadUrl: 'http://minio/upload', key: 'uploads/a.jpg' }),
      upload: vi.fn().mockResolvedValue(undefined),
      createMedia: vi.fn().mockResolvedValue({ id: 'media-1' }),
    };
    await expect(uploadMediaFiles([file], uploader)).resolves.toEqual(['media-1']);
    expect(uploader.requestPresign).toHaveBeenCalledWith({
      filename: 'pond.jpg',
      mime: 'image/jpeg',
      size: 5,
    });
  });

  it('propagates storage errors so the form can save without photos', async () => {
    const uploader: MediaUploader = {
      requestPresign: vi.fn().mockRejectedValue(new Error('MinIO không khả dụng')),
      upload: vi.fn(),
      createMedia: vi.fn(),
    };
    await expect(uploadMediaFiles([file], uploader)).rejects.toThrow('MinIO không khả dụng');
  });
});

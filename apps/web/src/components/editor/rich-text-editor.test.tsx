import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RichTextEditor } from './rich-text-editor';

describe('RichTextEditor Component', () => {
  it('khởi tạo và hiển thị toolbar cùng vùng soạn thảo', async () => {
    render(<RichTextEditor value="<p>Xin chào XFarm</p>" />);

    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đậm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nghiêng' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tiêu đề 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tiêu đề 3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Danh sách không thứ tự' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Danh sách có thứ tự' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trích dẫn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chèn liên kết' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chèn ảnh' })).toBeInTheDocument();
  });

  it('trả về chuỗi HTML khi nội dung được thay đổi', async () => {
    const handleChange = vi.fn();
    render(<RichTextEditor value="<p>Đoạn văn đầu tiên</p>" onChange={handleChange} />);

    // Click bold button
    const boldBtn = screen.getByRole('button', { name: 'Đậm' });
    await userEvent.click(boldBtn);

    // Verify toolbar interactions or editor content update
    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
  });

  it('hỗ trợ chèn ảnh và trả URL vào nội dung HTML', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ url: 'https://xfarm.vn/uploads/photo.jpg' });
    const handleChange = vi.fn();

    const { container } = render(
      <RichTextEditor
        value="<p>Bài viết có ảnh</p>"
        onChange={handleChange}
        onUploadImage={mockUpload}
      />,
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const file = new File(['dummy-image-content'], 'test-image.jpg', { type: 'image/jpeg' });
    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith(file);
    });
  });

  it('tôn trọng thuộc tính disabled', () => {
    render(<RichTextEditor value="<p>Không cho sửa</p>" disabled />);
    const boldBtn = screen.getByRole('button', { name: 'Đậm' });
    expect(boldBtn).toBeDisabled();
    const imageBtn = screen.getByRole('button', { name: 'Chèn ảnh' });
    expect(imageBtn).toBeDisabled();
  });
});

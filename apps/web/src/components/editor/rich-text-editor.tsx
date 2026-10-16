'use client';

import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Unlink,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { uploadMediaFile } from '@/lib/media-upload';

export interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
  onUploadImage?: (file: File) => Promise<{ url: string }>;
}

export function RichTextEditor({
  value = '',
  onChange,
  disabled = false,
  className = '',
  minHeight = '160px',
  onUploadImage,
}: RichTextEditorProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
        link: false,
      }),
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: 'text-emerald-600 underline hover:text-emerald-700',
        },
      }),
      ImageExtension.configure({
        inline: false,
        HTMLAttributes: {
          class: 'max-w-full rounded-md my-2 block border border-slate-200',
        },
      }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      onChange?.(html === '<p></p>' ? '' : html);
    },
  });

  // Keep editor content synchronized with prop value
  React.useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  // Keep editable state synchronized
  React.useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  const handleLinkClick = () => {
    if (!editor) return;
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const previousUrl = editor.getAttributes('link').href || '';
    const url = window.prompt('Nhập địa chỉ liên kết (URL):', previousUrl);
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    try {
      setIsUploading(true);
      let imageUrl = '';
      if (onUploadImage) {
        const res = await onUploadImage(file);
        imageUrl = res.url;
      } else {
        const uploaded = await uploadMediaFile(file);
        imageUrl = uploaded.url;
      }

      if (imageUrl) {
        editor.chain().focus().setImage({ src: imageUrl, alt: file.name }).run();
      }
    } catch (error) {
      console.error('Lỗi khi tải ảnh vào editor:', error);
      alert('Không thể tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!editor) {
    return (
      <div
        className={`rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-400 ${className}`}
        style={{ minHeight }}
      >
        Đang khởi tạo trình soạn thảo...
      </div>
    );
  }

  return (
    <div
      className={`rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 ${
        disabled ? 'opacity-60 cursor-not-allowed' : ''
      } ${className}`}
      data-testid="rich-text-editor"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-1.5 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
          aria-label="Đậm"
          title="Đậm (Ctrl+B)"
          className={`rounded p-1.5 text-sm transition-colors ${
            editor.isActive('bold')
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Bold className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
          aria-label="Nghiêng"
          title="Nghiêng (Ctrl+I)"
          className={`rounded p-1.5 text-sm transition-colors ${
            editor.isActive('italic')
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Italic className="h-4 w-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={disabled}
          aria-label="Tiêu đề 2"
          title="Tiêu đề 2 (H2)"
          className={`rounded p-1.5 text-sm font-semibold transition-colors ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Heading2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={disabled}
          aria-label="Tiêu đề 3"
          title="Tiêu đề 3 (H3)"
          className={`rounded p-1.5 text-sm font-semibold transition-colors ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Heading3 className="h-4 w-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled}
          aria-label="Danh sách không thứ tự"
          title="Danh sách gạch đầu dòng"
          className={`rounded p-1.5 text-sm transition-colors ${
            editor.isActive('bulletList')
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <List className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled}
          aria-label="Danh sách có thứ tự"
          title="Danh sách số"
          className={`rounded p-1.5 text-sm transition-colors ${
            editor.isActive('orderedList')
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={disabled}
          aria-label="Trích dẫn"
          title="Đoạn trích dẫn"
          className={`rounded p-1.5 text-sm transition-colors ${
            editor.isActive('blockquote')
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Quote className="h-4 w-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

        <button
          type="button"
          onClick={handleLinkClick}
          disabled={disabled}
          aria-label={editor.isActive('link') ? 'Gỡ liên kết' : 'Chèn liên kết'}
          title={editor.isActive('link') ? 'Gỡ liên kết' : 'Chèn liên kết'}
          className={`rounded p-1.5 text-sm transition-colors ${
            editor.isActive('link')
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          {editor.isActive('link') ? (
            <Unlink className="h-4 w-4" />
          ) : (
            <LinkIcon className="h-4 w-4" />
          )}
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          aria-label="Chèn ảnh"
          title="Chèn ảnh từ thiết bị (tải qua /media/presign)"
          className="rounded p-1.5 text-sm text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFileChange}
          disabled={disabled || isUploading}
        />
      </div>

      {/* Editor Content Area */}
      <EditorContent
        editor={editor}
        className="p-3 focus:outline-none text-slate-900 dark:text-slate-100 [&_.tiptap]:outline-none [&_.tiptap_h2]:text-xl [&_.tiptap_h2]:font-bold [&_.tiptap_h2]:mt-3 [&_.tiptap_h2]:mb-1 [&_.tiptap_h3]:text-lg [&_.tiptap_h3]:font-semibold [&_.tiptap_h3]:mt-2 [&_.tiptap_h3]:mb-1 [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-5 [&_.tiptap_ul]:my-2 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-5 [&_.tiptap_ol]:my-2 [&_.tiptap_blockquote]:border-l-4 [&_.tiptap_blockquote]:border-emerald-500 [&_.tiptap_blockquote]:pl-4 [&_.tiptap_blockquote]:italic [&_.tiptap_blockquote]:my-2 [&_.tiptap_p]:my-1"
        style={{ minHeight }}
      />
    </div>
  );
}
export default RichTextEditor;

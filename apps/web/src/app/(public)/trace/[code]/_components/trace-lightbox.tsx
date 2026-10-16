'use client';

import * as React from 'react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

interface TraceLightboxProps {
  photos: Array<{ url: string; caption?: string }>;
}

export function TraceLightbox({ photos }: TraceLightboxProps) {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  const isOpen = selectedIndex !== null;
  const currentPhoto = isOpen ? photos[selectedIndex] : null;

  const handlePrev = React.useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev! > 0 ? prev! - 1 : photos.length - 1));
  }, [selectedIndex, photos.length]);

  const handleNext = React.useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev! < photos.length - 1 ? prev! + 1 : 0));
  }, [selectedIndex, photos.length]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedIndex(null);
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext]);

  if (!photos || photos.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center gap-2 mb-3">
        <ImageIcon className="w-5 h-5 text-emerald-600" />
        <h2 className="text-base font-semibold text-slate-800">Hình ảnh thực tế</h2>
        <span className="text-xs text-slate-400 font-medium ml-auto">
          {photos.length} hình ảnh
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {photos.map((photo, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setSelectedIndex(idx)}
            className="group relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-transform active:scale-95"
            aria-label={`Xem ảnh ${idx + 1}`}
          >
            {/* Using standard img for external/user-uploaded media in Next.js without fixed domain config */}
            <img
              src={photo.url}
              alt={photo.caption || `Hình ảnh lô sản phẩm ${idx + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
            {photo.caption && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 text-left">
                <p className="text-[11px] text-white truncate font-medium">{photo.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {isOpen && currentPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedIndex(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 z-10 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 focus:outline-none"
            aria-label="Đóng xem ảnh"
          >
            <X className="w-6 h-6" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 focus:outline-none"
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 focus:outline-none"
                aria-label="Ảnh tiếp theo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div
            className="relative max-w-2xl max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentPhoto.url}
              alt={currentPhoto.caption || `Ảnh ${selectedIndex + 1}`}
              className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
            <div className="mt-2 text-center text-white">
              {currentPhoto.caption && (
                <p className="text-sm font-medium">{currentPhoto.caption}</p>
              )}
              <p className="text-xs text-white/70">
                {selectedIndex + 1} / {photos.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

import * as React from 'react';
import { History } from 'lucide-react';
import { FormattedTimelineItem } from '../trace-utils';
import { getAssetPath } from '@/lib/site-url';

interface TraceTimelineViewProps {
  timeline: FormattedTimelineItem[];
}

export function TraceTimelineView({ timeline }: TraceTimelineViewProps) {
  if (!timeline || timeline.length === 0) {
    return (
      <section className="bg-surface rounded-2xl p-4 shadow-xs border border-line">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-line">
          <History className="w-5 h-5 text-accent" />
          <h2 className="text-base font-semibold text-fg">Nhật ký quy trình canh tác</h2>
        </div>
        <p className="text-sm text-muted py-4 text-center">
          Chưa có nhật ký canh tác chi tiết cho lô sản phẩm này.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-surface rounded-2xl p-4 shadow-xs border border-line">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-line">
        <History className="w-5 h-5 text-accent" />
        <h2 className="text-base font-semibold text-fg">Nhật ký quy trình canh tác</h2>
        <span className="text-xs text-muted font-medium ml-auto">{timeline.length} giai đoạn</span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-accent/30">
        {timeline.map((item, index) => (
          <div key={item.id || index} className="relative group">
            {/* Timeline icon node */}
            <div className="absolute -left-6 top-0 flex items-center justify-center w-7 h-7 rounded-full bg-accent-bg border-2 border-accent text-sm shadow-xs select-none">
              {item.icon}
            </div>

            {/* Step content */}
            <div className="bg-surface-2 rounded-xl p-3 border border-line">
              <div className="flex flex-wrap items-baseline justify-between gap-1 mb-1">
                <h3 className="font-semibold text-fg text-sm">{item.typeLabel}</h3>
                <span className="text-xs font-medium text-accent bg-accent-bg px-2 py-0.5 rounded-full">
                  {item.formattedDate}
                </span>
              </div>

              {item.summary ? (
                <p className="text-xs text-fg-2 leading-relaxed">{item.summary}</p>
              ) : (
                <p className="text-xs text-muted italic">Thực hiện theo quy chuẩn kỹ thuật</p>
              )}

              {/* Photos attached to this specific step */}
              {item.mediaUrls && item.mediaUrls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.mediaUrls.map((url, imgIdx) => (
                    <img
                      key={imgIdx}
                      src={getAssetPath(url)}
                      alt={`${item.typeLabel} - ảnh ${imgIdx + 1}`}
                      className="w-12 h-12 object-cover rounded-md border border-line"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

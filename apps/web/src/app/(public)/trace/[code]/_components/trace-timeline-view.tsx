import * as React from 'react';
import { History } from 'lucide-react';
import { FormattedTimelineItem } from '../trace-utils';

interface TraceTimelineViewProps {
  timeline: FormattedTimelineItem[];
}

export function TraceTimelineView({ timeline }: TraceTimelineViewProps) {
  if (!timeline || timeline.length === 0) {
    return (
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
          <History className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-slate-800">Nhật ký quy trình canh tác</h2>
        </div>
        <p className="text-sm text-slate-500 py-4 text-center">
          Chưa có nhật ký canh tác chi tiết cho lô sản phẩm này.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
        <History className="w-5 h-5 text-emerald-600" />
        <h2 className="text-base font-semibold text-slate-800">Nhật ký quy trình canh tác</h2>
        <span className="text-xs text-slate-400 font-medium ml-auto">
          {timeline.length} giai đoạn
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-200">
        {timeline.map((item, index) => (
          <div key={item.id || index} className="relative group">
            {/* Timeline icon node */}
            <div className="absolute -left-6 top-0 flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 border-2 border-emerald-500 text-sm shadow-xs select-none">
              {item.icon}
            </div>

            {/* Step content */}
            <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-100">
              <div className="flex flex-wrap items-baseline justify-between gap-1 mb-1">
                <h3 className="font-semibold text-slate-900 text-sm">{item.typeLabel}</h3>
                <span className="text-xs font-medium text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                  {item.formattedDate}
                </span>
              </div>

              {item.summary ? (
                <p className="text-xs text-slate-600 leading-relaxed">{item.summary}</p>
              ) : (
                <p className="text-xs text-slate-400 italic">Thực hiện theo quy chuẩn kỹ thuật</p>
              )}

              {/* Photos attached to this specific step */}
              {item.mediaUrls && item.mediaUrls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.mediaUrls.map((url, imgIdx) => (
                    <img
                      key={imgIdx}
                      src={url}
                      alt={`${item.typeLabel} - ảnh ${imgIdx + 1}`}
                      className="w-12 h-12 object-cover rounded-md border border-slate-200"
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

import * as React from 'react';
import {
  Calendar,
  MapPin,
  Sprout,
  Award,
  Package,
  QrCode,
  Tag,
} from 'lucide-react';
import { formatDate, PublicArea, PublicCycle, PublicLot } from '../trace-utils';

interface TraceLotCardProps {
  lot: PublicLot;
  area?: PublicArea | null;
  cycle?: PublicCycle | null;
}

export function TraceLotCard({ lot, area, cycle }: TraceLotCardProps) {
  const varietyInfo = [cycle?.species, cycle?.variety].filter(Boolean).join(' - ');

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
        <Package className="w-5 h-5 text-emerald-600" />
        <h2 className="text-base font-semibold text-slate-800">Thông tin lô thu hoạch</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {/* Mã lô & Mã truy xuất */}
        <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50/80">
          <QrCode className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <span className="block text-xs text-slate-500 font-medium">Mã lô / Truy xuất</span>
            <span className="font-semibold text-slate-900 break-all">{lot.code}</span>
            {lot.traceCode && lot.traceCode !== lot.code && (
              <span className="block text-xs font-mono text-emerald-700">
                Mã tra cứu: {lot.traceCode}
              </span>
            )}
          </div>
        </div>

        {/* Ngày thu hoạch */}
        <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50/80">
          <Calendar className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <span className="block text-xs text-slate-500 font-medium">Ngày thu hoạch</span>
            <span className="font-semibold text-slate-900">
              {formatDate(lot.harvestedAt) || 'Không xác định'}
            </span>
          </div>
        </div>

        {/* Khu / Lô canh tác */}
        <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50/80">
          <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <span className="block text-xs text-slate-500 font-medium">Khu / Vùng canh tác</span>
            <span className="font-semibold text-slate-900">
              {area?.name ? `${area.name}${area.type ? ` (${area.type})` : ''}` : 'Khu canh tác XFarm'}
            </span>
          </div>
        </div>

        {/* Giống cây trồng / vật nuôi */}
        <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50/80">
          <Sprout className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <span className="block text-xs text-slate-500 font-medium">Giống & Chu kỳ</span>
            <span className="font-semibold text-slate-900">
              {varietyInfo || cycle?.name || 'Nông sản an toàn'}
            </span>
          </div>
        </div>

        {/* Phân loại chất lượng */}
        {lot.qualityGrade && (
          <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50/80">
            <Award className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <span className="block text-xs text-slate-500 font-medium">Phân loại chất lượng</span>
              <span className="font-semibold text-slate-900">{lot.qualityGrade}</span>
            </div>
          </div>
        )}

        {/* Khối lượng / Sản lượng */}
        <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50/80">
          <Tag className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <span className="block text-xs text-slate-500 font-medium">Khối lượng lô</span>
            <span className="font-semibold text-slate-900">
              {Number(lot.quantity).toLocaleString('vi-VN')} {lot.unit}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

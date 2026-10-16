'use client';

import * as React from 'react';
import L from 'leaflet';
import { AreaItem, AREA_TYPE_COLORS, AREA_TYPE_LABELS } from '@/lib/area-constants';
import { geoJSONToLatLngs } from '@/lib/geojson';
import { AreaType } from '@xfarm/shared';

export interface AreaMapOverviewProps {
  areas: AreaItem[];
  className?: string;
  onAreaClick?: (area: AreaItem) => void;
}

export default function AreaMapOverview({
  areas,
  className = 'h-[600px] w-full',
  onAreaClick,
}: AreaMapOverviewProps) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<L.Map | null>(null);
  const layersGroupRef = React.useRef<L.FeatureGroup | null>(null);

  // Khởi tạo bản đồ một lần
  React.useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [21.0285, 105.8542], // Tọa độ mặc định tại Việt Nam
      zoom: 14,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const featureGroup = L.featureGroup().addTo(map);
    layersGroupRef.current = featureGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layersGroupRef.current = null;
    };
  }, []);

  // Cập nhật polygon các khu vực khi danh sách areas thay đổi
  React.useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const allBounds: L.LatLngBounds[] = [];

    const areasWithPolygon = areas.filter((a) => a.geojson);

    areasWithPolygon.forEach((area) => {
      const latlngs = geoJSONToLatLngs(area.geojson);
      if (latlngs.length < 3) return;

      const style = AREA_TYPE_COLORS[area.type] || {
        fill: '#10b981',
        stroke: '#047857',
      };

      const polygon = L.polygon(latlngs, {
        color: style.stroke,
        fillColor: style.fill,
        fillOpacity: 0.35,
        weight: 2,
      });

      const cyclesCount = area.activeCyclesCount ?? area._count?.cycles ?? 0;
      const areaM2Formatted =
        area.areaM2 != null ? `${Number(area.areaM2).toLocaleString('vi-VN')} m²` : 'Chưa xác định';

      const popupContent = document.createElement('div');
      popupContent.className = 'text-xs space-y-1 p-1';
      popupContent.innerHTML = `
        <div class="font-bold text-sm text-slate-900">${area.name}</div>
        <div class="text-slate-500 font-mono">${area.code} • ${AREA_TYPE_LABELS[area.type] || area.type}</div>
        <div class="text-slate-700 mt-1">Diện tích: <span class="font-medium">${areaM2Formatted}</span></div>
        <div class="text-slate-700">Mùa vụ đang chạy: <span class="font-semibold text-emerald-600">${cyclesCount}</span></div>
        ${area.description ? `<div class="text-slate-500 italic mt-0.5">${area.description}</div>` : ''}
        <div class="pt-2 border-t border-slate-100 mt-1">
          <a href="/admin/areas/${area.id}" class="text-emerald-600 font-semibold hover:underline inline-flex items-center gap-1">
            Xem chi tiết khu &rarr;
          </a>
        </div>
      `;

      polygon.bindPopup(popupContent);

      polygon.on('click', () => {
        if (onAreaClick) {
          onAreaClick(area);
        }
      });

      polygon.addTo(group);
      allBounds.push(polygon.getBounds());
    });

    if (allBounds.length > 0) {
      let combinedBounds = allBounds[0];
      for (let i = 1; i < allBounds.length; i++) {
        combinedBounds = combinedBounds.extend(allBounds[i]);
      }
      map.fitBounds(combinedBounds, { padding: [30, 30] });
    }
  }, [areas, onAreaClick]);

  const areasWithPolygonCount = areas.filter((a) => a.geojson).length;

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800">
      {/* Map Header / Stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Bản đồ nông trại OpenStreetMap
          </span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            {areasWithPolygonCount} / {areas.length} khu có polygon
          </span>
        </div>
        <span className="text-slate-400">Nhấp vào từng đa giác để xem thông tin chi tiết</span>
      </div>

      {/* Map Canvas */}
      <div ref={mapContainerRef} className={className} />

      {/* Legend */}
      <div className="border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
          Chú giải loại khu vực:
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          {Object.values(AreaType).map((type) => {
            const style = AREA_TYPE_COLORS[type];
            return (
              <div key={type} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded border"
                  style={{
                    backgroundColor: style.fill,
                    borderColor: style.stroke,
                  }}
                />
                <span className="text-slate-600 dark:text-slate-400">{AREA_TYPE_LABELS[type]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

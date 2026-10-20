'use client';

import * as React from 'react';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { AreaItem, AREA_TYPE_COLORS, AREA_TYPE_LABELS } from '@/lib/area-constants';
import { geoJSONToLatLngs, latLngsToGeoJSON, GeoJsonPolygon } from '@/lib/geojson';
import { Button } from '@xfarm/ui';
import { Save, Trash2, Edit3, PenTool, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export interface AreaMapEditorProps {
  area: AreaItem;
  childrenAreas?: AreaItem[];
  value?: unknown;
  onChange?: (geojson: GeoJsonPolygon | null) => void;
  onSave?: (geojson: GeoJsonPolygon | null) => Promise<void>;
  isSaving?: boolean;
  readOnly?: boolean;
  className?: string;
}

export default function AreaMapEditor({
  area,
  childrenAreas = [],
  value,
  onChange,
  onSave,
  isSaving = false,
  readOnly = false,
  className = 'h-[500px] w-full',
}: AreaMapEditorProps) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<L.Map | null>(null);
  const currentPolygonLayerRef = React.useRef<L.Polygon | null>(null);
  const childrenGroupRef = React.useRef<L.FeatureGroup | null>(null);

  const [currentGeoJson, setCurrentGeoJson] = React.useState<GeoJsonPolygon | null>(
    (value as GeoJsonPolygon) || (area.geojson as GeoJsonPolygon) || null,
  );
  const [isEditing, setIsEditing] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Đồng bộ giá trị bên ngoài vào state
  React.useEffect(() => {
    if (value !== undefined) {
      setCurrentGeoJson((value as GeoJsonPolygon) || null);
    }
  }, [value]);

  // Khởi tạo Leaflet Map
  React.useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = [21.0285, 105.8542];
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 15,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const childrenGroup = L.featureGroup().addTo(map);
    childrenGroupRef.current = childrenGroup;

    // Cấu hình Geoman toolbar nếu không ở chế độ readOnly
    if (!readOnly) {
      map.pm.setLang('en');
      map.pm.addControls({
        position: 'topright',
        drawMarker: false,
        drawCircleMarker: false,
        drawPolyline: false,
        drawRectangle: false,
        drawCircle: false,
        drawText: false,
        cutPolygon: false,
        rotateMode: false,
        drawPolygon: true,
        editMode: true,
        dragMode: true,
        removalMode: true,
      });

      // Lắng nghe sự kiện vẽ hoàn thành từ Geoman
      map.on('pm:create', (e: { layer: L.Layer }) => {
        const layer = e.layer;
        if (layer instanceof L.Polygon) {
          // Xóa polygon cũ nếu có
          if (currentPolygonLayerRef.current) {
            map.removeLayer(currentPolygonLayerRef.current);
          }
          currentPolygonLayerRef.current = layer;

          const latlngs = (layer.getLatLngs()[0] as L.LatLng[]).map((p) => ({
            lat: p.lat,
            lng: p.lng,
          }));
          const geo = latLngsToGeoJSON(latlngs);
          setCurrentGeoJson(geo);
          if (onChange) onChange(geo);
          setSaveSuccess(false);
        }
      });

      // Lắng nghe sự kiện xóa từ Geoman
      map.on('pm:remove', (e: { layer: L.Layer }) => {
        if (e.layer === currentPolygonLayerRef.current) {
          currentPolygonLayerRef.current = null;
          setCurrentGeoJson(null);
          if (onChange) onChange(null);
          setSaveSuccess(false);
        }
      });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      currentPolygonLayerRef.current = null;
      childrenGroupRef.current = null;
    };
  }, [readOnly, onChange]);

  // Cập nhật polygon chính của khu vực khi currentGeoJson thay đổi
  React.useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentPolygonLayerRef.current) {
      map.removeLayer(currentPolygonLayerRef.current);
      currentPolygonLayerRef.current = null;
    }

    if (currentGeoJson) {
      const latlngs = geoJSONToLatLngs(currentGeoJson);
      if (latlngs.length >= 3) {
        const poly = L.polygon(latlngs, {
          color: 'var(--t-accent)',
          fillColor: 'var(--t-accent)',
          fillOpacity: 0.35,
          weight: 3,
        }).addTo(map);

        poly.bindPopup(`
          <div class="text-xs p-1 text-fg">
            <strong class="text-fg">${area.name}</strong> <span class="text-muted">(${area.code})</span><br/>
            <span class="text-fg-2">Loại: ${AREA_TYPE_LABELS[area.type] || area.type}</span><br/>
            <span class="text-accent font-medium">Ranh giới khu vực hiện tại</span>
          </div>
        `);

        // Lắng nghe sự kiện sửa đỉnh trên layer
        poly.on('pm:edit', () => {
          const updatedLatLngs = (poly.getLatLngs()[0] as L.LatLng[]).map((p) => ({
            lat: p.lat,
            lng: p.lng,
          }));
          const updatedGeo = latLngsToGeoJSON(updatedLatLngs);
          setCurrentGeoJson(updatedGeo);
          if (onChange) onChange(updatedGeo);
          setSaveSuccess(false);
        });

        currentPolygonLayerRef.current = poly;
        map.fitBounds(poly.getBounds(), { padding: [40, 40] });
      }
    }
  }, [currentGeoJson, area.type, area.name, area.code, onChange]);

  // Vẽ các khu con (childrenAreas)
  React.useEffect(() => {
    const group = childrenGroupRef.current;
    if (!group) return;

    group.clearLayers();

    childrenAreas.forEach((child) => {
      if (!child.geojson) return;
      const latlngs = geoJSONToLatLngs(child.geojson);
      if (latlngs.length < 3) return;

      const childStyle = AREA_TYPE_COLORS[child.type] || {
        fill: '#3b82f6',
        stroke: '#1d4ed8',
      };

      const childPoly = L.polygon(latlngs, {
        color: childStyle.stroke,
        fillColor: childStyle.fill,
        fillOpacity: 0.25,
        weight: 1.5,
        dashArray: '4, 4',
      });

      childPoly.bindPopup(`
        <div class="text-xs p-1 text-fg">
          <div class="font-semibold text-fg">${child.name}</div>
          <div class="text-muted font-mono text-[11px]">${child.code} • ${AREA_TYPE_LABELS[child.type] || child.type}</div>
          <div class="text-fg-2 mt-1">Khu con trực thuộc</div>
          <a href="/admin/areas/${child.id}" class="text-accent text-[11px] font-medium hover:underline inline-block mt-1">
            Xem chi tiết &rarr;
          </a>
        </div>
      `);

      childPoly.addTo(group);
    });
  }, [childrenAreas]);

  // Xử lý bật/tắt chế độ sửa đỉnh Geoman
  const toggleEditMode = () => {
    const map = mapInstanceRef.current;
    if (!map || !map.pm) return;

    if (isEditing) {
      map.pm.disableGlobalEditMode();
      setIsEditing(false);
    } else {
      map.pm.enableGlobalEditMode();
      setIsEditing(true);
    }
  };

  // Xử lý kích hoạt vẽ polygon mới
  const handleStartDraw = () => {
    const map = mapInstanceRef.current;
    if (!map || !map.pm) return;
    map.pm.enableDraw('Polygon', {
      snappable: true,
      snapDistance: 20,
    });
  };

  // Xử lý xóa polygon hiện tại
  const handleDeletePolygon = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentPolygonLayerRef.current) {
      map.removeLayer(currentPolygonLayerRef.current);
      currentPolygonLayerRef.current = null;
    }
    setCurrentGeoJson(null);
    if (onChange) onChange(null);
    setSaveSuccess(false);
  };

  // Xử lý lưu polygon
  const handleSave = async () => {
    if (!onSave) return;
    setErrorMessage(null);
    try {
      await onSave(currentGeoJson);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Lỗi khi lưu tọa độ polygon');
    }
  };

  return (
    <div className="space-y-3">
      {/* Action Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface p-3 shadow-xs text-fg">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleStartDraw}
              className="text-xs"
            >
              <PenTool className="mr-1.5 h-3.5 w-3.5 text-accent" />
              {currentGeoJson ? 'Vẽ lại đa giác' : 'Vẽ đa giác mới'}
            </Button>

            {currentGeoJson && (
              <>
                <Button
                  type="button"
                  variant={isEditing ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleEditMode}
                  className="text-xs"
                >
                  <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                  {isEditing ? 'Xong sửa đỉnh' : 'Sửa đỉnh đa giác'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeletePolygon}
                  className="text-xs text-crit hover:bg-crit-bg hover:text-crit"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Xóa đa giác
                </Button>
              </>
            )}
          </div>

          {onSave && (
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="flex items-center gap-1 text-xs font-medium text-ok">
                  <CheckCircle className="h-4 w-4" /> Đã lưu thành công
                </span>
              )}
              {errorMessage && (
                <span className="flex items-center gap-1 text-xs text-crit">
                  <AlertCircle className="h-4 w-4" /> {errorMessage}
                </span>
              )}
              <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    Lưu bản đồ
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Map Canvas */}
      <div className="relative overflow-hidden rounded-lg border border-line bg-surface shadow-xs">
        <div ref={mapContainerRef} className={className} />

        {/* Legend / Info bar at bottom */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface-2 px-3 py-2 text-xs text-muted">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded border border-line"
                style={{
                  backgroundColor: AREA_TYPE_COLORS[area.type]?.fill || 'var(--t-accent)',
                  borderColor: AREA_TYPE_COLORS[area.type]?.stroke || 'var(--t-accent)',
                }}
              />
              <span className="font-medium text-fg">
                {area.name} ({AREA_TYPE_LABELS[area.type]})
              </span>
            </div>

            {childrenAreas.length > 0 && (
              <div className="flex items-center gap-1.5 text-muted">
                <span className="inline-block h-2.5 w-2.5 rounded border border-dashed border-info bg-info/20" />
                <span>{childrenAreas.length} khu con trực thuộc</span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-muted">
            {currentGeoJson
              ? `Tọa độ: ${currentGeoJson.coordinates[0]?.length || 0} điểm đỉnh`
              : 'Chưa có tọa độ ranh giới polygon'}
          </div>
        </div>
      </div>
    </div>
  );
}

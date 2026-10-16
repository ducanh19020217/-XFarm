export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

/**
 * Chuyển danh sách tọa độ Leaflet LatLng [{ lat, lng }, ...] thành GeoJSON Polygon.
 * Lưu ý: Trong GeoJSON, thứ tự tọa độ là [kinh độ (lng), vĩ độ (lat)], ngược lại với Leaflet [lat, lng].
 * Vòng đa giác (polygon ring) phải khép kín (điểm đầu trùng điểm cuối).
 */
export function latLngsToGeoJSON(latlngs: LatLngPoint[]): GeoJsonPolygon | null {
  if (!latlngs || latlngs.length < 3) {
    return null;
  }

  const ring: number[][] = latlngs.map((p) => [Number(p.lng.toFixed(6)), Number(p.lat.toFixed(6))]);

  // Đảm bảo khép kín vòng đa giác
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }

  // Đa giác hợp lệ cần tối thiểu 4 điểm (3 đỉnh + 1 điểm khép kín)
  if (ring.length < 4) {
    return null;
  }

  return {
    type: 'Polygon',
    coordinates: [ring],
  };
}

/**
 * Trích xuất danh sách tọa độ [lat, lng] cho Leaflet từ GeoJSON Polygon hoặc MultiPolygon hoặc Feature.
 */
export function geoJSONToLatLngs(geojson: unknown): [number, number][] {
  if (!geojson || typeof geojson !== 'object') {
    return [];
  }

  const obj = geojson as Record<string, unknown>;

  // Nếu là Feature
  if (obj.type === 'Feature' && obj.geometry) {
    return geoJSONToLatLngs(obj.geometry);
  }

  // Nếu là Polygon
  if (obj.type === 'Polygon' && Array.isArray(obj.coordinates) && obj.coordinates.length > 0) {
    const exteriorRing = obj.coordinates[0];
    if (Array.isArray(exteriorRing)) {
      return exteriorRing
        .filter((coord): coord is number[] => Array.isArray(coord) && coord.length >= 2)
        .map(([lng, lat]) => [lat, lng]);
    }
  }

  // Nếu là MultiPolygon, lấy polygon đầu tiên
  if (obj.type === 'MultiPolygon' && Array.isArray(obj.coordinates) && obj.coordinates.length > 0) {
    const firstPoly = obj.coordinates[0];
    if (Array.isArray(firstPoly) && firstPoly.length > 0) {
      const exteriorRing = firstPoly[0];
      if (Array.isArray(exteriorRing)) {
        return exteriorRing
          .filter((coord): coord is number[] => Array.isArray(coord) && coord.length >= 2)
          .map(([lng, lat]) => [lat, lng]);
      }
    }
  }

  return [];
}

/**
 * Chuẩn hóa đối tượng GeoJSON đầu vào thành dạng Polygon hợp lệ.
 */
export function normalizeGeoJSONPolygon(geojson: unknown): GeoJsonPolygon | null {
  if (!geojson || typeof geojson !== 'object') {
    return null;
  }

  const obj = geojson as Record<string, unknown>;

  if (obj.type === 'Feature' && obj.geometry) {
    return normalizeGeoJSONPolygon(obj.geometry);
  }

  if (obj.type === 'Polygon' && Array.isArray(obj.coordinates) && obj.coordinates.length > 0) {
    const rawRings = obj.coordinates as number[][][];
    const normalizedRings = rawRings.map((ring) => {
      if (!Array.isArray(ring) || ring.length < 3) return ring;
      const copy = [...ring];
      const first = copy[0];
      const last = copy[copy.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        copy.push([first[0], first[1]]);
      }
      return copy;
    });

    if (normalizedRings[0]?.length >= 4) {
      return {
        type: 'Polygon',
        coordinates: normalizedRings,
      };
    }
  }

  return null;
}

/**
 * Tính toán bounding box [[minLat, minLng], [maxLat, maxLng]] và tâm [centerLat, centerLng] từ GeoJSON.
 */
export function computeGeoJsonBounds(
  geojson: unknown,
): { bounds: [[number, number], [number, number]]; center: [number, number] } | null {
  const latlngs = geoJSONToLatLngs(geojson);
  if (latlngs.length === 0) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const [lat, lng] of latlngs) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  return {
    bounds: [
      [minLat, minLng],
      [maxLat, maxLng],
    ],
    center: [(minLat + maxLat) / 2, (minLng + maxLng) / 2],
  };
}

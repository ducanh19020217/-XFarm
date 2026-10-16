import { describe, it, expect } from 'vitest';
import {
  latLngsToGeoJSON,
  geoJSONToLatLngs,
  normalizeGeoJSONPolygon,
  computeGeoJsonBounds,
} from './geojson';

describe('GeoJSON Utility Functions', () => {
  describe('latLngsToGeoJSON', () => {
    it('trả về null nếu mảng tọa độ rỗng hoặc ít hơn 3 điểm', () => {
      expect(latLngsToGeoJSON([])).toBeNull();
      expect(
        latLngsToGeoJSON([
          { lat: 21.0, lng: 105.8 },
          { lat: 21.1, lng: 105.8 },
        ]),
      ).toBeNull();
    });

    it('chuyển đổi danh sách [lat, lng] thành GeoJSON Polygon [lng, lat] và tự động khép kín', () => {
      const points = [
        { lat: 21.0123456, lng: 105.8123456 },
        { lat: 21.0223456, lng: 105.8123456 },
        { lat: 21.0223456, lng: 105.8223456 },
      ];

      const geojson = latLngsToGeoJSON(points);

      expect(geojson).not.toBeNull();
      expect(geojson?.type).toBe('Polygon');
      expect(geojson?.coordinates).toHaveLength(1);

      const ring = geojson!.coordinates[0];
      // 3 đỉnh + 1 đỉnh khép kín = 4 điểm
      expect(ring).toHaveLength(4);

      // Điểm 1: [lng, lat]
      expect(ring[0]).toEqual([105.812346, 21.012346]);
      // Điểm cuối cùng phải trùng với điểm đầu
      expect(ring[3]).toEqual(ring[0]);
    });

    it('không thêm điểm trùng nếu mảng đã khép kín sẵn', () => {
      const points = [
        { lat: 21.0, lng: 105.8 },
        { lat: 21.1, lng: 105.8 },
        { lat: 21.1, lng: 105.9 },
        { lat: 21.0, lng: 105.8 },
      ];

      const geojson = latLngsToGeoJSON(points);
      expect(geojson?.coordinates[0]).toHaveLength(4);
    });
  });

  describe('geoJSONToLatLngs', () => {
    it('trích xuất đúng danh sách [lat, lng] từ Polygon GeoJSON', () => {
      const polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [105.8, 21.0],
            [105.8, 21.1],
            [105.9, 21.1],
            [105.8, 21.0],
          ],
        ],
      };

      const latlngs = geoJSONToLatLngs(polygon);

      expect(latlngs).toEqual([
        [21.0, 105.8],
        [21.1, 105.8],
        [21.1, 105.9],
        [21.0, 105.8],
      ]);
    });

    it('trích xuất đúng từ GeoJSON Feature chứa geometry Polygon', () => {
      const feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [105.8, 21.0],
              [105.9, 21.1],
              [105.8, 21.0],
            ],
          ],
        },
      };

      const latlngs = geoJSONToLatLngs(feature);
      expect(latlngs).toEqual([
        [21.0, 105.8],
        [21.1, 105.9],
        [21.0, 105.8],
      ]);
    });

    it('trả về mảng rỗng nếu đầu vào không hợp lệ hoặc null', () => {
      expect(geoJSONToLatLngs(null)).toEqual([]);
      expect(geoJSONToLatLngs({})).toEqual([]);
      expect(geoJSONToLatLngs({ type: 'Point', coordinates: [105.8, 21.0] })).toEqual([]);
    });
  });

  describe('normalizeGeoJSONPolygon', () => {
    it('chuẩn hóa Polygon chưa khép kín thành khép kín', () => {
      const unclosed = {
        type: 'Polygon',
        coordinates: [
          [
            [105.8, 21.0],
            [105.8, 21.1],
            [105.9, 21.1],
          ],
        ],
      };

      const normalized = normalizeGeoJSONPolygon(unclosed);
      expect(normalized).not.toBeNull();
      expect(normalized?.type).toBe('Polygon');
      expect(normalized?.coordinates[0]).toHaveLength(4);
      expect(normalized?.coordinates[0][3]).toEqual(normalized?.coordinates[0][0]);
    });

    it('chuẩn hóa Feature chứa Polygon', () => {
      const feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [105.8, 21.0],
              [105.8, 21.1],
              [105.9, 21.1],
              [105.8, 21.0],
            ],
          ],
        },
      };

      const normalized = normalizeGeoJSONPolygon(feature);
      expect(normalized?.type).toBe('Polygon');
      expect(normalized?.coordinates[0]).toHaveLength(4);
    });
  });

  describe('computeGeoJsonBounds', () => {
    it('tính toán chính xác bounding box và điểm tâm', () => {
      const polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [100.0, 10.0],
            [100.0, 20.0],
            [110.0, 20.0],
            [110.0, 10.0],
            [100.0, 10.0],
          ],
        ],
      };

      const result = computeGeoJsonBounds(polygon);

      expect(result).not.toBeNull();
      expect(result?.bounds).toEqual([
        [10.0, 100.0],
        [20.0, 110.0],
      ]);
      expect(result?.center).toEqual([15.0, 105.0]);
    });

    it('trả về null nếu polygon không có tọa độ', () => {
      expect(computeGeoJsonBounds(null)).toBeNull();
      expect(computeGeoJsonBounds({ type: 'Polygon', coordinates: [] })).toBeNull();
    });
  });
});

import { vi } from 'vitest';

// Mock Leaflet
vi.mock('leaflet', () => {
  const mockLayer = {
    addTo: vi.fn().mockReturnThis(),
    bindPopup: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    getBounds: vi.fn().mockReturnValue({
      extend: vi.fn().mockReturnThis(),
      getSouthWest: vi.fn().mockReturnValue({ lat: 21.0, lng: 105.8 }),
      getNorthEast: vi.fn().mockReturnValue({ lat: 21.1, lng: 105.9 }),
    }),
    getLatLngs: vi.fn().mockReturnValue([
      [
        { lat: 21.0, lng: 105.8 },
        { lat: 21.1, lng: 105.8 },
        { lat: 21.1, lng: 105.9 },
        { lat: 21.0, lng: 105.8 },
      ],
    ]),
  };

  const mockMap = {
    setView: vi.fn().mockReturnThis(),
    fitBounds: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    removeLayer: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    pm: {
      setLang: vi.fn(),
      addControls: vi.fn(),
      enableDraw: vi.fn(),
      disableDraw: vi.fn(),
      enableGlobalEditMode: vi.fn(),
      disableGlobalEditMode: vi.fn(),
      getGeomanLayers: vi.fn().mockReturnValue([]),
    },
  };

  const mockFeatureGroup = {
    addTo: vi.fn().mockReturnThis(),
    clearLayers: vi.fn().mockReturnThis(),
    addLayer: vi.fn().mockReturnThis(),
    removeLayer: vi.fn().mockReturnThis(),
    getBounds: vi.fn().mockReturnValue({
      extend: vi.fn().mockReturnThis(),
    }),
  };

  return {
    default: {
      map: vi.fn().mockReturnValue(mockMap),
      tileLayer: vi.fn().mockReturnValue({ addTo: vi.fn().mockReturnThis() }),
      polygon: vi.fn().mockReturnValue(mockLayer),
      featureGroup: vi.fn().mockReturnValue(mockFeatureGroup),
      latLngBounds: vi.fn().mockReturnValue({ extend: vi.fn().mockReturnThis() }),
      Icon: {
        Default: {
          prototype: {},
          mergeOptions: vi.fn(),
        },
      },
    },
    map: vi.fn().mockReturnValue(mockMap),
    tileLayer: vi.fn().mockReturnValue({ addTo: vi.fn().mockReturnThis() }),
    polygon: vi.fn().mockReturnValue(mockLayer),
    featureGroup: vi.fn().mockReturnValue(mockFeatureGroup),
  };
});

vi.mock('@geoman-io/leaflet-geoman-free', () => ({}));

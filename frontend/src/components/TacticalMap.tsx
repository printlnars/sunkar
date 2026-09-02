import React, { useState, useEffect } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Polygon, 
  Polyline, 
  Marker, 
  Popup, 
  Tooltip, 
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import { 
  Flame, 
  Wind,
  Info,
  Map as MapIcon
} from 'lucide-react';
import type { Incident, EmergencyUnit, WeatherData } from '../types';

interface TacticalMapProps {
  incident: Incident | null;
  units: EmergencyUnit[];
  weather: WeatherData | null;
}

// Controller component to smoothly center / pan the Leaflet map
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
};

// Custom Realistic Pins for Leaflet
const createFireIcon = () => {
  return L.divIcon({
    className: 'custom-fire-marker',
    html: `
      <div style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
        <div style="width: 32px; height: 32px; border-radius: 50%; background: #dc2626; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
          <span style="font-size: 16px;">🔥</span>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

const createVillageIcon = () => {
  return L.divIcon({
    className: 'custom-village-marker',
    html: `
      <div style="display: flex; align-items: center; gap: 6px; background: #0f172a; border: 1.5px solid #d97706; border-radius: 6px; padding: 4px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.5); white-space: nowrap; transform: translate(-50%, -50%);">
        <span style="font-size: 14px;">🏡</span>
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: 11px; font-weight: 700; color: #ffffff;">с. Бородулиха</span>
          <span style="font-size: 9px; font-weight: 600; color: #fbbf24;">Угроза через 42 мин</span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

const createUnitIcon = (unit: EmergencyUnit) => {
  const isEnRoute = unit.status === 'EN_ROUTE';
  let emoji = '🚒';
  let borderColor = '#16a34a';

  if (unit.unit_type === 'HELICOPTER_MI8') {
    emoji = '🚁';
    borderColor = '#0284c7';
  } else if (unit.unit_type === 'HEAVY_BULLDOZER') {
    emoji = '🚜';
    borderColor = '#d97706';
  }

  return L.divIcon({
    className: 'custom-unit-marker',
    html: `
      <div style="display: flex; align-items: center; gap: 6px; background: #0f172a; border: 1.5px solid ${borderColor}; border-radius: 6px; padding: 4px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.5); white-space: nowrap; transform: translate(-50%, -50%);">
        <span style="font-size: 14px;">${emoji}</span>
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: 11px; font-weight: 700; color: #ffffff;">${unit.callsign}</span>
          <span style="font-size: 9px; font-weight: 600; color: ${borderColor};">${isEnRoute ? 'В пути • ' + (unit.eta_minutes ? unit.eta_minutes + ' мин' : '') : 'Дежурство'}</span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

export const TacticalMap: React.FC<TacticalMapProps> = ({
  incident,
  units,
  weather
}) => {
  const [mapType, setMapType] = useState<'SATELLITE' | 'STREETS'>('SATELLITE');
  
  const defaultCenter: [number, number] = [50.6800, 80.9000];
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [zoomLevel, setZoomLevel] = useState<number>(12);

  const handleFocusFire = () => {
    if (incident) {
      setMapCenter([incident.center_lat, incident.center_lon]);
      setZoomLevel(13);
    }
  };

  const handleFocusVillage = () => {
    setMapCenter([50.7180, 80.9250]);
    setZoomLevel(13);
  };

  const handleResetView = () => {
    setMapCenter(defaultCenter);
    setZoomLevel(12);
  };

  return (
    <div className="flex flex-col h-full mchs-card rounded-lg overflow-hidden relative shadow-md">
      
      {/* Top Map Control Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 mchs-card-header z-10 gap-2">
        
        {/* Title and Location */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-[#1e2e4a] text-sky-400 border border-[#2b4168]">
            <MapIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase">
                Геоинформационная карта оперативной обстановки
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#1e2e4a] text-slate-300 border border-[#2b4168]">
                ГЛПР «Семей орманы» • Квадрат 45
              </span>
            </div>
          </div>
        </div>

        {/* Quick Map Action Controls */}
        <div className="flex items-center gap-2 text-xs">
          
          {/* Layer switcher */}
          <div className="flex bg-[#0b1322] rounded p-0.5 border border-[#233350]">
            <button
              onClick={() => setMapType('SATELLITE')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                mapType === 'SATELLITE'
                  ? 'bg-[#0284c7] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Спутник
            </button>
            <button
              onClick={() => setMapType('STREETS')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                mapType === 'STREETS'
                  ? 'bg-[#0284c7] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Схема
            </button>
          </div>

          <div className="h-4 w-px bg-[#233350]" />

          {/* Quick Focus Buttons */}
          <button
            onClick={handleFocusFire}
            className="px-2.5 py-1 rounded bg-[#2a1418] hover:bg-[#3b1c22] text-red-300 border border-[#7f1d1d] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
          >
            🔥 К очагу
          </button>

          <button
            onClick={handleFocusVillage}
            className="px-2.5 py-1 rounded bg-[#2b1f14] hover:bg-[#3d2b1b] text-amber-300 border border-[#78350f] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
          >
            🏡 К с. Бородулиха
          </button>

          <button
            onClick={handleResetView}
            className="px-2.5 py-1 rounded bg-[#18263f] hover:bg-[#203354] text-slate-300 border border-[#2a3f66] text-xs font-medium transition-colors cursor-pointer"
          >
            Общий план
          </button>

        </div>

      </div>

      {/* Main Leaflet Map Container */}
      <div className="relative flex-1 w-full min-h-[460px]">
        <MapContainer
          center={defaultCenter}
          zoom={12}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <MapController center={mapCenter} zoom={zoomLevel} />

          {/* Tile Layer (Satellite vs OpenStreetMap) */}
          {mapType === 'SATELLITE' ? (
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
            />
          ) : (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}.png"
              maxZoom={19}
            />
          )}

          {/* 1. Fire Origin Marker */}
          {incident && (
            <Marker
              position={[incident.center_lat, incident.center_lon]}
              icon={createFireIcon()}
            >
              <Popup>
                <div className="p-1.5 space-y-1 text-slate-200">
                  <div className="text-red-400 font-bold text-xs flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5" /> ОЧАГ ВОЗГОРАНИЯ
                  </div>
                  <div className="text-xs">Резерват «Семей орманы», Квадрат 45</div>
                  <div className="text-[11px] text-slate-400">
                    Координаты: {incident.center_lat.toFixed(4)}°N, {incident.center_lon.toFixed(4)}°E
                  </div>
                  <div className="text-[11px] text-emerald-400 font-medium">
                    Достоверность ИИ: {(incident.detection_confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* 2. Critical Settlement Marker (с. Бородулиха) */}
          <Marker
            position={[50.7180, 80.9250]}
            icon={createVillageIcon()}
          >
            <Popup>
              <div className="p-1.5 space-y-1 text-slate-200">
                <div className="text-amber-400 font-bold text-xs">с. Бородулиха (Райцентр)</div>
                <div className="text-xs">Население: ~3 400 жителей</div>
                <div className="text-xs text-red-400 font-medium">
                  Расчетное время подступа кромки огня: 42 минуты
                </div>
              </div>
            </Popup>
          </Marker>

          {/* 3. Forest Cordon #3 Marker */}
          <Marker
            position={[50.6800, 80.9400]}
            icon={L.divIcon({
              className: 'cordon-marker',
              html: `
                <div style="background: #0f172a; border: 1px solid #38bdf8; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 600; color: #38bdf8; white-space: nowrap; transform: translate(-50%, -50%);">
                  🌲 Кордон №3
                </div>
              `,
              iconSize: [0, 0]
            })}
          />

          {/* 4. Fire Spread Polygons (Rothermel Isochrones) */}
          {incident?.spread_polygons && incident.spread_polygons.map((poly, idx) => {
            if (!poly.coordinates || poly.coordinates.length < 3) return null;

            let color = '#dc2626';
            let fillColor = 'rgba(220, 38, 38, 0.4)';
            let label = `Зона +${poly.time_offset_min} мин`;

            if (poly.time_offset_min === 0) {
              color = '#ffffff';
              fillColor = '#dc2626';
              label = 'Начальный очаг';
            } else if (poly.time_offset_min === 15) {
              color = '#dc2626';
              fillColor = 'rgba(220, 38, 38, 0.35)';
            } else if (poly.time_offset_min === 30) {
              color = '#ea580c';
              fillColor = 'rgba(234, 88, 12, 0.25)';
            } else if (poly.time_offset_min === 60) {
              color = '#d97706';
              fillColor = 'rgba(217, 119, 6, 0.18)';
            } else if (poly.time_offset_min === 120) {
              color = '#b91c1c';
              fillColor = 'rgba(185, 28, 28, 0.12)';
            }

            return (
              <Polygon
                key={`poly-${poly.time_offset_min}-${idx}`}
                positions={poly.coordinates as [number, number][]}
                pathOptions={{
                  color: color,
                  fillColor: fillColor,
                  fillOpacity: 0.45,
                  weight: poly.time_offset_min === 0 ? 2 : 1.5,
                  dashArray: poly.time_offset_min === 120 ? '4, 4' : undefined
                }}
              >
                <Tooltip sticky>
                  <div className="font-semibold text-xs">
                    {label} ({poly.area_ha.toFixed(0)} га)
                  </div>
                </Tooltip>
              </Polygon>
            );
          })}

          {/* 5. Safe Northern Firebreak Line & Intercept Routes */}
          <Polyline
            positions={[
              [50.6650, 80.8500],
              [50.6800, 80.8900],
              [50.6900, 80.9350]
            ]}
            pathOptions={{
              color: '#0284c7',
              weight: 3.5,
              dashArray: '6, 6',
              opacity: 0.9
            }}
          >
            <Tooltip sticky>
              <div className="text-xs font-semibold text-sky-200">
                Северная просека №2 (Маршрут выдвижения техники МЧС)
              </div>
            </Tooltip>
          </Polyline>

          {/* Units Intercept Track Lines */}
          {incident?.dispatch_plan?.intercept_routes?.map((route) => (
            <Polyline
              key={route.unit_id}
              positions={route.waypoints as [number, number][]}
              pathOptions={{
                color: route.unit_id.includes('AVIA') ? '#38bdf8' : '#16a34a',
                weight: 2.5,
                opacity: 0.85
              }}
            />
          ))}

          {/* 6. Emergency Units (МЧС Техника) */}
          {units.map((unit) => (
            <Marker
              key={unit.id}
              position={[unit.lat, unit.lon]}
              icon={createUnitIcon(unit)}
            >
              <Popup>
                <div className="p-1.5 space-y-1 text-slate-200">
                  <div className="font-bold text-xs text-emerald-400">{unit.name}</div>
                  <div className="text-xs">Позывной: <strong>{unit.callsign}</strong></div>
                  <div className="text-xs">Базирование: {unit.base_station}</div>
                  <div className="text-xs">Экипаж: {unit.personnel_count} чел. | Вода: {unit.water_capacity_l || 'N/A'} л</div>
                  <div className="text-xs font-semibold text-sky-300">
                    Статус: {unit.status === 'EN_ROUTE' ? `В пути (ETA ${unit.eta_minutes} мин)` : 'В дежурстве'}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        </MapContainer>

        {/* Floating Clear Legend Box in Bottom-Right */}
        <div className="absolute bottom-4 right-4 bg-[#0e1728]/95 border border-[#233454] rounded-lg p-3 text-xs text-slate-200 shadow-lg z-[1000] max-w-[240px] space-y-2 pointer-events-auto">
          <div className="font-bold text-[11px] text-white uppercase tracking-wide flex items-center justify-between border-b border-[#233454] pb-1">
            <span>Условные обозначения</span>
            <Info className="w-3.5 h-3.5 text-sky-400" />
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600 border border-white flex items-center justify-center text-[7px]">🔥</span>
              <span>Очаг пожара (Квадрат 45)</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-3.5 h-2 rounded bg-red-600/40 border border-red-500" />
              <span>Зона распространения (+30 / +60 мин)</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-3.5 h-0.5 border-t-2 border-dashed border-sky-400" />
              <span>Северная противопожарная просека</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-600 border border-white flex items-center justify-center text-[7px]">🚒</span>
              <span>Расчеты МЧС (ПЧ-4, ПЧ-7, Ми-8)</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs">🏡</span>
              <span>с. Бородулиха (населенный пункт)</span>
            </div>
          </div>
        </div>

        {/* Floating Wind Indicator in Top-Left of Map */}
        {weather && (
          <div className="absolute top-4 left-4 bg-[#0e1728]/95 border border-[#233454] rounded-lg px-3 py-2 text-xs text-slate-200 shadow-md z-[1000] flex items-center gap-2">
            <Wind className="w-4 h-4 text-sky-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Ветер (Казгидромет)</div>
              <div className="font-bold text-white text-xs">
                {weather.wind_direction_label} • {weather.wind_speed_ms.toFixed(1)} м/с
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

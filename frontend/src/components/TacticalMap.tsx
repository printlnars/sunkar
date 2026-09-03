import React, { useState, useEffect } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Polygon, 
  Polyline, 
  Marker, 
  Popup, 
  Tooltip, 
  CircleMarker,
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import { 
  Flame, 
  Info,
  Map as MapIcon,
  Navigation2
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

// 1. Radar-Pulsing Flame Core Marker
const createFireIcon = () => {
  return L.divIcon({
    className: 'custom-fire-marker',
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <div class="animate-radar-ring" style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(239, 68, 68, 0.45); border: 1.5px solid #ef4444;"></div>
        <div style="position: relative; width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(220,38,38,0.7);">
          <span style="font-size: 16px;">🔥</span>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22]
  });
};

// 2. Base Station Start Point Marker (🏢 Точка старта / Базирование)
const createBaseIcon = (name: string, type: 'STATION' | 'AIRBASE') => {
  const icon = type === 'AIRBASE' ? '🛫' : '🏢';
  return L.divIcon({
    className: 'custom-base-marker',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="display: flex; align-items: center; gap: 4px; background: #0f172a; border: 1.5px solid #38bdf8; border-radius: 6px; padding: 3px 6px; color: #f8fafc; font-size: 10px; font-weight: 700; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
          <span>${icon}</span>
          <span>${name}</span>
        </div>
        <div style="width: 2px; height: 5px; background: #38bdf8;"></div>
        <div style="width: 6px; height: 6px; border-radius: 50%; background: #38bdf8; border: 1px solid #ffffff;"></div>
      </div>
    `,
    iconSize: [120, 36],
    iconAnchor: [60, 36],
    popupAnchor: [0, -36]
  });
};

// 3. Target Destination Objective Marker (🎯 Рубеж перехвата / Пункт назначения)
const createTargetIcon = (label: string, color: string) => {
  return L.divIcon({
    className: 'custom-target-marker',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="display: flex; align-items: center; gap: 4px; background: #ffffff; border: 2px solid ${color}; border-radius: 6px; padding: 2px 6px; color: #0f172a; font-size: 10px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
          <span>🎯</span>
          <span>${label}</span>
        </div>
        <div style="width: 2px; height: 5px; background: ${color};"></div>
        <div style="width: 6px; height: 6px; border-radius: 50%; background: ${color}; border: 1px solid #ffffff;"></div>
      </div>
    `,
    iconSize: [130, 36],
    iconAnchor: [65, 36],
    popupAnchor: [0, -36]
  });
};

// 4. Moving Tactical Vehicle Pin (🚒 Транспорт на марше)
const createUnitIcon = (unit: EmergencyUnit) => {
  const isEnRoute = unit.status === 'EN_ROUTE';
  let emoji = '🚒';
  let bgGradient = 'linear-gradient(135deg, #059669 0%, #047857 100%)';

  if (unit.unit_type === 'HELICOPTER_MI8') {
    emoji = '🚁';
    bgGradient = 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
  } else if (unit.unit_type === 'HEAVY_BULLDOZER') {
    emoji = '🚜';
    bgGradient = 'linear-gradient(135deg, #d97706 0%, #b45309 100%)';
  }

  return L.divIcon({
    className: 'custom-tactical-unit-marker',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; position: relative;">
        <div style="width: 34px; height: 34px; border-radius: 50%; background: ${bgGradient}; border: 2.5px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.35); position: relative;">
          <span style="font-size: 16px;">${emoji}</span>
          ${isEnRoute ? `<span style="position: absolute; top: -2px; right: -2px; width: 10px; height: 10px; border-radius: 50%; background: #10b981; border: 2px solid #ffffff;"></span>` : ''}
        </div>
        <div style="background: rgba(15, 23, 42, 0.9); color: #ffffff; border: 1px solid rgba(255,255,255,0.25); border-radius: 4px; padding: 1.5px 6px; font-size: 9px; font-weight: 800; margin-top: 2px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.25);">
          ${unit.callsign}
        </div>
      </div>
    `,
    iconSize: [64, 52],
    iconAnchor: [32, 26],
    popupAnchor: [0, -28]
  });
};

// 5. Critical Settlement Marker (с. Бородулиха)
const createVillageIcon = () => {
  return L.divIcon({
    className: 'custom-village-marker',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="display: flex; align-items: center; gap: 4px; background: #ffffff; border: 2px solid #d97706; border-radius: 8px; padding: 3px 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.2); white-space: nowrap;">
          <span style="font-size: 14px;">🏡</span>
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 11px; font-weight: 800; color: #1e293b;">с. Бородулиха</span>
            <span style="font-size: 9px; font-weight: 700; color: #d97706;">Угроза через 42 мин</span>
          </div>
        </div>
        <div style="width: 2px; height: 6px; background: #d97706;"></div>
        <div style="width: 6px; height: 6px; border-radius: 50%; background: #d97706;"></div>
      </div>
    `,
    iconSize: [120, 42],
    iconAnchor: [60, 42],
    popupAnchor: [0, -42]
  });
};

export const TacticalMap: React.FC<TacticalMapProps> = ({
  incident,
  units,
  weather
}) => {
  const [mapType, setMapType] = useState<'SATELLITE' | 'DARK' | 'STREETS'>('SATELLITE');
  
  // Layer Toggles
  const [showFireArea, setShowFireArea] = useState<boolean>(true);
  const [showSmokePlume, setShowSmokePlume] = useState<boolean>(true);
  const [showUnits, setShowUnits] = useState<boolean>(true);
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const [showBases, setShowBases] = useState<boolean>(true);
  const [showLegend, setShowLegend] = useState<boolean>(true);

  const defaultCenter: [number, number] = [50.6800, 80.9000];
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);
  const [zoomLevel, setZoomLevel] = useState<number>(12);

  const handleFocusFire = () => {
    if (incident) {
      setMapCenter([incident.center_lat, incident.center_lon]);
      setZoomLevel(14);
    }
  };

  const handleFocusVillage = () => {
    setMapCenter([50.7180, 80.9250]);
    setZoomLevel(14);
  };

  const handleFocusInterception = () => {
    setMapCenter([50.6650, 80.8900]);
    setZoomLevel(13);
  };

  const handleResetView = () => {
    setMapCenter(defaultCenter);
    setZoomLevel(12);
  };

  const windAngle = weather ? weather.wind_direction_deg : 185;

  // Smoke plume coordinates stretching north from fire towards Borodulikha
  const smokePlumeCoords: [number, number][] = incident ? [
    [incident.center_lat - 0.003, incident.center_lon - 0.005],
    [incident.center_lat + 0.020, incident.center_lon - 0.012],
    [incident.center_lat + 0.050, incident.center_lon - 0.016],
    [incident.center_lat + 0.075, incident.center_lon + 0.020],
    [incident.center_lat + 0.065, incident.center_lon + 0.035],
    [incident.center_lat + 0.035, incident.center_lon + 0.022],
    [incident.center_lat + 0.010, incident.center_lon + 0.010],
    [incident.center_lat - 0.003, incident.center_lon + 0.005],
  ] : [];

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden bg-slate-900 rounded-2xl shadow-sm">
      
      {/* Top Map Action Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 z-10 gap-2 shrink-0">
        
        {/* Title & Square */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
            <MapIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Геоинформационная тактическая карта
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                ГЛПР «Семей орманы» • Квадрат 45
              </span>
            </div>
          </div>
        </div>

        {/* Quick Map Controls & Layers */}
        <div className="flex items-center gap-2 text-xs">
          
          {/* Basemap Switcher */}
          <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200">
            <button
              onClick={() => setMapType('SATELLITE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mapType === 'SATELLITE'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Спутник HD
            </button>
            <button
              onClick={() => setMapType('DARK')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mapType === 'DARK'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Тёмная ГИС
            </button>
            <button
              onClick={() => setMapType('STREETS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mapType === 'STREETS'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Схема
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Quick Focus Buttons */}
          <button
            onClick={handleFocusFire}
            className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
          >
            🔥 К очагу
          </button>

          <button
            onClick={handleFocusVillage}
            className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
          >
            🏡 К селу
          </button>

          <button
            onClick={handleFocusInterception}
            className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
          >
            🎯 К рубежам
          </button>

          <button
            onClick={handleResetView}
            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Общий вид
          </button>

        </div>

      </div>

      {/* Main Interactive Leaflet Map */}
      <div className="relative flex-1 w-full h-full min-h-[440px]">
        <MapContainer
          center={defaultCenter}
          zoom={12}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <MapController center={mapCenter} zoom={zoomLevel} />

          {/* Basemap Tile Layer */}
          {mapType === 'SATELLITE' && (
            <>
              <TileLayer
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={18}
              />
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
                maxZoom={18}
              />
            </>
          )}

          {mapType === 'DARK' && (
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO Dark Matter</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              maxZoom={19}
            />
          )}

          {mapType === 'STREETS' && (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}.png"
              maxZoom={19}
            />
          )}

          {/* 1. Atmospheric Smoke Dispersion Plume (Шлейф задымления - полупрозрачная область) */}
          {showSmokePlume && smokePlumeCoords.length > 0 && (
            <Polygon
              positions={smokePlumeCoords}
              pathOptions={{
                stroke: false,
                fillColor: '#64748b',
                fillOpacity: 0.22
              }}
            >
              <Tooltip sticky>
                <div className="font-bold text-xs text-slate-800">
                  💨 Шлейф атмосферного задымления (PM2.5 / CO2)
                </div>
              </Tooltip>
            </Polygon>
          )}

          {/* 2. SOLID CONTINUOUS WILDFIRE THERMAL AREA (Единая плотная область горения БЕЗ линий обводки) */}
          {showFireArea && incident?.spread_polygons && (
            <>
              {/* Layer A: Extended Thermal Heat Diffusion Zone (+60 min) */}
              {incident.spread_polygons.find(p => p.time_offset_min === 60) && (
                <Polygon
                  positions={incident.spread_polygons.find(p => p.time_offset_min === 60)!.coordinates as [number, number][]}
                  pathOptions={{
                    stroke: false,
                    fillColor: '#f97316',
                    fillOpacity: 0.28
                  }}
                >
                  <Tooltip sticky>
                    <div className="font-bold text-xs text-slate-900">
                      Зона теплового воздействия (+60 мин) • 48 га
                    </div>
                  </Tooltip>
                </Polygon>
              )}

              {/* Layer B: Main Fire Spread Area (+30 min) */}
              {incident.spread_polygons.find(p => p.time_offset_min === 30) && (
                <Polygon
                  positions={incident.spread_polygons.find(p => p.time_offset_min === 30)!.coordinates as [number, number][]}
                  pathOptions={{
                    stroke: false,
                    fillColor: '#ea580c',
                    fillOpacity: 0.42
                  }}
                >
                  <Tooltip sticky>
                    <div className="font-bold text-xs text-slate-900">
                      Фронт открытого пламени (+30 мин) • 24.5 га
                    </div>
                  </Tooltip>
                </Polygon>
              )}

              {/* Layer C: Active Flame Combustion Zone (+15 min) */}
              {incident.spread_polygons.find(p => p.time_offset_min === 15) && (
                <Polygon
                  positions={incident.spread_polygons.find(p => p.time_offset_min === 15)!.coordinates as [number, number][]}
                  pathOptions={{
                    stroke: false,
                    fillColor: '#dc2626',
                    fillOpacity: 0.62
                  }}
                >
                  <Tooltip sticky>
                    <div className="font-bold text-xs text-slate-900">
                      Зона активного горения (+15 мин) • 8.2 га
                    </div>
                  </Tooltip>
                </Polygon>
              )}

              {/* Layer D: Intense Blazing Core (0 min) */}
              {incident.spread_polygons.find(p => p.time_offset_min === 0) && (
                <Polygon
                  positions={incident.spread_polygons.find(p => p.time_offset_min === 0)!.coordinates as [number, number][]}
                  pathOptions={{
                    stroke: false,
                    fillColor: '#ff2200',
                    fillOpacity: 0.88
                  }}
                >
                  <Tooltip sticky>
                    <div className="font-bold text-xs text-slate-900">
                      🔥 Эпицентр очага возгорания (780°C)
                    </div>
                  </Tooltip>
                </Polygon>
              )}

              {/* Thermal Hotspots (VIIRS/MODIS Infrared Pixels) */}
              <CircleMarker
                center={[incident.center_lat + 0.003, incident.center_lon + 0.002]}
                radius={4}
                pathOptions={{ color: '#ffffff', fillColor: '#facc15', fillOpacity: 0.9, weight: 1.5 }}
              />
              <CircleMarker
                center={[incident.center_lat + 0.007, incident.center_lon + 0.004]}
                radius={3.5}
                pathOptions={{ color: '#ffffff', fillColor: '#fb923c', fillOpacity: 0.9, weight: 1.5 }}
              />
              <CircleMarker
                center={[incident.center_lat - 0.002, incident.center_lon - 0.001]}
                radius={3}
                pathOptions={{ color: '#ffffff', fillColor: '#ef4444', fillOpacity: 0.9, weight: 1.5 }}
              />
            </>
          )}

          {/* 3. Fire Origin Marker (Radar Pulse) */}
          {incident && (
            <Marker
              position={[incident.center_lat, incident.center_lon]}
              icon={createFireIcon()}
            >
              <Popup>
                <div className="p-1.5 space-y-1.5 text-slate-800 max-w-[210px]">
                  <div className="text-rose-600 font-bold text-xs flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-rose-600" /> 
                    <span>ОЧАГ ВОЗГОРАНИЯ</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900">
                    Резерват «Семей орманы», Кв. 45
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {incident.center_lat.toFixed(4)}°N, {incident.center_lon.toFixed(4)}°E
                  </div>
                  <div className="text-[11px] text-emerald-600 font-bold pt-1 border-t border-slate-100">
                    Достоверность ИИ: {(incident.detection_confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* 4. Critical Settlement Target (с. Бородулиха) */}
          <Marker
            position={[50.7180, 80.9250]}
            icon={createVillageIcon()}
          >
            <Popup>
              <div className="p-1.5 space-y-1 text-slate-800">
                <div className="text-amber-800 font-bold text-xs">с. Бородулиха (Районный центр)</div>
                <div className="text-xs text-slate-600">Население: ~3 400 жителей</div>
                <div className="text-xs text-rose-600 font-bold pt-1 border-t border-slate-100">
                  Расчетное время подступа кромки огня: 42 минуты
                </div>
              </div>
            </Popup>
          </Marker>

          {/* 5. Base Stations (🏢 Пункты старта транспорта) */}
          {showBases && (
            <>
              {/* Base Station ПЧ-4 */}
              <Marker
                position={[50.5950, 80.8200]}
                icon={createBaseIcon('База ПЧ-4', 'STATION')}
              >
                <Popup>
                  <div className="p-1 text-xs text-slate-800">
                    <div className="font-bold text-blue-800">ПЧ-4 г. Семей</div>
                    <div className="text-slate-500">Точка постоянной дислокации АЦ-40</div>
                  </div>
                </Popup>
              </Marker>

              {/* Base Station Опорный пункт Бородулиха */}
              <Marker
                position={[50.7220, 80.9320]}
                icon={createBaseIcon('Опорный пункт с. Бородулиха', 'STATION')}
              >
                <Popup>
                  <div className="p-1 text-xs text-slate-800">
                    <div className="font-bold text-amber-800">Опорный пункт тяжелой техники</div>
                    <div className="text-slate-500">Базирование бульдозера Komatsu (Гранит-7)</div>
                  </div>
                </Popup>
              </Marker>

              {/* Base Station Авиабаза Казавиаспас */}
              <Marker
                position={[50.4800, 80.4500]}
                icon={createBaseIcon('Авиабаза Казавиаспас', 'AIRBASE')}
              >
                <Popup>
                  <div className="p-1 text-xs text-slate-800">
                    <div className="font-bold text-sky-800">Авиабаза МЧС РК (Семей)</div>
                    <div className="text-slate-500">Дислокация вертолета Ми-8 (ВСУ-5)</div>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {/* 6. Target Objectives (🎯 Пункты назначения и рубежи перехвата) */}
          {showBases && (
            <>
              {/* Target 1: Рубеж водяного заслона АЦ-40 */}
              <Marker
                position={[50.6550, 80.8880]}
                icon={createTargetIcon('Рубеж заслона №1 (АЦ-40)', '#059669')}
              >
                <Popup>
                  <div className="p-1 text-xs text-slate-800">
                    <div className="font-bold text-emerald-800">Рубеж водяного заслона №1</div>
                    <div className="text-slate-600">Назначен: Расчет ПЧ-4 (Тайфун-4)</div>
                    <div className="text-slate-500">Задача: Подача лафетных стволов на Сев. просеке №2</div>
                  </div>
                </Popup>
              </Marker>

              {/* Target 2: Рубеж опашки Бульдозера */}
              <Marker
                position={[50.6720, 80.9020]}
                icon={createTargetIcon('Рубеж опашки №7', '#d97706')}
              >
                <Popup>
                  <div className="p-1 text-xs text-slate-800">
                    <div className="font-bold text-amber-800">Рубеж минерализованной полосы</div>
                    <div className="text-slate-600">Назначен: Расчет №7 (Гранит-7)</div>
                    <div className="text-slate-500">Задача: Создание 8-метрового противопожарного разрыва</div>
                  </div>
                </Popup>
              </Marker>

              {/* Target 3: Точка сброса воды ВСУ-5 */}
              <Marker
                position={[50.6482, 80.8924]}
                icon={createTargetIcon('Точка сброса ВСУ-5', '#0284c7')}
              >
                <Popup>
                  <div className="p-1 text-xs text-slate-800">
                    <div className="font-bold text-sky-800">Точка сброса воды ВСУ-5</div>
                    <div className="text-slate-600">Назначен: Борт UP-MI801 (Ми-8)</div>
                    <div className="text-slate-500">Объем сброса: 5 000 литров по кромке очага</div>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {/* 7. Northern Protective Firebreak Road */}
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
              opacity: 0.95
            }}
          >
            <Tooltip sticky>
              <div className="text-xs font-bold text-blue-900">
                Северная просека №2 (Защитный рубеж)
              </div>
            </Tooltip>
          </Polyline>

          {/* 8. Tactical Intercept Paths (Start Base -> Vehicle -> Target Objective) */}
          {showRoutes && (
            <>
              {/* Route for AC-40 (ПЧ-4 -> Vehicle -> Northern Firebreak Target) */}
              <Polyline
                positions={[
                  [50.5950, 80.8200], // Base ПЧ-4
                  [50.6220, 80.8520], // Current vehicle position
                  [50.6380, 80.8720],
                  [50.6550, 80.8880]  // Target Objective
                ]}
                pathOptions={{
                  color: '#059669',
                  weight: 3.5,
                  opacity: 0.9,
                  dashArray: '6, 6'
                }}
              >
                <Tooltip sticky>
                  <div className="text-xs font-bold text-emerald-900">
                    Маршрут выдвижения ПЧ-4 (Тайфун-4) • ETA 18 мин
                  </div>
                </Tooltip>
              </Polyline>

              {/* Route for Bulldozer (Borodulikha Base -> Vehicle -> Plowing Target) */}
              <Polyline
                positions={[
                  [50.7220, 80.9320], // Base Borodulikha
                  [50.7020, 80.9160], // Current vehicle position
                  [50.6850, 80.9080],
                  [50.6720, 80.9020]  // Target Objective
                ]}
                pathOptions={{
                  color: '#d97706',
                  weight: 3.5,
                  opacity: 0.9,
                  dashArray: '6, 6'
                }}
              >
                <Tooltip sticky>
                  <div className="text-xs font-bold text-amber-900">
                    Маршрут выдвижения Бульдозера (Гранит-7) • ETA 22 мин
                  </div>
                </Tooltip>
              </Polyline>

              {/* Route for Mi-8 Helicopter (Airbase -> Vehicle -> Fire Head Drop Point) */}
              <Polyline
                positions={[
                  [50.4800, 80.4500], // Airbase Semey
                  [50.5850, 80.7600], // Current flight position
                  [50.6200, 80.8400],
                  [50.6482, 80.8924]  // Fire Drop Target
                ]}
                pathOptions={{
                  color: '#0284c7',
                  weight: 3,
                  opacity: 0.9,
                  dashArray: '4, 8'
                }}
              >
                <Tooltip sticky>
                  <div className="text-xs font-bold text-sky-900">
                    Воздушный коридор Ми-8 (Борт UP-MI801) • ETA 12 мин
                  </div>
                </Tooltip>
              </Polyline>
            </>
          )}

          {/* 9. Moving Vehicle Markers */}
          {showUnits && units.map((unit) => (
            <Marker
              key={unit.id}
              position={[unit.lat, unit.lon]}
              icon={createUnitIcon(unit)}
            >
              <Popup>
                <div className="p-1.5 space-y-1 text-slate-800 min-w-[220px]">
                  <div className="font-bold text-xs text-emerald-800">{unit.name}</div>
                  <div className="text-xs">Позывной: <strong>{unit.callsign}</strong></div>
                  <div className="text-[11px] text-slate-500">База: {unit.base_station}</div>
                  <div className="text-[11px] text-slate-700 font-semibold">
                    Пункт назначения: <strong className="text-blue-700">{unit.target_name || 'Рубеж перехвата'}</strong>
                  </div>
                  <div className="text-xs text-slate-600">Экипаж: {unit.personnel_count} чел. | Топливо: {unit.fuel_percent}%</div>
                  {unit.water_capacity_l && (
                    <div className="text-xs text-blue-700 font-semibold">Вода: {unit.water_current_l || unit.water_capacity_l} л</div>
                  )}
                  <div className="text-xs font-bold text-blue-800 pt-1 border-t border-slate-100">
                    Статус: {unit.status === 'EN_ROUTE' ? `В пути (Скорость ${unit.speed_kmh} км/ч • ETA ${unit.eta_minutes} мин)` : 'В дежурстве'}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        </MapContainer>

        {/* Floating Top-Left: Weather & Wind HUD */}
        {weather && (
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-2xl p-3 text-xs text-slate-800 shadow-md z-[1000] flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 transition-transform duration-500"
              style={{ transform: `rotate(${windAngle}deg)` }}
              title={`Направление ветра: ${windAngle}°`}
            >
              <Navigation2 className="w-4 h-4 fill-blue-700" />
            </div>

            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase">Вектор ветра (Казгидромет)</div>
              <div className="font-bold text-slate-900 text-xs">
                {weather.wind_direction_label} • {weather.wind_speed_ms.toFixed(1)} м/с
              </div>
            </div>
          </div>
        )}

        {/* Floating Top-Right: Layer Toggle Bar */}
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-2xl p-1.5 text-xs text-slate-700 shadow-md z-[1000] flex items-center gap-1">
          <button
            onClick={() => setShowFireArea(!showFireArea)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              showFireArea ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            🔥 <span>Область горения</span>
          </button>

          <button
            onClick={() => setShowSmokePlume(!showSmokePlume)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              showSmokePlume ? 'bg-slate-100 text-slate-800 border border-slate-300' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            💨 <span>Задымление</span>
          </button>

          <button
            onClick={() => setShowUnits(!showUnits)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              showUnits ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            🚒 <span>Транспорт</span>
          </button>

          <button
            onClick={() => setShowBases(!showBases)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              showBases ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            🏢 <span>Базы и цели</span>
          </button>

          <button
            onClick={() => setShowRoutes(!showRoutes)}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              showRoutes ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            🛣 <span>Маршруты</span>
          </button>

          <button
            onClick={() => setShowLegend(!showLegend)}
            className={`p-1.5 rounded-xl text-[11px] transition-all cursor-pointer ${
              showLegend ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-700'
            }`}
            title="Условные знаки"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Bottom-Right: Clean Legend */}
        {showLegend && (
          <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-2xl p-3 text-xs text-slate-700 shadow-lg z-[1000] max-w-[260px] space-y-2 pointer-events-auto">
            <div className="font-bold text-[11px] text-slate-900 uppercase tracking-wide flex items-center justify-between border-b border-slate-100 pb-1">
              <span>Тактические обозначения</span>
              <Info className="w-3.5 h-3.5 text-blue-700" />
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-600 border border-white flex items-center justify-center text-[7px]">🔥</span>
                <span>Эпицентр очага (Кв. 45)</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-3.5 h-2 rounded bg-gradient-to-r from-red-600 to-amber-500" />
                <span>Область теплового фронта (24.5 га)</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-3.5 h-2 rounded bg-slate-400/40" />
                <span>Шлейф задымления (PM2.5)</span>
              </div>

              <div className="flex items-center gap-2">
                <span>🏢</span>
                <span>Точки старта (Базы ПЧ-4, Авиабаза)</span>
              </div>

              <div className="flex items-center gap-2">
                <span>🎯</span>
                <span>Пункты назначения (Рубежи перехвата)</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white flex items-center justify-center text-[7px]">🚒</span>
                <span>Транспорт МЧС на маршруте</span>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

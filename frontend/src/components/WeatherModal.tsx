import React, { useState } from 'react';
import { 
  X, 
  Wind, 
  Thermometer, 
  Droplets, 
  Gauge, 
  Sliders, 
  RefreshCw
} from 'lucide-react';
import type { WeatherData } from '../types';

interface WeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  weather: WeatherData | null;
  onUpdateWeather: (windSpeed: number, windDir: number, temp: number, humidity: number) => void;
}

export const WeatherModal: React.FC<WeatherModalProps> = ({
  isOpen,
  onClose,
  weather,
  onUpdateWeather
}) => {
  // Хуки до раннего выхода — иначе нарушаются правила хуков при закрытой модалке
  const [windSpeed, setWindSpeed] = useState<number>(weather?.wind_speed_ms ?? 0);
  const [windDir, setWindDir] = useState<number>(weather?.wind_direction_deg ?? 0);
  const [temp, setTemp] = useState<number>(weather?.temperature_c ?? 0);
  const [humidity, setHumidity] = useState<number>(weather?.humidity_percent ?? 0);

  if (!isOpen || !weather) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateWeather(windSpeed, windDir, temp, humidity);
    onClose();
  };

  const getDirectionName = (deg: number) => {
    if (deg >= 337.5 || deg < 22.5) return 'Северный (N)';
    if (deg >= 22.5 && deg < 67.5) return 'Северо-Восточный (NE)';
    if (deg >= 67.5 && deg < 112.5) return 'Восточный (E)';
    if (deg >= 112.5 && deg < 157.5) return 'Юго-Восточный (SE)';
    if (deg >= 157.5 && deg < 202.5) return 'Южный (S)';
    if (deg >= 202.5 && deg < 247.5) return 'Юго-Западный (SW)';
    if (deg >= 247.5 && deg < 292.5) return 'Западный (W)';
    return 'Северо-Западный (NW)';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl relative">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Метеорологические параметры
            </h3>
            <p className="text-xs text-slate-500">
              Казгидромет • Модель Ротермела
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Wind Speed */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-blue-700">
                <Wind className="w-3.5 h-3.5" /> Скорость ветра:
              </span>
              <span className="font-mono text-slate-900 text-xs font-bold">
                {windSpeed.toFixed(1)} м/с
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="25"
              step="0.5"
              value={windSpeed}
              onChange={(e) => setWindSpeed(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Wind Direction */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-amber-700">
                <Gauge className="w-3.5 h-3.5" /> Направление ветра:
              </span>
              <span className="font-mono text-slate-900 text-xs font-bold">
                {windDir}° ({getDirectionName(windDir)})
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="359"
              step="5"
              value={windDir}
              onChange={(e) => setWindDir(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
          </div>

          {/* Temperature */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-rose-700">
                <Thermometer className="w-3.5 h-3.5" /> Температура воздуха:
              </span>
              <span className="font-mono text-slate-900 text-xs font-bold">
                {temp.toFixed(1)}°C
              </span>
            </div>
            <input
              type="range"
              min="15"
              max="45"
              step="1"
              value={temp}
              onChange={(e) => setTemp(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-600"
            />
          </div>

          {/* Humidity */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-cyan-700">
                <Droplets className="w-3.5 h-3.5" /> Влажность воздуха:
              </span>
              <span className="font-mono text-slate-900 text-xs font-bold">
                {humidity.toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="90"
              step="1"
              value={humidity}
              onChange={(e) => setHumidity(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-cyan-600"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#1e3a5f] hover:bg-[#162d4a] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Пересчитать модель</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

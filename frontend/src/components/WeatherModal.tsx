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
  if (!isOpen || !weather) return null;

  const [windSpeed, setWindSpeed] = useState<number>(weather.wind_speed_ms);
  const [windDir, setWindDir] = useState<number>(weather.wind_direction_deg);
  const [temp, setTemp] = useState<number>(weather.temperature_c);
  const [humidity, setHumidity] = useState<number>(weather.humidity_percent);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-md bg-[#131d31] rounded-lg border border-[#2a3a5a] p-5 shadow-2xl relative">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded bg-[#1e2e48] hover:bg-[#283d60] text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2.5 mb-4 pb-2.5 border-b border-[#233350]">
          <div className="p-2 rounded bg-[#1c2e4f] text-sky-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Метеорологические параметры (Казгидромет)
            </h3>
            <p className="text-xs text-slate-400">
              Расчетная модель распространения огня Ротермела
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          
          {/* Wind Speed */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-sky-300">
                <Wind className="w-3.5 h-3.5" /> Скорость ветра:
              </span>
              <span className="font-mono text-white text-xs font-bold">
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
              className="w-full h-1.5 bg-[#0e1728] rounded appearance-none cursor-pointer accent-[#0284c7]"
            />
          </div>

          {/* Wind Direction */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-amber-300">
                <Gauge className="w-3.5 h-3.5" /> Направление ветра:
              </span>
              <span className="font-mono text-white text-xs font-bold">
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
              className="w-full h-1.5 bg-[#0e1728] rounded appearance-none cursor-pointer accent-[#d97706]"
            />
          </div>

          {/* Temperature */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-red-300">
                <Thermometer className="w-3.5 h-3.5" /> Температура воздуха:
              </span>
              <span className="font-mono text-white text-xs font-bold">
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
              className="w-full h-1.5 bg-[#0e1728] rounded appearance-none cursor-pointer accent-[#dc2626]"
            />
          </div>

          {/* Humidity */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-blue-300">
                <Droplets className="w-3.5 h-3.5" /> Влажность воздуха:
              </span>
              <span className="font-mono text-white text-xs font-bold">
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
              className="w-full h-1.5 bg-[#0e1728] rounded appearance-none cursor-pointer accent-[#2563eb]"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#233350]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded bg-[#1e2e48] hover:bg-[#283d60] text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Пересчитать модель распространения</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

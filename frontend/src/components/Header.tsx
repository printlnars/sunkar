import React from 'react';
import { 
  ShieldAlert, 
  Wind, 
  Thermometer, 
  Droplets, 
  RotateCcw, 
  Sliders, 
  MapPin,
  Flame
} from 'lucide-react';
import type { WeatherData } from '../types';

interface HeaderProps {
  weather: WeatherData | null;
  onResetScenario: () => void;
  onOpenWeatherModal: () => void;
  isConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  weather,
  onResetScenario,
  onOpenWeatherModal,
  isConnected
}) => {
  return (
    <header className="w-full bg-[#0c1527] border-b border-[#1f2e4d] px-5 py-3 sticky top-0 z-40 shadow-md">
      <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand & Governmental Identity */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-[#142340] border border-[#2b426f] shadow-inner text-amber-400">
            <Flame className="w-6 h-6 text-amber-400" />
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-white tracking-wide">
                СҰҢҚАР AI
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#1b3158] text-[#7dd3fc] border border-[#2d4d87]">
                МЧС РК • Ситуационный центр лесопожарного мониторинга
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              <span>Абайская область • ГЛПР «Семей орманы» (Бородулихинский район)</span>
            </div>
          </div>
        </div>

        {/* Live Weather Overview Cards (Kazhydromet) */}
        {weather && (
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#142036] border border-[#233454] text-xs">
              <Thermometer className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[10px] text-slate-400">Температура</div>
                <div className="font-semibold text-white">{weather.temperature_c.toFixed(1)}°C</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#142036] border border-[#233454] text-xs">
              <Wind className="w-4 h-4 text-sky-400" />
              <div>
                <div className="text-[10px] text-slate-400">Ветер ({weather.wind_direction_label})</div>
                <div className="font-semibold text-white">{weather.wind_speed_ms.toFixed(1)} м/с</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#142036] border border-[#233454] text-xs">
              <Droplets className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-[10px] text-slate-400">Влажность</div>
                <div className="font-semibold text-white">{weather.humidity_percent.toFixed(0)}%</div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2a1318] border border-[#7f1d1d] text-xs">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <div>
                <div className="text-[10px] text-red-300">Класс пожарной опасности</div>
                <div className="font-bold text-red-400">V (Чрезвычайная)</div>
              </div>
            </div>
          </div>
        )}

        {/* System Status & Actions */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#142036] border border-[#233454] text-xs">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="text-slate-300 font-medium">Видеоаналитика: 30 FPS</span>
          </div>

          <button
            onClick={onOpenWeatherModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#142036] hover:bg-[#1a2b48] text-slate-200 border border-[#2b3e64] text-xs font-medium transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>Метеопараметры</span>
          </button>

          <button
            onClick={onResetScenario}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Демо: Семей орманы</span>
          </button>
        </div>

      </div>
    </header>
  );
};

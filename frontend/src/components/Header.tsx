import React from 'react';
import { 
  ShieldAlert, 
  Wind, 
  Thermometer, 
  Droplets, 
  RotateCcw, 
  Sliders, 
  Search,
  Bell,
  ChevronDown,
  Menu
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
    <header className="w-full bg-[#1e3a5f] text-white px-5 py-2.5 sticky top-0 z-40 shadow-md">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-4">
        
        {/* Left Section: Menu + Search Bar + Section Title */}
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <button className="p-2 rounded-lg bg-[#274975] hover:bg-[#31588c] text-white transition-colors cursor-pointer">
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Поиск по квадрантам, камерам, расчетам..." 
              className="w-full pl-9 pr-12 py-1.5 rounded-lg bg-white text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 shadow-sm"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              ⌘K
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-white font-semibold text-sm">
            <span>Ситуационный центр</span>
            <span className="text-[10px] font-medium bg-[#294c7a] px-2 py-0.5 rounded-md text-sky-200 border border-sky-400/20">
              Семей орманы
            </span>
          </div>
        </div>

        {/* Center/Weather Badges */}
        {weather && (
          <div className="hidden xl:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#162d4a] border border-[#2d4e78] text-xs">
              <Thermometer className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-semibold text-slate-100">{weather.temperature_c.toFixed(1)}°C</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#162d4a] border border-[#2d4e78] text-xs">
              <Wind className="w-3.5 h-3.5 text-sky-300" />
              <span className="font-semibold text-slate-100">{weather.wind_speed_ms.toFixed(1)} м/с</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#162d4a] border border-[#2d4e78] text-xs">
              <Droplets className="w-3.5 h-3.5 text-cyan-300" />
              <span className="font-semibold text-slate-100">{weather.humidity_percent.toFixed(0)}%</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-900/60 border border-rose-500/40 text-xs">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-300" />
              <span className="font-bold text-rose-200">V класс</span>
            </div>
          </div>
        )}

        {/* Right Section: Actions & User Avatar Profile */}
        <div className="flex items-center gap-3">
          
          <button
            onClick={onOpenWeatherModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#274975] hover:bg-[#31588c] text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-sky-300" />
            <span className="hidden md:inline">Метеопараметры</span>
          </button>

          <button
            onClick={onResetScenario}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] active:scale-[0.98] text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Демо-сценарий</span>
          </button>

          {/* Notification Bell with connection indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#162d4a] text-xs">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-[11px] text-slate-300 font-medium hidden md:inline">30 FPS</span>
          </div>

          <button className="relative p-2 rounded-full bg-[#274975] hover:bg-[#31588c] text-white transition-colors cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
          </button>

          {/* User Profile Info (Shakarim Style) */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-[#2d4e78]">
            <div className="w-8 h-8 rounded-full bg-slate-300 border border-white flex items-center justify-center text-slate-700 font-bold text-xs">
              АӘ
            </div>
            <div className="hidden sm:flex items-center gap-1 cursor-pointer">
              <span className="text-xs font-semibold text-white">Арғын А. Ә.</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};

import React from 'react';
import { 
  Truck, 
  Plane, 
  Users, 
  Droplets, 
  Fuel, 
  Gauge, 
  ListOrdered
} from 'lucide-react';
import type { EmergencyUnit, Incident } from '../types';

interface ResourcePanelProps {
  units: EmergencyUnit[];
  incident: Incident | null;
}

export const ResourcePanel: React.FC<ResourcePanelProps> = ({
  units,
  incident
}) => {
  return (
    <div className="flex flex-col gap-3 h-full">
      
      {/* Fleet & Crew Management Box */}
      <div className="mchs-card rounded-lg p-3.5 shadow-md">
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-[#233350]">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wide">
              Силы и средства МЧС РК
            </h3>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#1b2d4b] text-sky-300 border border-[#2b4470]">
            {units.length} единицы на связи
          </span>
        </div>

        <div className="space-y-2">
          {units.map((unit) => {
            const isDispatched = unit.status === 'EN_ROUTE' || unit.status === 'ON_SITE';

            return (
              <div
                key={unit.id}
                className={`p-2.5 rounded border transition-colors ${
                  isDispatched 
                    ? 'bg-[#12281d] border-[#166534]' 
                    : 'bg-[#10192a] border-[#202f4a]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-[#18263e] text-slate-200">
                      {unit.unit_type === 'HELICOPTER_MI8' ? (
                        <Plane className="w-4 h-4 text-sky-400" />
                      ) : unit.unit_type === 'HEAVY_BULLDOZER' ? (
                        <Truck className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Truck className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {unit.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Позывной: <strong className="text-sky-300">{unit.callsign}</strong> • {unit.base_station}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    isDispatched 
                      ? 'bg-[#166534] text-emerald-200' 
                      : 'bg-[#1e2e48] text-slate-300'
                  }`}>
                    {isDispatched ? `В ПУТИ (${unit.eta_minutes || 18} мин)` : 'ДЕЖУРСТВО'}
                  </span>
                </div>

                {/* Telemetry info row */}
                <div className="grid grid-cols-4 gap-1.5 pt-1.5 border-t border-[#1c2a42] text-[10px] text-slate-300">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-400" />
                    <span><strong>{unit.personnel_count}</strong> чел.</span>
                  </div>

                  {unit.water_capacity_l && (
                    <div className="flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-blue-400" />
                      <span><strong>{unit.water_current_l || unit.water_capacity_l}</strong> л</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <Fuel className="w-3 h-3 text-amber-400" />
                    <span>Топливо: <strong>{unit.fuel_percent}%</strong></span>
                  </div>

                  <div className="flex items-center gap-1 font-mono text-sky-300 font-bold">
                    <Gauge className="w-3 h-3" />
                    <span>{unit.speed_kmh.toFixed(0)} км/ч</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Incident Event Stream */}
      <div className="mchs-card rounded-lg p-3.5 shadow-md flex-1 flex flex-col min-h-[160px]">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#233350]">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wide">
              Журнал оперативных событий
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            АУДИТ
          </span>
        </div>

        <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 text-xs">
          {incident?.telemetry_log.map((log, index) => (
            <div 
              key={index}
              className="flex items-start gap-2 p-1.5 rounded bg-[#10192a] border border-[#1f2e48] text-slate-300"
            >
              <span className="text-sky-400 font-bold whitespace-nowrap text-[10px] font-mono">
                [{log.time}]
              </span>
              <span className="text-slate-200 leading-snug text-xs">
                {log.event}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

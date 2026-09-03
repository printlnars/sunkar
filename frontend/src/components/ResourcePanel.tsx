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
    <div className="flex flex-col gap-3.5 h-full">
      
      {/* Fleet & Crew Management Box */}
      <div className="hub-card p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Силы и средства МЧС РК
            </h3>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
            {units.length} единицы на связи
          </span>
        </div>

        <div className="space-y-2.5">
          {units.map((unit) => {
            const isDispatched = unit.status === 'EN_ROUTE' || unit.status === 'ON_SITE';

            return (
              <div
                key={unit.id}
                className={`p-3 rounded-xl border transition-all duration-200 ${
                  isDispatched 
                    ? 'bg-emerald-50/50 border-emerald-200' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-white text-slate-700 border border-slate-200 shadow-xs">
                      {unit.unit_type === 'HELICOPTER_MI8' ? (
                        <Plane className="w-4 h-4 text-sky-600" />
                      ) : unit.unit_type === 'HEAVY_BULLDOZER' ? (
                        <Truck className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Truck className="w-4 h-4 text-rose-600" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {unit.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Позывной: <strong className="text-slate-800">{unit.callsign}</strong> • {unit.base_station}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    isDispatched 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {isDispatched ? `В ПУТИ (${unit.eta_minutes || 18} мин)` : 'ДЕЖУРСТВО'}
                  </span>
                </div>

                {/* Telemetry info row */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-600">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-slate-400" />
                    <span><strong>{unit.personnel_count}</strong> чел.</span>
                  </div>

                  {unit.water_capacity_l && (
                    <div className="flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-blue-600" />
                      <span><strong>{unit.water_current_l || unit.water_capacity_l}</strong> л</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <Fuel className="w-3 h-3 text-amber-600" />
                    <span>Топливо: <strong>{unit.fuel_percent}%</strong></span>
                  </div>

                  <div className="flex items-center gap-1 font-mono text-blue-700 font-bold">
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
      <div className="hub-card p-4 shadow-xs flex-1 flex flex-col min-h-[160px]">
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-blue-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Журнал оперативных событий
            </h3>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            АУДИТ
          </span>
        </div>

        <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 text-xs max-h-[180px]">
          {incident?.telemetry_log.map((log, index) => (
            <div 
              key={index}
              className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 hover:border-slate-300 transition-colors"
            >
              <span className="text-blue-700 font-bold whitespace-nowrap text-[10px] font-mono">
                [{log.time}]
              </span>
              <span className="text-slate-800 leading-snug text-xs">
                {log.event}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

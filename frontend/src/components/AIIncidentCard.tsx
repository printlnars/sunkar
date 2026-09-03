import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Send,
  Flame,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  Truck,
  FileText
} from 'lucide-react';
import type { Incident } from '../types';

interface AIIncidentCardProps {
  incident: Incident | null;
  onApproveDispatch: () => void;
  isApproving: boolean;
}

export const AIIncidentCard: React.FC<AIIncidentCardProps> = ({
  incident,
  onApproveDispatch,
  isApproving
}) => {
  const [countdown, setCountdown] = useState<number>(42 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!incident) {
    return (
      <div className="hub-card p-6 flex items-center justify-center min-h-[220px] text-slate-500">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-2.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="font-bold text-sm text-slate-800">Сектор находится в безопасности</h3>
          <p className="text-xs text-slate-500 mt-0.5">Активных очагов и задымлений не обнаружено</p>
        </div>
      </div>
    );
  }

  const isApproved = incident.dispatch_plan.approved;

  return (
    <div className={`overflow-hidden transition-all duration-300 ${
      isApproved ? 'hub-card-success' : 'hub-card-danger'
    }`}>
      
      {/* 1. Header Banner */}
      <div className={`px-5 py-3.5 flex items-center justify-between border-b ${
        isApproved 
          ? 'bg-emerald-50/80 border-emerald-200' 
          : 'bg-rose-50/80 border-rose-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            isApproved 
              ? 'bg-emerald-600 text-white shadow-sm' 
              : 'bg-rose-600 text-white shadow-sm'
          }`}>
            {isApproved ? <ShieldCheck className="w-5 h-5" /> : <Flame className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                isApproved 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}>
                {isApproved ? 'ПЛАН ПЕРЕХВАТА УТВЕРЖДЕН' : '🚨 ТРЕБУЕТСЯ СОГЛАСОВАНИЕ'}
              </span>
              <span className="text-xs font-mono font-medium text-slate-500">
                №{incident.id}
              </span>
            </div>
            <h2 className="text-xs font-bold text-slate-900 mt-1">
              Очаг: {incident.location_name}
            </h2>
          </div>
        </div>

        {/* Threat Countdown Clock */}
        <div className="text-right bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center justify-end gap-1">
            <Clock className="w-3 h-3 text-rose-600" />
            До с. Бородулиха:
          </div>
          <div className="text-lg font-bold font-mono text-rose-600">
            {formatCountdown(countdown)}
          </div>
        </div>
      </div>

      {/* 2. Structured Decision Information Blocks */}
      <div className="p-4 bg-white space-y-3">
        
        {/* 3 Clear Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          
          {/* Block 1: Местоположение */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-blue-700 font-bold text-[11px] uppercase mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Локализация</span>
            </div>
            <div className="text-xs font-bold text-slate-800">
              Квадрат 45 (Семей орманы)
            </div>
            <div className="text-[11px] text-slate-600 mt-1">
              Площадь: ~<strong>2 450 м²</strong>
            </div>
          </div>

          {/* Block 2: Угроза */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-amber-700 font-bold text-[11px] uppercase mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Вектор угрозы</span>
            </div>
            <div className="text-xs font-bold text-slate-800">
              Вектор: с. Бородулиха
            </div>
            <div className="text-[11px] text-amber-800 mt-1">
              Ветер 7.4 м/с • До домов 42 мин
            </div>
          </div>

          {/* Block 3: Назначенные силы */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px] uppercase mb-1">
              <Truck className="w-3.5 h-3.5" />
              <span>Силы перехвата</span>
            </div>
            <div className="text-xs font-bold text-slate-800">
              ПЧ-4, ПЧ-7, Борт Ми-8
            </div>
            <div className="text-[11px] text-emerald-800 mt-1">
              Маршрут: Сев. просека №2
            </div>
          </div>

        </div>

        {/* Operational Directive Narrative */}
        <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-xs text-slate-700 leading-relaxed">
          <div className="flex items-center gap-1.5 text-blue-900 font-bold uppercase text-[10px] tracking-wider mb-1">
            <FileText className="w-3.5 h-3.5" />
            <span>Рекомендация ИИ-диспетчера:</span>
          </div>
          <p className="text-slate-700">
            {incident.dispatch_plan.ai_verdict}
          </p>
        </div>

      </div>

      {/* 3. The Dispatch Action Button */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200">
        {!isApproved ? (
          <button
            onClick={onApproveDispatch}
            disabled={isApproving}
            className="w-full py-3 px-5 rounded-xl bg-[#059669] hover:bg-[#047857] active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>УТВЕРДИТЬ ПЛАН ПЕРЕХВАТА И НАПРАВИТЬ СИЛЫ МЧС</span>
          </button>
        ) : (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Оперативный план перехвата утвержден
                </div>
                <div className="text-[10px] text-emerald-800">
                  Маршруты переданы в ПЧ-4, ПЧ-7 и экипаж Ми-8
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-[#059669] text-white px-2.5 py-1 rounded-lg">
              ТЕХНИКА В ПУТИ
            </span>
          </div>
        )}
      </div>

    </div>
  );
};

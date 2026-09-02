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
      <div className="mchs-card p-6 rounded-lg flex items-center justify-center min-h-[260px] text-slate-400">
        <div className="text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="font-bold text-base text-slate-200">Сектор безопасен</h3>
          <p className="text-xs text-slate-400">Активных очагов возгорания не обнаружено</p>
        </div>
      </div>
    );
  }

  const isApproved = incident.dispatch_plan.approved;

  return (
    <div className={`rounded-lg overflow-hidden transition-all shadow-md ${
      isApproved ? 'mchs-card-success' : 'mchs-card-danger'
    }`}>
      
      {/* 1. Official Header Banner */}
      <div className={`px-5 py-3.5 flex items-center justify-between border-b ${
        isApproved 
          ? 'bg-[#0f241a] border-[#166534]' 
          : 'bg-[#2a1216] border-[#7f1d1d]'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded ${
            isApproved ? 'bg-[#166534] text-white' : 'bg-[#dc2626] text-white'
          }`}>
            {isApproved ? <ShieldCheck className="w-5 h-5" /> : <Flame className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
                isApproved 
                  ? 'bg-[#166534] text-emerald-200' 
                  : 'bg-[#dc2626] text-white'
              }`}>
                {isApproved ? 'ПЛАН ПЕРЕХВАТА ВВЕДЁН В ДЕЙСТВИЕ' : '🚨 КРИТИЧЕСКИЙ УРОВЕНЬ УГРОЗЫ'}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Карточка #{incident.id}
              </span>
            </div>
            <h2 className="text-sm font-bold text-white mt-1">
              Очаг возгорания: {incident.location_name}
            </h2>
          </div>
        </div>

        {/* Threat Countdown Clock */}
        <div className="text-right bg-[#0f172a] px-3.5 py-1.5 rounded border border-[#334155]">
          <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold flex items-center justify-end gap-1">
            <Clock className="w-3.5 h-3.5 text-red-400" />
            До с. Бородулиха:
          </div>
          <div className="text-xl font-bold font-mono text-red-400">
            {formatCountdown(countdown)}
          </div>
        </div>
      </div>

      {/* 2. Structured & Clear Decision Blocks */}
      <div className="p-4 space-y-3">
        
        {/* 3 Clear Columns: Где / Угроза / Решение ИИ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          
          {/* Block 1: Местоположение */}
          <div className="p-3 rounded bg-[#10192b] border border-[#223352] flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-sky-400 font-bold text-xs uppercase mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Локализация очага</span>
            </div>
            <div className="text-xs font-bold text-white">
              Квадрат 45 (Семей орманы)
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Площадь: ~<strong>2 450 м²</strong> (хвойный лес)
            </div>
          </div>

          {/* Block 2: Угроза */}
          <div className="p-3 rounded bg-[#10192b] border border-[#223352] flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs uppercase mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Вектор угрозы</span>
            </div>
            <div className="text-xs font-bold text-white">
              Направление: с. Бородулиха
            </div>
            <div className="text-[11px] text-amber-300 mt-1">
              Ветер 7.4 м/с • До домов 42 мин
            </div>
          </div>

          {/* Block 3: Назначенные силы */}
          <div className="p-3 rounded bg-[#10192b] border border-[#223352] flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase mb-1">
              <Truck className="w-3.5 h-3.5" />
              <span>Силы перехвата</span>
            </div>
            <div className="text-xs font-bold text-white">
              ПЧ-4, ПЧ-7, Борт Ми-8
            </div>
            <div className="text-[11px] text-emerald-300 mt-1">
              Маршрут: Северная просека №2
            </div>
          </div>

        </div>

        {/* Operational Directive Narrative */}
        <div className="p-3 rounded bg-[#0b1220] border border-[#1f2d47] text-xs text-slate-200 leading-relaxed">
          <div className="flex items-center gap-1.5 text-sky-400 font-bold uppercase text-[11px] mb-1">
            <FileText className="w-3.5 h-3.5" />
            <span>Оперативная сводка и рекомендация ИИ-диспетчера:</span>
          </div>
          <p className="text-slate-200">
            {incident.dispatch_plan.ai_verdict}
          </p>
        </div>

      </div>

      {/* 3. The Dispatch Action Button */}
      <div className="p-4 bg-[#0c1424] border-t border-[#1e2d48]">
        {!isApproved ? (
          <button
            onClick={onApproveDispatch}
            disabled={isApproving}
            className="w-full py-3.5 px-6 rounded bg-[#dc2626] hover:bg-[#b91c1c] active:scale-[0.99] text-white font-bold text-sm uppercase tracking-wide shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>УТВЕРДИТЬ ПЛАН ПЕРЕХВАТА И НАПРАВИТЬ СИЛЫ МЧС</span>
          </button>
        ) : (
          <div className="flex items-center justify-between p-3 rounded bg-[#142e22] border border-[#166534] text-emerald-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-white">
                  Оперативный план перехвата утвержден
                </div>
                <div className="text-[11px] text-emerald-300">
                  Маршруты переданы в расчеты МЧС №4, №7 и экипажу вертолета Ми-8
                </div>
              </div>
            </div>
            <span className="text-xs font-mono font-bold bg-[#166534] text-white px-2.5 py-1 rounded">
              ТЕХНИКА В ПУТИ
            </span>
          </div>
        )}
      </div>

    </div>
  );
};

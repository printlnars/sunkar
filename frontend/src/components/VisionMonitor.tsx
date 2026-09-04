import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, 
  Camera,
  Upload,
  Radio,
  Video as VideoIcon
} from 'lucide-react';
import type { CameraFeed } from '../types';
import { getAssignedMedia, resolveDroneMedia, looksLikeVideo } from '../droneMedia';
import { DroneMedia } from './DroneMedia';

interface DetectionBox {
  label: string; // 'smoke' | 'fire' (YOLOv8n, D-Fire)
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TimelineSample {
  t: number; // секунды в видео
  boxes: DetectionBox[];
}

export interface FireAlertInfo {
  cameraId: string;
  cameraName: string;
  locationName: string;
  confidence: number;
  time?: number | null;
}

interface VisionMonitorProps {
  activeCamera: CameraFeed | null;
  availableCameras: CameraFeed[];
  onSelectCamera: (cameraId: string) => void;
  /** Вызывается при подтверждённом срабатывании «пожар» по таймлайну борта. */
  onFireDetected?: (alert: FireAlertInfo) => void;
  /** Открыть окно загрузки видео для активного борта (модал живёт на уровне App). */
  onRequestUpload?: () => void;
  /** Актуальные видеопотоки бортов с сервера (операторская загрузка > файл по умолчанию). */
  serverMedia?: Record<string, string>;
}

interface AnalysisState {
  status: 'idle' | 'analyzing' | 'ready' | 'missing' | 'error';
  progress: number;
  message?: string;
  modelName?: string;
  modelDataset?: string;
  timeline: TimelineSample[];
}

// Пожар по конкретному файлу борта сигналим оператору один раз за сессию
// (пока не загружен новый файл или не обновлена страница)
const fireAlertNotified = new Set<string>();

export const VisionMonitor: React.FC<VisionMonitorProps> = ({
  activeCamera,
  availableCameras,
  onSelectCamera,
  onFireDetected,
  onRequestUpload,
  serverMedia
}) => {
  const [visionMode, setVisionMode] = useState<'RGB' | 'THERMAL' | 'CUSTOM_MEDIA'>(() =>
    looksLikeVideo(resolveDroneMedia(activeCamera?.id)) ? 'CUSTOM_MEDIA' : 'RGB'
  );
  const [customMediaUrl, setCustomMediaUrl] = useState<string>(() => resolveDroneMedia(activeCamera?.id));
  const [customMediaIsVideo, setCustomMediaIsVideo] = useState<boolean>(() => looksLikeVideo(resolveDroneMedia(activeCamera?.id)));

  // Реальная детекция YOLOv8n (дым/огонь) по видео БПЛА
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: 'idle', progress: 0, timeline: [] });
  const [currentBoxes, setCurrentBoxes] = useState<DetectionBox[]>([]);

  // Анализ доступен только для штатного видео БПЛА, раздаваемого из /videos/.
  // Для произвольных загруженных файлов таймлайн модели не строится — боксы не рисуем.
  const videoFeedActive =
    visionMode === 'CUSTOM_MEDIA' && customMediaIsVideo && customMediaUrl.startsWith('/videos/');

  // Опрос бэкенда: анализ идёт в фоне, после готовности таймлайн отдаётся целиком.
  useEffect(() => {
    setCurrentBoxes([]);
    if (!videoFeedActive || !activeCamera?.id) {
      setAnalysis({ status: 'idle', progress: 0, timeline: [] });
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    // missing/error повторяем с паузой — видео может ещё доливаться на диск,
    // а backend перезапускаться. Сдаёмся только после MAX_RETRIES попыток.
    const MAX_RETRIES = 10;
    const RETRY_DELAY_MS = 4000;

    const poll = async (attempt: number) => {
      try {
        const res = await fetch(`/api/vision/analysis/${activeCamera.id}`);
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        if (data.state === 'ready') {
          setAnalysis({
            status: 'ready',
            progress: 1,
            message: data.message,
            modelName: data.model?.name,
            modelDataset: data.model?.dataset,
            timeline: data.timeline ?? [],
          });

          // Пожар подтверждён моделью по видео борта → уведомление оператору (1 раз на файл)
          const summary = data.detection_summary;
          if (summary?.has_fire && onFireDetected) {
            const alertKey = `${activeCamera.id}:${customMediaUrl}`;
            if (!fireAlertNotified.has(alertKey)) {
              fireAlertNotified.add(alertKey);
              onFireDetected({
                cameraId: activeCamera.id,
                cameraName: activeCamera.name,
                locationName: activeCamera.location_name,
                confidence: summary.best_fire_confidence ?? 0,
                time: summary.best_fire_t,
              });
            }
          }
          return; // больше не опрашиваем
        }
        if (data.state === 'analyzing' || data.state === 'starting') {
          setAnalysis({
            status: 'analyzing',
            progress: data.progress ?? 0,
            message: data.message,
            timeline: [],
          });
          timer = window.setTimeout(() => poll(0), 1200);
          return;
        }
        // missing / error — вероятно, файл ещё загружается или backend перезапускается
        const next = attempt + 1;
        if (next >= MAX_RETRIES) {
          setAnalysis({
            status: data.state === 'missing' ? 'missing' : 'error',
            progress: 0,
            message: data.message,
            timeline: [],
          });
          return;
        }
        setAnalysis({
          status: data.state === 'missing' ? 'missing' : 'error',
          progress: 0,
          message: data.message,
          timeline: [],
        });
        timer = window.setTimeout(() => poll(next), RETRY_DELAY_MS);
      } catch {
        if (cancelled) return;
        const next = attempt + 1;
        if (next >= MAX_RETRIES) {
          setAnalysis({
            status: 'error',
            progress: 0,
            message: 'AI-сервис недоступен (запустите backend)',
            timeline: [],
          });
          return;
        }
        timer = window.setTimeout(() => poll(next), RETRY_DELAY_MS);
      }
    };

    poll(0);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [videoFeedActive, activeCamera?.id, customMediaUrl, serverMedia]);

  // Синхронизация боксов с текущим временем видео (video.currentTime → ближайший сэмпл).
  useEffect(() => {
    if (analysis.status !== 'ready' || analysis.timeline.length === 0) {
      setCurrentBoxes([]);
      return;
    }

    const timeline = analysis.timeline;
    let idx = 0;
    let prevKey = '';
    let raf = 0;

    const step = () => {
      const t = videoRef.current?.currentTime ?? 0;
      // идём вперёд по сэмплам, при перемотке/лупе — назад
      while (idx < timeline.length - 1 && timeline[idx + 1].t <= t + 0.1) idx++;
      while (idx > 0 && timeline[idx].t > t + 0.35) idx--;

      const sample = timeline[idx];
      const boxes = sample && sample.t <= t + 0.35 ? sample.boxes : [];
      const key = boxes.map((b) => `${b.label}:${b.confidence}:${b.x}:${b.y}`).join('|');
      if (key !== prevKey) {
        prevKey = key;
        setCurrentBoxes(boxes);
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [analysis.status, analysis.timeline]);

  const aiStatusLabel = (() => {
    if (!videoFeedActive) {
      return visionMode === 'CUSTOM_MEDIA'
        ? 'YOLOv8n-Fire (D-Fire): детекция по штатному видео БПЛА'
        : 'Симуляция канала (RGB/FLIR) — без ИИ-детекции';
    }
    if (analysis.status === 'ready') {
      return `${analysis.modelName ?? 'YOLOv8n-Fire'} (${analysis.modelDataset ?? 'D-Fire'}): ${
        currentBoxes.length > 0 ? `${currentBoxes.length} объект(ов) в кадре` : 'детекций в кадре нет'
      }`;
    }
    if (analysis.status === 'analyzing') {
      return `YOLOv8n-Fire: анализ видео ${Math.round(analysis.progress * 100)}%`;
    }
    if (analysis.status === 'missing') return `YOLOv8n-Fire: ${analysis.message || 'видео не загружено'}`;
    if (analysis.status === 'error') return `YOLOv8n-Fire: ${analysis.message || 'анализ недоступен (backend?)'}`;
    return 'YOLOv8n-Fire (D-Fire)';
  })();

  const aiStatusColor =
    analysis.status === 'ready' && currentBoxes.length > 0
      ? 'text-emerald-400'
      : analysis.status === 'analyzing'
        ? 'text-amber-400'
        : analysis.status === 'error' || analysis.status === 'missing'
          ? 'text-rose-400'
          : 'text-slate-400';

  // При выборе борта показываем его актуальный медиапоток:
  // операторская загрузка (с сервера) > назначенный файл по умолчанию.
  useEffect(() => {
    const id = activeCamera?.id;
    if (!id) return;
    const url = serverMedia?.[id] ?? getAssignedMedia(id) ?? resolveDroneMedia(id);
    setCustomMediaUrl(url);
    setCustomMediaIsVideo(looksLikeVideo(url));
    if (looksLikeVideo(url)) setVisionMode('CUSTOM_MEDIA');
  }, [activeCamera?.id, serverMedia]);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Canvas-based real-time 4K / Thermal simulation
  useEffect(() => {
    if (visionMode === 'CUSTOM_MEDIA') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      time += 0.03;
      const width = canvas.width;
      const height = canvas.height;

      if (visionMode === 'THERMAL') {
        // FLIR Thermal infrared simulation
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#0c0717');
        bgGrad.addColorStop(0.5, '#220a26');
        bgGrad.addColorStop(1, '#090410');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Ground terrain contour lines
        ctx.strokeStyle = 'rgba(140, 50, 110, 0.35)';
        ctx.lineWidth = 1;
        for (let y = 40; y < height; y += 35) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.bezierCurveTo(width * 0.3, y + 10, width * 0.7, y - 10, width, y);
          ctx.stroke();
        }

        // Blazing White-Hot Core (750°C)
        const fireGrad = ctx.createRadialGradient(
          width * 0.55 + Math.sin(time * 2) * 4, 
          height * 0.58 + Math.cos(time * 2) * 3, 
          4, 
          width * 0.55, 
          height * 0.58, 
          85 + Math.sin(time * 3) * 10
        );
        fireGrad.addColorStop(0, '#ffffff');
        fireGrad.addColorStop(0.2, '#ffff44');
        fireGrad.addColorStop(0.45, '#ff4500');
        fireGrad.addColorStop(0.75, '#8b008b');
        fireGrad.addColorStop(1, 'rgba(30, 0, 40, 0)');
        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.arc(width * 0.55, height * 0.58, 90, 0, Math.PI * 2);
        ctx.fill();

        // Thermal Smoke Diffusion
        for (let i = 0; i < 16; i++) {
          const puffProgress = ((time * 0.8 + i * 0.25) % 3);
          const px = width * 0.53 + Math.sin(time + i) * 18 - puffProgress * 40;
          const py = height * 0.55 - puffProgress * 60;
          const pr = 16 + puffProgress * 28;
          const alpha = Math.max(0, 0.35 - puffProgress * 0.1);
          
          ctx.fillStyle = `rgba(180, 120, 220, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, pr, 0, Math.PI * 2);
          ctx.fill();
        }

      } else {
        // Optical RGB (Pine forest canopy and realistic smoke)
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.4);
        skyGrad.addColorStop(0, '#4b75a6');
        skyGrad.addColorStop(1, '#97b3d0');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height * 0.4);

        // Sun light haze
        ctx.fillStyle = 'rgba(255, 230, 180, 0.25)';
        ctx.beginPath();
        ctx.arc(width * 0.8, height * 0.15, 50, 0, Math.PI * 2);
        ctx.fill();

        // Pine Forest Canopy Background
        ctx.fillStyle = '#1c3321';
        ctx.fillRect(0, height * 0.35, width, height * 0.65);

        // Pine trees texture
        for (let i = 0; i < 40; i++) {
          const tx = (i * 24 + (i % 3) * 5) % width;
          const ty = height * 0.38 + (i % 7) * 25;
          const th = 28 + (i % 4) * 8;
          ctx.fillStyle = (i % 2 === 0) ? '#162e1c' : '#0f2214';
          ctx.beginPath();
          ctx.moveTo(tx, ty - th);
          ctx.lineTo(tx - 12, ty);
          ctx.lineTo(tx + 12, ty);
          ctx.closePath();
          ctx.fill();
        }

        // Dense Smoke Column
        for (let i = 0; i < 22; i++) {
          const progress = ((time * 0.7 + i * 0.2) % 4);
          const px = width * 0.52 + Math.sin(time * 1.5 + i) * 16 - progress * 32;
          const py = height * 0.58 - progress * 52;
          const pr = 14 + progress * 22;
          const alpha = Math.max(0, 0.45 - progress * 0.1);
          
          ctx.fillStyle = `rgba(165, 160, 155, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, pr, 0, Math.PI * 2);
          ctx.fill();
        }

        // Fire Core
        const flameGrad = ctx.createRadialGradient(
          width * 0.54, height * 0.62, 2,
          width * 0.54, height * 0.62, 20
        );
        flameGrad.addColorStop(0, '#ffffff');
        flameGrad.addColorStop(0.4, '#ff9900');
        flameGrad.addColorStop(0.8, '#ff3300');
        flameGrad.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.arc(width * 0.54, height * 0.62, 20, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [visionMode]);



  return (
    <div className="flex flex-col h-full hub-card overflow-hidden shadow-sm relative bg-slate-900 rounded-2xl">
      
      {/* 1. Top UAV Navigation Bar & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3 bg-white border-b border-slate-200 z-20 gap-3 shrink-0">
        
        {/* Active Board Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            <span>Прямой эфир БПЛА</span>
          </div>

          <div>
            <div className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
              <span>{activeCamera?.name || 'БПЛА «Альфа» (DJI Matrice 350 RTK)'}</span>
              <span className="px-2 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                ONLINE
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Сектор: {activeCamera?.location_name || 'Резерват «Семей орманы», Сектор 45'}
            </div>
          </div>
        </div>

        {/* Переключатель режимов канала и загрузка видео борта */}
        <div className="flex items-center gap-2">
          
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setVisionMode('RGB')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                visionMode === 'RGB'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              4K Оптическая
            </button>
            <button
              onClick={() => setVisionMode('THERMAL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                visionMode === 'THERMAL'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              FLIR Тепловизор
            </button>
            <button
              onClick={() => setVisionMode('CUSTOM_MEDIA')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                visionMode === 'CUSTOM_MEDIA'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <VideoIcon className="w-3.5 h-3.5" />
              Видеопоток
            </button>
          </div>

          {/* Загрузка видео на активный борт (окно открывается на уровне App) */}
          <button
            onClick={() => onRequestUpload?.()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 text-xs font-bold transition-colors cursor-pointer"
            title={`Загрузить видео для ${activeCamera?.name || 'борта'}: файл станет видеопотоком и будет проанализирован моделью`}
          >
            <Upload className="w-3.5 h-3.5 text-sky-700" />
            <span>Видео на борт</span>
          </button>

        </div>

      </div>        {/* 2. Main High-Tech Viewport with YOLOv8n Telemetry Overlay */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center min-h-[360px]">
        
        {/* Контент: видеопоток борта или симуляция канала */}
        {visionMode === 'CUSTOM_MEDIA' ? (
          <DroneMedia
            src={customMediaUrl}
            fallbackSrc="https://images.unsplash.com/photo-1602980085566-4c715cbd77e3?auto=format&fit=crop&w=1200&q=80"
            isVideo={customMediaIsVideo}
            mediaRef={videoRef}
            alt="БПЛА Видеопоток"
            className="w-full h-full object-cover"
          />
        ) : (
          <canvas 
            ref={canvasRef} 
            width={960} 
            height={540} 
            className="w-full h-full object-cover"
          />
        )}

        {/* Flight Telemetry HUD Overlay (Top-Left) */}
        <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 text-xs text-white font-mono space-y-1 shadow-lg pointer-events-none">
          <div className="flex items-center gap-2 font-bold text-sky-400">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>ТЕЛЕМЕТРИЯ БОРТА • MATRICE 350 RTK</span>
          </div>
          <div className="text-[11px] text-slate-300">
            Высота: <strong className="text-white">145 м</strong> | Скорость: <strong className="text-white">34.2 км/ч</strong> | Батарея: <strong className="text-emerald-400">88%</strong>
          </div>
          <div className="text-[11px] text-slate-300">
            Подвес: <strong className="text-white">-45.0° Pitch</strong> | Связь: <strong className="text-emerald-400">O3 Enterprise 100%</strong>
          </div>
          <div className="text-[11px] pt-1 border-t border-slate-700 flex items-center justify-between text-slate-300">
            <span>Нейросеть:</span>
            <strong className={`${aiStatusColor} font-bold text-right`}>{aiStatusLabel}</strong>
          </div>
        </div>

        {/* Center Target Reticle (Military Drone Style) */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
          <div className="w-24 h-24 border border-white/60 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white/80 rounded-full"></div>
          </div>
          <div className="absolute w-40 h-px bg-white/40"></div>
          <div className="absolute h-40 w-px bg-white/40"></div>
        </div>

        {/* Реальные детекции YOLOv8n (дым/огонь), синхронизированные с video.currentTime */}
        {currentBoxes.map((box, i) => {
          const isFire = box.label === 'fire';
          const border = isFire ? 'border-rose-500 bg-rose-500/15' : 'border-sky-400/80 bg-sky-400/10';
          const chip = isFire
            ? 'bg-rose-600 text-white'
            : 'bg-slate-800/90 text-sky-200 border border-sky-400/40';
          const label = isFire ? 'Пламя' : 'Дым';
          return (
            <div
              key={i}
              className={`absolute border-2 rounded-xl ${border} flex items-start p-1 pointer-events-none shadow-lg shadow-slate-950/40`}
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.w * 100}%`,
                height: `${box.h * 100}%`,
              }}
            >
              <div className={`${chip} font-bold text-[10px] px-2 py-0.5 rounded-md shadow-md self-start flex items-center gap-1`}>
                {isFire && <Flame className="w-3 h-3 animate-pulse" />}
                <span>{label}: {(box.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>
          );
        })}

        {/* Bottom Switch Indicator Badge */}
        {visionMode === 'CUSTOM_MEDIA' && (
          <div className="absolute bottom-4 right-4 bg-slate-900/85 backdrop-blur-md border border-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-2 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span>Поток: {customMediaUrl.split('/').pop()?.split('?')[0]}</span>
            <button
              onClick={() => onRequestUpload?.()}
              className="text-sky-400 hover:text-sky-200 underline text-[11px] cursor-pointer"
            >
              Заменить видео
            </button>
          </div>
        )}

      </div>

      {/* 3. Bottom Available Camera Sources Switcher Strip */}
      <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3 overflow-x-auto shrink-0">
        
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-blue-700" />
            Доступные БПЛА и камеры:
          </span>

          <div className="flex items-center gap-2">
            {availableCameras.map((cam) => {
              const isSelected = activeCamera?.id === cam.id;
              return (
                <button
                  key={cam.id}
                  onClick={() => onSelectCamera(cam.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 text-blue-900 border border-blue-300 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'}`} />
                  <span>{cam.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Upload Action */}
        <button
          onClick={() => onRequestUpload?.()}
          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Видео на борт</span>
        </button>

      </div>

    </div>
  );
};

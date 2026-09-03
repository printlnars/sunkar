import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, 
  Camera,
  Upload,
  Radio,
  Image as ImageIcon
} from 'lucide-react';
import type { CameraFeed, BoundingBox } from '../types';

interface VisionMonitorProps {
  activeCamera: CameraFeed | null;
  availableCameras: CameraFeed[];
  detections: BoundingBox[];
  onSelectCamera: (cameraId: string) => void;
}

export const VisionMonitor: React.FC<VisionMonitorProps> = ({
  activeCamera,
  availableCameras,
  detections,
  onSelectCamera
}) => {
  const [visionMode, setVisionMode] = useState<'RGB' | 'THERMAL' | 'CUSTOM_MEDIA'>('RGB');
  const [customMediaUrl, setCustomMediaUrl] = useState<string>(() => {
    return localStorage.getItem('sunkar_custom_drone_media') || 'https://images.unsplash.com/photo-1602980085566-4c715cbd77e3?auto=format&fit=crop&w=1200&q=80';
  });
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>('');
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle local file upload (GIF, MP4, WebM, PNG, JPG)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setCustomMediaUrl(objectUrl);
      localStorage.setItem('sunkar_custom_drone_media', objectUrl);
      setVisionMode('CUSTOM_MEDIA');
      setShowUploadModal(false);
    }
  };

  const handleApplyUrl = () => {
    if (inputUrl.trim()) {
      setCustomMediaUrl(inputUrl.trim());
      localStorage.setItem('sunkar_custom_drone_media', inputUrl.trim());
      setVisionMode('CUSTOM_MEDIA');
      setShowUploadModal(false);
      setInputUrl('');
    }
  };

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

  const isVideoFile = customMediaUrl.endsWith('.mp4') || customMediaUrl.endsWith('.webm') || customMediaUrl.includes('video');

  return (
    <div className="flex flex-col h-full hub-card overflow-hidden shadow-sm relative bg-slate-900 rounded-2xl">
      
      {/* Hidden File Picker */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/gif,image/jpeg,image/png,image/webp,video/mp4,video/webm" 
        className="hidden" 
      />

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
              <span>{activeCamera?.name || 'БПЛА «Сункар-1» (DJI Matrice 350 RTK)'}</span>
              <span className="px-2 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                ONLINE
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Сектор: {activeCamera?.location_name || 'Резерват «Семей орманы», Сектор 45'}
            </div>
          </div>
        </div>

        {/* Video Mode Switchers & Custom GIF/Video Button */}
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
              <ImageIcon className="w-3.5 h-3.5" />
              Кастомная GIF/Видео
            </button>
          </div>

          {/* Upload GIF / Video Button */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
            title="Загрузить свою GIF или Видео пожара"
          >
            <Upload className="w-3.5 h-3.5 text-blue-700" />
            <span>Загрузить GIF</span>
          </button>

        </div>

      </div>

      {/* 2. Main High-Tech Viewport with YOLOv11 Telemetry Overlay */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center min-h-[360px]">
        
        {/* Content: Custom Video / GIF vs Simulated Canvas */}
        {visionMode === 'CUSTOM_MEDIA' ? (
          isVideoFile ? (
            <video 
              src={customMediaUrl} 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-full object-cover"
            />
          ) : (
            <img 
              src={customMediaUrl} 
              alt="БПЛА Видеопоток" 
              className="w-full h-full object-cover"
            />
          )
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
            <strong className="text-emerald-400 font-bold">YOLOv11s-Fire (14.8 мс • 30 FPS)</strong>
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

        {/* YOLOv11 Real-time Bounding Boxes */}
        {detections.map((box) => (
          <div
            key={box.id}
            className="absolute border-2 border-rose-500 rounded-xl bg-rose-500/15 flex flex-col justify-between p-1.5 pointer-events-none shadow-lg shadow-rose-950/40"
            style={{
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.w * 100}%`,
              height: `${box.h * 100}%`,
            }}
          >
            <div className="bg-rose-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-md shadow-md self-start flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 animate-pulse" />
              <span>Дым лесного пожара: {(box.confidence * 100).toFixed(1)}% (~{box.area_sq_m.toFixed(0)} м²)</span>
            </div>

            <div className="bg-slate-900/95 text-amber-300 font-bold text-[9px] px-2 py-0.5 rounded-md self-end border border-amber-500/50 shadow-sm">
              СЕКТОР 45 • СЕМЕЙ ОРМАНЫ
            </div>
          </div>
        ))}

        {/* Bottom Switch Indicator Badge */}
        {visionMode === 'CUSTOM_MEDIA' && (
          <div className="absolute bottom-4 right-4 bg-slate-900/85 backdrop-blur-md border border-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-2 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span>Источник: Пользовательский медиапоток БПЛА</span>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-sky-400 hover:text-sky-200 underline text-[11px] cursor-pointer"
            >
              Сменить файл
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
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Выбрать GIF с ПК</span>
        </button>

      </div>

      {/* 4. Modal: Upload Custom GIF / Video */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Загрузка GIF / Видео БПЛА</h3>
                  <p className="text-xs text-slate-500">Добавьте анимацию или видео лесного пожара</p>
                </div>
              </div>
            </div>

            {/* Option A: Pick Local File */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="p-6 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center"
            >
              <Upload className="w-8 h-8 text-blue-600" />
              <div className="text-xs font-bold text-slate-800">
                Нажмите для выбора файла с компьютера
              </div>
              <div className="text-[11px] text-slate-500">
                Поддерживаются .GIF, .MP4, .WEBM, .JPG, .PNG
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase">
              <div className="h-px bg-slate-200 flex-1" />
              <span>или укажите ссылку (URL)</span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>

            {/* Option B: Input URL */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://.../forest-fire.gif" 
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleApplyUrl}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  Применить
                </button>
              </div>
            </div>

            {/* Preset Demos */}
            <div className="space-y-1.5 pt-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Демо-пресеты:</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const url = 'https://images.unsplash.com/photo-1602980085566-4c715cbd77e3?auto=format&fit=crop&w=1200&q=80';
                    setCustomMediaUrl(url);
                    localStorage.setItem('sunkar_custom_drone_media', url);
                    setVisionMode('CUSTOM_MEDIA');
                    setShowUploadModal(false);
                  }}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-left text-xs font-semibold text-slate-700 transition-colors"
                >
                  🌲 Дым над сосновым лесом
                </button>
                <button
                  onClick={() => {
                    const url = 'https://images.unsplash.com/photo-1542401886-65d6c61db217?auto=format&fit=crop&w=1200&q=80';
                    setCustomMediaUrl(url);
                    localStorage.setItem('sunkar_custom_drone_media', url);
                    setVisionMode('CUSTOM_MEDIA');
                    setShowUploadModal(false);
                  }}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-left text-xs font-semibold text-slate-700 transition-colors"
                >
                  🔥 Очаг верхового пожара
                </button>
              </div>
            </div>

            {/* Footer Close */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Закрыть
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

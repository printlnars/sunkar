import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, 
  Camera
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
  const [visionMode, setVisionMode] = useState<'RGB' | 'THERMAL'>('RGB');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
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
        bgGrad.addColorStop(0, '#100a1c');
        bgGrad.addColorStop(0.5, '#280c2e');
        bgGrad.addColorStop(1, '#0e0517');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Ground terrain contour lines
        ctx.strokeStyle = 'rgba(120, 40, 100, 0.3)';
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
          80 + Math.sin(time * 3) * 10
        );
        fireGrad.addColorStop(0, '#ffffff');
        fireGrad.addColorStop(0.2, '#ffff33');
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
        skyGrad.addColorStop(0, '#3a5f8a');
        skyGrad.addColorStop(1, '#8fa9c4');
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
    <div className="flex flex-col h-full mchs-card rounded-lg overflow-hidden shadow-md relative">
      
      {/* Top Video Header */}
      <div className="flex items-center justify-between px-4 py-2.5 mchs-card-header z-20">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#2a1318] border border-[#7f1d1d] text-red-400 text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>Прямой эфир</span>
          </div>
          <span className="text-xs font-bold text-white">
            {activeCamera?.name || 'БПЛА МЧС РК «Сункар-1»'}
          </span>
          <span className="text-[11px] text-slate-400">
            ({activeCamera?.location_name})
          </span>
        </div>

        {/* Vision Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#0b1322] p-0.5 rounded border border-[#233350] text-xs">
          <button
            onClick={() => setVisionMode('RGB')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              visionMode === 'RGB'
                ? 'bg-[#0284c7] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            4K Камера
          </button>
          <button
            onClick={() => setVisionMode('THERMAL')}
            className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              visionMode === 'THERMAL'
                ? 'bg-[#d97706] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Тепловизор (FLIR)
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center min-h-[300px]">
        <canvas 
          ref={canvasRef} 
          width={640} 
          height={340} 
          className="w-full h-full object-cover"
        />

        {/* Flight Telemetry Banner */}
        <div className="absolute top-3 left-3 bg-[#0f172a]/85 border border-[#33496e] rounded px-3 py-1.5 text-xs text-slate-200 font-mono space-y-0.5 pointer-events-none">
          <div>Высота: <strong>145 м</strong> | Скорость: <strong>34 км/ч</strong> | Батарея: <strong>88%</strong></div>
          <div>Анализ: <strong className="text-emerald-400">YOLOv11s (14.8 мс)</strong></div>
        </div>

        {/* Detection Bounding Boxes */}
        {detections.map((box) => (
          <div
            key={box.id}
            className="absolute border-2 border-red-600 rounded bg-red-600/10 flex flex-col justify-between p-1 pointer-events-none"
            style={{
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.w * 100}%`,
              height: `${box.h * 100}%`,
            }}
          >
            <div className="bg-red-600 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow self-start flex items-center gap-1">
              <Flame className="w-3 h-3" />
              <span>Дым лесного пожара: {(box.confidence * 100).toFixed(1)}% (~{box.area_sq_m.toFixed(0)} м²)</span>
            </div>

            <div className="bg-black/80 text-amber-300 font-bold text-[9px] px-1.5 py-0.5 rounded self-end border border-amber-500/40">
              КВАДРАТ 45
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Camera Selector Bar */}
      <div className="px-4 py-2 bg-[#0c1527] border-t border-[#1f2e4d] flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-semibold text-slate-400 whitespace-nowrap flex items-center gap-1">
          <Camera className="w-3.5 h-3.5 text-sky-400" />
          Видеоисточники:
        </span>
        {availableCameras.map((cam) => {
          const isSelected = activeCamera?.id === cam.id;
          return (
            <button
              key={cam.id}
              onClick={() => onSelectCamera(cam.id)}
              className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-[#1b3158] text-[#7dd3fc] border border-[#2d4d87]'
                  : 'bg-[#131d31] text-slate-400 border border-[#233350] hover:bg-[#1a2b48] hover:text-white'
              }`}
            >
              <span>{cam.name}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { Upload, Clapperboard, X, Loader2, CheckCircle2, AlertTriangle, FileVideo2 } from 'lucide-react';
import type { CameraFeed } from '../types';
import { CAMERA_MEDIA } from '../droneMedia';

interface DroneVideoUploadModalProps {
  open: boolean;
  /** Камера, для которой открыто окно (можно сменить внутри). */
  preselectedCameraId?: string | null;
  cameras: CameraFeed[];
  onClose: () => void;
  /** Успешная загрузка: id борта и URL его нового видеопотока. */
  onUploaded: (cameraId: string, url: string) => void;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
};

const fileNameOf = (url: string): string => {
  const name = url.split('/').pop() ?? url;
  return name.split('?')[0];
};

/**
 * Окно загрузки видео на конкретный борт (БПЛА). Файл уходит на сервер
 * POST /api/vision/media/{camera_id}, после чего backend сам пересчитывает
 * детекцию YOLOv8n по новому ролику, а фронт получает URL потока.
 */
export const DroneVideoUploadModal: React.FC<DroneVideoUploadModalProps> = ({
  open,
  preselectedCameraId,
  cameras,
  onClose,
  onUploaded,
}) => {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const prevOpenRef = useRef<boolean>(false);

  // Сброс состояния ТОЛЬКО в момент первичного открытия окна (не при каждом тике WebSocket)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setTargetId(preselectedCameraId && cameras.some((c) => c.id === preselectedCameraId)
        ? preselectedCameraId
        : cameras[0]?.id ?? null);
      setFile(null);
      setDragOver(false);
      setUploading(false);
      setError(null);
      setDone(null);
    }
    prevOpenRef.current = open;
  }, [open, preselectedCameraId, cameras]);

  // После успеха — короткое подтверждение и закрытие
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(onClose, 1200);
    return () => window.clearTimeout(t);
  }, [done, onClose]);

  if (!open) return null;

  const target = cameras.find((c) => c.id === targetId) ?? null;
  const isVideoFile = (f: File | null | undefined): boolean => {
    if (!f) return false;
    if (f.type && f.type.startsWith('video/')) return true;
    return /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(f.name);
  };

  const validFile = isVideoFile(file);
  const maxBytes = 2 * 1024 * 1024 * 1024;

  const pickFile = (f: File | undefined | null) => {
    if (!f) return;
    if (!isVideoFile(f)) {
      setError('Поддерживаются только видеофайлы (MP4, WEBM, MOV).');
      return;
    }
    if (f.size > maxBytes) {
      setError('Файл больше 2 ГБ — выберите видео поменьше.');
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file || !validFile || !targetId) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/vision/media/${targetId}`, { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      onUploaded(targetId, data.url);
      setDone(targetId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        {/* Заголовок */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Видео на борт</h3>
              <p className="text-xs text-slate-500">
                Файл станет видеопотоком борта и будет проанализирован моделью YOLOv8n
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Закрыть"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* 1. Борт назначения */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Борт назначения
            </div>
            <div className="grid grid-cols-3 gap-2">
              {cameras.map((cam) => {
                const active = cam.id === targetId;
                return (
                  <button
                    key={cam.id}
                    onClick={() => !uploading && setTargetId(cam.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500/30'
                        : 'bg-white border-slate-200 hover:border-blue-300'
                    } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          active ? 'bg-blue-600 animate-pulse' : 'bg-emerald-500'
                        }`}
                      />
                      <span className="text-xs font-extrabold text-slate-800 truncate">{cam.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">{cam.location_name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Выбор файла */}
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Видеофайл
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/*,.mp4,.webm,.mov,.mkv"
              className="hidden"
              onChange={(e) => {
                pickFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />

            {file && validFile ? (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                  <FileVideo2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">{file.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {formatSize(file.size)} · загрузится на «{target?.name ?? ''}»
                  </div>
                </div>
                {!uploading && (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="text-[11px] font-bold text-blue-700 hover:text-blue-900 cursor-pointer shrink-0"
                  >
                    Заменить
                  </button>
                )}
              </div>
            ) : (
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  pickFile(e.dataTransfer.files?.[0]);
                }}
                className={`p-7 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center ${
                  dragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40'
                }`}
              >
                <div className="p-2.5 rounded-full bg-white border border-slate-200 shadow-sm text-blue-600">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-800">Выберите видео с компьютера</div>
                <div className="text-[11px] text-slate-500">MP4, WEBM или MOV · до 2 ГБ</div>
              </div>
            )}

            {target && (
              <p className="text-[11px] text-slate-500 mt-2 flex items-start gap-1.5">
                <FileVideo2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-px" />
                <span>
                  Текущий поток борта: {fileNameOf(CAMERA_MEDIA[target.id] ?? 'не назначен')}.
                  После загрузки детекция борта пересчитается автоматически.
                </span>
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Видео загружено на борт — анализ запущен.</span>
            </div>
          )}
        </div>

        {/* Действия */}
        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-40"
          >
            Отмена
          </button>
          <button
            onClick={handleUpload}
            disabled={!validFile || uploading}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Загрузка…
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                Загрузить на борт
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

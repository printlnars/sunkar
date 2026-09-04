/**
 * Назначение видео/медиа для видеопотоков БПЛА (фиксированные имена, как на бэкенде).
 *
 * Файлы лежат в frontend/public/videos/ и раздаются по адресу /videos/<файл>.
 * Альфа → pojar-1.mp4, Бета → pojar-2.mp4, Гамма → pojar-3.mp4.
 * Чтобы назначить другой файл другому дрону — измените записи здесь и в DRONE_VIDEOS
 * (backend/app/services/fire_detector.py).
 */
export const CAMERA_MEDIA: Record<string, string> = {
  'cam-drone-01': '/videos/pojar-1.mp4',
  'cam-drone-02': '/videos/pojar-2.mp4',
  'cam-drone-03': '/videos/pojar-3.mp4',
};

export const DEFAULT_DRONE_MEDIA =
  'https://images.unsplash.com/photo-1602980085566-4c715cbd77e3?auto=format&fit=crop&w=1200&q=80';

/** Возвращает назначенный файл для камеры (если есть). */
export function getAssignedMedia(cameraId?: string | null): string | null {
  return cameraId && CAMERA_MEDIA[cameraId] ? CAMERA_MEDIA[cameraId] : null;
}

/**
 * Итоговый источник медиа для камеры:
 * назначенный файл по умолчанию > стандартное изображение.
 * Операторские загрузки живут на сервере (/videos/{id}-custom.mp4) и
 * приходят через GET /api/vision/media — см. serverMedia в VisionMonitor.
 */
export function resolveDroneMedia(cameraId?: string | null): string {
  return getAssignedMedia(cameraId) ?? DEFAULT_DRONE_MEDIA;
}

/** Проверяет по URL, является ли источник видеофайлом. */
export function looksLikeVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|ogv|mov)(\?|#|$)/i.test(url) || url.includes('video');
}
import React, { useEffect, useState } from 'react';
import { looksLikeVideo } from '../droneMedia';

interface DroneMediaProps {
  /** Основной источник (видео или изображение). */
  src: string;
  /** Запасной источник, если основной не загрузился (например, файл ещё не добавлен). */
  fallbackSrc: string;
  alt?: string;
  className?: string;
  /** Принудительно считать источник видео (для blob:// URL, где расширение не видно). */
  isVideo?: boolean;
  onClick?: () => void;
  /** Ref на <video> — нужен для чтения currentTime при синхронизации детекций. */
  mediaRef?: React.Ref<HTMLVideoElement>;
}

/**
 * Показывает видеопоток БПЛА: <video> для MP4/WebM/GIF-файлов, иначе <img>.
 * При ошибке загрузки (файл отсутствует) плавно переключается на fallbackSrc.
 */
export const DroneMedia: React.FC<DroneMediaProps> = ({
  src,
  fallbackSrc,
  alt = 'БПЛА видеопоток',
  className = '',
  isVideo,
  onClick,
  mediaRef
}) => {
  const [current, setCurrent] = useState<string>(src);

  useEffect(() => {
    setCurrent(src);
  }, [src]);

  const handleError = () => {
    if (current !== fallbackSrc) {
      setCurrent(fallbackSrc);
    }
  };

  const video = isVideo ?? looksLikeVideo(current);

  if (video) {
    return (
      <video
        ref={mediaRef}
        src={current}
        autoPlay
        loop
        muted
        playsInline
        onError={handleError}
        onClick={onClick}
        className={className}
      />
    );
  }

  return (
    <img
      src={current}
      alt={alt}
      onError={handleError}
      onClick={onClick}
      className={className}
    />
  );
};
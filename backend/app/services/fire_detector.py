"""
Реальная детекция дыма и огня (YOLOv8n, дообучение D-Fire).

Заменяет скриптованный генератор детекций: прогоняет видео БПЛА через
свёрточную модель и отдаёт таймлайн детекций [{t, boxes[]}], который фронт
синхронизирует с текущим моментом проигрывания видео.

Модель: rabahdev/fire-smoke-yolov8n (classes: 0=smoke, 1=fire), ~6 МБ, скачивается
с Hugging Face при первом запуске. Лицензия AGPL-3.0 (наследие Ultralytics).
"""
import hashlib
import json
import logging
import threading
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger("sunkar.fire_detector")

PROJECT_ROOT = Path(__file__).resolve().parents[3]
ML_DIR = PROJECT_ROOT / "backend" / "app" / "ml"
WEIGHTS_PATH = ML_DIR / "weights" / "fire-smoke-yolov8n.pt"
ANALYSIS_DIR = ML_DIR / "analysis"
PREVIEW_DIR = ML_DIR / "preview"
WEIGHTS_URL = "https://huggingface.co/rabahdev/fire-smoke-yolov8n/resolve/main/best.pt"

# Соответствие «камера БПЛА → видеофайл по умолчанию» (фиксированные имена).
# Файлы лежат в frontend/public/videos и раздаются Vite по /videos/<имя>.
# Альфа → pojar-1.mp4, Бета → pojar-2.mp4, Гамма → pojar-3.mp4.
# Если оператор загрузил своё видео для борта (через UI), оно сохраняется как
# {camera_id}-custom.<ext> и имеет приоритет над файлом по умолчанию.
VIDEO_ROOT = PROJECT_ROOT / "frontend" / "public" / "videos"
DRONE_VIDEOS: Dict[str, Path] = {
    "cam-drone-01": VIDEO_ROOT / "pojar-1.mp4",
    "cam-drone-02": VIDEO_ROOT / "pojar-2.mp4",
    "cam-drone-03": VIDEO_ROOT / "pojar-3.mp4",
}
ALLOWED_VIDEO_EXTS = (".mp4", ".webm")

MODEL_NAME = "YOLOv8n-Fire"
MODEL_DATASET = "D-Fire"
MODEL_CLASSES = ["smoke", "fire"]
CONF_THRESHOLD = 0.30
IOU_THRESHOLD = 0.45
SAMPLE_FPS = 4  # детекций в секунду видео (оптимизация: 4K → 640, батч 16)
BATCH_SIZE = 16
PREVIEW_LIMIT = 4  # сколько лучших кадров сохранять для визуальной проверки
FIRE_ALERT_CONF = 0.35  # минимальная уверенность «fire», при которой поднимается тревога


class FireDetectionService:
    """
    Один экземпляр на процесс: ленивая загрузка модели, анализ в фоновом
    потоке, кэш таймлайна на диске (не пересчитывается между рестартами).
    """

    def __init__(self) -> None:
        self._model = None
        self._lock = threading.Lock()
        # video_path -> {"state", "progress", "error", "timeline"}
        self._jobs: Dict[str, Dict] = {}

    # ---------- пути и веса ----------

    @classmethod
    def _custom_path(cls, camera_id: str, ext: str = ".mp4") -> Path:
        """Путь пользовательского видео, загруженного через интерфейс для борта."""
        return VIDEO_ROOT / f"{camera_id}-custom{ext.lower()}"

    @classmethod
    def custom_video(cls, camera_id: str) -> Optional[Path]:
        """Загруженное оператором видео для борта (если есть)."""
        for ext in ALLOWED_VIDEO_EXTS:
            p = cls._custom_path(camera_id, ext)
            if p.exists():
                return p
        return None

    @classmethod
    def video_for_camera(cls, camera_id: str) -> Optional[Path]:
        """Активное видео борта: пользовательская загрузка приоритетнее файла по умолчанию."""
        custom = cls.custom_video(camera_id)
        if custom:
            return custom
        video = DRONE_VIDEOS.get(camera_id)
        if video and video.exists():
            return video
        return None

    @classmethod
    def expected_video_name(cls, camera_id: str) -> Optional[str]:
        """Имя активного файла (даже если он ещё не загружен в папку)."""
        custom = cls.custom_video(camera_id)
        if custom:
            return custom.name
        video = DRONE_VIDEOS.get(camera_id)
        return video.name if video else None

    def media_info(self, camera_id: str) -> Dict:
        """Текущий медиаисточник борта для UI."""
        custom = self.custom_video(camera_id)
        if custom:
            return {"url": f"/videos/{custom.name}", "name": custom.name, "source": "upload"}
        video = DRONE_VIDEOS.get(camera_id)
        if video and video.exists():
            return {"url": f"/videos/{video.name}", "name": video.name, "source": "default"}
        return {"url": None, "name": DRONE_VIDEOS.get(camera_id).name if DRONE_VIDEOS.get(camera_id) else None,
                "source": "missing"}

    def save_upload(self, camera_id: str, filename: str, upload_file) -> Path:
        """Сохраняет загруженное видео борта и сбрасывает устаревший анализ."""
        import shutil
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_VIDEO_EXTS:
            raise ValueError(f"Неподдерживаемый формат: {ext}. Разрешены: {', '.join(ALLOWED_VIDEO_EXTS)}")
        target = self._custom_path(camera_id, ext)
        target.parent.mkdir(parents=True, exist_ok=True)
        tmp = target.with_suffix(target.suffix + ".part")
        with open(tmp, "wb") as fh:
            if hasattr(upload_file, "file"):
                shutil.copyfileobj(upload_file.file, fh)
            elif hasattr(upload_file, "read"):
                shutil.copyfileobj(upload_file, fh)
            else:
                for chunk in upload_file:
                    fh.write(chunk)
        tmp.replace(target)

        # Также копируем в dist/videos для раздачи production Nginx
        dist_videos = PROJECT_ROOT / "frontend" / "dist" / "videos"
        if dist_videos.exists():
            dist_target = dist_videos / target.name
            try:
                shutil.copy2(target, dist_target)
            except Exception as e:
                logger.warning(f"Could not copy to dist/videos: {e}")

        # анализ старого файла этого борта больше не актуален
        self._reset_analysis([target, DRONE_VIDEOS.get(camera_id)])
        return target

    def _reset_analysis(self, paths: List[Optional[Path]]) -> None:
        """Чистит in-memory статус и дисковый кэш таймлайна для указанных файлов."""
        with self._lock:
            for p in paths:
                if p is None:
                    continue
                p = Path(p)
                self._jobs.pop(str(p), None)
                for old in ANALYSIS_DIR.glob(f"timeline_{p.stem}_*.json"):
                    try:
                        old.unlink()
                    except OSError:
                        pass

    def ensure_weights(self) -> Path:
        WEIGHTS_PATH.parent.mkdir(parents=True, exist_ok=True)
        if not WEIGHTS_PATH.exists():
            logger.info("Downloading fire/smoke model weights (%s)", WEIGHTS_URL)
            import requests
            tmp = WEIGHTS_PATH.with_suffix(".part")
            with requests.get(WEIGHTS_URL, timeout=300, stream=True) as r:
                r.raise_for_status()
                with open(tmp, "wb") as f:
                    for chunk in r.iter_content(chunk_size=1 << 16):
                        f.write(chunk)
            tmp.rename(WEIGHTS_PATH)
            logger.info("Model weights downloaded: %s", WEIGHTS_PATH)
        return WEIGHTS_PATH

    def _get_model(self):
        """Лениво грузит YOLO (ultralytics). Импорт тяжёлый — только при первом использовании."""
        if self._model is None:
            with self._lock:
                if self._model is None:
                    from ultralytics import YOLO
                    self._model = YOLO(str(self.ensure_weights()))
                    logger.info("Fire/smoke model loaded: %s", MODEL_NAME)
        return self._model

    # ---------- анализ видео ----------

    @staticmethod
    def _fingerprint(video_path: Path) -> str:
        st = video_path.stat()
        raw = f"{video_path.name}|{st.st_size}|{int(st.st_mtime_ns)}"
        return hashlib.sha1(raw.encode()).hexdigest()[:16]

    def get_or_start(self, video_path: Path) -> Dict:
        """Возвращает статус анализа; при необходимости запускает фоновый анализ."""
        video_path = Path(video_path)
        key = str(video_path)
        with self._lock:
            job = self._jobs.get(key)
            if job is None:
                job = {"state": "starting", "progress": 0.0, "error": None, "timeline": None}
                self._jobs[key] = job

        if job["state"] in ("ready", "error"):
            return self.status(video_path)

        if job["state"] == "starting":
            # первый вызов — кладём в очередь на запуск в отдельном потоке
            with self._lock:
                if job["state"] == "starting":
                    job["state"] = "analyzing"
                    t = threading.Thread(
                        target=self._run_analysis, args=(video_path, job), daemon=True
                    )
                    t.start()
        return self.status(video_path)

    def status(self, video_path: Path) -> Dict:
        video_path = Path(video_path)
        key = str(video_path)
        with self._lock:
            job = self._jobs.get(key)

        payload = {
            "state": "missing",
            "progress": 0.0,
            "message": "",
            "model": {
                "name": MODEL_NAME,
                "dataset": MODEL_DATASET,
                "classes": MODEL_CLASSES,
                "conf_threshold": CONF_THRESHOLD,
            },
            "video": {
                "name": video_path.name,
                "url": f"/videos/{video_path.name}",
                "duration_s": 0.0,
                "fps": 0.0,
            },
            "timeline": [],
            "detections_total": 0,
        }

        if not video_path.exists():
            payload["message"] = "Видео БПЛА не найдено на сервере"
            return payload

        # Дисковый кэш (переживает рестарты сервера)
        if job is None:
            cache_file = self._cache_file(video_path)
            if cache_file.exists():
                with self._lock:
                    job = self._jobs.setdefault(key, {"state": "ready", "progress": 1.0,
                                                      "error": None, "timeline": None})
                    job["timeline"] = json.loads(cache_file.read_text(encoding="utf-8"))
            else:
                return self.get_or_start(video_path)

        payload["state"] = job["state"]
        payload["progress"] = job.get("progress", 0.0)
        payload["error"] = job.get("error")
        payload["video"]["duration_s"] = self._video_meta(video_path).get("duration_s", 0.0)
        payload["video"]["fps"] = self._video_meta(video_path).get("fps", 0.0)

        timeline = job.get("timeline") or []
        payload["detections_total"] = sum(len(s.get("boxes", [])) for s in timeline)

        # Сводка детекции: есть ли пожар в видео и где он максимально уверен
        summary = {"has_fire": False, "best_fire_confidence": 0.0, "best_fire_t": None,
                   "fire_boxes": 0, "smoke_boxes": 0}
        for sample in timeline:
            for box in sample.get("boxes", []):
                if box.get("label") == "fire":
                    summary["fire_boxes"] += 1
                    conf = float(box.get("confidence", 0.0))
                    if conf >= FIRE_ALERT_CONF and conf > summary["best_fire_confidence"]:
                        summary["best_fire_confidence"] = round(conf, 3)
                        summary["best_fire_t"] = sample.get("t")
                else:
                    summary["smoke_boxes"] += 1
        summary["has_fire"] = summary["best_fire_confidence"] > 0
        payload["detection_summary"] = summary

        if job["state"] == "ready":
            payload["timeline"] = timeline
            payload["message"] = (
                f"Анализ завершён: {len(timeline)} кадров, "
                f"{payload['detections_total']} объектов"
            )
        elif job["state"] == "analyzing":
            payload["message"] = f"Нейросеть анализирует видео: {int(payload['progress'] * 100)}%"
        elif job["state"] == "error":
            payload["message"] = f"Ошибка анализа: {job.get('error')}"
        return payload

    def max_detection_confidence(self, camera_id: str) -> Optional[float]:
        """Максимальная реальная уверенность детекции по таймлайну камеры (или None)."""
        video = self.video_for_camera(camera_id)
        if video is None:
            return None
        try:
            status = self.status(video)
        except Exception:  # noqa: BLE001
            return None
        if status.get("state") != "ready":
            return None
        best = None
        for sample in status.get("timeline", []):
            for box in sample.get("boxes", []):
                conf = float(box.get("confidence", 0.0))
                if best is None or conf > best:
                    best = conf
        return best

    def _cache_file(self, video_path: Path) -> Path:
        ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
        return ANALYSIS_DIR / f"timeline_{video_path.stem}_{self._fingerprint(video_path)}.json"

    def _video_meta(self, video_path: Path) -> Dict:
        import cv2
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            return {"duration_s": 0.0, "fps": 0.0}
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        cap.release()
        return {"duration_s": round(n / fps, 2) if n else 0.0, "fps": round(fps, 2)}

    def _run_analysis(self, video_path: Path, job: Dict) -> None:
        try:
            timeline, top_frames = self._analyze_video(video_path, job)
            job["timeline"] = timeline
            cache = self._cache_file(video_path)
            cache.write_text(json.dumps(timeline, ensure_ascii=False), encoding="utf-8")
            self._save_previews(video_path, top_frames)
            job["progress"] = 1.0
            job["state"] = "ready"
            logger.info("Analysis ready: %s (%d samples)", video_path.name, len(timeline))
        except Exception as e:  # noqa: BLE001
            logger.exception("Analysis failed for %s", video_path)
            job["state"] = "error"
            job["error"] = str(e)

    def _analyze_video(self, video_path: Path, job: Dict) -> tuple[List[Dict], List[Dict]]:
        import cv2
        model = self._get_model()
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise RuntimeError("Не удалось открыть видеофайл")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        n_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        duration = (n_frames / fps) if n_frames else 0.0
        if n_frames == 0:
            raise RuntimeError("Видео пустое")

        step = max(1, int(round(fps / SAMPLE_FPS)))
        total_samples = max(1, n_frames // step)
        timeline: List[Dict] = []
        # лучшие кадры для превью — отдельно по классам, чтобы пламя не вытеснялось дымом
        best_frames: Dict[str, List[Dict]] = {"smoke": [], "fire": []}
        batch_frames: List = []
        batch_times: List[float] = []
        last_report = 0.0

        def flush_batch() -> None:
            if not batch_frames:
                return
            results = model.predict(
                batch_frames, conf=CONF_THRESHOLD, iou=IOU_THRESHOLD,
                imgsz=640, verbose=False
            )
            for res, ts in zip(results, batch_times):
                boxes = []
                if res.boxes is not None:
                    for box in res.boxes:
                        cls_id = int(box.cls[0])
                        conf = float(box.conf[0])
                        cx, cy, bw, bh = box.xywhn[0].tolist()
                        x = max(0.0, min(1.0, cx - bw / 2))
                        y = max(0.0, min(1.0, cy - bh / 2))
                        boxes.append({
                            "label": MODEL_CLASSES[cls_id] if cls_id < len(MODEL_CLASSES) else "smoke",
                            "confidence": round(conf, 3),
                            "x": round(x, 4),
                            "y": round(y, 4),
                            "w": round(min(1.0, bw), 4),
                            "h": round(min(1.0, bh), 4),
                        })
                if boxes:
                    # лучший бокс по каждому классу отдельно (дым и пламя в одном кадре)
                    by_label: Dict[str, List[Dict]] = {}
                    for b in boxes:
                        by_label.setdefault(b["label"], []).append(b)
                    for label, group in by_label.items():
                        best = max(group, key=lambda b: b["confidence"])
                        bucket = best_frames.setdefault(label, [])
                        bucket.append({"t": round(ts, 2), "conf": best["confidence"],
                                       "frame": res.orig_img, "label": label})
                        bucket.sort(key=lambda f: f["conf"], reverse=True)
                        del bucket[2:]  # до 2 лучших кадров на класс
                timeline.append({"t": round(ts, 2), "boxes": boxes})
            nonlocal last_report
            if ts >= last_report + 1.0 or (ts >= duration - 0.01):
                job["progress"] = min(0.99, ts / duration) if duration else 0.99
                last_report = ts
            batch_frames.clear()
            batch_times.clear()

        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if frame_idx % step == 0:
                batch_frames.append(frame)
                batch_times.append(frame_idx / fps)
                if len(batch_frames) >= BATCH_SIZE:
                    flush_batch()
            frame_idx += 1
        flush_batch()
        cap.release()

        timeline.sort(key=lambda s: s["t"])
        # Чередуем классы, чтобы в превью попали и пламя, и дым
        # (иначе более уверенный дым вытесняет кадры с огнём).
        fire, smoke = best_frames["fire"], best_frames["smoke"]
        top_frames: List[Dict] = []
        i = j = 0
        while len(top_frames) < PREVIEW_LIMIT and (i < len(fire) or j < len(smoke)):
            if i < len(fire):
                top_frames.append(fire[i])
                i += 1
            if len(top_frames) >= PREVIEW_LIMIT:
                break
            if j < len(smoke):
                top_frames.append(smoke[j])
                j += 1
        job["progress"] = 0.99
        return timeline, top_frames

    def _save_previews(self, video_path: Path, top_frames: List[Dict]) -> None:
        """Сохраняет несколько лучших кадров с отрисованными боксами для визуальной проверки."""
        PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
        model = self._model
        for f in top_frames:
            import cv2
            frame = f["frame"]
            annotated = frame
            if model is not None:
                res = model.predict(frame, conf=CONF_THRESHOLD, imgsz=640, verbose=False)[0]
                annotated = res.plot()
            scale = 960 / max(1, annotated.shape[1])
            if scale < 1.0:
                annotated = cv2.resize(annotated, (960, int(annotated.shape[0] * scale)))
            out = PREVIEW_DIR / f"{video_path.stem}_t{f['t']:.1f}s_{f['label']}_{int(f['conf']*100)}.jpg"
            cv2.imwrite(str(out), annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if top_frames:
            logger.info("Preview frames saved to %s", PREVIEW_DIR)


fire_detector_service = FireDetectionService()

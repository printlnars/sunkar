from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Dict, Any, Optional

from app.services.fire_detector import fire_detector_service, FIRE_ALERT_CONF

from app.services.simulation import simulation_engine
from app.services.vision_stream import VisionStreamService
from app.core.ws_manager import ws_manager

router = APIRouter(prefix="/api")

class CameraSwitchRequest(BaseModel):
    camera_id: str

class WeatherUpdateRequest(BaseModel):
    wind_speed_ms: float
    wind_direction_deg: float
    temperature_c: float
    humidity_percent: float

class ScenarioResetRequest(BaseModel):
    scenario_id: str = "semey-ormany-sq45"

@router.get("/health")
async def health_check():
    return {"status": "HEALTHY", "system": "Sunkar AI Brain", "version": "1.0.0"}

@router.get("/state")
async def get_system_state():
    return simulation_engine.get_full_state()

@router.get("/vision/analysis/{camera_id}")
async def get_vision_analysis(camera_id: str):
    """
    Реальный AI-анализ видео БПЛА (YOLOv8n Fire/Smoke).
    Возвращает статус и таймлайн детекций, синхронизируемый фронтом по времени видео.
    """
    video = fire_detector_service.video_for_camera(camera_id)
    if video is None:
        expected = fire_detector_service.expected_video_name(camera_id)
        return {
            "state": "missing",
            "message": (
                f"Видео {expected} для борта ещё не загружено — положите файл "
                "в frontend/public/videos/"
                if expected
                else "Для этой камеры не настроено видео для анализа"
            ),
            "timeline": [],
        }
    return fire_detector_service.status(video)

@router.get("/vision/media")
async def list_vision_media():
    """Текущий медиаисточник каждого борта (default/upload) для UI."""
    return {
        "cameras": [
            {"camera_id": cid, **fire_detector_service.media_info(cid)}
            for cid in VisionStreamService.CAMERAS
        ]
    }

@router.post("/vision/media/{camera_id}")
async def upload_vision_media(camera_id: str, file: UploadFile = File(...)):
    """
    Оператор загружает видео для конкретного борта через интерфейс.
    Файл становится активным видео борта, анализ пересчитывается автоматически.
    """
    if camera_id not in VisionStreamService.CAMERAS:
        raise HTTPException(status_code=404, detail="Камера не найдена")

    if not (file.content_type or "").startswith("video/"):
        raise HTTPException(status_code=400, detail="Нужен видеофайл (MP4/WEBM)")

    try:
        path = fire_detector_service.save_upload(camera_id, file.filename or "video.mp4", file)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # первый же запрос статуса запустит фоновый анализ нового файла
    return {
        "success": True,
        "camera_id": camera_id,
        "url": f"/videos/{path.name}",
        "name": path.name,
        "source": "upload",
        "analysis": fire_detector_service.status(path)["state"],
    }

class FireAlertRequest(BaseModel):
    camera_id: str
    confidence: float = FIRE_ALERT_CONF

@router.post("/vision/fire-alert")
async def register_fire_alert(payload: FireAlertRequest):
    """
    Подтверждённое срабатывание «пожар» с борта: обновляет инцидент и журнал.
    Решение «направить силы» принимается оператором через approve_dispatch.
    """
    camera = VisionStreamService.get_camera(payload.camera_id)
    incident = simulation_engine.register_drone_fire(
        camera_id=payload.camera_id,
        confidence=payload.confidence
    )
    await ws_manager.broadcast({
        "type": "FIRE_ALERT",
        "camera": camera.model_dump(),
        "confidence": payload.confidence,
        "state": simulation_engine.get_full_state()
    })
    return {"success": True, "incident": incident.model_dump() if incident else None}

@router.post("/incidents/{incident_id}/approve")
async def approve_incident_dispatch(incident_id: str):
    incident = simulation_engine.approve_dispatch()
    if not incident:
        raise HTTPException(status_code=404, detail="Active incident not found")
    
    # Broadcast updated state via WebSocket
    await ws_manager.broadcast({
        "type": "DISPATCH_APPROVED",
        "state": simulation_engine.get_full_state()
    })
    return {"success": True, "incident": incident.model_dump()}

@router.post("/cameras/switch")
async def switch_camera(payload: CameraSwitchRequest):
    if payload.camera_id not in VisionStreamService.CAMERAS:
        raise HTTPException(status_code=400, detail="Invalid camera ID")
    
    simulation_engine.current_camera_id = payload.camera_id
    if simulation_engine.incident:
        simulation_engine.incident.camera_id = payload.camera_id
    
    await ws_manager.broadcast({
        "type": "CAMERA_SWITCHED",
        "state": simulation_engine.get_full_state()
    })
    return {"success": True, "active_camera_id": payload.camera_id}

@router.post("/scenarios/reset")
async def reset_scenario(payload: ScenarioResetRequest):
    simulation_engine.init_scenario(payload.scenario_id)
    await ws_manager.broadcast({
        "type": "SCENARIO_RESET",
        "state": simulation_engine.get_full_state()
    })
    return {"success": True, "scenario_id": payload.scenario_id}

@router.post("/weather/update")
async def update_weather(payload: WeatherUpdateRequest):
    simulation_engine.update_weather(
        wind_speed=payload.wind_speed_ms,
        wind_dir=payload.wind_direction_deg,
        temp=payload.temperature_c,
        humidity=payload.humidity_percent
    )
    await ws_manager.broadcast({
        "type": "WEATHER_UPDATED",
        "state": simulation_engine.get_full_state()
    })
    return {"success": True, "weather": simulation_engine.weather.model_dump()}

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, Optional

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

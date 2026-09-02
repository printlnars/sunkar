from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class ThreatLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"
    EXTREME = "EXTREME"

class UnitStatus(str, Enum):
    STANDBY = "STANDBY"
    DISPATCHED = "DISPATCHED"
    EN_ROUTE = "EN_ROUTE"
    ON_SITE = "ON_SITE"
    CONTAINING = "CONTAINING"
    REFILLING = "REFILLING"

class DetectionClass(str, Enum):
    SMOKE = "smoke"
    FIRE = "fire"
    VEHICLE = "vehicle"
    HUMAN = "human"

class BoundingBox(BaseModel):
    id: str
    label: DetectionClass
    confidence: float
    x: float  # normalized 0-1
    y: float
    w: float
    h: float
    area_sq_m: float

class CameraFeed(BaseModel):
    id: str
    name: str
    type: str  # "DRONE", "WATCHTOWER_360", "SATELLITE_THERMAL", "CCTV_STATION"
    location_name: str
    lat: float
    lon: float
    altitude_m: Optional[float] = 150.0
    status: str = "ONLINE"
    fps: int = 30
    resolution: str = "4K UHD"
    stream_url: Optional[str] = None
    telemetry: Dict[str, Any] = Field(default_factory=dict)

class WeatherData(BaseModel):
    temperature_c: float
    wind_speed_ms: float
    wind_direction_deg: float  # 0-360 (0=North, 180=South, 90=East, 270=West)
    wind_direction_label: str  # e.g., "Южный (S)", "Северо-Восточный (NE)"
    humidity_percent: float
    pressure_hpa: float
    drought_index: float  # 0.0 - 1.0
    forecast_summary: str

class GeoPoint(BaseModel):
    lat: float
    lon: float
    label: Optional[str] = None

class FireSpreadPolygon(BaseModel):
    time_offset_min: int  # 0 (now), 15, 30, 60, 120
    threat_level: ThreatLevel
    coordinates: List[List[float]]  # [[lat, lon], ...]
    area_ha: float
    estimated_perimeter_km: float

class InterceptRoute(BaseModel):
    unit_id: str
    unit_name: str
    route_name: str
    waypoints: List[List[float]]
    estimated_arrival_minutes: int
    safe_passage_clearance: str

class DispatchPlan(BaseModel):
    approved: bool = False
    approved_at: Optional[datetime] = None
    threat_level: ThreatLevel
    ai_verdict: str
    time_to_critical_asset_min: int
    critical_asset_name: str
    optimal_access_route: str
    assigned_units: List[str]
    intercept_routes: List[InterceptRoute] = Field(default_factory=list)
    action_items: List[str] = Field(default_factory=list)

class Incident(BaseModel):
    id: str
    title: str
    location_name: str
    square_number: int  # e.g. Квадрат 45
    center_lat: float
    center_lon: float
    detected_at: datetime
    status: str  # "DETECTED", "AI_ANALYZED", "DISPATCH_APPROVED", "CONTAINMENT_IN_PROGRESS", "LOCALIZED"
    area_sq_m: float
    detection_confidence: float
    camera_id: str
    weather: WeatherData
    spread_polygons: List[FireSpreadPolygon]
    dispatch_plan: DispatchPlan
    telemetry_log: List[Dict[str, Any]] = Field(default_factory=list)

class EmergencyUnit(BaseModel):
    id: str
    name: str
    callsign: str
    unit_type: str  # "FIRE_ENGINE", "HEAVY_BULLDOZER", "HELICOPTER_MI8", "DRONE_SQUAD", "GROUND_CREW"
    base_station: str
    lat: float
    lon: float
    target_lat: Optional[float] = None
    target_lon: Optional[float] = None
    status: UnitStatus
    personnel_count: int
    water_capacity_l: Optional[int] = None
    water_current_l: Optional[int] = None
    fuel_percent: int
    speed_kmh: float
    eta_minutes: Optional[int] = None

class ScenarioPreset(BaseModel):
    id: str
    name: str
    region: str
    description: str
    initial_weather: WeatherData
    camera: CameraFeed
    incident: Incident
    emergency_units: List[EmergencyUnit]

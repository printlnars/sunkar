import time
import datetime
from typing import Dict, List, Optional, Any
from app.models.schemas import (
    Incident, WeatherData, EmergencyUnit, UnitStatus,
    ThreatLevel, DispatchPlan, ScenarioPreset, FireSpreadPolygon
)
from app.services.fire_spread import FireSpreadCalculator
from app.services.ai_agent import SunkarAIAgent
from app.services.vision_stream import VisionStreamService

class SimulationService:
    """
    Simulation State Engine for Sunkar AI.
    Handles active incidents, vehicle positioning, dispatch approval state,
    weather updates, and scenario resets.
    """

    def __init__(self):
        self.ai_agent = SunkarAIAgent()
        self.active_scenario_id = "semey-ormany-sq45"
        self.current_camera_id = "cam-drone-01"
        self.incident: Optional[Incident] = None
        self.emergency_units: Dict[str, EmergencyUnit] = {}
        self.weather: Optional[WeatherData] = None
        self.is_running = True
        self.init_scenario("semey-ormany-sq45")

    def init_scenario(self, scenario_id: str):
        self.active_scenario_id = scenario_id

        if scenario_id == "semey-ormany-sq45":
            self.current_camera_id = "cam-drone-01"
            self.weather = WeatherData(
                temperature_c=33.5,
                wind_speed_ms=7.4,
                wind_direction_deg=185.0,  # South wind blowing North
                wind_direction_label="Южный (S)",
                humidity_percent=22.0,
                pressure_hpa=1012.4,
                drought_index=0.88,
                forecast_summary="Аномальная жара +34°C, порывы южного ветра до 10 м/с, V класс пожарной опасности"
            )

            center_lat = 50.6482
            center_lon = 80.8924
            critical_asset = "Село Бородулиха"
            asset_lat = 50.7180
            asset_lon = 80.9250

            # Calculate fire spread polygons
            spread_polys = FireSpreadCalculator.calculate_spread(
                center_lat=center_lat,
                center_lon=center_lon,
                wind_speed_ms=self.weather.wind_speed_ms,
                wind_direction_deg=self.weather.wind_direction_deg,
                temperature_c=self.weather.temperature_c,
                humidity_pct=self.weather.humidity_percent
            )

            # Estimate time to critical asset
            time_to_asset, dist_km = FireSpreadCalculator.estimate_time_to_asset(
                fire_lat=center_lat,
                fire_lon=center_lon,
                asset_lat=asset_lat,
                asset_lon=asset_lon,
                wind_speed_ms=self.weather.wind_speed_ms,
                wind_direction_deg=self.weather.wind_direction_deg,
                temperature_c=self.weather.temperature_c,
                humidity_pct=self.weather.humidity_percent
            )

            # Define initial emergency units
            self.emergency_units = {
                "UNIT-04-AC40": EmergencyUnit(
                    id="UNIT-04-AC40",
                    name="Пожарный расчет №4 (ПЧ-4)",
                    callsign="Тайфун-4",
                    unit_type="FIRE_ENGINE",
                    base_station="ПЧ-4 г. Семей (Юго-Западный кордон)",
                    lat=50.6200,
                    lon=80.8500,
                    target_lat=50.6550,
                    target_lon=80.8900,
                    status=UnitStatus.STANDBY,
                    personnel_count=6,
                    water_capacity_l=8000,
                    water_current_l=8000,
                    fuel_percent=92,
                    speed_kmh=0.0,
                    eta_minutes=18
                ),
                "UNIT-07-BULLDOZER": EmergencyUnit(
                    id="UNIT-07-BULLDOZER",
                    name="Тяжелый расчет №7 (Бульдозер)",
                    callsign="Гранит-7",
                    unit_type="HEAVY_BULLDOZER",
                    base_station="Опорный пункт с. Бородулиха",
                    lat=50.7150,
                    lon=80.9200,
                    target_lat=50.6800,
                    target_lon=80.9100,
                    status=UnitStatus.STANDBY,
                    personnel_count=3,
                    fuel_percent=85,
                    speed_kmh=0.0,
                    eta_minutes=22
                ),
                "AVIA-MI8-01": EmergencyUnit(
                    id="AVIA-MI8-01",
                    name="Вертолет МЧС РК (Ми-8 ВСУ-5)",
                    callsign="Борт UP-MI801",
                    unit_type="HELICOPTER_MI8",
                    base_station="Авиабаза Казавиаспас Семей",
                    lat=50.3500,
                    lon=80.2500,
                    target_lat=50.6482,
                    target_lon=80.8924,
                    status=UnitStatus.STANDBY,
                    personnel_count=4,
                    water_capacity_l=5000,
                    water_current_l=5000,
                    fuel_percent=78,
                    speed_kmh=0.0,
                    eta_minutes=12
                )
            }

            units_raw = [u.model_dump() for u in self.emergency_units.values()]
            routes = self.ai_agent.build_intercept_routes(center_lat, center_lon, units_raw)

            # Build tactical AI verdict
            verdict_dict = self.ai_agent.generate_dispatch_verdict(
                square_number=45,
                location_name="Резерват «Семей Орманы»",
                weather=self.weather,
                area_sq_m=2450.0,
                detection_confidence=0.984,
                time_to_asset_min=42,  # Exactly matching the scenario narrative (42 mins)
                critical_asset_name=critical_asset,
                head_ros_m_min=32.4
            )

            dispatch_plan = DispatchPlan(
                approved=False,
                threat_level=verdict_dict["threat_level"],
                ai_verdict=verdict_dict["ai_verdict"],
                time_to_critical_asset_min=verdict_dict["time_to_critical_asset_min"],
                critical_asset_name=verdict_dict["critical_asset_name"],
                optimal_access_route=verdict_dict["optimal_access_route"],
                assigned_units=verdict_dict["assigned_units"],
                intercept_routes=routes,
                action_items=verdict_dict["action_items"]
            )

            self.incident = Incident(
                id="INC-2026-0902-0045",
                title="Очаг возгорания — Квадрат 45",
                location_name="Государственный лесной природный резерват «Семей орманы»",
                square_number=45,
                center_lat=center_lat,
                center_lon=center_lon,
                detected_at=datetime.datetime.now(),
                status="AI_ANALYZED",
                area_sq_m=2450.0,
                detection_confidence=0.984,
                camera_id=self.current_camera_id,
                weather=self.weather,
                spread_polygons=spread_polys,
                dispatch_plan=dispatch_plan,
                telemetry_log=[
                    {"time": "14:02:10", "event": "YOLOv11: Зафиксирован дым (Confidence: 98.4%)"},
                    {"time": "14:02:11", "event": "Sunkar Brain: Вектор Ротермела рассчитан (Южный ветер 7.4 м/с)"},
                    {"time": "14:02:12", "event": "AI Agent: Сформирован боевой план перехвата (ETA до с. Бородулиха: 42 мин)"}
                ]
            )

    def approve_dispatch(self) -> Incident:
        """
        Operator clicks 'Утвердить план перехвата'
        """
        if not self.incident:
            return None

        self.incident.dispatch_plan.approved = True
        self.incident.dispatch_plan.approved_at = datetime.datetime.now()
        self.incident.status = "DISPATCH_APPROVED"

        # Update emergency units to EN_ROUTE
        for uid, unit in self.emergency_units.items():
            unit.status = UnitStatus.EN_ROUTE
            if unit.unit_type == "FIRE_ENGINE":
                unit.speed_kmh = 65.0
            elif unit.unit_type == "HEAVY_BULLDOZER":
                unit.speed_kmh = 25.0
            elif unit.unit_type == "HELICOPTER_MI8":
                unit.speed_kmh = 220.0

        self.incident.telemetry_log.append({
            "time": datetime.datetime.now().strftime("%H:%M:%S"),
            "event": "ДИСПЕТЧЕР: План перехвата утвержден в 1 клик. Силы МЧС №4, №7 и борт UP-MI801 выдвинулись."
        })
        return self.incident

    def update_weather(self, wind_speed: float, wind_dir: float, temp: float, humidity: float):
        if not self.weather or not self.incident:
            return

        self.weather.wind_speed_ms = wind_speed
        self.weather.wind_direction_deg = wind_dir
        self.weather.temperature_c = temp
        self.weather.humidity_percent = humidity

        # Recalculate fire spread
        spread_polys = FireSpreadCalculator.calculate_spread(
            center_lat=self.incident.center_lat,
            center_lon=self.incident.center_lon,
            wind_speed_ms=wind_speed,
            wind_direction_deg=wind_dir,
            temperature_c=temp,
            humidity_pct=humidity
        )
        self.incident.spread_polygons = spread_polys
        self.incident.weather = self.weather

    def get_full_state(self) -> Dict[str, Any]:
        cam = VisionStreamService.get_camera(self.current_camera_id)
        detections = VisionStreamService.generate_current_detections(self.current_camera_id, incident_active=True)

        return {
            "incident": self.incident.model_dump() if self.incident else None,
            "units": [u.model_dump() for u in self.emergency_units.values()],
            "active_camera": cam.model_dump(),
            "available_cameras": [c.model_dump() for c in VisionStreamService.get_all_cameras()],
            "detections": [d.model_dump() for d in detections],
            "weather": self.weather.model_dump() if self.weather else None,
            "scenario_id": self.active_scenario_id
        }

# Global singleton
simulation_engine = SimulationService()

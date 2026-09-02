import time
import random
from typing import List, Dict, Any
from app.models.schemas import BoundingBox, DetectionClass, CameraFeed

class VisionStreamService:
    """
    Sunkar Vision Real-time Inference & Video Stream Service.
    Simulates edge YOLOv11 / Vision ML inference with sub-second detection,
    bounding box extraction, false-positive filtering, and gimbal telemetry.
    """

    CAMERAS = {
        "cam-drone-01": CameraFeed(
            id="cam-drone-01",
            name="БПЛА «Сункар-1» (DJI Matrice 350 RTK)",
            type="DRONE",
            location_name="Резерват «Семей Орманы», Сектор 45",
            lat=50.6482,
            lon=80.8924,
            altitude_m=145.0,
            status="ONLINE",
            fps=30,
            resolution="4K UHD (3840x2160)",
            telemetry={
                "battery_percent": 88,
                "flight_speed_kmh": 34.2,
                "gimbal_pitch_deg": -26.5,
                "gimbal_yaw_deg": 182.0,
                "optical_zoom": "4.2x",
                "flir_mode": "THERMAL_WHITE_HOT",
                "ai_latency_ms": 14.8
            }
        ),
        "cam-tower-04": CameraFeed(
            id="cam-tower-04",
            name="Вышка 360° «Бородулиха-Север» (PTZ ОЭС)",
            type="WATCHTOWER_360",
            location_name="Пожарный кордон №3, Бородулиха",
            lat=50.7100,
            lon=80.9150,
            altitude_m=42.0,
            status="ONLINE",
            fps=25,
            resolution="Full HD (1920x1080)",
            telemetry={
                "pan_angle_deg": 194.0,
                "tilt_angle_deg": -8.0,
                "optical_zoom": "18.0x",
                "ai_latency_ms": 11.2
            }
        ),
        "cam-sat-thermal": CameraFeed(
            id="cam-sat-thermal",
            name="Спутник ДЗЗ KazSTSAT / VIIRS Thermal",
            type="SATELLITE_THERMAL",
            location_name="Восточно-Казахстанский регион",
            lat=50.6500,
            lon=80.9000,
            altitude_m=650000.0,
            status="ONLINE",
            fps=1,
            resolution="375m Ground Sample (IR-Band)",
            telemetry={
                "orbit_pass": "11:15 UTC",
                "cloud_mask": "CLEAR",
                "hotspot_temp_kelvin": 680.0
            }
        ),
        "cam-drone-02": CameraFeed(
            id="cam-drone-02",
            name="БПЛА «Бурабай-Альфа» (FPV Surveillance)",
            type="DRONE",
            location_name="ГНПП «Бурабай», Синяя гора",
            lat=53.0850,
            lon=70.2800,
            altitude_m=220.0,
            status="ONLINE",
            fps=30,
            resolution="4K UHD",
            telemetry={
                "battery_percent": 94,
                "flight_speed_kmh": 41.0,
                "gimbal_pitch_deg": -32.0,
                "ai_latency_ms": 16.1
            }
        )
    }

    @classmethod
    def get_all_cameras(cls) -> List[CameraFeed]:
        return list(cls.CAMERAS.values())

    @classmethod
    def get_camera(cls, cam_id: str) -> CameraFeed:
        return cls.CAMERAS.get(cam_id, cls.CAMERAS["cam-drone-01"])

    @classmethod
    def generate_current_detections(cls, cam_id: str, incident_active: bool = True) -> List[BoundingBox]:
        """
        Generates simulated real-time YOLOv11 bounding box predictions for active stream.
        """
        if not incident_active:
            # Normal patrol - no threat detections
            return []

        # Jitter bounding box slightly to simulate continuous live video inference tracking
        t = time.time()
        jitter_x = math_sin_jitter = 0.005 * (hash(int(t * 10)) % 10 - 5)
        jitter_y = 0.004 * (hash(int(t * 12)) % 10 - 5)

        base_smoke_confidence = 0.984 + random.uniform(-0.006, 0.008)
        base_smoke_confidence = min(0.999, max(0.940, base_smoke_confidence))

        detections = [
            BoundingBox(
                id="bbox-smoke-01",
                label=DetectionClass.SMOKE,
                confidence=round(base_smoke_confidence, 3),
                x=round(0.48 + jitter_x, 4),
                y=round(0.42 + jitter_y, 4),
                w=0.28,
                h=0.34,
                area_sq_m=2450.0 + random.uniform(10, 40)
            ),
            BoundingBox(
                id="bbox-fire-01",
                label=DetectionClass.FIRE,
                confidence=round(0.952 + random.uniform(-0.01, 0.02), 3),
                x=round(0.56 + jitter_x, 4),
                y=round(0.60 + jitter_y, 4),
                w=0.12,
                h=0.10,
                area_sq_m=320.0
            )
        ]
        return detections

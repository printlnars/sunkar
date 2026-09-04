from typing import List
from app.models.schemas import CameraFeed

class VisionStreamService:
    """
    Sunkar Vision — бортовые камеры БПЛА.

    В системе три разведывательных борта: Альфа, Бета, Гамма.
    Каждый борт ведёт собственную видеосъёмку; реальная детекция дыма/огня
    выполняется моделью YOLOv8n-Fire (см. services/fire_detector.py).
    """

    CAMERAS = {
        "cam-drone-01": CameraFeed(
            id="cam-drone-01",
            name="БПЛА «Альфа» (DJI Matrice 350 RTK)",
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
        "cam-drone-02": CameraFeed(
            id="cam-drone-02",
            name="БПЛА «Бета» (DJI Matrice 350 RTK)",
            type="DRONE",
            location_name="Резерват «Семей Орманы», Сектор 46",
            lat=50.6850,
            lon=80.9200,
            altitude_m=160.0,
            status="ONLINE",
            fps=30,
            resolution="4K UHD",
            telemetry={
                "battery_percent": 91,
                "flight_speed_kmh": 38.5,
                "gimbal_pitch_deg": -30.0,
                "gimbal_yaw_deg": 165.0,
                "optical_zoom": "3.0x",
                "flir_mode": "THERMAL_WHITE_HOT",
                "ai_latency_ms": 15.3
            }
        ),
        "cam-drone-03": CameraFeed(
            id="cam-drone-03",
            name="БПЛА «Гамма» (FPV Surveillance)",
            type="DRONE",
            location_name="Резерват «Семей Орманы», Сектор 44",
            lat=50.6250,
            lon=80.8600,
            altitude_m=120.0,
            status="ONLINE",
            fps=30,
            resolution="Full HD",
            telemetry={
                "battery_percent": 79,
                "flight_speed_kmh": 45.0,
                "gimbal_pitch_deg": -35.0,
                "gimbal_yaw_deg": 150.0,
                "optical_zoom": "1.0x",
                "flir_mode": "THERMAL_BLACK_HOT",
                "ai_latency_ms": 16.1
            }
        ),
    }

    @classmethod
    def get_all_cameras(cls) -> List[CameraFeed]:
        return list(cls.CAMERAS.values())

    @classmethod
    def get_camera(cls, cam_id: str) -> CameraFeed:
        return cls.CAMERAS.get(cam_id, cls.CAMERAS["cam-drone-01"])

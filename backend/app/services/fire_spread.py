import math
from typing import List, Tuple, Dict, Any
from app.models.schemas import FireSpreadPolygon, ThreatLevel

class FireSpreadCalculator:
    """
    Rothermel & Elliptical Wildfire Propagation Model (FARSITE-compatible math)
    Computes isochrone perimeter polygons, rate of spread (ROS), and asset impact times.
    """

    METERS_PER_DEG_LAT = 111320.0

    @classmethod
    def get_meters_per_deg_lon(cls, lat: float) -> float:
        return 111320.0 * math.cos(math.radians(lat))

    @classmethod
    def calculate_spread(
        cls,
        center_lat: float,
        center_lon: float,
        wind_speed_ms: float,
        wind_direction_deg: float,  # Direction wind is coming FROM (0=N, 90=E, 180=S, 270=W)
        temperature_c: float = 32.0,
        humidity_pct: float = 24.0,
        fuel_type: str = "PINE_DRY",  # Pine forest like Semey Ormany
        slope_deg: float = 2.0,
        time_steps_min: List[int] = [0, 15, 30, 60, 120]
    ) -> List[FireSpreadPolygon]:
        """
        Generates fire propagation polygons for given time steps (in minutes).
        """
        # 1. Base rate of spread R0 (m/min) based on fuel moisture & type
        # Dry pine forest in summer heat has base forward rate ~ 2-5 m/min without wind
        moisture_factor = max(0.5, (100.0 - humidity_pct) / 75.0) * (temperature_c / 25.0)
        base_r0 = 3.5 * moisture_factor  # meters / min

        # 2. Wind factor (wind pushes fire TOWARDS (wind_direction_deg + 180) % 360)
        # Azimuth of fire heading:
        fire_heading_deg = (wind_direction_deg + 180.0) % 360.0
        fire_heading_rad = math.radians(fire_heading_deg)

        # Wind multiplier (Anderson / Rothermel empirical curve)
        # For wind speed U in m/s:
        phi_w = 0.9 * (wind_speed_ms ** 1.35)
        
        # Slope factor (uphill burns faster)
        phi_s = 5.275 * (math.tan(math.radians(slope_deg)) ** 2)

        # Head rate of spread (m/min)
        r_head = base_r0 * (1.0 + phi_w + phi_s)
        
        # Length-to-width ratio (L/W) of the fire ellipse
        # Higher wind = longer narrower ellipse
        lw_ratio = max(1.1, 1.0 + 0.18 * wind_speed_ms)
        
        # Backing rate of spread (into the wind, much slower)
        r_back = base_r0 * (math.exp(-0.05 * wind_speed_ms) / (1.0 + phi_w * 0.2))
        
        # Flank rate of spread
        r_flank = (r_head + r_back) / (2.0 * lw_ratio)

        meters_lon = cls.get_meters_per_deg_lon(center_lat)
        meters_lat = cls.METERS_PER_DEG_LAT

        polygons: List[FireSpreadPolygon] = []

        for t in time_steps_min:
            if t == 0:
                # Initial spot (e.g. 50m radius circle around ignition point)
                radius_m = 25.0
                coords = []
                for step in range(32):
                    ang = math.radians(step * (360.0 / 32))
                    d_lat = (radius_m * math.cos(ang)) / meters_lat
                    d_lon = (radius_m * math.sin(ang)) / meters_lon
                    coords.append([round(center_lat + d_lat, 6), round(center_lon + d_lon, 6)])
                coords.append(coords[0])  # Close polygon
                
                polygons.append(FireSpreadPolygon(
                    time_offset_min=0,
                    threat_level=ThreatLevel.LOW,
                    coordinates=coords,
                    area_ha=round((math.pi * (radius_m ** 2)) / 10000.0, 2),
                    estimated_perimeter_km=round((2 * math.pi * radius_m) / 1000.0, 2)
                ))
                continue

            # Forward distance from ignition point
            dist_head = r_head * t
            dist_back = r_back * t
            
            # Semi-major axis 'a' and center offset along the fire heading vector
            a = (dist_head + dist_back) / 2.0
            center_offset = (dist_head - dist_back) / 2.0
            
            # Semi-minor axis 'b'
            b = a / lw_ratio

            # Offset center in meters along heading
            center_offset_x = center_offset * math.sin(fire_heading_rad)  # Easting (lon)
            center_offset_y = center_offset * math.cos(fire_heading_rad)  # Northing (lat)

            # Generate parametric ellipse rotated by heading
            coords = []
            num_points = 36
            for i in range(num_points):
                theta = math.radians(i * (360.0 / num_points))
                # Unrotated ellipse centered at (0, 0)
                ex = b * math.cos(theta)
                ey = a * math.sin(theta)

                # Rotate by fire heading (heading is measured clockwise from North)
                # In standard math: x' = ex * cos(phi) + ey * sin(phi), y' = -ex * sin(phi) + ey * cos(phi)
                rx = ex * math.cos(fire_heading_rad) + ey * math.sin(fire_heading_rad)
                ry = -ex * math.sin(fire_heading_rad) + ey * math.cos(fire_heading_rad)

                # Total meters offset from initial ignition point
                total_x = center_offset_x + rx
                total_y = center_offset_y + ry

                pt_lat = center_lat + (total_y / meters_lat)
                pt_lon = center_lon + (total_x / meters_lon)
                coords.append([round(pt_lat, 6), round(pt_lon, 6)])

            coords.append(coords[0])  # close polygon loop

            # Calculate ellipse area in hectares: Area = pi * a * b (m^2) / 10000
            area_m2 = math.pi * a * b
            area_ha = round(area_m2 / 10000.0, 2)
            
            # Ramanujan approximation for ellipse perimeter
            h = ((a - b) ** 2) / ((a + b) ** 2)
            perimeter_m = math.pi * (a + b) * (1 + (3 * h) / (10 + math.sqrt(4 - 3 * h)))
            perimeter_km = round(perimeter_m / 1000.0, 2)

            threat = ThreatLevel.LOW
            if t >= 60 or area_ha > 50:
                threat = ThreatLevel.CRITICAL
            elif t >= 30 or area_ha > 15:
                threat = ThreatLevel.HIGH
            elif t >= 15:
                threat = ThreatLevel.MODERATE

            polygons.append(FireSpreadPolygon(
                time_offset_min=t,
                threat_level=threat,
                coordinates=coords,
                area_ha=area_ha,
                estimated_perimeter_km=perimeter_km
            ))

        return polygons

    @classmethod
    def estimate_time_to_asset(
        cls,
        fire_lat: float,
        fire_lon: float,
        asset_lat: float,
        asset_lon: float,
        wind_speed_ms: float,
        wind_direction_deg: float,
        temperature_c: float = 32.0,
        humidity_pct: float = 24.0
    ) -> Tuple[int, float]:
        """
        Calculates estimated time (minutes) and distance (km) for the fire front to reach an asset.
        """
        meters_lon = cls.get_meters_per_deg_lon(fire_lat)
        d_lat_m = (asset_lat - fire_lat) * cls.METERS_PER_DEG_LAT
        d_lon_m = (asset_lon - fire_lon) * meters_lon
        
        distance_m = math.sqrt(d_lat_m ** 2 + d_lon_m ** 2)
        distance_km = distance_m / 1000.0

        # Vector angle to asset
        bearing_rad = math.atan2(d_lon_m, d_lat_m)  # Clockwise from North
        bearing_deg = (math.degrees(bearing_rad) + 360.0) % 360.0

        fire_heading_deg = (wind_direction_deg + 180.0) % 360.0
        angle_diff_deg = abs(fire_heading_deg - bearing_deg)
        if angle_diff_deg > 180:
            angle_diff_deg = 360.0 - angle_diff_deg

        # Base and wind-driven ROS
        moisture_factor = max(0.5, (100.0 - humidity_pct) / 75.0) * (temperature_c / 25.0)
        base_r0 = 3.5 * moisture_factor
        phi_w = 0.9 * (wind_speed_ms ** 1.35)
        r_head = base_r0 * (1.0 + phi_w)
        r_back = base_r0 * (math.exp(-0.05 * wind_speed_ms) / (1.0 + phi_w * 0.2))

        # Directional effective ROS along the vector towards the asset
        cos_theta = math.cos(math.radians(angle_diff_deg))
        if cos_theta >= 0:
            effective_ros = r_back + (r_head - r_back) * (cos_theta ** 2)
        else:
            effective_ros = r_back * (abs(cos_theta) ** 0.5)

        effective_ros = max(0.5, effective_ros)  # minimum 0.5 m/min
        time_minutes = int(distance_m / effective_ros)

        return time_minutes, round(distance_km, 2)

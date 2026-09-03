export type ThreatLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'EXTREME';

export type UnitStatus = 'STANDBY' | 'DISPATCHED' | 'EN_ROUTE' | 'ON_SITE' | 'CONTAINING' | 'REFILLING';

export type DetectionClass = 'smoke' | 'fire' | 'vehicle' | 'human';

export interface BoundingBox {
  id: string;
  label: DetectionClass;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
  area_sq_m: number;
}

export interface CameraFeed {
  id: string;
  name: string;
  type: string;
  location_name: string;
  lat: number;
  lon: number;
  altitude_m?: number;
  status: string;
  fps: number;
  resolution: string;
  telemetry: Record<string, any>;
}

export interface WeatherData {
  temperature_c: number;
  wind_speed_ms: number;
  wind_direction_deg: number;
  wind_direction_label: string;
  humidity_percent: number;
  pressure_hpa: number;
  drought_index: number;
  forecast_summary: string;
}

export interface FireSpreadPolygon {
  time_offset_min: number;
  threat_level: ThreatLevel;
  coordinates: [number, number][];
  area_ha: number;
  estimated_perimeter_km: number;
}

export interface InterceptRoute {
  unit_id: string;
  unit_name: string;
  route_name: string;
  waypoints: [number, number][];
  start_name?: string;
  start_coords?: [number, number];
  target_name?: string;
  target_coords?: [number, number];
  estimated_arrival_minutes: number;
  safe_passage_clearance: string;
}

export interface DispatchPlan {
  approved: boolean;
  approved_at?: string;
  threat_level: ThreatLevel;
  ai_verdict: string;
  time_to_critical_asset_min: number;
  critical_asset_name: string;
  optimal_access_route: string;
  assigned_units: string[];
  intercept_routes: InterceptRoute[];
  action_items: string[];
}

export interface Incident {
  id: string;
  title: string;
  location_name: string;
  square_number: number;
  center_lat: number;
  center_lon: number;
  detected_at: string;
  status: string;
  area_sq_m: number;
  detection_confidence: number;
  camera_id: string;
  weather: WeatherData;
  spread_polygons: FireSpreadPolygon[];
  dispatch_plan: DispatchPlan;
  telemetry_log: { time: string; event: string }[];
}

export interface EmergencyUnit {
  id: string;
  name: string;
  callsign: string;
  unit_type: string;
  base_station: string;
  base_lat?: number;
  base_lon?: number;
  lat: number;
  lon: number;
  target_lat?: number;
  target_lon?: number;
  target_name?: string;
  status: UnitStatus;
  personnel_count: number;
  water_capacity_l?: number;
  water_current_l?: number;
  fuel_percent: number;
  speed_kmh: number;
  eta_minutes?: number;
}

export interface SystemState {
  incident: Incident | null;
  units: EmergencyUnit[];
  active_camera: CameraFeed;
  available_cameras: CameraFeed[];
  detections: BoundingBox[];
  weather: WeatherData | null;
  scenario_id: string;
}

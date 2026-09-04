import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { TacticalMap } from './components/TacticalMap';
import { VisionMonitor, type FireAlertInfo } from './components/VisionMonitor';
import { AIIncidentCard } from './components/AIIncidentCard';
import { ResourcePanel } from './components/ResourcePanel';
import { WeatherModal } from './components/WeatherModal';
import { DroneVideoUploadModal } from './components/DroneVideoUploadModal';
import type { SystemState } from './types';
import { resolveDroneMedia } from './droneMedia';
import { DroneMedia } from './components/DroneMedia';
import { 
  Map as MapIcon, 
  Camera, 
  FileText, 
  Flame, 
  CheckCircle2, 
  Radio, 
  Plus, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Upload,
  Maximize2,
  Minimize2,
  Siren,
  X
} from 'lucide-react';

type MainView = 'map' | 'vision' | 'logs';
type DrawerTab = 'incident' | 'resources' | 'cameras';

export const App: React.FC = () => {
  const [state, setState] = useState<SystemState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState<boolean>(false);

  // Медиаисточники бортов (default/загруженные оператором) с сервера
  const [droneMedia, setDroneMedia] = useState<Record<string, string>>({});
  // Тревога «обнаружен пожар»
  const [fireAlert, setFireAlert] = useState<FireAlertInfo | null>(null);
  const [alarmPhase, setAlarmPhase] = useState<'idle' | 'ask' | 'sending' | 'sent' | 'error'>('idle');

  // Clean workspace state
  const [mainView, setMainView] = useState<MainView>('map');
  const [drawerOpen, setDrawerOpen] = useState<boolean>(true);
  const [activeDrawerTab, setActiveDrawerTab] = useState<DrawerTab>('incident');
  const [pipOpen, setPipOpen] = useState<boolean>(true); // Picture-in-picture mini UAV widget on map
  // Борт, для которого открыто окно загрузки видео (null = окно закрыто)
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Актуальный видеопоток борта: загрузка оператора > файл по умолчанию
  const mediaUrlFor = (cameraId?: string | null) => {
    const id = cameraId ?? '';
    return droneMedia[id] || resolveDroneMedia(id || undefined);
  };

  const refreshDroneMedia = async () => {
    try {
      const res = await fetch('/api/vision/media');
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<string, string> = {};
      (data.cameras || []).forEach((c: any) => { if (c.url) map[c.camera_id] = c.url; });
      setDroneMedia(map);
    } catch {
      // backend недоступен — остаёмся на статическом маппинге
    }
  };

  // Web Audio chime generator for dispatch sound feedback
  const playTacticalSound = (type: 'ALERT' | 'CONFIRM') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'ALERT') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn('Audio context not allowed yet', e);
    }
  };

  // Initial HTTP Fetch (список медиа бортов — чтобы PIP/превью показывали загруженные видео)
  useEffect(() => {
    refreshDroneMedia();
  }, []);

  // Initial HTTP Fetch
  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch (err) {
      console.error('Failed to fetch initial state:', err);
    }
  };

  // WebSocket Connection Setup
  useEffect(() => {
    fetchState();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    let reconnectTimer: any = null;
    let isUnmounted = false;

    const connectWebSocket = () => {
      if (isUnmounted) return;
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isUnmounted) setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.state && !isUnmounted) {
              setState(payload.state);
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
          }
        };

        ws.onclose = () => {
          if (!isUnmounted) {
            setIsConnected(false);
            reconnectTimer = setTimeout(connectWebSocket, 3000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (e) {
        console.warn('WS Init failed', e);
      }
    };

    connectWebSocket();

    return () => {
      isUnmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Dispatch Approval Action
  const handleApproveDispatch = async () => {
    if (!state?.incident) return;
    setIsApproving(true);
    playTacticalSound('CONFIRM');

    try {
      const res = await fetch(`/api/incidents/${state.incident.id}/approve`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Dispatch approved successfully:', data);
      }
    } catch (err) {
      console.error('Failed to approve dispatch:', err);
    } finally {
      setIsApproving(false);
    }
  };

  // Switch Active Camera
  const handleSelectCamera = async (cameraId: string) => {
    try {
      await fetch('/api/cameras/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camera_id: cameraId })
      });
    } catch (err) {
      console.error('Failed to switch camera:', err);
    }
  };

  // Reset Demo Scenario
  const handleResetScenario = async () => {
    try {
      playTacticalSound('ALERT');
      await fetch('/api/scenarios/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: 'semey-ormany-sq45' })
      });
    } catch (err) {
      console.error('Failed to reset scenario:', err);
    }
  };

  // Тревога: пожар подтверждён моделью на одном из бортов
  const handleFireDetected = (alert: FireAlertInfo) => {
    playTacticalSound('ALERT');
    setFireAlert(alert);
    setAlarmPhase('ask');
  };

  const handleFireDismiss = () => {
    setFireAlert(null);
    setAlarmPhase('idle');
  };

  // Оператор принял решение: направить силы на обнаруженный очаг
  const handleFireSendForces = async () => {
    if (!fireAlert) return;
    setAlarmPhase('sending');
    try {
      const alertRes = await fetch('/api/vision/fire-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camera_id: fireAlert.cameraId, confidence: fireAlert.confidence })
      });
      if (!alertRes.ok) throw new Error();
      const alertData = await alertRes.json();
      const incidentId = alertData.incident?.id || state?.incident?.id;
      if (incidentId) {
        const approveRes = await fetch(`/api/incidents/${incidentId}/approve`, { method: 'POST' });
        if (!approveRes.ok) throw new Error();
      }
      playTacticalSound('CONFIRM');
      setAlarmPhase('sent');
    } catch {
      setAlarmPhase('error');
    }
  };

  // Update Weather Parameters
  const handleUpdateWeather = async (
    windSpeed: number,
    windDir: number,
    temp: number,
    humidity: number
  ) => {
    try {
      await fetch('/api/weather/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wind_speed_ms: windSpeed,
          wind_direction_deg: windDir,
          temperature_c: temp,
          humidity_percent: humidity
        })
      });
    } catch (err) {
      console.error('Failed to update weather:', err);
    }
  };

  const incident = state?.incident;
  const isApproved = incident?.dispatch_plan.approved;

  return (
    <div className="h-screen w-screen flex bg-[#f8fafc] text-slate-800 font-sans overflow-hidden select-none">
      
      {/* 1. Left Vertical Slim App-Launcher Sidebar */}
      <aside className="w-16 bg-[#162a45] text-white flex flex-col items-center py-4 border-r border-[#1e3a5f] shrink-0 z-30">
        
        {/* Emblem / Logo */}
        <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-6 shadow-sm">
          <Flame className="w-5 h-5 text-amber-400" />
        </div>

        {/* Primary View Switchers */}
        <div className="flex flex-col gap-3 w-full px-2">
          
          <button
            onClick={() => setMainView('map')}
            title="Геоинформационная тактическая карта"
            className={`w-full py-3 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              mainView === 'map'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <MapIcon className="w-5 h-5" />
          </button>

          <button
            onClick={() => setMainView('vision')}
            title="Видеомониторинг БПЛА (Прямой эфир)"
            className={`w-full py-3 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
              mainView === 'vision'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Camera className="w-5 h-5" />
            {state?.detections && state.detections.length > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[#162a45] animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setMainView('logs')}
            title="Журнал аудита оператора"
            className={`w-full py-3 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              mainView === 'logs'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <FileText className="w-5 h-5" />
          </button>

        </div>

        {/* Bottom Quick Config */}
        <div className="mt-auto flex flex-col gap-3">
          <button 
            onClick={() => setIsWeatherModalOpen(true)}
            title="Метеопараметры (Казгидромет)"
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Top Navigation Header */}
        <Header
          weather={state?.weather || null}
          onResetScenario={handleResetScenario}
          onOpenWeatherModal={() => setIsWeatherModalOpen(true)}
          isConnected={isConnected}
        />

        {/* Secondary Sub-Header: Mode Selector & Quick Action Drawer Toggle */}
        <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between z-20 shrink-0 shadow-2xs">
          
          {/* Main Display Switcher (Map / Vision / Audit) */}
          <div className="flex items-center gap-2">
            
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setMainView('map')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mainView === 'map'
                    ? 'bg-[#1e3a5f] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Тактическая карта</span>
              </button>

              <button
                onClick={() => setMainView('vision')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mainView === 'vision'
                    ? 'bg-[#1e3a5f] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>БПЛА Видеомониторинг</span>
              </button>

              <button
                onClick={() => setMainView('logs')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mainView === 'logs'
                    ? 'bg-[#1e3a5f] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Журнал аудита</span>
              </button>
            </div>

            {/* Quick UAV Active Stream Status */}
            {mainView === 'map' && (
              <button
                onClick={() => setMainView('vision')}
                className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>{state?.active_camera?.name || 'БПЛА «Альфа»'} (30 FPS)</span>
              </button>
            )}

          </div>

          {/* Right Side: Quick Action & Sidebar Drawer Toggle */}
          <div className="flex items-center gap-3">
            
            {/* Quick Dispatch Approval */}
            {!isApproved ? (
              <button
                onClick={handleApproveDispatch}
                disabled={isApproving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#059669] hover:bg-[#047857] active:scale-[0.98] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Утвердить выезд сил</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>План утвержден</span>
              </div>
            )}

            {/* Toggle Side Panel Button */}
            <button
              onClick={() => setDrawerOpen(!drawerOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                drawerOpen
                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {drawerOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              <span>{drawerOpen ? 'Скрыть панель' : 'Оперативная панель'}</span>
            </button>

          </div>

        </div>

        {/* 3. Center Screen + Side Drawer Workspace */}
        <div className="flex-1 flex relative overflow-hidden bg-slate-100">
          
          {/* Main Visual Display (Maximized Map / Vision / Logs) */}
          <div className="flex-1 p-4 h-full overflow-hidden flex flex-col relative">
            
            {mainView === 'map' && (
              <div className="w-full h-full hub-card overflow-hidden relative">
                <TacticalMap
                  incident={state?.incident || null}
                  units={state?.units || []}
                  weather={state?.weather || null}
                />

                {/* Picture-in-Picture (PIP) Floating Live UAV Camera Widget */}
                {pipOpen && (
                  <div className="absolute bottom-4 left-4 z-[1000] w-72 bg-slate-950/90 backdrop-blur-md rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden pointer-events-auto flex flex-col">
                    <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs text-white">
                      <div className="flex items-center gap-1.5 font-bold text-[11px] text-sky-400">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <span>{state?.active_camera?.name || 'БПЛА «Альфа»'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => setMainView('vision')}
                          title="Развернуть во весь экран"
                          className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setPipOpen(false)}
                          title="Скрыть мини-окно"
                          className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white cursor-pointer"
                        >
                          <Minimize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div 
                      onClick={() => setMainView('vision')}
                      className="h-40 bg-black cursor-pointer relative group flex items-center justify-center overflow-hidden"
                    >
                      <DroneMedia
                        src={mediaUrlFor(state?.active_camera?.id)}
                        fallbackSrc="https://images.unsplash.com/photo-1602980085566-4c715cbd77e3?auto=format&fit=crop&w=600&q=80"
                        alt="БПЛА Поток"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                        Нажмите для перехода к БПЛА
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {mainView === 'vision' && (
              <div className="w-full h-full hub-card overflow-hidden">
                <VisionMonitor
                  activeCamera={state?.active_camera || null}
                  availableCameras={state?.available_cameras || []}
                  onSelectCamera={handleSelectCamera}
                  onFireDetected={handleFireDetected}
                  serverMedia={droneMedia}
                  onRequestUpload={() => setUploadTargetId(state?.active_camera?.id ?? null)}
                />
              </div>
            )}

            {mainView === 'logs' && (
              <div className="w-full h-full hub-card p-6 overflow-y-auto">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-5 h-5 text-blue-700" />
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Реестр оперативных событий и решений ИИ
                      </h2>
                      <p className="text-xs text-slate-500">
                        Журнал аудита действий диспетчера и телеметрии
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                    Всего записей: {incident?.telemetry_log?.length || 0}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100/80 text-slate-500 font-bold uppercase text-[11px] rounded-t-xl">
                      <tr>
                        <th className="py-3 px-4 rounded-l-xl">№ / Время</th>
                        <th className="py-3 px-4">Событие / Описание</th>
                        <th className="py-3 px-4">Инициатор</th>
                        <th className="py-3 px-4 rounded-r-xl text-right">Статус</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {incident?.telemetry_log && incident.telemetry_log.length > 0 ? (
                        incident.telemetry_log.map((log, index) => (
                          <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-blue-700">
                              [{log.time}]
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-900">
                              {log.event}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] flex items-center justify-center border border-blue-200">
                                  ИИ
                                </div>
                                <span>СҰҢҚАР Core</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                Утвержден
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center py-10 text-slate-400">
                            Журнал пуст
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

          {/* Right Slideout Operational Drawer */}
          {drawerOpen && (
            <div className="w-[430px] bg-white border-l border-slate-200 flex flex-col h-full z-20 shrink-0 shadow-lg">
              
              {/* Drawer Category Tabs */}
              <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex items-center gap-1.5">
                <button
                  onClick={() => setActiveDrawerTab('incident')}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    activeDrawerTab === 'incident'
                      ? 'bg-white text-blue-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Карточка ИИ
                </button>

                <button
                  onClick={() => setActiveDrawerTab('resources')}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    activeDrawerTab === 'resources'
                      ? 'bg-white text-blue-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Силы МЧС ({state?.units?.length || 0})
                </button>

                <button
                  onClick={() => setActiveDrawerTab('cameras')}
                  className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    activeDrawerTab === 'cameras'
                      ? 'bg-white text-blue-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Камеры БПЛА
                </button>
              </div>

              {/* Drawer Body Content */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                
                {/* 1. Incident Details */}
                {activeDrawerTab === 'incident' && (
                  <div className="space-y-4">
                    <AIIncidentCard
                      incident={state?.incident || null}
                      onApproveDispatch={handleApproveDispatch}
                      isApproving={isApproving}
                    />

                    {/* Quick Audit Stream in Drawer */}
                    <div className="hub-card p-3.5 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-900 uppercase">Последние события</span>
                        <span className="text-[10px] text-slate-500 font-mono">АУДИТ</span>
                      </div>
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                        {incident?.telemetry_log?.slice(-4).map((log, index) => (
                          <div key={index} className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-xs text-slate-700">
                            <span className="font-mono text-blue-700 font-bold mr-1.5">[{log.time}]</span>
                            <span>{log.event}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Resources & Fleet Details */}
                {activeDrawerTab === 'resources' && (
                  <ResourcePanel
                    units={state?.units || []}
                    incident={state?.incident || null}
                  />
                )}

                {/* 3. UAV & Camera Feeds Switcher Tab */}
                {activeDrawerTab === 'cameras' && (
                  <div className="space-y-3.5">
                    
                    {/* Active Drone Card with Preview & Direct Action */}
                    <div className="hub-card p-4 shadow-xs space-y-3 border-blue-200/60 bg-blue-50/30">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Camera className="w-4 h-4 text-blue-700" />
                          <span>Активный видеопоток</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          В ЭФИРЕ
                        </span>
                      </div>

                      {/* Mini Video/GIF Preview */}
                      <div 
                        onClick={() => setMainView('vision')}
                        className="h-36 rounded-xl bg-black overflow-hidden relative cursor-pointer group shadow-inner"
                      >
                        <DroneMedia
                          src={mediaUrlFor(state?.active_camera?.id)}
                          fallbackSrc="https://images.unsplash.com/photo-1602980085566-4c715cbd77e3?auto=format&fit=crop&w=600&q=80"
                          alt="Мини-превью"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                          Перейти в режим видеоаналитики
                        </div>
                        <div className="absolute bottom-2 left-2 bg-slate-900/80 px-2 py-0.5 rounded text-[10px] font-mono text-white">
                          {state?.active_camera?.name}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => setMainView('vision')}
                          className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>На весь экран</span>
                        </button>

                        <button
                          onClick={() => setUploadTargetId(state?.active_camera?.id ?? null)}
                          className="py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5 text-blue-700" />
                          <span>Видео на борт</span>
                        </button>
                      </div>
                    </div>

                    {/* Camera Switcher List */}
                    <div className="hub-card p-4 shadow-2xs space-y-2.5">
                      <div className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                        Список бортов и камер:
                      </div>

                      <div className="space-y-2 text-xs text-slate-700">
                        {state?.available_cameras?.map((cam) => {
                          const isSelected = state?.active_camera?.id === cam.id;
                          return (
                            <div
                              key={cam.id}
                              onClick={() => handleSelectCamera(cam.id)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50/90 border-blue-400 text-blue-950 shadow-xs'
                                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold text-xs mb-1">
                                <span className="flex items-center gap-1.5">
                                  <Camera className="w-3.5 h-3.5 text-blue-700" />
                                  <span>{cam.name}</span>
                                </span>
                                {isSelected ? (
                                  <span className="text-[10px] text-blue-700 font-bold px-1.5 py-0.5 rounded bg-white border border-blue-200">
                                    Активен
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Переключить</span>
                                )}
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[11px] text-slate-500">Локация: {cam.location_name}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUploadTargetId(cam.id);
                                  }}
                                  className="flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-blue-900 px-1.5 py-0.5 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                                  title={`Загрузить видео на ${cam.name}`}
                                >
                                  <Upload className="w-3 h-3" />
                                  Видео
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sensor Specs */}
                    <div className="hub-card p-4 shadow-2xs text-xs space-y-2 text-slate-700">
                      <div className="font-bold text-slate-900 uppercase tracking-wider pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-blue-700" />
                        <span>Телеметрия канала</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Нейросеть:</span>
                        <span className="font-mono text-emerald-700 font-bold">YOLOv8n-Fire (D-Fire)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Выборка:</span>
                        <span className="font-mono text-slate-900 font-bold">4 кадра/с (CPU, анализ фоновый)</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Сенсор:</span>
                        <span className="font-mono text-slate-900 font-bold">4K UHD + FLIR LWIR</span>
                      </div>
                    </div>

                  </div>
                )}

              </div>

            </div>
          )}

        </div>

      </div>

      {/* Окно загрузки видео на конкретный борт */}
      <DroneVideoUploadModal
        open={uploadTargetId !== null}
        preselectedCameraId={uploadTargetId}
        cameras={state?.available_cameras ?? []}
        onClose={() => setUploadTargetId(null)}
        onUploaded={(cameraId, url) => {
          // Версия в URL, чтобы повторная загрузка того же файла
          // перезапустила анализ и тревогу, а браузер не отдал кэш
          const stamped = url.startsWith('/videos/') && !url.includes('?')
            ? `${url}?v=${Date.now()}`
            : url;
          setDroneMedia((m) => ({ ...m, [cameraId]: stamped }));
        }}
      />

      {/* Meteorological Simulator Modal */}
      <WeatherModal
        isOpen={isWeatherModalOpen}
        onClose={() => setIsWeatherModalOpen(false)}
        weather={state?.weather || null}
        onUpdateWeather={handleUpdateWeather}
      />

      {/* Тревога: модель обнаружила пожар на борту */}
      {fireAlert && alarmPhase !== 'idle' && (
        <div className="fixed inset-0 z-[300] flex items-start justify-center p-6 bg-slate-950/70 backdrop-blur-xs">
          <div className={`w-full max-w-lg rounded-2xl border-2 shadow-2xl overflow-hidden ${
            alarmPhase === 'sent' ? 'border-emerald-400' : 'border-rose-500'
          }`}>
            
            {/* Header */}
            <div className={`px-5 py-4 flex items-center gap-3 ${alarmPhase === 'sent' ? 'bg-emerald-600' : 'bg-rose-600'} text-white`}>
              <div className={`p-2 rounded-xl ${alarmPhase === 'sent' ? 'bg-emerald-700' : 'bg-rose-700/70'} animate-pulse`}>
                <Siren className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <div className="font-extrabold text-sm uppercase tracking-widest">
                  {alarmPhase === 'sent' ? 'Силы направлены' : alarmPhase === 'error' ? 'Ошибка вызова' : 'Обнаружен пожар'}
                </div>
                <div className="text-[11px] text-white/85 font-semibold">
                  {fireAlert.cameraName} • {fireAlert.locationName}
                </div>
              </div>
              {alarmPhase !== 'sending' && (
                <button onClick={handleFireDismiss} className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="px-5 py-5 bg-white space-y-4">
              {alarmPhase === 'ask' && (
                <>
                  <div className="flex items-end gap-3">
                    <div>
                      <div className="text-3xl font-black text-rose-600">
                        {(fireAlert.confidence * 100).toFixed(0)}%
                      </div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        уверенность модели
                      </div>
                    </div>
                    <div className="flex-1 text-xs text-slate-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                      YOLOv8n-Fire подтвердила открытый огонь в видеопотоке борта. Направить силы МЧС к очагу?
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={handleFireSendForces}
                      className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-[0.99]"
                    >
                      <Siren className="w-4 h-4 animate-pulse" />
                      Тревога — направить силы
                    </button>
                    <button
                      onClick={handleFireDismiss}
                      className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Не направлять силы
                    </button>
                  </div>
                </>
              )}

              {alarmPhase === 'sending' && (
                <div className="text-sm font-bold text-slate-700 text-center py-4">
                  <span className="inline-block w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mr-2 align-middle" />
                  Поднимаем силы МЧС…
                </div>
              )}

              {alarmPhase === 'sent' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    Боевой план утверждён — расчёты выдвигаются к очагу.
                  </div>
                  <button
                    onClick={handleFireDismiss}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Готово
                  </button>
                </div>
              )}

              {alarmPhase === 'error' && (
                <div className="space-y-3">
                  <div className="text-sm font-bold text-rose-600">Не удалось отправить силы. Backend доступен?</div>
                  <button
                    onClick={() => setAlarmPhase('ask')}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Попробовать снова
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { TacticalMap } from './components/TacticalMap';
import { VisionMonitor } from './components/VisionMonitor';
import { AIIncidentCard } from './components/AIIncidentCard';
import { ResourcePanel } from './components/ResourcePanel';
import { WeatherModal } from './components/WeatherModal';
import type { SystemState } from './types';

export const App: React.FC = () => {
  const [state, setState] = useState<SystemState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

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
        // Confirmation chime (two pleasant high tones)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn('Audio context not allowed yet', e);
    }
  };

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

    const connectWebSocket = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Sunkar AI WebSocket connected.');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.state) {
            setState(payload.state);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        console.warn('Sunkar AI WebSocket disconnected. Retrying in 2s...');
        setIsConnected(false);
        reconnectTimer = setTimeout(connectWebSocket, 2000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket encountered error:', err);
        ws.close();
      };
    };

    connectWebSocket();

    return () => {
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

  return (
    <div className="min-h-screen flex flex-col bg-[#050811] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Header */}
      <Header
        weather={state?.weather || null}
        onResetScenario={handleResetScenario}
        onOpenWeatherModal={() => setIsWeatherModalOpen(true)}
        isConnected={isConnected}
      />

      {/* Main War Room Command Center Layout */}
      <main className="flex-1 p-3.5 max-w-[1920px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        
        {/* Left / Center: Tactical Map & Live Vision Monitor */}
        <div className="lg:col-span-7 flex flex-col gap-3.5">
          {/* Tactical 2.5D Map */}
          <div className="flex-1 min-h-[460px]">
            <TacticalMap
              incident={state?.incident || null}
              units={state?.units || []}
              weather={state?.weather || null}
            />
          </div>

          {/* Sunkar Vision Live Monitor */}
          <div className="h-[390px]">
            <VisionMonitor
              activeCamera={state?.active_camera || null}
              availableCameras={state?.available_cameras || []}
              detections={state?.detections || []}
              onSelectCamera={handleSelectCamera}
            />
          </div>
        </div>

        {/* Right Column: AI Decision Card & MES Fleet Management */}
        <div className="lg:col-span-5 flex flex-col gap-3.5">
          {/* Autonomous AI Incident Card */}
          <AIIncidentCard
            incident={state?.incident || null}
            onApproveDispatch={handleApproveDispatch}
            isApproving={isApproving}
          />

          {/* Emergency Fleet & Incident Telemetry Audit */}
          <div className="flex-1">
            <ResourcePanel
              units={state?.units || []}
              incident={state?.incident || null}
            />
          </div>
        </div>

      </main>

      {/* Meteorological Simulator Modal */}
      <WeatherModal
        isOpen={isWeatherModalOpen}
        onClose={() => setIsWeatherModalOpen(false)}
        weather={state?.weather || null}
        onUpdateWeather={handleUpdateWeather}
      />

    </div>
  );
};

export default App;

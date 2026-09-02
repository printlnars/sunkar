import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.core.ws_manager import ws_manager
from app.services.simulation import simulation_engine
from app.services.vision_stream import VisionStreamService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sunkar.main")

async def background_telemetry_loop():
    """
    Simulates real-time telemetry updates and vehicle movements
    """
    while True:
        try:
            await asyncio.sleep(1.5)
            # If units are dispatched, slightly animate their movement towards targets
            if simulation_engine.incident and simulation_engine.incident.dispatch_plan.approved:
                for uid, unit in simulation_engine.emergency_units.items():
                    if unit.target_lat and unit.target_lon:
                        # Move 5% closer to target each tick
                        d_lat = unit.target_lat - unit.lat
                        d_lon = unit.target_lon - unit.lon
                        if abs(d_lat) > 0.0005 or abs(d_lon) > 0.0005:
                            unit.lat += d_lat * 0.04
                            unit.lon += d_lon * 0.04
                            if unit.eta_minutes and unit.eta_minutes > 1:
                                unit.eta_minutes -= 1

            # Broadcast live pulse to all connected UI clients
            await ws_manager.broadcast({
                "type": "TICK",
                "state": simulation_engine.get_full_state()
            })
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in background telemetry loop: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Sunkar AI Backend...")
    task = asyncio.create_task(background_telemetry_loop())
    yield
    logger.info("Shutting down Sunkar AI Backend...")
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="Sunkar AI — Autonomous Wildfire Defense System",
    description="Backend API and AI Reasoning Engine for Kazakhstan Wildfire Monitoring & Dispatch",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    # Send initial state immediately upon connection
    await websocket.send_text(
        json_dumps_state(simulation_engine.get_full_state())
    )
    try:
        while True:
            data = await websocket.receive_text()
            # Handle client-side commands if sent over WS
            pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)

def json_dumps_state(state: dict) -> str:
    import json
    return json.dumps({
        "type": "INIT_STATE",
        "state": state
    }, default=str)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

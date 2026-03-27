import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .core.config import settings

# Import Routers
from .routers import health, dataset, anomalies, reports, chat, feedback, predictions, alerts
from .services.ml_service import ml_service
from .services.redis_service import redis_service

app = FastAPI(title=settings.PROJECT_NAME)

# 1. CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Expand appropriately in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Database schema binding
Base.metadata.create_all(bind=engine)

# 3. Router Includes
app.include_router(health.router)
app.include_router(dataset.router)
app.include_router(anomalies.router)
app.include_router(reports.router)
app.include_router(chat.router)
app.include_router(feedback.router)
app.include_router(predictions.router)
app.include_router(alerts.router)

# 4. App Startup Events Configuration
@app.on_event("startup")
async def startup_event():
    """Async app startup structure initialization."""
    try:
        # Ensure ML model loads on start
        ml_service.initialize_model()
    except Exception as e:
        print(f"Warning: ML service failed to initialize: {e}")

# 5. WebSocket Endpoint for Real-time Streaming 
@app.websocket("/ws/stream")
async def websocket_anomaly_stream(websocket: WebSocket):
    """
    Subscribes to Redis Pub/Sub directly to push anomalies and data flows 
    to frontend asynchronously avoiding blocking REST threads.
    """
    await websocket.accept()
    pubsub = redis_service.redis_client.pubsub()
    pubsub.subscribe("anomalies_stream")
    
    try:
        while True:
            # Check redis message queue
            message = pubsub.get_message(ignore_subscribe_messages=True)
            if message:
                data = message['data'].decode("utf-8")
                await websocket.send_text(data)
            await asyncio.sleep(0.05) # Prevent 100% CPU lock while async polling
    except WebSocketDisconnect:
        pubsub.unsubscribe("anomalies_stream")
        print("Frontend WebSocket disconnected")

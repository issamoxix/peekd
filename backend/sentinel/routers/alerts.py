"""
Alerts Router - SSE endpoint
"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import json
import asyncio

from services.alert_service import alert_manager

router = APIRouter()


@router.get("/alerts/stream")
async def alert_stream():
    """
    Server-Sent Events endpoint for real-time alerts
    Clients connect to this endpoint to receive live updates
    """
    async def event_generator():
        queue = await alert_manager.subscribe()
        try:
            while True:
                # Wait for new event
                event = await queue.get()
                
                # Format as SSE
                event_type = event.get("type", "message")
                event_data = json.dumps(event.get("data", {}))
                
                yield f"event: {event_type}\ndata: {event_data}\n\n"
        
        except asyncio.CancelledError:
            # Client disconnected
            pass
        finally:
            await alert_manager.unsubscribe(queue)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


@router.get("/alerts/status")
async def get_alert_status():
    """Get alert system status"""
    return {
        "status": "online",
        "subscribers": alert_manager.get_subscriber_count()
    }

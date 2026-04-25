"""
Alert Service - SSE (Server-Sent Events) broadcaster
"""
import asyncio
from typing import Dict, Any, Set
import json


class AlertManager:
    """Manages real-time alerts via SSE"""
    
    def __init__(self):
        self.subscribers: Set[asyncio.Queue] = set()
    
    async def subscribe(self) -> asyncio.Queue:
        """Subscribe to alert stream"""
        queue = asyncio.Queue()
        self.subscribers.add(queue)
        return queue
    
    async def unsubscribe(self, queue: asyncio.Queue):
        """Unsubscribe from alert stream"""
        self.subscribers.discard(queue)
    
    async def broadcast(self, event: Dict[str, Any]):
        """
        Broadcast event to all subscribers
        
        Args:
            event: Event data with 'type' and 'data' keys
        """
        # Remove closed queues
        dead_queues = set()
        
        for queue in self.subscribers:
            try:
                await queue.put(event)
            except Exception:
                dead_queues.add(queue)
        
        # Clean up dead queues
        self.subscribers -= dead_queues
    
    def get_subscriber_count(self) -> int:
        """Get number of active subscribers"""
        return len(self.subscribers)


# Global alert manager instance
alert_manager = AlertManager()

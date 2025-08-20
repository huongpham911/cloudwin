from typing import Dict, List, Set
from fastapi import WebSocket, WebSocketDisconnect
from uuid import UUID
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        # Store active connections by user ID
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Store user ID by connection for reverse lookup
        self.connection_users: Dict[WebSocket, str] = {}
    
    async def connect(self, websocket: WebSocket, user_id: UUID):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        user_id_str = str(user_id)
        
        if user_id_str not in self.active_connections:
            self.active_connections[user_id_str] = []
        
        self.active_connections[user_id_str].append(websocket)
        self.connection_users[websocket] = user_id_str
        
        logger.info(f"User {user_id} connected via WebSocket")
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        user_id = self.connection_users.get(websocket)
        if user_id:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
            del self.connection_users[websocket]
            logger.info(f"User {user_id} disconnected from WebSocket")
    
    async def send_personal_message(self, message: str, user_id: UUID):
        """Send a message to all connections of a specific user"""
        user_id_str = str(user_id)
        if user_id_str in self.active_connections:
            disconnected = []
            for connection in self.active_connections[user_id_str]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    disconnected.append(connection)
            
            # Clean up disconnected connections
            for conn in disconnected:
                self.disconnect(conn)
    
    async def send_json(self, data: dict, user_id: UUID):
        """Send JSON data to a specific user"""
        await self.send_personal_message(json.dumps(data), user_id)
    
    async def broadcast_to_user(self, user_id: UUID, event_type: str, data: dict):
        """Broadcast an event to all connections of a user"""
        message = {
            "type": event_type,
            "data": data
        }
        await self.send_json(message, user_id)
    
    async def send_droplet_update(self, user_id: UUID, droplet_id: UUID, update_data: dict):
        """Send droplet update to user"""
        await self.broadcast_to_user(
            user_id,
            "droplet_update",
            {
                "droplet_id": str(droplet_id),
                **update_data
            }
        )
    
    async def send_build_progress(self, user_id: UUID, droplet_id: UUID, progress: int, 
                                 status: str, message: str = None):
        """Send build progress update to user"""
        await self.broadcast_to_user(
            user_id,
            "build_progress",
            {
                "droplet_id": str(droplet_id),
                "progress": progress,
                "status": status,
                "message": message
            }
        )


# Global WebSocket manager instance
manager = ConnectionManager()

import json
import logging
from typing import Dict, List, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Store active connections by user_id
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Store connection metadata
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        
    async def connect(self, websocket: WebSocket, user_id: int, client_info: Optional[Dict] = None):
        """Accept WebSocket connection and store by user_id"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        
        self.active_connections[user_id].append(websocket)
        self.connection_metadata[websocket] = {
            "user_id": user_id,
            "connected_at": datetime.utcnow(),
            "client_info": client_info or {}
        }
        
        logger.info(f"WebSocket connected for user {user_id}")
        
        # Send welcome message
        await self.send_to_connection(websocket, {
            "type": "connection_established",
            "message": "WebSocket connected successfully",
            "timestamp": datetime.utcnow().isoformat()
        })

    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        if websocket in self.connection_metadata:
            user_id = self.connection_metadata[websocket]["user_id"]
            
            # Remove from active connections
            if user_id in self.active_connections:
                if websocket in self.active_connections[user_id]:
                    self.active_connections[user_id].remove(websocket)
                
                # Clean up empty user connection list
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            
            # Remove metadata
            del self.connection_metadata[websocket]
            logger.info(f"WebSocket disconnected for user {user_id}")

    async def send_to_connection(self, websocket: WebSocket, data: Dict[str, Any]):
        """Send data to specific WebSocket connection"""
        try:
            await websocket.send_text(json.dumps(data, default=str))
        except Exception as e:
            logger.error(f"Failed to send WebSocket message: {e}")
            self.disconnect(websocket)

    async def send_to_user(self, user_id: int, data: Dict[str, Any]):
        """Send data to all connections of a specific user"""
        if user_id not in self.active_connections:
            logger.warning(f"No active connections for user {user_id}")
            return
        
        # Add timestamp to message
        data["timestamp"] = datetime.utcnow().isoformat()
        
        # Send to all user's connections
        disconnected_connections = []
        for websocket in self.active_connections[user_id]:
            try:
                await websocket.send_text(json.dumps(data, default=str))
            except Exception as e:
                logger.error(f"Failed to send to user {user_id}: {e}")
                disconnected_connections.append(websocket)
        
        # Clean up failed connections
        for websocket in disconnected_connections:
            self.disconnect(websocket)

    async def broadcast_to_all(self, data: Dict[str, Any]):
        """Broadcast message to all connected users"""
        data["timestamp"] = datetime.utcnow().isoformat()
        
        for user_id in list(self.active_connections.keys()):
            await self.send_to_user(user_id, data)

    async def send_build_progress(self, user_id: int, droplet_id: int, progress: int, message: str):
        """Send build progress update"""
        await self.send_to_user(user_id, {
            "type": "build_progress",
            "droplet_id": droplet_id,
            "progress": progress,
            "message": message
        })

    async def send_build_complete(self, user_id: int, droplet_id: int, ip_address: str):
        """Send build completion notification"""
        await self.send_to_user(user_id, {
            "type": "build_complete",
            "droplet_id": droplet_id,
            "ip_address": ip_address,
            "rdp_port": 3389,
            "message": "Windows build completed successfully!"
        })

    async def send_build_failed(self, user_id: int, droplet_id: int, error: str):
        """Send build failure notification"""
        await self.send_to_user(user_id, {
            "type": "build_failed",
            "droplet_id": droplet_id,
            "error": error,
            "message": "Windows build failed"
        })

    async def send_system_alert(self, user_id: int, alert_type: str, message: str, severity: str = "info"):
        """Send system alert to user"""
        await self.send_to_user(user_id, {
            "type": "system_alert",
            "alert_type": alert_type,
            "message": message,
            "severity": severity
        })

    def get_user_connections_count(self, user_id: int) -> int:
        """Get number of active connections for user"""
        return len(self.active_connections.get(user_id, []))

    def get_total_connections(self) -> int:
        """Get total number of active connections"""
        return sum(len(connections) for connections in self.active_connections.values())

    def get_connected_users(self) -> List[int]:
        """Get list of users with active connections"""
        return list(self.active_connections.keys())

# Global WebSocket manager instance
websocket_manager = ConnectionManager()
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from jose import JWTError
import logging

from app.api.deps import get_db
from app.core.security import decode_token
from app.core.websocket import manager
from app.models import User

router = APIRouter()
logger = logging.getLogger(__name__)


async def get_current_user_ws(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
) -> User:
    """Authenticate user from WebSocket connection"""
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        token_type = payload.get("type")
        
        if user_id is None or token_type != "access":
            await websocket.close(code=4001, reason="Invalid token")
            return None
            
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            await websocket.close(code=4001, reason="Invalid user")
            return None
            
        return user
    except JWTError:
        await websocket.close(code=4001, reason="Invalid token")
        return None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    db: Session = Depends(get_db),
    token: str = Query(...)
):
    """WebSocket endpoint for real-time updates"""
    # Authenticate user
    user = await get_current_user_ws(websocket, token, db)
    if not user:
        return
    
    # Connect to WebSocket manager
    await manager.connect(websocket, user.id)
    
    try:
        # Send initial connection message
        await manager.send_json({
            "type": "connection",
            "data": {
                "status": "connected",
                "user_id": str(user.id),
                "message": "Connected to WinCloud Builder real-time updates"
            }
        }, user.id)
        
        # Keep connection alive and handle incoming messages
        while True:
            # Wait for any message from client (can be ping/pong)
            data = await websocket.receive_text()
            
            # Handle ping/pong for connection keepalive
            if data == "ping":
                await websocket.send_text("pong")
            else:
                # Echo back any other message (for testing)
                await manager.send_json({
                    "type": "echo",
                    "data": {"message": data}
                }, user.id)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info(f"User {user.id} disconnected from WebSocket")
    except Exception as e:
        logger.error(f"WebSocket error for user {user.id}: {e}")
        manager.disconnect(websocket)
        await websocket.close()

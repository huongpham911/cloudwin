"""
WebSocket endpoints for real-time terminal
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import logging
from ..websocket.ssh_manager import ssh_manager

logger = logging.getLogger(__name__)
router = APIRouter()

@router.websocket("/ws/terminal/{droplet_id}")
async def websocket_terminal(websocket: WebSocket, droplet_id: str):
    """
    WebSocket endpoint for real-time terminal access
    """
    await websocket.accept()
    
    try:
        # Wait for initial connection request with droplet IP
        init_data = await websocket.receive_json()
        droplet_ip = init_data.get("droplet_ip")
        
        if not droplet_ip:
            await websocket.send_json({
                "type": "error",
                "message": "❌ Droplet IP required"
            })
            return
        
        # Create SSH session
        session = await ssh_manager.create_session(droplet_id, droplet_ip, websocket)
        
        if not session:
            return
        
        # Handle incoming messages
        while True:
            try:
                data = await websocket.receive_json()
                message_type = data.get("type")
                
                if message_type == "command":
                    command = data.get("command", "")
                    await ssh_manager.send_command(droplet_id, command, websocket)
                
                elif message_type == "ping":
                    await websocket.send_json({"type": "pong"})
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"❌ WebSocket error: {e}")
                await websocket.send_json({
                    "type": "error",
                    "message": f"❌ Error: {str(e)}"
                })
                
    except WebSocketDisconnect:
        logger.info(f"🔌 WebSocket disconnected for droplet {droplet_id}")
    except Exception as e:
        logger.error(f"❌ WebSocket terminal error: {e}")
    finally:
        # Clean up SSH session
        ssh_manager.close_session(droplet_id)
        
        try:
            await websocket.close()
        except:
            pass

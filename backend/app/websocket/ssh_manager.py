"""
SSH Manager for Real-Time Terminal
Handles WebSocket connections to SSH sessions
"""

import asyncio
import json
import logging
from typing import Optional, Dict
import paramiko
from fastapi import WebSocket
import threading
import time

logger = logging.getLogger(__name__)

class SSHSession:
    def __init__(self, droplet_ip: str, username: str = "root", key_path: Optional[str] = None):
        self.droplet_ip = droplet_ip
        self.username = username
        self.key_path = key_path
        self.ssh_client: Optional[paramiko.SSHClient] = None
        self.shell_channel = None
        self.is_connected = False
        
    async def connect(self):
        """Establish SSH connection"""
        try:
            self.ssh_client = paramiko.SSHClient()
            self.ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Connect with key or password
            if self.key_path:
                self.ssh_client.connect(
                    self.droplet_ip, 
                    username=self.username,
                    key_filename=self.key_path,
                    timeout=10
                )
            else:
                # For now, we'll use the SSH key from DigitalOcean
                self.ssh_client.connect(
                    self.droplet_ip, 
                    username=self.username,
                    look_for_keys=True,
                    timeout=10
                )
            
            # Create interactive shell
            self.shell_channel = self.ssh_client.invoke_shell(term='xterm')
            self.is_connected = True
            
            logger.info(f"✅ SSH connected to {self.droplet_ip}")
            return True
            
        except Exception as e:
            logger.error(f"❌ SSH connection failed: {e}")
            return False
    
    async def send_command(self, command: str):
        """Send command to SSH session"""
        if self.shell_channel and self.is_connected:
            self.shell_channel.send(command + '\n')
    
    async def read_output(self, websocket: WebSocket):
        """Read SSH output and send to WebSocket"""
        buffer = ""
        while self.is_connected and self.shell_channel:
            try:
                if self.shell_channel.recv_ready():
                    data = self.shell_channel.recv(1024).decode('utf-8', errors='ignore')
                    buffer += data
                    
                    # Send each line as it comes
                    lines = buffer.split('\n')
                    for line in lines[:-1]:  # All complete lines
                        await websocket.send_json({
                            "type": "output",
                            "data": line,
                            "timestamp": time.time()
                        })
                    
                    buffer = lines[-1]  # Keep incomplete line
                
                await asyncio.sleep(0.1)  # Small delay to prevent high CPU
                
            except Exception as e:
                logger.error(f"❌ Error reading SSH output: {e}")
                break
    
    def disconnect(self):
        """Close SSH connection"""
        self.is_connected = False
        if self.shell_channel:
            self.shell_channel.close()
        if self.ssh_client:
            self.ssh_client.close()
        logger.info(f"🔌 SSH disconnected from {self.droplet_ip}")


class SSHManager:
    def __init__(self):
        self.active_sessions: Dict[str, SSHSession] = {}
    
    async def create_session(self, droplet_id: str, droplet_ip: str, websocket: WebSocket):
        """Create new SSH session for droplet"""
        try:
            session = SSHSession(droplet_ip)
            
            if await session.connect():
                self.active_sessions[droplet_id] = session
                
                # Send initial connection message
                await websocket.send_json({
                    "type": "connected",
                    "message": f"🖥️ Connected to {droplet_ip}",
                    "droplet_id": droplet_id
                })
                
                # Start reading output
                asyncio.create_task(session.read_output(websocket))
                
                return session
            else:
                await websocket.send_json({
                    "type": "error",
                    "message": f"❌ Failed to connect to {droplet_ip}"
                })
                return None
                
        except Exception as e:
            logger.error(f"❌ Error creating SSH session: {e}")
            await websocket.send_json({
                "type": "error", 
                "message": f"❌ Connection error: {str(e)}"
            })
            return None
    
    async def send_command(self, droplet_id: str, command: str, websocket: WebSocket):
        """Send command to specific droplet session"""
        session = self.active_sessions.get(droplet_id)
        if session and session.is_connected:
            await session.send_command(command)
            
            # Echo command to websocket
            await websocket.send_json({
                "type": "command_echo",
                "data": f"$ {command}",
                "timestamp": time.time()
            })
        else:
            await websocket.send_json({
                "type": "error",
                "message": "❌ No active SSH session"
            })
    
    def close_session(self, droplet_id: str):
        """Close SSH session for droplet"""
        session = self.active_sessions.get(droplet_id)
        if session:
            session.disconnect()
            del self.active_sessions[droplet_id]

# Global SSH manager instance
ssh_manager = SSHManager()

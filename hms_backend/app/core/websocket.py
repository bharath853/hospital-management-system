import json
import asyncio
from typing import List, Dict
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        # Channel Subscriptions Map: e.g. {"doctor:1": [ws1], "lab": [ws2]}
        self.channels: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if channel:
            self.subscribe(websocket, channel)
        print(f"WebSocket Client Connected! Total Active: {len(self.active_connections)} | Initial Channel: {channel}")

    def subscribe(self, websocket: WebSocket, channel: str):
        if channel not in self.channels:
            self.channels[channel] = []
        if websocket not in self.channels[channel]:
            self.channels[channel].append(websocket)
            print(f"Subscribed websocket to channel: {channel}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        for ch, conns in self.channels.items():
            if websocket in conns:
                conns.remove(websocket)
        print(f"WebSocket Client Disconnected. Total Active: {len(self.active_connections)}")

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Failed to send broadcast: {e}")
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast_to_channel(self, channel: str, event_type: str, data: dict):
        payload = json.dumps({
            "event": event_type,
            "channel": channel,
            "data": data
        })
        target_conns = self.channels.get(channel, [])
        print(f"📢 Channel Broadcast [{channel}] -> Event: {event_type} | Target Conns: {len(target_conns)}")
        disconnected = []
        for conn in target_conns:
            try:
                await conn.send_text(payload)
            except Exception as e:
                print(f"Failed to send to channel {channel}: {e}")
                disconnected.append(conn)
        for conn in disconnected:
            self.disconnect(conn)
            
        # Also broadcast globally to ensure fallback synchronization
        await self.broadcast(payload)

    async def send_to_doctor(self, doctor_id: int, event_type: str, data: dict):
        channel = f"doctor:{doctor_id}"
        await self.broadcast_to_channel(channel, event_type, data)

    async def broadcast_event(self, event_type: str, data: dict):
        payload = json.dumps({
            "event": event_type,
            "data": data
        })
        await self.broadcast(payload)


manager = ConnectionManager()

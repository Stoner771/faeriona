import httpx
import asyncio
from typing import Optional, Dict, Any
from datetime import datetime


async def send_webhook(webhook_url: str, event: str, data: Dict[str, Any]):
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            payload = {
                "event": event,
                "data": data,
                "timestamp": int(datetime.utcnow().timestamp())
            }
            await client.post(webhook_url, json=payload)
    except Exception:
        pass


async def send_discord_webhook(webhook_url: str, title: str, description: str, color: int = 3447003, fields: Dict[str, str] = None):
    """Send message to Discord webhook with embed format"""
    try:
        embed = {
            "title": title,
            "description": description,
            "color": color,
            "timestamp": datetime.utcnow().isoformat(),
        }
        
        if fields:
            embed["fields"] = [
                {"name": k, "value": str(v), "inline": True} 
                for k, v in fields.items()
            ]
        
        payload = {
            "embeds": [embed]
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(webhook_url, json=payload)
    except Exception as e:
        print(f"Discord webhook error: {e}")
        pass


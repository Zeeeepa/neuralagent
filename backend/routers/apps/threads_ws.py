from fastapi import APIRouter, WebSocket, Depends, WebSocketDisconnect
from typing import Optional
from sqlmodel import select, and_
from sqlmodel.ext.asyncio.session import AsyncSession
from db.database import get_async_session
from db.models import User, Thread, ThreadStatus, ThreadTask, ThreadTaskStatus
from broadcaster import Broadcast
from utils.procedures import CustomError
import json
import os
import asyncio
from utils.auth_helper import decode_token, is_session_valid

ws_router = APIRouter(
    prefix='/apps/threads',
    tags=['threads', 'ws']
)

broadcast: Optional[Broadcast] = None
redis_available = False

async def init_redis():
    """Initialize Redis if available"""
    global broadcast, redis_available
    
    redis_connection = os.getenv('REDIS_CONNECTION')
    if not redis_connection:
        print("⚠️ No Redis - WebSocket disabled")
        return
    
    try:
        broadcast = Broadcast(redis_connection)
        await broadcast.connect()
        redis_available = True
        print("✅ Redis connected!")
    except Exception as e:
        print(f"❌ Redis failed: {e}")
        redis_available = False

class ThreadChannelManager:
    def __init__(self):
        pass

    async def publish_to_thread(self, thread_id: str, message: dict):
        """Publish message to all clients listening to a specific thread"""
        if redis_available and broadcast:
            await broadcast.publish(channel=f"thread_{thread_id}", message=json.dumps(message))

    async def publish_agent_action(self, thread_id: str, action_description: str, action_data: dict = None):
        """Publish agent action update to thread listeners"""
        message = {
            "type": "agent_action",
            "thread_id": thread_id,
            "description": action_description,
            "action_data": action_data,
            "timestamp": asyncio.get_event_loop().time()
        }
        await self.publish_to_thread(thread_id, message)

    async def publish_agent_thinking(self, thread_id: str, thinking_text: str):
        """Publish agent thinking/reasoning to thread listeners"""
        message = {
            "type": "agent_thinking",
            "thread_id": thread_id,
            "thinking": thinking_text,
            "timestamp": asyncio.get_event_loop().time()
        }
        await self.publish_to_thread(thread_id, message)

    async def publish_task_status(self, thread_id: str, status: str, subtask_info: dict = None):
        """Publish task status updates"""
        message = {
            "type": "task_status",
            "thread_id": thread_id,
            "status": status,
            "subtask_info": subtask_info,
            "timestamp": asyncio.get_event_loop().time()
        }
        await self.publish_to_thread(thread_id, message)

    async def subscribe_to_thread(self, thread_id: str):
        if redis_available and broadcast:
            return broadcast.subscribe(channel=f"thread_{thread_id}")
        else:
            return None

manager = ThreadChannelManager()

def action_to_description(action: dict) -> str:
    """Convert action JSON to human-readable present tense description"""
    action_type = action.get('action')
    params = action.get('params', {})
    
    descriptions = {
        'left_click': f"Clicking at position ({params.get('x')}, {params.get('y')})",
        'double_click': f"Double-clicking at position ({params.get('x')}, {params.get('y')})",
        'right_click': f"Right-clicking at position ({params.get('x')}, {params.get('y')})",
        'type': f"Typing: '{params.get('text', '')}'",
        'key': f"Pressing {params.get('text', '')} key",
        'key_combo': f"Pressing {' + '.join(params.get('keys', []))}",
        'scroll': f"Scrolling {params.get('scroll_direction', 'down')} {params.get('scroll_amount', 1)} times",
        'wait': f"Waiting {params.get('duration', 1)} seconds - {params.get('reason', 'for system response')}",
        'launch_browser': f"Opening browser to {params.get('url', '')}",
        'launch_app': f"Launching {params.get('app_name', 'application')}",
        'focus_app': f"Switching to {params.get('app_name', 'application')}",
        'request_screenshot': "Taking a screenshot to analyze the current state",
        'mouse_move': f"Moving mouse to position ({params.get('x')}, {params.get('y')})",
        'left_click_drag': f"Dragging from ({params.get('from', {}).get('x')}, {params.get('from', {}).get('y')}) to ({params.get('to', {}).get('x')}, {params.get('to', {}).get('y')})",
        'tool_use': f"Using tool: {params.get('tool', 'unknown')}",
        'subtask_completed': "✅ Subtask completed successfully",
        'subtask_failed': "Subtask failed",
        'task_completed': "Task completed successfully",
        'task_failed': "Task failed"
    }
    
    return descriptions.get(action_type, f"Performing {action_type}")

async def verify_thread_access(thread_id: str, user_id: str, db: AsyncSession) -> Thread:
    """Verify user has access to thread and return thread object"""
    result = await db.exec(select(Thread).where(and_(
        Thread.id == thread_id,
        Thread.user_id == user_id,
        Thread.status == ThreadStatus.WORKING
    )))
    thread = result.first()
    
    if not thread:
        raise CustomError(404, 'Thread not found or access denied')
    
    return thread

@ws_router.websocket('/ws/{thread_id}/agent_updates')
async def agent_updates_websocket(
    websocket: WebSocket, 
    thread_id: str, 
    access_token: str,
    db: AsyncSession = Depends(get_async_session)
):
    """WebSocket endpoint for streaming AI agent updates to desktop app"""
    try:
        payload = decode_token(access_token)

        if payload.get('token_type') != 'access':
            await websocket.close()

        user_id = payload.get('user_id')
        u_query = select(User).where(User.id == user_id)
        user = (await db.exec(u_query)).first()

        if not user:
            await websocket.close()

        if not await is_session_valid(payload.get('session_id'), db):
            await websocket.close()
        
        # Verify thread access
        thread = await verify_thread_access(thread_id, user_id, db)

        if not redis_available:
            await websocket.close()
        
        await websocket.accept()
        
        # Send initial connection confirmation
        await websocket.send_json({
            "type": "connection_established",
            "thread_id": thread_id,
            "thread_title": thread.title,
            "thread_status": thread.status
        })
        
        try:
            async with await manager.subscribe_to_thread(thread_id) as subscriber:
                # Handle concurrent message sending and receiving
                receive_task = asyncio.create_task(handle_client_messages(websocket, thread_id, db))
                send_task = asyncio.create_task(send_agent_updates(websocket, subscriber))
                
                # Wait for either task to complete
                await asyncio.wait(
                    [receive_task, send_task],
                    return_when=asyncio.FIRST_COMPLETED
                )
                
        except WebSocketDisconnect:
            print(f"Client disconnected from thread {thread_id}")
        except Exception as e:
            print(f"Error in WebSocket connection for thread {thread_id}: {e}")
            await websocket.close()
            
    except Exception as e:
        print(f"Failed to establish WebSocket connection: {e}")
        await websocket.close()

async def handle_client_messages(websocket: WebSocket, thread_id: str, db: AsyncSession):
    """Handle messages from the desktop client"""
    try:
        while True:
            # For now, just receive and acknowledge client messages
            # You can expand this to handle client commands like pause/resume
            data = await websocket.receive_text()
            client_message = json.loads(data)
            
            if client_message.get('type') == 'ping':
                await websocket.send_json({"type": "pong"})
            elif client_message.get('type') == 'request_status':
                # Send current task status
                await send_current_task_status(websocket, thread_id, db)
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Error handling client messages: {e}")

async def send_agent_updates(websocket: WebSocket, subscriber):
    """Send agent updates to the connected client"""
    try:
        async for event in subscriber:
            try:
                message = json.loads(event.message)
                await websocket.send_json(message)
            except json.JSONDecodeError:
                print(f"Failed to decode message: {event.message}")
            except Exception as e:
                print(f"Error sending update: {e}")
    except Exception as e:
        print(f"Error in send_agent_updates: {e}")

async def send_current_task_status(websocket: WebSocket, thread_id: str, db: AsyncSession):
    """Send current task status to client"""
    try:
        result = await db.exec(select(ThreadTask).where(and_(
            ThreadTask.thread_id == thread_id,
            ThreadTask.status == ThreadTaskStatus.WORKING
        )))
        current_task = result.first()
        
        if current_task:
            await websocket.send_json({
                "type": "current_task_status",
                "task_text": current_task.task_text,
                "status": current_task.status,
                "background_mode": current_task.background_mode,
                "extended_thinking_mode": current_task.extended_thinking_mode
            })
        else:
            await websocket.send_json({
                "type": "current_task_status",
                "message": "No active task"
            })
    except Exception as e:
        print(f"Error sending task status: {e}")

# Utility functions to be called from your AI agent code

async def broadcast_agent_action(thread_id: str, action: dict):
    """Call this function from your AI agent when executing an action"""
    description = action_to_description(action)
    await manager.publish_agent_action(thread_id, description, action)

async def broadcast_agent_thinking(thread_id: str, thinking_text: str):
    """Call this function when the agent is in thinking mode"""
    # Split thinking into chunks for streaming effect
    chunks = thinking_text.split('\n')
    for chunk in chunks:
        if chunk.strip():
            await manager.publish_agent_thinking(thread_id, chunk.strip())
            await asyncio.sleep(0.1)  # Small delay for streaming effect

async def broadcast_task_status_update(thread_id: str, status: str, subtask_info: dict = None):
    """Call this function when task status changes"""
    await manager.publish_task_status(thread_id, status, subtask_info)

async def broadcast_subtask_start(thread_id: str, subtask_text: str):
    """Call this when starting a new subtask"""
    await manager.publish_task_status(thread_id, "subtask_started", {
        "subtask_text": subtask_text,
        "message": f"🎯 Starting subtask: {subtask_text}"
    })

async def broadcast_subtask_complete(thread_id: str, subtask_text: str):
    """Call this when completing a subtask"""
    await manager.publish_task_status(thread_id, "subtask_completed", {
        "subtask_text": subtask_text,
        "message": f"✅ Completed subtask: {subtask_text}"
    })
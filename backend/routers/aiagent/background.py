from fastapi import APIRouter, Depends, status
from sqlmodel import select, and_
from sqlmodel.ext.asyncio.session import AsyncSession
from db.database import get_async_session
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
import json
from utils import ai_prompts
from utils.procedures import CustomError, extract_json
from dependencies.auth_dependencies import get_current_user_dependency
from db.models import (User, Thread, ThreadStatus, ThreadTask, ThreadTaskStatus, ThreadMessage,
                       ThreadChatType, ThreadChatFromChoices, ThreadTaskMemoryEntry)
from schemas.aiagent import BackgroundNextStepRequest
from utils.agentic_tools import run_tool_server_side_async
from utils import llm_provider
from base64 import b64decode
import io
import os
from utils import upload_helper
import asyncio
import datetime
from routers.apps.threads_ws import (
    broadcast_agent_action, 
    broadcast_agent_thinking, 
    broadcast_task_status_update
)


router = APIRouter(
    prefix='/aiagent/background',
    tags=['aiagent', 'background'],
    dependencies=[Depends(get_current_user_dependency)]
)


@router.post('/{tid}/next_step')
async def next_step(tid: str, next_step_req: BackgroundNextStepRequest, 
                    db: AsyncSession = Depends(get_async_session),
                    user: User = Depends(get_current_user_dependency)):
    result = await db.exec(select(Thread).where(and_(
        Thread.id == tid,
        Thread.user_id == user.id,
        Thread.status == ThreadStatus.WORKING
    )))
    instance = result.first()

    if not instance:
        raise CustomError(status.HTTP_404_NOT_FOUND, 'Thread not found')

    result = await db.exec(select(ThreadTask).where(and_(
        ThreadTask.thread_id == tid,
        ThreadTask.status == ThreadTaskStatus.WORKING,
    )))
    task = result.first()

    if not task:
        raise CustomError(status.HTTP_404_NOT_FOUND, 'Thread has no running task')

    if task.extended_thinking_mode is True:
        llm = llm_provider.get_llm(agent='computer_use', temperature=1.0, thinking_enabled=True)
    else:
        llm = llm_provider.get_llm(agent='computer_use', temperature=0.0)

    result = await db.exec(select(ThreadTask).where(and_(
        ThreadTask.thread.has(Thread.user_id == user.id),
        ThreadTask.thread.has(Thread.status != ThreadStatus.DELETED),
    )).order_by(ThreadTask.created_at.desc()).limit(10))
    previous_tasks = result.all()
    
    previous_tasks_arr = []
    for previous_task in previous_tasks:
        previous_tasks_arr.append({
            'task': previous_task.task_text,
            'status': previous_task.status,
        })

    screenshot_user_message_block = None
    screenshot_s3_path = None
    if next_step_req.screenshot_b64:
        if os.getenv('ENABLE_SCREENSHOT_LOGGING_FOR_TRAINING') == 'true':
            image_bytes = b64decode(next_step_req.screenshot_b64)
            image_io = io.BytesIO(image_bytes)
            # Use async version or thread pool
            screenshot_s3_path = await asyncio.to_thread(
                upload_helper.upload_screenshot_s3_bytesio,
                image_io,
                extension="png"
            )
            # Or if you have async version:
            # screenshot_s3_path = await upload_helper.upload_screenshot_s3_bytesio_async(image_io, extension="png")
        
        if os.getenv('COMPUTER_USE_AGENT_MODEL_TYPE') == 'ollama' or os.getenv('COMPUTER_USE_AGENT_MODEL_TYPE') == 'gemini':
            screenshot_user_message_block = {
                "type": "image_url",
                "image_url": f"data:image/png;base64,{next_step_req.screenshot_b64}"
            }
        else:
            screenshot_user_message_block = {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": next_step_req.screenshot_b64
                }
            }

    action_history = []
    result = await db.exec(
        select(ThreadMessage)
        .where(
            and_(
                ThreadMessage.thread_task_id == task.id,
                ThreadMessage.thread_chat_type == ThreadChatType.BACKGROUND_MODE_BROWSER,
            )
        )
        .order_by(ThreadMessage.created_at.desc())
        .limit(5)
    )
    task_previous_messages = result.all()
    
    for previous_message in task_previous_messages:
        previous_action_dict = json.loads(previous_message.text)
        # previous_action_dict.pop("current_state", None)
        action_history.append(previous_action_dict)

    if task.needs_memory_from_previous_tasks is True:
        result = await db.exec(select(ThreadTask).where(and_(
            ThreadTask.thread.has(Thread.user_id == user.id),
            ThreadTask.thread.has(Thread.status != ThreadStatus.DELETED),
        )).order_by(ThreadTask.created_at.desc()).limit(5))
        tasks_for_memory = result.all()
        
        tasks_for_memory_ids = [task.id for task in tasks_for_memory]
        result = await db.exec(
            select(ThreadTaskMemoryEntry).where(
                ThreadTaskMemoryEntry.thread_task_id.in_(tasks_for_memory_ids)
            )
        )
        memory_items = result.all()
    else:
        result = await db.exec(select(ThreadTaskMemoryEntry).where(
            ThreadTaskMemoryEntry.thread_task_id == task.id
        ))
        memory_items = result.all()

    memory_items_arr = []
    for memory_item in memory_items:
        memory_items_arr.append({
            'memory_item_text': memory_item.text,
        })

    computer_use_user_message = [
        {
            'type': 'text',
            'text': f"Today's date: {datetime.datetime.now().strftime('%Y-%m-%d')}"
        },
        {
            'type': 'text',
            'text': f'Current Task: {task.task_text}'
        },
        {
            'type': 'text',
            'text': f'Current URL: {next_step_req.current_url}'
        },
        {
            'type': 'text',
            'text': f'Current Open Tabs: {json.dumps(next_step_req.current_open_tabs)}'
        }
    ]

    if len(memory_items_arr) > 0:
        computer_use_user_message.append({
            'type': 'text',
            'text': f'Stored Memory Items: \n {json.dumps(memory_items_arr)}'
        })
    if len(action_history) > 0:
        computer_use_user_message.append({
            'type': 'text',
            'text': f'Previous Actions (Limited to 5, newest first): \n {json.dumps(action_history)}'
        })
    if len(previous_tasks_arr) > 0:
        computer_use_user_message.append({
            'type': 'text',
            'text': f'Previous Tasks: \n {json.dumps(previous_tasks_arr)}'
        })
    
    computer_use_text_prompt = computer_use_user_message.copy()
    
    if screenshot_user_message_block:
        computer_use_user_message.append(screenshot_user_message_block)

    prompt = ChatPromptTemplate.from_messages([
        SystemMessage(content=ai_prompts.BG_MODE_BROWSER_AGENT_PROMPT),
        HumanMessage(content=computer_use_user_message),
    ])

    chain = prompt | llm
    response = await chain.ainvoke({})

    print('Token Usage: ', response.usage_metadata)

    response_data = None
    if task.extended_thinking_mode is True:
        for response_item in response.content:
            if response_item.get('type') == 'reasoning_content':
                thinking_text = response_item.get('reasoning_content', {}).get('text', '')
                if thinking_text:
                    await broadcast_agent_thinking(tid, thinking_text)
                
                thinking_message = ThreadMessage(
                    thread_id=instance.id,
                    thread_task_id=task.id,
                    thread_chat_type=ThreadChatType.THINKING,
                    thread_chat_from=ThreadChatFromChoices.FROM_AI,
                    chain_of_thought=thinking_text,
                )
                db.add(thinking_message)
                await db.commit()
                await db.refresh(thinking_message)
            elif response_item.get('type') == 'text':
                response_data = extract_json(response_item.get('text'))
    else:
        response_data = extract_json(response.content)
    
    current_state = response_data.get('current_state', {})
    if current_state.get('next_goal'):
        await broadcast_task_status_update(tid, "planning", {
            "message": f"Action: {current_state.get('next_goal')}"
        })

    ai_message = ThreadMessage(
        thread_id=instance.id,
        thread_task_id=task.id,
        thread_chat_type=ThreadChatType.BACKGROUND_MODE_BROWSER,
        thread_chat_from=ThreadChatFromChoices.FROM_AI,
        screenshot=screenshot_s3_path,
        prompt=json.dumps(computer_use_text_prompt),
        text=json.dumps(response_data),
    )
    db.add(ai_message)
    await db.commit()
    await db.refresh(ai_message)

    if response_data.get('current_state', {}).get('save_to_memory', False):
        memory_text = response_data['current_state'].get('memory')
        if memory_text:
            memory_entry = ThreadTaskMemoryEntry(
                thread_task_id=task.id,
                text=memory_text,
            )
            db.add(memory_entry)
            await db.commit()
            await db.refresh(memory_entry)

    # Iterate over all actions
    actions_arr = response_data.get('actions', [])
    for act in actions_arr:
        action_type = act.get('action')

        await broadcast_agent_action(tid, act)

        if action_type == 'task_completed' and len(actions_arr) == 1:
            await broadcast_task_status_update(tid, "task_completed", {
                "message": "Task completed successfully."
            })

            task.status = ThreadTaskStatus.COMPLETED
            db.add(task)
            await db.commit()
            await db.refresh(task)

            instance.status = ThreadStatus.STANDBY
            db.add(instance)
            await db.commit()
            await db.refresh(instance)

            # ai_message = ThreadMessage(
            #     thread_id=instance.id,
            #     thread_task_id=task.id,
            #     thread_chat_type=ThreadChatType.BACKGROUND_MODE_BROWSER,
            #     thread_chat_from=ThreadChatFromChoices.FROM_AI,
            #     text=json.dumps({'actions': [{'action': 'task_completed'}]}),
            # )
            # db.add(ai_message)
            # await db.commit()
            # await db.refresh(ai_message)

        elif action_type == 'task_failed':
            await broadcast_task_status_update(tid, "task_failed", {
                "message": f"Task failed: {task.task_text}"
            })
            
            task.status = ThreadTaskStatus.FAILED
            db.add(task)
            await db.commit()
            await db.refresh(task)

            instance.status = ThreadStatus.STANDBY
            db.add(instance)
            await db.commit()
            await db.refresh(instance)

            # ai_message = ThreadMessage(
            #     thread_id=instance.id,
            #     thread_task_id=task.id,
            #     thread_chat_type=ThreadChatType.BACKGROUND_MODE_BROWSER,
            #     thread_chat_from=ThreadChatFromChoices.FROM_AI,
            #     text=json.dumps({'actions': [{'action': 'task_failed'}]}),
            # )
            # db.add(ai_message)
            # await db.commit()
            # await db.refresh(ai_message)

        elif action_type == 'tool_use':
            tool = act['params'].get('tool')
            args = act['params'].get('args', {})

            await broadcast_task_status_update(tid, "using_tool", {
                "message": f"Using tool: {tool}",
                "tool": tool,
                "args": args
            })

            if tool == 'save_to_memory':
                memory_entry = ThreadTaskMemoryEntry(
                    thread_task_id=task.id,
                    text=args.get('text', ''),
                )
                db.add(memory_entry)
                await db.commit()
                await db.refresh(memory_entry)

            elif tool in ['read_pdf', 'fetch_url', 'summarize_youtube_video']:
                # Use async version if available, or run in thread pool
                tool_output_text = await asyncio.to_thread(
                    run_tool_server_side,
                    tool,
                    args
                )
                # Or if you have async version:
                # tool_output_text = await run_tool_server_side_async(tool, args)
                
                memory_entry = ThreadTaskMemoryEntry(
                    thread_task_id=task.id,
                    text=tool_output_text,
                )
                db.add(memory_entry)
                await db.commit()
                await db.refresh(memory_entry)

    return response_data

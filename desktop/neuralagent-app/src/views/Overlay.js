import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import neuralagent_logo_ic_only_white from '../assets/neuralagent_logo_ic_only_white.png';
import neuralagent_logo_ic_only from '../assets/neuralagent_logo_ic_only.png';
import { AvatarButton, IconButton } from '../components/Elements/Button';
import { useSelector } from 'react-redux';
import axios from '../utils/axios';
import { FaStopCircle } from 'react-icons/fa';
import constants from '../utils/constants';
import { MdOutlineSchedule } from 'react-icons/md';
import { GiBrain } from 'react-icons/gi';

const Container = styled.div`
  background: transparent;
  padding: 0px 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100vh;
  width: 100%;
  transition: height 0.3s ease;
`;

const Input = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  color: ${props => props.isDarkMode ? '#fff' : '#000'};
  font-size: 14px;
  outline: none;
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  margin-left: 8px;
  width: 21px;
  height: 21px;
  border: ${props => props.isDarkMode ? '2px solid white' : '2px solid rgba(0,0,0,0.7)'};
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

const SuggestionsPanel = styled.div`
  margin-top: 5px;
  background-color: ${props => props.isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.1)'};
  border-radius: 8px;
  padding: 10px;
  flex: 1;
  overflow-y: auto;
`;

const AgentStatusPanel = styled.div`
  margin-top: 5px;
  background-color: ${props => props.isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.1)'};
  border-radius: 8px;
  padding: 15px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const StatusHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid ${props => props.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
`;

const TaskTitle = styled.div`
  color: ${props => props.isDarkMode ? '#fff' : '#000'};
  font-size: 14px;
  font-weight: 600;
  flex: 1;
  margin-right: 10px;
`;

const ConnectionStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: ${props => props.isDarkMode ? '#ccc' : '#666'};
`;

const StatusIndicator = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => 
    props.status === 'connected' ? '#4CAF50' :
    props.status === 'connecting' ? '#FFC107' :
    props.status === 'disconnected' ? '#FF9800' : '#F44336'
  };
`;

const AgentActivityContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CurrentActionDisplay = styled.div`
  background: ${props => props.isDarkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.1)'};
  border-left: 3px solid #4CAF50;
  padding: 10px;
  border-radius: 6px;
  color: ${props => props.isDarkMode ? '#fff' : '#000'};
  font-size: 13px;
  margin-bottom: 10px;
`;

const ThinkingDisplay = styled.div`
  background: ${props => props.isDarkMode ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.1)'};
  border-left: 3px solid #2196F3;
  padding: 10px;
  border-radius: 6px;
  color: ${props => props.isDarkMode ? '#fff' : '#000'};
  font-size: 12px;
  margin-bottom: 8px;
  max-height: 200px;
  overflow-y: auto;
`;

const ActionLogContainer = styled.div`
  background: ${props => props.isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)'};
  border-radius: 6px;
  padding: 10px;
  flex: 1;
  overflow-y: auto;
`;

const ActionLogTitle = styled.div`
  color: ${props => props.isDarkMode ? '#ccc' : '#666'};
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ActionLogItem = styled.div`
  color: ${props => props.isDarkMode ? '#ddd' : '#333'};
  font-size: 12px;
  padding: 4px 0;
  border-bottom: 1px solid ${props => props.isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'};
  
  &:last-child {
    border-bottom: none;
  }
`;

const TaskProgressDisplay = styled.div`
  background: ${props => props.isDarkMode ? 'rgba(156, 39, 176, 0.1)' : 'rgba(156, 39, 176, 0.1)'};
  border-left: 3px solid #9C27B0;
  padding: 10px;
  border-radius: 6px;
  color: ${props => props.isDarkMode ? '#fff' : '#000'};
  font-size: 13px;
  margin-bottom: 10px;
`;

const SuggestionItem = styled.div`
  padding: 8px;
  margin-bottom: 6px;
  background: ${props => props.isDarkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)'};
  border-radius: 6px;
  color: ${props => props.isDarkMode ? '#fff' : '#000'};
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: ${props => props.isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'};
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;

const SkeletonItem = styled.div`
  height: 36px;
  margin-bottom: 6px;
  border-radius: 6px;
  background: ${props => props.isDarkMode ? 'linear-gradient(90deg,rgba(255, 255, 255, 0.07) 25%, rgba(255, 255, 255, 0.15) 50%,rgba(255, 255, 255, 0.07) 75%)' : 'linear-gradient(90deg,rgba(0, 0, 0, 0.07) 25%, rgba(0, 0, 0, 0.15) 50%,rgba(0, 0, 0, 0.07) 75%)'};
  background-size: 200px 100%;
  animation: ${shimmer} 1.2s infinite;
`;

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
`;

const ModeToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: ${props => props.isDarkMode ? (props.active ? 'rgba(255,255,255,0.1)' : 'transparent') : (props.active ? 'rgba(0,0,0,0.05)' : 'transparent')};
  color: ${props => props.isDarkMode ? '#fff' : 'var(--primary-color)'};
  border: ${props => props.isDarkMode ? 'thin solid rgba(255,255,255,0.2)' : 'thin solid var(--primary-color)'};
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11.5px;
  transition: background-color 0.2s ease;
  cursor: pointer;

  &:hover {
    background-color: ${props => props.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
  }

  svg {
    font-size: 15px;
  }
`;

const blink = keyframes`
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
`;

const TypingCursor = styled.span`
  animation: ${blink} 1s infinite;
  color: ${props => props.isDarkMode ? '#fff' : '#000'};
`;

// Streaming Text Component
const StreamingText = ({ text, isStreaming, speed = 80, onComplete = () => {} }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(text);
      setCurrentIndex(text.length);
      onComplete();
      return;
    }

    if (currentIndex < text.length) {
      timeoutRef.current = setTimeout(() => {
        const words = text.split(' ');
        const currentWords = words.slice(0, Math.floor((currentIndex / text.length) * words.length) + 1);
        setDisplayedText(currentWords.join(' '));
        setCurrentIndex(prev => prev + 1);
      }, speed);
    } else {
      onComplete();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, currentIndex, isStreaming, speed, onComplete]);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  const showCursor = isStreaming && currentIndex < text.length;

  return (
    <span>
      {displayedText}
      {showCursor && <TypingCursor>|</TypingCursor>}
    </span>
  );
};

// WebSocket management hook
const useThreadWebSocket = (threadId, accessToken, onMessage) => {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);  // Use ref instead of state!
  const isConnectingRef = useRef(false);   // Prevent multiple connections
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!threadId || !accessToken) return;
    if (isConnectingRef.current) return; // Prevent multiple connections

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    isConnectingRef.current = true;
    setConnectionStatus('connecting');

    try {
      const wsUrl = `${process.env.REACT_APP_WEBSOCKET_PROTOCOL}://${process.env.REACT_APP_DNS}/apps/threads/ws/${threadId}/agent_updates?access_token=${accessToken}`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        isConnectingRef.current = false;
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0; // Reset attempts on successful connection
        
        // Send ping to keep connection alive
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          onMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        isConnectingRef.current = false;
        setConnectionStatus('disconnected');
        
        // Only reconnect if we haven't exceeded max attempts and it wasn't a manual close
        if (reconnectAttemptsRef.current < maxReconnectAttempts && event.code !== 1000) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          console.log(`Attempting reconnect ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts} in ${delay}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.log('Max reconnect attempts reached');
          setConnectionStatus('error');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnectingRef.current = false;
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      isConnectingRef.current = false;
      setConnectionStatus('error');
    }
  }, [threadId, accessToken, onMessage]);

  const disconnect = useCallback(() => {
    console.log('Manual WebSocket disconnect');
    
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Reset attempts
    reconnectAttemptsRef.current = 0;
    isConnectingRef.current = false;
    
    // Close connection
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect'); // Use code 1000 for normal closure
      wsRef.current = null;
    }
    
    setConnectionStatus('disconnected');
  }, []);

  useEffect(() => {
    if (threadId && accessToken) {
      connect();
    } else {
      disconnect();
    }
    
    return () => {
      disconnect();
    };
  }, [threadId, accessToken, connect, disconnect]);

  return { connectionStatus, disconnect };
};

export default function Overlay() {
  const [expanded, setExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [runningThreadId, setRunningThreadId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [backgroundMode, setBackgroundMode] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(false);

  // WebSocket state with streaming
  const [currentAction, setCurrentAction] = useState('');
  const [isActionStreaming, setIsActionStreaming] = useState(false);
  const [currentThinking, setCurrentThinking] = useState('');
  const [isThinkingStreaming, setIsThinkingStreaming] = useState(false);
  const [taskProgress, setTaskProgress] = useState('');
  const [isProgressStreaming, setIsProgressStreaming] = useState(false);
  const [actionLog, setActionLog] = useState([]);
  const [taskTitle, setTaskTitle] = useState('');

  const accessToken = useSelector(state => state.accessToken);
  const isDarkMode = useSelector(state => state.isDarkMode);

  // Smart overlay hiding logic
  const shouldHideOverlay = useCallback((actionDescription) => {
    const mouseActions = [
      'clicking', 'double-clicking', 'right-clicking', 'dragging',
      'mouse', 'moving mouse', 'scroll'
    ];
    
    return mouseActions.some(action => 
      actionDescription.toLowerCase().includes(action)
    );
  }, []);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((message) => {
    switch (message.type) {
      case 'connection_established':
        setTaskTitle(message.thread_title || 'AI Agent Task');
        break;
        
      case 'agent_action':
        const actionDescription = message.description;
        setCurrentAction(actionDescription);
        setIsActionStreaming(true);
        setActionLog(prev => [
          { description: actionDescription, timestamp: new Date().toLocaleTimeString() },
          ...prev.slice(0, 19) // Keep last 20 actions
        ]);
        
        // Smart overlay hiding for mouse actions
        if (shouldHideOverlay(actionDescription)) {
          console.log('🫥 Hiding overlay for mouse action:', actionDescription);
          window.electronAPI?.hideOverlayTemporarily?.(3000); // Hide for 3 seconds
        }
        break;
        
      case 'agent_thinking':
        setCurrentThinking(prev => prev + (prev ? '\n' : '') + message.thinking);
        setIsThinkingStreaming(true);
        break;
        
      case 'task_status':
        if (message.subtask_info?.message) {
          setTaskProgress(message.subtask_info.message);
          setIsProgressStreaming(true);
        }
        
        if (message.status === 'task_completed') {
          setCurrentAction('🎉 Task completed successfully!');
          setIsActionStreaming(true);
          setTaskProgress('All subtasks completed');
          setIsProgressStreaming(true);
        } else if (message.status === 'task_failed') {
          setCurrentAction('❌ Task failed');
          setIsActionStreaming(true);
          setTaskProgress('Task execution failed');
          setIsProgressStreaming(true);
        } else if (message.status === 'subtask_started') {
          setCurrentThinking(''); // Clear thinking when new subtask starts
        }
        break;
        
      default:
        console.log('Unknown WebSocket message:', message);
    }
  }, []);

  // WebSocket connection
  const { connectionStatus } = useThreadWebSocket(runningThreadId, accessToken, handleWebSocketMessage);

  const executeTask = () => {
    if (loading) {
      return;
    }
    createThread();
  };

  const executeSuggestion = (prompt) => {
    if (loading) return;

    window.electronAPI.expandOverlay(false);
    setShowSuggestions(false);
    createThread(prompt);
  };

  const toggleOverlay = async () => {
    if (!expanded) {
      if (runningThreadId === null) {
        window.electronAPI.expandOverlay(true);
        setExpanded(true);
        setShowSuggestions(true);
        if (suggestions.length === 0) {
          getSuggestions();
        }
      } else {
        window.electronAPI.expandOverlay(false);
        setExpanded(true);
      }
    } else {
      window.electronAPI.minimizeOverlay();
      setExpanded(false);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const getSuggestions = async () => {
    const suggestedTasks = await window.electronAPI.getSuggestions(
      process.env.REACT_APP_PROTOCOL + '://' + process.env.REACT_APP_DNS,
    );
    setSuggestions(suggestedTasks.suggestions);
  };

  const cancelRunningTask = (tid) => {
    setLoading(true);
    axios.post(`/threads/${tid}/cancel_task`, {}, {
      headers: {
        'Authorization': 'Bearer ' + accessToken,
      }
    }).then((response) => {
      setLoading(false);
      window.electronAPI.stopAIAgent();
      setRunningThreadId(null);
      // Clear WebSocket state
      setCurrentAction('');
      setCurrentThinking('');
      setTaskProgress('');
      setActionLog([]);
      setTaskTitle('');
      setIsActionStreaming(false);
      setIsThinkingStreaming(false);
      setIsProgressStreaming(false);
    }).catch((error) => {
      setLoading(false);
      if (error.response?.status === constants.status.UNAUTHORIZED) {
        window.location.reload();
      }
    });
  };

  const createThread = async (prompt = null) => {
    if (messageText.length === 0 && prompt === null) {
      return;
    }

    const data = {task: prompt !== null ? prompt : messageText, background_mode: backgroundMode, extended_thinking_mode: thinkingMode};
    setMessageText('');
    setLoading(true);
    
    // Clear previous WebSocket state
    setCurrentAction('');
    setCurrentThinking('');
    setTaskProgress('');
    setActionLog([]);
    setTaskTitle('');
    setIsActionStreaming(false);
    setIsThinkingStreaming(false);
    setIsProgressStreaming(false);
    
    axios.post('/threads', data, {
      headers: {
        'Authorization': 'Bearer ' + accessToken,
      }
    }).then(async (response) => {
      setLoading(false);
      if (response.data.type === 'desktop_task') {
        if (!backgroundMode && response.data.is_background_mode_requested) {
          const ready = await window.electronAPI.isBackgroundModeReady();
          if (!ready) {
            cancelRunningTask();
            return;
          }
        }
        setBackgroundMode(process.env.REACT_APP_BACKGROUND_MODE_SUPPORTED === 'true' && (backgroundMode || response.data.is_background_mode_requested));
        setThinkingMode(thinkingMode || response.data.is_extended_thinking_mode_requested);
        window.electronAPI.setLastThinkingModeValue((thinkingMode || response.data.is_extended_thinking_mode_requested).toString());
        window.electronAPI.launchAIAgent(
          process.env.REACT_APP_PROTOCOL + '://' + process.env.REACT_APP_DNS,
          response.data.thread_id,
          process.env.REACT_APP_BACKGROUND_MODE_SUPPORTED === 'true' && (backgroundMode || response.data.is_background_mode_requested)
        );
        setRunningThreadId(response.data.thread_id);
        setTaskTitle(prompt !== null ? prompt : messageText);
      }
    }).catch((error) => {
      setLoading(false);
      if (error.response?.status === constants.status.UNAUTHORIZED) {
        window.location.reload();
      }
    });
  };

  const onBGModeToggleChange = async (value) => {
    if (value) {
      const ready = await window.electronAPI.isBackgroundModeReady();
      if (!ready) {
        window.electronAPI.startBackgroundSetup();
        return;
      }
    }
    setBackgroundMode(value);
  };

  useEffect(() => {
    if (window.electronAPI?.onAIAgentLaunch) {
      window.electronAPI.onAIAgentLaunch((threadId) => {
        window.electronAPI.expandOverlay(false);
        setExpanded(true);
        setRunningThreadId(threadId);
        setShowSuggestions(false);
      });
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI?.onAIAgentExit) {
      window.electronAPI.onAIAgentExit(() => {
        setRunningThreadId(null);
        window.electronAPI.expandOverlay(true);
        setShowSuggestions(true);
        setSuggestions([]);
        getSuggestions();
        // Clear WebSocket state
        setCurrentAction('');
        setCurrentThinking('');
        setTaskProgress('');
        setActionLog([]);
        setTaskTitle('');
        setIsActionStreaming(false);
        setIsThinkingStreaming(false);
        setIsProgressStreaming(false);
      });
    }
  }, []);

  useEffect(() => {
    const asyncTask = async () => {
      const lastBackgroundModeValue = await window.electronAPI.getLastBackgroundModeValue();
      setBackgroundMode(lastBackgroundModeValue === 'true');
    };
    asyncTask();
  }, []);

  useEffect(() => {
    const asyncTask = async () => {
      const lastThinkingModeValue = await window.electronAPI.getLastThinkingModeValue();
      setThinkingMode(lastThinkingModeValue === 'true');
    };
    asyncTask();
  }, []);

  return (
    <Container>
      <div style={{display: 'flex', alignItems: 'center', width: '100%', height: '60px'}}>
        <AvatarButton color='transparent' onClick={() => toggleOverlay()}>
          <img
            src={isDarkMode ? neuralagent_logo_ic_only_white : neuralagent_logo_ic_only}
            alt='NeuralAgent'
            height={46}
            style={{userSelect: 'none', pointerEvents: 'none'}}
          />
        </AvatarButton>
        {expanded && (
          <>
            <div style={{width: '10px'}} />
            <Input
              value={messageText}
              isDarkMode={isDarkMode}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Ask NeuralAgent..."
              onKeyDown={(e) => e.key === 'Enter' && executeTask()}
            />
            {!loading && runningThreadId === null && (
              <> 
                {
                  process.env.REACT_APP_BACKGROUND_MODE_SUPPORTED === 'true' && 
                  <>
                    <div style={{width: '5px'}} />
                    <ToggleContainer>
                      <ModeToggle
                        active={backgroundMode}
                        isDarkMode={isDarkMode}
                        onClick={() => onBGModeToggleChange(!backgroundMode)}
                      >
                        <MdOutlineSchedule />
                      </ModeToggle>
                    </ToggleContainer>
                  </>
                }
                <div style={{width: '5px'}} />
                <ToggleContainer>
                  <ModeToggle
                    active={thinkingMode}
                    isDarkMode={isDarkMode}
                    onClick={() => setThinkingMode(!thinkingMode)}
                  >
                    <GiBrain />
                  </ModeToggle>
                </ToggleContainer>
              </>
            )}
            {(loading || runningThreadId !== null) && <Spinner isDarkMode={isDarkMode} />}
            <div style={{width: '5px'}} />
            {
            runningThreadId !== null && <>
                <IconButton iconSize='21px' color={isDarkMode ? '#fff' : 'rgba(0,0,0,0.6)'} onClick={() => cancelRunningTask(runningThreadId)}
                  disabled={loading}>
                  <FaStopCircle />
                </IconButton>
              </>
            }
          </>
        )}
      </div>
      {expanded && showSuggestions && (
        <SuggestionsPanel isDarkMode={isDarkMode}>
          {suggestions.length === 0
            ? Array.from({ length: 7 }).map((_, idx) => (
                <SkeletonItem isDarkMode={isDarkMode} key={idx} />
              ))
            : suggestions.map((s, idx) => (
                <SuggestionItem
                  key={idx}
                  isDarkMode={isDarkMode}
                  onClick={() => executeSuggestion(s.ai_prompt)}
                >
                  {s.title}
                </SuggestionItem>
              ))}
        </SuggestionsPanel>
      )}
      {expanded && runningThreadId && (
        <AgentStatusPanel isDarkMode={isDarkMode}>
          <StatusHeader isDarkMode={isDarkMode}>
            <TaskTitle isDarkMode={isDarkMode}>
              {taskTitle || 'AI Agent Task'}
            </TaskTitle>
            <ConnectionStatus isDarkMode={isDarkMode}>
              <StatusIndicator status={connectionStatus} />
              {connectionStatus === 'connected' ? 'Live' : 
               connectionStatus === 'connecting' ? 'Connecting...' :
               connectionStatus === 'disconnected' ? 'Reconnecting...' : 'Error'}
            </ConnectionStatus>
          </StatusHeader>

          <AgentActivityContainer>
            {taskProgress && (
              <TaskProgressDisplay isDarkMode={isDarkMode}>
                <StreamingText 
                  text={taskProgress} 
                  isStreaming={isProgressStreaming}
                  speed={25}
                  onComplete={() => setIsProgressStreaming(false)}
                />
              </TaskProgressDisplay>
            )}

            {currentAction && (
              <CurrentActionDisplay isDarkMode={isDarkMode}>
                <StreamingText 
                  text={currentAction} 
                  isStreaming={isActionStreaming}
                  speed={35}
                  onComplete={() => setIsActionStreaming(false)}
                />
              </CurrentActionDisplay>
            )}

            {currentThinking && thinkingMode && (
              <ThinkingDisplay isDarkMode={isDarkMode}>
                <strong>💭 Agent Thinking:</strong><br />
                <StreamingText 
                  text={currentThinking} 
                  isStreaming={isThinkingStreaming}
                  speed={45}
                  onComplete={() => setIsThinkingStreaming(false)}
                />
              </ThinkingDisplay>
            )}

            {actionLog.length > 0 && (
              <ActionLogContainer isDarkMode={isDarkMode}>
                <ActionLogTitle isDarkMode={isDarkMode}>
                  Recent Actions
                </ActionLogTitle>
                {actionLog.map((action, idx) => (
                  <ActionLogItem key={idx} isDarkMode={isDarkMode}>
                    <span style={{ opacity: 0.7, fontSize: '10px' }}>
                      {action.timestamp}
                    </span>{' '}
                    {action.description}
                  </ActionLogItem>
                ))}
              </ActionLogContainer>
            )}
          </AgentActivityContainer>
        </AgentStatusPanel>
      )}
    </Container>
  );
}
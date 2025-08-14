import React, { useState, useEffect } from 'react';
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

export default function Overlay() {
  const [expanded, setExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [runningThreadId, setRunningThreadId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [backgroundMode, setBackgroundMode] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(false);

  const accessToken = useSelector(state => state.accessToken);
  const isDarkMode = useSelector(state => state.isDarkMode);

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
    </Container>
  );
}
import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  color: ${props => props.isDarkMode ? 'var(--secondary-color)' : 'rgba(0,0,0,0.7)'};
  height: 100vh;
  width: 100vw;
  overflow: hidden;
`;

const InstructionBox = styled.div`
  padding: 1rem 2rem;
  font-size: 1rem;
  line-height: 1.6;
  text-align: center;
  border-bottom: 1px solid var(--third-color);
`;

const Highlight = styled.span`
  font-weight: 600;
`;

const FrameWrapper = styled.div`
  flex: 1;
  iframe {
    width: 100%;
    height: 100%;
    border: none;
  }
`;

export default function BackgroundAuth() {

  const isDarkMode = useSelector(state => state.isDarkMode);

  return (
    <Container isDarkMode={isDarkMode}>
      <InstructionBox>
        Log in to any sites or apps you'd like <Highlight>NeuralAgent</Highlight> to control in the background. Close the window when you finish.<br />
        <small style={{ opacity: 0.7 }}>
          These sessions are stored securely on your computer. You can always do this from App &gt; Background Mode Authentication.
        </small>
      </InstructionBox>
      <FrameWrapper>
        <iframe
          src="http://127.0.0.1:39742/vnc.html?autoconnect=true&bell=off"
          title="NeuralAgent VNC Session"
        />
      </FrameWrapper>
    </Container>
  );
}

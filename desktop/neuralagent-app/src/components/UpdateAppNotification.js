import React from 'react';
import styled from 'styled-components';

const NotificationOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
`;

const NotificationModal = styled.div`
  background: ${props => props.isDarkMode ? '#30302e' : '#ffffff'};
  color: ${props => props.isDarkMode ? '#ffffff' : '#000000'};
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  text-align: center;
  border: ${props => props.isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'};
`;

const UpdateIcon = styled.div`
  font-size: 48px;
  margin-bottom: 20px;
`;

const Title = styled.h2`
  margin: 0 0 10px 0;
  font-size: 24px;
  font-weight: 600;
  color: ${props => props.isDarkMode ? '#ffffff' : '#000000'};
`;

const Subtitle = styled.p`
  margin: 0 0 20px 0;
  opacity: 0.8;
  font-size: 16px;
  color: ${props => props.isDarkMode ? '#ffffff' : '#000000'};
`;

const VersionInfo = styled.div`
  background: ${props => props.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
  padding: 15px;
  border-radius: 8px;
  margin: 20px 0;
  font-family: monospace;
  font-size: 14px;
  
  div {
    margin: 5px 0;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 25px;
`;

const Button = styled.button`
  padding: 12px 24px;
  border-radius: 6px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;

  ${props => props.primary ? `
    background: var(--primary-color);
    color: white;
    &:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
  ` : `
    background: transparent;
    color: ${props.isDarkMode ? '#ffffff' : '#000000'};
    border: 1px solid ${props.isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'};
    &:hover {
      background: ${props.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
    }
  `}
`;

const UpdateNotification = ({ updateInfo, onDownload, onHide, isDarkMode }) => {
  if (!updateInfo) return null;

  return (
    <NotificationOverlay>
      <NotificationModal isDarkMode={isDarkMode}>
        <UpdateIcon>🚀</UpdateIcon>
        <Title isDarkMode={isDarkMode}>New Version Available!</Title>
        <Subtitle isDarkMode={isDarkMode}>
          A newer version of NeuralAgent is ready to download
        </Subtitle>
        
        <VersionInfo isDarkMode={isDarkMode}>
          <div>Current: v{updateInfo.currentVersion}</div>
          <div>Latest: v{updateInfo.latestVersion}</div>
        </VersionInfo>

        {updateInfo.releaseNotes && (
          <p style={{ 
            fontSize: '14px', 
            opacity: 0.8, 
            marginBottom: '20px',
            color: isDarkMode ? '#ffffff' : '#000000'
          }}>
            {updateInfo.releaseNotes}
          </p>
        )}

        <ButtonContainer>
          <Button 
            primary 
            onClick={onDownload}
            isDarkMode={isDarkMode}
          >
            Download Update
          </Button>
          <Button 
            onClick={onHide}
            isDarkMode={isDarkMode}
          >
            Later
          </Button>
        </ButtonContainer>
      </NotificationModal>
    </NotificationOverlay>
  );
};

export default UpdateNotification;
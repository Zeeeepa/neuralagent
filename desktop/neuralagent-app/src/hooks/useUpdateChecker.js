import { useState, useEffect } from 'react';
import axios from '../utils/axios';
import constants from '../utils/constants';

const compareVersions = (current, latest) => {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);
  
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;
    
    if (latestPart > currentPart) return true;
    if (currentPart > latestPart) return false;
  }
  return false;
};

export const useUpdateChecker = () => {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdate, setShowUpdate] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkForUpdates = async () => {
    setChecking(true);
    try {
      const response = await axios.get('/neuralagent_desktop/latest_version');
      const latestVersion = response.data.version;
      
      if (compareVersions(constants.APP_VERSION, latestVersion)) {
        const info = {
          currentVersion: constants.APP_VERSION,
          latestVersion,
          downloadUrl: response.data.download_url,
          releaseNotes: response.data.release_notes,
          required: response.data.required
        };
        setUpdateInfo(info);
        setShowUpdate(true);
        return info;
      }
      return null;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return null;
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Check for updates on app start (after 5 seconds)
    const timer = setTimeout(() => {
      checkForUpdates();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const hideUpdate = () => {
    setShowUpdate(false);
  };

  const downloadUpdate = () => {
    if (updateInfo?.downloadUrl) {
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(updateInfo.downloadUrl);
      } else {
        window.open(updateInfo.downloadUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return {
    updateInfo,
    showUpdate,
    checking,
    checkForUpdates,
    hideUpdate,
    downloadUpdate
  };
};
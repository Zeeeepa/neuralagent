import React from 'react';
import { LoadingDialogContainer, LoadingDialogOverlay } from './LoadingDialogElements';
import ClipLoader from "react-spinners/ClipLoader";
import { useSelector } from 'react-redux';

function LoadingDialog() {

  const isDarkMode = useSelector(state => state.isDarkMode);

  return (
    <>
      <LoadingDialogOverlay />
      <LoadingDialogContainer isDarkMode={isDarkMode}>
        <ClipLoader
          color={isDarkMode ? "var(--secondary-color)" : "var(--primary-color)"}
          size={100}
        />
      </LoadingDialogContainer>
    </>
  );
}

export default LoadingDialog;

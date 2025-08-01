import styled from 'styled-components';
import { NavLink } from 'react-router-dom';

export const SidebarContainer = styled.div`
  width: 260px;
  display: flex;
  flex-direction: column;
  padding: 12px;
  border-right: thin solid rgba(255, 255, 255, 0.1);
  background: ${props => props.isDarkMode ? 'var(--sidebar-color-dark)' : 'var(--sidebar-color)'};
`;

export const LogoWrapper = styled(NavLink)`
  display: flex;
  justify-content: center;
  margin-top: 8px;
`;

export const Logo = styled.img`
  object-fit: contain;
  pointer-events: none;
  user-select: none;
`;

export const ThemeToggleWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 5px;
`;

export const ThemeToggle = styled.label`
  position: relative;
  width: 60px;
  height: 28px;
  background: ${props => props.checked
    ? 'linear-gradient(135deg, #2b5876, #4e4376)'
    : 'linear-gradient(135deg, #e0e0e0, #ffffff)'};
  border-radius: 999px;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: ${props => props.checked
    ? '0 0 8px rgba(255,255,255,0.2)'
    : 'inset 0 1px 3px rgba(0,0,0,0.2)'};
`;

export const ToggleThumb = styled.span`
  position: absolute;
  top: 3px;
  left: ${props => props.checked ? '32px' : '3px'};
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: ${props => props.checked ? '#fff' : '#333'};
  transition: left 0.25s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.checked ? '#f39c12' : '#f1c40f'};
  font-size: 13px;
`;

export const HiddenCheckbox = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
`;

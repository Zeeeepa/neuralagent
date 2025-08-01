import React, { useEffect, useState } from 'react';
import neuralagent_logo from '../../assets/neuralagent_logo.png';
import neuralagent_logo_white from '../../assets/neuralagent_logo_white.png';
import { BtnIcon, Button } from '../../components/Elements/Button';
import { MdAddCircleOutline } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setLoadingDialog } from '../../store';
import constants from '../../utils/constants';
import axios from '../../utils/axios';
import {
  SidebarContainer,
  LogoWrapper,
  Logo,
  ThemeToggleWrapper,
  ThemeToggle,
  ToggleThumb,
  HiddenCheckbox
} from './SidebarElements';
import {
  List,
  ListItemRR,
  ListItemContent,
  ListItemTitle
} from '../../components/Elements/List';
import { Text } from '../../components/Elements/Typography';
import { BsSunFill, BsMoonStarsFill } from 'react-icons/bs';


export default function Sidebar() {

  const [threads, setThreads] = useState([]);

  const isLoading = useSelector(state => state.isLoading);
  const isDarkMode = useSelector(state => state.isDarkMode);
  const accessToken = useSelector(state => state.accessToken);

  const navigate = useNavigate();

  const dispatch = useDispatch();
  
  const toggleDarkMode = () => {
    window.electronAPI.setDarkMode(!isDarkMode);
    window.location.reload();
  };

  const getThreads = () => {
    dispatch(setLoadingDialog(true));
    axios.get('/threads', {
      headers: {
        'Authorization': 'Bearer ' + accessToken,
      }
    }).then((response) => {
      setThreads(response.data);
      dispatch(setLoadingDialog(false));
    }).catch((error) => {
      dispatch(setLoadingDialog(false));
      if (error.response.status === constants.status.UNAUTHORIZED) {
        window.location.reload();
      }
    });
  }

  useEffect(() => {
    getThreads();
  }, []);

  return (
    <SidebarContainer isDarkMode={isDarkMode}>
      <LogoWrapper to="/">
        <Logo
          src={isDarkMode ? neuralagent_logo_white : neuralagent_logo}
          alt="NeuralAgent"
          height={55}
        />
      </LogoWrapper>
      <ThemeToggleWrapper>
        <ThemeToggle checked={isDarkMode}>
          <HiddenCheckbox
            type="checkbox"
            checked={isDarkMode}
            onChange={() => toggleDarkMode()}
          />
          <ToggleThumb checked={isDarkMode}>
            {isDarkMode ? <BsMoonStarsFill /> : <BsSunFill />}
          </ToggleThumb>
        </ThemeToggle>
      </ThemeToggleWrapper>
      <Button padding='7px 15px' color={'var(--primary-color)'} borderRadius={6} fontSize='15px' dark
         style={{marginTop: '10px'}}
         onClick={() => navigate('/')}>
        <BtnIcon left color='#fff' iconSize='23px'>
          <MdAddCircleOutline />
        </BtnIcon>
        New Task
      </Button>
      <List padding='0px 10px' style={{marginTop: '10px', overflowY: 'auto'}}>
        {
          !isLoading && threads.length === 0 ? (
            <Text style={{marginTop: '7px', padding: '8px'}}
              fontSize='14px'
              textAlign='center'
              color={isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'}>
              You currently have no threads
            </Text>
          ) : (
            <>
              {threads.map((thread) => {
                return (
                  <ListItemRR key={'thread__' + thread.id} padding='10px' to={'/threads/' + thread.id} isDarkMode={isDarkMode}
                    borderRadius='8px'
                    style={{marginTop: '5px'}}>
                    <ListItemContent>
                      <ListItemTitle fontSize='14px' color={isDarkMode ? '#fff' : '#000'} fontWeight='400'>
                        {thread.title}
                      </ListItemTitle>
                    </ListItemContent>
                  </ListItemRR>
                )
              })}
            </>
          )
        }
      </List>
    </SidebarContainer>
  );
}

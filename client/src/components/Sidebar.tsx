import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Collapse,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
import LogoutIcon from '@mui/icons-material/Logout';
import { useTranslation } from 'react-i18next';

const drawerWidth = 240;
const collapsedWidth = 60;

interface SidebarProps {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
  setIsLoggedIn: (userData: any, token: string) => void;
  setDrawerOpen: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen, handleDrawerToggle, setIsLoggedIn, setDrawerOpen }: SidebarProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const navigate = useNavigate();

  const menuItemsTop = [
    { text: t('sidebar.child'), icon: <SchoolIcon />, path: '/criancas' },
  ];

  const menuItemsBottom = [
    { text: t('sidebar.profile'), icon: <PersonIcon />, path: '/perfil' },
    { 
      text: t('sidebar.logout'), 
      icon: <LogoutIcon />, 
      path: '/', 
      action: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        localStorage.removeItem('user_data');
        navigate('/');
      } 
    },
  ];

  const handleToggleSidebar = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (setDrawerOpen) {
      setDrawerOpen(nextState);
    }
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: isOpen ? 'flex-end' : 'center', p: 1 }}>
          <IconButton onClick={handleToggleSidebar}>
            {isOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Box>
        <List>
          {menuItemsTop.map((item, index) => (
            <ListItem key={index} disablePadding sx={{ display: 'block' }}>
              <ListItemButton 
                onClick={() => navigate(item.path)}
                sx={{ minHeight: 48, justifyContent: isOpen ? 'initial' : 'center', px: 2.5 }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: isOpen ? 3 : 'auto', justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
                <Collapse in={isOpen} orientation="horizontal" unmountOnExit>
                  <ListItemText primary={item.text} sx={{ opacity: isOpen ? 1 : 0, ml: 2 }} />
                </Collapse>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <List>
        {menuItemsBottom.map((item, index) => (
          <ListItem key={index} disablePadding sx={{ display: 'block' }}>
            <ListItemButton 
              onClick={item.action || (() => navigate(item.path))}
              sx={{ minHeight: 48, justifyContent: isOpen ? 'initial' : 'center', px: 2.5 }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: isOpen ? 3 : 'auto', justifyContent: 'center' }}>
                {item.icon}
              </ListItemIcon>
              <Collapse in={isOpen} orientation="horizontal" unmountOnExit>
                <ListItemText primary={item.text} sx={{ opacity: isOpen ? 1 : 0, ml: 2 }} />
              </Collapse>
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { sm: isOpen ? drawerWidth : collapsedWidth }, flexShrink: { sm: 0 }, transition: 'width 0.2s' }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: isOpen ? drawerWidth : collapsedWidth,
            transition: 'width 0.2s',
            overflowX: 'hidden'
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}
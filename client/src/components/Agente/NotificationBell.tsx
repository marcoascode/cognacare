import React, { useState, useEffect, useRef } from 'react';
import { 
  Badge, IconButton, Menu, MenuItem, Typography, Box, 
  Divider, Tooltip, CircularProgress, Chip 
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../api/axiosConfig';

// --- INTERFACES ---
interface IAlerta {
  id: number;
  nome_crianca?: string;
  nivel_urgencia: 'alto' | 'medio' | 'baixo' | string;
  mensagem: string;
  sugestao_acao?: string;
  criado_em?: string;
}

interface ISocketAlerta {
  nome_crianca: string;
  alerta: {
    nivel_urgencia: string;
    mensagem_acolhedora: string;
    sugestao_acao_imediata: string;
  };
}

export default function NotificationBell() {
  const theme = useTheme();
  const socket = useSocket();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [alertas, setAlertas] = useState<IAlerta[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const open = Boolean(anchorEl);
  
  // Proteção contra chamadas duplicadas do React Strict Mode
  const hasFetched = useRef<boolean>(false);

  const fetchAlertas = async () => {
    try {
      setLoading(true);
      const response = await api.get('/fernandasepe/agente/alertas');
      setAlertas(response.data);
    } catch (error) {
      console.error('Erro ao buscar alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    
    fetchAlertas();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('alerta_agente', (novoAlerta: ISocketAlerta) => {
      // Adiciona o novo alerta ao topo da lista local imediatamente sem refetch
      setAlertas(prev => [{
        id: Date.now(), // ID temporário para key
        nome_crianca: novoAlerta.nome_crianca,
        nivel_urgencia: novoAlerta.alerta.nivel_urgencia,
        mensagem: novoAlerta.alerta.mensagem_acolhedora,
        sugestao_acao: novoAlerta.alerta.sugestao_acao_imediata,
        criado_em: new Date().toISOString()
      }, ...prev]);
    });

    return () => {
        socket.off('alerta_agente');
    };
  }, [socket]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.put(`/fernandasepe/agente/alertas/${id}/lido`);
      setAlertas(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Erro ao marcar como lido:', error);
    }
  };

  const getUrgencyColor = (nivel: string): 'error' | 'warning' | 'info' => {
    if (nivel === 'alto') return 'error';
    if (nivel === 'medio') return 'warning';
    return 'info';
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title="Alertas do Agente">
        <IconButton sx={{color: alpha(theme.palette.primary.dark, 1)}} onClick={handleOpenMenu}>
          <Badge badgeContent={alertas.length} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleCloseMenu}
        slotProps={{ paper: { sx: { width: 350, maxHeight: 450, borderRadius: 2, mt: 1.5 } } }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToyIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">Cognacare Agent</Typography>
        </Box>
        <Divider />

        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress size={24} /></Box>}

        {alertas.length === 0 && !loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Tudo tranquilo por aqui. Nenhuma intervenção necessária.</Typography>
          </Box>
        ) : (
          alertas.map((alerta) => (
            <MenuItem 
              key={alerta.id} 
              onClick={() => handleMarkAsRead(alerta.id)}
              sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', whiteSpace: 'normal', py: 1.5 }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 0.5 }}>
                <Typography variant="caption" fontWeight="bold" color="primary">
                  {alerta.nome_crianca}
                </Typography>
                <Chip label={alerta.nivel_urgencia} size="small" color={getUrgencyColor(alerta.nivel_urgencia)} sx={{ height: 16, fontSize: '0.6rem' }} />
              </Box>
              <Typography variant="body2" fontWeight="medium" sx={{ mb: 0.5 }}>
                {alerta.mensagem}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                💡 {alerta.sugestao_acao}
              </Typography>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
}
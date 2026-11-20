import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  FormControl,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  SelectChangeEvent
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';

// Ícones
import ChildCareIcon from '@mui/icons-material/ChildCare';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EscalatorWarningIcon from '@mui/icons-material/EscalatorWarning';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

// Moods Icons
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';

// Importação do Contrato Compartilhado
import { ICrianca } from '../../../Shared';
import api from '../api/axiosConfig';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigate = useNavigate();

  const [criancas, setCriancas] = useState<ICrianca[]>([]);
  const [selectedCriancaId, setSelectedCriancaId] = useState<number | string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copyNotificationOpen, setCopyNotificationOpen] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/fernandasepe/criancas');
      setCriancas(response.data);
      
      if (response.data.length > 0) {
        setSelectedCriancaId(response.data[0].id_crianca || '');
      }
    } catch (err: any) {
      setError(err.response?.data?.erro || t('errorserver'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleChildChange = (event: SelectChangeEvent<number | string>) => {
    setSelectedCriancaId(event.target.value);
  };

  const getHumorIcon = (mood: number, size: number) => {
    const style = { fontSize: size };
    switch (mood) {
      case 5: return <SentimentVerySatisfiedIcon sx={style} color="primary" />;
      case 4: return <SentimentSatisfiedAltIcon sx={style} color="success" />;
      case 3: return <SentimentNeutralIcon sx={style} color="action" />;
      case 2: return <SentimentDissatisfiedIcon sx={style} color="warning" />;
      case 1: return <SentimentVeryDissatisfiedIcon sx={style} color="error" />;
      default: return <SentimentNeutralIcon sx={style} />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
        {t('home_tab.access_panel')}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Seletor de Criança */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              {t('kids')}
            </Typography>
            {criancas.length > 0 ? (
              <FormControl fullWidth variant="outlined" sx={{ mt: 1 }}>
                <Select value={selectedCriancaId} onChange={handleChildChange}>
                  {criancas.map((crianca) => (
                    <MenuItem key={crianca.id_crianca} value={crianca.id_crianca}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <ChildCareIcon color="primary" />
                        <Typography>{crianca.nome}</Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Box sx={{ textAlign: 'center', my: 2 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Nenhuma criança cadastrada.
                </Typography>
                <Button 
                  variant="outlined" 
                  startIcon={<AddCircleOutlineIcon />} 
                  onClick={() => navigate('/criancas')}
                  sx={{ mt: 1 }}
                >
                  Cadastrar Primeira Criança
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Atalhos Rápidos */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Ações Rápidas
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
              <Button 
                variant="contained" 
                startIcon={<EscalatorWarningIcon />} 
                onClick={() => navigate('/pif')}
                disabled={criancas.length === 0}
              >
                {t('pif')}
              </Button>
              <Button 
                variant="contained" 
                color="success"
                startIcon={<AutoStoriesIcon />} 
                onClick={() => navigate('/diario-bordo')}
                disabled={criancas.length === 0}
              >
                {t('sidebar.logbook')}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* Painel de Humor Informativo */}
        <Grid size={{ xs: 12 }}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Legenda de Monitoramento Diário
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 2 }}>
              <Chip size="medium" icon={getHumorIcon(1, 20)} label={t('logbook.moods.1')} sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main', fontWeight: 'bold' }} />
              <Chip size="medium" icon={getHumorIcon(2, 20)} label={t('logbook.moods.2')} sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.main', fontWeight: 'bold' }} />
              <Chip size="medium" icon={getHumorIcon(3, 20)} label={t('logbook.moods.3')} sx={{ bgcolor: alpha(theme.palette.text.primary, 0.05), color: 'text.secondary', fontWeight: 'bold' }} />
              <Chip size="medium" icon={getHumorIcon(4, 20)} label={t('logbook.moods.4')} sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main', fontWeight: 'bold' }} />
              <Chip size="medium" icon={getHumorIcon(5, 20)} label={t('logbook.moods.5')} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', fontWeight: 'bold' }} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar 
        open={copyNotificationOpen} 
        autoHideDuration={3000} 
        onClose={() => setCopyNotificationOpen(false)}
      >
        <Alert severity="success" sx={{ width: '100%' }}>Copiado com sucesso!</Alert>
      </Snackbar>
    </Box>
  );
}
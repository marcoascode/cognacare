import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Stack, Grid } from '@mui/material';
import { useTranslation } from 'react-i18next';

const NotFound: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Redireciona para a página inicial após 5 segundos ou permite ação manual
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 5000);
    
    return () => clearTimeout(timer); // Limpa o timer ao desmontar o componente
  }, [navigate]);

  return (
    <Grid
        container
        spacing={2}
        direction="column"
        justifyContent="center"
        alignItems="center"
        sx={{
          minHeight: '100vh',
          width: '100vw',
          margin: 0,
        }}
      >
      <Typography variant="h4" component="h1">
        {t('not_found.err404')}
      </Typography>
      
      {/* <Typography variant="body1">
        Você será redirecionado para a página inicial em 5 segundos.
      </Typography> */}
      
      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          {t('not_found.back_home')}
        </Button>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          {t('not_found.back_previous')}
        </Button>
      </Stack>
    </Grid>
  );
};

export default NotFound;
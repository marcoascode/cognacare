import React from 'react';
import { Box, Button, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LoginIcon from '@mui/icons-material/Login';
import CreateIcon from '@mui/icons-material/Create';
import {
  createTheme,
  ThemeProvider,
  PaletteColor,
  PaletteColorOptions
} from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

// --- EXTENSÃO DE TIPOS DO MATERIAL-UI ---
// Diz ao TypeScript que a paleta do MUI agora possui a cor "salmon"
declare module '@mui/material/styles' {
  interface Palette {
    salmon: PaletteColor;
  }
  interface PaletteOptions {
    salmon?: PaletteColorOptions;
  }
}

// Permite usar color="salmon" no componente <Button>
declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    salmon: true;
  }
}

// --- CONFIGURAÇÃO DO TEMA ---
let theme = createTheme({});
theme = createTheme(theme, {
  palette: {
    salmon: theme.palette.augmentColor({
      color: { main: '#FF5733' },
      name: 'salmon',
    }),
  },
});

// --- COMPONENTE PRINCIPAL ---
const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const login = () => navigate('/login');
  const signup = () => navigate('/signup');

  return (
    <ThemeProvider theme={theme}>
      <Grid
        container
        direction="column"
        justifyContent="center"
        alignItems="center"
        sx={{ p: { xs: 1, md: 3 }, minHeight: '50vh', maxWidth: '1200px', mx: 'auto' }}
      >
        {/* Imagem + Texto Sobreposto */}
        <Grid size={{ xs: 12, md: 8, lg: 6 }}>
          {/* Imagem de fundo */}
          <Box
            component="img"
            src="/Cognacare.webp"
            alt="Cognacare"
            sx={{
              width: { xs: '60%', md: '50%', lg: '50%' },
              display: 'block',
              mx: 'auto',
            }}
          />
        </Grid>

        {/* Botões */}
        <Grid size={{ xs: 10, sm: 8, md: 5, lg: 4 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={login}
            fullWidth
            endIcon={<LoginIcon />}
            sx={{ mb: 2, py: 1.8, fontSize: '1.1rem' }}
          >
            {t('home_tab.access_panel')}
          </Button>

          <Button
            variant="contained"
            color="secondary"
            onClick={signup}
            fullWidth
            endIcon={<CreateIcon />}
            sx={{ py: 1.8, fontSize: '1.1rem' }}
          >
            {t('home_tab.sign_up')}
          </Button>
        </Grid>
      </Grid>
    </ThemeProvider>
  );
};

export default Home;
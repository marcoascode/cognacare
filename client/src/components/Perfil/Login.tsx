import React, { useState, useRef, FormEvent } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  Paper,
  Grid,
  Alert
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
// import ReCAPTCHA from 'react-google-recaptcha';
import api from '../../api/axiosConfig';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';

// Substitui a biblioteca PropTypes. Define exatamente o que o componente Login pode receber.
interface LoginProps {
  setIsLoggedIn?: (value: boolean) => void;
}

export default function Login({ setIsLoggedIn }: LoginProps) {
  const { t } = useTranslation();
  const location = useLocation();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  
  // Extrai a mensagem de sucesso caso venha do redirecionamento do Signup
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(location.state?.message || null);
  
  const [loading, setLoading] = useState<boolean>(false);
  // const recaptchaRef = useRef<ReCAPTCHA>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    // const recaptchaToken = recaptchaRef.current?.getValue();
    // if (!recaptchaToken) {
    //   setError(t('errorobo'));
    //   setLoading(false);
    //   return;
    // }

    try {
      const isMobile = Capacitor.isNativePlatform();

      const response = await api.post('/fernandasepe/login', {
        email,
        senha: password,
        isMobile,
        // recaptchaToken
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('email', response.data.usuario.email);
      
      if (setIsLoggedIn) {
        setIsLoggedIn(true);
      }
      
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.erro || t('errorcredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid
          container
          direction="column"
          justifyContent="center"
          alignItems="center"
          sx={{ p:{xs:1, md:3}, minHeight: '50vh', maxWidth: '1200px', mx: 'auto', my: 2 }}
        >
          {/* <LanguageSwitcher 
            sx={{ 
              position: 'absolute', 
              top: 10, 
              right: 10, 
              zIndex: 1000 
            }} 
          /> */}
          <Grid size={{ xs: 11, sm: 8, md: 6 }}>
            <Paper elevation={3} sx={{ pb: 2, px: 2 }}>
              <Box
                component="img"
                src="/Cognacare.webp"
                sx={{
                  width: { xs: '80%', md: '50%', lg: '40%' },
                  display: 'block',
                  mx: 'auto',
                }}
                alt="CognaCare"
              />
              <Typography variant="h6" align="center" gutterBottom>{t('home_tab.access_panel')}</Typography>
              {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
              <Box component="form" onSubmit={handleSubmit}>
                {/* {error && (
                  <Typography color="error" align="center" sx={{ mb: 2 }}>
                    {error}
                  </Typography>
                )} */}
                <TextField
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  required
                />
                <TextField
                  // label="Senha"
                  label={t('password')}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  required
                />
                {/* <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                    onChange={() => setError(null)} // Limpar erro ao interagir com o reCAPTCHA
                  />
                </Box> */}
            
            <Grid container alignItems={'center'} justifyContent={'center'}>
              <Grid size={{ sm: 5 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ mt: 2 }}
                  disabled={loading}
                  endIcon={loading ? undefined : <LoginIcon />}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : t('enter')}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>
        <Button onClick={() => navigate('/forgot-password')} color="primary" fullWidth sx={{ mt: 1 }}>
          {t('forgotpwd')}
        </Button>
        <Typography variant="body2" align="center" sx={{ mt: 2 }}>
          {`${t('notsigned')} `}
          <Link to="/signup" style={{ textDecoration: 'none', color: '#1976d2' }}>
            {t('home_tab.signup')}
          </Link>
        </Typography>
      </Grid>
    </Grid>
  );
}
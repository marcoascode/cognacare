import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  Grid
} from '@mui/material';
import api from '../../api/axiosConfig';
import { useTranslation } from 'react-i18next';

// --- INTERFACES ---
interface VerifyEmailProps {
  verifyEmailResult?: any; // Adicionado para satisfazer o App.tsx
}

const VerifyEmail: React.FC<VerifyEmailProps> = ({ verifyEmailResult }) => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  const hasFetched = useRef<boolean>(false);

  useEffect(() => {
    if (!token) {
      setError(t('verify_email.invalid_token') || 'Token inválido ou não fornecido na URL.');
      setLoading(false);
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    const verifyAccount = async () => {
      try {
        const response = await api.get(`/fernandasepe/verify-email?token=${token}`);
        setMessage(response.data.mensagem);
      } catch (err: any) {
        setError(err.response?.data?.erro || t('verify_email.verification_error') || 'Ocorreu um erro ao verificar o seu e-mail.');
        console.error('Erro na verificação:', err);
      } finally {
        setLoading(false);
      }
    };

    verifyAccount();
  }, [token, t]);

  return (
    <Grid
      container
      direction="column"
      justifyContent="center"
      alignItems="center"
      sx={{ minHeight: '100vh', width: '100vw', margin: 0 }}
    >
      <Grid size={{ xs: 11, md: 6 }}>
        <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}>
          <Box
            component="img"
            src="/Cognacare.webp"
            sx={{
              width: { xs: '80%', md: '50%', lg: '60%' },
              display: 'block',
              mx: 'auto',
              mb: 3
            }}
            alt="CognaCare"
          />
          
          <Typography variant="h5" gutterBottom>
            {t('verify_email.title') || 'Verificação de E-mail'}
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
              <CircularProgress size={40} color="primary" sx={{ mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {t('verify_email.processing') || 'A verificar a sua conta...'}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ my: 3 }}>
              {message && (
                <Alert severity="success" sx={{ mb: 3, textAlign: 'left' }}>
                  {message}
                </Alert>
              )}
              {error && (
                <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                  {error}
                </Alert>
              )}

              <Button 
                component={Link} 
                to="/login" 
                variant="contained" 
                color="primary" 
                fullWidth
                size="large"
                sx={{ mt: 2 }}
              >
                {t('verify_email.go_to_login') || 'Ir para o Login'}
              </Button>
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};

export default VerifyEmail;
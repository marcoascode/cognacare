import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Button,
  Paper,
  TextField,
  Typography,
  Box,
  IconButton,
  InputAdornment,
  CircularProgress,
  Alert,
  Grid
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import api from '../../api/axiosConfig';
import { useTranslation } from 'react-i18next';

const ResetPassword: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Pegar o token da URL
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      setError(t('reset_password.errors.invalid_token_initial'));
    } else {
      setToken(tokenFromUrl);
    }
  }, [searchParams, t]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    if (!password || !confirmPassword) {
      setError(t('reset_password.errors.fill_fields'));
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError(t('reset_password.errors.mismatch'));
      setLoading(false);
      return;
    }
    if (!token) {
      setError(t('reset_password.errors.invalid_token_submit'));
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/fernandasepe/reset-password', {
        token,
        senha: password,
      });
      // O Backend retorna uma mensagem, concatenamos com a info de redirecionamento traduzida
      setMessage(`${response.data.mensagem} ${t('reset_password.success_redirect')}`);
      setTimeout(() => navigate('/login'), 5000);
    } catch (err: any) {
      setError(err.response?.data?.erro || t('reset_password.errors.generic_error'));
      console.error('Erro na requisição:', err);
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
      sx={{ minHeight: '100vh', width: '100vw', margin: 0 }}
    >
      <Grid size={{ xs: 11, md: 6 }}>
        <Paper elevation={3} sx={{ pb: 2, pl: 2, pr: 2 }}>
          <Box
            component="img"
            src="/Cognacare.webp"
            sx={{
              width: { xs: '80%', md: '50%', lg: '60%' },
              display: 'block',
              mx: 'auto',
            }}
            alt="CognaCare"
          />
          <Typography variant="h5" align="center" gutterBottom>
            {t('reset_password.title')}
          </Typography>
          
          {message && <Alert severity="success" sx={{ my: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
          
          {!message && (
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                label={t('reset_password.new_password')}
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                fullWidth required margin="normal"
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }
                }}
              />
              <TextField
                label={t('reset_password.confirm_new_password')}
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                fullWidth required margin="normal"
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }
                }}
              />
              <Button 
                type="submit" 
                variant="contained" 
                color="primary" 
                fullWidth 
                sx={{ mt: 2 }} 
                disabled={loading || !token}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : t('reset_password.save_button')}
              </Button>
            </Box>
          )}
           <Typography variant="body2" align="center" sx={{ mt: 3 }}>
              <Link to="/login" style={{ textDecoration: 'none', color: '#1976d2' }}>
                {t('reset_password.back_to_login')}
              </Link>
            </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ResetPassword;
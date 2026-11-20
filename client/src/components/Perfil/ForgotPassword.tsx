import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Paper,
  TextField,
  Typography,
  Box,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material';
import api from '../../api/axiosConfig';
import { useTranslation } from 'react-i18next';

const ForgotPassword: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      const response = await api.post('/fernandasepe/forgot-password', { email });
      setMessage(response.data.mensagem);
    } catch (err: any) {
      setError(err.response?.data?.erro || t('password_comp.pwd_error'));
      console.error(err);
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
      <Grid size={{ xs: 11, sm: 8, md: 6 }}>
        <Paper elevation={3} sx={{ pb: 2, pl: 2, pr: 2 }}>
          <Box
            component="img"
            src="/Cognacare.webp"
            sx={{
              width: { xs: '60%', md: '50%', lg: '40%' },
              display: 'block',
              mx: 'auto',
            }}
            alt="CognaCare"
          />
          <Typography variant="h5" align="center" gutterBottom>
            {t('password_comp.pwd_recover')}
          </Typography>
          <Typography variant="body2" align="center" sx={{ mb: 2 }}>
            {t('password_comp.email_recover')}
          </Typography>
          
          {message && <Alert severity="success" sx={{ my: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
          
          <Box component="form" onSubmit={handleSubmit}>
            <TextField 
              label="E-mail" 
              type="email" 
              value={email} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} 
              fullWidth 
              required 
            />
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              fullWidth 
              sx={{ mt: 2 }} 
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : t('password_comp.recover_link_btn')}
            </Button>
            <Typography variant="body2" align="center" sx={{ mt: 3 }}>
              <Link to="/login" style={{ textDecoration: 'none', color: '#1976d2' }}>
                {t('password_comp.return_login')}
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ForgotPassword;
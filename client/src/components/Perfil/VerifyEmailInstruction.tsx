import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Typography,
  Box, 
  Button,
  Paper,
  CircularProgress,
  TextField,
  Grid
} from '@mui/material';
import { useTranslation } from 'react-i18next';

// --- INTERFACES ---
interface LocationState {
  email?: string;
}

const VerifyEmailInstruction: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  
  // Acesso seguro ao estado do Router
  const state = location.state as LocationState | null;
  const initialEmail = state?.email || ''; 
  
  const [email, setEmail] = useState<string>(initialEmail); 
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleResendEmail = async () => {
    if (!email) {
      setError('Por favor, insira um e-mail.');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/fernandasepe/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.mensagem);
      } else {
        setError(data.erro || t('password_comp.resend_email_error'));
      }
    } catch (err: any) {
      setError(t('password_comp.server_error'));
      console.error(t('password_comp.query_error'), err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid
      container
      spacing={2}
      direction="column"
      justifyContent="center"
      alignItems="center"
      sx={{ minHeight: '100vh', width: '100vw', margin: 0 }}
    >
      <Grid size={{ xs: 12, md: 6 }}>
        <Box
          component="img"
          src="/Cognacare.webp"
          sx={{
            width: { xs: '80%', md: '70%', lg: '60%' },
            mb: 3,
            display: 'block',
            mx: 'auto',
          }}
          alt="CognaCare"
        />
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" align="center" gutterBottom>
            {t('password_comp.verify_email')}
          </Typography>
          <Typography variant="body1" align="center" sx={{ mb: 2 }}>
            {t('password_comp.insert_email_to_link')}
          </Typography>
          
          <TextField
            label="E-mail"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            fullWidth
            margin="normal"
            variant="outlined"
            required
            helperText={t('password_comp.type_email')}
          />
          
          {message && (
            <Typography variant="body1" align="center" color="success.main" sx={{ mb: 2 }}>
              {message}
            </Typography>
          )}
          
          {error && (
            <Typography variant="body1" align="center" color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          
          <Button
            variant="contained"
            color="secondary"
            onClick={handleResendEmail}
            fullWidth
            sx={{ mt: 2 }}
            disabled={loading || !email}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : t('password_comp.resend_email')}
          </Button>
          
          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            {t('password_comp.didnt_receive')}
          </Typography>
          
          <Button
            variant="contained"
            color="primary"
            component={Link}
            to="/login"
            fullWidth
            sx={{ mt: 2 }}
          >
            {t('password_comp.go_login')}
          </Button>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default VerifyEmailInstruction;
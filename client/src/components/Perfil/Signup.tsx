import React, { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Button, 
  Paper, 
  TextField, 
  Typography, 
  Box, 
  Grid, // Assumindo que você usa o Grid v2 do MUI conforme seu código original "size={{ sm: 5 }}"
  CircularProgress,
  Alert 
} from '@mui/material';
import ReCAPTCHA from 'react-google-recaptcha';
import api from '../../api/axiosConfig'; 
import { useTranslation } from 'react-i18next';

export default function Signup() {
  const { t } = useTranslation();

  // O TypeScript infere automaticamente a tipagem deste objeto baseado nos valores iniciais
  const [formData, setFormData] = useState({ nome: '', email: '', senha: '', confirmaSenha: '' });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  // Tipando a referência especificamente para o ReCAPTCHA
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const navigate = useNavigate();

  // Tipagem de evento de input de formulário HTML
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Tipagem de evento de submissão de formulário
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const recaptchaToken = recaptchaRef.current?.getValue();
    if (!recaptchaToken) {
      setError(t('errorobo'));
      setLoading(false);
      return;
    }

    if (formData.senha !== formData.confirmaSenha) {
      setError(t('pwdnotmatch'));
      setLoading(false);
      return;
    }

    try {
      await api.post('/fernandasepe/cadastro', { ...formData, recaptchaToken });
      navigate('/login', { state: { message: t('alertregistrationsuccess') } });
    } catch (err: any) {
      setError(err.response?.data?.erro || t('errorserver'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container justifyContent="center" alignItems="center" sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', p: 2 }}>
      <Grid size={{ xs: 12, sm: 8, md: 5 }}>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <img src="/logo1.png" alt="Cognacare Logo" style={{ maxWidth: '200px' }} />
        </Box>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" align="center" gutterBottom fontWeight="bold" sx={{ color: 'primary.main' }}>
            {t('home_tab.signup')}
          </Typography>
          <Typography variant="body2" align="center" color="textSecondary" sx={{ mb: 3 }}>
            {t('home_tab.signup_desc')}
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField fullWidth label={t('name')} name="nome" value={formData.nome} onChange={handleChange} margin="normal" variant="outlined" required />
            <TextField fullWidth label="E-mail" name="email" type="email" value={formData.email} onChange={handleChange} margin="normal" variant="outlined" required />
            <TextField fullWidth label={t('password')} name="senha" type="password" value={formData.senha} onChange={handleChange} margin="normal" variant="outlined" required />
            <TextField fullWidth label={t('confirm_password')} name="confirmaSenha" type="password" value={formData.confirmaSenha} onChange={handleChange} margin="normal" variant="outlined" required sx={{ pb: 1 }} />
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''}
                onChange={() => setError('')} 
              />
            </Box>
            
            <Grid container justifyContent={'center'}>
              <Grid size={{ sm: 5 }}>
                <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }} disabled={loading}>
                  {loading ? <CircularProgress size={24} color="inherit" /> : t('register')}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Paper>
        
        <Typography variant="body2" align="center" sx={{ mt: 2, mb: 2 }}>
          {`${t('alreadyregistered')} `}
          <Link to="/login" style={{ textDecoration: 'none', color: '#1976d2' }}>
            {t('enter')}
          </Link>
        </Typography>
      </Grid>
    </Grid>
  );
}
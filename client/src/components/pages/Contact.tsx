import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Grid, 
  Snackbar, 
  Alert,
  CircularProgress,
  AlertColor
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosConfig';

// --- INTERFACES ---
interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface NotificationState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

export default function Contact() {
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<NotificationState>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Rota pública para envio de e-mail de contacto
      await api.post('/fernandasepe/contato', formData);
      setNotification({ open: true, message: t('contact.success'), severity: 'success' });
      setFormData({ name: '', email: '', subject: '', message: '' }); // Limpa o formulário
    } catch (error) {
      console.error('Erro ao enviar contato:', error);
      setNotification({ open: true, message: t('contact.error'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNotification = (event?: React.SyntheticEvent | Event, reason?: string) => {
    // Evita que o alerta feche se o utilizador apenas clicar noutro local do ecrã
    if (reason === 'clickaway') {
      return;
    }
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 8 } }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" fontWeight="bold" color="primary" gutterBottom>
          {t('contact.title')}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {t('contact.subtitle')}
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 2 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3} sx={{ justifyContent: 'center' }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label={t('contact.name')}
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                type="email"
                label={t('contact.email')}
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label={t('contact.subject')}
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label={t('contact.message')}
                name="message"
                multiline
                rows={5}
                value={formData.message}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid size={{ xs: 10, md: 8 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                disabled={loading}
              >
                {loading ? t('contact.sending') : t('contact.send_button')}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleCloseNotification}>
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
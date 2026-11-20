import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Snackbar,
  Chip
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import MailIcon from '@mui/icons-material/Mail';
import api from '../../api/axiosConfig';

// --- INTERFACES ---
interface IEmailListItem {
  id: string | number;
  from: string;
  subject: string;
  date: string | Date;
  seen: boolean;
}

interface IEmailDetail {
  id: string | number;
  from: string;
  subject: string;
  date: string | Date;
  html?: string;
  text: string;
}

interface ISnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

// Função para formatar data
const formatDate = (dateString?: string | Date): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export default function AdminEmails() {
  const theme = useTheme();
  const [emails, setEmails] = useState<IEmailListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Estado para leitura do e-mail
  const [selectedEmail, setSelectedEmail] = useState<IEmailDetail | null>(null);
  const [openDialog, setOpenDialog] = useState<boolean>(false);

  // Notificações
  const [snackbar, setSnackbar] = useState<ISnackbarState>({ open: false, message: '', severity: 'success' });

  // Buscar lista de e-mails
  const fetchEmails = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/fernandasepe/admin/emails');
      setEmails(response.data);
    } catch (err: any) {
      console.error(err);
      // Se for 403, o utilizador não é admin
      if (err.response?.status === 403) {
        setError('Acesso negado. Apenas administradores podem ver esta página.');
      } else {
        setError('Erro ao carregar a caixa de entrada.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  // Abrir e-mail completo
  const handleOpenEmail = async (uid: string | number) => {
    try {
      const response = await api.get(`/fernandasepe/admin/emails/${uid}`);
      setSelectedEmail(response.data);
      setOpenDialog(true);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Erro ao abrir o e-mail.', severity: 'error' });
    }
  };

  // Fechar Dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEmail(null);
  };

  // Excluir E-mail
  const handleDeleteEmail = async (uid: string | number, event?: React.MouseEvent) => {
    if (event) event.stopPropagation(); // Evita abrir o modal se clicar no lixo
    
    if (!window.confirm('Tem certeza que deseja excluir este e-mail permanentemente?')) return;

    try {
      await api.delete(`/fernandasepe/admin/emails/${uid}`);
      setSnackbar({ open: true, message: 'E-mail excluído com sucesso.', severity: 'success' });
      // Remove da lista localmente para parecer rápido
      setEmails(prev => prev.filter(email => email.id !== uid));
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Erro ao excluir e-mail.', severity: 'error' });
    }
  };

  const handleCloseSnackbar = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MailIcon color="primary" /> Caixa de Entrada (Sistema)
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<RefreshIcon />} 
          onClick={fetchEmails}
          disabled={loading}
        >
          Atualizar
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.65) }}>
              <TableRow>
                <TableCell width="25%"><strong>Remetente</strong></TableCell>
                <TableCell><strong>Assunto</strong></TableCell>
                <TableCell width="15%"><strong>Data</strong></TableCell>
                <TableCell width="10%" align="center"><strong>Ações</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {emails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                    <Typography color="text.secondary">A caixa de entrada está vazia.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                emails.map((email) => (
                  <TableRow 
                    key={email.id} 
                    hover 
                    sx={{ cursor: 'pointer', opacity: email.seen ? 0.7 : 1 }}
                    onClick={() => handleOpenEmail(email.id)}
                  >
                    <TableCell>
                        {/* Tenta extrair apenas o nome ou exibe o email */}
                        {email.from.replace(/<.*>/, '').trim() || email.from}
                    </TableCell>
                    <TableCell>
                      {email.subject} {!email.seen && <Chip label="Novo" color="primary" size="small" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />}
                    </TableCell>
                    <TableCell>{formatDate(email.date)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Excluir">
                        <IconButton 
                          onClick={(e) => handleDeleteEmail(email.id, e)} 
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* DIALOG DE LEITURA */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        scroll="paper"
      >
        {selectedEmail ? (
          <>
            <DialogTitle sx={{ borderBottom: '1px solid #eee', pb: 1 }}>
              <Typography variant="h6">{selectedEmail.subject}</Typography>
              <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'text.secondary' }}>
                <span><strong>De:</strong> {selectedEmail.from}</span>
                <span>{formatDate(selectedEmail.date)}</span>
              </Box>
            </DialogTitle>
            
            <DialogContent dividers sx={{ minHeight: '300px', p: 0 }}>
                {/* Renderização segura do conteúdo HTML dentro de um iframe para isolar CSS */}
                <Box 
                    component="iframe"
                    title="Email Content"
                    srcDoc={selectedEmail.html || `<div style="font-family: sans-serif; padding: 20px;">${selectedEmail.text.replace(/\n/g, '<br>')}</div>`}
                    sx={{
                        width: '100%',
                        height: '500px',
                        border: 'none',
                        display: 'block'
                    }}
                />
            </DialogContent>
            
            <DialogActions>
              <Button onClick={handleCloseDialog}>Fechar</Button>
              <Button 
                onClick={() => { handleDeleteEmail(selectedEmail.id); handleCloseDialog(); }} 
                color="error" 
                startIcon={<DeleteIcon />}
              >
                Excluir
              </Button>
            </DialogActions>
          </>
        ) : (
          <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
        )}
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, TextField, Button, CircularProgress, 
  Snackbar, Alert, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, IconButton, Dialog, DialogTitle, 
  DialogContent, DialogActions, Grid, Tooltip, Chip, AlertColor
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';

// Ícones
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';

import api from '../../api/axiosConfig';
import { format } from 'date-fns';

// --- INTERFACES ---
interface IPrompt {
  id: number | null;
  chave: string;
  titulo: string;
  texto_prompt: string;
  modelo: string;
  temperatura: number | string;
  max_tokens: number | string;
  atualizado_em?: string | Date;
}

interface INotificationState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

const initialFormState: IPrompt = {
  id: null,
  chave: '',
  titulo: '',
  texto_prompt: '',
  modelo: 'claude-3-5-sonnet-20241022',
  temperatura: 0.5,
  max_tokens: 4000
};

export default function AdminPrompts() {
  const theme = useTheme();
  const [prompts, setPrompts] = useState<IPrompt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<INotificationState>({ open: false, message: '', severity: 'success' });
  
  // Estados do Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [isNew, setIsNew] = useState<boolean>(true);
  const [formData, setFormData] = useState<IPrompt>(initialFormState);

  // Carregar dados
  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/fernandasepe/admin/prompts');
      setPrompts(response.data);
    } catch (error: any) {
      setNotification({ open: true, message: 'Erro ao carregar prompts.', severity: 'error' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  // Controlos do Modal
  const handleOpenModal = (prompt: IPrompt | null = null) => {
    if (prompt) {
      setIsNew(false);
      setFormData(prompt);
    } else {
      setIsNew(true);
      setFormData(initialFormState);
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => setModalOpen(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Ações de Base de Dados
  const handleSave = async () => {
    if (!formData.chave || !formData.titulo || !formData.texto_prompt) {
      setNotification({ open: true, message: 'Preencha os campos obrigatórios (Chave, Título e Texto).', severity: 'warning' });
      return;
    }

    try {
      await api.post('/fernandasepe/admin/prompts', formData);
      setNotification({ open: true, message: 'Prompt guardado com sucesso!', severity: 'success' });
      handleCloseModal();
      fetchPrompts();
    } catch (error: any) {
      setNotification({ open: true, message: 'Erro ao guardar prompt. Verifique se a chave já existe.', severity: 'error' });
      console.error(error);
    }
  };

  const handleDelete = async (id: number | null, chave: string) => {
    if (!id) return;
    if (!window.confirm(`Tem a certeza que deseja excluir o prompt "${chave}"?\nIsto pode quebrar funcionalidades que dependam dele.`)) return;
    
    try {
      await api.delete(`/fernandasepe/admin/prompts/${id}`);
      setNotification({ open: true, message: 'Prompt excluído.', severity: 'success' });
      fetchPrompts();
    } catch (error: any) {
      setNotification({ open: true, message: 'Erro ao excluir prompt.', severity: 'error' });
      console.error(error);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToyIcon fontSize="large" />
          Engenharia de Prompts
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />} 
          onClick={() => handleOpenModal()}
        >
          Novo Prompt
        </Button>
      </Box>

      <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
        ) : (
          <TableContainer sx={{ maxHeight: '70vh' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>Chave do Sistema</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>Título (Referência)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>Modelo IA</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>Última Atualização</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {prompts.length === 0 ? (
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>Nenhum prompt registado no banco de dados.</TableCell></TableRow>
                ) : (
                  prompts.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" fontWeight="bold">{row.chave}</Typography>
                      </TableCell>
                      <TableCell>{row.titulo}</TableCell>
                      <TableCell>
                        <Chip label={row.modelo} size="small" variant="outlined" color="primary" />
                      </TableCell>
                      <TableCell>
                        {row.atualizado_em ? format(new Date(row.atualizado_em), 'dd/MM/yyyy HH:mm') : 'N/A'}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Editar">
                          <IconButton color="primary" onClick={() => handleOpenModal(row)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton color="error" onClick={() => handleDelete(row.id, row.chave)}>
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
      </Paper>

      {/* MODAL CRIAR/EDITAR PROMPT */}
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="xl" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
          <Typography variant="h6" fontWeight="bold">
            {isNew ? 'Criar Novo Prompt' : 'Editar Prompt'}
          </Typography>
          <IconButton onClick={handleCloseModal}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth label="Chave Única do Sistema" name="chave"
                value={formData.chave} onChange={handleChange} margin="normal"
                required disabled={!isNew}
                helperText={isNew ? "Ex: agent_analise_comportamento" : "A chave não pode ser alterada após a criação."}
                sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth label="Título (Para sua organização)" name="titulo"
                value={formData.titulo} onChange={handleChange} margin="normal" required
              />
            </Grid>
            
            {/* Configurações da IA */}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth label="Modelo (Ex: claude-3-5-sonnet...)" name="modelo"
                value={formData.modelo} onChange={handleChange} margin="normal"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth type="number" label="Temperatura (0.0 a 1.0)" name="temperatura"
                inputProps={{ step: 0.1, min: 0, max: 2 }}
                value={formData.temperatura} onChange={handleChange} margin="normal"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth type="number" label="Max Tokens" name="max_tokens"
                value={formData.max_tokens} onChange={handleChange} margin="normal"
              />
            </Grid>

            {/* O Prompt em Si */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth label="Texto do Prompt (Use {{variavel}} para dados dinâmicos)" name="texto_prompt"
                value={formData.texto_prompt} onChange={handleChange} margin="normal"
                multiline rows={12} required
                sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: 1.5 } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseModal} color="inherit">Cancelar</Button>
          <Button onClick={handleSave} variant="contained" color="primary">Guardar Prompt</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({ ...notification, open: false })}>
        <Alert severity={notification.severity} variant="filled">{notification.message}</Alert>
      </Snackbar>
    </Box>
  );
}
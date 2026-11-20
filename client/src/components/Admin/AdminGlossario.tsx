import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Paper, Button, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, Tabs, Tab,
  Snackbar, Alert, CircularProgress, AlertColor
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import api from '../../api/axiosConfig';

// --- INTERFACES ---
interface ILangData {
  termo: string;
  definicao: string;
  tags: string;
}

interface IGlossarioItem {
  chave_grupo: string;
  pt?: ILangData;
  en?: ILangData;
  es?: ILangData;
}

interface IGlossarioForm {
  chave_grupo: string;
  pt: ILangData;
  en: ILangData;
  es: ILangData;
}

interface INotificationState {
  open: boolean;
  msg: string;
  type: AlertColor;
}

type LangKeys = 'pt' | 'en' | 'es';

export default function AdminGlossario() {
  const theme = useTheme();

  const [termos, setTermos] = useState<IGlossarioItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [tabLang, setTabLang] = useState<LangKeys>('pt');
  const [notification, setNotification] = useState<INotificationState>({ open: false, msg: '', type: 'success' });

  const formVazio: IGlossarioForm = {
    chave_grupo: '',
    pt: { termo: '', definicao: '', tags: '' },
    en: { termo: '', definicao: '', tags: '' },
    es: { termo: '', definicao: '', tags: '' }
  };
  
  const [formData, setFormData] = useState<IGlossarioForm>(formVazio);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const mostrarNotificacao = useCallback((msg: string, type: AlertColor) => {
      setNotification({ open: true, msg, type });
  }, []);

  const carregarTermos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/fernandasepe/admin/glossario');
      setTermos(response.data);
    } catch (error) {
      console.error('Erro ao carregar', error);
      mostrarNotificacao('Erro ao carregar o glossário.', 'error');
    } finally {
      setLoading(false);
    }
  }, [mostrarNotificacao]);

  useEffect(() => { 
    carregarTermos(); 
  }, [carregarTermos]);

  const handleOpenNova = () => {
    setFormData(formVazio);
    setIsEditing(false);
    setTabLang('pt');
    setOpenModal(true);
  };

  const handleOpenEdit = (item: IGlossarioItem) => {
    setFormData({
      chave_grupo: item.chave_grupo,
      pt: item.pt || { termo: '', definicao: '', tags: '' },
      en: item.en || { termo: '', definicao: '', tags: '' },
      es: item.es || { termo: '', definicao: '', tags: '' }
    });
    setIsEditing(true);
    setTabLang('pt');
    setOpenModal(true);
  };

  const handleChange = (idioma: LangKeys, campo: keyof ILangData, valor: string) => {
    setFormData(prev => ({
      ...prev,
      [idioma]: { ...prev[idioma], [campo]: valor }
    }));
  };

  const handleSalvar = async () => {
    if (!formData.chave_grupo || !formData.pt.termo) {
      mostrarNotificacao('A Chave do Grupo e o Termo (PT) são obrigatórios!', 'warning');
      return;
    }
    
    // Converte a chave para lowercase e sem espaços
    const payload = { ...formData, chave_grupo: formData.chave_grupo.toLowerCase().replace(/\s+/g, '_') };

    try {
      await api.post('/fernandasepe/admin/glossario', payload);
      mostrarNotificacao('Termo salvo com sucesso!', 'success');
      setOpenModal(false);
      carregarTermos();
    } catch (e) {
      console.error(e);
      mostrarNotificacao('Erro ao salvar o termo.', 'error');
    }
  };

  const handleExcluir = async (chave: string) => {
    if (!window.confirm(`Tem certeza que deseja apagar os 3 idiomas de "${chave}"?`)) return;
    try {
      await api.delete(`/fernandasepe/admin/glossario/${chave}`);
      mostrarNotificacao('Termo apagado com sucesso!', 'success');
      carregarTermos();
    } catch (e) {
      console.error(e);
      mostrarNotificacao('Erro ao apagar.', 'error');
    }
  };

  const renderFormIdioma = (idioma: LangKeys) => (
    <Box sx={{ mt: 2, display: tabLang === idioma ? 'block' : 'none' }}>
      <TextField 
        fullWidth 
        label="Nome do Termo" 
        value={formData[idioma].termo} 
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(idioma, 'termo', e.target.value)} 
        sx={{ mb: 2 }} 
      />
      <TextField 
        fullWidth 
        multiline 
        rows={4} 
        label="Definição / Explicação" 
        value={formData[idioma].definicao} 
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(idioma, 'definicao', e.target.value)} 
        sx={{ mb: 2 }} 
      />
      <TextField 
        fullWidth 
        label="Tags (separadas por vírgula)" 
        value={formData[idioma].tags} 
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(idioma, 'tags', e.target.value)} 
        helperText="Ex: Diagnóstico, Comportamento, ABA" 
      />
    </Box>
  );

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Gerir Glossário (i18n)</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNova}>
          Novo Conceito
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={3}>
        <Table size="small">
          <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.65) }}>
            <TableRow>
              <TableCell><strong>Chave do Grupo</strong></TableCell>
              <TableCell><strong>Português</strong></TableCell>
              <TableCell><strong>Inglês</strong></TableCell>
              <TableCell><strong>Espanhol</strong></TableCell>
              <TableCell align="center"><strong>Ações</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center"><CircularProgress size={24}/></TableCell></TableRow>
            ) : termos.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">Nenhum termo cadastrado.</TableCell></TableRow>
            ) : (
              termos.map((item) => (
                <TableRow key={item.chave_grupo} hover>
                  <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{item.chave_grupo}</Typography></TableCell>
                  <TableCell>{item.pt?.termo || '--'}</TableCell>
                  <TableCell>{item.en?.termo || '--'}</TableCell>
                  <TableCell>{item.es?.termo || '--'}</TableCell>
                  <TableCell align="center">
                    <IconButton color="primary" onClick={() => handleOpenEdit(item)}><EditIcon /></IconButton>
                    <IconButton color="error" onClick={() => handleExcluir(item.chave_grupo)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>{isEditing ? 'Editar Conceito Multilíngue' : 'Adicionar Novo Conceito'}</DialogTitle>
        <DialogContent dividers>
          
          <TextField 
            fullWidth 
            label="Chave Única do Grupo (Identificador)" 
            value={formData.chave_grupo} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, chave_grupo: e.target.value})} 
            disabled={isEditing} 
            sx={{ mb: 3 }}
            helperText="Ex: aba_aplicada, autismo, meltdown (Não pode ser alterado depois)" 
          />

          <Tabs 
            value={tabLang} 
            onChange={(e: React.SyntheticEvent, v: LangKeys) => setTabLang(v)} 
            variant="fullWidth" 
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab value="pt" label="🇧🇷 Português" />
            <Tab value="en" label="🇺🇸 Inglês" />
            <Tab value="es" label="🇪🇸 Espanhol" />
          </Tabs>

          {renderFormIdioma('pt')}
          {renderFormIdioma('en')}
          {renderFormIdioma('es')}

        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSalvar}>Salvar nos 3 Idiomas</Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={notification.open} 
        autoHideDuration={4000} 
        onClose={() => setNotification({...notification, open: false})}
      >
        <Alert severity={notification.type} sx={{ width: '100%' }}>
          {notification.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    TextField,
    List,
    ListItemButton,
    ListItemText,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    CircularProgress,
    Alert,
    Snackbar,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ReactMarkdown from 'react-markdown';
import api from '../../api/axiosConfig';
import { useTranslation } from 'react-i18next';

// Interfaces para tipagem dos dados
interface IPifListItem {
  id_plano: number;
  nome_crianca?: string;
  criado_em: string;
  tem_resposta: number | boolean;
  resposta_ia?: string;
}

interface ISelectedPif {
  id: number | null;
  content: string;
}

const PIFRegistros: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  
  const [pifs, setPifs] = useState<IPifListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>(location.state?.prefilledFilter || '');
  const [selectedPif, setSelectedPif] = useState<ISelectedPif>({ id: null, content: '' });
  
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [copyNotificationOpen, setCopyNotificationOpen] = useState<boolean>(false);

  // Busca a lista de PIFs ao carregar o componente
  useEffect(() => {
    const fetchPifs = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/fernandasepe/planos-familiares');
        
        // Filtra usando a flag 'tem_resposta' (booleano/inteiro) ou verificando o texto
        const planosGerados = response.data.filter((pif: IPifListItem) => 
            // Verifica a flag do backend (0/1 ou true/false)
            pif.tem_resposta === 1 || 
            pif.tem_resposta === true ||
            // Fallback: Se o backend mandar o texto completo, verifica se não está vazio
            (pif.resposta_ia && pif.resposta_ia.trim() !== '')
        );
        
        setPifs(planosGerados);
      } catch (err: any) {
        setError(t('pif_registros.errors.load_list') as string);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPifs();
  }, [t]);

  // Filtra os PIFs com base no termo de busca
  const filteredPifs = useMemo(() => {
    if (!searchTerm) return pifs;
    return pifs.filter(pif =>
      (pif.nome_crianca || (t('pif_registros.no_name') as string)).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [pifs, searchTerm, t]);

  // Abre o modal e busca o conteúdo COMPLETO do PIF selecionado
  const handlePifClick = async (pifId: number) => {
    setIsLoading(true);
    try {
      // Aqui buscamos o detalhe, que DEVE trazer a 'resposta_ia' completa
      const response = await api.get(`/fernandasepe/plano-familiar/${pifId}`);
      setSelectedPif({ id: pifId, content: response.data.resposta_ia });
      setIsModalOpen(true);
    } catch (err: any) {
      setError(t('pif_registros.errors.load_content') as string);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPif({ id: null, content: '' });
  };
  
  const handleDownload = async () => {
    if (!selectedPif.id) return;
    
    try {
      const response = await api.get(`/fernandasepe/plano-familiar/download/${selectedPif.id}`, {
        responseType: 'blob',
      });
      
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `PIF_download_${selectedPif.id}.pdf`;

      if (contentDisposition) {
        const parts = contentDisposition.split(';');
        const filenamePart = parts.find((part: string) => part.trim().startsWith('filename='));
        if (filenamePart) {
          fileName = filenamePart.split('=')[1].trim().replace(/"/g, '');
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(t('pif_registros.errors.download') as string);
      console.error(err);
    }
  };

  const handleCopy = () => {
    if (selectedPif.content) {
      navigator.clipboard.writeText(selectedPif.content).then(() => {
        setCopyNotificationOpen(true);
      }).catch(err => {
        setError(t('pif_registros.errors.copy') as string);
        console.error('Erro ao copiar:', err);
      });
    }
  };

  return (
    <Paper elevation={3} sx={{ mt: {xs: 2, md:4}, mx: {xs: 2, md:'auto'},  p: 3, maxWidth: {xs: "100%", md:"70%"}, border: '2px solid #181818ff' }}>
      <Typography variant="h5" gutterBottom>{t('pif_registros.title')}</Typography>
      <TextField
        label={t('pif_registros.filter_label')}
        variant="outlined"
        fullWidth
        sx={{ my: 2 }}
        value={searchTerm}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
      />
      {isLoading && pifs.length === 0 ? <CircularProgress sx={{ display: 'block', margin: 'auto' }} /> :
        <List component={Paper} variant="outlined">
          {filteredPifs.length > 0 ? (
            filteredPifs.map((pif, index) => (
              <React.Fragment key={pif.id_plano}>
                <ListItemButton onClick={() => handlePifClick(pif.id_plano)}>
                  <ListItemText
                    primary={pif.nome_crianca || t('pif_registros.no_name')}
                    secondary={`${t('pif_registros.generated_at')}: ${new Date(pif.criado_em).toLocaleDateString('pt-BR')}`}
                  />
                </ListItemButton>
                {index < filteredPifs.length - 1 && <Divider />}
              </React.Fragment>
            ))
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    {t('pif_registros.empty_list')}
                </Typography>
            </Box>
          )}
        </List>
      }
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      <Dialog open={isModalOpen} onClose={handleCloseModal} fullWidth maxWidth="xl">
        <DialogTitle>{t('pif_registros.modal_title')}</DialogTitle>
        <DialogContent>
          <Box sx={{
              whiteSpace: 'pre-wrap', p: 1,
              '& h1': { typography: 'h4', mt: 2, mb: 1 }, '& h2': { typography: 'h5', mt: 2, mb: 1 },
              '& p': { typography: 'body1' }, '& strong': { fontWeight: 'bold' },
              '& em': { fontStyle: 'italic' }, '& ul': { pl: 2 }, '& li': { mb: 0.5 },
            }}>
            {isLoading ? <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 2 }} /> : <ReactMarkdown>{selectedPif.content}</ReactMarkdown>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>{t('common.close')}</Button>
          <Button onClick={handleCopy} variant="outlined" startIcon={<ContentCopyIcon />}>
            {t('pif_form.copy_text')}
          </Button>
          <Button onClick={handleDownload} variant="contained" startIcon={<DownloadIcon />}>
            {t('pif_form.download_pdf')}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={copyNotificationOpen}
        autoHideDuration={3000}
        onClose={() => setCopyNotificationOpen(false)}
        message={t('pif_form.snackbars.copied') as string}
      />
    </Paper>
  );
};

export default PIFRegistros;
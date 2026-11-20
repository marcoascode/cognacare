import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
  AlertColor
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import SaveIcon from '@mui/icons-material/Save';
import api from '../../api/axiosConfig';

// --- INTERFACES ---
interface IPifPrice {
  de: number | string;
  ate: number | string;
  preco: number | string;
}

interface IProdutoFixo {
  product_key: string;
  nome_produto: string;
  tipo: string;
  preco: number | string;
  description_cobranca?: string;
}

interface ISnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

const defaultPifPrices: IPifPrice[] = [
  { de: 1, ate: 9, preco: 7.00 },
  { de: 10, ate: 19, preco: 6.50 },
  { de: 20, ate: 29, preco: 5.50 },
  { de: 30, ate: 39, preco: 5.00 },
  { de: 40, ate: 49, preco: 4.50 },
  { de: 50, ate: 9999, preco: 4.00 }
];

export default function AdminPrecos() {
  const theme = useTheme();
  const [pifPrices, setPifPrices] = useState<IPifPrice[]>([]);
  const [produtosFixos, setProdutosFixos] = useState<IProdutoFixo[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [snackbar, setSnackbar] = useState<ISnackbarState>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchAllPrices = async () => {
      try {
        const [resPrecosPif, resProdutosFixos] = await Promise.all([
          api.get('/fernandasepe/precos'),
          api.get('/fernandasepe/produtos-fixos')
        ]);

        if (resPrecosPif.data && resPrecosPif.data.length > 0) {
          setPifPrices(resPrecosPif.data.map((item: any) => ({ ...item, preco: parseFloat(item.preco) })));
        } else {
          setPifPrices(defaultPifPrices);
        }

        if (resProdutosFixos.data && resProdutosFixos.data.length > 0) {
          setProdutosFixos(resProdutosFixos.data.map((item: any) => ({ 
            ...item, 
            preco: parseFloat(item.preco) 
          })));
        }
      } catch (err) {
        console.error('Erro ao buscar dados de precificação:', err);
        showSnackbar('Erro ao carregar a tabela de preços do servidor.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchAllPrices();
  }, []);

  // Manipulador para a Tabela de PIF com tipagem estrita
  const handlePifPriceChange = (index: number, field: keyof IPifPrice, value: string) => {
    const newPrices = [...pifPrices];
    
    if (field === 'preco') {
      const parsedValue = parseFloat(value);
      newPrices[index].preco = isNaN(parsedValue) ? 0 : parsedValue;
    } else if (field === 'de') {
      newPrices[index].de = value === '' ? '' : parseInt(value, 10) || 0;
    } else if (field === 'ate') {
      newPrices[index].ate = value === '' ? '' : parseInt(value, 10) || 0;
    }

    setPifPrices(newPrices);
  };

  // Manipulador para os Produtos Fixos com tipagem estrita
  const handleFixedProductChange = (index: number, field: keyof IProdutoFixo, value: string) => {
    const newProducts = [...produtosFixos];
    
    if (field === 'preco') {
      const parsedValue = parseFloat(value);
      newProducts[index].preco = isNaN(parsedValue) ? 0 : parsedValue;
    } else if (field === 'description_cobranca') {
      newProducts[index].description_cobranca = value;
    }
    
    setProdutosFixos(newProducts);
  };

  const showSnackbar = (message: string, severity: AlertColor) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSaveAll = async () => {
    setSaving(true);

    const invalidPif = pifPrices.find(p => Number(p.preco) < 0 || Number(p.de) < 0 || Number(p.ate) < 0);
    const invalidFixed = produtosFixos.find(p => Number(p.preco) < 0);

    if (invalidPif || invalidFixed) {
      showSnackbar('Não são permitidos valores negativos.', 'error');
      setSaving(false);
      return;
    }

    try {
      const payloadPif = pifPrices.map(p => ({ 
        de: parseInt(String(p.de), 10), 
        ate: parseInt(String(p.ate), 10), 
        preco: parseFloat(String(p.preco)) 
      }));
      
      const payloadFixos = produtosFixos.map(p => ({ 
        product_key: p.product_key, 
        preco: parseFloat(String(p.preco)),
        description_cobranca: p.description_cobranca || '' 
      }));

      await Promise.all([
        api.post('/fernandasepe/precos', { prices: payloadPif }),
        api.post('/fernandasepe/produtos-fixos', { produtos: payloadFixos })
      ]);

      showSnackbar('Todos os preços e descrições foram atualizados com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao salvar preços:', err);
      showSnackbar('Ocorreu um erro ao salvar as alterações.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  const planos = produtosFixos.filter(p => p.tipo === 'plano');
  const chats = produtosFixos.filter(p => p.tipo === 'extra');

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">Configuração de Preços</Typography>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<SaveIcon />}
          onClick={handleSaveAll}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* SEÇÃO 1: ASSINATURAS (PLANOS) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={2} sx={{ p: 3, borderTop: '4px solid #9c27b0', height: '100%' }}>
            <Typography variant="h6" color="secondary" gutterBottom fontWeight="bold">Planos de Assinatura</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Defina o valor de venda e a descrição exata que será enviada para o banco (PIF/Cartão).
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {planos.map((plano) => {
                const index = produtosFixos.findIndex(p => p.product_key === plano.product_key);
                return (
                  <Box key={plano.product_key} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: alpha(theme.palette.secondary.main, 0.2) }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>{plano.nome_produto}</Typography>
                    <Grid container spacing={2}>
                      <Grid size={12}>
                        <TextField
                          fullWidth
                          label="Preço (R$)"
                          type="number"
                          size="small"
                          value={produtosFixos[index].preco.toString()}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFixedProductChange(index, 'preco', e.target.value)}
                          inputProps={{ step: '1.00', min: '0' }}
                        />
                      </Grid>
                      <Grid size={12}>
                        <TextField
                          fullWidth
                          label="Descrição da Cobrança"
                          type="text"
                          size="small"
                          value={produtosFixos[index].description_cobranca || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFixedProductChange(index, 'description_cobranca', e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* SEÇÃO 2: CRÉDITOS DE PIF (PROGRESSIVOS) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={2} sx={{ p: 3, borderTop: '4px solid #1976d2', height: '100%' }}>
            <Typography variant="h6" color="primary" gutterBottom fontWeight="bold">Precificação de PIF</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Defina as faixas de quantidade e o valor unitário dinâmico.
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.2) }}>
                  <TableRow>
                    <TableCell><strong>De</strong></TableCell>
                    <TableCell><strong>Até</strong></TableCell>
                    <TableCell><strong>R$ Unitário</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pifPrices.map((row, index) => (
                    <TableRow key={index} hover>
                      <TableCell sx={{ p: 1 }}>
                        <TextField
                          type="number"
                          size="small"
                          value={row.de}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePifPriceChange(index, 'de', e.target.value)}
                          inputProps={{ min: '0' }}
                          sx={{ width: '100%', minWidth: 60 }}
                        />
                      </TableCell>
                      <TableCell sx={{ p: 1 }}>
                        <TextField
                          type="number"
                          size="small"
                          value={row.ate}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePifPriceChange(index, 'ate', e.target.value)}
                          inputProps={{ min: '0' }}
                          sx={{ width: '100%', minWidth: 60 }}
                        />
                      </TableCell>
                      <TableCell sx={{ p: 1 }}>
                        <TextField
                          type="number"
                          size="small"
                          value={row.preco.toString()}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePifPriceChange(index, 'preco', e.target.value)}
                          inputProps={{ step: '0.50', min: '0' }}
                          sx={{ width: '100%', minWidth: 80 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* SEÇÃO 3: CRÉDITOS DE CHAT */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={2} sx={{ p: 3, borderTop: '4px solid #4caf50', height: '100%' }}>
            <Typography variant="h6" color="success.main" gutterBottom fontWeight="bold">Pacotes Extras de Chat</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Defina o valor dos pacotes avulsos e suas respectivas descrições.
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {chats.map((chat) => {
                const index = produtosFixos.findIndex(p => p.product_key === chat.product_key);
                return (
                  <Box key={chat.product_key} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.2) }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>{chat.nome_produto}</Typography>
                    <Grid container spacing={2}>
                      <Grid size={12}>
                        <TextField
                          fullWidth
                          label="Preço (R$)"
                          type="number"
                          size="small"
                          value={produtosFixos[index].preco.toString()}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFixedProductChange(index, 'preco', e.target.value)}
                          inputProps={{ step: '1.00', min: '0' }}
                        />
                      </Grid>
                      <Grid size={12}>
                        <TextField
                          fullWidth
                          label="Descrição da Cobrança"
                          type="text"
                          size="small"
                          value={produtosFixos[index].description_cobranca || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFixedProductChange(index, 'description_cobranca', e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%', fontSize: '1.1rem' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
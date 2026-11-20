import React, { useEffect, useState, useCallback } from 'react';
import { 
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import api from '../../api/axiosConfig';

// --- INTERFACE DE DADOS ---
interface IApiUsageLog {
  id: number;
  criado_em: string | Date;
  usuario_id: number | string;
  ferramenta: string;
  modelo: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  custo_usd: string | number;
}

export default function AdminApiUsage() {
  const theme = useTheme();
  
  // Começa com o mês atual selecionado
  const [dataInicio, setDataInicio] = useState<string>(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [dataFim, setDataFim] = useState<string>(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState<IApiUsageLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const buscarRelatorio = useCallback(async () => {
    setLoading(true);
    try {
      // Cria a rota para buscar os logs com filtro de data no seu backend
      const response = await api.get(`/fernandasepe/admin/financeiro/api-usage?inicio=${dataInicio}&fim=${dataFim}`);
      setLogs(response.data);
    } catch (error) {
      console.error('Erro ao buscar relatorio financeiro de API:', error);
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => {
    buscarRelatorio();
  }, [buscarRelatorio]);

  // Cálculos de Totalizadores
  const totalRequisicoes = logs.length;
  const totalTokens = logs.reduce((acc, curr) => acc + (curr.total_tokens || 0), 0);
  const custoTotalUSD = logs.reduce((acc, curr) => {
      const custo = typeof curr.custo_usd === 'string' ? parseFloat(curr.custo_usd) : curr.custo_usd;
      return acc + (custo || 0);
  }, 0);

  return (
    <Box sx={{ p: 3, width: '100%', maxWidth: 1200, margin: '0 auto' }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Auditoria de Consumo da API (Custo Operacional)
      </Typography>
      
      {/* Filtros */}
      <Paper elevation={2} sx={{ p: 2, mb: 4, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField 
            label="Data Início" 
            type="date" 
            size="small" 
            slotProps={{ inputLabel: { shrink: true } }} 
            value={dataInicio} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDataInicio(e.target.value)} 
        />
        <TextField 
            label="Data Fim" 
            type="date" 
            size="small" 
            slotProps={{ inputLabel: { shrink: true } }} 
            value={dataFim} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDataFim(e.target.value)} 
        />
        <Button variant="contained" startIcon={<SearchIcon />} onClick={buscarRelatorio} disabled={loading}>
          Filtrar
        </Button>
      </Paper>

      {/* Cards de Resumo */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={3} sx={{ p: 3, display:'flex', alignItems:'center', gap:2, bgcolor: theme.palette.primary.light, color: 'white' }}>
                <ReceiptLongIcon sx={{ fontSize: 50 }}/>
                <Box>
                    <Typography variant="h6">Total de Requisições</Typography>
                    <Typography variant="h4" fontWeight="bold">{loading ? '...' : totalRequisicoes}</Typography>
                </Box>
            </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={3} sx={{ p: 3, display:'flex', alignItems:'center', gap:2, bgcolor: theme.palette.secondary.light, color: 'white' }}>
                <AnalyticsIcon sx={{ fontSize: 50 }}/>
                <Box>
                    <Typography variant="h6">Tokens Processados</Typography>
                    <Typography variant="h4" fontWeight="bold">{loading ? '...' : totalTokens.toLocaleString('pt-BR')}</Typography>
                </Box>
            </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={3} sx={{ p: 3, display:'flex', alignItems:'center', gap:2, bgcolor: theme.palette.success.main, color: 'white' }}>
                <AttachMoneyIcon sx={{ fontSize: 50 }}/>
                <Box>
                    <Typography variant="h6">Custo Estimado</Typography>
                    <Typography variant="h4" fontWeight="bold">
                        {loading ? '...' : `$ ${custoTotalUSD.toFixed(4)}`}
                    </Typography>
                </Box>
            </Paper>
        </Grid>
      </Grid>

      {/* Tabela de Detalhes */}
      <TableContainer component={Paper} elevation={3}>
        <Table size="small">
          <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.65) }}>
            <TableRow>
              <TableCell><strong>Data/Hora</strong></TableCell>
              <TableCell><strong>Usuário (ID)</strong></TableCell>
              <TableCell><strong>Ferramenta</strong></TableCell>
              <TableCell><strong>Modelo</strong></TableCell>
              <TableCell align="right"><strong>Tokens (In / Out)</strong></TableCell>
              <TableCell align="right"><strong>Custo (USD)</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">Nenhum consumo neste período.</TableCell></TableRow>
            ) : (
                logs.map((row) => (
                <TableRow key={row.id} hover>
                    <TableCell>{new Date(row.criado_em).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>#{row.usuario_id}</TableCell>
                    <TableCell>
                        <Chip size="small" label={row.ferramenta} color={row.ferramenta === 'PIF' ? 'primary' : 'secondary'} />
                    </TableCell>
                    <TableCell>{row.modelo}</TableCell>
                    <TableCell align="right">{row.prompt_tokens} / {row.completion_tokens}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        $ {typeof row.custo_usd === 'string' ? parseFloat(row.custo_usd).toFixed(5) : row.custo_usd.toFixed(5)}
                    </TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
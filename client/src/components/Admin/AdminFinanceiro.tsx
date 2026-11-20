import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Chip
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import api from '../../api/axiosConfig';

const PIE_COLORS = ['#00C49F', '#0088FE', '#FFBB28', '#FF8042', '#8884d8'];

// --- INTERFACES DE DADOS ---
interface IChartData {
  name: string;
  count: number;
  [key: string]: any;
}

interface ITransaction {
  id: number;
  data_pagamento: string | Date;
  usuario_nome: string;
  descricao?: string;
  valor: number;
  forma_pagamento: string;
  status: 'concluido' | 'pendente' | 'cancelado' | string;
}

interface IFinancialData {
  totals: {
    vendas: number;
    faturamento: number;
    comissoes: number;
  };
  charts: {
    produtos: IChartData[];
    formasPagamento: IChartData[];
  };
  lista: ITransaction[];
}

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export default function AdminFinanceiro() {
  const theme = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<IFinancialData | null>(null);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchData = useCallback(async (start: string = '', end: string = '') => {
    setLoading(true);
    try {
      let query = '';
      if (start && end) {
        query = `?startDate=${start}&endDate=${end}`;
      }
      const response = await api.get(`/fernandasepe/admin/pagamentos${query}`);
      setData(response.data);
    } catch (error) {
      console.error("Erro ao carregar dados financeiros", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilter = () => fetchData(startDate, endDate);

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    fetchData();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading && !data) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (!data) return <Typography color="error">Erro ao carregar dados financeiros.</Typography>;

  const tooltipStyle = { backgroundColor: theme.palette.background.paper, borderColor: theme.palette.divider, color: theme.palette.text.primary, borderRadius: '8px' };

  return (
    <Box sx={{ p: 2, bgcolor: 'background.default', color: 'text.primary', borderRadius: 1 }}>

      {/* BARRA DE FILTROS */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="subtitle1" fontWeight="bold">Filtrar Período:</Typography>
        <TextField
          type="date" 
          label="Data Inicial" 
          slotProps={{ inputLabel: { shrink: true } }}
          value={startDate} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)} 
          size="small"
        />
        <TextField
          type="date" 
          label="Data Final" 
          slotProps={{ inputLabel: { shrink: true } }}
          value={endDate} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)} 
          size="small"
        />
        <Button variant="contained" onClick={handleFilter} disabled={loading || !startDate || !endDate}>Aplicar</Button>
        <Button variant="outlined" color="secondary" onClick={handleClearFilter} disabled={loading}>Limpar</Button>
      </Paper>

      {/* CARDS DE TOTAIS */}
      <Grid container spacing={2} sx={{ my: 2, alignItems:'center' }}>
        <Grid container rowSpacing={1} size={{ xs: 12, md: 3 }}>
          <Grid size={12}>
            <SummaryCard title="Vendas Concluídas" value={data.totals.vendas} icon={<ShoppingCartIcon fontSize="large" />} color="#1976d2" />
          </Grid>
          <Grid size={12}>
            <SummaryCard title="Faturamento Total" value={formatCurrency(data.totals.faturamento)} icon={<AttachMoneyIcon fontSize="large" />} color="#2e7d32" />
          </Grid>
          <Grid size={12}>
            <SummaryCard title="Comissões Geradas" value={formatCurrency(data.totals.comissoes)} icon={<AccountBalanceWalletIcon fontSize="large" />} color="#ed6c02" />
          </Grid>
        </Grid>

        {/* GRÁFICOS */}
        {/* Gráfico 1: Vendas por Produto */}
        <Grid size={{ xs: 12, md: 4.5 }}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 340, bgcolor: 'background.paper' }}>
            <Typography component="h2" variant="h6" color="primary" gutterBottom>
              Desempenho por Produto
            </Typography>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.charts.produtos}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {data.charts.produtos.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Gráfico 2: Formas de Pagamento */}
        <Grid size={{ xs: 12, md: 4.5 }}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 340, bgcolor: 'background.paper' }}>
            <Typography component="h2" variant="h6" color="success.main" gutterBottom>
              Formas de Pagamento
            </Typography>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.charts.formasPagamento}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {data.charts.formasPagamento.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[(index + 2) % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

      </Grid>
      
      <Divider sx={{ my: 3 }} />

      {/* LISTA DE PAGAMENTOS */}
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>Histórico de Transações</Typography>
      <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 1), color: '#fff' }}>Data</TableCell>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 1), color: '#fff' }}>Cliente</TableCell>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 1), color: '#fff' }}>Produto</TableCell>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 1), color: '#fff' }}>Valor</TableCell>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 1), color: '#fff' }}>Método</TableCell>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 1), color: '#fff' }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.lista.map((pagamento) => (
              <TableRow key={pagamento.id} hover>
                <TableCell>{new Date(pagamento.data_pagamento).toLocaleString('pt-BR')}</TableCell>
                <TableCell>{pagamento.usuario_nome}</TableCell>
                <TableCell>{pagamento.descricao || '-'}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{formatCurrency(pagamento.valor)}</TableCell>
                <TableCell>{pagamento.forma_pagamento}</TableCell>
                <TableCell>
                  <Chip
                    label={pagamento.status}
                    size="small"
                    color={pagamento.status === 'concluido' ? 'success' : pagamento.status === 'pendente' ? 'warning' : 'error'}
                  />
                </TableCell>
              </TableRow>
            ))}
            {data.lista.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>Nenhuma transação encontrada neste período.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

    </Box>
  );
}

function SummaryCard({ title, value, icon, color }: SummaryCardProps) {
  return (
    <Card sx={{ height: '100%', borderLeft: `6px solid ${color}`, bgcolor: 'background.paper' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Box sx={{ color: color, mr: 1, display: 'flex' }}>{icon}</Box>
          <Typography color="text.secondary" variant="subtitle2" textTransform="uppercase" sx={{ fontSize: '0.75rem' }}>
            {title}
          </Typography>
        </Box>
        <Typography align='center' variant="h5" component="div" fontWeight="bold" color="text.primary">
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}
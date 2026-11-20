import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Grid, Paper, Typography, CircularProgress, Divider, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Button
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import PeopleIcon from '@mui/icons-material/People';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ForumIcon from '@mui/icons-material/Forum';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import HandshakeIcon from '@mui/icons-material/Handshake';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import api from '../../api/axiosConfig';

// --- INTERFACES DE DADOS ---
interface IChartData {
  data: string;
  count: number;
  [key: string]: any;
}

interface IPifStepChart {
  name: string;
  count: number;
  [key: string]: any;
}

interface IUserListItem {
  id: number;
  criado_em: string | Date;
  nome: string;
  tipo_plano: string;
  creditos: number;
  chat_mensagens_restantes: number;
  is_affiliate: number;
  total_criancas: number;
  total_pifs: number;
}

interface IDashboardData {
  totals: {
    users: number;
    kids: number;
    afiliados: number;
    bonusRecoveries: number;
    pifs: number;
    messages: number;
    faturamento: number;
  };
  charts: {
    dailyUsers: IChartData[];
    dailyPifs: IChartData[];
    pifStepsChart: IPifStepChart[];
  };
  usersList: IUserListItem[];
}

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export default function AdminReports() {
  const theme = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<IDashboardData | null>(null);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchData = useCallback(async (start: string = '', end: string = '') => {
    setLoading(true);
    try {
      let query = '';
      if (start && end) {
        query = `?startDate=${start}&endDate=${end}`;
      }
      const response = await api.get(`/fernandasepe/admin/dashboard-stats${query}`);
      setData(response.data);
    } catch (error) {
      console.error("Erro ao carregar relatório", error);
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
    fetchData('', '');
  };

  if (loading && !data) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (!data) return <Typography color="error">Erro ao carregar dados.</Typography>;

  const chartAxisStyle = { fill: theme.palette.text.secondary, fontSize: 11 };
  const chartGridColor = theme.palette.divider;
  const tooltipStyle = {
    backgroundColor: theme.palette.background.paper,
    borderColor: theme.palette.divider,
    color: theme.palette.text.primary,
    borderRadius: '8px'
  };

  return (
    <Box sx={{ px: 2, bgcolor: 'background.default', color: 'text.primary', borderRadius: 1 }}>

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
        <Button variant="contained" onClick={handleFilter} disabled={loading || !startDate || !endDate}>
          Aplicar
        </Button>
        <Button variant="outlined" color="secondary" onClick={handleClearFilter} disabled={loading}>
          Limpar
        </Button>
      </Paper>

      <Grid container spacing={2} sx={{ my: 2, alignItems: 'center' }}>

        {/* CARDS DE TOTAIS */}
        <Grid container rowSpacing={1} columnSpacing={1} size={{ xs: 12, md: 4 }}>
          <Grid size={6}>
            <SummaryCard title="Usuários" value={data.totals.users} icon={<PeopleIcon fontSize="large" />} color="#1976d2" />
          </Grid>
          <Grid size={6}>
            <SummaryCard title="Crianças" value={data.totals.kids} icon={<ChildCareIcon fontSize="large" />} color="#2e7d32" />
          </Grid>

          {/* Card de Afiliados */}
          <Grid size={6}>
            <SummaryCard title="Afiliados" value={data.totals.afiliados} icon={<HandshakeIcon fontSize="large" />} color="#ff9800" />
          </Grid>

          <Grid size={6}>
            <SummaryCard
              title="Bônus Resgatados"
              value={data.totals?.bonusRecoveries ?? 0}
              icon={<CardGiftcardIcon fontSize="large" />}
              color="#f50057"
            />
          </Grid>

          <Grid size={6}>
            <SummaryCard title="PIFs Gerados" value={data.totals.pifs} icon={<AssignmentIcon fontSize="large" />} color="#ed6c02" />
          </Grid>
          <Grid size={6}>
            <SummaryCard title="Mensagens IA" value={data.totals.messages} icon={<ForumIcon fontSize="large" />} color="#9c27b0" />
          </Grid>

          {/* Faturamento ocupando a largura total (size=12) para fechar a grade com simetria */}
          <Grid size={12}>
            <SummaryCard
              title="Faturamento"
              value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.totals.faturamento)}
              icon={<AttachMoneyIcon fontSize="large" />}
              color="#4caf50"
            />
          </Grid>
        </Grid>

        {/* GRÁFICOS */}
        {/* Gráfico 1: Crescimento de Usuários */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 1, display: 'flex', flexDirection: 'column', width: '100%', height: 340, bgcolor: 'background.paper' }}>
            <Typography align='center' component="h2" variant="h6" color="primary" gutterBottom>
              Cadastros Diários
            </Typography>
            <ResponsiveContainer>
              <LineChart data={data.charts.dailyUsers} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="data" tickFormatter={(str) => str.substring(5)} tick={chartAxisStyle} />
                <YAxis tick={chartAxisStyle} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="count" name="Cadastros" stroke={theme.palette.primary.main} strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Gráfico 2: Geração de PIFs */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 340, bgcolor: 'background.paper' }}>
            <Typography align='center' component="h2" variant="h6" color="warning.main" gutterBottom>
              Produção de PIFs (Diária)
            </Typography>
            <ResponsiveContainer>
              <BarChart data={data.charts.dailyPifs}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="data" tickFormatter={(str) => str.substring(5)} tick={chartAxisStyle} />
                <YAxis tick={chartAxisStyle} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: theme.palette.action.hover }} />
                <Bar dataKey="count" name="PIFs Criados" fill={theme.palette.warning.main} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Gráfico 3: Engajamento do Formulário PIF */}
        <Grid size={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 300, bgcolor: 'background.paper' }}>
            <Typography align='left' component="h2" variant="h6" color="info.main" gutterBottom>
              Engajamento: Etapas do Formulário PIF
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Acompanha até que ponto os usuários estão preenchendo o formulário longo. Ajuda a identificar gargalos.
            </Typography>
            <ResponsiveContainer>
              <BarChart data={data.charts.pifStepsChart} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} horizontal={false} />
                <XAxis type="number" tick={chartAxisStyle} />
                <YAxis dataKey="name" type="category" tick={chartAxisStyle} width={100} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: theme.palette.action.hover }} />
                <Bar dataKey="count" name="Preenchimentos" fill={theme.palette.info.main} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* LISTA DE USUÁRIOS */}
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>Listagem Geral de Usuários</Typography>
      <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 1), color: '#fff' }}>Data Cadastro</TableCell>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 1), color: '#fff' }}>Nome</TableCell>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 1), color: '#fff' }}>Plano</TableCell>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 1), color: '#fff' }} align="center">Crianças</TableCell>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 1), color: '#fff' }} align="center">PIFs Gerados</TableCell>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 1), color: '#fff' }} align="center">Saldo (PIF / Chat)</TableCell>
              <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 1), color: '#fff' }} align="center">Afiliado?</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.usersList.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>{new Date(user.criado_em).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell>{user.nome}</TableCell>
                <TableCell sx={{ textTransform: 'capitalize' }}>{user.tipo_plano}</TableCell>
                <TableCell align="center">{user.total_criancas}</TableCell>
                <TableCell align="center">{user.total_pifs}</TableCell>
                <TableCell align="center">
                  <Typography variant="body2" component="span" fontWeight="bold" color="primary">{user.creditos}</Typography>
                  {' / '}
                  <Typography variant="body2" component="span" fontWeight="bold" color="secondary">{user.chat_mensagens_restantes}</Typography>
                </TableCell>
                <TableCell align="center">
                  {user.is_affiliate === 1 ? (
                    <Typography variant="body2" color="success.main" fontWeight="bold">SIM</Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">NÃO</Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {data.usersList.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">Nenhum usuário encontrado neste período.</TableCell>
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
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ color: color, mr: 1, display: 'flex' }}>{icon}</Box>
          <Typography color="text.secondary" variant="subtitle2" textTransform="uppercase" sx={{ fontSize: '0.75rem' }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h6" component="div" fontWeight="bold" color="text.primary">
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}
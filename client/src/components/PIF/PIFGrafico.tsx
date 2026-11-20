import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Grid,
  SelectChangeEvent
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import api from '../../api/axiosConfig';
import { useTranslation } from 'react-i18next';
import { ICrianca } from '../../../../Shared';

// Ícones
import ToysIcon from '@mui/icons-material/Toys';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import PsychologyIcon from '@mui/icons-material/Psychology';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';

// --- Função de Cálculo Unificada ---
const pontuaResposta = (resposta: any): number => {
    if (resposta === true) return 1; 
    if (typeof resposta === 'string') {
        const r = resposta.toLowerCase().trim();
        return ['yes', 'acquired', 'sim', 'adquirido', 'always', 'often', 'sempre', 'quase sempre'].includes(r) ? 1 : 0;
    }
    return 0;
};

interface GraficoProps {
  criancas: ICrianca[];
}

const Grafico: React.FC<GraficoProps> = ({ criancas }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  
  const [selectedCriancaId, setSelectedCriancaId] = useState<number | string>('');
  const [activeTab, setActiveTab] = useState<number>(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [maxPointsMap, setMaxPointsMap] = useState<Record<string, number>>({});

  // Configurações das Abas
  const ABAS = useMemo(() => [
    { key: 'pif_steps.play', label: t('progress_chart.tabs.play'), icon: <ToysIcon />, color: '#8884d8' },
    { key: 'pif_steps.language', label: t('progress_chart.tabs.language'), icon: <RecordVoiceOverIcon />, color: '#82ca9d' },
    { key: 'pif_steps.cognition', label: t('progress_chart.tabs.cognition'), icon: <PsychologyIcon />, color: '#ffc658' },
    { key: 'pif_steps.social_emotional', label: t('progress_chart.tabs.social_emotional'), icon: <EmojiEmotionsIcon />, color: '#ff7300' },
    { key: 'pif_steps.motor', label: t('progress_chart.tabs.motor'), icon: <DirectionsRunIcon />, color: '#0088fe' },
    { key: 'pif_steps.avd', label: t('pif_steps.avd') || 'AVD', icon: <AccessibilityNewIcon />, color: '#e83e8c' }
  ], [t]);

  useEffect(() => {
    if (!selectedCriancaId) {
      setChartData([]);
      return;
    }

    const fetchDadosEvolucao = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/fernandasepe/plano-familiar/lista/${selectedCriancaId}`);
        const pifs = response.data;

        if (!pifs || pifs.length === 0) {
            setError(t('progress_chart.no_pif_found') as string || 'Nenhum PIF encontrado.');
            setChartData([]);
            return;
        }

        const dadosProcessados = pifs.map((pif: any) => {
            const dadosForm = pif.dados_formulario || {};
            const ponto: Record<string, any> = {
                data: new Date(pif.criado_em).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' }),
                dataFull: new Date(pif.criado_em).toLocaleDateString(),
                timestamp: new Date(pif.criado_em).getTime(),
                id: pif.id
            };

            ABAS.forEach(aba => {
                // Mapa de legado para novo com tipagem indexável por string
                const legacyMap: Record<string, string> = {
                    'pif_steps.play': 'Fases do Brincar',
                    'pif_steps.language': 'Desenvolvimento da Linguagem',
                    'pif_steps.cognition': 'Desenvolvimento da Cognição',
                    'pif_steps.social_emotional': 'Desenvolvimento Socioemocional',
                    'pif_steps.motor': 'Desenvolvimento da Motricidade',
                    'pif_steps.avd': 'Atividades da Vida Diária (AVD)'
                };
                
                // Extrai as respostas da categoria
                const dadosCategoria = dadosForm[aba.key] || dadosForm[legacyMap[aba.key]] || {};
                const respostasArray = Object.values(dadosCategoria);
                
                // Calcula os pontos baseados na nova lógica unificada
                const pontos = respostasArray.reduce((acc: number, resp: any) => acc + pontuaResposta(resp), 0);
                ponto[aba.key] = pontos;
                
                // Mapeia dinamicamente o total de pontos possíveis
                const totalItens = respostasArray.length;
                setMaxPointsMap(prev => ({
                    ...prev,
                    [aba.key]: Math.max(prev[aba.key] || 0, totalItens)
                }));
            });

            return ponto;
        }).sort((a: any, b: any) => a.timestamp - b.timestamp);

        setChartData(dadosProcessados);

      } catch (err) {
        console.error('Erro ao buscar dados do gráfico:', err);
        setError(t('progress_chart.error_loading') as string || 'Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };

    fetchDadosEvolucao();
  }, [selectedCriancaId, t, ABAS]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSelectChange = (e: SelectChangeEvent<number | string>) => {
    setSelectedCriancaId(e.target.value);
  };

  // Tooltip Tipado (Pontos / Max Pontos)
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const categoriaAtual = ABAS[activeTab];
      const valor = dataPoint[categoriaAtual.key];
      const maximoAtual = maxPointsMap[categoriaAtual.key] || 0;

      return (
        <Paper elevation={4} sx={{ p: 2, border: '1px solid #ccc', bgcolor: alpha(theme.palette.text.primary, 1), minWidth: 150 }}>
          <Typography variant="caption" color="primary">{dataPoint.dataFull}</Typography>
          <Typography variant="subtitle1" color="primary" fontWeight="bold" sx={{ mt: 0.5 }}>
            {t('progress_chart.chart.tooltip_total')}: {valor} / {maximoAtual}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  const categoriaAtiva = ABAS[activeTab];
  // Garante que o maxY seja pelo menos 10 para o gráfico não quebrar a renderização do eixo Y
  const maxY = maxPointsMap[categoriaAtiva.key] > 0 ? maxPointsMap[categoriaAtiva.key] : 10;

  return (
    <Paper elevation={3} sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h6" gutterBottom color="primary" align="center">
        {t('progress_chart.title')}
      </Typography>

      <Grid container justifyContent="center" sx={{ mb: 3 }}>
          <Grid size={{ xs: 11, sm: 8, md: 6 }}>
            <FormControl fullWidth size="small">
                <InputLabel id="select-crianca-grafico-label">{t('progress_chart.select_child_label')}</InputLabel>
                <Select
                    labelId="select-crianca-grafico-label"
                    value={selectedCriancaId}
                    label={t('progress_chart.select_child_label')}
                    onChange={handleSelectChange}
                >
                    <MenuItem value=""><em>{t('progress_chart.select_child_placeholder')}</em></MenuItem>
                    {criancas.map((c) => (
                        <MenuItem key={c.id_crianca} value={c.id_crianca}>{c.nome}</MenuItem>
                    ))}
                </Select>
            </FormControl>
          </Grid>
      </Grid>

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems:'center', p: 5 }}><CircularProgress /></Box>}
      {error && <Alert severity="info">{error}</Alert>}

      {!loading && !error && selectedCriancaId && chartData.length > 0 && (
        <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 1, md: 2 } }}>
           {/* Abas */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1, overflowX: 'auto' }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                mx: 'auto',
                maxWidth: '100%'
              }}>
                <Tabs 
                  value={activeTab} 
                  onChange={handleTabChange} 
                  variant="scrollable" 
                  scrollButtons="auto"
                  allowScrollButtonsMobile
                  aria-label="abas de desenvolvimento"
                  sx={{
                    '& .MuiTabs-indicator': {
                      backgroundColor: categoriaAtiva.color,
                      height: 3,
                    },
                  }}>
                  {ABAS.map((aba, index) => (
                    <Tab
                      key={index}
                      label={aba.label}
                      icon={aba.icon}
                      iconPosition="start"
                      sx={{
                        opacity: activeTab === index ? 1 : 0.7,
                        transition: 'opacity 0.2s',
                        minHeight: 68,
                      }}
                    />
                  ))}
                </Tabs>
             </Box>
            </Box>

            {/* Gráfico */}
            <Paper elevation={6} sx={{ height: 350, width: '100%', mt: 2, pl:2, pr: 2, border: '1px solid #9b9b9bff', borderRadius: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                            dataKey="data" 
                            padding={{ left: 30, right: 30 }} 
                            tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                            domain={[0, maxY]} 
                            label={{ value: t('progress_chart.chart.y_axis_label') as string, angle: -90, position: 'insideLeft' }}
                            allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="top" height={36}/>
                        
                        <Line 
                            type="monotone" 
                            dataKey={categoriaAtiva.key} 
                            name={categoriaAtiva.label as string} 
                            stroke={categoriaAtiva.color} 
                            strokeWidth={3}
                            activeDot={{ r: 8 }} 
                            dot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
                            animationDuration={1500}
                            isAnimationActive={true}
                        />
                        
                        {typeof maxY === 'number' && (
                             <ReferenceLine y={maxY} label={t('progress_chart.chart.legend_max') as string} stroke="red" strokeDasharray="3 3" opacity={0.3} />
                        )}

                    </LineChart>
                </ResponsiveContainer>
            </Paper>
            
            <Typography variant="caption" color="textSecondary" align="center" display="block" sx={{ mt: 1 }}>
                {t('progress_chart.chart.footer_note')}
            </Typography>
        </Box>
      )}
       
      {!loading && !error && selectedCriancaId && chartData.length === 0 && (
           <Alert severity="info" sx={{ mt: 2 }}>
               {t('progress_chart.no_data')}
           </Alert>
      )}
    </Paper>
  );
};

export default Grafico;
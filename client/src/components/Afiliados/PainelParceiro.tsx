import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Card,
    CardContent,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Stack,
    Divider,
    IconButton,
    Tooltip,
    Alert,
    CircularProgress,
    Button,
    Select,
    MenuItem,
    Link,
    Grid
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LinkIcon from '@mui/icons-material/Link';
import ConnectWithoutContactIcon from '@mui/icons-material/ConnectWithoutContact';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';

import api from '../../api/axiosConfig';
import ConfiguracaoPix from './ConfiguracaoPix';
import { useTranslation } from 'react-i18next';

// --- INTERFACES ---
interface DashboardStats {
    total_vendas: number;
    saldo_pendente: number;
    saldo_disponivel: number;
    total_recebido: number;
    meu_cupom: string;
}

interface ExtratoItem {
    data_pagamento: string;
    nome_cliente: string | null;
    valor_venda: number;
    comissao_gerada: number;
    status: string;
}

interface SocialNetwork {
    platform: string;
    username: string;
}

interface RedesSociaisResponse {
    redes_sociais?: string;
}

// Lista de plataformas disponíveis
const plataformas: string[] = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'LinkedIn', 'X (Twitter)', 'Outro (Site/Blog)'];

// Função para formatar o link com base na plataforma
const formatarLinkRede = (platform: string, username: string): string => {
    if (!username) return '#';
    const cleanUser = username.replace(/^@/, '').trim();
    switch (platform) {
        case 'Instagram': return `https://instagram.com/${cleanUser}`;
        case 'TikTok': return `https://tiktok.com/@${cleanUser}`;
        case 'YouTube': return `https://youtube.com/@${cleanUser}`;
        case 'Facebook': return `https://facebook.com/${cleanUser}`;
        case 'LinkedIn': return `https://linkedin.com/in/${cleanUser}`;
        case 'X (Twitter)': return `https://twitter.com/${cleanUser}`;
        default: return username.startsWith('http') ? username : `https://${username}`;
    }
};

// --- COMPONENTE INTERNO STATCARD ---
interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtext?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtext }) => (
    <Card elevation={2} sx={{ height: '100%', borderLeft: `5px solid ${color}` }}>
        <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {title}
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                        {value}
                    </Typography>
                    {subtext && <Typography variant="caption" color="text.secondary">{subtext}</Typography>}
                </Box>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}20`, color: color }}>
                    {icon}
                </Box>
            </Stack>
        </CardContent>
    </Card>
);

export default function PainelParceiro() {
    const { t } = useTranslation();
    const theme = useTheme();
    const [loading, setLoading] = useState<boolean>(true);
    
    // Estados do Dashboard
    const [stats, setStats] = useState<DashboardStats>({
        total_vendas: 0,
        saldo_pendente: 0,
        saldo_disponivel: 0,
        total_recebido: 0,
        meu_cupom: '...' 
    });
    const [extrato, setExtrato] = useState<ExtratoItem[]>([]);
    const [affiliateLink, setAffiliateLink] = useState<string>('');
    const [copySuccess, setCopySuccess] = useState<boolean>(false);

    // Estados de Redes Sociais
    const [redesSociais, setRedesSociais] = useState<SocialNetwork[]>([{ platform: 'Instagram', username: '' }]);
    const [isEditingRedes, setIsEditingRedes] = useState<boolean>(false);
    const [savingRedes, setSavingRedes] = useState<boolean>(false);

    // Carregar Dados Iniciais
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resDashboard, resExtrato, resRedes] = await Promise.all([
                    api.get<DashboardStats>('/fernandasepe/parceiro/dashboard'),
                    api.get<ExtratoItem[]>('/fernandasepe/parceiro/extrato'),
                    api.get<RedesSociaisResponse>('/fernandasepe/parceiro/redes-sociais')
                ]);

                const dadosDashboard = resDashboard.data;
                setStats(dadosDashboard);
                setExtrato(resExtrato.data);
                
                // Tratamento seguro do JSON de redes sociais (com fallback para cadastros antigos)
                let parsedRedes: SocialNetwork[] = [];
                try {
                    if (resRedes.data?.redes_sociais) {
                        parsedRedes = JSON.parse(resRedes.data.redes_sociais);
                        if (!Array.isArray(parsedRedes)) throw new Error("Não é array");
                    } else {
                        parsedRedes = [{ platform: 'Instagram', username: '' }];
                    }
                } catch {
                    parsedRedes = [{ platform: 'Outro (Site/Blog)', username: resRedes.data.redes_sociais || '' }];
                }
                setRedesSociais(parsedRedes);

                // Geração Dinâmica do Link
                if (dadosDashboard.meu_cupom) {
                    const baseUrl = window.location.origin;
                    setAffiliateLink(`${baseUrl}/signup?ref=${dadosDashboard.meu_cupom}`);
                }

            } catch (error) {
                console.error(t('partner_panel.loading_error'), error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [t]);

    // Manipulação da Lista de Redes Sociais no Painel
    const handleRedeChange = (index: number, field: keyof SocialNetwork, value: string) => {
        const novas = [...redesSociais];
        novas[index][field] = value;
        setRedesSociais(novas);
    };

    const handleAddRede = () => setRedesSociais([...redesSociais, { platform: 'TikTok', username: '' }]);
    
    const handleRemoveRede = (index: number) => {
        if (redesSociais.length > 1) {
            setRedesSociais(redesSociais.filter((_, i) => i !== index));
        }
    };

    const handleSaveRedes = async () => {
        setSavingRedes(true);
        try {
            const redesValidas = redesSociais.filter(r => r.username.trim() !== '');
            await api.put('/fernandasepe/parceiro/redes-sociais', { 
                redes_sociais: JSON.stringify(redesValidas) 
            });
            // Atualiza o estado com as redes limpas (sem campos vazios)
            if (redesValidas.length > 0) {
                setRedesSociais(redesValidas);
            } else {
                setRedesSociais([{ platform: 'Instagram', username: '' }]);
            }
            setIsEditingRedes(false);
        } catch(error) {
            console.error('Erro ao salvar redes:', error);
        } finally {
            setSavingRedes(false);
        }
    };

    const handleCopyLink = () => {
        if (!affiliateLink) return;
        navigator.clipboard.writeText(affiliateLink);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const formatCurrency = (value: number | string): string => {
        const numericValue = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue || 0);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                {t('partner_panel.title')}
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
                {t('partner_panel.subtitle')}
            </Typography>

            {/* --- SEÇÃO 1: CARDS DE RESUMO --- */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard 
                        title={t('partner_panel.stats.available_balance')}
                        value={formatCurrency(stats.saldo_disponivel)} 
                        icon={<AttachMoneyIcon />} 
                        color={theme.palette.success.main}
                        subtext={t('partner_panel.stats.ready_withdrawal')}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard 
                        title={t('partner_panel.stats.pending_balance')}
                        value={formatCurrency(stats.saldo_pendente)} 
                        icon={<ReceiptLongIcon />} 
                        color={theme.palette.warning.main}
                        subtext={t('partner_panel.stats.awaiting_release')}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard 
                        title={t('partner_panel.stats.sales_made')}
                        value={stats.total_vendas} 
                        icon={<CheckCircleIcon />} 
                        color={theme.palette.info.main}
                        subtext={`${t('partner_panel.stats.total_received')}: ${formatCurrency(stats.total_recebido)}`}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <StatCard 
                        title={t('partner_panel.stats.link_clicks')} 
                        value="-" 
                        icon={<TrendingUpIcon />} 
                        color={theme.palette.secondary.main}
                        subtext={t('partner_panel.stats.coming_soon')}
                    />
                </Grid>
            </Grid>

            {/* --- SEÇÃO 2: CONTEÚDO PRINCIPAL --- */}
            <Grid container spacing={3}>
                
                {/* COLUNA ESQUERDA: EXTRATO */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                            <ReceiptLongIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            {t('partner_panel.transactions.title')}
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        
                        {extrato.length > 0 ? (
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{t('partner_panel.transactions.date')}</TableCell>
                                            <TableCell>{t('partner_panel.transactions.client')}</TableCell>
                                            <TableCell>{t('partner_panel.transactions.sale_value')}</TableCell>
                                            <TableCell>{t('partner_panel.transactions.commission')}</TableCell>
                                            <TableCell>{t('partner_panel.transactions.status')}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {extrato.map((row, index) => (
                                            <TableRow key={index} hover>
                                                <TableCell>{new Date(row.data_pagamento).toLocaleDateString()}</TableCell>
                                                <TableCell>{row.nome_cliente || t('partner_panel.transactions.client')}</TableCell>
                                                <TableCell>{formatCurrency(row.valor_venda)}</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                                    {formatCurrency(row.comissao_gerada)}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={row.status === 'concluido' ? t('partner_panel.transactions.confirmed') : row.status} 
                                                        color={row.status === 'concluido' ? 'success' : 'warning'} 
                                                        size="small" 
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Alert severity="info">{t('partner_panel.transactions.empty')}</Alert>
                        )}
                    </Paper>
                </Grid>

                {/* COLUNA DIREITA: LINK, PIX E REDES SOCIAIS */}
                <Grid size={{ xs: 12, md: 4 }}>
                    
                    {/* Componente 1: Gerador de Link */}
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                            <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            {t('partner_panel.referral.title')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            {t('partner_panel.referral.desc')}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                            <TextField 
                                fullWidth 
                                value={affiliateLink} 
                                size="small" 
                                InputProps={{ readOnly: true }} 
                                sx={{ bgcolor: 'action.hover' }}
                            />
                            <Tooltip title={copySuccess ? t('partner_panel.referral.copied') : t('partner_panel.referral.copy')}>
                                <IconButton onClick={handleCopyLink} color="primary" sx={{ border: '1px solid #ddd' }}>
                                    {copySuccess ? <CheckCircleIcon color="success" /> : <ContentCopyIcon />}
                                </IconButton>
                            </Tooltip>
                        </Box>
                        
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
                                {t('partner_panel.referral.active_coupon')}
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                <Chip 
                                    label={stats.meu_cupom || t('partner_panel.referral.loading_coupon')} 
                                    color="primary" 
                                    variant="outlined" 
                                    size="small" 
                                    sx={{ fontWeight: 'bold' }}
                                />
                            </Stack>
                        </Box>
                    </Paper>

                    {/* Componente 2: REDES SOCIAIS */}
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                            <ConnectWithoutContactIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            {t('partner_panel.social_media.title', 'Minhas Redes Sociais')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            {t('partner_panel.social_media.desc', 'Mantenha suas redes sociais atualizadas.')}
                        </Typography>
                        
                        <Box sx={{ mb: 2 }}>
                            {isEditingRedes ? (
                                // MODO DE EDIÇÃO
                                redesSociais.map((rede, index) => (
                                    <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                                        <Select
                                            size="small"
                                            value={rede.platform}
                                            onChange={(e) => handleRedeChange(index, 'platform', e.target.value as string)}
                                            sx={{ width: 120 }}
                                        >
                                            {plataformas.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                                        </Select>
                                        <TextField 
                                            size="small"
                                            fullWidth
                                            placeholder="@usuario"
                                            value={rede.username}
                                            onChange={(e) => handleRedeChange(index, 'username', e.target.value)}
                                        />
                                        <IconButton color="error" size="small" onClick={() => handleRemoveRede(index)} disabled={redesSociais.length === 1}>
                                            <DeleteIcon fontSize="small"/>
                                        </IconButton>
                                    </Box>
                                ))
                            ) : (
                                // MODO DE VISUALIZAÇÃO
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {redesSociais.map((r, i) => r.username && (
                                        <Typography key={i} variant="body2">
                                            <strong>{r.platform}:</strong>{' '} 
                                            <Link href={formatarLinkRede(r.platform, r.username)} target="_blank" rel="noopener noreferrer">
                                                {r.username}
                                            </Link>
                                        </Typography>
                                    ))}
                                </Box>
                            )}

                            {isEditingRedes && (
                                <Button size="small" startIcon={<AddCircleOutlineIcon />} onClick={handleAddRede} sx={{ mt: 1 }}>
                                    Adicionar outra rede
                                </Button>
                            )}
                        </Box>
                        
                        {isEditingRedes ? (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button variant="contained" onClick={handleSaveRedes} disabled={savingRedes}>
                                    {savingRedes ? t('partner_panel.social_media.saving', 'Salvando...') : t('partner_panel.social_media.save', 'Salvar')}
                                </Button>
                                <Button variant="outlined" onClick={() => setIsEditingRedes(false)} disabled={savingRedes}>
                                    {t('common.cancel', 'Cancelar')}
                                </Button>
                            </Box>
                        ) : (
                            <Button variant="outlined" size="small" onClick={() => setIsEditingRedes(true)}>
                                {t('partner_panel.social_media.edit', 'Editar')}
                            </Button>
                        )}
                    </Paper>

                    {/* Componente 3: Configuração PIX e Cupom */}
                    <ConfiguracaoPix />

                </Grid>
            </Grid>
        </Box>
    );
}
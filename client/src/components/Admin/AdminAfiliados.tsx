import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Button, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
    Tabs, Tab, Chip, InputAdornment, IconButton, Tooltip, CircularProgress, Link, Grid
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import PaymentIcon from '@mui/icons-material/Payment';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import api from '../../api/axiosConfig';

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

// --- INTERFACES DE DADOS ---
interface IRedeSocial {
    platform: string;
    username: string;
}

interface IAfiliado {
    id: number;
    nome: string;
    email: string;
    status?: string;
    saldo_disponivel: number;
    redes_sociais?: string;
    relacao_causa?: string;
}

interface ICupom {
    id: number;
    codigo: string;
    nome_afiliado: string;
    percentual_desconto: number;
    percentual_comissao: number;
    ativo: boolean | number;
}

interface IMovimentacao {
    data: string | Date;
    descricao: string;
    valor: number;
}

// --- HELPER DE LINKS DE REDES SOCIAIS ---
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

// --- SUB-COMPONENTE: MODAL DE EXTRATO ---
interface ModalExtratoProps {
    open: boolean;
    onClose: () => void;
    afiliadoId: number | null;
}

function ModalExtrato({ open, onClose, afiliadoId }: ModalExtratoProps) {
    const [movimentacoes, setMovimentacoes] = useState<IMovimentacao[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        if (open && afiliadoId) {
            setLoading(true);
            api.get(`/fernandasepe/admin/afiliados/${afiliadoId}/extrato`)
                .then(res => setMovimentacoes(res.data))
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [open, afiliadoId]);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Extrato do Parceiro</DialogTitle>
            <DialogContent dividers>
                {loading ? <Box display="flex" justifyContent="center"><CircularProgress /></Box> : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Data</TableCell>
                                    <TableCell>Descrição</TableCell>
                                    <TableCell align="right">Valor</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {movimentacoes.length > 0 ? movimentacoes.map((mov, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{new Date(mov.data).toLocaleDateString()}</TableCell>
                                        <TableCell>{mov.descricao}</TableCell>
                                        <TableCell align="right" sx={{ color: mov.valor < 0 ? 'error.main' : 'success.main' }}>
                                            {formatCurrency(mov.valor)}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={3} align="center">Nenhuma movimentação</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Fechar</Button>
            </DialogActions>
        </Dialog>
    );
}

// --- COMPONENTE PRINCIPAL ---
export default function AdminAfiliados() {
    const theme = useTheme();
    const [tabValue, setTabValue] = useState<number>(0);
    const [afiliados, setAfiliados] = useState<IAfiliado[]>([]);
    const [cupons, setCupons] = useState<ICupom[]>([]);
    
    // Estados do Modal de Pagamento
    const [openPagarModal, setOpenPagarModal] = useState<boolean>(false);
    const [selectedAfiliadoId, setSelectedAfiliadoId] = useState<number | null>(null);
    const [pagamentoData, setPagamentoData] = useState<{ valor_pagar: string | number; saldo: number }>({ valor_pagar: '', saldo: 0 });
    const [openExtratoModal, setOpenExtratoModal] = useState<boolean>(false);

    // Estados para Detalhes e Aprovação da Candidatura
    const [openDetalhesModal, setOpenDetalhesModal] = useState<boolean>(false);
    const [afiliadoDetalhes, setAfiliadoDetalhes] = useState<IAfiliado | null>(null);
    const [approvingId, setApprovingId] = useState<number | null>(null);

    const carregarDados = () => {
        api.get('/fernandasepe/admin/afiliados').then(res => setAfiliados(res.data)).catch(console.error);
        api.get('/fernandasepe/admin/cupons').then(res => setCupons(res.data)).catch(console.error);
    };

    useEffect(() => { carregarDados(); }, []);

    // APROVAÇÃO E ATIVAÇÃO
    const handleAprovarAfiliado = async (id: number) => {
        if (!window.confirm("Deseja aprovar este parceiro e enviar o e-mail de boas-vindas?")) return;
        setApprovingId(id);
        try {
            await api.put(`/fernandasepe/admin/afiliados/${id}/aprovar`);
            alert("Afiliado aprovado com sucesso! E-mail enviado.");
            setOpenDetalhesModal(false);
            carregarDados(); // Recarrega a tabela para atualizar o status
        } catch (error) {
            console.error(error);
            alert("Erro ao aprovar afiliado.");
        } finally {
            setApprovingId(null);
        }
    };

    // FUNÇÕES DE PAGAMENTO
    const handleAbrirModalPagar = (afiliado: IAfiliado) => {
        setSelectedAfiliadoId(afiliado.id);
        setPagamentoData({ valor_pagar: '', saldo: afiliado.saldo_disponivel });
        setOpenPagarModal(true);
    };

    const handleConfirmarPagamento = async () => {
        if (!selectedAfiliadoId) return;
        try {
            await api.post(`/fernandasepe/admin/afiliados/${selectedAfiliadoId}/pagar`, {
                valor: typeof pagamentoData.valor_pagar === 'string' ? parseFloat(pagamentoData.valor_pagar) : pagamentoData.valor_pagar
            });
            alert("Pagamento registrado com sucesso!");
            setOpenPagarModal(false);
            carregarDados();
        } catch (error) {
            console.error(error);
            alert("Erro ao registrar pagamento.");
        }
    };

    // Renderizador Inteligente de Redes Sociais (Lida com JSON ou Texto Antigo)
    const renderRedesSociais = (redesStr?: string) => {
        if (!redesStr) return <Typography color="text.secondary">Não informado</Typography>;
        try {
            const parsed = JSON.parse(redesStr);
            if (Array.isArray(parsed)) {
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {parsed.map((r: IRedeSocial, i: number) => (
                            <Typography key={i} variant="body2" sx={{ userSelect: 'text' }}>
                                <strong>{r.platform}:</strong>{' '}
                                <Link href={formatarLinkRede(r.platform, r.username)} target="_blank" rel="noopener noreferrer">
                                    {r.username}
                                </Link>
                            </Typography>
                        ))}
                    </Box>
                );
            }
        } catch (e) {
            console.error(e);
            // Caso seja um usuário antigo que salvou como texto livre
            return <Typography variant="body2" sx={{ whiteSpace: 'pre-line', userSelect: 'text' }}>{redesStr}</Typography>;
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>Gestão de Parceiros</Typography>
            
            <Paper sx={{ mb: 3 }}>
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                    <Tab label="Parceiros/Afiliados" />
                    <Tab label="Cupons Ativos" />
                </Tabs>
            </Paper>

            {/* ABA 1: AFILIADOS */}
            {tabValue === 0 && (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.65) }}>
                            <TableRow>
                                <TableCell>Nome</TableCell>
                                <TableCell>E-mail</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Saldo Disp.</TableCell>
                                <TableCell align="right">Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {afiliados.map((afiliado) => (
                                <TableRow key={afiliado.id}>
                                    <TableCell>{afiliado.nome}</TableCell>
                                    <TableCell>{afiliado.email}</TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={afiliado.status?.toUpperCase() || 'APROVADO'} 
                                            color={afiliado.status === 'aprovado' || !afiliado.status ? 'success' : 'warning'} 
                                            size="small" 
                                        />
                                    </TableCell>
                                    <TableCell>{formatCurrency(afiliado.saldo_disponivel)}</TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                        
                                        {/* Botão Ver Detalhes (Candidatura) */}
                                        <Tooltip title="Ver Candidatura">
                                            <IconButton color="info" onClick={() => { setAfiliadoDetalhes(afiliado); setOpenDetalhesModal(true); }}>
                                                <VisibilityIcon />
                                            </IconButton>
                                        </Tooltip>

                                        {/* Botão Aprovar Rápido */}
                                        {afiliado.status === 'pendente' && (
                                            <Tooltip title="Aprovar Parceiro">
                                                <IconButton color="success" onClick={() => handleAprovarAfiliado(afiliado.id)} disabled={approvingId === afiliado.id}>
                                                    {approvingId === afiliado.id ? <CircularProgress size={24} /> : <CheckCircleIcon />}
                                                </IconButton>
                                            </Tooltip>
                                        )}

                                        {/* Ações Financeiras apenas se Aprovado */}
                                        {(afiliado.status === 'aprovado' || !afiliado.status) && (
                                            <>
                                                <Button size="small" variant="contained" color="secondary" sx={{ ml: 1 }} onClick={() => handleAbrirModalPagar(afiliado)} startIcon={<PaymentIcon />}> Pagar </Button>
                                                <Button size="small" variant="outlined" sx={{ ml: 1 }} onClick={() => { setSelectedAfiliadoId(afiliado.id); setOpenExtratoModal(true); }} startIcon={<ReceiptLongIcon />}> Extrato </Button>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* ABA 2: CUPONS */}
            {tabValue === 1 && (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.65) }}>
                            <TableRow>
                                <TableCell>Cupom</TableCell>
                                <TableCell>Afiliado</TableCell>
                                <TableCell>Desconto (%)</TableCell>
                                <TableCell>Comissão (%)</TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {cupons.map((cupom) => (
                                <TableRow key={cupom.id}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>{cupom.codigo}</TableCell>
                                    <TableCell>{cupom.nome_afiliado}</TableCell>
                                    <TableCell>{cupom.percentual_desconto}%</TableCell>
                                    <TableCell>{cupom.percentual_comissao}%</TableCell>
                                    <TableCell>
                                        <Chip label={cupom.ativo ? "Ativo" : "Inativo"} color={cupom.ativo ? "success" : "default"} size="small" />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* MODAL DETALHES DA CANDIDATURA */}
            <Dialog open={openDetalhesModal} onClose={() => setOpenDetalhesModal(false)} fullWidth maxWidth="sm">
                <DialogTitle>Detalhes da Candidatura</DialogTitle>
                <DialogContent dividers>
                    {afiliadoDetalhes && (
                        <Grid container spacing={3}>
                            <Grid size={12}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Redes Sociais:</Typography>
                                <Paper variant="outlined" sx={{ p: 1.5 }}>
                                    {renderRedesSociais(afiliadoDetalhes.redes_sociais)}
                                </Paper>
                            </Grid>
                            <Grid size={12}>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>Relação com a Causa:</Typography>
                                <Paper variant="outlined" sx={{ p: 1.5, whiteSpace: 'pre-line', userSelect: 'text' }}>
                                    <Typography variant="body2">{afiliadoDetalhes.relacao_causa || 'Não informado'}</Typography>
                                </Paper>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetalhesModal(false)}>Fechar</Button>
                    {afiliadoDetalhes?.status === 'pendente' && (
                        <Button variant="contained" color="success" onClick={() => handleAprovarAfiliado(afiliadoDetalhes.id)} disabled={approvingId === afiliadoDetalhes?.id}>
                            {approvingId === afiliadoDetalhes?.id ? 'Aprovando...' : 'Aprovar e Ativar'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* MODAL DE PAGAMENTO */}
            <Dialog open={openPagarModal} onClose={() => setOpenPagarModal(false)}>
                <DialogTitle>Registrar Pagamento</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" gutterBottom>
                        Informe o valor que você transferiu para o parceiro. Certifique-se de ter feito o PIX manualmente antes de confirmar a baixa.
                    </Typography>
                    
                    <TextField 
                        label="Valor a Pagar (R$)" 
                        type="number" 
                        fullWidth 
                        margin="normal" 
                        value={pagamentoData.valor_pagar} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPagamentoData({...pagamentoData, valor_pagar: e.target.value})}
                        slotProps={{
                            input: {
                                startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                            }
                        }}
                    />
                    <Typography variant="caption" color="text.secondary">
                        Saldo disponível: {formatCurrency(pagamentoData.saldo)}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenPagarModal(false)}>Cancelar</Button>
                    <Button variant="contained" color="success" onClick={handleConfirmarPagamento}>
                        Confirmar Baixa
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
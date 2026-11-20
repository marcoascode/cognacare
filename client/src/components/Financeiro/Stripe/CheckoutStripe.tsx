import React, { useState, useEffect, useMemo } from 'react';
import {
    Alert,
    TextField,
    Typography,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Tabs,
    Tab,
    Box,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Button,
    FormControlLabel,
    Checkbox
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import ForumIcon from '@mui/icons-material/Forum';
import LockIcon from '@mui/icons-material/Lock';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

import api from '../../../api/axiosConfig';
import StripePaymentModal from './StripePaymentModal'; 

import '../EFI/styles/EFIStyles.css'; 

// --- INTERFACES ---
interface PriceRange {
    de: number;
    ate: number;
    preco: string | number;
}

interface FixedProduct {
    product_key: string;
    nome_produto?: string;
    description_cobranca: string;
    preco: string | number;
}

export interface PurchaseDetails {
    nome: string;
    description: string;
    totalPrice: number;
    preco: number;
}

const formatPrice = (price: number | string): string => {
    const numericValue = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue || 0);
};

const calculateCreditPrice = (quantity: number, prices: PriceRange[]): number => {
    if (!prices || prices.length === 0) return 0;
    for (const range of prices) {
        const precoNumerico = typeof range.preco === 'string' ? parseFloat(range.preco) : range.preco;
        if (quantity >= range.de && quantity <= range.ate && !isNaN(precoNumerico)) {
            return quantity * precoNumerico;
        }
    }
    return 0;
};

export default function CheckoutStripe() {
    const [activeTab, setActiveTab] = useState<number>(0); 
    const [prices, setPrices] = useState<PriceRange[]>([]);
    const [fixedProducts, setFixedProducts] = useState<FixedProduct[]>([]);
    
    // Estados de Elegibilidade e Bônus
    const [canBuyChat, setCanBuyChat] = useState<boolean>(false);
    const [loadingEligibility, setLoadingEligibility] = useState<boolean>(true);
    const [bonusBalance, setBonusBalance] = useState<number>(0);
    const [useBonus, setUseBonus] = useState<boolean>(false);
    
    // Estado Avulso
    const [creditQuantity, setCreditQuantity] = useState<number>(1);

    // Estado Planos
    const [selectedPlanKey, setSelectedPlanKey] = useState<string>('plano_anual'); 

    // Estados Stripe
    const [stripeModalOpen, setStripeModalOpen] = useState<boolean>(false);
    
    // Carregar dados
    useEffect(() => {
        api.get<PriceRange[]>(`/fernandasepe/precos`).then((res) => {
            if (res.data && Array.isArray(res.data)) {
                setPrices(res.data.map(p => ({ ...p, preco: typeof p.preco === 'string' ? parseFloat(p.preco) : p.preco })));
            }
        }).catch(console.error);

        api.get<FixedProduct[]>(`/fernandasepe/produtos-fixos`).then((res) => {
            if (res.data && Array.isArray(res.data)) {
                setFixedProducts(res.data);
            }
        }).catch(console.error);

        api.get<{eligible: boolean}>(`/fernandasepe/verificar-elegibilidade-chat`)
            .then((res) => setCanBuyChat(res.data.eligible))
            .catch(() => setCanBuyChat(false))
            .finally(() => setLoadingEligibility(false));

        api.get<{saldo_bonus?: string}>('/fernandasepe/usuario/creditos-ativos').then((res) => {
            if (res.data && res.data.saldo_bonus) {
                setBonusBalance(parseFloat(res.data.saldo_bonus));
            }
        }).catch(console.error);

    }, []);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
        setUseBonus(false);
    };

    // Objeto do Produto Selecionado
    const purchaseDetails = useMemo((): PurchaseDetails => {
        let details: PurchaseDetails = { nome: '', description: '', totalPrice: 0, preco: 0 }; 

        if (activeTab === 0) {
            const price = calculateCreditPrice(creditQuantity, prices);
            details = {
                nome: 'Créditos Avulsos',
                description: `${creditQuantity} ${creditQuantity === 1 ? 'crédito' : 'créditos'}`,
                totalPrice: price,
                preco: price 
            };
        } else if (activeTab === 1) {
            const product = fixedProducts.find(p => p.product_key === selectedPlanKey);
            if (product) {
                const productPrice = typeof product.preco === 'string' ? parseFloat(product.preco) : product.preco;
                details = {
                    nome: product.nome_produto || 'Plano',
                    description: product.description_cobranca,
                    totalPrice: productPrice,
                    preco: productPrice
                };
            }
        } else {
            const product = fixedProducts.find(p => p.product_key === 'chat_extra_50');
            if (loadingEligibility) return { nome: 'Verificando...', description: 'Aguarde', totalPrice: 0, preco: 0 };
            if (!product || !canBuyChat) return { nome: 'Indisponível', description: 'Sem elegibilidade', totalPrice: 0, preco: 0 };

            const productPrice = typeof product.preco === 'string' ? parseFloat(product.preco) : product.preco;
            details = {
                nome: 'Chat Extra',
                description: product.description_cobranca,
                totalPrice: productPrice,
                preco: productPrice
            };
        }
        return details;
    }, [activeTab, creditQuantity, prices, selectedPlanKey, fixedProducts, canBuyChat, loadingEligibility]);

    // Preço final visual 
    const finalPriceDisplay = useMemo(() => {
        if (!useBonus) return purchaseDetails.totalPrice;
        return Math.max(0, purchaseDetails.totalPrice - bonusBalance);
    }, [purchaseDetails.totalPrice, bonusBalance, useBonus]);

    const handleBuyClick = () => {
        if (purchaseDetails.totalPrice > 0) {
            setStripeModalOpen(true);
        }
    };

    const renderPlanCard = (key: string, title: string, price: number, features: string[], badge: string | null = null) => {
        const isSelected = selectedPlanKey === key;
        return (
            <Grid size={{ xs: 12, sm: 4, md: 4 }} key={key}>
                <Card 
                    elevation={isSelected ? 8 : 1}
                    sx={{ 
                        border: isSelected ? '2px solid #1976d2' : '1px solid #e0e0e0',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.2s',
                        transform: isSelected ? 'scale(1.02)' : 'scale(1)'
                    }}
                    onClick={() => setSelectedPlanKey(key)}
                >
                    {badge && ( <Chip label={badge} color="primary" size="small" sx={{ position: 'absolute', top: 5, right: 5, mb: 5 }} /> )}
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" sx={{mt: 1.5}}>{title}</Typography>
                        <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>{formatPrice(price)}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>{key === 'plano_mensal' ? '/ 30 dias' : key === 'plano_semestral' ? '/ 6 meses' : '/ 1 ano'}</Typography>
                        <Box sx={{ textAlign: 'left', mt: 2 }}>
                            {features.map((feat, i) => ( <Typography key={i} variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}> <CheckCircleIcon color="success" sx={{ fontSize: 16, mr: 1 }} /> {feat} </Typography> ))}
                        </Box>
                    </CardContent>
                </Card>
            </Grid>
        );
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Paper sx={{ mb: 3 }}>
                <Tabs value={activeTab} onChange={handleTabChange} centered variant="fullWidth">
                    <Tab label="Créditos PIF" icon={<FactCheckIcon sx={{color: '#1976d2'}}/>} iconPosition="end" />
                    <Tab label="Assinatura PIF Pro" icon={<StarIcon sx={{color: 'gold'}}/>} iconPosition="end"/>
                    <Tab label="Chat Extra" icon={<ForumIcon sx={{color: '#4caf50'}}/>} iconPosition="end"/>
                </Tabs>
            </Paper>

            <Grid container spacing={2}>
                {/* Lado Esquerdo: Seleção do Produto */}
                <Grid size={{ xs: 12, sm: 8 }}>
                    
                    {/* ABA 0: CRÉDITOS AVULSOS */}
                    {activeTab === 0 && (
                        <Paper elevation={3} sx={{ p: 3, textAlign: 'center', border: '1px solid #e0e0e0' }}>
                            <Typography variant="h6" gutterBottom>Créditos Avulsos</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Ideal para gerar documentos pontuais. Sem acesso ao Chat IA.</Typography>
                            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                                <Table size="small">
                                    <TableHead><TableRow><TableCell>Qtd.</TableCell><TableCell>Preço Unitário</TableCell></TableRow></TableHead>
                                    <TableBody>
                                        {prices.map((row, index) => ( <TableRow key={index}> <TableCell>{row.de} a {row.ate === 9999 ? '+' : row.ate}</TableCell> <TableCell>{formatPrice(row.preco)}</TableCell> </TableRow> ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <TextField 
                                label="Quantidade de Créditos" 
                                type="number" 
                                value={creditQuantity} 
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreditQuantity(Math.max(1, parseInt(e.target.value) || 0))} 
                                inputProps={{ min: 1 }} 
                                fullWidth 
                            />
                        </Paper>
                    )}

                    {/* ABA 1: ASSINATURAS (PLANOS) */}
                    {activeTab === 1 && (
                        <Box>
                            <Grid container spacing={2}>
                                {renderPlanCard('plano_mensal', 'Mensal', 79.90, ['1 PIF', '100 Msgs Chat IA', 'Acesso por 30 dias'])}
                                {renderPlanCard('plano_semestral', 'Semestral', 399.50, ['1 PIF / mês', '100 Msgs Chat IA / mês', 'Economize 16%'], 'Popular')}
                                {renderPlanCard('plano_anual', 'Anual', 699.00, ['1 PIF / mês', '100 Msgs Chat IA / mês', 'Economize 27%'], 'Melhor Valor')}
                            </Grid>
                            <Typography variant="caption" display="block" sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>* Todos os planos são de pagamento único (pré-pago).</Typography>
                        </Box>
                    )}

                    {/* ABA 2: CHAT EXTRA */}
                    {activeTab === 2 && (
                        <Paper elevation={3} sx={{ p: 3, textAlign: 'center', border: '1px solid #4caf50', opacity: canBuyChat && !loadingEligibility ? 1 : 0.7 }}>
                            {loadingEligibility ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                    <CircularProgress color="success" />
                                </Box>
                            ) : (
                                <>
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                                        {canBuyChat ? <ForumIcon sx={{ fontSize: 60, color: '#4caf50' }} /> : <LockIcon sx={{ fontSize: 60, color: 'grey' }} />}
                                    </Box>
                                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: canBuyChat ? '#2e7d32' : 'text.secondary' }}>
                                        {canBuyChat ? "Precisa de mais ajuda?" : "Recurso Bloqueado"}
                                    </Typography>
                                    
                                    {canBuyChat ? (
                                        <>
                                            <Typography variant="body1" sx={{ mb: 3 }}>Se você atingiu seu limite mensal de mensagens, pode adquirir um pacote extra.</Typography>
                                            <Card variant="outlined" sx={{ maxWidth: 400, mx: 'auto', border: '1px solid #4caf50' }}>
                                                <CardContent>
                                                    <Typography variant="h6" gutterBottom>Pacote Chat Extra</Typography>
                                                    <Typography variant="h3" color="primary.main" sx={{ fontWeight: 'bold', my: 2 }}>R$ 29,90</Typography>
                                                    <Typography variant="body1">+ 50 Mensagens</Typography>
                                                    <Typography variant="caption" color="text.secondary">Válido para o ciclo atual da sua assinatura.</Typography>
                                                </CardContent>
                                            </Card>
                                            <Alert severity="info" sx={{ mt: 4, textAlign: 'left' }}><strong>Nota:</strong> Este pacote é um complemento. Requer assinatura ativa.</Alert>
                                        </>
                                    ) : (
                                        <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
                                            A venda de créditos para mensagens no chat é restrita a usuários que tenham produzido pelo menos 1 PIF nos últimos 90 dias.
                                        </Alert>
                                    )}
                                </>
                            )}
                        </Paper>
                    )}
                </Grid>

                {/* Lado Direito: Resumo e Pagamento */}
                <Grid size={{ xs: 12, sm: 4 }}>
                    <Paper elevation={3} sx={{ p: 3, position: 'sticky', top: 20 }}>
                        <Typography variant="h6" gutterBottom>Resumo do Pedido</Typography>
                        <Box sx={{ my: 2 }}>
                            <Typography variant="body1"><strong>Item:</strong> {purchaseDetails.description || purchaseDetails.nome}</Typography>
                            <Typography variant="h5" color="primary" sx={{ mt: 1, fontWeight: 'bold' }}>
                                {formatPrice(purchaseDetails.totalPrice)}
                            </Typography>
                        </Box>

                        {bonusBalance > 0 && (
                            <Box sx={{ my: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                <Typography variant="body2" gutterBottom>Saldo de Bônus: {formatPrice(bonusBalance)}</Typography>
                                <FormControlLabel
                                    control={<Checkbox checked={useBonus} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUseBonus(e.target.checked)} />}
                                    label="Usar saldo de bônus"
                                />
                                {useBonus && (
                                    <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                                        Valor Final: <strong>{formatPrice(finalPriceDisplay)}</strong>
                                    </Typography>
                                )}
                            </Box>
                        )}

                        <Button 
                            variant="contained" 
                            fullWidth 
                            size="large" 
                            startIcon={<ShoppingCartIcon />}
                            disabled={purchaseDetails.totalPrice <= 0}
                            onClick={handleBuyClick}
                            sx={{ mt: 2 }}
                        >
                            Comprar Agora
                        </Button>
                        
                        <Typography variant="caption" display="block" sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
                            Pagamento seguro via Stripe (Cartão e PIX)
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* MODAL STRIPE */}
            <StripePaymentModal 
                open={stripeModalOpen} 
                onClose={() => setStripeModalOpen(false)} 
                produto={purchaseDetails}
                usarBonus={useBonus}
            />
        </Box>
    );
}
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Snackbar,
    Alert,
    AlertColor,
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
    Button
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import ForumIcon from '@mui/icons-material/Forum';
import LockIcon from '@mui/icons-material/Lock';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

import api from '../../../api/axiosConfig';
import { io, Socket } from 'socket.io-client';

// Ajuste os imports para TypeScript (se já estiverem migrados, caso contrário funcionarão via TS interop)
import PaymentOptions from './components/PaymentOptions';
import PixModal from './components/PixModal';
import CreditCardModal from './components/CreditCardModal';

import './styles/EFIStyles.css';
import './styles/qrCode.css';

// --- INTERFACES ---
interface PriceRange {
    de: number;
    ate: number;
    preco: string | number;
}

interface FixedProduct {
    product_key: string;
    nome_produto: string;
    description_cobranca: string;
    preco: string | number;
}

interface AppliedCoupon {
    code: string;
    percent: number;
}

interface CouponMessage {
    type: AlertColor | '';
    text: string;
}

interface QrCodeData {
    qrCode: string | null;
    imagemQrcode: string | null;
}

interface PurchaseDetails {
    type?: string;
    nome?: string;
    uiName?: string;
    description?: string;
    backendDescription?: string;
    uiDescription?: string;
    totalPrice: number;
    quantity?: number;
}

interface CheckoutProps {
    onPaymentSuccess?: () => void;
}

const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price || 0);
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

export default function Checkout({ onPaymentSuccess }: CheckoutProps) {
    const { t } = useTranslation();
    const theme = useTheme();

    const [activeTab, setActiveTab] = useState<number>(0);
    const [prices, setPrices] = useState<PriceRange[]>([]);
    const [fixedProducts, setFixedProducts] = useState<FixedProduct[]>([]);

    const [canBuyChat, setCanBuyChat] = useState<boolean>(false);
    const [loadingEligibility, setLoadingEligibility] = useState<boolean>(true);
    const [bonusBalance, setBonusBalance] = useState<number>(0);
    const [useBonus, setUseBonus] = useState<boolean>(false);

    const [creditQuantity, setCreditQuantity] = useState<number>(1);
    const [selectedPlanKey, setSelectedPlanKey] = useState<string>('plano_anual');

    // --- NOVOS STATES DE CUPOM ---
    const [couponCode, setCouponCode] = useState<string>('');
    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
    const [couponMessage, setCouponMessage] = useState<CouponMessage>({ type: '', text: '' });
    const [verifyingCoupon, setVerifyingCoupon] = useState<boolean>(false);

    const [qrCode, setQrCode] = useState<QrCodeData>({ qrCode: null, imagemQrcode: null });
    const [openPixModal, setOpenPixModal] = useState<boolean>(false);
    const [copySuccess, setCopySuccess] = useState<boolean>(false);

    // State para o Modal de Cartão da Efí
    const [creditCardModalOpen, setCreditCardModalOpen] = useState<boolean>(false);

    const [paymentConfirmed, setPaymentConfirmed] = useState<boolean>(false);
    const [snackbarMessage, setSnackbarMessage] = useState<string>('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>('success');
    const [processingZeroCost, setProcessingZeroCost] = useState<boolean>(false);

    useEffect(() => {
        api.get<PriceRange[]>(`/fernandasepe/precos`).then(res => setPrices(res.data)).catch(console.error);
        api.get<FixedProduct[]>(`/fernandasepe/produtos-fixos`).then(res => setFixedProducts(res.data)).catch(console.error);
        api.get<{ eligible: boolean }>(`/fernandasepe/verificar-elegibilidade-chat`)
            .then(res => setCanBuyChat(res.data.eligible))
            .catch(() => setCanBuyChat(false))
            .finally(() => setLoadingEligibility(false));
        api.get<{ saldo_bonus?: string }>('/fernandasepe/usuario/creditos-ativos').then(res => {
            if (res.data?.saldo_bonus) setBonusBalance(parseFloat(res.data.saldo_bonus));
        }).catch(console.error);
    }, []);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
        setUseBonus(false);
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponMessage({ type: '', text: '' });
    };

    const getProductData = useCallback((key: string): FixedProduct | undefined => {
        return fixedProducts.find(p => p.product_key === key);
    }, [fixedProducts]);

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setVerifyingCoupon(true);
        setCouponMessage({ type: '', text: '' });

        try {
            const res = await api.post('/stripe/validate-coupon', { couponCode: couponCode.trim() });
            if (res.data.valid) {
                setAppliedCoupon({ code: res.data.code, percent: res.data.discountPercent });
                setCouponMessage({ type: 'success', text: `Cupom aplicado! ${res.data.discountPercent}% de desconto.` });
            } else {
                setAppliedCoupon(null);
                setCouponMessage({ type: 'error', text: res.data.message || 'Cupom inválido' });
            }
        } catch (error: any) {
            console.error(error);
            setAppliedCoupon(null);
            setCouponMessage({ type: 'error', text: 'Erro ao validar cupom' });
        } finally {
            setVerifyingCoupon(false);
        }
    };

    const purchaseDetails = useMemo((): PurchaseDetails => {
        let details: PurchaseDetails = { type: '', description: '', backendDescription: '', uiName: '', totalPrice: 0, nome: '' };

        if (activeTab === 0) {
            const product = getProductData(selectedPlanKey);
            if (product) {
                const isFounder = selectedPlanKey === 'plano_anual';
                const uiName = isFounder ? 'Membro Fundador (Anual)' : product.nome_produto;
                details = {
                    type: 'plano',
                    nome: product.nome_produto,
                    uiName: uiName,
                    description: product.description_cobranca,
                    backendDescription: product.description_cobranca,
                    totalPrice: typeof product.preco === 'string' ? parseFloat(product.preco) : product.preco,
                };
            } else {
                details = { totalPrice: 0, uiName: 'Carregando...' };
            }
        } else if (activeTab === 1) {
            const price = calculateCreditPrice(creditQuantity, prices);
            const singular = creditQuantity === 1;
            const descPT = `${creditQuantity} ${singular ? 'crédito' : 'créditos'}`;
            const descUI = `${creditQuantity} ${singular ? t('payment.item_desc.credits_singular') : t('payment.item_desc.credits_plural')}`;

            details = {
                type: 'avulso',
                nome: 'Créditos Avulsos',
                uiName: t('payment.item_desc.credits_title'),
                description: descPT,
                backendDescription: descPT,
                uiDescription: descUI,
                totalPrice: price,
                quantity: creditQuantity
            };
        } else {
            const product = fixedProducts.find(p => p.product_key === 'chat_extra_50');
            if (loadingEligibility) return { description: t('payment.status.checking'), totalPrice: 0 };
            if (!product || !canBuyChat) return { description: t('payment.status.unavailable'), totalPrice: 0 };

            details = {
                type: 'extra',
                nome: product.nome_produto || 'Chat Extra',
                uiName: t('payment.tabs.chat_extra'),
                description: product.description_cobranca,
                backendDescription: product.description_cobranca,
                totalPrice: typeof product.preco === 'string' ? parseFloat(product.preco) : product.preco,
            };
        }
        return details;
    }, [activeTab, creditQuantity, prices, selectedPlanKey, fixedProducts, canBuyChat, loadingEligibility, t, getProductData]);

    const finalPrice = useMemo(() => {
        let price = purchaseDetails.totalPrice;
        if (appliedCoupon) {
            price = price - (price * appliedCoupon.percent / 100);
        }
        if (useBonus) {
            price = Math.max(0, price - bonusBalance);
        }
        return price;
    }, [purchaseDetails.totalPrice, bonusBalance, useBonus, appliedCoupon]);

    const priceWithCouponOnly = useMemo(() => {
        if (!appliedCoupon) return purchaseDetails.totalPrice;
        return purchaseDetails.totalPrice - (purchaseDetails.totalPrice * appliedCoupon.percent / 100);
    }, [purchaseDetails.totalPrice, appliedCoupon]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        const socket: Socket = io(import.meta.env.VITE_API_SITE, { path: '/socket.io/', transports: ['websocket'], auth: { token: token } });
        // SPRINT 0: o servidor associa o socket à sala do usuário a partir do JWT do handshake;
        // o antigo evento 'joinUserRoom' (por e-mail) foi removido por segurança.

        socket.on('paymentConfirmed', () => {
            setOpenPixModal(false);
            setCreditCardModalOpen(false);
            setPaymentConfirmed(true);
            setSnackbarSeverity('success');
            setSnackbarMessage(t('payment.feedback.confirmed'));
            if (onPaymentSuccess) {
                onPaymentSuccess();
            }
            setTimeout(() => window.location.reload(), 2000);
        });
        return () => { socket.disconnect(); };
    }, [t]);

    useEffect(() => {
        const savedRef = localStorage.getItem('affiliate_ref');
        if (savedRef && !appliedCoupon && !couponCode) {
            setCouponCode(savedRef);
            api.post('/stripe/validate-coupon', { couponCode: savedRef })
                .then(res => {
                    if (res.data.valid) {
                        setAppliedCoupon({ code: res.data.code, percent: res.data.discountPercent });
                        setCouponMessage({ type: 'success', text: `Cupom ${savedRef} aplicado automaticamente!` });
                    }
                })
                .catch(() => {
                    localStorage.removeItem('affiliate_ref');
                });
        }
    }, [appliedCoupon, couponCode]);

    const handlePixClick = async () => {
        if (purchaseDetails.totalPrice <= 0 && finalPrice > 0) return;
        try {
            const paymentData = {
                description: purchaseDetails.backendDescription || purchaseDetails.description,
                value: Math.round(purchaseDetails.totalPrice * 100),
                usarBonus: useBonus,
                couponCode: appliedCoupon ? appliedCoupon.code : null
            };

            const response = await api.post(`/fernandasepe/checkout-pix`, paymentData);

            if (response.data.status === 'paid_with_bonus') {
                setPaymentConfirmed(true);
                setSnackbarSeverity('success');
                setSnackbarMessage(t('payment.feedback.bonus_redeemed'));
                if (onPaymentSuccess) {
                    onPaymentSuccess();
                }
                setTimeout(() => window.location.reload(), 2000);
            } else {
                setQrCode({ qrCode: response.data.qrcode, imagemQrcode: response.data.imagemQrcode });
                setOpenPixModal(true);
            }
        } catch (error: any) {
            console.error(error);
            setSnackbarSeverity('error');
            setSnackbarMessage(error.response?.data?.error || t('payment.feedback.pix_error'));
        }
    };

    const handleCardClick = () => {
        if (purchaseDetails.totalPrice > 0) {
            setCreditCardModalOpen(true);
        }
    };

    const handleZeroCost = async () => {
        setProcessingZeroCost(true);
        try {
            const response = await api.post(`/stripe/create-payment-intent`, {
                items_name: purchaseDetails.backendDescription || purchaseDetails.description,
                usarBonus: true,
                couponCode: appliedCoupon ? appliedCoupon.code : null
            });

            if (response.data.status === 'succeeded_with_bonus') {
                setPaymentConfirmed(true);
                setSnackbarSeverity('success');
                setSnackbarMessage(t('payment.feedback.bonus_redeemed'));
                if (onPaymentSuccess) {
                    onPaymentSuccess();
                }
                setTimeout(() => window.location.reload(), 2000);
            }
        } catch (error: any) {
            setSnackbarSeverity('error');
            setSnackbarMessage(error.response?.data?.error || t('payment.modal.error_unexpected'));
        } finally {
            setProcessingZeroCost(false);
        }
    };

    const renderPlanCard = (key: string, title: string, features: string[], badge: string | null = null, isFounder: boolean = false) => {
        const product = getProductData(key);
        const price = product ? (typeof product.preco === 'string' ? parseFloat(product.preco) : product.preco) : 0;

        const isSelected = selectedPlanKey === key;
        const periodKey = key === 'plano_mensal' ? '30days' : key === 'plano_semestral' ? '6months' : '1year';
        const cardBorderColor = isSelected ? (isFounder ? theme.palette.secondary.main : theme.palette.primary.main) : theme.palette.divider;
        const cardBgColor = isSelected && isFounder ? alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.15 : 0.05) : 'background.paper';
        const titleColor = isFounder ? theme.palette.secondary.main : 'text.primary';
        const priceColor = isFounder ? theme.palette.secondary.main : theme.palette.primary.main;

        return (
            <Grid size={{ xs: 12, md: 4 }} key={key}>
                <Card
                    elevation={isSelected ? 8 : 2}
                    sx={{
                        border: '2px solid', borderColor: cardBorderColor, cursor: 'pointer', position: 'relative',
                        transition: 'all 0.3s', transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                        bgcolor: cardBgColor, height: '100%', display: 'flex', flexDirection: 'column'
                    }}
                    onClick={() => setSelectedPlanKey(key)}
                >
                    {badge && (<Chip label={badge} color={isFounder ? "secondary" : "primary"} size="small" sx={{ position: 'absolute', top: 5, right: 0, left: 0, margin: '0 auto', width: 'fit-content', fontWeight: 'bold', boxShadow: 2 }} />)}
                    <CardContent sx={{ textAlign: 'center', flexGrow: 1, pt: badge ? 3 : 2 }}>
                        {isFounder && <WorkspacePremiumIcon sx={{ fontSize: 40, color: theme.palette.secondary.main, mb: 1 }} />}
                        <Typography variant="h6" sx={{ fontWeight: isFounder ? 'bold' : 'normal', color: titleColor }}>{title}</Typography>
                        {isFounder && <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>R$ 699,00</Typography>}
                        <Typography variant="h4" sx={{ fontWeight: 'bold', my: 1, color: priceColor }}>{formatPrice(price)}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>{isFounder ? 'Equivalente a R$ 41,41/mês' : t(`payment.periods.${periodKey}`)}</Typography>
                        <Box sx={{ textAlign: 'left', mt: 2 }}>
                            {features.map((feat, i) => (<Typography key={i} variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'text.secondary' }}> <CheckCircleIcon color={isFounder ? "secondary" : "success"} sx={{ fontSize: 18, mr: 1 }} /> {feat} </Typography>))}
                        </Box>
                    </CardContent>
                </Card>
            </Grid>
        );
    };

    return (
        <Box sx={{ width: '100%', m: 0 }}>
            <Paper sx={{ mb: 3, bgcolor: 'background.paper' }}>
                <Tabs value={activeTab} onChange={handleTabChange} centered variant="fullWidth">
                    <Tab label={t('payment.tabs.plans')} icon={<StarIcon sx={{ color: 'gold' }} />} iconPosition="end" />
                    <Tab label={t('payment.tabs.credits')} icon={<FactCheckIcon sx={{ color: theme.palette.info.main }} />} iconPosition="end" />
                    <Tab label={t('payment.tabs.chat_extra')} icon={<ForumIcon sx={{ color: theme.palette.success.main }} />} iconPosition="end" />
                </Tabs>
            </Paper>

            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 8 }}>
                    {activeTab === 0 && (
                        <Box>
                            <Grid container spacing={{ xs: 1, sm: 2 }} alignItems="stretch">
                                {renderPlanCard('plano_mensal', t('payment.plan_names.monthly'), [t('payment.features.1pif'), t('payment.features.100msgs'), t('payment.features.renew')])}
                                {renderPlanCard('plano_semestral', t('payment.plan_names.semiannual'), [t('payment.features.1pif_month'), t('payment.features.100msgs_month'), t('payment.features.save_percent')])}
                                {renderPlanCard('plano_anual', t('payment.plan_names.annual'), [t('payment.features.everything'), t('payment.features.badge'), t('payment.features.anteciped_access'), t('payment.features.renewal')], t('payment.features.limited'), true)}
                            </Grid>
                            <Typography variant="caption" display="block" sx={{ mt: 2, textAlign: 'center', color: 'text.secondary', fontStyle: 'italic' }}>* Status vitalício mediante renovação.</Typography>
                        </Box>
                    )}

                    {activeTab === 1 && (
                        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center', borderColor: 'divider', border: '1px solid' }}>
                            <Typography variant="h6" gutterBottom>{t('payment.item_desc.credits_title')}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t('payment.credits_desc')}</Typography>
                            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                                <Table size="small">
                                    <TableHead><TableRow><TableCell>{t('payment.table.qty')}</TableCell><TableCell>{t('payment.table.unit_price')}</TableCell></TableRow></TableHead>
                                    <TableBody>{prices.map((row, index) => (<TableRow key={index}> <TableCell>{row.de} a {row.ate === 9999 ? '+' : row.ate}</TableCell> <TableCell>{formatPrice(typeof row.preco === 'string' ? parseFloat(row.preco) : row.preco)}</TableCell> </TableRow>))}</TableBody>
                                </Table>
                            </TableContainer>
                            <TextField label={t('payment.input_qty')} type="number" value={creditQuantity} onChange={(e) => setCreditQuantity(Math.max(1, parseInt(e.target.value) || 0))} inputProps={{ min: 1 }} fullWidth />
                        </Paper>
                    )}

                    {activeTab === 2 && (
                        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center', border: '1px solid', borderColor: theme.palette.success.main, opacity: canBuyChat && !loadingEligibility ? 1 : 0.7 }}>
                            {loadingEligibility ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                    <CircularProgress color="success" />
                                </Box>
                            ) : (
                                <>
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                                        {canBuyChat ? <ForumIcon sx={{ fontSize: 60, color: theme.palette.success.main }} /> : <LockIcon sx={{ fontSize: 60, color: 'grey' }} />}
                                    </Box>
                                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: canBuyChat ? theme.palette.success.main : 'text.secondary' }}>
                                        {canBuyChat ? t('payment.chat_extra.title_avail') : t('payment.chat_extra.title_locked')}
                                    </Typography>

                                    {canBuyChat ? (
                                        <>
                                            <Typography variant="body1" sx={{ mb: 3 }}>{t('payment.chat_extra.desc')}</Typography>
                                            <Card variant="outlined" sx={{ maxWidth: 400, mx: 'auto', borderColor: theme.palette.success.main }}>
                                                <CardContent>
                                                    <Typography variant="h6" gutterBottom>{t('payment.chat_extra.card_title')}</Typography>
                                                    <Typography variant="h3" color="primary.main" sx={{ fontWeight: 'bold', my: 2 }}>
                                                        {formatPrice(getProductData('chat_extra_50') ? parseFloat(getProductData('chat_extra_50')?.preco as string) : 0)}
                                                    </Typography>
                                                    <Typography variant="body1">{t('payment.chat_extra.card_feature')}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{t('payment.chat_extra.card_validity')}</Typography>
                                                </CardContent>
                                            </Card>
                                            <Alert severity="info" sx={{ mt: 4, textAlign: 'left' }}><strong>{t('payment.chat_extra.note_title')}</strong> {t('payment.chat_extra.note_text')}</Alert>
                                        </>
                                    ) : (
                                        <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
                                            {t('payment.chat_extra.warning')}
                                        </Alert>
                                    )}
                                </>
                            )}
                        </Paper>
                    )}
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <PaymentOptions
                        description={purchaseDetails.uiName || purchaseDetails.nome || ''}
                        totalPrice={priceWithCouponOnly}
                        finalPrice={finalPrice}
                        bonusBalance={bonusBalance}
                        useBonus={useBonus}
                        setUseBonus={setUseBonus}
                        formatPrice={formatPrice}
                        handlePix={handlePixClick}
                        handleCard={handleCardClick}
                        handleZeroCost={handleZeroCost}
                        processingZeroCost={processingZeroCost}
                        disabled={purchaseDetails.totalPrice <= 0 || paymentConfirmed}
                    >
                        <Box sx={{ my: 2, p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center">
                                <LocalOfferIcon fontSize="small" sx={{ mr: 1, color: theme.palette.secondary.main }} />
                                Cupom de Desconto
                            </Typography>
                            <Grid container spacing={1}>
                                {/* Grid ajustado para a versão moderna do MUI */}
                                <Grid size={{ xs: 8 }}>
                                    <TextField
                                        size="small"
                                        fullWidth
                                        placeholder="Código"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        disabled={!!appliedCoupon}
                                    />
                                </Grid>
                                <Grid size={{ xs: 4 }}>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        onClick={appliedCoupon ? () => { setAppliedCoupon(null); setCouponCode(''); setCouponMessage({ type: '', text: '' }); } : handleApplyCoupon}
                                        disabled={verifyingCoupon || (!couponCode && !appliedCoupon)}
                                    >
                                        {appliedCoupon ? 'Remover' : 'Aplicar'}
                                    </Button>
                                </Grid>
                            </Grid>
                            {couponMessage.text && (
                                <Typography variant="caption" color={couponMessage.type || 'info'} sx={{ mt: 1, display: 'block', fontWeight: 'bold' }}>
                                    {couponMessage.text}
                                </Typography>
                            )}
                        </Box>
                    </PaymentOptions>

                    <Typography variant="caption" display="block" sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
                        {t('payment.summary.secure_msg')}
                    </Typography>
                </Grid>
            </Grid>

            <PixModal
                open={openPixModal}
                handleClose={() => setOpenPixModal(false)}
                qrCode={qrCode as any} // Cast simples para garantir compatibilidade se o PixModal não estiver totalmente tipado
                base64Image={qrCode.imagemQrcode as string}
                handleCopyToClipboard={() => {
                    if (qrCode.qrCode) navigator.clipboard.writeText(qrCode.qrCode);
                    setCopySuccess(true);
                }}
                copySuccess={copySuccess}
                totalPrice={finalPrice}
                productName={purchaseDetails.uiName || purchaseDetails.nome || ''}
            />

            {/* MODAL DE CARTÃO EFÍ */}
            <CreditCardModal
                open={creditCardModalOpen}
                handleClose={() => setCreditCardModalOpen(false)}
                purchaseDetails={purchaseDetails as any}
                formatPrice={formatPrice}
                setSnackbarMessage={setSnackbarMessage}
                setSnackbarSeverity={setSnackbarSeverity}
                setPaymentConfirmed={setPaymentConfirmed}
                usarBonus={useBonus}
                finalPrice={finalPrice}
                appliedCoupon={appliedCoupon ? appliedCoupon.code : null}
            />

            <Snackbar open={!!snackbarMessage} autoHideDuration={6000} onClose={() => setSnackbarMessage('')}>
                <Alert severity={snackbarSeverity}>{snackbarMessage}</Alert>
            </Snackbar>
        </Box>
    );
}
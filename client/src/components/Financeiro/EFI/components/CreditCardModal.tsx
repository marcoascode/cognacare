import React, { useState, useEffect } from 'react';
import {
    Modal, Box, Button, Typography, TextField, MenuItem, Fade,
    Stepper, Step, StepLabel, CircularProgress, Grid, Paper, InputAdornment, Alert, Divider, Stack, AlertColor
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { IMaskInput } from 'react-imask';
import api from '../../../../api/axiosConfig';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';

// IMPORTAÇÃO DAS IMAGENS (Se o TS acusar erro nestas imagens, certifique-se de ter um ficheiro vite-env.d.ts ou global.d.ts com declare module '*.png')
import visaImg from '../images/visa.png';
import mastercardImg from '../images/mastercard.png';
import amexImg from '../images/amex.png';
import eloImg from '../images/elo.png';
import hipercardImg from '../images/hipercard.png';

const accountId = import.meta.env.VITE_API_EFI_ACCOUNT_ID as string;
const env = import.meta.env.VITE_API_EFI_ENVIRONMENT as string;

// Declaração para o TypeScript reconhecer o EfiJs no objeto global window
declare global {
    interface Window {
        EfiJs: any;
    }
}

// --- INTERFACES ---
interface PurchaseDetails {
    description?: string;
    backendDescription?: string;
    nome?: string;
    uiName?: string;
    totalPrice: number;
}

interface CreditCardModalProps {
    open: boolean;
    handleClose: () => void;
    purchaseDetails: PurchaseDetails;
    formatPrice: (price: number) => string;
    setSnackbarMessage: (msg: string) => void;
    setSnackbarSeverity: (severity: AlertColor) => void;
    setPaymentConfirmed: (confirmed: boolean) => void;
    usarBonus?: boolean;
    finalPrice?: number;
    appliedCoupon?: string | null;
}

interface PayerData {
    name: string;
    email: string;
    cpf: string;
    birth: string;
    phone: string;
}

interface CardDataState {
    number: string;
    name: string;
    month: string;
    year: string;
    cvv: string;
}

interface Installment {
    installment: number;
    has_interest: boolean;
    value: number;
    currency: string;
    interest_free: boolean;
}

// Mapeamento de bandeiras
const brandIcons: Record<string, string> = {
    visa: visaImg,
    mastercard: mastercardImg,
    amex: amexImg,
    elo: eloImg,
    hipercard: hipercardImg
};

// Componente para máscara de inputs (CPF, Telefone, Cartão)
const MaskedInput = React.forwardRef<HTMLInputElement, any>((props, ref) => {
    const { mask, ...other } = props;
    return <IMaskInput {...other} mask={mask} inputRef={ref} />;
});
MaskedInput.displayName = 'MaskedInput';

const steps = ['Dados do Titular', 'Cartão e Parcelas'];

const CreditCardModal: React.FC<CreditCardModalProps> = ({
    open,
    handleClose,
    purchaseDetails,
    formatPrice,
    setSnackbarMessage,
    setSnackbarSeverity,
    setPaymentConfirmed,
    finalPrice,
    appliedCoupon
}) => {
    const theme = useTheme();
    const [activeStep, setActiveStep] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    
    // Estados do Formulário
    const [payer, setPayer] = useState<PayerData>({
        name: localStorage.getItem('nome') || '',
        email: localStorage.getItem('email') || '',
        cpf: '',
        birth: '',
        phone: ''
    });

    const [cardData, setCardData] = useState<CardDataState>({
        number: '', name: '', month: '', year: '', cvv: ''
    });

    const [cardBrand, setCardBrand] = useState<string>('');
    const [installmentsList, setInstallmentsList] = useState<Installment[]>([]);
    const [selectedInstallment, setSelectedInstallment] = useState<number>(1);
    const [loadingInstallments, setLoadingInstallments] = useState<boolean>(false);
    const [envError, setEnvError] = useState<string>('');

    const valorCobrar = finalPrice !== undefined ? finalPrice : purchaseDetails.totalPrice;
    const nomeProduto = purchaseDetails.uiName || purchaseDetails.nome || purchaseDetails.description || 'Produto';

    // 1. Carregar Script Efí
    useEffect(() => {
        if (!accountId) {
            console.error("ERRO CRÍTICO: Account ID da Efí não definido no .env do Frontend");
            setEnvError("Configuração de pagamento incompleta (Chave ausente).");
            return;
        }

        if (!window.EfiJs) {
            const script = document.createElement('script');
            
            script.src = env === 'production' 
                ? "https://api.efipay.com.br/v1/installments.js" 
                : "https://sandbox.efipay.com.br/v1/installments.js";
                
            script.async = true;
            document.body.appendChild(script);
        }
    }, []);

    // 2. Buscar Bandeira e Parcelas
    useEffect(() => {
        const cleanNumber = cardData.number.replace(/\D/g, '');

        if (cleanNumber.length < 6) {
            setCardBrand('');
            setInstallmentsList([]);
            return;
        }

        if (envError || !window.EfiJs) return;

        const timeoutId = setTimeout(() => {
            setLoadingInstallments(true);

            try {
                window.EfiJs.CreditCard
                    .setAccount(accountId)
                    .setEnvironment(env) 
                    .setCardNumber(cleanNumber)
                    .verifyCardBrand()
                    .then((brand: string) => {
                        setCardBrand(brand);
                        
                        if (brand && brand !== 'undefined') {
                            const totalCentavos = Math.round(valorCobrar * 100);
                            return window.EfiJs.CreditCard
                                .setBrand(brand)
                                .setTotal(totalCentavos)
                                .getInstallments();
                        } else {
                            setInstallmentsList([]);
                        }
                    })
                    .then((data: any) => {
                        if (data && data.installments) {
                            setInstallmentsList(data.installments);
                            setSelectedInstallment(1);
                        }
                    })
                    .catch((err: any) => {
                        console.error("[Efí] Erro API JS:", err);
                    })
                    .finally(() => {
                        setLoadingInstallments(false);
                    });
            } catch (e) {
                console.error("[Efí] Erro Crítico:", e);
                setLoadingInstallments(false);
            }

        }, 800);

        return () => clearTimeout(timeoutId);

    }, [cardData.number, valorCobrar, envError]);

    // Handlers Gerais
    const handlePayerChange = (e: React.ChangeEvent<HTMLInputElement>) => setPayer({ ...payer, [e.target.name]: e.target.value });
    const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => setCardData({ ...cardData, [e.target.name]: e.target.value });
    
    // Handler Específico para Mês (01-12)
    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, ''); // Apenas números
        if (val.length > 2) val = val.slice(0, 2);
        
        // Impede digitar mês maior que 12 se tiver 2 dígitos
        if (val.length === 2 && parseInt(val) > 12) {
            val = '12';
        }
        
        setCardData({ ...cardData, month: val });
    };

    // Handler Específico para Ano (4 dígitos, iniciando com 20)
    const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, ''); // Apenas números
        if (val.length > 2) val = val.slice(0, 2);
        
        setCardData({ ...cardData, year: val });
    };

    const handleNext = () => setActiveStep((prev) => prev + 1);
    const handleBack = () => setActiveStep((prev) => prev - 1);

    // Envio Final
    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (envError) throw new Error(envError);
            
            const cleanNumber = cardData.number.replace(/\D/g, '');

            // Validações básicas antes de enviar
            if (!cardBrand || cardBrand === 'undefined') {
                throw new Error("Bandeira do cartão não identificada. Verifique o número digitado.");
            }
            if (cleanNumber.length < 13) throw new Error("Número do cartão incompleto.");
            
            // Valida ano (deve começar com 20 e ter 4 dígitos)
            if (cardData.year.length !== 2) { 
                throw new Error("Ano de validade inválido. Use 2 dígitos (Ex: 28).");
            }
            const fullYear = `20${cardData.year}`; // Transforma "28" em "2028"

            const dataToken = await window.EfiJs.CreditCard
                .setAccount(accountId)
                .setEnvironment(env)
                .setCreditCardData({
                    brand: cardBrand,
                    number: cleanNumber,
                    cvv: cardData.cvv,
                    expirationMonth: cardData.month,
                    expirationYear: fullYear,
                    reuse: false
                })
                .getPaymentToken();

            if (!dataToken || !dataToken.payment_token) {
                throw new Error("Falha ao gerar token. Verifique os dados do cartão.");
            }
            
            const storedId = localStorage.getItem('usuarioId');

            const payload = {
                usuario_id: storedId ? parseInt(storedId) : null,
                payment_token: dataToken.payment_token,
                installments: selectedInstallment,
                cupom: appliedCoupon,
                items: [{
                    name: purchaseDetails.backendDescription || purchaseDetails.description,
                    value: valorCobrar,
                    amount: 1
                }],
                payer: payer
            };

            const response = await api.post('/fernandasepe/checkout-cartao', payload);

            if (response.data.success) {
                setPaymentConfirmed(true);
                setSnackbarSeverity('success');
                setSnackbarMessage('Pagamento aprovado! Processando...');
                handleClose();
            } else {
                throw new Error('Pagamento não autorizado.');
            }

        } catch (error: any) {
            console.error("[Submit] Erro:", error);
            let msg = error.message;
            if (error.error_description) msg = error.error_description;
            if (error.response?.data?.error) msg = error.response.data.error;

            setSnackbarSeverity('error');
            setSnackbarMessage(msg || 'Erro ao processar pagamento.');
        } finally {
            setLoading(false);
        }
    };

    const isStep1Valid = payer.name && payer.cpf && payer.phone && payer.birth;
    
    // Validação passo 2 atualizada para checar comprimento de mês e ano
    const isStep2Valid = 
        cardData.number.replace(/\D/g, '').length >= 13 && 
        cardData.name.length > 3 && 
        cardData.cvv.length >= 3 && 
        cardData.month.length === 2 && 
        cardData.year.length === 2 && 
        cardBrand && 
        selectedInstallment;

    return (
        <Modal open={open} onClose={handleClose} closeAfterTransition>
            <Fade in={open}>
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: { xs: '95%', sm: 600 }, 
                    bgcolor: 'background.paper',
                    color: 'text.primary',
                    boxShadow: 24, p: 4, borderRadius: 2,
                    maxHeight: '90vh', overflowY: 'auto'
                }}>
                    <Typography variant="h5" align="center" gutterBottom fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <CreditCardIcon /> Pagamento Seguro
                    </Typography>
                    
                    {envError && <Alert severity="error" sx={{ mb: 2 }}>{envError}</Alert>}

                    {/* --- RESUMO DO PEDIDO --- */}
                    <Paper elevation={0} sx={{ 
                        bgcolor: alpha(theme.palette.text.primary, 0.01) ? alpha(theme.palette.primary.main, 0.1) : 'grey.100',
                        p: 2, mb: 3, borderRadius: 2, 
                        border: '1px dashed', borderColor: theme.palette.divider 
                    }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                            <Box display="flex" alignItems="center" gap={1}>
                                <ShoppingBagIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">Produto:</Typography>
                            </Box>
                            <Typography variant="subtitle2" color="primary.main" fontWeight="bold" align="right" sx={{ maxWidth: '60%' }} noWrap>
                                {nomeProduto}
                            </Typography>
                        </Stack>
                        <Divider sx={{ my: 1, opacity: 0.6 }} />
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body1" fontWeight="bold" color="text.secondary">Total a Pagar:</Typography>
                            <Typography variant="h5" color="primary.main" fontWeight="bold">
                                {formatPrice(valorCobrar)}
                            </Typography>
                        </Stack>
                    </Paper>

                    <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                        {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
                    </Stepper>

                    {/* STEP 1: DADOS DO TITULAR */}
                    {activeStep === 0 && (
                        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField label="Nome Completo do Titular" name="name" value={payer.name} onChange={handlePayerChange} fullWidth size="small" />
                            <Grid container spacing={2}>
                                <Grid size={6}>
                                    <TextField label="CPF" name="cpf" value={payer.cpf} onChange={handlePayerChange} fullWidth size="small" InputProps={{ inputComponent: MaskedInput, inputProps: { mask: '000.000.000-00' } }} />
                                </Grid>
                                <Grid size={6}>
                                    <TextField label="Nascimento" name="birth" type="date" value={payer.birth} onChange={handlePayerChange} fullWidth size="small" InputLabelProps={{ shrink: true }} />
                                </Grid>
                            </Grid>
                            <TextField label="Celular" name="phone" value={payer.phone} onChange={handlePayerChange} fullWidth size="small" InputProps={{ inputComponent: MaskedInput, inputProps: { mask: '(00) 00000-0000' } }} />
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                <Button variant="contained" onClick={handleNext} disabled={!isStep1Valid}>Próximo: Cartão</Button>
                            </Box>
                        </Box>
                    )}

                    {/* STEP 2: DADOS DO CARTÃO */}
                    {activeStep === 1 && (
                        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField label="Nome Impresso" name="name" value={cardData.name} onChange={handleCardChange} fullWidth size="small" placeholder="Igual ao cartão" />
                            <TextField 
                                label="Número do Cartão" name="number" value={cardData.number} onChange={handleCardChange} fullWidth size="small"
                                InputProps={{ 
                                    inputComponent: MaskedInput, inputProps: { mask: '0000 0000 0000 0000' },
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            {cardBrand && brandIcons[cardBrand] ? (
                                                <img src={brandIcons[cardBrand]} alt={cardBrand} style={{ width: 36, height: 'auto' }} />
                                            ) : (
                                                <CreditCardIcon color="action" />
                                            )}
                                        </InputAdornment>
                                    )
                                }}
                            />
                            
                            {/* LINHA DE VALIDADE E CVV COM LAYOUT AJUSTADO */}
                            <Grid container spacing={2} alignItems="center">
                                {/* Mês */}
                                <Grid size={2.5}>
                                    <TextField 
                                        label="Mês" 
                                        name="month" 
                                        value={cardData.month} 
                                        onChange={handleMonthChange} 
                                        fullWidth 
                                        size="small" 
                                        placeholder="MM"
                                        inputProps={{ maxLength: 2, style: { textAlign: 'center' } }}
                                    />
                                </Grid>
                                
                                {/* Barra Separadora */}
                                <Grid size="auto">
                                    <Typography variant="h6" color="text.secondary">/</Typography>
                                </Grid>

                                {/* Ano */}
                                <Grid size={2.5}>
                                    <TextField 
                                        label="Ano" 
                                        name="year" 
                                        value={cardData.year} 
                                        onChange={handleYearChange} 
                                        fullWidth 
                                        size="small" 
                                        placeholder="AA"
                                        inputProps={{ maxLength: 2, style: { textAlign: 'center' } }}
                                    />
                                </Grid>

                                {/* Texto de Exemplo */}
                                <Grid size="auto">
                                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', mx: 0.5 }}>
                                        Ex.: 06/28
                                    </Typography>
                                </Grid>

                                {/* CVV */}
                                <Grid size="grow">
                                    <TextField 
                                        label="CVV" 
                                        name="cvv" 
                                        value={cardData.cvv} 
                                        onChange={handleCardChange} 
                                        fullWidth 
                                        size="small" 
                                        inputProps={{ maxLength: 4 }} 
                                    />
                                </Grid>
                            </Grid>

                            <TextField 
                                select 
                                label="Opções de Parcelamento" 
                                value={selectedInstallment} 
                                onChange={(e) => setSelectedInstallment(Number(e.target.value))} 
                                fullWidth 
                                size="small"
                                disabled={loadingInstallments || installmentsList.length === 0}
                                helperText={loadingInstallments ? "Calculando juros..." : ""}
                            >
                                {loadingInstallments ? (
                                    <MenuItem value={selectedInstallment} disabled>
                                        <Box display="flex" gap={1} alignItems="center"><CircularProgress size={16}/> Carregando...</Box>
                                    </MenuItem>
                                ) : installmentsList.length === 0 ? (
                                    <MenuItem value={1}>1x de {formatPrice(valorCobrar)} (À vista)</MenuItem>
                                ) : (
                                    installmentsList.map((inst) => (
                                        <MenuItem key={inst.installment} value={inst.installment}>
                                            <Box display="flex" justifyContent="space-between" width="100%">
                                                <Typography variant="body2" sx={{fontWeight:'bold'}}>
                                                    {inst.installment}x de {formatPrice(inst.value / 100)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Total: {formatPrice((inst.value * inst.installment) / 100)} {inst.has_interest ? '(c/ juros)' : ''}
                                                </Typography>
                                            </Box>
                                        </MenuItem>
                                    ))
                                )}
                            </TextField>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                                <Button onClick={handleBack} disabled={loading} color="inherit">Voltar</Button>
                                <Button variant="contained" color="success" onClick={handleSubmit} disabled={loading || !isStep2Valid || !!envError} sx={{ minWidth: 160 }}>
                                    {loading ? <CircularProgress size={24} color="inherit" /> : `Finalizar Compra`}
                                </Button>
                            </Box>
                        </Box>
                    )}
                </Box>
            </Fade>
        </Modal>
    );
};

export default CreditCardModal;
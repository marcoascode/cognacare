import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    IconButton,
    CircularProgress,
    Divider,
    Stack,
    Chip,
    Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../../../api/axiosConfig';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY as string);

// --- INTERFACES ---
export interface PurchaseDetailsModal {
    totalPrice?: number;
    backendDescription?: string;
    description?: string;
    uiName?: string;
    nome?: string;
}

interface StripePaymentModalProps {
    open: boolean;
    onClose: () => void;
    produto?: PurchaseDetailsModal;
    usarBonus?: boolean;
    couponCode?: string | null;
}

interface CheckoutFormProps {
    onClose: () => void;
}

// --- Componente Interno do Formulário ---
const CheckoutForm: React.FC<CheckoutFormProps> = ({ onClose }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setIsLoading(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.href, 
            },
            redirect: "if_required"
        });

        if (error) {
            setMessage(error.message || 'Ocorreu um erro ao processar o pagamento.');
            setIsLoading(false);
        } else {
            onClose(); 
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* MUDANÇA AQUI: Layout accordion facilita visualização das parcelas */}
            <PaymentElement 
                id="payment-element" 
                options={{ 
                    layout: "accordion",
                    terms: { card: 'never' } // Oculta termos redundantes se desejar
                }} 
            />
            
            {message && <Alert severity="error" sx={{ mt: 2 }}>{message}</Alert>}
            
            <button 
                disabled={isLoading || !stripe || !elements} 
                id="submit"
                style={{
                    backgroundColor: '#635bff',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '12px 16px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'block',
                    transition: 'all 0.2s ease',
                    boxShadow: '0px 4px 5.5px 0px rgba(0, 0, 0, 0.07)',
                    width: '100%',
                    marginTop: '20px',
                    opacity: isLoading ? 0.7 : 1
                }}
            >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : `Finalizar Pagamento`}
            </button>
        </form>
    );
};

// --- Componente Principal ---
export default function StripePaymentModal({ open, onClose, produto, usarBonus, couponCode }: StripePaymentModalProps) {
    const [clientSecret, setClientSecret] = useState<string>('');
    const [loadingSecret, setLoadingSecret] = useState<boolean>(false);

    const formatBRL = (val: number): string => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };
    
    const precoOriginal = produto?.totalPrice || 0;

    useEffect(() => {
        if (open && produto) {
            setLoadingSecret(true);
            // Zera o secret anterior para forçar recarregamento visual
            setClientSecret('');
            
            api.post('/stripe/create-payment-intent', {
                items_name: produto.backendDescription || produto.description,
                usarBonus: usarBonus,
                couponCode: couponCode
            })
            .then((res) => {
                setClientSecret(res.data.clientSecret);
            })
            .catch((err) => {
                console.error("Erro ao iniciar Stripe:", err);
                onClose(); 
            })
            .finally(() => setLoadingSecret(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, produto, usarBonus, couponCode]); 

    // Tipagem das opções do Stripe Elements
    const options: StripeElementsOptions = clientSecret ? { clientSecret, appearance: { theme: 'stripe' } } : {};

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <CreditCardIcon color="primary" />
                    <Typography variant="h6">Pagamento Seguro</Typography>
                </Box>
                <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            
            <Divider />

            <DialogContent sx={{ pt: 2 }}>
                {/* --- RESUMO DO PEDIDO --- */}
                <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 2, mb: 3, border: '1px solid', borderColor: 'divider' }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                        <ShoppingBagIcon fontSize="small" color="action" />
                        <Typography variant="subtitle2" color="text.secondary">RESUMO DO PEDIDO</Typography>
                    </Stack>
                    
                    <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body1" fontWeight="bold">{produto?.uiName || produto?.nome}</Typography>
                        <Typography variant="body1">{formatBRL(precoOriginal)}</Typography>
                    </Box>

                    {couponCode && (
                        <Box display="flex" justifyContent="space-between" mb={1} color="success.main">
                            <Box display="flex" alignItems="center" gap={0.5}>
                                <LocalOfferIcon fontSize="inherit" />
                                <Typography variant="body2">Cupom ({couponCode})</Typography>
                            </Box>
                            <Typography variant="body2">- Desconto aplicado</Typography>
                        </Box>
                    )}

                    {usarBonus && (
                        <Box display="flex" justifyContent="space-between" mb={1} color="primary.main">
                            <Typography variant="body2">Bônus utilizado</Typography>
                            <Typography variant="body2">- Crédito aplicado</Typography>
                        </Box>
                    )}

                    <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1" fontWeight="bold">Total a Pagar</Typography>
                        <Chip label="Ver opções abaixo" size="small" variant="outlined" />
                    </Box>
                </Box>

                {/* --- FORMULÁRIO STRIPE --- */}
                {loadingSecret ? (
                    <Box display="flex" justifyContent="center" py={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    clientSecret && (
                        <Elements options={options} stripe={stripePromise}>
                            <CheckoutForm onClose={onClose} />
                        </Elements>
                    )
                )}
            </DialogContent>
        </Dialog>
    );
}
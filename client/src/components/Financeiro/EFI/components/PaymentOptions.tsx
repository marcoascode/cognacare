import React, { useState, ReactNode } from 'react';
import { Typography, Button, Paper, Checkbox, FormControlLabel, Grid, Box, Divider } from '@mui/material';
import PixIcon from '@mui/icons-material/Pix';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard'; 
import { useTranslation } from 'react-i18next';

// --- INTERFACES ---
interface PaymentOptionsProps {
    description: string;
    totalPrice: number;
    finalPrice?: number;
    bonusBalance?: number;
    useBonus?: boolean;
    setUseBonus?: (use: boolean) => void;
    formatPrice: (price: number) => string;
    handlePix: () => void;
    handleCard: () => void;
    handleZeroCost?: () => void;
    processingZeroCost?: boolean;
    disabled?: boolean;
    children?: ReactNode;
}

const PaymentOptions: React.FC<PaymentOptionsProps> = ({ 
    description, 
    totalPrice, 
    finalPrice, 
    bonusBalance = 0, 
    useBonus = false, 
    setUseBonus, 
    formatPrice, 
    handlePix, 
    handleCard, 
    handleZeroCost,
    processingZeroCost = false,
    disabled = false,
    children
}) => {
    const { t } = useTranslation();
    const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
    
    // Se o finalPrice não for fornecido, assumimos o totalPrice. Se for 0, é custo zero.
    const currentFinalPrice = finalPrice !== undefined ? finalPrice : totalPrice;
    const isZeroCost = currentFinalPrice <= 0;

    return (
        <Paper elevation={3} sx={{ p: 3, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1px solid #909090ff' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
                {t('payment.options.order_summary')}
            </Typography>
            
            <Paper variant="outlined" sx={{ my: 3, py: 2, borderRadius: 3, border: '1px solid #595959ff' }}>
                <Typography variant="h6" component="div" gutterBottom>
                    {description || t('payment.options.select_item')}
                </Typography>
                
                {children}

                {bonusBalance > 0 && (
                    <Box sx={{ mt: 2, mb: 1, textAlign: 'left', px: 3 }}>
                         <FormControlLabel
                            control={
                                <Checkbox
                                    checked={useBonus}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUseBonus && setUseBonus(e.target.checked)}
                                    color="success"
                                    disabled={disabled}
                                />
                            }
                            label={
                                <Typography variant="body2">
                                    {t('payment.options.use_bonus')}: <strong>{formatPrice(Math.min(bonusBalance, totalPrice))}</strong>
                                    <br/>
                                    <span style={{ fontSize: '0.8em', color: '#666' }}>({t('payment.options.available_balance')}: {formatPrice(bonusBalance)})</span>
                                </Typography>
                            }
                        />
                    </Box>
                )}

                {useBonus && finalPrice !== undefined && (
                    <>
                        <Divider sx={{ my: 1, mx: 3 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 4 }}>
                            <Typography variant="body2">{t('payment.options.subtotal')}:</Typography>
                            <Typography variant="body2">{formatPrice(totalPrice)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 4, color: 'success.main' }}>
                            <Typography variant="body2">{t('payment.options.bonus_discount')}:</Typography>
                            <Typography variant="body2">- {formatPrice(totalPrice - finalPrice)}</Typography>
                        </Box>
                        <Divider sx={{ my: 1, mx: 3 }} />
                    </>
                )}

                <Typography variant="h4" color="primary" fontWeight="bold" sx={{ mt: 1 }}>
                    {formatPrice(currentFinalPrice)}
                </Typography>
            </Paper>

            <Box sx={{ textAlign: 'left', mb: 2 }}>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={termsAccepted}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTermsAccepted(e.target.checked)}
                            color="primary"
                        />
                    }
                    label={
                        <Typography variant="body2">
                            {t('payment.options.terms_read')} <a href="/termos-de-uso" target="_blank" rel="noopener noreferrer">{t('payment.options.terms_link')}</a> {t('payment.options.connector')} <a href="/politica-de-privacidade" target="_blank" rel="noopener noreferrer">{t('payment.options.privacy_link')}</a>.
                        </Typography>
                    }
                />
            </Box>

            <Grid container spacing={2} sx={{ justifyContent: "center", alignItems: "center" }}>
                {isZeroCost ? (
                    <Grid size={12}>
                         <Button
                            fullWidth
                            variant="contained"
                            color="success"
                            startIcon={<CardGiftcardIcon />}
                            onClick={handleZeroCost}
                            disabled={!termsAccepted || disabled || processingZeroCost}
                            sx={{ py: 2, fontSize: '1.1rem' }}
                        >
                            {processingZeroCost ? t('payment.options.processing') : t('payment.options.confirm_redemption')}
                        </Button>
                    </Grid>
                ) : (
                    <>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Button
                                fullWidth
                                variant="contained"
                                color="success"
                                startIcon={<PixIcon />}
                                onClick={handlePix}
                                disabled={!termsAccepted || disabled}
                                sx={{ py: 1.5 }}
                            >
                                {t('payment.options.pay_pix')}
                            </Button>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Button
                                fullWidth
                                variant="contained"
                                color="warning"
                                startIcon={<CreditCardIcon />}
                                onClick={handleCard}
                                disabled={!termsAccepted || disabled}
                                sx={{ py: 1.5 }}
                            >
                                {t('payment.options.pay_card')}
                            </Button>
                        </Grid>
                    </>
                )}
            </Grid>
        </Paper>
    );
};

export default PaymentOptions;
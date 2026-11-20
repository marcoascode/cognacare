import React, { useState, useEffect } from 'react';
import {
    Box,
    Modal,
    Typography,
    TextField,
    Button,
    Paper,
    Fade,
    Stack,
    Divider,
    Alert,
    IconButton,
    Tooltip,
    Chip
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PixIcon from '@mui/icons-material/Pix';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';

const TEMPO_EXPIRACAO_SEGUNDOS = 3600; // 60 Minutos

// --- INTERFACES ---
interface QrCodeType {
    qrCode: string | null;
}

interface PixModalProps {
    open: boolean;
    handleClose: () => void;
    qrCode: QrCodeType;
    base64Image: string | null;
    handleCopyToClipboard: () => void;
    copySuccess: boolean;
    totalPrice: number;
    productName: string;
}

const PixModal: React.FC<PixModalProps> = ({ 
    open, 
    handleClose, 
    qrCode, 
    base64Image, 
    handleCopyToClipboard, 
    copySuccess,
    totalPrice,
    productName
}) => {
    const theme = useTheme();
    const [timeLeft, setTimeLeft] = useState<number>(TEMPO_EXPIRACAO_SEGUNDOS);

    // 1. Reinicia o timer APENAS quando o código do PIX mudar (Nova Cobrança)
    useEffect(() => {
        if (qrCode && qrCode.qrCode) {
            setTimeLeft(TEMPO_EXPIRACAO_SEGUNDOS);
        }
    }, [qrCode]); // Removemos 'open' daqui para não resetar ao reabrir o mesmo modal

    // 2. Lógica do Relógio (Só conta se estiver aberto e com tempo sobrando)
    useEffect(() => {
        if (!open || timeLeft <= 0) return;

        const intervalId = setInterval(() => {
            setTimeLeft((prevTime) => prevTime - 1);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [open, timeLeft]);

    const formatTime = (seconds: number): string => {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const formatCurrency = (value: number | string): string => {
        const numericValue = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue || 0);
    };

    return (
        <Modal open={open} onClose={handleClose} closeAfterTransition>
            <Fade in={open}>
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: { xs: '95%', sm: 500 },
                        bgcolor: 'background.paper',
                        borderRadius: 3,
                        boxShadow: 24,
                        p: 0,
                        overflow: 'hidden',
                        outline: 'none',
                        maxHeight: '95vh',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* --- HEADER --- */}
                    <Box sx={{ bgcolor: 'success.main', color: 'white', p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <PixIcon sx={{ fontSize: 30 }} />
                            <Typography variant="h6" fontWeight="bold">Pagamento via Pix</Typography>
                        </Box>
                        <IconButton onClick={handleClose} size="small" sx={{ color: 'white' }}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    <Box sx={{ p: 2, overflowY: 'auto' }}>
                        
                        {/* --- RESUMO DO PEDIDO --- */}
                        <Paper variant="outlined" sx={{ bgcolor: alpha(theme.palette.text.primary, 0.01), p: 2, mb: 2, borderRadius: 2, borderStyle: 'dashed' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                <Typography variant="body2">Produto:</Typography>
                                <Typography variant="body2" color="success.main" fontWeight="bold" align="right">{productName || 'Compra'}</Typography>
                            </Stack>
                            <Divider sx={{ my: 1 }} />
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body1" fontWeight="bold">Total a Pagar:</Typography>
                                <Typography variant="h5" color="success.main" fontWeight="bold">
                                    {formatCurrency(totalPrice)}
                                </Typography>
                            </Stack>
                        </Paper>

                        <Typography align="center" variant="body1" gutterBottom>
                            Abra o app do seu banco e escaneie o código abaixo:
                        </Typography>

                        {/* --- QR CODE --- */}
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                            {base64Image ? (
                                <Box 
                                    component="img" 
                                    src={base64Image} 
                                    alt="QR Code Pix" 
                                    sx={{ 
                                        width: 220, 
                                        height: 220, 
                                        border: '1px solid #ddd', 
                                        borderRadius: 2,
                                        p: 1 
                                    }} 
                                />
                            ) : (
                                <Box sx={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f0f0f0', borderRadius: 2 }}>
                                    <Typography variant="caption">Carregando QR Code...</Typography>
                                </Box>
                            )}
                        </Box>

                        {/* --- PIX COPIA E COLA --- */}
                        <Box sx={{ mt: 2 }}>
                            <Divider>
                                <Chip label="Ou use o Pix Copia e Cola" size="small" />
                            </Divider>
                            
                            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    value={qrCode.qrCode || ''}
                                    InputProps={{ 
                                        readOnly: true,
                                        sx: { 
                                            fontSize: '0.85rem', 
                                            bgcolor: 'action.hover',
                                            fontFamily: 'monospace' 
                                        } 
                                    }}
                                />
                                <Tooltip title={copySuccess ? "Copiado!" : "Copiar código"}>
                                    <Button
                                        variant="contained"
                                        color={copySuccess ? "success" : "primary"}
                                        onClick={handleCopyToClipboard}
                                        sx={{ minWidth: 50, px: 2 }}
                                    >
                                        {copySuccess ? <CheckCircleIcon /> : <ContentCopyIcon />}
                                    </Button>
                                </Tooltip>
                            </Box>
                            {copySuccess && (
                                <Typography variant="caption" color="success.main" display="block" textAlign="center" mt={0.5}>
                                    Código copiado para a área de transferência!
                                </Typography>
                            )}
                        </Box>

                        {/* --- TIMER --- */}
                        <Alert 
                            severity={timeLeft < 300 ? "error" : "info"} 
                            icon={<AccessTimeIcon />}
                            sx={{ mt: 2, justifyContent: 'center' }}
                        >
                            Este código expira em <strong>{formatTime(timeLeft)}</strong>
                        </Alert>
                    </Box>

                    {/* --- FOOTER --- */}
                    <Box sx={{ p: 2, borderTop: '1px solid #eee', textAlign: 'center' }}>
                        <Button onClick={handleClose} color="inherit">
                            Fechar e Aguardar
                        </Button>
                    </Box>
                </Box>
            </Fade>
        </Modal>
    );
};

export default PixModal;
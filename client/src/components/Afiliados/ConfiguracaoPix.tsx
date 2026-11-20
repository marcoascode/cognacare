import React, { useState, useEffect } from 'react';
import { 
    Paper, Typography, Box, TextField, MenuItem, Button, 
    Alert, Stack, CircularProgress, Divider, AlertColor 
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import api from '../../api/axiosConfig';
import { useTranslation } from 'react-i18next';

// --- INTERFACES ---
interface ConfigData {
    cupom: string;
    chave_pix: string;
    tipo_chave_pix: string;
}

interface AlertMessage {
    type: AlertColor;
    text: string;
}

export default function ConfiguracaoPix() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [message, setMessage] = useState<AlertMessage | null>(null);
    
    const [dados, setDados] = useState<ConfigData>({
        cupom: '',
        chave_pix: '',
        tipo_chave_pix: 'email'
    });

    // Carrega dados iniciais (busca cupom e pix juntos)
    useEffect(() => {
        setLoading(true);
        api.get<ConfigData>('/fernandasepe/parceiro/configuracoes')
            .then(res => {
                if (res.data) setDados(res.data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // Tipagem estrita para o evento de mudança de input do Material-UI
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        let val = e.target.value;
        if (e.target.name === 'cupom') {
            val = val.toUpperCase().replace(/[^A-Z0-9]/g, ''); // Força formatação do cupom
        }
        setDados(prev => ({ ...prev, [e.target.name]: val }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await api.post('/fernandasepe/parceiro/configuracoes', dados);
            setMessage({ type: 'success', text: t('partner_pix.success_msg') });
            window.location.reload(); // Recarrega para atualizar o cupom no Painel lateral
        } catch (error: any) {
            console.error(error);
            setMessage({ 
                type: 'error', 
                text: error.response?.data?.error || t('partner_pix.error_msg') 
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 3, mt: 3, border: '1px solid #ddd' }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <AccountBalanceWalletIcon color="secondary" />
                <Typography variant="h6" fontWeight="bold">
                    {t('partner_pix.title')}
                </Typography>
            </Stack>
            
            <Typography variant="body2" color="text.secondary" paragraph>
                {t('partner_pix.description')}
            </Typography>

            {loading ? (
                <Box display="flex" justifyContent="center"><CircularProgress /></Box>
            ) : (
                <Stack spacing={2}>
                    <TextField
                        label={t('partner_pix.coupon_label')}
                        name="cupom"
                        value={dados.cupom}
                        onChange={handleChange}
                        fullWidth
                        placeholder={t('partner_pix.coupon_placeholder')}
                        helperText={t('partner_pix.coupon_helper')}
                    />

                    <Divider sx={{ my: 1 }} />

                    <TextField
                        select
                        label={t('partner_pix.key_type_label')}
                        name="tipo_chave_pix"
                        value={dados.tipo_chave_pix}
                        onChange={handleChange}
                        fullWidth
                        size="small"
                    >
                        <MenuItem value="cpf">{t('partner_pix.types.cpf')}</MenuItem>
                        <MenuItem value="cnpj">{t('partner_pix.types.cnpj')}</MenuItem>
                        <MenuItem value="email">{t('partner_pix.types.email')}</MenuItem>
                        <MenuItem value="telefone">{t('partner_pix.types.phone')}</MenuItem>
                        <MenuItem value="aleatoria">{t('partner_pix.types.random')}</MenuItem>
                    </TextField>

                    <TextField
                        label={t('partner_pix.pix_key_label')}
                        name="chave_pix"
                        value={dados.chave_pix}
                        onChange={handleChange}
                        fullWidth
                        placeholder={t('partner_pix.pix_key_placeholder')}
                        helperText={t('partner_pix.pix_key_helper')}
                    />

                    {message && <Alert severity={message.type}>{message.text}</Alert>}

                    <Button 
                        variant="contained" 
                        color="secondary" 
                        startIcon={saving ? <CircularProgress size={20} color="inherit"/> : <SaveIcon />}
                        onClick={handleSave}
                        disabled={saving || !dados.chave_pix || !dados.cupom}
                    >
                        {saving ? t('partner_pix.saving') : t('partner_pix.save_btn')}
                    </Button>
                </Stack>
            )}
        </Paper>
    );
}
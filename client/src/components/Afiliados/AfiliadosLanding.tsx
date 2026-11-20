import { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    Button, 
    Paper, 
    Container, 
    Dialog, 
    DialogContent, 
    IconButton, 
    Alert, 
    CircularProgress,
    Grid
} from '@mui/material';
// Nota: Importando Grid v2 explicitamente se o seu projeto estiver usando a versão mais recente
import { useTheme, alpha } from '@mui/material/styles';
import HandshakeIcon from '@mui/icons-material/Handshake';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import GroupsIcon from '@mui/icons-material/Groups';
import CloseIcon from '@mui/icons-material/Close';
import AfiliadosTermos from '../pages/AfiliadosTermos'; 
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosConfig';

// Definição dos estados possíveis para o status de afiliado
type AffiliateStatus = 'none' | 'pendente' | 'aprovado' | 'rejeitado' | null;

interface StatusResponse {
    status: AffiliateStatus;
}

export default function AfiliadosLanding() {
    const { t } = useTranslation();
    const theme = useTheme();

    const [openModal, setOpenModal] = useState<boolean>(false);
    const [affiliateStatus, setAffiliateStatus] = useState<AffiliateStatus>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        // Verifica se o usuário já enviou a candidatura
        api.get<StatusResponse>('/fernandasepe/parceiro/status-candidatura')
            .then(res => {
                setAffiliateStatus(res.data.status);
            })
            .catch(() => {
                setAffiliateStatus('none');
            })
            .finally(() => setLoading(false));
    }, []);

    const handleSuccess = (): void => {
        setAffiliateStatus('pendente');
        setOpenModal(false);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 }, mb: { xs: 2, sm: 4 } }}>
            {/* Hero Section */}
            <Paper 
                elevation={0} 
                sx={{ 
                    p: { xs: 2, sm: 3 }, 
                    bgcolor: alpha(theme.palette.primary.main, 0.1), 
                    color: 'primary.main', 
                    borderRadius: 4, 
                    textAlign: 'center', 
                    mb: 4 
                }}
            >
                <Typography variant="h3" fontWeight="bold" gutterBottom>
                    {t('affiliates_landing.hero_title')}
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9, mb: 4, maxWidth: 800, mx: 'auto' }}>
                    {t('affiliates_landing.hero_desc')}
                </Typography>
            </Paper>

            {/* Aviso de Pendência (Se o usuário já se candidatou) */}
            {affiliateStatus === 'pendente' && (
                <Alert 
                    severity="info" 
                    sx={{ 
                        mb: { xs: 2, sm: 4 }, 
                        display: 'flex', 
                        justifyContent: 'center', 
                        fontSize: '1.1rem' 
                    }}
                >
                    {t('affiliates_landing.pending_message')}
                </Alert>
            )}

            {/* Benefícios */}
            <Grid container spacing={{ xs: 2, sm: 4 }} sx={{ justifyContent: 'center', alignContent: 'center' }}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: { xs: 2, sm: 4 }, height: '100%', textAlign: 'center', borderRadius: 3 }}>
                        <MonetizationOnIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                            {t('affiliates_landing.benefits.commission_title')}
                        </Typography>
                        <Typography color="text.secondary">
                            {t('affiliates_landing.benefits.commission_desc')}
                        </Typography>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: { xs: 2, sm: 4 }, height: '100%', textAlign: 'center', borderRadius: 3 }}>
                        <GroupsIcon sx={{ fontSize: 60, color: 'primary.main', mb: { xs: 1, sm: 2 } }} />
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                            {t('affiliates_landing.benefits.community_title')}
                        </Typography>
                        <Typography color="text.secondary">
                            {t('affiliates_landing.benefits.community_desc')}
                        </Typography>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: { xs: 2, sm: 4 }, height: '100%', textAlign: 'center', borderRadius: 3 }}>
                        <Typography variant="h2" fontWeight="bold" color="secondary.main" sx={{ mb: 1 }}>
                            {t('affiliates_landing.benefits.discount_val')}
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                            {t('affiliates_landing.benefits.discount_title')}
                        </Typography>
                        <Typography color="text.secondary">
                            {t('affiliates_landing.benefits.discount_desc')}
                        </Typography>
                    </Paper>
                </Grid>

                {/* Só mostra o botão se ele não tiver candidatura pendente/aprovada */}
                {affiliateStatus === 'none' && (
                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <Button 
                            variant="contained" 
                            color="secondary" 
                            size="large" 
                            startIcon={<HandshakeIcon />}
                            onClick={() => setOpenModal(true)}
                            sx={{ 
                                px: 5, 
                                py: 1.5, 
                                mt: 3, 
                                fontSize: '1.1rem', 
                                fontWeight: 'bold', 
                                borderRadius: 50 
                            }}
                        >
                            {t('affiliates_landing.cta_button')}
                        </Button>
                    </Box>
                )}
            </Grid>

            {/* Modal de Termos e Cadastro */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="lg">
                <DialogContent sx={{ p: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
                        <IconButton onClick={() => setOpenModal(false)}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                    {/* Componente de Termos recebe o callback tipado */}
                    <AfiliadosTermos onJoinSuccess={handleSuccess} />
                </DialogContent>
            </Dialog>
        </Container>
    );
}
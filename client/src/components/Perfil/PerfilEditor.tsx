import React, { useState, useEffect, ReactNode } from 'react';
import {
    Box, Paper, Typography, TextField, Button, Grid,
    CircularProgress, Alert, Snackbar, Divider, MenuItem, Select, FormControl, InputLabel,
    Tabs, Tab, Badge, SelectChangeEvent
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import SaveIcon from '@mui/icons-material/Save';
import SecurityIcon from '@mui/icons-material/Security';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useTranslation, Trans } from 'react-i18next';

import api from '../../api/axiosConfig';
import PerfilImagem from './PerfilImagem';
import ChangePassword from './ChangePassword';

// --- INTERFACES ---
interface CustomTabPanelProps {
    children?: ReactNode;
    index: number;
    value: number;
    [x: string]: any;
}

interface PerfilEditorProps {
    session?: any;
    onUpdateProfile?: () => void;
}

interface UserData {
    nome: string;
    email: string;
    perfil_recompensado: number;
}

interface ProfileForm {
    documento_nacional: string;
    telefone: string;
    cep: string;
    endereco_logradouro: string;
    numero: string;
    complemento: string;
    cidade: string;
    estado_uf: string;
    pais: string;
    escolaridade: string;
    relacao_crianca: string;
    relacao_crianca_outro: string;
}

interface ViaCepResponse {
    erro?: boolean;
    logradouro?: string;
    localidade?: string;
    uf?: string;
}

// --- COMPONENTES AUXILIARES ---
function CustomTabPanel(props: CustomTabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`perfil-tabpanel-${index}`}
            aria-labelledby={`perfil-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ pt: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

// --- COMPONENTE PRINCIPAL ---
export default function PerfilEditor({ session, onUpdateProfile }: PerfilEditorProps) {
    const theme = useTheme();
    const { t } = useTranslation();
    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [loadingCep, setLoadingCep] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [tabIndex, setTabIndex] = useState<number>(0);

    const [userData, setUserData] = useState<UserData>({
        nome: '', email: '', perfil_recompensado: 0
    });

    const [form, setForm] = useState<ProfileForm>({
        documento_nacional: '', telefone: '', cep: '', endereco_logradouro: '', numero: '', complemento: '', cidade: '', estado_uf: '', pais: 'Brasil', escolaridade: '', relacao_crianca: '', relacao_crianca_outro: ''
    });

    useEffect(() => {
        const fetchPerfil = async () => {
            try {
                const response = await api.get('/fernandasepe/profile');
                if (response.data && response.data.user) {
                    const d = response.data.user;
                    setUserData({
                        nome: d.nome,
                        email: d.email,
                        perfil_recompensado: d.perfil_recompensado || 0
                    });
                    setForm({
                        documento_nacional: d.documento_nacional || '',
                        telefone: d.telefone || '',
                        cep: d.cep || '',
                        endereco_logradouro: d.endereco_logradouro || '',
                        numero: d.numero || '',
                        complemento: d.complemento || '',
                        cidade: d.cidade || '',
                        estado_uf: d.estado_uf || '',
                        pais: d.pais || 'Brasil',
                        escolaridade: d.escolaridade || '',
                        relacao_crianca: d.relacao_crianca || '',
                        relacao_crianca_outro: d.relacao_crianca_outro || ''
                    });
                }
            } catch (err) {
                console.error(err);
                setErrorMsg('Não foi possível carregar os dados do seu perfil.');
            } finally {
                setLoading(false);
            }
        };
        fetchPerfil();
    }, []);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabIndex(newValue);
    };

    const consultarCep = async (cepValue: string) => {
        const cepLimpo = cepValue.replace(/\D/g, '');
        if (cepLimpo.length !== 8) return;

        setLoadingCep(true);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = (await res.json()) as ViaCepResponse;

            if (data.erro) {
                setErrorMsg('CEP não encontrado. Por favor, preencha os dados manualmente.');
            } else {
                setForm(prev => ({
                    ...prev,
                    endereco_logradouro: data.logradouro || '',
                    cidade: data.localidade || '',
                    estado_uf: data.uf || ''
                }));
            }
        } catch (err) {
            console.error('Erro ao buscar CEP:', err);
        } finally {
            setLoadingCep(false);
        }
    };

    const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        if (form.pais === 'Brasil') {
            value = value.replace(/\D/g, '');
            if (value.length > 8) value = value.slice(0, 8);
            value = value.replace(/^(\d{5})(\d)/, '$1-$2');

            if (value.length === 9) {
                consultarCep(value);
            }
        }
        setForm({ ...form, cep: value });
    };

    const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        if (form.pais === 'Brasil') {
            value = value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            value = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        }
        setForm({ ...form, documento_nacional: value });
    };

    const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        if (form.pais === 'Brasil') {
            value = value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            if (value.length > 10) value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
            else if (value.length > 5) value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
            else if (value.length > 2) value = value.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
            else if (value.length > 0) value = value.replace(/^(\d{0,2})$/, '($1');
        }
        setForm({ ...form, telefone: value });
    };

    const handlePaisChange = (e: SelectChangeEvent<string>) => {
        setForm({
            ...form,
            pais: e.target.value,
            documento_nacional: '',
            telefone: '',
            cep: '',
            endereco_logradouro: '',
            numero: '',
            complemento: '',
            cidade: '',
            estado_uf: ''
        });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        if (form.pais === 'Brasil' && form.estado_uf.trim().length !== 2) {
            setErrorMsg('Para o Brasil, o campo Estado (UF) deve conter exatamente 2 letras. Ex: SP, RJ.');
            setSubmitting(false);
            return;
        }

        try {
            const response = await api.put('/fernandasepe/profile/completar', form);
            if (response.data.sucesso) {
                setSuccessMsg(response.data.mensagem);
                if (response.data.concedeuCreditos) {
                    setUserData(prev => ({ ...prev, perfil_recompensado: 1 }));

                    // Atualiza o cache local IMEDIATAMENTE para o App.jsx ler o "1" após o reload
                    const localCache = JSON.parse(localStorage.getItem('user_data') || '{}');
                    localCache.perfil_recompensado = 1;
                    localStorage.setItem('user_data', JSON.stringify(localCache));

                    setTimeout(() => window.location.reload(), 2500);
                }
            }
        } catch (err: any) {
            setErrorMsg(err.response?.data?.erro || 'Erro ao salvar as informações cadastrais.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: '50vh' }}><CircularProgress /></Box>;

    const needsProfileCompletion = userData.perfil_recompensado === 0;

    return (
        <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1000, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
                <AccountCircleIcon color="primary" sx={{ fontSize: 40 }} />
                <Box>
                    <Typography variant="h5" fontWeight="bold">{t('profile.title')}</Typography>
                    <Typography variant="body2" color="text.secondary">{t('profile.subtitle')}</Typography>
                </Box>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabIndex} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                    <Tab label={needsProfileCompletion ? <Badge color="success" variant="dot" sx={{ '& .MuiBadge-badge': { right: -5, top: 0 } }}>{t('profile.tab_1')}</Badge> : t('profile.tab_1')} />
                    <Tab label={t('profile.tab_2')} />
                    <Tab label={t('profile.tab_3')} />
                </Tabs>
            </Box>

            {/* ABA 1: DADOS CADASTRAIS */}
            <CustomTabPanel value={tabIndex} index={0}>
                <Paper elevation={2} sx={{
                    p: { xs: 1, sm: 2 },
                    border: '1px solid',
                    borderColor: alpha(theme.palette.info.dark, 0.5),
                    borderRadius: 3,
                }}
                >
                    <Typography variant="h6" fontWeight="bold" >{t('profile.data_title')}</Typography>
                    <Typography variant="body2" color="text.secondary" mb={{ xs: 1, sm: 2 }}>{t('profile.data_subtitle')}</Typography>

                    {needsProfileCompletion && (
                        <Alert
                            severity="success"
                            icon={<CardGiftcardIcon />}
                            sx={{ mb: { xs: 2, sm: 3 }, fontWeight: '500' }}
                        >
                            <Trans
                                i18nKey="profile.extra_credits"
                                components={{
                                    1: <strong />,
                                    2: <strong />
                                }}
                            />
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit}>
                        <Grid container spacing={{ xs: 1, sm: 2 }}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField fullWidth label={t('profile.name')} value={userData.nome} disabled variant="filled" />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField fullWidth label={t('profile.email')} value={userData.email} disabled variant="filled" />
                            </Grid>

                            <Grid size={12}> <Divider sx={{ my: 1 }} /> </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth required>
                                    <InputLabel>{t('profile.education')}</InputLabel>
                                    <Select
                                        label={t('profile.education')}
                                        value={form.escolaridade}
                                        onChange={(e) => setForm({ ...form, escolaridade: e.target.value })}
                                    >
                                        <MenuItem value="Ensino Fundamental Incompleto">{t('profile.edu_fund_inc')}</MenuItem>
                                        <MenuItem value="Ensino Fundamental Completo">{t('profile.edu_fund_comp')}</MenuItem>
                                        <MenuItem value="Ensino Médio Incompleto">{t('profile.edu_med_inc')}</MenuItem>
                                        <MenuItem value="Ensino Médio Completo">{t('profile.edu_med_comp')}</MenuItem>
                                        <MenuItem value="Ensino Superior Incompleto">{t('profile.edu_sup_inc')}</MenuItem>
                                        <MenuItem value="Ensino Superior Completo">{t('profile.edu_sup_comp')}</MenuItem>
                                        <MenuItem value="Pós-graduação/Mestrado/Doutorado">{t('profile.edu_pos')}</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 3 }}>
                                <TextField
                                    fullWidth required
                                    label={form.pais === 'Brasil' ? "CPF" : t('profile.cpf')}
                                    placeholder={form.pais === 'Brasil' ? "000.000.000-00" : t('profile.doc_number')}
                                    value={form.documento_nacional} onChange={handleDocumentChange}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 3 }}>
                                <TextField
                                    fullWidth required
                                    label={t('profile.tel')}
                                    placeholder={form.pais === 'Brasil' ? "(00) 00000-0000" : t('profile.tel_code')}
                                    value={form.telefone} onChange={handleTelefoneChange}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: form.relacao_crianca === 'Outros' ? 2 : 6 }}>
                                <FormControl fullWidth required>
                                    <InputLabel>{t('profile.relation')}</InputLabel>
                                    <Select
                                        label={t('profile.relation')}
                                        value={form.relacao_crianca}
                                        onChange={(e) => setForm({ ...form, relacao_crianca: e.target.value })}
                                    >
                                        <MenuItem value="Mãe">{t('profile.rel_mother')}</MenuItem>
                                        <MenuItem value="Pai">{t('profile.rel_father')}</MenuItem>
                                        <MenuItem value="Tio/Tia">{t('profile.rel_uncle')}</MenuItem>
                                        <MenuItem value="Avô/Avó">{t('profile.rel_grandparent')}</MenuItem>
                                        <MenuItem value="Irmão/Irmã">{t('profile.rel_sibling')}</MenuItem>
                                        <MenuItem value="Outros">{t('profile.rel_other')}</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            {form.relacao_crianca === 'Outros' && (
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <TextField
                                        fullWidth
                                        required
                                        label={t('profile.specify_relation')}
                                        placeholder={t('profile.specify_relation_placeholder')}
                                        value={form.relacao_crianca_outro}
                                        onChange={(e) => setForm({ ...form, relacao_crianca_outro: e.target.value })}
                                    />
                                </Grid>
                            )}

                            <Grid size={{ xs: 12, sm: 3 }}>
                                <FormControl fullWidth required>
                                    <InputLabel>{t('profile.country')}</InputLabel>
                                    <Select value={form.pais} label={t('profile.country')} onChange={handlePaisChange}>
                                        <MenuItem value="Brasil">Brasil</MenuItem>
                                        <MenuItem value="Portugal">Portugal</MenuItem>
                                        <MenuItem value="Estados Unidos">United States</MenuItem>
                                        <MenuItem value="Outro">Another Country</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 3 }}>
                                <TextField
                                    fullWidth required
                                    label={form.pais === 'Brasil' ? "CEP" : t('profile.zip')}
                                    placeholder={form.pais === 'Brasil' ? "00000-000" : t('profile.zip')}
                                    value={form.cep} onChange={handleCepChange}
                                    InputProps={loadingCep ? { endAdornment: <CircularProgress size={20} /> } : {}}
                                />
                            </Grid>

                            <Grid size={12}> <Divider sx={{ my: 1 }} /> </Grid>

                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth required
                                    label={form.pais === 'Brasil' ? "Logradouro (Rua, Bairro)" : t('profile.logradouro')}
                                    value={form.endereco_logradouro}
                                    onChange={(e) => setForm({ ...form, endereco_logradouro: e.target.value })}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 2 }}>
                                <TextField
                                    fullWidth required label="Número"
                                    value={form.numero}
                                    onChange={(e) => setForm({ ...form, numero: e.target.value })}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    fullWidth label={form.pais === 'Brasil' ? "Complemento" : t('profile.complemento')}
                                    placeholder={form.pais === 'Brasil' ? "Apto, Bloco" : t('profile.complemento')}
                                    value={form.complemento}
                                    onChange={(e) => setForm({ ...form, complemento: e.target.value })}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 8 }}>
                                <TextField
                                    fullWidth required label={t('profile.cidade')}
                                    value={form.cidade}
                                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    fullWidth required
                                    label={form.pais === 'Brasil' ? "Estado (UF)" : t('profile.estado')}
                                    placeholder={form.pais === 'Brasil' ? "Ex: SP" : t('profile.estado')}
                                    inputProps={form.pais === 'Brasil' ? { maxLength: 2 } : {}}
                                    value={form.estado_uf}
                                    onChange={(e) => setForm({ ...form, estado_uf: e.target.value })}
                                />
                            </Grid>

                        </Grid>

                        <Button
                            type="submit" variant="contained" fullWidth disabled={submitting || loadingCep}
                            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                            sx={{ mt: { xs: 2, sm: 4 }, py: 1.5, fontWeight: 'bold' }}
                        >
                            {submitting ? t('profile.validating') : t('profile.save')}
                        </Button>
                    </form>
                </Paper>
            </CustomTabPanel>

            {/* ABA 2: ALTERAR FOTO */}
            <CustomTabPanel value={tabIndex} index={1}>
                <Paper elevation={2} sx={{
                    p: { xs: 2, md: 4 },
                    maxWidth: 600,
                    mx: 'auto',
                    border: '1px solid',
                    borderColor: alpha(theme.palette.info.dark, 0.5),
                    borderRadius: 3
                }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <PhotoCameraIcon color="primary" />
                        <Typography variant="h6" fontWeight="bold">{t('profile.photo')}</Typography>
                    </Box>
                    <Divider sx={{ mb: 3 }} />
                    <PerfilImagem session={session} onUpdateProfile={onUpdateProfile} />
                </Paper>
            </CustomTabPanel>

            {/* ABA 3: ALTERAR SENHA */}
            <CustomTabPanel value={tabIndex} index={2}>
                <Paper elevation={2} sx={{
                    p: { xs: 2, md: 4 },
                    maxWidth: 600,
                    mx: 'auto',
                    border: '1px solid',
                    borderColor: alpha(theme.palette.info.dark, 0.5),
                    borderRadius: 3
                }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <SecurityIcon color="primary" />
                        <Typography variant="h6" fontWeight="bold">{t('profile.tab_3')}</Typography>
                    </Box>
                    <Divider sx={{ mb: 3 }} />
                    <ChangePassword onClose={() => { }} />
                </Paper>
            </CustomTabPanel>

            <Snackbar open={!!errorMsg} autoHideDuration={6000} onClose={() => setErrorMsg(null)}>
                <Alert severity="error" onClose={() => setErrorMsg(null)}>{errorMsg}</Alert>
            </Snackbar>
            <Snackbar open={!!successMsg} autoHideDuration={6000} onClose={() => setSuccessMsg(null)}>
                <Alert severity="success" onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>
            </Snackbar>
        </Box>
    );
}
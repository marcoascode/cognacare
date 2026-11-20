import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box, Paper, Typography, Grid, Button, Dialog, AppBar, Toolbar, IconButton,
    Slide, TextField, MenuItem, Select, FormControl, InputLabel,
    Checkbox, FormControlLabel, Chip, CircularProgress, Stack,
    Radio, RadioGroup, FormLabel, DialogTitle, DialogContent, DialogContentText, DialogActions, Divider,
    List, ListItem, ListItemText, ListItemSecondaryAction, Tooltip,
    SelectChangeEvent,
    TextFieldProps,
    FormGroup
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { useTheme, alpha } from '@mui/material/styles';

// Funções de data
import {
    format, isSameDay, isAfter, startOfDay, startOfWeek, endOfWeek,
    startOfMonth, endOfMonth, addDays, isSameMonth, subMonths, addMonths, subDays
} from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';

// Ícones
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EventIcon from '@mui/icons-material/Event';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// Ícones de Sentimento
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';

import api from '../../api/axiosConfig';
import { useTranslation } from 'react-i18next';
import { ICrianca } from '../../../../Shared';

// --- INTERFACES ---
interface DiarioBordoProps {
    criancas: ICrianca[];
}

interface IFormData {
    humor_dia: number;
    atividades_realizadas: string;
    atividades_pif: string;
    comportamento_geral: string;
    teve_crise: boolean;
    detalhes_crise: string;
    crise_antes: string;
    crise_durante: string;
    crise_depois: string;
    crise_tempo: string;
    comunicacao: string;
    socializacao: string;
    aspectos_sensoriais: string;
    alimentacao: string;
    sono: string;
    uso_recursos: string[];
    habilidades_motoras: string;
    habilidades_cognitivas: string;
    habilidades_adaptativas: string;
    momentos_chave: string;
}

interface IAgendaForm {
    categoria_id: string | number;
    titulo: string;
    hora_inicio: string;
    hora_fim: string;
    periodicidade: string;
    data_fim_recorrencia: string;
    anotacoes: string;
}

// Transição do Modal
const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { children: React.ReactElement<any, any> },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

// Componente Customizado: TextField com limite de caracteres
type LimitedTextFieldProps = TextFieldProps & {
    limit?: number;
    helperText?: string;
    value?: string;
};

const LimitedTextField: React.FC<LimitedTextFieldProps> = ({ limit = 500, helperText, value, disabled, placeholder, ...props }) => {
    const currentLength = value ? value.length : 0;
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';

    return (
        <TextField
            {...props}
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            inputProps={{ maxLength: limit }}
            FormHelperTextProps={{ component: 'div' }}
            helperText={
                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', mt: 0.5 }}>
                    {helperText && (
                        <Typography variant="caption" sx={{ mb: 0.5, fontStyle: 'italic', color: isDarkMode ? 'grey.400' : 'text.secondary', lineHeight: 1.2 }}>
                            {helperText}
                        </Typography>
                    )}
                    {!disabled && (
                        <Typography variant="caption" sx={{ alignSelf: 'flex-end', fontWeight: 'bold', color: currentLength >= limit ? 'error.main' : (isDarkMode ? 'grey.500' : 'text.disabled') }}>
                            {currentLength}/{limit}
                        </Typography>
                    )}
                </Box>
            }
        />
    );
};

// Funções de Estilização de Ícones
const getHumorIcon = (value: number, fontSize: number | string | object) => {
    const style = { fontSize };
    switch (value) {
        case 1: return <SentimentVeryDissatisfiedIcon color="error" sx={style} />;
        case 2: return <SentimentDissatisfiedIcon color="warning" sx={style} />;
        case 3: return <SentimentNeutralIcon color="action" sx={style} />;
        case 4: return <SentimentSatisfiedAltIcon color="success" sx={style} />;
        case 5: return <SentimentVerySatisfiedIcon color="primary" sx={style} />;
        default: return <SentimentNeutralIcon color="disabled" sx={style} />;
    }
};

interface StyledRadioProps {
    value: string;
    icon: React.ReactNode;
}

function StyledRadio(props: StyledRadioProps) {
    const { value, icon } = props;
    return (
        <Radio 
            disableRipple 
            value={value} 
            icon={icon} 
            checkedIcon={<Box sx={{ transform: 'scale(1.2)', filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.2))' }}>{icon}</Box>} 
            sx={{ '&:hover': { bgcolor: 'transparent' } }} 
        />
    );
}

const recursosOpcoes = [
    'Quadro de Rotina Visual', 
    'Pistas Visuais/Cards', 
    'História Social', 
    'Estratégias de Regulação (Sensorial)', 
    'Timer/Temporizador', 
    'Outros'
];

// --- COMPONENTE PRINCIPAL ---
export default function DiarioBordo({ criancas }: DiarioBordoProps) {
    const { t, i18n } = useTranslation();
    const theme = useTheme();

    const location = useLocation();
    const navigate = useNavigate();

    const [selectedChild, setSelectedChild] = useState<number | string>(
        criancas && criancas.length > 0 && criancas[0].id_crianca ? criancas[0].id_crianca : ''
    );
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    const [monthEvents, setMonthEvents] = useState<any[]>([]);
    const [highlightedDays, setHighlightedDays] = useState<any[]>([]);
    const [isLoadingMonth, setIsLoadingMonth] = useState<boolean>(false);

    const [open, setOpen] = useState<boolean>(false);
    const [loadingForm, setLoadingForm] = useState<boolean>(false);
    const [isFutureDate, setIsFutureDate] = useState<boolean>(false);
    const [isEditable, setIsEditable] = useState<boolean>(true);
    const [lockAlertOpen, setLockAlertOpen] = useState<boolean>(false);

    const [categorias, setCategorias] = useState<any[]>([]);
    const [agendaDia, setAgendaDia] = useState<any[]>([]);
    const [openAgendaModal, setOpenAgendaModal] = useState<boolean>(false);
    const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);
    const [cancelReason, setCancelReason] = useState<string>('');
    const [cancelAgendaId, setCancelAgendaId] = useState<number | null>(null);
    const [editingEventId, setEditingEventId] = useState<number | null>(null);
    
    const [agendaForm, setAgendaForm] = useState<IAgendaForm>({
        categoria_id: '', titulo: '', hora_inicio: '08:00', hora_fim: '09:00',
        periodicidade: 'unico', data_fim_recorrencia: format(new Date(), 'yyyy-MM-dd'), anotacoes: ''
    });

    const [formData, setFormData] = useState<IFormData>({
        humor_dia: 3, atividades_realizadas: '', atividades_pif: '', comportamento_geral: '', teve_crise: false, detalhes_crise: '',
        crise_antes: '', crise_durante: '', crise_depois: '', crise_tempo: '', comunicacao: '', socializacao: '', aspectos_sensoriais: '',
        alimentacao: '', sono: '', uso_recursos: [], habilidades_motoras: '', habilidades_cognitivas: '', habilidades_adaptativas: '', momentos_chave: ''
    });

    const obterLocaleDateFns = () => {
        const idiomaAtivo = i18n.language ? i18n.language.substring(0, 2) : 'pt';
        switch (idiomaAtivo) {
            case 'en': return enUS;
            case 'es': return es;
            default: return ptBR;
        }
    };

    const currentChildData = criancas ? criancas.find(c => c.id_crianca === selectedChild) : null;

    useEffect(() => {
        if (criancas && criancas.length > 0 && (!selectedChild || selectedChild === '')) {
            setSelectedChild(criancas[0].id_crianca || '');
        }
    }, [criancas, selectedChild]);

    useEffect(() => {
        const state = location.state as { dataAlvo?: string | Date } | null;
        if (state && state.dataAlvo && selectedChild) {
            const dataVindaDoDashboard = new Date(state.dataAlvo);
            setCurrentDate(dataVindaDoDashboard);
            handleDateClick(dataVindaDoDashboard);
            navigate(location.pathname, { replace: true });
        }
    }, [location.state, selectedChild, location.pathname, navigate]);

    useEffect(() => {
        const fetchCategorias = async () => {
            try {
                const res = await api.get('/fernandasepe/agenda/categorias');
                setCategorias(res.data);
            } catch (e) { console.error(e); }
        };
        fetchCategorias();
    }, []);

    const fetchMonthData = useCallback(async (baseDate: Date) => {
        if (!selectedChild) return;
        setIsLoadingMonth(true);
        try {
            const month = baseDate.getMonth() + 1;
            const year = baseDate.getFullYear();

            const startGrid = startOfWeek(startOfMonth(baseDate));
            const endGrid = endOfWeek(endOfMonth(baseDate));
            const startStr = format(startGrid, 'yyyy-MM-dd');
            const endStr = format(endGrid, 'yyyy-MM-dd');

            const [resDiario, resAgenda] = await Promise.all([
                api.get(`/fernandasepe/diario/calendario/${selectedChild}?mes=${month}&ano=${year}`),
                api.get(`/fernandasepe/agenda/crianca/${selectedChild}?start=${startStr} 00:00:00&end=${endStr} 23:59:59`)
            ]);

            setHighlightedDays(resDiario.data || []);
            setMonthEvents(resAgenda.data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingMonth(false);
        }
    }, [selectedChild]);

    useEffect(() => {
        if (selectedChild) fetchMonthData(currentDate);
    }, [currentDate, selectedChild, fetchMonthData]);

    const fetchAgendaDia = useCallback(async (date: Date) => {
        try {
            const dtStr = format(date, 'yyyy-MM-dd');
            const res = await api.get(`/fernandasepe/agenda/crianca/${selectedChild}?start=${dtStr} 00:00:00&end=${dtStr} 23:59:59`);
            setAgendaDia(res.data);
        } catch (e) { console.error(e); }
    }, [selectedChild]);

    const handleDateClick = useCallback(async (newDate: Date) => {
        setSelectedDate(newDate);
        setLoadingForm(true);
        setOpen(true);

        const today = startOfDay(new Date());
        const selected = startOfDay(newDate);
        const future = isAfter(selected, today);
        setIsFutureDate(future);

        if (future) {
            setIsEditable(false);
        } else {
            const todayRef = new Date();
            const yesterdayRef = subDays(todayRef, 1);
            const isEditableDay = isSameDay(newDate, todayRef) || isSameDay(newDate, yesterdayRef);

            setIsEditable(isEditableDay);
            if (!isEditableDay) setLockAlertOpen(true);
        }

        // Limpar o formulário antes de preencher
        setFormData({
            humor_dia: 3, atividades_realizadas: '', atividades_pif: '', comportamento_geral: '', teve_crise: false, detalhes_crise: '',
            crise_antes: '', crise_durante: '', crise_depois: '', crise_tempo: '', comunicacao: '', socializacao: '', aspectos_sensoriais: '',
            alimentacao: '', sono: '', uso_recursos: [], habilidades_motoras: '', habilidades_cognitivas: '', habilidades_adaptativas: '', momentos_chave: ''
        });

        await fetchAgendaDia(newDate);

        if (!future) {
            try {
                const formattedDate = format(newDate, 'yyyy-MM-dd');
                const response = await api.get(`/fernandasepe/diario/dia/${selectedChild}?data=${formattedDate}`);
                if (response.data) {
                    const loaded = response.data;
                    let recursos = [];
                    try { recursos = typeof loaded.uso_recursos === 'string' ? JSON.parse(loaded.uso_recursos) : loaded.uso_recursos; } catch (e) { console.log(e) }
                    
                    let criseData = { antes: '', durante: '', depois: '', tempo: '' };
                    if (loaded.teve_crise && loaded.detalhes_crise) {
                        try {
                            if (loaded.detalhes_crise.trim().startsWith('{')) { criseData = { ...criseData, ...JSON.parse(loaded.detalhes_crise) }; }
                            else { criseData.durante = loaded.detalhes_crise; }
                        } catch (e) { criseData.durante = loaded.detalhes_crise; console.log(e) }
                    }

                    setFormData({
                        ...loaded, 
                        humor_dia: Number(loaded.humor_dia) || 3, 
                        teve_crise: Boolean(loaded.teve_crise), 
                        uso_recursos: Array.isArray(recursos) ? recursos : [],
                        crise_antes: criseData.antes || '', 
                        crise_durante: criseData.durante || '', 
                        crise_depois: criseData.depois || '', 
                        crise_tempo: criseData.tempo || ''
                    });
                }
            } catch (error) { console.error(error); }
        }
        setLoadingForm(false);
    }, [selectedChild, fetchAgendaDia]);

    const salvarAgenda = async () => {
        try {
            const dtBase = format(selectedDate, 'yyyy-MM-dd');
            const payload = {
                crianca_id: selectedChild, categoria_id: agendaForm.categoria_id, titulo: agendaForm.titulo,
                data_hora_inicio: `${dtBase} ${agendaForm.hora_inicio}:00`, data_hora_fim: `${dtBase} ${agendaForm.hora_fim}:00`,
                periodicidade: agendaForm.periodicidade || 'unico', data_fim_recorrencia: agendaForm.periodicidade !== 'unico' ? agendaForm.data_fim_recorrencia : null,
                anotacoes: agendaForm.anotacoes || ''
            };
            if (editingEventId) await api.put(`/fernandasepe/agenda/${editingEventId}`, payload);
            else await api.post('/fernandasepe/agenda', payload);

            setOpenAgendaModal(false); setEditingEventId(null);
            setAgendaForm({ categoria_id: '', titulo: '', hora_inicio: '08:00', hora_fim: '09:00', periodicidade: 'unico', data_fim_recorrencia: format(new Date(), 'yyyy-MM-dd'), anotacoes: '' });
            fetchAgendaDia(selectedDate); fetchMonthData(currentDate);
        } catch (e) { console.error(e); alert(t('logbook.alerts.save_error_2')); }
    };

    const abrirEdicaoCompromisso = (item: any) => {
        setEditingEventId(item.id);
        setAgendaForm({
            categoria_id: item.categoria_id, titulo: item.titulo, hora_inicio: format(new Date(item.data_hora_inicio), 'HH:mm'),
            hora_fim: format(new Date(item.data_hora_fim), 'HH:mm'), periodicidade: item.periodicidade || 'unico',
            data_fim_recorrencia: item.data_fim_recorrencia ? format(new Date(item.data_fim_recorrencia), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'), anotacoes: item.anotacoes || ''
        });
        setOpenAgendaModal(true);
    };

    const atualizarStatusAgenda = async (id: number | null, novoStatus: string, motivo: string | null = null) => {
        if (!id) return;
        try {
            await api.put(`/fernandasepe/agenda/${id}`, { status: novoStatus, motivo_cancelamento: motivo });
            if (novoStatus === 'cancelado') setCancelModalOpen(false);
            fetchAgendaDia(selectedDate); fetchMonthData(currentDate);
        } catch (e) { alert(t('logbook.alerts.error_update')); console.log(e) }
    };

    const deletarAgenda = async (id: number) => {
        if (!window.confirm(t('logbook.alerts.delete') as string)) return;
        try {
            await api.delete(`/fernandasepe/agenda/${id}`);
            fetchAgendaDia(selectedDate); fetchMonthData(currentDate);
        } catch (e) { alert(t('logbook.alerts.delete_error')); console.log(e) }
    };

    const abrirCancelamento = (id: number) => {
        setCancelAgendaId(id); setCancelReason(''); setCancelModalOpen(true);
    };

    const handleSave = async () => {
        if (!isEditable || isFutureDate) return;
        try {
            const dateToSave = format(selectedDate, 'yyyy-MM-dd');
            let finalDetalhesCrise = '';
            if (formData.teve_crise) {
                finalDetalhesCrise = JSON.stringify({ antes: formData.crise_antes, durante: formData.crise_durante, depois: formData.crise_depois, tempo: formData.crise_tempo });
            }
            await api.post('/fernandasepe/diario/salvar', {
                ...formData,
                crianca_id: selectedChild,
                data: dateToSave,
                detalhes_crise: finalDetalhesCrise
            });
            setOpen(false); fetchMonthData(currentDate);
        } catch (error) { alert(t('logbook.alerts.save_error')); console.log(error) }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!isEditable) return;
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        if (name === 'humor_dia') { setFormData(prev => ({ ...prev, [name]: Number(value) })); return; }
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleRecursosChange = (recurso: string) => {
        if (!isEditable) return;
        setFormData(prev => {
            const current = prev.uso_recursos;
            if (current.includes(recurso)) {
                return { ...prev, uso_recursos: current.filter(r => r !== recurso) };
            } else {
                return { ...prev, uso_recursos: [...current, recurso] };
            }
        });
    };

    // --- FUNÇÕES AUXILIARES DE DATA E HORA ---
    const extrairDataSegura = (val: any) => {
        if (!val) return '';
        if (val instanceof Date) return format(val, 'yyyy-MM-dd');
        if (typeof val === 'string') {
            if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val.substring(0, 10);
            try { return format(new Date(val.replace(' ', 'T')), 'yyyy-MM-dd'); } catch (e) { console.log(e); return ''; }
        }
        return '';
    };

    const extrairHoraSegura = (val: any) => {
        if (!val) return '';
        if (val instanceof Date) return format(val, 'HH:mm');
        if (typeof val === 'string') {
            const timeMatch = val.match(/(?:T| )(\d{2}:\d{2})/);
            if (timeMatch) return timeMatch[1];
        }
        return '';
    };

    // --- RENDERIZAÇÃO DO CALENDÁRIO ---
    const renderCalendarGrid = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const weekDays = [
            t('logbook.dom'), t('logbook.seg'), t('logbook.ter'), t('logbook.qua'),
            t('logbook.qui'), t('logbook.sex'), t('logbook.sab')
        ];

        const headerRow = (
            <Box sx={{
                display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: { xs: 0.25, md: 0.5 },
                mb: 1, border: '2px solid', borderColor: alpha(theme.palette.info.dark, 0.5),
            }}
            >
                {weekDays.map((wd, index) => (
                    <Typography key={index} align="center" variant="subtitle2" color="text.secondary" fontWeight="bold">{wd}</Typography>
                ))}
            </Box>
        );

        let days = [];
        let day = startDate;

        while (day <= endDate) {
            const cloneDay = day;
            const formattedDateStr = format(cloneDay, 'yyyy-MM-dd');
            const isCurrentMonth = isSameMonth(cloneDay, monthStart);
            const isTodayDate = isSameDay(cloneDay, new Date());

            const humorData = highlightedDays.find(d => extrairDataSegura(d.data) === formattedDateStr);
            const dayEvents = monthEvents.filter(e => extrairDataSegura(e.data_hora_inicio) === formattedDateStr);

            days.push(
                <Paper
                    key={cloneDay.toISOString()} elevation={isTodayDate ? 3 : 0} onClick={() => handleDateClick(cloneDay)}
                    sx={{
                        height: { xs: 60, sm: 80 }, p: { xs: 0.25, md: 0.5 },
                        bgcolor: isCurrentMonth ? 'background.paper' : alpha(theme.palette.action.disabledBackground, 0.5),
                        border: '1px solid', borderColor: isTodayDate ? alpha(theme.palette.info.dark, 0.5) : 'divider',
                        display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: '0.2s', overflow: 'hidden',
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) }
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', height: { xs: 16, md: 24 } }}>
                            {humorData && humorData.humor_dia ? (
                                <Tooltip title={`Humor Registrado: ${humorData.humor_dia}/5`}>
                                    <Box sx={{ display: 'flex', bgcolor: 'background.paper', borderRadius: '50%', p: 0.1 }}>
                                        {getHumorIcon(humorData.humor_dia, { xs: 16, md: 24 })}
                                    </Box>
                                </Tooltip>
                            ) : (<Box sx={{ width: 18 }} />)}
                        </Box>
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: isTodayDate ? 'bold' : 'normal',
                                color: isTodayDate ? 'primary.contrastText' : (isCurrentMonth ? 'text.primary' : 'text.disabled'),
                                bgcolor: isTodayDate ? 'primary.main' : 'transparent',
                                borderRadius: '50%', width: { xs: 16, md: 24 }, height: { xs: 16, md: 24 },
                                display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 1.1, md: 0 }
                            }}
                        >
                            {format(cloneDay, 'd')}
                        </Typography>
                    </Box>

                    <Stack spacing={0.5} sx={{ flexGrow: 1, overflow: 'hidden' }}>
                        {dayEvents.slice(0, 3).map((event, idx) => (
                            <Typography
                                key={idx} variant="caption"
                                sx={{
                                    bgcolor: event.status === 'cancelado' ? alpha(theme.palette.error.main, 0.1) : alpha(theme.palette.primary.main, 0.1),
                                    color: event.status === 'cancelado' ? 'error.main' : 'text.primary',
                                    textDecoration: event.status === 'cancelado' ? 'line-through' : 'none',
                                    px: 0.5, borderRadius: 0.5, whiteSpace: 'nowrap', overflow: 'hidden',
                                    textOverflow: 'ellipsis', fontSize: '0.65rem', fontWeight: 500, display: 'block'
                                }}
                            >
                                <strong>{extrairHoraSegura(event.data_hora_inicio)}</strong> {event.titulo}
                            </Typography>
                        ))}
                        {dayEvents.length > 3 && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', px: 0.5, fontWeight: 'bold' }}>
                                + {dayEvents.length - 3} mais
                            </Typography>
                        )}
                    </Stack>
                </Paper>
            );
            day = addDays(day, 1);
        }

        return (
            <Box sx={{ width: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <IconButton onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeftIcon /></IconButton>
                    <Typography variant="h6" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                        {format(currentDate, 'MMMM yyyy', { locale: obterLocaleDateFns() })}
                    </Typography>
                    <IconButton onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRightIcon /></IconButton>
                </Box>
                {headerRow}
                {isLoadingMonth ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
                ) : (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: { xs: 0.25, sm: 0.5 } }}>
                        {days}
                    </Box>
                )}
            </Box>
        );
    };

    if (!criancas || criancas.length === 0) return (<Box sx={{ p: 3, textAlign: 'center' }}><Typography variant="h6" color="text.secondary">{t('logbook.no_child')}</Typography></Box>);

    return (
        <Grid container spacing={{xs:1, sm:2}} sx={{ p: {xs:1, sm:2}, justifyContent: 'center' }}>
            {/* COLUNA ESQUERDA */}
            <Grid size={{ xs: 12, md: 4 }}>
                <Paper elevation={3} sx={{
                    p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), border: '1px solid',
                    borderColor: alpha(theme.palette.info.dark, 0.5), borderRadius: 3, maxWidth: 450,
                }}>
                    <Typography variant="h6" fontWeight="bold" sx={{ mr: 1 }}>
                        <AutoStoriesIcon color="action" /> {t('logbook.title')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {t('logbook.subtitle')}
                    </Typography>

                    <Grid size={8}>
                        {criancas && criancas.length > 0 ? (
                            <FormControl fullWidth size="small" sx={{ bgcolor: 'background.paper', minWidth: 250, borderRadius: 1 }}>
                                <Select value={selectedChild} onChange={(e: SelectChangeEvent<string | number>) => setSelectedChild(e.target.value)} displayEmpty>
                                    {criancas.map(c => <MenuItem key={c.id_crianca} value={c.id_crianca}>{c.nome}</MenuItem>)}
                                </Select>
                            </FormControl>
                        ) : (
                            <Button variant="outlined" size="small" onClick={() => navigate('/criancas?tab=cadastrar')}>{t('common.register')}</Button>
                        )}
                    </Grid>
                </Paper>

                <Paper sx={{
                    mt: 3, p: 3, bgcolor: alpha(theme.palette.primary.main, 0.05),
                    borderLeft: '6px solid', borderRight: '1px solid', borderTop: '1px solid', borderBottom: '1px solid',
                    borderColor: alpha(theme.palette.info.dark, 1), borderRadius: 3,
                    display: { md: 'flex', xs: 'none' }, flexDirection: 'column', justifyContent: 'center'
                }}>
                    <Typography variant="h6" gutterBottom color="primary">{t('logbook.compass.title')}</Typography>
                    <Typography paragraph color="text.primary" variant="body2">{t('logbook.compass.intro')}</Typography>
                    <Typography variant="body2" component="div" sx={{ pl: 1, color: 'text.secondary' }}>
                        <ul style={{ paddingLeft: '20px', lineHeight: '1.8', margin: 0 }}>
                            <li><strong>{t('logbook.compass.tip1_title')}</strong> {t('logbook.compass.tip1_desc')}</li>
                            <li><strong>{t('logbook.compass.tip2_title')}</strong> {t('logbook.compass.tip2_desc')}</li>
                            <li><strong>{t('logbook.compass.tip3_title')}</strong> {t('logbook.compass.tip3_desc')}</li>
                        </ul>
                    </Typography>
                </Paper>
            </Grid>

            {/* GRADE DO CALENDÁRIO */}
            <Grid size={{ xs: 12, md: 8 }}>
                <Paper elevation={3} sx={{
                    p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), border: '1px solid',
                    borderColor: alpha(theme.palette.info.dark, 0.5), borderRadius: 3, maxWidth: 900,
                }}>
                    <Grid size={12}>
                        {renderCalendarGrid()}
                        <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ width: '100%', textAlign: 'center' }}>{t('logbook.day_mood')}</Typography>
                            <Chip size="small" icon={getHumorIcon(1, 16)} label={t('logbook.moods.1')} sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main', fontWeight: 'bold' }} />
                            <Chip size="small" icon={getHumorIcon(2, 16)} label={t('logbook.moods.2')} sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: 'warning.main', fontWeight: 'bold' }} />
                            <Chip size="small" icon={getHumorIcon(3, 16)} label={t('logbook.moods.3')} sx={{ bgcolor: alpha(theme.palette.text.primary, 0.05), color: 'text.secondary', fontWeight: 'bold' }} />
                            <Chip size="small" icon={getHumorIcon(4, 16)} label={t('logbook.moods.4')} sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main', fontWeight: 'bold' }} />
                            <Chip size="small" icon={getHumorIcon(5, 16)} label={t('logbook.moods.5')} sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'primary.main', fontWeight: 'bold' }} />
                        </Box>
                    </Grid>
                </Paper>
            </Grid>

            {/* MODAL HÍBRIDO (AGENDA + DIÁRIO COMPLETÃO) */}
            <Dialog fullScreen open={open} onClose={() => setOpen(false)} TransitionComponent={Transition}>
                {/* CABEÇALHO FIXO COM STICKY */}
                <AppBar sx={{ position: 'sticky', top: 0, zIndex: 1100 }}>
                    <Toolbar>
                        <IconButton edge="start" color="inherit" onClick={() => setOpen(false)}><CloseIcon /></IconButton>
                        <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                            {t('logbook.form.management')} {format(selectedDate, `dd/MM/yyyy`)} - {currentChildData?.nome}
                        </Typography>
                        {(!isFutureDate && isEditable) && (
                            <Button autoFocus color="inherit" onClick={handleSave} startIcon={<SaveIcon />}>{t('logbook.form.save')}</Button>
                        )}
                    </Toolbar>
                </AppBar>

                {/* CORPO DO MODAL ROLÁVEL */}
                <DialogContent sx={{ p: 0, bgcolor: 'background.default' }}>
                    {loadingForm ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 20 }}><CircularProgress /></Box>
                    ) : (
                        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: { xs: "100%", md: "80%" }, mx: 'auto', width: '100%' }}>
                            
                            {/* SEÇÃO 1: AGENDA DO DIA */}
                            <Paper sx={{ p: 3, mb: 4, border: '1px solid', borderColor: 'primary.light', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <EventIcon /> {t('logbook.form.schedule')}
                                    </Typography>
                                    <Button variant="outlined" size="small" startIcon={<AddCircleOutlineIcon />} onClick={() => setOpenAgendaModal(true)}>{t('visual_routine.add_task_btn')}</Button>
                                </Box>

                                {agendaDia.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>{t('logbook.form.no_schedule')}</Typography>
                                ) : (
                                    <List sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 1 }}>
                                        {agendaDia.map((item) => (
                                            <ListItem key={item.id} onClick={() => abrirEdicaoCompromisso(item)} sx={{ borderBottom: '1px solid #eee', cursor: 'pointer', opacity: item.status === 'cancelado' ? 0.6 : 1 }}>
                                                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: item.cor_hex || 'primary.main', mr: 2 }} />
                                                <ListItemText
                                                    primary={
                                                        <Typography fontWeight="bold" sx={{ textDecoration: item.status === 'cancelado' ? 'line-through' : 'none' }}>
                                                            {item.titulo} ({format(new Date(item.data_hora_inicio), 'HH:mm')})
                                                        </Typography>
                                                    }
                                                    secondary={
                                                        <React.Fragment>
                                                            {item.categoria_nome} - Status: <Chip size="small" label={item.status} color={item.status === 'concluido' ? 'success' : item.status === 'cancelado' ? 'error' : 'default'} sx={{ height: 20 }} />
                                                            {item.motivo_cancelamento && <Typography variant="caption" display="block" color="error">{t('logbook.form.reason')} {item.motivo_cancelamento}</Typography>}
                                                        </React.Fragment>
                                                    }
                                                />
                                                {item.status === 'agendado' && (
                                                    <ListItemSecondaryAction>
                                                        {!isFutureDate && (
                                                            <Tooltip title={t('logbook.form.finished') as string}><IconButton edge="end" color="success" onClick={() => atualizarStatusAgenda(item.id, 'concluido')}><CheckCircleIcon /></IconButton></Tooltip>
                                                        )}
                                                        <Tooltip title={t('logbook.form.justify') as string}><IconButton edge="end" color="error" onClick={() => abrirCancelamento(item.id)}><CancelIcon /></IconButton></Tooltip>
                                                        <Tooltip title={t('logbook.form.delete') as string}><IconButton edge="end" color="default" onClick={() => deletarAgenda(item.id)}><DeleteIcon /></IconButton></Tooltip>
                                                    </ListItemSecondaryAction>
                                                )}
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </Paper>

                            {/* SEÇÃO 2: DIÁRIO DE BORDO COMPLETO */}
                            {isFutureDate ? (
                                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                                    <InfoIcon color="info" sx={{ fontSize: 48, mb: 1 }} />
                                    <Typography variant="h6" color="info.main">{t('logbook.form.blocked')}</Typography>
                                    <Typography variant="body2" color="text.secondary">{t('logbook.form.blocked_text')}</Typography>
                                </Paper>
                            ) : (
                                <Box sx={{ opacity: isEditable ? 1 : 0.7, pointerEvents: isEditable ? 'auto' : 'none' }}>
                                    <Typography variant="h5" color="text.primary" sx={{ mb: 3, fontWeight: 'bold' }}>{t('logbook.form.report', { defaultValue: 'Diário de Bordo Detalhado' })}</Typography>
                                    
                                    <Paper sx={{ p: 3, mb: 4, textAlign: 'center', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                                        <FormControl component="fieldset" disabled={!isEditable}>
                                            <FormLabel component="legend" sx={{ mb: 2, typography: 'h6', color: 'text.primary' }}>{t('logbook.form.mood_question')}</FormLabel>
                                            <RadioGroup row name="humor_dia" value={formData.humor_dia.toString()} onChange={handleChange} sx={{ justifyContent: 'center', gap: { xs: 1, sm: 4 } }}>
                                                {[1, 2, 3, 4, 5].map((val) => (
                                                    <FormControlLabel key={val} value={val.toString()} control={<StyledRadio value={val.toString()} icon={getHumorIcon(val, 40)} />} label={<Typography variant="caption" sx={{ display: 'block', mt: 1 }}>{t(`logbook.moods.${val}`)}</Typography>} labelPlacement="bottom" sx={{ mx: 0 }} />
                                                ))}
                                            </RadioGroup>
                                        </FormControl>
                                    </Paper>

                                    <Grid container spacing={4}>
                                        {/* BLOCO 1: Rotina e Atividades */}
                                        <Grid size={{ xs: 12 }}>
                                            <Typography variant="h6" color="primary" sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 2 }}>{t('logbook.sections.routine', { defaultValue: 'Rotina e Atividades' })}</Typography>
                                            <Stack spacing={2}>
                                                <LimitedTextField fullWidth label={t('logbook.form.activities_general', { defaultValue: 'Atividades Gerais Realizadas' })} name="atividades_realizadas" value={formData.atividades_realizadas} onChange={handleChange} multiline rows={3} variant="outlined" disabled={!isEditable} />
                                                <LimitedTextField fullWidth label={t('logbook.form.pif_activities', { defaultValue: 'Atividades do PIF (Detalhe o tempo e os resultados)' })} name="atividades_pif" value={formData.atividades_pif} onChange={handleChange} multiline rows={2} disabled={!isEditable} />
                                                <LimitedTextField fullWidth label={t('logbook.form.key_moments', { defaultValue: 'Momentos Chave / Destaques do Dia' })} name="momentos_chave" value={formData.momentos_chave} onChange={handleChange} multiline rows={2} disabled={!isEditable} />
                                            </Stack>
                                        </Grid>

                                        {/* BLOCO 2: Bem-Estar e Sensorial */}
                                        <Grid size={{ xs: 12 }}>
                                            <Typography variant="h6" color="primary" sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 2 }}>{t('logbook.sections.wellbeing', { defaultValue: 'Bem-Estar Físico e Sensorial' })}</Typography>
                                            <Stack spacing={2}>
                                                <LimitedTextField fullWidth label={t('logbook.form.food', { defaultValue: 'Alimentação' })} name="alimentacao" value={formData.alimentacao} onChange={handleChange} multiline rows={2} disabled={!isEditable} />
                                                <LimitedTextField fullWidth label={t('logbook.form.sleep', { defaultValue: 'Sono' })} name="sono" value={formData.sono} onChange={handleChange} multiline rows={2} disabled={!isEditable} />
                                                <LimitedTextField fullWidth label={t('logbook.form.sensory', { defaultValue: 'Aspectos Sensoriais (Incômodos ou Buscas)' })} name="aspectos_sensoriais" value={formData.aspectos_sensoriais} onChange={handleChange} multiline rows={2} disabled={!isEditable} />
                                            </Stack>
                                        </Grid>

                                        {/* BLOCO 3: Comportamento e Regulação */}
                                        <Grid size={{ xs: 12 }}>
                                            <Typography variant="h6" color="primary" sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 2 }}>{t('logbook.sections.behavior', { defaultValue: 'Comportamento e Regulação' })}</Typography>
                                            <LimitedTextField fullWidth label={t('logbook.form.behavior_general', { defaultValue: 'Comportamento Geral' })} name="comportamento_geral" value={formData.comportamento_geral} onChange={handleChange} multiline rows={3} disabled={!isEditable} />
                                            
                                            <Paper sx={{ p: 3, mt: 3, bgcolor: alpha(theme.palette.error.main, 0.05), border: '1px dashed', borderColor: 'error.main' }}>
                                                <FormControlLabel control={<Checkbox checked={formData.teve_crise} onChange={handleChange} name="teve_crise" color="error" disabled={!isEditable} />} label={t('logbook.form.crisis_question') as string} sx={{ color: 'error.main', fontWeight: 'bold' }} />
                                                {formData.teve_crise && (
                                                    <Stack spacing={2} sx={{ mt: 2 }}>
                                                        <LimitedTextField fullWidth label={t('logbook.form.crisis_before', { defaultValue: 'O que aconteceu antes da crise? (Gatilhos)' })} name="crise_antes" value={formData.crise_antes} onChange={handleChange} multiline rows={2} color="error" sx={{ bgcolor: 'background.paper' }} disabled={!isEditable} />
                                                        <LimitedTextField fullWidth label={t('logbook.form.crisis_during', { defaultValue: 'O que aconteceu durante a crise? (Comportamento)' })} name="crise_durante" value={formData.crise_durante} onChange={handleChange} multiline rows={2} color="error" sx={{ bgcolor: 'background.paper' }} disabled={!isEditable} />
                                                        <LimitedTextField fullWidth label={t('logbook.form.crisis_after', { defaultValue: 'Como a criança ficou depois da crise?' })} name="crise_depois" value={formData.crise_depois} onChange={handleChange} multiline rows={2} color="error" sx={{ bgcolor: 'background.paper' }} disabled={!isEditable} />
                                                        <LimitedTextField fullWidth label={t('logbook.form.crisis_time', { defaultValue: 'Qual foi a duração aproximada?' })} limit={100} name="crise_tempo" value={formData.crise_tempo} onChange={handleChange} color="error" sx={{ bgcolor: 'background.paper' }} disabled={!isEditable} />
                                                    </Stack>
                                                )}
                                            </Paper>
                                        </Grid>

                                        {/* BLOCO 4: Desenvolvimento e Interação */}
                                        <Grid size={{ xs: 12 }}>
                                            <Typography variant="h6" color="primary" sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 2 }}>{t('logbook.sections.development', { defaultValue: 'Desenvolvimento e Interação' })}</Typography>
                                            <Stack spacing={2}>
                                                <LimitedTextField fullWidth label={t('logbook.form.communication', { defaultValue: 'Comunicação' })} name="comunicacao" value={formData.comunicacao} onChange={handleChange} multiline rows={2} disabled={!isEditable} />
                                                <LimitedTextField fullWidth label={t('logbook.form.socialization', { defaultValue: 'Socialização' })} name="socializacao" value={formData.socializacao} onChange={handleChange} multiline rows={2} disabled={!isEditable} />
                                                <LimitedTextField fullWidth label={t('logbook.form.motor_skills', { defaultValue: 'Habilidades Motoras' })} name="habilidades_motoras" value={formData.habilidades_motoras} onChange={handleChange} multiline rows={2} disabled={!isEditable} />
                                                <LimitedTextField fullWidth label={t('logbook.form.cognitive_skills', { defaultValue: 'Habilidades Cognitivas' })} name="habilidades_cognitivas" value={formData.habilidades_cognitivas} onChange={handleChange} multiline rows={2} disabled={!isEditable} />
                                                <LimitedTextField fullWidth label={t('logbook.form.adaptive_skills', { defaultValue: 'Habilidades Adaptativas / AVDs' })} name="habilidades_adaptativas" value={formData.habilidades_adaptativas} onChange={handleChange} multiline rows={2} disabled={!isEditable} />
                                            </Stack>
                                        </Grid>

                                        {/* BLOCO 5: Recursos e Suportes Utilizados */}
                                        <Grid size={{ xs: 12 }}>
                                            <Typography variant="h6" color="primary" sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 1, mb: 2 }}>{t('logbook.sections.resources', { defaultValue: 'Recursos e Suportes Utilizados' })}</Typography>
                                            <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                                                <FormGroup row>
                                                    {recursosOpcoes.map(recurso => (
                                                        <FormControlLabel
                                                            key={recurso}
                                                            control={<Checkbox checked={formData.uso_recursos.includes(recurso)} onChange={() => handleRecursosChange(recurso)} disabled={!isEditable} color="primary" />}
                                                            label={recurso}
                                                            sx={{ width: { xs: '100%', sm: '48%', md: '30%' } }}
                                                        />
                                                    ))}
                                                </FormGroup>
                                            </Paper>
                                        </Grid>
                                    </Grid>
                                </Box>
                            )}
                            <Box sx={{ height: 100 }} />
                        </Box>
                    )}
                </DialogContent>
            </Dialog>

            {/* MODAIS DA AGENDA */}
            <Dialog open={openAgendaModal} onClose={() => setOpenAgendaModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{t('logbook.form.new_schedule')} ({format(selectedDate, 'dd/MM')})</DialogTitle>
                <DialogContent dividers>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>{t('logbook.form.category')}</InputLabel>
                        <Select value={agendaForm.categoria_id} label={t('logbook.form.category')} onChange={(e: SelectChangeEvent<any>) => setAgendaForm({ ...agendaForm, categoria_id: e.target.value })}>
                            {categorias.map(cat => <MenuItem key={cat.id} value={cat.id}>{cat.nome}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField fullWidth label={t('logbook.form.title')} margin="normal" value={agendaForm.titulo} onChange={(e) => setAgendaForm({ ...agendaForm, titulo: e.target.value })} />
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}><TextField fullWidth type="time" label={t('home') as string} margin="normal" slotProps={{ inputLabel: { shrink: true } }} value={agendaForm.hora_inicio} onChange={(e) => setAgendaForm({ ...agendaForm, hora_inicio: e.target.value })} /></Grid>
                        <Grid size={{ xs: 6 }}><TextField fullWidth type="time" label={t('logbook.form.end') as string} margin="normal" slotProps={{ inputLabel: { shrink: true } }} value={agendaForm.hora_fim} onChange={(e) => setAgendaForm({ ...agendaForm, hora_fim: e.target.value })} /></Grid>
                    </Grid>
                    <Divider sx={{ my: 2 }} />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>{t('logbook.form.repeat')}</InputLabel>
                        <Select value={agendaForm.periodicidade} label={t('logbook.form.repeat')} onChange={(e: SelectChangeEvent<string>) => setAgendaForm({ ...agendaForm, periodicidade: e.target.value })}>
                            <MenuItem value="unico">{t('logbook.form.unique')}</MenuItem>
                            <MenuItem value="semanal">{t('logbook.form.weekly')}</MenuItem>
                            <MenuItem value="quinzenal">{t('logbook.form.quinze')}</MenuItem>
                            <MenuItem value="mensal">Mensalmente</MenuItem>
                        </Select>
                    </FormControl>
                    {agendaForm.periodicidade !== 'unico' && (
                        <TextField fullWidth type="date" label="Repetir até quando?" margin="normal" slotProps={{ inputLabel: { shrink: true } }} value={agendaForm.data_fim_recorrencia} onChange={(e) => setAgendaForm({ ...agendaForm, data_fim_recorrencia: e.target.value })} />
                    )}
                    <TextField fullWidth label="Anotações / Orientações (Opcional)" margin="normal" multiline rows={2} value={agendaForm.anotacoes} onChange={(e) => setAgendaForm({ ...agendaForm, anotacoes: e.target.value })} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAgendaModal(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={salvarAgenda} disabled={!agendaForm.categoria_id || !agendaForm.titulo}>Salvar Evento</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={cancelModalOpen} onClose={() => setCancelModalOpen(false)}>
                <DialogTitle color="error">Cancelar Compromisso</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>Por favor, informe o motivo do cancelamento para o Agente sugerir compensações.</DialogContentText>
                    <TextField fullWidth autoFocus label="Motivo" multiline rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCancelModalOpen(false)}>Voltar</Button>
                    <Button variant="contained" color="error" onClick={() => atualizarStatusAgenda(cancelAgendaId, 'cancelado', cancelReason)} disabled={!cancelReason.trim()}>
                        Confirmar Cancelamento
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={lockAlertOpen} onClose={() => setLockAlertOpen(false)}>
                <DialogTitle sx={{ color: 'warning.main' }}><WarningAmberIcon /> {t('logbook.alerts.locked_title')}</DialogTitle>
                <DialogContent><DialogContentText>{t('logbook.alerts.locked_text')}</DialogContentText></DialogContent>
                <DialogActions><Button onClick={() => setLockAlertOpen(false)} autoFocus>{t('logbook.alerts.understood_btn')}</Button></DialogActions>
            </Dialog>
        </Grid>
    );
}
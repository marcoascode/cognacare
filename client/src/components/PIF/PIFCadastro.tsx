import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  Box,
  Stepper,
  Step,
  StepButton,
  Button,
  Typography,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Grid,
  Fade,
  Chip,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  FormLabel,
  TextField,
  LinearProgress,
  SelectChangeEvent
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelIcon from '@mui/icons-material/Cancel';
import RestoreIcon from '@mui/icons-material/Restore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import api from '../../api/axiosConfig';
import { pifSteps, pifDetailedDataMap, pifSimpleData } from './data/PIFCadastroData';
import FormStep from './data/FormStep';
import { useTranslation, Trans } from 'react-i18next';
import { ICrianca } from '../../../../Shared';

// --- FUNÇÕES AUXILIARES ---
const formatDate = (dateString: string | Date | null): string => {
  if (!dateString) return '';
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' };
  return new Date(dateString).toLocaleDateString('pt-BR', options);
};

const calcularIdadeTexto = (dataNascimento: string | Date | null, t: any): string => {
  if (!dataNascimento) return '';
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let anos = hoje.getFullYear() - nascimento.getFullYear();
  let meses = hoje.getMonth() - nascimento.getMonth();
  if (meses < 0 || (meses === 0 && hoje.getDate() < nascimento.getDate())) {
    anos--; meses += 12;
  }
  if (hoje.getDate() < nascimento.getDate()) {
    meses--; if (meses < 0) { meses += 12; anos--; }
  }
  return `${anos} ${t('common.years')}${meses > 0 ? ` ${t('common.and')} ${meses} ${t('common.months')}` : ''}`;
}

const CountdownTimer: React.FC<{ targetDate: Date | null }> = ({ targetDate }) => {
  const { t } = useTranslation();

  const calculateTimeLeft = () => {
    if (!targetDate) return {};
    const difference = +new Date(targetDate) - +new Date();
    let timeLeft: { dias?: number; horas?: number } = {};
    if (difference > 0) {
      timeLeft = {
        dias: Math.floor(difference / (1000 * 60 * 60 * 24)),
        horas: Math.floor((difference / (1000 * 60 * 60)) % 24),
      };
    }
    return timeLeft;
  };
  
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  
  useEffect(() => {
    const timer = setTimeout(() => { setTimeLeft(calculateTimeLeft()); }, 1000 * 60 * 60);
    return () => clearTimeout(timer);
  });

  return (<span> {timeLeft.dias || 0} {t('common.days')} {t('common.and')} {timeLeft.horas || 0} {t('common.hours')} </span>);
};

// Função para verificar se a etapa já tem algum dado preenchido
const hasDataInStep = (stepKey: string, currentFormData: Record<string, any>): boolean => {
  if (!currentFormData) return false;

  const data = currentFormData[stepKey];
  if (!data) return false;

  // Se for o step de disponibilidade, checa o campo específico
  if (stepKey === 'disponibilidade') {
    return !!data.tem_tempo;
  }

  // Para os demais, verifica se há algum valor true (checkbox) ou texto preenchido
  return Object.values(data).some(val => val === true || (typeof val === 'string' && val.trim().length > 0));
};

interface PIFCadastroProps {
  totalCreditos: number | null;
}

export default function PIFCadastro({ totalCreditos }: PIFCadastroProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const formRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Estados de Interface e Controle
  const [newPifId, setNewPifId] = useState<number | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState<boolean>(false);
  const [copyNotificationOpen, setCopyNotificationOpen] = useState<boolean>(false);
  const [isWaitingDialogOpen, setIsWaitingDialogOpen] = useState<boolean>(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState<boolean>(false);
  const [isPifLocked, setIsPifLocked] = useState<boolean>(false);
  const [nextPifDate, setNextPifDate] = useState<Date | null>(null);
  const [instructionModalOpen, setInstructionModalOpen] = useState<boolean>(false);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  // Estados de Dados do Formulário
  const [activeStep, setActiveStep] = useState<number>(0);
  const [criancas, setCriancas] = useState<ICrianca[]>([]);
  const [selectedCriancaId, setSelectedCriancaId] = useState<string | number>('');
  const [childDetails, setChildDetails] = useState<ICrianca | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [draftRestored, setDraftRestored] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSavingStep, setIsSavingStep] = useState<boolean>(false);
  const [grokResponse, setGrokResponse] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Texto de Instrução
  const text = t('pif_form.instruction_text') as string;

  // LISTA DE ETAPAS ATUALIZADA (Incluindo Disponibilidade no início)
  const stepsList = useMemo(() => [t('pif_steps.available'), ...pifSteps], [t]);

  // Cálculo de Progresso (UX Improvement)
  const completedStepsCount = useMemo(() => {
    return stepsList.filter((label, index) => {
      const key = index === 0 ? 'disponibilidade' : label;
      return hasDataInStep(key, formData);
    }).length;
  }, [formData, stepsList]);

  const progressPercentage = stepsList ? (completedStepsCount / stepsList.length) * 100 : 0;

  // --- EFEITOS (Data Loading e Setup) ---

  useEffect(() => {
    const instructionSeen = localStorage.getItem('pif_instruction_seen');
    if (instructionSeen !== 'true') {
      setInstructionModalOpen(true);
    }
  }, []);

  const handleCloseInstructionModal = () => {
    if (dontShowAgain) {
      localStorage.setItem('pif_instruction_seen', 'true');
    }
    setInstructionModalOpen(false);
  };

  const handleOpenInstructionModal = () => {
    setInstructionModalOpen(true);
    setDontShowAgain(false);
  };

  useEffect(() => {
    const fetchUserCriancas = async () => {
      try {
        const response = await api.get('/fernandasepe/criancas');
        setCriancas(response.data);
      } catch (err) {
        console.error("Erro ao buscar crianças:", err);
        setError(t('pif_form.errors.load_children'));
      }
    };
    fetchUserCriancas();
  }, [t]);

  useEffect(() => {
    if (criancas.length > 0) {
      const preselectedId = searchParams.get('id_crianca');
      if (preselectedId && criancas.some(c => c.id_crianca === Number(preselectedId))) {
        setSelectedCriancaId(preselectedId);
        searchParams.delete('id_crianca');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [criancas, searchParams, setSearchParams]);

  useEffect(() => {
    const initializeForm = () => {
      const initialState: Record<string, any> = {
        disponibilidade: {
          tem_tempo: 'Sim',
          dias_semana: 1,
          horas_dia: 1,
          periodo_dia: 'Manhã'
        }
      };

      pifSteps.forEach(step => {
        initialState[step] = {};
        const detailedData = (pifDetailedDataMap as any)[step];
        const simpleData = (pifSimpleData as any)[step];

        if (detailedData) {
          const firstItem = detailedData[0];
          if (firstItem && firstItem.isAVD) {
            detailedData.forEach((group: any) => {
              group.questions.forEach((q: any) => {
                q.options.forEach((opt: any) => {
                  initialState[step][opt.value] = false;
                });
              });
            });
          } else if (firstItem && (firstItem.level || firstItem.milestone)) {
            const arr = firstItem.level ? detailedData.flatMap((n: any) => n.questions) : detailedData.flatMap((g: any) => g.abilities);
            arr.forEach((i: any) => initialState[step][i] = false);
          }
        } else if (simpleData) {
          simpleData.forEach((item: string) => initialState[step][item] = false);
        }
      });
      return initialState;
    };

    if (!selectedCriancaId) {
      setChildDetails(null);
      setFormData({});
      setIsPifLocked(false);
      setDraftRestored(false);
      setActiveStep(0);
      return;
    }

    const currentChild = criancas.find(c => c.id_crianca === Number(selectedCriancaId));
    if (currentChild) setChildDetails(currentChild);

    const loadData = async () => {
      setIsLoading(true);
      setError('');
      setIsPifLocked(false);
      setDraftRestored(false);

      try {
        const draftResponse = await api.get(`/fernandasepe/plano-familiar/rascunho/${selectedCriancaId}`);

        if (draftResponse.data.rascunho) {
          const baseForm = initializeForm();
          const loadedData = typeof draftResponse.data.rascunho.dados_formulario === 'string'
            ? JSON.parse(draftResponse.data.rascunho.dados_formulario)
            : draftResponse.data.rascunho.dados_formulario;

          const mergedData = { ...baseForm, ...loadedData };
          setFormData(mergedData);
          setDraftRestored(true);

          let lastFilledStepIndex = 0;
          for (let i = 0; i < stepsList.length; i++) {
            const stepKey = i === 0 ? 'disponibilidade' : stepsList[i];
            if (i > 0 && hasDataInStep(stepKey, mergedData)) {
              lastFilledStepIndex = i;
            }
          }
          setActiveStep(lastFilledStepIndex);

        } else {
          try {
            const response = await api.get(`/fernandasepe/plano-familiar/ultimo/${selectedCriancaId}`);
            const ultimoPif = response.data;
            const dataCriacao = new Date(ultimoPif.criado_em);
            const dataLimite = new Date(dataCriacao);
            dataLimite.setDate(dataLimite.getDate() + 30);
            const hoje = new Date();

            if (hoje < dataLimite) {
              setIsPifLocked(true);
              setNextPifDate(dataLimite);
              setFormData({});
            } else {
              const baseForm = initializeForm();
              const oldData = typeof ultimoPif.dados_formulario === 'string'
                ? JSON.parse(ultimoPif.dados_formulario)
                : ultimoPif.dados_formulario;

              setFormData({ ...baseForm, ...oldData });
              setActiveStep(0);
            }
          } catch (err: any) {
            if (err.response && err.response.status === 404) {
              setIsPifLocked(false);
              setFormData(initializeForm());
              setActiveStep(0);
            } else {
              throw err;
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError(t('pif_form.errors.load_data'));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedCriancaId, criancas, t, stepsList]);

  // --- HANDLERS DE AÇÃO ---

  const handleNavigateToLista = () => {
    if (childDetails) {
      navigate('/pif/registros', { state: { prefilledFilter: childDetails.nome } });
    }
  };

  const formattedDiagnosticos = useMemo(() => {
    if (!childDetails?.diagnostico) return 'N/A';
    const diagnosticosRaw = Array.isArray(childDetails.diagnostico) ? childDetails.diagnostico : [];
    const diagnosticosLimpas = diagnosticosRaw.map(d => d.startsWith('Outro: ') ? d.substring(7).trim() : d).filter(d => d && d.toLowerCase() !== 'especifique outro(s)');
    if (diagnosticosLimpas.length === 0) return t('pif_form.not_informed');
    if (diagnosticosLimpas.length === 1) return diagnosticosLimpas[0];
    const ultimo = diagnosticosLimpas.pop();
    return diagnosticosLimpas.join(', ') + ` ${t('common.and')} ` + ultimo;
  }, [childDetails, t]);

  const handleStep = (stepIndex: number) => async () => {
    if (isSavingStep) return;
    setIsSavingStep(true);
    try {
      if (selectedCriancaId) {
        await api.post('/fernandasepe/plano-familiar/rascunho', {
          id_crianca: selectedCriancaId,
          dados_formulario: formData
        });
      }
      setActiveStep(stepIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.log(e);
      setError(t('pif_steps.error'));
    } finally {
      setIsSavingStep(false);
    }
  };

  const handleNext = () => handleStep(activeStep + 1)();
  const handleBack = () => setActiveStep(prev => prev - 1);

  const handleConfirmGeneratePif = async () => {
    setIsConfirmDialogOpen(false);
    setIsLoading(true);
    setIsWaitingDialogOpen(true);
    setGrokResponse('');
    setNewPifId(null);

    try {
      await api.post('/fernandasepe/plano-familiar/rascunho', {
        id_crianca: selectedCriancaId,
        dados_formulario: formData
      });
    } catch (e) { console.error(e); }

    try {
      const payload = {
        id_crianca: selectedCriancaId,
        dados_formulario: formData,
        dados_crianca: childDetails
      };

      const response = await api.post('/fernandasepe/plano-familiar', payload, {
        timeout: 600000
      });

      setGrokResponse(response.data.pifGrok);
      setNewPifId(response.data.newPifId);
      setIsSuccessDialogOpen(true);
      formRef.current?.scrollIntoView({ behavior: 'smooth' });

    } catch (err: any) {
      console.error("Erro na requisição do PIF:", err);

      const isTimeout =
        err.code === 'ECONNABORTED' ||
        [502, 503, 504, 524].includes(err.response?.status) ||
        (err.message && err.message.toLowerCase().includes('timeout')) ||
        (err.message && err.message.toLowerCase().includes('network error'));

      if (isTimeout) {
        setIsWaitingDialogOpen(false);
        setIsSuccessDialogOpen(true);
        setGrokResponse(t('pif_form.timeout_message') as string);
        setError('');
      } else {
        setIsWaitingDialogOpen(false);
        setError(err.response?.data?.erro || t('pif_form.errors.generate_pif'));
      }
    } finally {
      setIsLoading(false);
      setIsWaitingDialogOpen(false);
    }
  };

  const handleCopy = () => { 
    navigator.clipboard.writeText(grokResponse).then(() => setCopyNotificationOpen(true)).catch(err => { 
      console.error(err); 
      setError(t('pif_form.errors.copy')); 
    }); 
  };
  
  const handleDownload = async () => {
    if (!newPifId) return;
    try {
      const response = await api.get(`/fernandasepe/plano-familiar/download/${newPifId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a'); 
      link.href = url; 
      link.setAttribute('download', `PIF_download_${newPifId}.pdf`); 
      document.body.appendChild(link); 
      link.click(); 
      link.remove(); 
      window.URL.revokeObjectURL(url);
    } catch (err) { 
      console.error(err); 
      setError(t('pif_form.errors.download')); 
    }
  };

  const handleCheckboxChange = (step: string, item: string) => setFormData(prev => ({ ...prev, [step]: { ...prev[step], [item]: !prev[step][item] } }));
  const handleRadioChange = (step: string, question: string, value: string) => setFormData(prev => ({ ...prev, [step]: { ...prev[step], [question]: value } }));

  const handleAvailabilityChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      disponibilidade: {
        ...prev.disponibilidade,
        [field]: value
      }
    }));
  };

  const handleOpenConfirmDialog = () => {
    setError('');
    if (totalCreditos === null || totalCreditos <= 0) {
      setError('insufficient_credits');
      return;
    }
    setIsConfirmDialogOpen(true);
  };

  // --- RENDERIZAÇÃO DO CONTEÚDO DA ETAPA ---
  const renderStepContent = (stepIndex: number) => {
    if (stepIndex === 0) {
      const dispData = formData.disponibilidade || { tem_tempo: 'Sim', dias_semana: 1, horas_dia: 1, periodo_dia: 'Manhã' };

      return (
        <Box sx={{ mt: 2, p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
          <Typography variant="h6" gutterBottom color="primary">
            {t('pif_form.caregiver_disp')}
          </Typography>

          <FormControl component="fieldset" sx={{ width: '100%', mb: 3 }}>
            <FormLabel component="legend" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 2 }}>
              {t('pif_form.caregiver_time')}
            </FormLabel>
            <RadioGroup
              row
              value={dispData.tem_tempo}
              onChange={(e) => handleAvailabilityChange('tem_tempo', e.target.value)}
            >
              <FormControlLabel value="Sim" control={<Radio />} label={t('common.yes')} sx={{ mr: 4 }} />
              <FormControlLabel value="Não" control={<Radio />} label={t('common.no')} />
            </RadioGroup>
          </FormControl>

          <Fade in={true}>
            <Grid container spacing={3} sx={{ mt: 1, p: 2, bgcolor: alpha(theme.palette.warning.main, 0.05), borderRadius: 2 }}>

              {dispData.tem_tempo === 'Não' && (
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {t('pif_form.how_many_days')}
                  </Typography>
                  <TextField
                    type="number"
                    value={dispData.dias_semana}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (val >= 1 && val <= 7) handleAvailabilityChange('dias_semana', val);
                    }}
                    inputProps={{ min: 1, max: 7 }}
                    fullWidth
                    size="small"
                    helperText={t('pif_form.min_max_days')}
                  />
                </Grid>
              )}

              <Grid size={{ xs: 12, md: dispData.tem_tempo === 'Não' ? 4 : 6 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {dispData.tem_tempo === 'Não' ? '3.' : '2.'} {t('pif_form.how_many_hours')}
                </Typography>

                <FormControl fullWidth size="small">
                  <Select
                    value={dispData.horas_dia}
                    onChange={(e: SelectChangeEvent<any>) => handleAvailabilityChange('horas_dia', e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value={0.5}>{t('pif_form.30_min')}</MenuItem>
                    <MenuItem value={1}>{t('pif_form.1hour')}</MenuItem>
                    <MenuItem value={1.5}>{t('pif_form.1hour30min')}</MenuItem>
                    <MenuItem value={2}>{t('pif_form.2hours')}</MenuItem>
                    <MenuItem value={2.5}>{t('pif_form.2hours30min')}</MenuItem>
                    <MenuItem value={3}>{t('pif_form.3hours')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: dispData.tem_tempo === 'Não' ? 4 : 6 }}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {dispData.tem_tempo === 'Não' ? '4.' : '3.'} {t('pif_form.availability.period_question')}
                </Typography>

                <FormControl fullWidth size="small">
                  <Select
                    value={dispData.periodo_dia || 'Manhã'}
                    onChange={(e: SelectChangeEvent<any>) => handleAvailabilityChange('periodo_dia', e.target.value)}
                    displayEmpty
                  >
                    <MenuItem value="Manhã">{t('pif_form.morning')}</MenuItem>
                    <MenuItem value="Tarde">{t('pif_form.evening')}</MenuItem>
                    <MenuItem value="Noite">{t('pif_form.night')}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

            </Grid>
          </Fade>
        </Box>
      );
    }

    const originalStepIndex = stepIndex - 1;
    const stepKey = pifSteps[originalStepIndex];

    return (
      <FormStep
        {...{
          stepTitle: stepKey,
          items: (pifDetailedDataMap as any)[stepKey] || (pifSimpleData as any)[stepKey] || [],
          formData: formData[stepKey] || {},
          handleCheckboxChange,
          handleRadioChange
        } as any}
      />
    );
  };

  if (grokResponse) {
    return (
      <>
        <Paper elevation={3} sx={{ p: {xs:2, sm:3}, mt: {xs:1, sm:2} }}>
          <Typography variant="h5" gutterBottom>{t('pif_form.success_title')}</Typography>
          <Box sx={{
            whiteSpace: 'pre-wrap',
            color: 'text.primary',
            bgcolor: alpha(theme.palette.background.default, 0.5),
            p: 2,
            borderRadius: 1,
            maxHeight: '70vh',
            overflowY: 'auto',
            border: `1px solid ${theme.palette.divider}`
          }}>
            <ReactMarkdown>{grokResponse}</ReactMarkdown>
          </Box>
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button onClick={handleCopy} variant="outlined" startIcon={<ContentCopyIcon />}> {t('pif_form.copy_text')} </Button>
            <Button onClick={handleDownload} variant="outlined" startIcon={<DownloadIcon />} disabled={!newPifId}> {t('pif_form.download_pdf')} </Button>
            <Button onClick={() => { setGrokResponse(''); setSelectedCriancaId(''); setActiveStep(0); }} variant="contained" sx={{ ml: 'auto' }}> {t('pif_form.new_plan')} </Button>
          </Box>
        </Paper>
        <Dialog open={isSuccessDialogOpen} onClose={() => setIsSuccessDialogOpen(false)}>
          <DialogTitle>{t('pif_form.dialogs.success_title')}</DialogTitle>
          <DialogContent><DialogContentText>{t('pif_form.dialogs.success_text')}</DialogContentText></DialogContent>
          <DialogActions><Button onClick={() => setIsSuccessDialogOpen(false)} variant="contained" autoFocus>{t('common.ok')}</Button></DialogActions>
        </Dialog>
        <Snackbar open={copyNotificationOpen} autoHideDuration={3000} onClose={() => setCopyNotificationOpen(false)} message={t('pif_form.snackbars.copied')} />
      </>
    );
  }

  return (
    <Paper ref={formRef} elevation={3} sx={{ p: {xs:1, sm:2} }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h5">{t('pif_form.main_title')}</Typography>
          <Chip
            label={`${totalCreditos || 0} ${t('pif_form.credits')}`}
            color={(totalCreditos || 0) > 0 ? "success" : "error"}
            variant="outlined"
            size="small"
            sx={{ fontWeight: 'bold' }}
          />
        </Box>
        {draftRestored && (
          <Fade in={true}>
            <Chip
              icon={<RestoreIcon />}
              label={t('pif_form.draft_restored') || "Rascunho recuperado"}
              color="primary"
              variant="outlined"
              size="small"
            />
          </Fade>
        )}
      </Box>

      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel id="select-crianca-label">{t('pif_form.select_child')}</InputLabel>
        <Select 
          labelId="select-crianca-label" 
          value={selectedCriancaId} 
          label={t('pif_form.select_child')} 
          onChange={(e: SelectChangeEvent<any>) => setSelectedCriancaId(e.target.value)}
        >
          {criancas.map(c => <MenuItem key={c.id_crianca} value={c.id_crianca}>{c.nome}</MenuItem>)}
        </Select>
      </FormControl>

      {/* Barra de Progresso UX */}
      <Box sx={{ mb: 4, mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" fontWeight="bold">{t('pif_steps.progress')}</Typography>
          <Typography variant="caption" fontWeight="bold">{Math.round(progressPercentage)}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={progressPercentage} sx={{ height: 8, borderRadius: 5 }} />
      </Box>

      {childDetails && (
        <Paper elevation={3} sx={{
          p: 2,
          mt: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          border: `1px solid ${theme.palette.divider}`
        }}>
          <Typography variant="h6" gutterBottom color="text.primary">{t('pif_form.child_details', { name: childDetails.nome })}</Typography>
          <Grid container spacing={1}>
            <Grid size={{ xs: 12, md: 6 }}><Typography color="text.primary"><b>{t('pif_form.labels.name')}:</b> {childDetails.nome}</Typography></Grid>
            <Grid size={{ xs: 12, md: 6 }}><Typography color="text.primary"><b>{t('pif_form.labels.birth')}:</b>{` ${formatDate(childDetails.idade)} (${calcularIdadeTexto(childDetails.idade, t)})`}</Typography></Grid>
            <Grid size={{ xs: 12, md: 6 }}><Typography color="text.primary"><b>{t('pif_form.labels.communication')}:</b> {childDetails.tipo_fala}</Typography></Grid>
            <Grid size={{ xs: 12, md: 4 }}><Typography color="text.primary"><b>{t('pif_form.labels.caregiver')}:</b> {childDetails.cuidador_principal}</Typography></Grid>
            <Grid size={{ xs: 12 }}><Typography color="text.primary"><b>{t('pif_form.labels.diagnosis')}:</b> {formattedDiagnosticos}</Typography></Grid>
            <Grid size={{ xs: 12 }}><Typography color="text.primary"><b>{t('pif_form.labels.hyperfocus')}:</b> {childDetails.hiperfoco}</Typography></Grid>
            <Grid size={{ xs: 12 }}><Typography color="text.primary"><b>{t('pif_form.labels.difficulty')}:</b> {childDetails.dificuldade_cuidador}</Typography></Grid>
            <Grid size={{ xs: 12 }}><Typography color="text.primary"><b>{t('pif_form.labels.priority')}:</b> {childDetails.prioridade_desenvolvimento}</Typography></Grid>
          </Grid>
        </Paper>
      )}

      {selectedCriancaId && !isLoading && (
        isPifLocked ? (
          <Paper variant="outlined" sx={{
            p: 3,
            mt: 3,
            textAlign: 'center',
            bgcolor: alpha(theme.palette.warning.main, 0.1),
            borderColor: 'warning.main'
          }}>
            <AccessTimeIcon sx={{ fontSize: 40, color: 'warning.main' }} />
            <Typography variant="h6" sx={{ mt: 1, color: 'text.primary' }}>{t('pif_form.locked.next_available')}</Typography>
            <Typography variant="h5" color="warning.main" sx={{ my: 1 }}><CountdownTimer targetDate={nextPifDate} /></Typography>
            <Typography sx={{ mb: 2, color: 'text.secondary' }}>{t('pif_form.locked.wait_message')}</Typography>
            <Button variant="contained" onClick={handleNavigateToLista}>{t('pif_form.locked.view_previous')}</Button>
          </Paper>
        ) : (
          <Box sx={{ width: '100%', mt: 2 }}>

            {/* Botão de Ajuda */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Button
                startIcon={<HelpOutlineIcon />}
                onClick={handleOpenInstructionModal}
                size="small"
                sx={{ textTransform: 'none' }}
              >
                {t('pif_form.how_to_fill') || "Como preencher?"}
              </Button>
            </Box>

            <Box sx={{
              overflowX: 'auto',
              pb: 2,
              mb: 4,
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 3 }
            }}>
              <Stepper
                nonLinear
                activeStep={activeStep}
                sx={{
                  p: 1,
                  bgcolor: alpha(theme.palette.info.dark, 0.1),
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 5,
                  minWidth: 'max-content'
                }}
              >
                {stepsList.map((label, index) => {
                  const stepKey = index === 0 ? 'disponibilidade' : label;
                  const completed = hasDataInStep(stepKey, formData);

                  return (
                    <Step key={label} completed={completed}>
                      <StepButton color="inherit" onClick={handleStep(index)}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: (completed || activeStep === index) ? 'bold' : 'normal',
                            color: activeStep === index ? 'primary.main' : 'inherit',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {t(label) || label}
                        </Typography>
                      </StepButton>
                    </Step>
                  );
                })}
              </Stepper>
            </Box>

            {/* Conteúdo do Formulário */}
            <Box sx={{ mt: 3, mb: 1 }}>

              {renderStepContent(activeStep)}

              <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
                <Button color="inherit" disabled={activeStep === 0 || isSavingStep} onClick={handleBack} sx={{ mr: 1 }}> {t('pif_form.back')} </Button>
                <Box sx={{ flex: '1 1 auto' }} />

                {activeStep === stepsList.length - 1 ? (
                  <Button onClick={handleOpenConfirmDialog} variant="contained" color="primary" disabled={isLoading || isSavingStep}>
                    {isLoading ? t('pif_form.producing') : t('pif_form.generate_button')}
                  </Button>
                ) : (
                  <Button onClick={handleNext} variant="contained" disabled={isSavingStep}>
                    {isSavingStep ? (
                      <>
                        <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                        {t('pif_form.saving_step') || 'Salvando...'}
                      </>
                    ) : t('pif_form.next')}
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        )
      )}

      {isLoading && !isWaitingDialogOpen && <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
          {error === 'insufficient_credits' ? (
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              {t('pif_form.errors.insufficient_credits')}
              <Button
                color="primary"
                size="small"
                sx={{ textDecoration: 'underline', fontWeight: 'bold', p: 0, minWidth: 'auto' }}
                onClick={() => navigate('/financeiro?tab=creditos')}
              >
                Comprar agora
              </Button>
            </Box>
          ) : (
            error
          )}
        </Alert>
      )}

      {/* DIALOGS DE CARREGAMENTO E CONFIRMAÇÃO */}
      <Dialog open={isWaitingDialogOpen} aria-labelledby="waiting-dialog-title" aria-describedby="waiting-dialog-description">
        <DialogTitle id="waiting-dialog-title">{t('pif_form.dialogs.generating_title')}</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', p: 3 }}>
          <CircularProgress size={50} />
          <DialogContentText id="waiting-dialog-description" sx={{ mt: 2 }}>{t('pif_form.dialogs.generating_text')}</DialogContentText>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmDialogOpen} onClose={() => setIsConfirmDialogOpen(false)}>
        <DialogTitle>{t('pif_form.dialogs.confirm_title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('pif_form.dialogs.confirm_text_1')} <strong>{childDetails?.nome || t('pif_form.dialogs.selected_child')}</strong>.<br /><br />
            <Trans i18nKey="pif_form.dialogs.confirm_text_2" components={{ strong: <strong /> }} /><br /><br />
            {t('pif_form.dialogs.confirm_text_3')}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsConfirmDialogOpen(false)} variant="outlined" startIcon={<CancelIcon />} color="error"> {t('common.cancel')} </Button>
          <Button onClick={handleConfirmGeneratePif} variant="contained" startIcon={<CheckCircleOutlineIcon />} autoFocus disabled={isLoading}> {t('pif_form.dialogs.confirm_button')} </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE INSTRUÇÃO */}
      <Dialog open={instructionModalOpen} onClose={() => handleCloseInstructionModal()}>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpOutlineIcon color="primary" /> {t('pif_form.instruction_title')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.primary', mb: 2 }}>
            {text.split('\n').map((line, index) => (
              <React.Fragment key={index}>
                {line}
                <br />
              </React.Fragment>
            ))}
          </DialogContentText>
          <FormControlLabel
            control={
              <Checkbox
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
              />
            }
            label={t('pif_form.dont_show_again') || "Não exibir novamente"}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseInstructionModal} variant="contained">
            {t('common.ok') || "Entendi"}
          </Button>
        </DialogActions>
      </Dialog>

    </Paper>
  );
}
import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  Grid,
  Select,
  InputLabel,
  Chip,
  OutlinedInput,
  InputAdornment,
  Tooltip,
  SelectChangeEvent
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import api from '../../api/axiosConfig';
import { useTranslation } from 'react-i18next';

// Importações do DatePicker
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { ICrianca } from '../../../../Shared';

interface CriancaRegistrosProps {
  criancas: ICrianca[];
  fetchCriancas: () => Promise<void>;
  loadingCriancas: boolean;
}

interface FormState {
  id_crianca?: number;
  nome: string;
  idade: Date | null;
  sexo: string;
  tipoFala: string;
  alfabetizado: string;
  frequentaEscola: string;
  anoEscolar: string;
  fazTerapia: string;
  terapias: string;
  comQuemVive: string[];
  cuidadorPrincipal: string;
  temAnimal: string;
  animal: string;
  interageAnimal: string;
  peso: string;
  altura: string;
  temDisturbioAlimentar: string;
  detalhesDisturbio: string;
  dificuldadeCuidador: string;
  prioridadeDesenvolvimento: string;
  diagnostico: string[];
  outro_diagnostico: string;
  temHiperfoco: string;
  hiperfoco: string;
  perfilSensorial: string[];
  estrategiasRegulacao: string;
  gatilhosComuns: string;
  temInfoAdicional: string;
  infoAdicional: string;
}

export default function CriancaRegistros({ criancas, fetchCriancas, loadingCriancas }: CriancaRegistrosProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const [openEdit, setOpenEdit] = useState<boolean>(false);
  const [openDelete, setOpenDelete] = useState<boolean>(false);
  
  const [selectedCrianca, setSelectedCrianca] = useState<ICrianca | null>(null);
  const [formData, setFormData] = useState<FormState>({
    nome: '', idade: null, sexo: '', tipoFala: '', alfabetizado: 'Não',
    frequentaEscola: 'Não', anoEscolar: '', fazTerapia: 'Não', terapias: '',
    comQuemVive: [], cuidadorPrincipal: '', temAnimal: 'Não', animal: '', interageAnimal: 'Não',
    peso: '', altura: '', temDisturbioAlimentar: 'Não', detalhesDisturbio: '',
    dificuldadeCuidador: '', prioridadeDesenvolvimento: '',
    diagnostico: [], outro_diagnostico: '', temHiperfoco: 'Não', hiperfoco: '',
    perfilSensorial: [], estrategiasRegulacao: '', gatilhosComuns: '',
    temInfoAdicional: 'Não', infoAdicional: ''
  });

  const [pifCount, setPifCount] = useState<number>(0);
  const [diarioCount, setDiarioCount] = useState<number>(0);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);

  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  });

  // --- DADOS TRADUZIDOS PRESERVADOS INTEGRALMENTE ---
  const diagnosticosList = useMemo(() => [
    { value: "Transtorno do Espectro Autista (TEA)", label: t('diagnosis.tea') },
    { value: "Transtorno do Déficit de Atenção com Hiperatividade (TDAH)", label: t('diagnosis.tdah') },
    { value: "Transtorno Opositivo Desafiador (TOD)", label: t('diagnosis.tod') },
    { value: "Deficiência Intelectual", label: t('diagnosis.di') },
    { value: "Altas habilidades / superdotação", label: t('diagnosis.ah_sd') },
    { value: "Síndrome de Down", label: t('diagnosis.down') },
    { value: "dislexia", label: t('diagnosis.dyslexia') },
    { value: "disgrafia", label: t('diagnosis.dysgraphia') },
    { value: "disortografia", label: t('diagnosis.dysorthography') },
    { value: "discalculia", label: t('diagnosis.dyscalculia') },
    { value: "baixa visão", label: t('diagnosis.low_vision') },
    { value: "monocular", label: t('diagnosis.monocular') },
    { value: "cegueira", label: t('diagnosis.blindness') },
    { value: "Transtorno do Processamento Auditivo Central (TPAC)", label: t('diagnosis.tpac') },
    { value: "baixa audição", label: t('diagnosis.low_hearing') },
    { value: "surdez unilateral", label: t('diagnosis.unilateral_deafness') },
    { value: "surdez", label: t('diagnosis.deafness') },
    { value: "deficiência motora", label: t('diagnosis.motor_disability') },
    { value: "Especifique outro(s)", label: t('common.specify_other') },
  ], [t]);

  const anosEscolaresList = useMemo(() => [
    { value: "Berçário 1", label: t('school_years.nursery_1') },
    { value: "Berçário 2", label: t('school_years.nursery_2') },
    { value: "Maternal 1", label: t('school_years.maternal_1') },
    { value: "Maternal 2", label: t('school_years.maternal_2') },
    { value: "Pré 1", label: t('school_years.pre_1') },
    { value: "Pré 2", label: t('school_years.pre_2') },
    { value: "1º Ano", label: t('school_years.grade_1') },
    { value: "2º Ano", label: t('school_years.grade_2') },
    { value: "3º Ano", label: t('school_years.grade_3') },
    { value: "4º Ano", label: t('school_years.grade_4') },
    { value: "5º Ano", label: t('school_years.grade_5') },
    { value: "6º Ano", label: t('school_years.grade_6') },
    { value: "7º Ano", label: t('school_years.grade_7') },
    { value: "8º Ano", label: t('school_years.grade_8') },
    { value: "9º Ano", label: t('school_years.grade_9') }
  ], [t]);

  const tiposFalaList = useMemo(() => [
    { value: "Possui fala funcional (com intenção de comunicação)", label: t('speech_types.functional') },
    { value: "Apenas repete palavras e/ou sons (sem função)", label: t('speech_types.repeats') },
    { value: "Não fala, mas se comunica através de figuras, escrita, gestos, etc.", label: t('speech_types.alternative') },
    { value: "Não fala e não se comunica", label: t('speech_types.none') }
  ], [t]);

  const opcoesParentescoList = useMemo(() => [
    { value: "Mãe", label: t('kinship.mother') },
    { value: "Pai", label: t('kinship.father') },
    { value: "Irmão(s)", label: t('kinship.brothers') },
    { value: "Irmã(s)", label: t('kinship.sisters') },
    { value: "Tio(s)", label: t('kinship.uncles') },
    { value: "Tia(s)", label: t('kinship.aunts') },
    { value: "Primo(s)", label: t('kinship.cousins') },
    { value: "Avó(s)", label: t('kinship.grandmother') },
    { value: "Avô(s)", label: t('kinship.grandfather') },
    { value: "Outra(s) pessoa(s)", label: t('common.other') }
  ], [t]);

  const disturbiosAlimentaresList = useMemo(() => [
    { value: "Não", label: t('common.no') },
    { value: "Seletividade", label: t('food.selectivity') || "Seletividade" },
    { value: "Intolerância", label: t('food.intolerance') || "Intolerância" },
    { value: "Alergia", label: t('food.allergy') || "Alergia" },
    { value: "Outra", label: t('food.other') || "Restrição" }
  ], [t]);

  const perfilSensorialList = useMemo(() => [
    { value: "Hipersensibilidade Auditiva (Barulho)", label: t('sensorial.hipersensibility') || "Hipersensibilidade Auditiva (Incomoda com barulho)" },
    { value: "Hipersensibilidade Visual (Luz)", label: t('sensorial.photophobia') || "Fotofobia/Luz incomoda" },
    { value: "Aversão ao Toque", label: t('sensorial.no_touch') || "Aversão ao Toque (Não gosta que encoste)" },
    { value: "Busca Pressão/Abraço", label: t('sensorial.hugs') || "Busca Pressão Profunda (Gosta de abraço forte/peso)" },
    { value: "Busca Movimento", label: t('sensorial.movement') || "Busca Movimento (Gosta de girar/balançar)" },
    { value: "Sensibilidade a Texturas/Roupas", label: t('sensorial.fabric') || "Incômodo com etiquetas/tecidos" },
    { value: "Oralidade (Leva tudo à boca)", label: t('sensorial.oral') || "Busca Sensorial Oral (Morde coisas)" },
    { value: "Sensibilidade Térmica", label: t('sensorial.degree') || "Sensibilidade Térmica (não tolera frio ou calor)" }
  ], [t]);

  // --- MAPEAMENTO E NORMALIZAÇÃO DE BANCO PARA FORMULÁRIO ---
  const handleOpenEdit = (crianca: any) => {
    let parsedDiag: string[] = [];
    let parsedVive: string[] = [];
    let parsedSensorial: string[] = [];

    try { parsedDiag = Array.isArray(crianca.diagnostico) ? crianca.diagnostico : JSON.parse(crianca.diagnostico || '[]'); } catch { parsedDiag = []; }
    try { parsedVive = Array.isArray(crianca.com_quem_vive) ? crianca.com_quem_vive : JSON.parse(crianca.com_quem_vive || '[]'); } catch { parsedVive = []; }
    try { parsedSensorial = Array.isArray(crianca.perfil_sensorial) ? crianca.perfil_sensorial : JSON.parse(crianca.perfil_sensorial || '[]'); } catch { parsedSensorial = []; }

    let outro_diagnostico = '';
    const contemOutro = parsedDiag.some(d => d.startsWith('Outro: '));
    if (contemOutro) {
      const stringOutro = parsedDiag.find(d => d.startsWith('Outro: '));
      outro_diagnostico = stringOutro ? stringOutro.replace('Outro: ', '') : '';
    }

    setFormData({
      id_crianca: crianca.id_crianca,
      nome: crianca.nome || '',
      idade: crianca.idade ? new Date(crianca.idade) : null,
      sexo: crianca.sexo || '',
      tipoFala: crianca.tipo_fala || '',
      alfabetizado: crianca.alfabetizado || 'Não',
      frequentaEscola: crianca.frequenta_escola || 'Não',
      anoEscolar: crianca.ano_escolar || '',
      fazTerapia: crianca.faz_terapia || 'Não',
      terapias: crianca.terapias || '',
      comQuemVive: parsedVive,
      cuidadorPrincipal: crianca.cuidador_principal || '',
      temAnimal: crianca.tem_animal || 'Não',
      animal: crianca.animal || '',
      interageAnimal: crianca.interage_animal || 'Não',
      peso: crianca.peso !== null ? String(crianca.peso) : '',
      altura: crianca.altura !== null ? String(crianca.altura) : '',
      temDisturbioAlimentar: crianca.disturbio_alimentar || 'Não',
      detalhesDisturbio: crianca.detalhes_disturbio || '',
      dificuldadeCuidador: crianca.dificuldade_cuidador || '',
      prioridadeDesenvolvimento: crianca.prioridade_desenvolvimento || '',
      diagnostico: contemOutro ? [...parsedDiag.filter(d => !d.startsWith('Outro: ')), 'Especifique outro(s)'] : parsedDiag,
      outro_diagnostico: outro_diagnostico,
      temHiperfoco: crianca.hiperfoco ? 'Sim' : 'Não',
      hiperfoco: crianca.hiperfoco || '',
      perfilSensorial: parsedSensorial,
      estrategiasRegulacao: crianca.estrategias_regulacao || '',
      gatilhosComuns: crianca.gatilhos_comuns || '',
      temInfoAdicional: crianca.info_adicional ? 'Sim' : 'Não',
      infoAdicional: crianca.info_adicional || '',
    });
    setOpenEdit(true);
  };

  const handleOpenDelete = async (crianca: ICrianca) => {
    setSelectedCrianca(crianca);
    setLoadingAction(true);
    try {
      const response = await api.get(`/fernandasepe/criancas/${crianca.id_crianca}/pif-count`);
      setPifCount(response.data.pifCount);
      setDiarioCount(response.data.diarioCount);
      setOpenDelete(true);
    } catch (err) {
      setNotification({ open: true, message: 'Erro ao verificar dependências da criança.', severity: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCrianca?.id_crianca) return;
    try {
      await api.delete(`/fernandasepe/criancas/${selectedCrianca.id_crianca}`);
      setNotification({ open: true, message: 'Registro excluído com sucesso.', severity: 'success' });
      await fetchCriancas();
    } catch (err) {
      setNotification({ open: true, message: 'Erro ao processar a exclusão.', severity: 'error' });
    } finally {
      setOpenDelete(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'peso' || name === 'altura') {
      finalValue = value.replace(',', '.');
    }

    setFormData(prev => {
      const newData = { ...prev, [name]: finalValue };
      if (name === 'frequentaEscola' && value === 'Não') newData.anoEscolar = '';
      if (name === 'fazTerapia' && value === 'Não') newData.terapias = '';
      if (name === 'temAnimal' && value === 'Não') { newData.animal = ''; newData.interageAnimal = 'Não'; }
      if (name === 'temHiperfoco' && value === 'Não') newData.hiperfoco = '';
      if (name === 'temDisturbioAlimentar' && value === 'Não') newData.detalhesDisturbio = '';
      if (name === 'temInfoAdicional' && value === 'Não') newData.infoAdicional = '';
      return newData;
    });
  };

  const handleDiagnosticoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      diagnostico: checked ? [...prev.diagnostico, value] : prev.diagnostico.filter(d => d !== value)
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof FormState) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      const arr = prev[field] as string[];
      return {
        ...prev,
        [field]: checked ? [...arr, value] : arr.filter(item => item !== value)
      };
    });
  };

  const handleMultiSelectChange = (event: SelectChangeEvent<string[]>) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name as string]: typeof value === 'string' ? value.split(',') : value,
    }));
  };

  const handleUpdateConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id_crianca) return;

    let formattedDate: string | null = null;
    if (formData.idade) {
      const date = new Date(formData.idade);
      formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    const diagnosticoFinal = [
      ...formData.diagnostico.filter(d => d !== 'Especifique outro(s)'),
      ...(formData.outro_diagnostico ? [`Outro: ${formData.outro_diagnostico}`] : []),
    ];

    const payload = {
      nome: formData.nome,
      idade: formattedDate,
      sexo: formData.sexo,
      alfabetizado: formData.alfabetizado,
      diagnostico: diagnosticoFinal,
      hiperfoco: formData.temHiperfoco === 'Sim' ? formData.hiperfoco : null,
      ano_escolar: formData.anoEscolar,
      faz_terapia: formData.fazTerapia,
      frequenta_escola: formData.frequentaEscola,
      tipo_fala: formData.tipoFala,
      com_quem_vive: formData.comQuemVive,
      cuidador_principal: formData.cuidadorPrincipal,
      tem_animal: formData.temAnimal,
      animal: formData.animal,
      interage_animal: formData.interageAnimal,
      dificuldade_cuidador: formData.dificuldadeCuidador,
      prioridade_desenvolvimento: formData.prioridadeDesenvolvimento,
      peso: formData.peso ? parseFloat(formData.peso) : null,
      altura: formData.altura ? parseFloat(formData.altura) : null,
      disturbio_alimentar: formData.temDisturbioAlimentar,
      detalhes_disturbio: formData.temDisturbioAlimentar !== 'Não' ? formData.detalhesDisturbio : null,
      perfil_sensorial: formData.perfilSensorial,
      estrategias_regulacao: formData.estrategiasRegulacao,
      gatilhos_comuns: formData.gatilhosComuns,
      info_adicional: formData.temInfoAdicional === 'Sim' ? formData.infoAdicional : null
    };

    try {
      await api.put(`/fernandasepe/criancas/${formData.id_crianca}`, payload);
      setNotification({ open: true, message: 'Dados atualizados com sucesso!', severity: 'success' });
      await fetchCriancas();
      setOpenEdit(false);
    } catch (err) {
      setNotification({ open: true, message: 'Erro ao atualizar dados.', severity: 'error' });
    }
  };

  if (loadingCriancas || loadingAction) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>
    );
  }

  return (
    <Box>
      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'primary.main' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>{t('name')}</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Diagnóstico</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cuidador</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {criancas && criancas.length > 0 ? (
              criancas.map((crianca: any) => {
                let parsedDiag: string[] = [];
                try { parsedDiag = Array.isArray(crianca.diagnostico) ? crianca.diagnostico : JSON.parse(crianca.diagnostico || '[]'); } catch { parsedDiag = [String(crianca.diagnostico)]; }
                
                return (
                  <TableRow key={crianca.id_crianca} hover>
                    <TableCell>{crianca.nome}</TableCell>
                    <TableCell>{parsedDiag.join(', ')}</TableCell>
                    <TableCell>{crianca.cuidador_principal || 'Não informado'}</TableCell>
                    <TableCell align="center">
                      <IconButton color="primary" onClick={() => handleOpenEdit(crianca)}><EditIcon /></IconButton>
                      <IconButton color="error" onClick={() => handleOpenDelete(crianca)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">Nenhuma criança encontrada.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* DIALOG DE EDIÇÃO PRESERVANDO TODOS OS CAMPOS DO SISTEMA */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Editar Cadastro</DialogTitle>
        <Box component="form" onSubmit={handleUpdateConfirm}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField label={t('common.child_name')} name="nome" value={formData.nome} onChange={handleChange} fullWidth required />
              </Grid>
              
              <Grid size={{ xs: 12, md: 3 }}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                  <DatePicker
                    label={t('common.birth_date')}
                    value={formData.idade}
                    onChange={(date) => setFormData(p => ({ ...p, idade: date }))}
                    format="dd/MM/yyyy"
                    slotProps={{ textField: { fullWidth: true, required: true } }}
                  />
                </LocalizationProvider>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <TextField select label={t('common.gender')} name="sexo" value={formData.sexo} onChange={handleChange} fullWidth>
                  <MenuItem value="Masculino">{t('common.male')}</MenuItem>
                  <MenuItem value="Feminino">{t('common.female')}</MenuItem>
                  <MenuItem value="Prefiro não informar">{t('common.prefer_not_say')}</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 6, md: 3 }}>
                <TextField label={t('common.weight')} name="peso" value={formData.peso} onChange={handleChange} fullWidth slotProps={{ input: { endAdornment: <InputAdornment position="end">kg</InputAdornment> } }} />
              </Grid>
              
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField label={t('common.height')} name="altura" value={formData.altura} onChange={handleChange} fullWidth slotProps={{ input: { endAdornment: <InputAdornment position="end">m</InputAdornment> } }} />
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <TextField select label={t('common.literate')} name="alfabetizado" value={formData.alfabetizado} onChange={handleChange} fullWidth>
                  <MenuItem value="Sim">{t('common.yes')}</MenuItem>
                  <MenuItem value="Não">{t('common.no')}</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <TextField select label={t('common.attends_school')} name="frequentaEscola" value={formData.frequentaEscola} onChange={handleChange} fullWidth>
                  <MenuItem value="Sim">{t('common.yes')}</MenuItem>
                  <MenuItem value="Não">{t('common.no')}</MenuItem>
                </TextField>
              </Grid>

              {formData.frequentaEscola === 'Sim' && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField select label={t('common.school_year')} name="anoEscolar" value={formData.anoEscolar} onChange={handleChange} fullWidth>
                    {anosEscolaresList.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                  </TextField>
                </Grid>
              )}

              <Grid size={{ xs: 12, md: 3 }}>
                <TextField select label={t('common.does_therapy')} name="fazTerapia" value={formData.fazTerapia} onChange={handleChange} fullWidth>
                  <MenuItem value="Sim">{t('common.yes')}</MenuItem>
                  <MenuItem value="Não">{t('common.no')}</MenuItem>
                </TextField>
              </Grid>

              {formData.fazTerapia === 'Sim' && (
                <Grid size={{ xs: 12, md: 9 }}>
                  <TextField required label={t('common.which_therapies')} name="terapias" value={formData.terapias} onChange={handleChange} fullWidth inputProps={{ maxLength: 280 }} />
                </Grid>
              )}

              <Grid size={{ xs: 12 }}>
                <TextField select label={t('common.speech_type')} name="tipoFala" value={formData.tipoFala} onChange={handleChange} fullWidth slotProps={{ select: { sx: { '& .MuiSelect-select': { whiteSpace: 'normal !important' } } } }}>
                  {tiposFalaList.map(opt => <MenuItem key={opt.value} value={opt.value} sx={{ whiteSpace: 'normal' }}>{opt.label}</MenuItem>)}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, md: 9 }}>
                <FormControl fullWidth>
                  <InputLabel>{t('common.lives_with')}</InputLabel>
                  <Select multiple name="comQuemVive" value={formData.comQuemVive} onChange={handleMultiSelectChange} input={<OutlinedInput label={t('common.lives_with')} />} renderValue={(sel) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{(sel as string[]).map(v => <Chip key={v} label={v} size="small" />)}</Box>}>
                    {opcoesParentescoList.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <TextField select label={t('common.primary_caregiver')} name="cuidadorPrincipal" value={formData.cuidadorPrincipal} onChange={handleChange} fullWidth>
                  {opcoesParentescoList.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <TextField select label={t('common.has_pet')} name="temAnimal" value={formData.temAnimal} onChange={handleChange} fullWidth>
                  <MenuItem value="Sim">{t('common.yes')}</MenuItem>
                  <MenuItem value="Não">{t('common.no')}</MenuItem>
                </TextField>
              </Grid>

              {formData.temAnimal === 'Sim' && (
                <>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField label={t('common.which_pet')} name="animal" value={formData.animal} onChange={handleChange} fullWidth inputProps={{ maxLength: 280 }} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField select label={t('common.interacts_pet')} name="interageAnimal" value={formData.interageAnimal} onChange={handleChange} fullWidth>
                      <MenuItem value="Sim">{t('common.yes')}</MenuItem>
                      <MenuItem value="Não">{t('common.no')}</MenuItem>
                    </TextField>
                  </Grid>
                </>
              )}

              <Grid size={{ xs: 12 }}>
                <TextField select label={t('food.disorder_label')} name="temDisturbioAlimentar" value={formData.temDisturbioAlimentar} onChange={handleChange} fullWidth slotProps={{ select: { sx: { '& .MuiSelect-select': { whiteSpace: 'normal !important' } } } }}>
                  {disturbiosAlimentaresList.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                </TextField>
              </Grid>

              {formData.temDisturbioAlimentar !== 'Não' && (
                <Grid size={{ xs: 12 }}>
                  <TextField label={t('food.which_food')} name="detalhesDisturbio" value={formData.detalhesDisturbio} onChange={handleChange} fullWidth multiline slotProps={{ htmlInput: { maxRows: 4 } }} required />
                </Grid>
              )}

              {/* Seção Diagnóstico */}
              <Grid size={{ xs: 12 }} sx={{ p: 1.5, border: '1px solid #595959ff', borderRadius: 1, mt: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>{t('common.diagnosis_title')}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                  {diagnosticosList.map(diag => (
                    <FormControlLabel key={diag.value} control={<Checkbox checked={formData.diagnostico.includes(diag.value)} onChange={handleDiagnosticoChange} value={diag.value} />} label={diag.label} sx={{ width: { xs: '100%', sm: '48%' } }} />
                  ))}
                </Box>
                {formData.diagnostico.includes('Especifique outro(s)') && (
                  <TextField label={t('common.specify_other')} name="outro_diagnostico" value={formData.outro_diagnostico} onChange={handleChange} fullWidth multiline sx={{ mt: 1 }} />
                )}
              </Grid>

              {/* Perfil Sensorial */}
              <Grid size={{ xs: 12 }} sx={{ p: 1.5, border: '1px solid #595959ff', borderRadius: 1, mt: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{t('pif_form.kids.sensorial')}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 2 }}>
                  {perfilSensorialList.map(item => (
                    <FormControlLabel key={item.value} control={<Checkbox checked={formData.perfilSensorial.includes(item.value)} onChange={(e) => handleCheckboxChange(e, 'perfilSensorial')} value={item.value} />} label={item.label} sx={{ width: { xs: '100%', sm: '48%' } }} />
                  ))}
                </Box>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField label={t('common.regulation_strategy')} name="estrategiasRegulacao" value={formData.estrategiasRegulacao} onChange={handleChange} fullWidth multiline rows={2} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField label={t('common.triggers')} name="gatilhosComuns" value={formData.gatilhosComuns} onChange={handleChange} fullWidth multiline rows={2} />
                  </Grid>
                </Grid>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>{t('common.caregiver_difficulty')}</Typography>
                <TextField name="dificuldadeCuidador" value={formData.dificuldadeCuidador} onChange={handleChange} fullWidth multiline rows={2} />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>{t('common.development_priority')}</Typography>
                <TextField name="prioridadeDesenvolvimento" value={formData.prioridadeDesenvolvimento} onChange={handleChange} fullWidth multiline rows={2} />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ display: 'flex', alignItems: 'center' }}>
                    {t('common.has_hyperfocus')}
                    <Tooltip title={t('diagnosis.tootip_hyperfocus') as string} arrow><IconButton size="small"><InfoOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                  </FormLabel>
                  <RadioGroup row name="temHiperfoco" value={formData.temHiperfoco} onChange={handleChange}>
                    <FormControlLabel value="Sim" control={<Radio />} label={t('common.yes')} />
                    <FormControlLabel value="Não" control={<Radio />} label={t('common.no')} />
                  </RadioGroup>
                </FormControl>
                {formData.temHiperfoco === 'Sim' && (
                  <TextField label={t('common.describe_hyperfocus')} name="hiperfoco" value={formData.hiperfoco} onChange={handleChange} fullWidth multiline rows={2} sx={{ mt: 1 }} required />
                )}
              </Grid>

              <Grid size={{ xs: 12 }} sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ fontWeight: 'bold' }}>{t('common.other_info1')} {formData.nome} {t('common.other_info3')}</FormLabel>
                  <RadioGroup row name="temInfoAdicional" value={formData.temInfoAdicional} onChange={handleChange}>
                    <FormControlLabel value="Sim" control={<Radio />} label={t('common.yes')} />
                    <FormControlLabel value="Não" control={<Radio />} label={t('common.no')} />
                  </RadioGroup>
                </FormControl>
                {formData.temInfoAdicional === 'Sim' && (
                  <TextField label={t('common.info_adicional1')} name="infoAdicional" value={formData.infoAdicional} onChange={handleChange} fullWidth multiline rows={3} sx={{ mt: 1 }} />
                )}
              </Grid>

            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenEdit(false)} color="inherit">Cancelar</Button>
            <Button type="submit" variant="contained" color="primary">Salvar Alterações</Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* DIALOG DE EXCLUSÃO CRÍTICA EM CASCATA */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja remover permanentemente o cadastro de <strong>{selectedCrianca?.nome}</strong>?
          </DialogContentText>
          {(pifCount > 0 || diarioCount > 0) && (
            <Box sx={{ mt: 2, p: 2, bgcolor: alpha(theme.palette.error.main, 0.08), borderLeft: `4px solid ${theme.palette.error.main}`, borderRadius: 1 }}>
              <Typography color="error" sx={{ fontWeight: 'bold', fontSize: '0.9rem', mb: 0.5 }}>
                Atenção: Esta ação também excluirá permanentemente:
              </Typography>
              <ul style={{ color: theme.palette.error.main, margin: 0, paddingLeft: '20px', fontSize: '0.85rem' }}>
                {pifCount > 0 && <li>{pifCount} Plano(s) de Intervenção Familiar (PIF)</li>}
                {diarioCount > 0 && <li>{diarioCount} Registro(s) no Diário de Bordo</li>}
              </ul>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDelete(false)} color="inherit">Cancelar</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">Confirmar Exclusão</Button>
        </DialogActions>
      </Dialog>

      {/* NOTIFICAÇÃO GLOBAL */}
      <Snackbar open={notification.open} autoHideDuration={6000} onClose={() => setNotification(p => ({ ...p, open: false }))}>
        <Alert severity={notification.severity} variant="filled" sx={{ width: '100%' }}>{notification.message}</Alert>
      </Snackbar>
    </Box>
  );
}
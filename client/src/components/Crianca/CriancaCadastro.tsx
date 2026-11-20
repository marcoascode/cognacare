import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Paper,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel,
  Tooltip,
  IconButton,
  Grid, // Mantendo a padronização para o "size={{ xs: 12 }}" do MUI v2/v6
  Select,
  InputLabel,
  Chip,
  OutlinedInput,
  InputAdornment,
  SelectChangeEvent
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from 'react-i18next';

import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import api from '../../api/axiosConfig';

// Interface das Propriedades do Componente
interface CadastroProps {
  fetchCriancas: () => Promise<void>;
}

// Interface que espelha exatamente o estado atual do seu formulário
interface FormDataState {
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

const Cadastro: React.FC<CadastroProps> = ({ fetchCriancas }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [error, setError] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [newlyCreatedChild, setNewlyCreatedChild] = useState<{ id_crianca: number; nome: string } | null>(null);

  // --- DADOS TRADUZIDOS PRESERVADOS ---
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

  const [formData, setFormData] = useState<FormDataState>({
    nome: '',
    idade: null,
    sexo: '',
    tipoFala: '',
    alfabetizado: 'Não',
    frequentaEscola: 'Não',
    anoEscolar: '',
    fazTerapia: 'Não',
    terapias: '',
    comQuemVive: [],
    cuidadorPrincipal: '',
    temAnimal: 'Não',
    animal: '',
    interageAnimal: 'Não',
    peso: '',
    altura: '',
    temDisturbioAlimentar: 'Não',
    detalhesDisturbio: '',
    dificuldadeCuidador: '',
    prioridadeDesenvolvimento: '',
    diagnostico: [],
    outro_diagnostico: '',
    temHiperfoco: 'Não',
    hiperfoco: '',
    perfilSensorial: [],
    estrategiasRegulacao: '',
    gatilhosComuns: '',
    temInfoAdicional: 'Não',
    infoAdicional: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    let finalValue = value;
    if (name === 'peso' || name === 'altura') {
      finalValue = value.replace(',', '.');
    }

    setFormData(prev => {
      const newData = { ...prev, [name]: finalValue };

      // Limpezas condicionais originais preservadas
      if (name === 'frequentaEscola' && value === 'Não') newData.anoEscolar = '';
      if (name === 'fazTerapia' && value === 'Não') newData.terapias = '';
      if (name === 'temAnimal' && value === 'Não') {
        newData.animal = '';
        newData.interageAnimal = 'Não';
      }
      if (name === 'temDisturbioAlimentar' && value === 'Não') {
        newData.detalhesDisturbio = '';
      }
      if (name === 'temInfoAdicional' && value === 'Não') {
        newData.infoAdicional = '';
      }
      return newData;
    });
  };

  const handleDateChange = (newDate: Date | null) => {
    setFormData(prev => ({ ...prev, idade: newDate }));
  };

  const handleDiagnosticoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      diagnostico: checked
        ? [...prev.diagnostico, value]
        : prev.diagnostico.filter((d) => d !== value),
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>, field: keyof FormDataState) => {
    const { value, checked } = e.target;
    setFormData((prev) => {
      const arrayField = prev[field] as string[];
      return {
        ...prev,
        [field]: checked
          ? [...arrayField, value]
          : arrayField.filter((item) => item !== value),
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    let formattedDate: string | null = null;
    if (formData.idade) {
      const date = new Date(formData.idade);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      formattedDate = `${year}-${month}-${day}`;
    }

    const diagnosticoFinal = [
      ...formData.diagnostico.filter((d) => d !== 'Especifique outro(s)'),
      ...(formData.outro_diagnostico ? [`Outro: ${formData.outro_diagnostico}`] : []),
    ];

    const payload: any = {
      ...formData,
      idade: formattedDate,
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

    delete payload.outro_diagnostico;
    delete payload.temHiperfoco;
    delete payload.anoEscolar;
    delete payload.fazTerapia;
    delete payload.frequentaEscola;
    delete payload.tipoFala;
    delete payload.comQuemVive;
    delete payload.cuidadorPrincipal;
    delete payload.temAnimal;
    delete payload.interageAnimal;
    delete payload.dificuldadeCuidador;
    delete payload.prioridadeDesenvolvimento;
    delete payload.temDisturbioAlimentar;
    delete payload.detalhesDisturbio;

    try {
      const response = await api.post('/fernandasepe/criancas', payload);
      const newCrianca = response.data.crianca;
      await fetchCriancas();
      setNewlyCreatedChild(newCrianca);
      setIsDialogOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.erro || 'Erro ao cadastrar criança.');
    }
  };

  const handleCloseDialog = (resetForm = false) => {
    setIsDialogOpen(false);
    setNewlyCreatedChild(null);
    if (resetForm) {
      setFormData({
        nome: '', idade: null, sexo: '', tipoFala: '', alfabetizado: 'Não',
        frequentaEscola: 'Não', anoEscolar: '', fazTerapia: 'Não', terapias: '',
        comQuemVive: [], cuidadorPrincipal: '', temAnimal: 'Não', animal: '', interageAnimal: 'Não',
        peso: '', altura: '', temDisturbioAlimentar: 'Não', detalhesDisturbio: '',
        dificuldadeCuidador: '', prioridadeDesenvolvimento: '',
        diagnostico: [], outro_diagnostico: '', temHiperfoco: 'Não', hiperfoco: '',
        perfilSensorial: [], estrategiasRegulacao: '', gatilhosComuns: '',
        temInfoAdicional: 'Não', infoAdicional: ''
      });
    }
  };

  const handleNavigateToPif = () => {
    if (newlyCreatedChild) {
      navigate(`/pif/cadastro?id_crianca=${newlyCreatedChild.id_crianca}`);
    }
    handleCloseDialog();
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        m: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'transparent'
      }}
    >
      <Grid component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <fieldset style={{ border: 'none', padding: 0 }}>

          <Grid container sx={{ mb: 2 }} size={12}>
            <TextField
              label={t('common.child_name')}
              placeholder={t('common.child_name_placeholder')}
              helperText={t('common.child_name_helper')}
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              fullWidth
              required
              inputProps={{ maxLength: 100 }}
            />
          </Grid>
          <Grid container spacing={2} size={12}>

            <Grid container spacing={2} size={12}>
              <Grid size={{ xs: 12, md: 3 }}>
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                  <DatePicker
                    label={t('common.birth_date')}
                    value={formData.idade}
                    onChange={handleDateChange}
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
                <TextField
                  label={t('common.weight')}
                  placeholder={t('common.weight_placeholder')}
                  name="peso"
                  type="text"
                  inputMode="decimal"
                  value={formData.peso}
                  onChange={handleChange}
                  fullWidth
                  inputProps={{ maxLength: 10 }}
                  slotProps={{
                    input: { endAdornment: <InputAdornment position="end">kg</InputAdornment> }
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField
                  label={t('common.height')}
                  placeholder={t('common.height_placeholder')}
                  name="altura"
                  type="text"
                  inputMode="decimal"
                  value={formData.altura}
                  onChange={handleChange}
                  fullWidth
                  inputProps={{ maxLength: 10 }}
                  slotProps={{
                    input: { endAdornment: <InputAdornment position="end">m</InputAdornment> }
                  }}
                />
              </Grid>
            </Grid>

            {/* Escola */}
            <Grid container spacing={2} size={12}>
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
                    {anosEscolaresList.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                  </TextField>
                </Grid>
              )}
            </Grid>

            {/* Terapia */}
            <Grid container spacing={2} size={12}>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField select label={t('common.does_therapy')} name="fazTerapia" value={formData.fazTerapia} onChange={handleChange} fullWidth>
                  <MenuItem value="Sim">{t('common.yes')}</MenuItem>
                  <MenuItem value="Não">{t('common.no')}</MenuItem>
                </TextField>
              </Grid>
              {formData.fazTerapia === 'Sim' && (
                <Grid size={{ xs: 12, md: 9 }}>
                  <TextField
                    required
                    label={t('common.which_therapies')}
                    placeholder={t('common.which_therapies_placeholder')}
                    name="terapias"
                    value={formData.terapias}
                    onChange={handleChange}
                    fullWidth
                    inputProps={{ maxLength: 280 }}
                  />
                </Grid>
              )}
            </Grid>

            <Grid container spacing={2} size={12}>
              {/* <Grid size={{ xs: 12, md: 6 }}> */}
              <Grid size={12}>
                <TextField
                  select
                  label={t('common.speech_type')}
                  name="tipoFala"
                  value={formData.tipoFala}
                  onChange={handleChange}
                  fullWidth
                  slotProps={{ select: { sx: { '& .MuiSelect-select': { whiteSpace: 'normal !important' } } } }}
                >
                  {tiposFalaList.map(option => <MenuItem key={option.value} value={option.value} sx={{ whiteSpace: 'normal' }}>{option.label}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>

            {/* Cuidador e Convívio */}
            <Grid container spacing={2} size={12}>
              <Grid size={{ xs: 12, md: 9 }}>
                <FormControl fullWidth>
                  <InputLabel>{t('common.lives_with')}</InputLabel>
                  <Select
                    multiple
                    name="comQuemVive"
                    value={formData.comQuemVive}
                    onChange={handleMultiSelectChange}
                    input={<OutlinedInput label={t('common.lives_with')} />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => (<Chip key={value} label={value} size="small" />))}
                      </Box>
                    )}
                  >
                    {opcoesParentescoList.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField select label={t('common.primary_caregiver')} name="cuidadorPrincipal" value={formData.cuidadorPrincipal} onChange={handleChange} fullWidth>
                  {opcoesParentescoList.map((option) => (<MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>))}
                </TextField>
              </Grid>
            </Grid>

            {/* Animal */}
            <Grid container spacing={2} size={12}>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField select label={t('common.has_pet')} name="temAnimal" value={formData.temAnimal} onChange={handleChange} fullWidth>
                  <MenuItem value="Sim">{t('common.yes')}</MenuItem>
                  <MenuItem value="Não">{t('common.no')}</MenuItem>
                </TextField>
              </Grid>
              {formData.temAnimal === 'Sim' && (
                <>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label={t('common.which_pet')}
                      placeholder={t('common.which_pet_placeholder')}
                      name="animal"
                      value={formData.animal}
                      onChange={handleChange}
                      fullWidth
                      inputProps={{ maxLength: 280 }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField select label={t('common.interacts_pet')} name="interageAnimal" value={formData.interageAnimal} onChange={handleChange} fullWidth>
                      <MenuItem value="Sim">{t('common.yes')}</MenuItem>
                      <MenuItem value="Não">{t('common.no')}</MenuItem>
                    </TextField>
                  </Grid>
                </>
              )}
            </Grid>

            {/* Dados Físicos e Alimentares */}
            <Grid container spacing={2} size={12}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  label={t('food.disorder_label')}
                  name="temDisturbioAlimentar"
                  value={formData.temDisturbioAlimentar}
                  onChange={handleChange}
                  fullWidth
                  slotProps={{ select: { sx: { '& .MuiSelect-select': { whiteSpace: 'normal !important' } } } }}
                >
                  {disturbiosAlimentaresList.map(option => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {formData.temDisturbioAlimentar !== 'Não' && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label={t('food.which_food')}
                    name="detalhesDisturbio"
                    value={formData.detalhesDisturbio}
                    onChange={handleChange}
                    fullWidth
                    multiline
                    slotProps={{ htmlInput: { maxRows: 4 } }}
                    placeholder={t('food.placeholder')}
                    required
                    inputProps={{ maxLength: 280 }}
                  />
                </Grid>
              )}
            </Grid>

            {/* Diagnóstico */}
            <Grid container spacing={2} size={12} sx={{ p: 1, border: '1px solid #595959ff', borderRadius: 1, mt: 1 }}>
              <Grid size={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary' }}>{t('common.diagnosis_title')}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                  {diagnosticosList.map((diag) => (
                    <FormControlLabel
                      key={diag.value}
                      control={<Checkbox checked={formData.diagnostico.includes(diag.value)} onChange={handleDiagnosticoChange} value={diag.value} />}
                      label={diag.label}
                      sx={{ width: { xs: '100%', sm: '48%', md: '32%' } }}
                    />
                  ))}
                </Box>
              </Grid>

              {formData.diagnostico.includes('Especifique outro(s)') && (
                <Grid size={12}>
                  <TextField
                    label={t('common.specify_other')}
                    name="outro_diagnostico"
                    value={formData.outro_diagnostico}
                    onChange={handleChange}
                    fullWidth
                    multiline
                    sx={{ mt: 1 }}
                    inputProps={{ maxLength: 280 }}
                  />
                </Grid>
              )}
            </Grid>

            {/* Perfil Sensorial */}
            <Grid container spacing={2} size={12} sx={{ p: 1, border: '1px solid #595959ff', borderRadius: 1, mt: 2 }}>
              <Grid size={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary' }}>
                  {t('pif_form.kids.sensorial')}
                </Typography>
                <Typography variant="caption" display="block" gutterBottom>
                  {t('common.sensorial_profile')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                  {perfilSensorialList.map((item) => (
                    <FormControlLabel
                      key={item.value}
                      control={
                        <Checkbox
                          checked={formData.perfilSensorial.includes(item.value)}
                          onChange={(e) => handleCheckboxChange(e, 'perfilSensorial')}
                          value={item.value}
                        />
                      }
                      label={item.label}
                      sx={{ width: { xs: '100%', sm: '48%', md: '48%' } }}
                    />
                  ))}
                </Box>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label={t('common.regulation_strategy')}
                  name="estrategiasRegulacao"
                  value={formData.estrategiasRegulacao}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder={t('common.sos_examples')}
                  helperText={t('common.sos_tips')}
                  inputProps={{ maxLength: 280 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label={t('common.triggers')}
                  name="gatilhosComuns"
                  value={formData.gatilhosComuns}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder={t('common.trigger_examples')}
                  helperText={t('common.triggers_helper')}
                  inputProps={{ maxLength: 280 }}
                />
              </Grid>
            </Grid>

            {/* Perguntas Abertas */}
            <Grid size={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'text.secondary' }}>
                {t('common.caregiver_difficulty')}
              </Typography>
              <TextField
                name="dificuldadeCuidador"
                value={formData.dificuldadeCuidador}
                onChange={handleChange}
                fullWidth
                multiline
                rows={2}
                placeholder={t('common.difficulty_placeholder')}
                inputProps={{ maxLength: 280 }}
              />
            </Grid>

            <Grid size={12} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: 'text.secondary' }}>
                {t('common.development_priority')}
              </Typography>
              <TextField
                name="prioridadeDesenvolvimento"
                value={formData.prioridadeDesenvolvimento}
                onChange={handleChange}
                fullWidth
                multiline
                rows={2}
                placeholder={t('common.priority_placeholder')}
                inputProps={{ maxLength: 280 }}
              />
            </Grid>

            {/* Hiperfoco */}
            <Grid size={12}>
              <FormControl component="fieldset" sx={{ mt: 2 }}>
                <FormLabel component="legend" sx={{ display: 'flex', alignItems: 'center' }}>
                  {t('common.has_hyperfocus')}
                  <Tooltip
                    title={t('diagnosis.tootip_hyperfocus')}
                    arrow
                  >
                    <IconButton size="small" sx={{ ml: 0.5 }}><InfoOutlinedIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </FormLabel>
                <RadioGroup row name="temHiperfoco" value={formData.temHiperfoco} onChange={handleChange}>
                  <FormControlLabel value="Sim" control={<Radio />} label={t('common.yes')} />
                  <FormControlLabel value="Não" control={<Radio />} label={t('common.no')} />
                </RadioGroup>
              </FormControl>
            </Grid>
            {formData.temHiperfoco === 'Sim' && (
              <Grid size={12}>
                <TextField
                  label={t('common.describe_hyperfocus')}
                  placeholder={t('common.hyperfocus_placeholder')}
                  helperText={t('common.hyperfocus_helper')}
                  name="hiperfoco"
                  value={formData.hiperfoco}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={3}
                  required
                  inputProps={{ maxLength: 280 }}
                />
              </Grid>
            )}

            {/* --- SEÇÃO: INFORMAÇÕES ADICIONAIS --- */}
            <Grid size={12} sx={{ mt: 2, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontWeight: 'bold' }}>
                  {t('common.other_info1')} {formData.nome || t('common.other_info2')} {t('common.other_info3')}
                </FormLabel>
                <RadioGroup row name="temInfoAdicional" value={formData.temInfoAdicional} onChange={handleChange}>
                  <FormControlLabel value="Sim" control={<Radio />} label={t('common.yes')} />
                  <FormControlLabel value="Não" control={<Radio />} label={t('common.no')} />
                </RadioGroup>
              </FormControl>

              {formData.temInfoAdicional === 'Sim' && (
                <TextField
                  label={t('common.info_adicional1')}
                  name="infoAdicional"
                  value={formData.infoAdicional}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  rows={4}
                  placeholder={t('common.info_adicional2')}
                  sx={{ mt: 2 }}
                  inputProps={{ maxLength: 280 }}
                />
              )}
            </Grid>

            <Grid container size={12} justifyContent={'center'}>
              <Grid size={{ xs: 10, md: 5 }}>
                <Button type="submit" variant="contained" color="primary" fullWidth size="large" sx={{ mt: 2 }}>{t('common.register')}</Button>
              </Grid>
            </Grid>
          </Grid>
        </fieldset>
      </Grid>
      {error && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Dialog open={isDialogOpen} onClose={() => handleCloseDialog(true)}>
        <DialogTitle>{t('common.kid_reg_success')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('common.create_pif')} {newlyCreatedChild?.nome} {t('common.now')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleCloseDialog(true)}>{t('common.notnow')}</Button>
          <Button onClick={handleNavigateToPif} variant="contained" autoFocus>{t('common.yes_create')}</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default Cadastro;
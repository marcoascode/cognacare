import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AppBar,
  Tabs,
  Tab,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Paper,
  Stack,
  SelectChangeEvent,
  styled
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ListAltIcon from '@mui/icons-material/ListAlt';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';

// Componentes Internos
import CriancaCadastro from './CriancaCadastro';
import CriancaLista from './CriancaRegistros';
import ErrorBoundary from '../Financeiro/EFI/components/ErrorBoundary';
import PrescriptionScanner from '../Agente/PrescriptionScanner';

// Hooks Globais e Contratos
import { useTranslation } from 'react-i18next';
import { ICrianca } from '../../../../Shared';

// Interface para as propriedades do componente TabPanel
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`scrollable-tabpanel-${index}`}
      aria-labelledby={`scrollable-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `scrollable-tab-${index}`,
    'aria-controls': `scrollable-tabpanel-${index}`,
  };
}

// Estilização customizada das Tabs com suporte a Dark/Light Mode
const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: 'none',
  fontWeight: theme.typography.fontWeightRegular,
  fontSize: theme.typography.pxToRem(15),
  marginRight: theme.spacing(1),
  color: theme.palette.text.primary,
  background: theme.palette.mode === 'dark' 
    ? 'linear-gradient(90deg, #424242, #616161)' 
    : 'linear-gradient(90deg, #f0f0f0, #ffffff)',
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1, 2),
  minHeight: 48,
  '&:hover': {
    background: theme.palette.mode === 'dark'
      ? 'linear-gradient(90deg, #616161, #757575)'
      : 'linear-gradient(90deg, #e0e0e0, #f0f0f0)',
    opacity: 1,
  },
  '&.Mui-selected': {
    color: theme.palette.primary.main,
    fontWeight: theme.typography.fontWeightMedium,
    background: theme.palette.mode === 'dark'
      ? 'linear-gradient(90deg, #0288d1, #4fc3f7)'
      : 'linear-gradient(90deg, #e3f2fd, #bbdefb)',
  },
  '&.Mui-focusVisible': {
    backgroundColor: theme.palette.action.focus,
  },
}));

// Interface para as propriedades que o componente principal recebe do App.tsx
interface CriancaProps {
  criancas: ICrianca[];
  fetchCriancas: () => Promise<void>;
  loadingCriancas: boolean;
}

export default function Crianca({ criancas, fetchCriancas, loadingCriancas }: CriancaProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  // Sincronização inicial da aba ativa através da URL query string
  const tabParam = searchParams.get('tab');
  const getInitialTab = (): number => {
    if (tabParam === 'cadastro') return 1;
    if (tabParam === 'receita') return 2;
    return 0;
  };

  const [value, setValue] = useState<number>(getInitialTab());
  const [selectedCriancaReceita, setSelectedCriancaReceita] = useState<number | string>('');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    let currentTab = 'lista';
    if (newValue === 1) currentTab = 'cadastro';
    if (newValue === 2) currentTab = 'receita';
    setSearchParams({ tab: currentTab });
  };

  const handleSelectChange = (event: SelectChangeEvent<number | string>) => {
    setSelectedCriancaReceita(event.target.value);
  };

  return (
    <Box sx={{ width: '100%', mt: '1px' }}>
          <AppBar 
            position="sticky" 
            color="default" 
            elevation={1} 
            sx={{ bgcolor: 'background.paper', top: 0, zIndex: 10 }}
          >
        <Tabs
          value={value}
          onChange={handleTabChange}
          centered
          indicatorColor="primary"
          textColor="inherit"
          scrollButtons="auto"
          aria-label="Abas de Monitoramento e Gestão Infantil"
          sx={{ bgcolor: 'background.paper' }}
        >
          <StyledTab
            // sx={{ textTransform: 'none', fontWeight: 'bold' }}
            icon={<ListAltIcon />}
            // iconPosition="start"
            label={t('kids_tab.my_kids')}
            {...a11yProps(0)}
          />
          <StyledTab
            // sx={{ textTransform: 'none', fontWeight: 'bold' }}
            icon={<PersonAddIcon />}
            // iconPosition="start"
            label={t('kids_tab.register_kid')}
            {...a11yProps(1)}
          />
          <StyledTab
            // sx={{ textTransform: 'none', fontWeight: 'bold' }}
            icon={<MedicalServicesIcon />}
            // iconPosition="start"
            label={t('kids_tab.medical_receipt')}
            {...a11yProps(2)}
          />
        </Tabs>
      </AppBar>

      {/* ABA 0: LISTAGEM E CADASTROS EXISTENTES */}
      <TabPanel value={value} index={0}>
        <Box sx={{ p: { xs: 1, md: 3 } }}>
          <ErrorBoundary>
            <CriancaLista
              {...{ criancas, fetchCriancas, loadingCriancas } as any}
            />
          </ErrorBoundary>
        </Box>
      </TabPanel>

      {/* ABA 1: FORMULÁRIO DE CADASTRO DE NOVOS PACIENTES */}
      <TabPanel value={value} index={1}>
        <Box sx={{ p: { xs: 1, md: 3 } }}>
          <ErrorBoundary>
            <CriancaCadastro fetchCriancas={fetchCriancas} />
          </ErrorBoundary>
        </Box>
      </TabPanel>

      {/* ABA 2: COGNACARE AGENT - LEITURA DINÂMICA DE RECEITAS */}
      <TabPanel value={value} index={2}>
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: '800px', mx: 'auto' }}>
          <FormControl
            fullWidth
            sx={{
              mb: 4,
              bgcolor: 'background.paper',
              borderRadius: 1
            }}
          >
            <InputLabel id="select-crianca-receita-label">{t('kids_tab.select_kid')}</InputLabel>
            <Select
              labelId="select-crianca-receita-label"
              value={selectedCriancaReceita}
              label={t('kids_tab.select_kid')}
              onChange={handleSelectChange}
            >
              {criancas && criancas.map((c) => (
                <MenuItem key={c.id_crianca} value={c.id_crianca}>
                  {c.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Roteamento Condicional do Scanner Baseado na Seleção de Contexto */}
          {selectedCriancaReceita ? (
            <PrescriptionScanner criancaId={Number(selectedCriancaReceita)} />
          ) : (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: 'center',
                bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.action.hover, 0.05) : '#FDFBF7',
                border: '1px dashed',
                borderColor: theme.palette.divider,
                borderRadius: 3
              }}
            >
              <Stack alignItems="center" spacing={1}>
                <MedicalServicesIcon sx={{ fontSize: 40, color: theme.palette.text.disabled, mb: 1 }} />
                <Typography color="textSecondary">
                  {t('kids_tab.select')}
                </Typography>
              </Stack>
            </Paper>
          )}
        </Box>
      </TabPanel>
    </Box>
  );
}
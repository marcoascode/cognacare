import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  styled,
  AppBar,
  Tabs,
  Tab,
  Box,
} from '@mui/material';
import FormatListBulletedAddIcon from '@mui/icons-material/FormatListBulletedAdd';
import ListAltIcon from '@mui/icons-material/ListAlt';
import QueryStatsIcon from '@mui/icons-material/QueryStats';

// Componentes Internos
import PIFCadastro from './PIFCadastro.tsx';
import PIFRegistros from './PIFRegistros.tsx';
import Grafico from './PIFGrafico.tsx';
import ErrorBoundary from '../Financeiro/EFI/components/ErrorBoundary.js';

// Hooks e Contratos
import { useTranslation } from 'react-i18next';
import { ICrianca } from '../../../../Shared/index.ts';

// Interface para o componente de Painel de Abas
interface TabPanelProps {
  children?: React.ReactNode;
  index: string;
  value: string;
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

// Função auxiliar para acessibilidade
function a11yProps(index: string) {
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

// Interface das propriedades que o PIF recebe do App.tsx
interface PifProps {
  criancas: ICrianca[];
  loadingCriancas: boolean;
  totalCreditos: number | null;
}

export default function Pif({ criancas, loadingCriancas, totalCreditos }: PifProps) {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Lógica de aba inicial: prioriza o parâmetro 'tab', senão verifica se veio de um cadastro de criança
  const tabValue = searchParams.get('tab') || (searchParams.get('id_crianca') ? 'cadastro' : 'cadastro');

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    setSearchParams({ tab: newValue });
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
          value={tabValue}
          onChange={handleChange}
          indicatorColor="primary"
          textColor="inherit"
          centered
          aria-label="Abas de Gestão de PIF"
          sx={{ bgcolor: 'background.paper' }}
        >
          <StyledTab
            icon={<FormatListBulletedAddIcon />}
            label={t('pif_tab.create_fip')}
            value="cadastro"
            {...a11yProps('cadastro')}
          />
          <StyledTab
            icon={<ListAltIcon />}
            label={t('pif_tab.fip_list')}
            value="registros"
            {...a11yProps('registros')}
          />
          <StyledTab
            icon={<QueryStatsIcon />}
            label={t('pif_tab.fip_development')}
            value="grafico"
            {...a11yProps('grafico')}
          />
        </Tabs>
      </AppBar>

      {/* ABA: FORMULÁRIO DE INTELIGÊNCIA PIF */}
      <TabPanel value={tabValue} index="cadastro">
        <ErrorBoundary>
          <PIFCadastro 
            {...{ criancas, loadingCriancas, totalCreditos } as any} 
          />
        </ErrorBoundary>
      </TabPanel>

      {/* ABA: HISTÓRICO DE PIFS GERADOS */}
      <TabPanel value={tabValue} index="registros">
        <ErrorBoundary>
          <PIFRegistros />
        </ErrorBoundary>
      </TabPanel>

      {/* ABA: EVOLUÇÃO GRÁFICA DOS RESULTADOS */}
      <TabPanel value={tabValue} index="grafico">
        <ErrorBoundary>
          <Grafico {...{ criancas } as any} />
        </ErrorBoundary>
      </TabPanel>
    </Box>
  );
}
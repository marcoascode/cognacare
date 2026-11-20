import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

// import GroupIcon from '@mui/icons-material/Group';
import PaymentIcon from '@mui/icons-material/Payment';
import PriceChangeIcon from '@mui/icons-material/PriceChange';
import EmailIcon from '@mui/icons-material/Email';
import AssessmentIcon from '@mui/icons-material/Assessment';
import Diversity1Icon from '@mui/icons-material/Diversity1';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import GeneratingTokensIcon from '@mui/icons-material/GeneratingTokens';
import MenuBookIcon from '@mui/icons-material/MenuBook';

import ErrorBoundary from '../Financeiro/EFI/components/ErrorBoundary.js';
import Usuarios from './AdminUsuarios.tsx';
import AdminFinanceiro from './AdminFinanceiro.tsx';
import Precos from './AdminPrecos.tsx';
import Email from './AdminEmails.tsx';
import General from './AdminGeneral.tsx';
import AdminAfiliados from './AdminAfiliados.tsx';
import AdminPrompts from './AdminPrompts.tsx';
import AdminApiUsage from './AdminApiUsage.tsx';
import AdminGlossario from './AdminGlossario.tsx';

// --- INTERFACES ---
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

function a11yProps(index: string) {
  return {
    id: `scrollable-tab-${index}`,
    'aria-controls': `scrollable-tabpanel-${index}`,
  };
}

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

export default function Admin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabValue = searchParams.get('tab') || 'general';

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    setSearchParams({ tab: newValue });
  };

  return (
    <Box sx={{ bgcolor: 'background.paper', width: '100%', mt: '1px' }}>
      <AppBar position="sticky" color="default" elevation={1}>
        <Tabs
          value={tabValue}
          onChange={handleChange}
          // variant="scrollable"
          scrollButtons
          allowScrollButtonsMobile
          indicatorColor="primary"
          textColor="inherit"
          centered
          aria-label="Centered tabs de administração"
          sx={{ bgcolor: 'background.paper' }}
        >
          <StyledTab
            icon={<AssessmentIcon />}
            label="Geral"
            value="general"
            {...a11yProps('general')}
          />
          <StyledTab
            icon={<PaymentIcon />}
            label="Financeiro"
            value="financeiro"
            {...a11yProps('financeiro')}
          />
          <StyledTab
            icon={<Diversity1Icon />}
            label="Afiliados"
            value="afiliados"
            {...a11yProps('afiliados')}
          />
          <StyledTab
            icon={<EmailIcon />}
            label="Email"
            value="email"
            {...a11yProps('email')}
          />
          {/* <StyledTab
            icon={<GroupIcon />}
            label="Usuários"
            value="usuarios"
            {...a11yProps('usuarios')}
          /> */}
          <StyledTab
            icon={<PriceChangeIcon />}
            label="Preços"
            value="precos"
            {...a11yProps('precos')}
          />
          <StyledTab
            icon={<SettingsSuggestIcon />}
            label="Prompts"
            value="prompts"
            {...a11yProps('prompts')}
          />
          <StyledTab
            icon={<GeneratingTokensIcon />}
            label="API Usage"
            value="api-usage"
            {...a11yProps('api-usage')}
          />
          <StyledTab
            icon={<MenuBookIcon />}
            label="Glossário"
            value="glossario"
            {...a11yProps('glossario')}
          />
        </Tabs>
      </AppBar>
      <TabPanel value={tabValue} index="general">
        <General />
      </TabPanel>
      <TabPanel value={tabValue} index="financeiro">
        <AdminFinanceiro />
      </TabPanel>
      <TabPanel value={tabValue} index="afiliados">
        <ErrorBoundary>
          <AdminAfiliados />
        </ErrorBoundary>
      </TabPanel>
      <TabPanel value={tabValue} index="email">
        <Email />
      </TabPanel>
      <TabPanel value={tabValue} index="usuarios">
        <Usuarios />
      </TabPanel>
      <TabPanel value={tabValue} index="precos">
        <ErrorBoundary>
          <Precos />
        </ErrorBoundary>
      </TabPanel>
      <TabPanel value={tabValue} index="prompts">
        <ErrorBoundary>
          <AdminPrompts />
        </ErrorBoundary>
      </TabPanel>
      <TabPanel value={tabValue} index="api-usage">
        <ErrorBoundary>
          <AdminApiUsage />
        </ErrorBoundary>
      </TabPanel>
      <TabPanel value={tabValue} index="glossario">
        <ErrorBoundary>
          <AdminGlossario />
        </ErrorBoundary>
      </TabPanel>
    </Box>
  );
}
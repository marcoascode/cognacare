import React, { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  styled,
  AppBar,
  Tabs,
  Tab,
  Box,
} from '@mui/material';
import PasswordIcon from '@mui/icons-material/Password';
import ChangePassword from './ChangePassword'; // Importa o componente ChangePassword
import ErrorBoundary from '../Financeiro/EFI/components/ErrorBoundary';
import { useTranslation } from 'react-i18next';

// --- INTERFACES ---
interface TabPanelProps {
  children?: ReactNode;
  index: string;
  value: string;
}

// --- Componente Auxiliar TabPanel ---
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
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// --- Função Auxiliar Acessibilidade ---
function a11yProps(index: string) {
  return {
    id: `scrollable-tab-${index}`,
    'aria-controls': `scrollable-tabpanel-${index}`,
  };
}

// --- Customização do Tab ---
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

// --- Componente Principal ---
const Perfil: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Define 'alterar-senha' como a aba padrão se nenhuma estiver selecionada na URL
  const tabValue: string = searchParams.get('tab') || 'alterar-senha';

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    setSearchParams({ tab: newValue });
  };

  return (
    <Box sx={{ width: '100%', mt: '1px' }}>
      <AppBar position="sticky" color="default" elevation={1}>
        <Tabs
          value={tabValue}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons
          allowScrollButtonsMobile
          indicatorColor="primary"
          textColor="inherit"
          centered
          aria-label="Abas do Perfil"
          sx={{ bgcolor: 'background.paper' }}
        >
          <StyledTab
            icon={<PasswordIcon />}
            label={t('profile.change_pwd')}
            value="alterar-senha"
            {...a11yProps('alterar-senha')}
          />
          {/* Pode adicionar mais abas aqui no futuro, como "Meus Dados", "Configurações", etc. */}
        </Tabs>
      </AppBar>

      <TabPanel value={tabValue} index="alterar-senha">
        <ErrorBoundary>
          <ChangePassword />
        </ErrorBoundary>
      </TabPanel>
    </Box>
  );
};

export default Perfil;
import React, { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  styled,
  AppBar,
  Tabs,
  Tab,
  Box,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { useTranslation } from 'react-i18next';

import Extrato from './FinanceiroExtrato';
import CheckoutEFI from './EFI/Checkout';
import ErrorBoundary from './EFI/components/ErrorBoundary';

// --- INTERFACES ---
interface TabPanelProps {
  children?: ReactNode;
  index: string;
  value: string;
}

interface FinanceiroProps {
  onPaymentSuccess?: () => void;
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
const Financeiro: React.FC<FinanceiroProps> = ({ onPaymentSuccess }) => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // O valor por omissão 'extrato' é passado caso o parâmetro de URL não exista
  const tabValue: string = searchParams.get('tab') || 'extrato'; 

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    setSearchParams({ tab: newValue });
  };

  return (
    <Box sx={{ width: '100%', mt: '1px' }}>
      <AppBar position="sticky" color="default" elevation={1}>
        <Tabs
          value={tabValue}
          onChange={handleChange}
          indicatorColor="primary"
          textColor="inherit"
          centered
          aria-label="Centered tabs de financeiro"
          sx={{ bgcolor: 'background.paper' }}
        >
          <StyledTab
            icon={<AccountBalanceIcon />}
            label={t('financial.tabs.statement')}
            value="extrato"
            {...a11yProps('extrato')}
          />
          <StyledTab
            icon={<CreditCardIcon />}
            label={t('financial.tabs.buy_credits')}
            value="creditos"
            {...a11yProps('creditos')}
          />
        </Tabs>
      </AppBar>
      
      <TabPanel value={tabValue} index="extrato">
        <Extrato />
      </TabPanel>
      
      <TabPanel value={tabValue} index="creditos">
        <ErrorBoundary>
            {/* O componente tipado no passo anterior passará a receber a função corretamente */}
            <CheckoutEFI onPaymentSuccess={onPaymentSuccess} />
        </ErrorBoundary>
      </TabPanel>
    </Box>
  );
};

export default Financeiro;
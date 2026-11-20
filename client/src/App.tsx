import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet, useSearchParams } from 'react-router-dom';

import {
  CircularProgress, Grid, Stack, Divider, Chip, Typography, Box, Button,
  MenuList, MenuItem, ListItemIcon, ListItemText,
} from '@mui/material';

// Imports do Toolpad Core
import { AppProvider, Session } from '@toolpad/core/AppProvider';
import { DashboardLayout, ThemeSwitcher } from '@toolpad/core/DashboardLayout';
import { Account, AccountPreview, AccountPopoverFooter, SignOutButton } from '@toolpad/core/Account';

import { createTheme, keyframes } from '@mui/material/styles';

import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { SafeArea } from '@capacitor-community/safe-area';

// Ícones
import ChildCareIcon from '@mui/icons-material/ChildCare';
import EscalatorWarningIcon from '@mui/icons-material/EscalatorWarning';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import HomeIcon from '@mui/icons-material/Home';
import ChatIcon from '@mui/icons-material/Chat';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LoyaltyIcon from '@mui/icons-material/Loyalty';
import HandshakeIcon from '@mui/icons-material/Handshake';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import PlayLessonIcon from '@mui/icons-material/PlayLesson';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';

// Contratos (TypeScript)
import { ICrianca } from '../../Shared';

// Componentes do Projeto
import Footer from './components/Footer.tsx';
import ProtectedRoute from './components/ProtectedRoute';
import api from './api/axiosConfig'
import LanguageSwitcher from './components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

// Ferramentas do Agente
import VisualRoutineGenerator from './components/Agente/VisualRoutineGenerator';
import AlertaGlobalAgente from './components/Agente/AlertaGlobalAgente';
import NotificationBell from './components/Agente/NotificationBell';
import RelatorioGerador from './components/Agente/RelatorioGerador';

// Páginas e Componentes
import NotFound from './components/NotFound';
import Dashboard from './components/Dashboard.tsx';
import Signup from './components/Perfil/Signup.tsx';
import Login from './components/Perfil/Login.tsx';
import VerifyEmailInstruction from './components/Perfil/VerifyEmailInstruction.tsx';
import VerifyEmail from './components/Perfil/VerifyEmail.tsx';
import ForgotPassword from './components/Perfil/ForgotPassword.tsx';
import ResetPassword from './components/Perfil/ResetPassword.tsx';
import Crianca from './components/Crianca/Crianca.tsx';
import Pif from './components/PIF/Pif.tsx';
import Chat from './components/Tools/Chat.tsx';

import SOSCrisisMode from './components/Tools/SOSCrisisMode';
import DiarioBordo from './components/Tools/DiarioBordo.tsx';
import PIFCadastro from './components/PIF/PIFCadastro.tsx';
import PIFRegistros from './components/PIF/PIFRegistros.tsx';
import Financeiro from './components/Financeiro/Financeiro.tsx';
import Admin from './components/Admin/Admin.tsx';
import Tutoriais from './components/Tutoriais.tsx';
import Glossario from './components/Glossario.tsx';
import PerfilEditor from './components/Perfil/PerfilEditor.tsx';

import Termos from './components/pages/Termos';
import Politicas from './components/pages/Politicas';
import AfiliadosTermos from './components/pages/AfiliadosTermos';
import PainelParceiro from './components/Afiliados/PainelParceiro';
import AfiliadosLanding from './components/Afiliados/AfiliadosLanding';
import Faq from './components/pages/Faq';
import Contact from './components/pages/Contact';

const Montserrat = "'Montserrat', sans-serif"
const pulseGlow = keyframes`
  0% { border-color: rgba(46, 125, 50, 0.3); box-shadow: 0 0 0 0 rgba(46, 125, 50, 0.2); background-color: rgba(46, 125, 50, 0.0); }
  50% { border-color: rgba(46, 125, 50, 0.8); box-shadow: 0 0 12px 3px rgba(46, 125, 50, 0.4); background-color: rgba(46, 125, 50, 0.1); }
  100% { border-color: rgba(46, 125, 50, 0.3); box-shadow: 0 0 0 0 rgba(46, 125, 50, 0.2); background-color: rgba(46, 125, 50, 0.0); }
`;

const demoTheme = createTheme({
  cssVariables: { colorSchemeSelector: 'data-toolpad-color-scheme' },
  colorSchemes: { light: true, dark: true },
  breakpoints: { values: { xs: 0, sm: 600, md: 600, lg: 1200, xl: 1536 } },
});

// Tipagens do App
interface AppProps {
  window?: () => Window;
}

// Extensão da Sessão do Toolpad para incluir nossos dados extras
interface CustomSessionUser {
  name?: string;
  email?: string;
  image?: string;
  status?: string;
  tipo_plano?: string;
  creditos?: number;
  chat_mensagens_restantes?: number;
  assinatura_expira_em?: string | Date | null;
  is_affiliate?: boolean | number;
  is_founder?: boolean | number;
  is_agent_active?: boolean | number;
  perfil_recompensado?: boolean | number;
}

interface CustomSession extends Session {
  user: CustomSessionUser;
}

// Interfaces dos componentes auxiliares
interface AccountSidebarPreviewProps {
  handleClick?: React.MouseEventHandler<HTMLElement>;
  open?: boolean;
  mini: boolean;
  needsProfileCompletion?: boolean;
}

function AccountSidebarPreview(props: AccountSidebarPreviewProps) {
  const { handleClick, open, mini, needsProfileCompletion } = props;
  return (
    <Stack direction="column" p={0}>
      <Divider />
      <Box sx={{ p: 0 }}>
        <AccountPreview
          variant={mini ? 'condensed' : 'expanded'}
          handleClick={handleClick}
          open={open}
          sx={needsProfileCompletion ? { animation: `${pulseGlow} 2s infinite` } : undefined}
        />
      </Box>
    </Stack>
  );
}

interface SOSWrapperProps {
  criancas: ICrianca[];
  loading: boolean;
}

const SOSWrapper: React.FC<SOSWrapperProps> = ({ criancas, loading }) => {
  const navigate = useNavigate();
  const [selectedChild, setSelectedChild] = useState<ICrianca | null>(null);

  useEffect(() => {
    if (!loading && criancas && criancas.length === 1) setSelectedChild(criancas[0]);
  }, [criancas, loading]);

  const handleClose = () => navigate('/dashboard');

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  if (!criancas || criancas.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', mt: 5 }}>
        <Typography variant="h6">Nenhuma criança cadastrada para o SOS.</Typography>
        <Button onClick={handleClose} variant="outlined" sx={{ mt: 2 }}>Voltar</Button>
      </Box>
    );
  }

  if (criancas.length > 1 && !selectedChild) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <Typography variant="h3" color="error" fontWeight="bold" gutterBottom>QUEM ESTÁ EM CRISE?</Typography>
        <Grid container spacing={3} justifyContent="center" sx={{ maxWidth: 800, mt: 2 }}>
          {criancas.map((crianca) => (
            <Grid key={crianca.id_crianca}>
              <Button
                variant="contained" color="error" size="large" onClick={() => setSelectedChild(crianca)}
                sx={{ fontSize: '1.5rem', px: 5, py: 3, borderRadius: 4, textTransform: 'none', display: 'flex', flexDirection: 'column', gap: 1 }}
              >
                <WarningAmberIcon fontSize="large" /> {crianca.nome}
              </Button>
            </Grid>
          ))}
        </Grid>
        <Box sx={{ mt: 8 }}><Button onClick={handleClose} variant="contained" size="large">Cancelar Emergência</Button></Box>
      </Box>
    );
  }

  // selectedChild garantido de possuir id_crianca pelo banco (number)
  return selectedChild ? <SOSCrisisMode open={true} onClose={handleClose} criancaId={selectedChild.id_crianca!} nomeCrianca={selectedChild.nome} /> : null;
};

const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', height: '100vh', overflowY: 'auto', bgcolor: 'background.default' }}>
    <Box sx={{ flex: 1 }}>{children}</Box>
    <Footer />
  </Box>
);

const ProtectedLayout: React.FC<{ SidebarFooterAccount: React.ElementType, session: CustomSession | null }> = ({ SidebarFooterAccount, session }) => {
  return (
    <DashboardLayout slots={{
      sidebarFooter: SidebarFooterAccount as any,
      toolbarAccount: () => null,
      toolbarActions: () => (
        <Stack direction="row" spacing={1} alignItems="center">
          <ThemeSwitcher />
          {!!session?.user?.is_agent_active && <NotificationBell />}
        </Stack>
      )
    }}>
      <Outlet />
    </DashboardLayout>
  );
};

export default function App({ window }: AppProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [session, setSession] = useState<CustomSession | null>(null);
  const [criancas, setCriancas] = useState<ICrianca[]>([]);
  const [loadingCriancas, setLoadingCriancas] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [creditosPif, setCreditosPif] = useState<number | null>(null);
  const [creditosChat, setCreditosChat] = useState<number | null>(null);

  const [verifyEmailResult, setVerifyEmailResult] = useState<{ status: 'loading' | 'success' | 'error', message: string }>({ status: 'loading', message: '' });
  const [searchParams] = useSearchParams();

  const fetchCreditos = useCallback(async () => {
    try {
      const response = await api.get('/fernandasepe/usuario/creditos-ativos');
      if (response.data) {
        setCreditosPif(response.data.creditos_ativos);
        setCreditosChat(response.data.chat_mensagens_restantes);
      }
    } catch (error) { console.error(t('crediterror'), error); }
  }, [t]);

  const handleLogout = useCallback(() => {
    setSession(null);
    localStorage.removeItem('token');
    localStorage.removeItem('nome');
    localStorage.removeItem('email');
    localStorage.removeItem('user_data');
    navigate('/');
  }, [navigate]);

  const checkSession = useCallback(async () => {
    const guestRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];
    const publicRoutes = ['/termos-de-uso', '/politica-de-privacidade', '/verify-email', '/verify-email-instruction', '/termos-afiliados', '/faq', '/contato', '/tutorial', '/glossario', '/dash-tutorial', '/dash-glossario'];

    const token = localStorage.getItem('token');
    const storedUserData = localStorage.getItem('user_data');

    if (token && storedUserData) {
      try {
        const parsedUser = JSON.parse(storedUserData);
        setSession({ user: { ...parsedUser, image: '/profile.png' } });
        setCreditosPif(parsedUser.creditos);
        setCreditosChat(parsedUser.chat_mensagens_restantes);

        if (guestRoutes.includes(location.pathname)) navigate('/dashboard', { replace: true });
        setIsLoading(false);
      } catch (e) { console.error("Erro ao ler cache de usuário", e); }
    }

    if (!token) {
      setIsLoading(false);
      const isPublicOrGuest = [...guestRoutes, ...publicRoutes].includes(location.pathname);
      if (!isPublicOrGuest) navigate('/login', { replace: true });
      return;
    }

    try {
      const response = await api.get('/fernandasepe/me');
      const data = response.data;
      const userImage = data.usuario.foto_perfil ? `${import.meta.env.VITE_API_BASE_URL}/uploads/${data.usuario.foto_perfil}` : '/profile.png';

      const cacheAtual = JSON.parse(localStorage.getItem('user_data') || '{}');

      const sessionData: CustomSessionUser = {
        name: data.usuario.nome,
        email: data.usuario.email,
        status: data.usuario.status,
        tipo_plano: data.usuario.tipo_plano,
        image: userImage,
        creditos: data.usuario.creditos,
        chat_mensagens_restantes: data.usuario.chat_mensagens_restantes,
        assinatura_expira_em: data.usuario.assinatura_expira_em,
        is_affiliate: data.usuario.is_affiliate,
        is_founder: data.usuario.is_founder,
        is_agent_active: data.usuario.is_agent_active || 0,
        perfil_recompensado: data.usuario.perfil_recompensado !== undefined ? data.usuario.perfil_recompensado : (cacheAtual.perfil_recompensado || 0)
      };

      setSession({ user: sessionData });
      localStorage.setItem('user_data', JSON.stringify(sessionData));
      setCreditosPif(data.usuario.creditos);
      setCreditosChat(data.usuario.chat_mensagens_restantes);

    } catch (error: any) {
      console.error(t('sessionerror'), error.response?.data?.erro || error.message);
    } finally {
      setIsLoading(false);
    }
  }, [t, navigate, location.pathname]);

  useEffect(() => { checkSession(); }, [checkSession]);

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) localStorage.setItem('affiliate_ref', refCode.toUpperCase());
  }, [searchParams]);

  const handleProfileUpdate = useCallback(async () => { await checkSession(); }, [checkSession]);

  useEffect(() => {
    const verifyEmailOnLoad = async () => {
      if (location.pathname === '/verify-email') {
        const token = new URLSearchParams(location.search).get('token');
        if (token) {
          try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/fernandasepe/verify-email?token=${token}`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
            const data = await response.json();
            setVerifyEmailResult({ status: response.status === 200 ? 'success' : 'error', message: response.status === 200 ? (data.mensagem || t('verifiedemail')) : (data.erro || t('emailerror')) });
            if (response.status === 200) setTimeout(() => navigate('/login', { replace: true }), 5000);
          } catch (error) { console.log(error); setVerifyEmailResult({ status: 'error', message: t('servererror') }); }
        } else { setVerifyEmailResult({ status: 'error', message: t('notoken') }); }
      }
    };
    verifyEmailOnLoad();
  }, [t, location.pathname, location.search, navigate]);

  const fetchCriancas = useCallback(async () => {
    setLoadingCriancas(true);
    try {
      const response = await api.get('/fernandasepe/criancas');
      setCriancas(response.data);
    } catch (error) {
      console.log(error);
      setCriancas([]);
    } finally {
      setLoadingCriancas(false);
    }
  }, []);

  useEffect(() => { if (session) fetchCriancas(); }, [session, fetchCriancas]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const configureStatusBar = async () => {
        try {
          await StatusBar.setOverlaysWebView({ overlay: false });
          await StatusBar.setBackgroundColor({ color: '#f5f5f5' });
          await StatusBar.setStyle({ style: Style.Light });
        } catch (e) { console.error('Status bar error', e); }
      };
      configureStatusBar();

      (SafeArea as any).getSafeAreaInsets().then(({ insets }: any) => {
        document.documentElement.style.setProperty('--safe-area-top', `${insets.top}px`);
        document.documentElement.style.setProperty('--safe-area-bottom', `${insets.bottom}px`);
      }).catch((err: any) => console.error("Erro no SafeArea:", err));
    }
  }, []);

  const handleLoginSuccess = (userData: any, token: string) => {
    const userImage = userData.foto_perfil ? `${import.meta.env.VITE_API_BASE_URL}/uploads/${userData.foto_perfil}` : '/profile.png';
    const userSessionData: CustomSessionUser = {
      name: userData.nome, email: userData.email, status: userData.status, tipo_plano: userData.tipo_plano,
      image: userImage, chat_mensagens_restantes: userData.chat_mensagens_restantes || 0, creditos: userData.creditos || 0,
      assinatura_expira_em: userData.assinatura_expira_em, is_affiliate: userData.is_affiliate, is_founder: userData.is_founder,
      is_agent_active: userData.is_agent_active || 0,
      perfil_recompensado: userData.perfil_recompensado || 0
    };

    localStorage.setItem('token', token);
    localStorage.setItem('nome', userData.nome);
    localStorage.setItem('email', userData.email);

    setSession({ user: userSessionData });
    setCreditosPif(userData.creditos || 0);
    setCreditosChat(userData.chat_mensagens_restantes || 0);

    navigate('/dashboard', { replace: true });
  };

  const authentication = useMemo(() => ({
    signIn: () => { navigate('/login'); },
    signOut: () => { handleLogout(); },
  }), [navigate, handleLogout]);

  const demoWindow = window !== undefined ? window() : undefined;

  const FounderBadge: React.FC<{ size?: 'small' | 'medium' }> = ({ size = 'small' }) => (
    <Chip
      icon={<WorkspacePremiumIcon style={{ color: '#855E42' }} />}
      label={t('dashboard.founder')}
      size={size}
      sx={{
        background: 'linear-gradient(90deg, #FFD700 0%, #FDB931 50%, #FFD700 100%)',
        color: '#5C4033', fontWeight: 'bold', border: '1px solid #FFF',
        boxShadow: '0px 2px 4px rgba(0,0,0,0.15)',
        '& .MuiChip-icon': { marginLeft: '5px' },
        letterSpacing: '0.5px',
        fontSize: size === 'small' ? '0.65rem' : '0.75rem',
        height: size === 'small' ? '20px' : '28px'
      }}
    />
  );

  function SidebarFooterAccountPopover() {
    const needsProfileCompletion = Number(session?.user?.perfil_recompensado) === 0;

    return (
      <Stack direction="column" sx={{ width: '250px' }}>
        {session?.user?.is_founder && (
          <Box sx={{ p: 2, pb: 0, display: 'flex', justifyContent: 'center' }}>
            <FounderBadge size="medium" />
          </Box>
        )}

        <Typography variant="body2" mx={2} mt={1} sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
          {t('common.acc_status')}
        </Typography>

        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption">{t('pifcredit')}</Typography>
            <Chip label={creditosPif ?? '...'} color="primary" size="small" />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption">{t('chatcredit')}</Typography>
            <Chip label={creditosChat ?? '...'} color="success" size="small" />
          </Box>
          <Button
            variant="contained" size="large" startIcon={<AttachMoneyIcon />}
            onClick={() => navigate('/financeiro?tab=creditos')} fullWidth sx={{ mt: 1 }}
          >
            {t('financial.tab')}
          </Button>
        </Box>

        <Divider />

        <Typography variant="body2" mx={2} mt={1} sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
          {t('common.settings')}
        </Typography>
        <MenuList>
          <MenuItem
            onClick={() => navigate('/perfil')}
            sx={needsProfileCompletion ? { animation: `${pulseGlow} 2s infinite`, borderColor: 'success.main', my: 0.5, mx: 1, borderRadius: 1 } : undefined}
          >
            <ListItemIcon>
              <ManageAccountsIcon fontSize="small" color={needsProfileCompletion ? "success" : "inherit"} />
            </ListItemIcon>
            <ListItemText
              primary={t('sidebar.acc_settings')}
              secondary={needsProfileCompletion ? t('sidebar.credits') : null}
              secondaryTypographyProps={needsProfileCompletion ? { color: 'success.main', fontWeight: 'bold' } : undefined}
            />
          </MenuItem>

          <Box sx={{ px: 2, py: 1 }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <LanguageSwitcher /><Typography variant="caption">{t('footer.current_lang')} ({t('common.change_language')})</Typography>
          </Box>
        </MenuList>

        <Divider />
        <AccountPopoverFooter>
          <SignOutButton />
        </AccountPopoverFooter>
      </Stack>
    );
  }

  function SidebarFooterAccount({ mini }: { mini: boolean }) {
    const needsProfileCompletion = Number(session?.user?.perfil_recompensado) === 0;

    const PreviewComponent = useMemo(() => {
      return function Preview(props: any) {
        return <AccountSidebarPreview {...props} mini={mini} needsProfileCompletion={needsProfileCompletion} />;
      };
    }, [mini, needsProfileCompletion]);

    return (
      <Account
        slots={{ preview: PreviewComponent, popoverContent: SidebarFooterAccountPopover }}
        slotProps={{
          popover: {
            transformOrigin: { horizontal: 'left', vertical: 'bottom' },
            anchorOrigin: { horizontal: 'right', vertical: 'bottom' },
            disableAutoFocus: true,
            slotProps: {
              paper: {
                elevation: 0,
                sx: {
                  overflow: 'visible',
                  filter: (theme) => `drop-shadow(0px 2px 8px ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.32)'})`,
                  mt: 1,
                  '&::before': { content: '""', display: 'block', position: 'absolute', bottom: 10, left: 0, width: 10, height: 10, bgcolor: 'background.paper', transform: 'translate(-50%, -50%) rotate(45deg)', zIndex: 0 },
                },
              },
            },
          },
        }}
      />
    );
  }

  const NAVIGATION: any[] = session ? [
    { segment: 'dashboard', title: t('home'), icon: <HomeIcon /> },
    { segment: 'criancas', title: t('kids'), icon: <ChildCareIcon /> },
    { segment: 'pif', title: t('pif'), icon: <EscalatorWarningIcon /> },
    { segment: 'chat', title: t('pifassistant'), icon: <ChatIcon /> },
    { segment: 'diario-bordo', title: t('sidebar.logbook'), icon: <AutoStoriesIcon /> },
    ...(session.user.is_agent_active ? [
      { segment: 'historias-sociais', title: 'Histórias Sociais', icon: <AutoAwesomeIcon /> },
      { segment: 'relatorios', title: 'Relatório Pedagógico', icon: <AssessmentIcon /> },
    ] : []),
    { kind: 'divider' },
    { segment: 'dash-tutorial', title: t('tutorials.sidebar'), icon: <PlayLessonIcon /> },
    { segment: 'glossario', title: t('glossary.title') || 'Glossário', icon: <MenuBookIcon /> },
    ...(session.user.status === 'admin' ? [
      { kind: 'divider' },
      { segment: 'financeiro', title: t('financial.tab') || 'Financeiro', icon: <AttachMoneyIcon /> },
      { segment: 'admin', title: 'ADMIN', icon: <AdminPanelSettingsIcon /> },
    ] : []),
    ...(session.user.is_affiliate ? [
      { kind: 'divider' },
      { segment: 'afiliados', title: 'Área do Parceiro', icon: <LoyaltyIcon /> },
    ] : [
      { segment: 'seja-parceiro', title: t('sidebar.partner'), icon: <HandshakeIcon /> },
    ]),
  ] : [];

  if (isLoading) {
    return (
      <Box sx={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(2px)' }}>
        <CircularProgress size={60} thickness={4} color="primary" />
      </Box>
    );
  }

  return (
    <AppProvider
      branding={{
        logo: (<img src="/Cognacare-fav.webp" alt="Logo" /> as any),
        title: (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Grid container>
              <Typography variant="h6" color="#29587e" fontWeight="bold" fontFamily={Montserrat}>Cogna</Typography>
              <Typography variant="h6" color="#83bcb0" fontWeight="bold" fontFamily={Montserrat}>care</Typography>
            </Grid>
            {!!session?.user?.is_founder && (
              <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                <FounderBadge size="small" />
              </Box>
            )}
          </Stack>
        ) as any, // <--- CORREÇÃO AQUI: adicionado 'as any' no fechamento do título
        homeUrl: '/dashboard',
      }}
      session={session}
      authentication={authentication}
      navigation={NAVIGATION}
      theme={demoTheme}
      window={demoWindow}
      router={{
        pathname: location.pathname,
        searchParams: new URLSearchParams(location.search),
        navigate: (path) => navigate(path)
      }}
      localeText={{ accountSignOutLabel: t('sidebar.logout') }}
    >
      {!!session?.user?.is_agent_active && <AlertaGlobalAgente />}

      <Routes>
        <Route path="/login" element={<PublicLayout><Login setIsLoggedIn={() => { }} /></PublicLayout>} />
        <Route path="/" element={<PublicLayout><Login setIsLoggedIn={() => { }} /></PublicLayout>} />
        <Route path="/signup" element={<PublicLayout><Signup /></PublicLayout>} />

        {/* Bypass nas páginas públicas JSX */}
        <Route path="/termos-de-uso" element={<PublicLayout><Termos {...{ readOnly: true } as any} /></PublicLayout>} />
        <Route path="/politica-de-privacidade" element={<PublicLayout><Politicas {...{ readOnly: true } as any} /></PublicLayout>} />
        <Route path="/termos-afiliados" element={<PublicLayout><AfiliadosTermos {...{ readOnly: true, onJoinSuccess: () => { } } as any} /></PublicLayout>} />
        <Route path="/faq" element={<PublicLayout><Faq {...{ readOnly: true } as any} /></PublicLayout>} />
        <Route path="/contato" element={<PublicLayout><Contact /></PublicLayout>} />
        <Route path="/tutorial" element={<PublicLayout><Tutoriais {...{ readOnly: true } as any} /></PublicLayout>} />
        <Route path="/verify-email-instruction" element={<PublicLayout><VerifyEmailInstruction /></PublicLayout>} />
        <Route path="/verify-email" element={<PublicLayout><VerifyEmail verifyEmailResult={verifyEmailResult as any} /></PublicLayout>} />
        <Route path="/forgot-password" element={<PublicLayout><ForgotPassword /></PublicLayout>} />
        <Route path="/reset-password" element={<PublicLayout><ResetPassword /></PublicLayout>} />
        <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />

        <Route element={<ProtectedLayout SidebarFooterAccount={SidebarFooterAccount} session={session} />}>
          <Route path="/perfil" element={<ProtectedRoute session={session}><PerfilEditor session={session as any} onUpdateProfile={handleProfileUpdate} /></ProtectedRoute>} />

          {/* Bypass nas rotas protegidas JSX que recebem propriedades */}
          <Route path="/dashboard" element={<ProtectedRoute session={session}><Dashboard {...{ pathname: location.pathname } as any} /></ProtectedRoute>} />
          <Route path="/criancas" element={<ProtectedRoute session={session}><Crianca criancas={criancas as any} fetchCriancas={fetchCriancas} loadingCriancas={loadingCriancas} /></ProtectedRoute>} />

          <Route path="/pif" element={<ProtectedRoute session={session}><Pif {...{ criancas, loadingCriancas, totalCreditos: creditosPif } as any} /></ProtectedRoute>} />
          <Route path="/pif/cadastro" element={<ProtectedRoute session={session}><PIFCadastro {...{ criancas, loadingCriancas, totalCreditos: creditosPif } as any} /></ProtectedRoute>} />
          <Route path="/pif/registros" element={<ProtectedRoute session={session}><PIFRegistros /></ProtectedRoute>} />
          <Route path="/pif/:id" element={<ProtectedRoute session={session}><PIFCadastro {...{ criancas, loadingCriancas, totalCreditos: creditosPif } as any} /></ProtectedRoute>} />

          <Route path="/chat" element={<ProtectedRoute session={session}>{session && (<Chat usuario={session.user as any} criancas={criancas as any} />)}</ProtectedRoute>} />
          <Route path="/sos" element={<ProtectedRoute session={session}><SOSWrapper criancas={criancas} loading={loadingCriancas} /></ProtectedRoute>} />
          <Route path="/diario-bordo" element={<ProtectedRoute session={session}>{session && (<DiarioBordo criancas={criancas as any} />)}</ProtectedRoute>} />

          <Route path="/rotina-visual" element={<ProtectedRoute session={session}>{session?.user?.is_agent_active ? <VisualRoutineGenerator criancas={criancas as any} /> : <Navigate to="/dashboard" replace />}</ProtectedRoute>} />
          <Route path="/historias-sociais" element={<ProtectedRoute session={session}>{session?.user?.is_agent_active ? <VisualRoutineGenerator criancas={criancas as any} /> : <Navigate to="/dashboard" replace />}</ProtectedRoute>} />
          <Route path="/relatorios" element={<ProtectedRoute session={session}>{session?.user?.is_agent_active ? <RelatorioGerador criancas={criancas as any} /> : <Navigate to="/dashboard" replace />}</ProtectedRoute>} />

          <Route path="/dash-tutorial" element={<ProtectedRoute session={session}><Tutoriais {...{ readOnly: false } as any} /></ProtectedRoute>} />
          <Route path="/glossario" element={<ProtectedRoute session={session}><Glossario /></ProtectedRoute>} />
          <Route path="/financeiro" element={<ProtectedRoute session={session}><Financeiro onPaymentSuccess={() => { fetchCreditos(); checkSession(); fetchCriancas(); }} /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute session={session}>{session?.user?.status === 'admin' ? <Admin /> : <Navigate to="/dashboard" replace />}</ProtectedRoute>} />
          <Route path="/afiliados" element={<ProtectedRoute session={session}>{session?.user?.is_affiliate ? <PainelParceiro /> : <Navigate to="/seja-parceiro" />}</ProtectedRoute>} />
          <Route path="/seja-parceiro" element={<ProtectedRoute session={session}>{!session?.user?.is_affiliate ? <AfiliadosLanding /> : <Navigate to="/afiliados" />}</ProtectedRoute>} />
        </Route>
      </Routes>
    </AppProvider>
  )
};
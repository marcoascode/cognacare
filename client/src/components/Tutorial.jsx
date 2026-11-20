import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Paper,
  Typography,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
} from '@mui/material';
import { ChevronRight } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useTranslation, Trans } from 'react-i18next'; // Importação do i18n

// Componente de Item de Lista para o Tutorial (reutilizável)
const TutorialListItem = ({ primary, secondary, subItems = [] }) => (
  <>
    <ListItem alignItems="flex-start">
      <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
        <ChevronRight color="primary" />
      </ListItemIcon>
      <ListItemText
        primary={<Typography variant="body1" sx={{ fontWeight: 'bold' }}>{primary}</Typography>}
        secondary={secondary}
      />
    </ListItem>
    {subItems.length > 0 && (
      <List sx={{ pl: 4, py: 0, mt: -1 }}>
        {subItems.map((item, index) => (
          <ListItem key={index} sx={{ py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 24 }}>
              <Typography component="span" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>•</Typography>
            </ListItemIcon>
            <ListItemText secondary={item} />
          </ListItem>
        ))}
      </List>
    )}
  </>
);

TutorialListItem.propTypes = {
  primary: PropTypes.node.isRequired,
  secondary: PropTypes.node.isRequired,
  subItems: PropTypes.arrayOf(PropTypes.node),
};


// Componente Principal do Tutorial
const TutorialPIF = () => {
  const { t } = useTranslation(); // Hook de tradução
  const [userName, setUserName] = useState('');

  // Efeito que roda uma vez para buscar o nome do usuário do localStorage
  useEffect(() => {
    const storedName = localStorage.getItem('nome');
    if (storedName) {
      // Pega apenas o primeiro nome para uma saudação mais pessoal
      setUserName(`, ${storedName.split(' ')[0]}`);
    }
  }, []); 

  return (
    <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 } }}>
      {/* O nome do usuário é inserido dinamicamente aqui */}
      <Typography variant="h4" component="h1" gutterBottom>
        {t('dashboard.greeting')}{userName}!
      </Typography>
      <Typography variant="h6" component="h2" color="text.secondary" sx={{ mb: 2 }}>
        {t('dashboard.tutorial_title')}
      </Typography>

      <List>
        <TutorialListItem
          primary={t('dashboard.step1_title')}
          secondary={
            // O componente Trans permite inserir componentes React (como Link) dentro da string traduzida
            // <1> mapeia para o segundo elemento no array components (o Link)
            <Trans i18nKey="dashboard.step1_desc" components={[<strong key="0" />, <Link key="1" component={RouterLink} to="/criancas?tab=cadastrar">Link</Link>]} />
          }
          subItems={[
            t('dashboard.step1_sub')
          ]}
        />
        <Divider variant="inset" component="li" sx={{ ml: 7 }} />
        
        <TutorialListItem
          primary={t('dashboard.step2_title')}
          secondary={t('dashboard.step2_desc')}
          subItems={[
            t('dashboard.step2_sub')
          ]}
        />
        <Divider variant="inset" component="li" sx={{ ml: 7 }} />
        
        <TutorialListItem
          primary={t('dashboard.step3_title')}
          secondary={
             <Trans i18nKey="dashboard.step3_desc" components={[<strong key="0" />, <Link key="1" component={RouterLink} to="/pif?tab=cadastro">Link</Link>]} />
          }
        />
        <Divider variant="inset" component="li" sx={{ ml: 7 }} />
        
        <TutorialListItem
          primary={t('dashboard.step4_title')}
          secondary={t('dashboard.step4_desc')}
        />
        <Divider variant="inset" component="li" sx={{ ml: 7 }} />
        
        <TutorialListItem
          primary={t('dashboard.step5_title')}
          secondary={t('dashboard.step5_desc')}
          subItems={[
            t('dashboard.step5_sub1'),
            t('dashboard.step5_sub2'),
            // Usando Trans para o sub-item com Link
            <Trans i18nKey="dashboard.step5_sub3" key="sub3" components={[<strong key="0" />, <Link key="1" component={RouterLink} to="/pif?tab=registros">Link</Link>]} />,
            t('dashboard.step5_sub4')
          ]}
        />
      </List>
      
      <Divider sx={{ my: 3 }} />
      
      <Typography variant="h6" gutterBottom>
        {t('dashboard.important_links')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Link
          component={RouterLink}
          to="/termos-de-uso" // Caminho relativo é mais seguro dentro do Router
          color="primary"
          underline="hover"
        >
          {t('dashboard.terms_of_use')}
        </Link>
        <Link
          component={RouterLink}
          to="/politica-de-privacidade"
          color="primary"
          underline="hover"
        >
          {t('dashboard.privacy_policy')}
        </Link>
        <Link href="mailto:cognacareapp@gmail.com" color="primary" underline="hover">
          {t('dashboard.contact')}
        </Link>
      </Box>
    </Paper>
  );
};

export default TutorialPIF;
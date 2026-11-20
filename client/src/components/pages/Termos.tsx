import React from 'react';
import {
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  Link,
  Box
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const TermosUso: React.FC = () => {
  const { t } = useTranslation();
  
  const effectiveDate: string = new Date().toLocaleDateString();
  const contactEmail: string = "contact@cognacare.com";
  const supportEmail: string = "support@cognacare.com";
  const comprasEmail: string = "sales@cognacare.com";
  const privacyPolicyUrl: string = "/politica-de-privacidade";
  const cashbackValue: string = "R$ 0,29";

  const simpleSections: number[] = [4, 5, 6, 7, 8, 9, 10, 11];

  return (
    <Container sx={{ maxWidth:'100%', ml: 0, mr: 2, my: 2 }}>
      <Paper elevation={3} sx={{ p: { xs: 3, md: 5 } }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          {t('terms_of_use.title')}
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 4 }}>
          {t('terms_of_use.last_updated', { date: effectiveDate })}
        </Typography>

        <Typography variant="body1" paragraph sx={{ fontStyle: 'italic', mb: 3 }}>
          {t('terms_of_use.intro')} <Link href={privacyPolicyUrl}>{t('dashboard.privacy_policy')}</Link>.
        </Typography>

        {/* Seção 1 */}
        <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 3, fontWeight: 'bold' }}>
          {t('terms_of_use.section1_title')}
        </Typography>
        <Typography variant="body1" paragraph>
          {t('terms_of_use.section1_text')}
        </Typography>
        <Box sx={{ p: 2, borderRadius: 1, border: '1px solid #ffeeba' }}>
          {/* eslint-disable-next-line react/no-danger */}
          <Typography variant="body2" color="text.primary" dangerouslySetInnerHTML={{ __html: t('terms_of_use.section1_disclaimer') }} />
        </Box>

        {/* Seção 2 */}
        <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 3, fontWeight: 'bold' }}>
          {t('terms_of_use.section2_title')}
        </Typography>
        <Typography variant="body1" paragraph>
          {t('terms_of_use.section2_text')}
        </Typography>

        {/* Seção 3 - Créditos e Planos */}
        <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 3, fontWeight: 'bold' }}>
          {t('terms_of_use.section3_title')}
        </Typography>
        <Typography variant="body1" paragraph>
          {t('terms_of_use.section3_intro')}
        </Typography>

        <Box sx={{ pl: 2, borderLeft: '4px solid #1976d2', mb: 2, py: 0.5 }}>
          <Typography variant="subtitle1" fontWeight="bold" color="primary">{t('terms_of_use.section3_pif_title')}</Typography>
          <Typography variant="body2">{t('terms_of_use.section3_pif_text')}</Typography>
        </Box>

        <Box sx={{ pl: 2, borderLeft: '4px solid #4caf50', mb: 2, py: 0.5 }}>
          <Typography variant="subtitle1" fontWeight="bold" color="success.main">{t('terms_of_use.section3_chat_title')}</Typography>
          <Typography variant="body2">{t('terms_of_use.section3_chat_text')}</Typography>
        </Box>

        <Box sx={{ pl: 2, borderLeft: '4px solid #d4af37', mb: 2, py: 0.5 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#d4af37' }}>{t('terms_of_use.section3_bonus_title')}</Typography>
          <Typography variant="body2">{t('terms_of_use.section3_bonus_text', { cashbackValue })}</Typography>
        </Box>

        {/* BLOCO DESTAQUE PARA FUNDADOR (ROXO/PREMIUM) */}
        <Box sx={{ pl: 2, borderLeft: '4px solid #9c27b0', mb: 2, py: 1, bgcolor: 'rgba(156, 39, 176, 0.04)', borderRadius: '0 8px 8px 0' }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#9c27b0' }}>{t('terms_of_use.section3_founder_title')}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {t('terms_of_use.section3_founder_text')}
          </Typography>
        </Box>

        {/* Seções 4 a 11 */}
        {simpleSections.map(num => {
          const disclaimerKey: string = `terms_of_use.section${num}_disclaimer`;
          const disclaimerText: string = t(disclaimerKey);

          // O i18next retorna a própria chave se não achar a tradução.
          // Usamos isso para saber se o disclaimer existe no JSON ou não.
          const hasDisclaimer: boolean = disclaimerText !== disclaimerKey && disclaimerText.trim() !== '';

          return (
            <div key={num}>
              <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 3, fontWeight: 'bold' }}>
                {t(`terms_of_use.section${num}_title`)}
              </Typography>
              <Typography variant="body1" paragraph>
                {t(`terms_of_use.section${num}_text`)}
              </Typography>

              {/* Renderiza o aviso de responsabilidade apenas se ele existir no JSON */}
              {hasDisclaimer && (
                <Box sx={{ p: 2, mb: 3, borderRadius: 1, border: '1px solid #ffcc80', bgcolor: 'rgba(255, 152, 0, 0.05)' }}>
                  {/* eslint-disable-next-line react/no-danger */}
                  <Typography variant="body2" color="text.primary" dangerouslySetInnerHTML={{ __html: disclaimerText }} />
                </Box>
              )}
            </div>
          );
        })}

        {/* Contato (12) */}
        <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 4, fontWeight: 'bold' }}>
          {t('terms_of_use.contact_title')}
        </Typography>
        <List dense>
          <ListItem disableGutters>
            <Typography variant="body1">
              <strong>{t('terms_of_use.contact_general')}</strong>&nbsp; <Link href={`mailto:${contactEmail}`}>{contactEmail}</Link>
            </Typography>
          </ListItem>
          <ListItem disableGutters>
            <Typography variant="body1">
              <strong>{t('terms_of_use.contact_support')}</strong>&nbsp; <Link href={`mailto:${supportEmail}`}>{supportEmail}</Link>
            </Typography>
          </ListItem>
          <ListItem disableGutters>
            <Typography variant="body1">
              <strong>{t('terms_of_use.contact_sales')}</strong>&nbsp; <Link href={`mailto:${comprasEmail}`}>{comprasEmail}</Link>
            </Typography>
          </ListItem>
        </List>
      </Paper>
    </Container>
  );
}

export default TermosUso;
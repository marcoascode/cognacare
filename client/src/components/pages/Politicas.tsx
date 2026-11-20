import React from 'react';
import {
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  Link
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const PoliticaPrivacidade: React.FC = () => {
  const { t } = useTranslation();
  
  const effectiveDate: string = new Date().toLocaleDateString(); 
  const siteUrl: string = "https://pif.cognacare.com";
  const contactEmail: string = "contact@cognacare.com";
  const supportEmail: string = "support@cognacare.com";
  const razaoSocial: string = "Cognacare Tecnologia Ltda.";
  const cnpj: string = "65.640.760/0001-09";

  // Matrizes tipadas para iteração limpa no JSX
  const section2Keys: string[] = ['user_info', 'child_info', 'pif_data', 'chat_history', 'financial', 'usage', 'affiliate'];
  const section3Keys: string[] = ['provide_service', 'legal_obligation', 'legitimate_interest', 'consent_child', 'communication'];
  const section4Keys: string[] = ['providers', 'affiliates', 'legal'];
  const simpleSections: number[] = [5, 6, 7, 8, 9, 10, 11];

  return (
    <Container sx={{ maxWidth:'100%', ml: 0, mr: 2, my: 2 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
          {t('privacy_policy.title')}
        </Typography>
        <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
          {t('privacy_policy.last_updated', { date: effectiveDate })}
        </Typography>

        <Typography variant="body1" paragraph>
          {t('privacy_policy.intro', { siteUrl })}
        </Typography>

        {/* Seção 1 */}
        <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 3, fontWeight: 'bold' }}>
          {t('privacy_policy.section1_title')}
        </Typography>
        <Typography variant="body1" paragraph>
          {t('privacy_policy.section1_text', { razaoSocial, cnpj })}
        </Typography>

        {/* Seção 2 */}
        <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 3, fontWeight: 'bold' }}>
          {t('privacy_policy.section2_title')}
        </Typography>
        <Typography variant="body1" paragraph>{t('privacy_policy.section2_intro')}</Typography>
        <List dense sx={{ listStyleType: 'disc', pl: 4 }}>
          {section2Keys.map(item => (
              <ListItem key={item} sx={{ display: 'list-item' }}>
                  {/* eslint-disable-next-line react/no-danger */}
                  <Typography variant="body1" dangerouslySetInnerHTML={{ __html: t(`privacy_policy.section2_list.${item}`) }} />
              </ListItem>
          ))}
        </List>

        {/* Seção 3 */}
        <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 3, fontWeight: 'bold' }}>
          {t('privacy_policy.section3_title')}
        </Typography>
        <Typography variant="body1" paragraph>{t('privacy_policy.section3_intro')}</Typography>
        <List dense sx={{ listStyleType: 'disc', pl: 4 }}>
          {section3Keys.map(item => (
              <ListItem key={item} sx={{ display: 'list-item' }}>
                  {/* eslint-disable-next-line react/no-danger */}
                  <Typography variant="body1" dangerouslySetInnerHTML={{ __html: t(`privacy_policy.section3_list.${item}`) }} />
              </ListItem>
          ))}
        </List>

        {/* Seção 4 */}
        <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 3, fontWeight: 'bold' }}>
          {t('privacy_policy.section4_title')}
        </Typography>
        <Typography variant="body1" paragraph>{t('privacy_policy.section4_intro')}</Typography>
        <List dense sx={{ listStyleType: 'disc', pl: 4 }}>
          {section4Keys.map(item => (
              <ListItem key={item} sx={{ display: 'list-item' }}>
                  {/* eslint-disable-next-line react/no-danger */}
                  <Typography variant="body1" dangerouslySetInnerHTML={{ __html: t(`privacy_policy.section4_list.${item}`) }} />
              </ListItem>
          ))}
        </List>

        {/* Seções 5 a 11 */}
        {simpleSections.map(num => (
            <div key={num}>
                <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 3, fontWeight: 'bold' }}>
                    {t(`privacy_policy.section${num}_title`)}
                </Typography>
                <Typography variant="body1" paragraph>
                    {t(`privacy_policy.section${num}_text`)}
                </Typography>
            </div>
        ))}

        {/* Contato (12) */}
        <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 3, fontWeight: 'bold' }}>
            {t('privacy_policy.contact_title')}
        </Typography>
        <List dense>
          <ListItem disableGutters>
              <Typography variant="body1">
                  <strong>{t('privacy_policy.contact_general')}</strong> <Link href={`mailto:${contactEmail}`}>{contactEmail}</Link>
              </Typography>
          </ListItem>
          <ListItem disableGutters>
              <Typography variant="body1">
                  <strong>{t('privacy_policy.contact_support')}</strong> <Link href={`mailto:${supportEmail}`}>{supportEmail}</Link>
              </Typography>
          </ListItem>
        </List>
      </Paper>
    </Container>
  );
}

export default PoliticaPrivacidade;
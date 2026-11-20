import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link,
  Stack,
  Divider,
  IconButton
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import YouTubeIcon from '@mui/icons-material/YouTube';
import LanguageSwitcher from './LanguageSwitcher';

const Montserrat = "'Montserrat', sans-serif";

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'background.paper',
        py: 3,
        borderTop: '1px solid',
        borderColor: 'divider',
        mt: 'auto'
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} justifyContent="space-between">

          {/* COLUNA 1: Marca e Tagline */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Link component={RouterLink} to="/" style={{ display: 'inline-block' }} underline="none">
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <img
                  src="/Cognacare-fav.webp"
                  alt="Cognacare Logo"
                  style={{ height: 40, marginRight: 10 }}
                />
                <Typography variant="h6" fontWeight="bold" fontFamily={Montserrat} color="primary">
                  Cognacare
                </Typography>
              </Box>
            </Link>
            <Typography variant="body2" color="text.secondary">
              {t('footer.tagline') as string}
            </Typography>
          </Grid>

          {/* COLUNA 2: Redes Sociais */}
          <Grid size={{ xs: 12, md: 2 }}>
            <Typography variant="subtitle2" color="text.primary" gutterBottom fontWeight="bold">
              {t('footer.social_media') as string}
            </Typography>
            <Stack direction="row" spacing={1}>
              <IconButton size="small" component="a" href="https://www.facebook.com/cognacare" target="_blank" rel="noopener">
                <FacebookIcon />
              </IconButton>
              <IconButton size="small" component="a" href="https://www.instagram.com/cognacare" target="_blank" rel="noopener">
                <InstagramIcon />
              </IconButton>
              <IconButton size="small" component="a" href="https://www.youtube.com/channel/UC9MNt-uiVOViJVjguRNdcNA" target="_blank" rel="noopener">
                <YouTubeIcon />
              </IconButton>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" color="text.primary" gutterBottom fontWeight="bold">
              {t('common.choose_language') as string}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LanguageSwitcher sx={{ border: '1px solid #ccc', borderRadius: '50%', p: 1 }} />
              <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                {t('footer.current_lang') as string}
              </Typography>
            </Box>
          </Grid>

          {/* COLUNA 4: Idioma e Configurações */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="subtitle2" color="text.primary" gutterBottom fontWeight="bold">
              {t('footer.doubt') as string}
            </Typography>
            <Stack spacing={1}>
              <Link component={RouterLink} to="/tutorial" color="text.secondary" underline="hover">
                {t('tutorials.sidebar', 'Tutoriais') as string}
              </Link>
              <Link component={RouterLink} to="/faq" color="text.secondary" underline="hover">
                {t('faq.title', 'Perguntas Frequentes') as string}
              </Link>
              <Link component={RouterLink} to="/contato" color="text.secondary" underline="hover">
                {t('contact.title', 'Fale Conosco') as string}
              </Link>
            </Stack>
          </Grid>

          {/* COLUNA 3: Links Úteis */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Typography variant="subtitle2" color="text.primary" gutterBottom fontWeight="bold">
              {t('footer.legal') as string}
            </Typography>
            <Stack spacing={1}>
              <Link component={RouterLink} to="/termos-de-uso" color="text.secondary" underline="hover">
                {t('dashboard.terms_of_use') as string}
              </Link>
              <Link component={RouterLink} to="/politica-de-privacidade" color="text.secondary" underline="hover">
                {t('dashboard.privacy_policy') as string}
              </Link>
              <Link component={RouterLink} to="/termos-afiliados" color="text.secondary" underline="hover">
                {t('footer.affiliate_terms_link', 'Termos para Parceiros') as string}
              </Link>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4 }} />

        <Grid container alignItems="center" justifyContent="space-between">
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary">
              © {currentYear} Cognacare. {t('footer.rights_reserved') as string}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: { xs: 'left', md: 'right' }, mt: { xs: 2, md: 0 } }}>
            <Typography variant="caption" color="text.secondary">
              {t('footer.made_with_love') as string}
            </Typography>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
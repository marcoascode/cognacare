import React from 'react';
import { 
  Container, 
  Typography, 
  Accordion, 
  AccordionSummary, 
  AccordionDetails, 
  Box, 
  Paper,
  Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';

// --- INTERFACES ---
interface FaqItem {
  question: string;
  answer: string;
}

export default function Faq() {
  const { t } = useTranslation();
  
  // O i18next permite retornar arrays de objetos do JSON usando returnObjects: true
  // Fazemos o casting para FaqItem[] para que o TypeScript reconheça as propriedades no .map()
  const faqItems = (t('faq.items', { returnObjects: true }) as FaqItem[]) || [];

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" component="h1" fontWeight="bold" color="primary" gutterBottom>
          {t('faq.title')}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {t('faq.subtitle')}
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ bgcolor: 'transparent' }}>
        {Array.isArray(faqItems) && faqItems.map((item, index) => (
          <Accordion 
            key={index} 
            sx={{ 
              mb: 2, 
              borderRadius: '8px !important',
              '&:before': { display: 'none' },
              boxShadow: '0px 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon color="primary" />}
              sx={{ '& .MuiAccordionSummary-content': { my: 2 } }}
            >
              <Typography variant="subtitle1" fontWeight="bold" color="text.primary">
                {item.question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ bgcolor: 'background.default', p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                {item.answer}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>

      {/* Bloco de Call to Action para Contato */}
      <Box sx={{ mt: 8, p: 4, textAlign: 'center', bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 2 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          {t('faq.still_have_questions')}
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          {t('faq.contact_prompt')}
        </Typography>
        <Button 
          component={RouterLink}
          to="/contato"
          variant="contained"
          color="secondary"
          size="large"
          sx={{ fontWeight: 'bold' }}
        >
          {t('faq.contact_button')}
        </Button>
      </Box>
    </Container>
  );
}
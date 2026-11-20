import React from 'react';
import {
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Grid,
  Divider
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

// --- INTERFACES ---
interface FormStepProps {
  stepTitle: string;
  items: any[]; // Array flexível devido aos múltiplos formatos de steps
  formData?: Record<string, any>;
  handleCheckboxChange: (stepTitle: string, value: string) => void;
  handleRadioChange?: (stepTitle: string, value: string) => void;
}

const FormStep: React.FC<FormStepProps> = ({ 
    stepTitle, 
    items, 
    formData = {}, 
    handleCheckboxChange 
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const firstItem = Array.isArray(items) && items.length > 0 ? items[0] : null;

  // 1. Renderiza layout para AVDs (Atividades de Vida Diária)
  if (firstItem && firstItem.isAVD) {
    return (
      <Grid container>
        <Typography variant="h6" gutterBottom color="primary">{t(stepTitle)}</Typography>
        
        {items.map((grupo: any) => (
          <Box key={grupo.category} sx={{ width: '100%', mb: 3 }}>
            <Typography variant="h6" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), p: 1, borderRadius: 1, mb: 2 }}>
              {t(grupo.category)}
            </Typography>
            
            {grupo.questions.map((q: any) => (
              <Box key={q.id} sx={{ mb: 3, pl: 2, borderLeft: '3px solid #1976d2' }}>
                {/* Título da Pergunta (ex: Banho, Vestir-se) */}
                <Typography sx={{ fontWeight: 'bold', mb: 1 }}>
                    {t(q.label)}
                </Typography>

                <FormGroup>
                    {q.options.map((opt: any) => (
                      <FormControlLabel
                        key={opt.value}
                        control={
                            <Checkbox
                                checked={formData[opt.value] === true}
                                onChange={() => handleCheckboxChange(stepTitle, opt.value)}
                            />
                        }
                        label={
                          <Typography>
                            {t(opt.label)}
                          </Typography>
                        }
                        sx={{ mb: 0.5, alignItems: 'flex-start', '& .MuiCheckbox-root': { pt: 0.5 } }} 
                      />
                    ))}
                </FormGroup>
                <Divider sx={{ mt: 2 }} />
              </Box>
            ))}
          </Box>
        ))}
      </Grid>
    );
  }

  // 2. Renderiza layout com Fases do Brincar (Checkboxes)
  if (firstItem && firstItem.level) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>{t(stepTitle)}</Typography>
        {items.map((nivel: any) => (
          <Box key={nivel.level} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              {t(nivel.level)}
            </Typography>
            <FormGroup>
              {nivel.questions.map((question: string) => (
                <div key={question}>
                    <FormControlLabel
                        sx={{ mt: 1 }}
                        control={
                            <Checkbox
                                checked={formData[question] === true}
                                onChange={() => handleCheckboxChange(stepTitle, question)}
                            />
                        }
                        label={t(question)}
                    />
                    <Divider sx={{ mt: 1 }} />
                </div>
              ))}
            </FormGroup>
          </Box>
        ))}
      </Box>
    );
  }

  // 3. Renderiza layout com Marcos do Desenvolvimento (Checkboxes)
  if (firstItem && firstItem.milestone) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>{t(stepTitle)}</Typography>
        {items.map((group: any) => (
          <Box key={group.milestone} sx={{ p: 2, mb: 2, border: '1px solid #595959ff', borderRadius: 5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              {t('expectedfor')} {t(group.milestone)}
            </Typography>
            <FormGroup>
              {group.abilities.map((ability: string) => (
                <FormControlLabel
                  key={ability}
                  control={
                    <Checkbox
                      checked={formData[ability] || false}
                      onChange={() => handleCheckboxChange(stepTitle, ability)}
                    />
                  }
                  label={t(ability)}
                />
              ))}
            </FormGroup>
          </Box>
        ))}
      </Box>
    );
  }
  
  // 4. Padrão (Lista Simples)
  return (
    <>
      <Typography variant="h6">{t(stepTitle)}</Typography>
      <FormGroup>
        {items.map((item: string) => (
          <FormControlLabel
            key={item}
            control={
              <Checkbox
                checked={formData[item] || false}
                onChange={() => handleCheckboxChange(stepTitle, item)}
              />
            }
            label={t(item)}
          />
        ))}
      </FormGroup>
    </>
  );
};

export default FormStep;
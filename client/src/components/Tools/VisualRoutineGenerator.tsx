import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Card,
  CardContent
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import api from '../../api/axiosConfig';

const VisualRoutineGenerator: React.FC = () => {
  const { t, i18n } = useTranslation();
  
  // Título (opcional, para o cabeçalho do PDF)
  const [routineTitle, setRoutineTitle] = useState<string>('');
  
  // O tema principal (Ex: "Tomar Banho")
  const [topic, setTopic] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  const handleGenerate = async () => {
    setError('');
    setSuccess(false);

    if (!topic.trim()) {
      setError(t('visual_routine.error_empty') || "Por favor, descreva a atividade.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/fernandasepe/gerar-rotina', {
        titulo: routineTitle,
        tema: topic, // Enviamos o TEMA para a IA quebrar em passos
        lang: i18n.language
      }, {
        responseType: 'blob' 
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fileName = `Rotina_${(routineTitle || topic).replace(/\s/g, '_')}.pdf`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link); // Removido de forma segura do body
      window.URL.revokeObjectURL(url);

      setSuccess(true);

    } catch (err: any) {
      console.error(err);
      setError('Erro ao conectar com o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
        elevation={3}
        sx={{
        maxWidth: '800px',
        mx: 'auto',
        p: 4,
        mt: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 3
        }}
    >
      
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
          {t('visual_routine.title') || "Gerador de Rotinas Visuais"}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('visual_routine.subtitle_ai') || "Digite uma atividade (ex: 'Tomar Banho', 'Ir para a Escola') e nossa IA criará o passo a passo visual automaticamente."}
        </Typography>
      </Box>

      <Card variant="outlined" sx={{ bgcolor: '#f8f9fa' }}>
        <CardContent>
            <Stack spacing={3}>
                <TextField
                label={t('visual_routine.input_title_label') || "Título Personalizado (Opcional)"}
                placeholder={t('visual_routine.input_title_placeholder') || "Ex: Rotina da Manhã do João"}
                value={routineTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoutineTitle(e.target.value)}
                fullWidth
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                />

                <TextField
                label={t('visual_routine.input_topic_label') || "Qual atividade você quer detalhar?"}
                placeholder="Ex: Escovar os dentes, Tomar banho, Se arrumar para sair..."
                value={topic}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTopic(e.target.value)}
                fullWidth
                required
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                helperText="A IA vai dividir essa atividade em passos simples e buscar as imagens."
                />
            </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">
          {t('visual_routine.success_msg') || "Rotina gerada! Verifique seu download e seu e-mail."}
      </Alert>}

      <Button
        variant="contained"
        size="large"
        onClick={handleGenerate}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <AutoFixHighIcon />}
        sx={{ py: 2, fontSize: '1.1rem', fontWeight: 'bold' }}
      >
        {loading ? (t('visual_routine.generating') || "A IA está criando a rotina...") : (t('visual_routine.generate_btn_ai') || "Gerar Rotina Automática")}
      </Button>

    </Paper>
  );
};

export default VisualRoutineGenerator;
import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Autocomplete, 
  TextField,
  Divider
} from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { useTranslation } from 'react-i18next';

// --- INTERFACE PARA TIPAGEM DOS VÍDEOS ---
interface IVideoTutorial {
  id: number;
  videoId: string;
  title: string;
  description: string;
}

// Estrutura de dados dos vídeos. 
// Você deve substituir o 'videoId' pelo código real do seu vídeo no YouTube.
const VIDEO_LIST: IVideoTutorial[] = [
  { 
    id: 1, 
    videoId: 'XZdWYJ8I8KU', // Exemplo de ID do YouTube
    title: 'Como se cadastrar no Cognacare',
    description: 'Aprenda o passo a passo cadastrar e verificar sua conta.'
  },
  { 
    id: 2, 
    videoId: 'xsr1c3Zw5yo', 
    title: 'Como cadastrar uma criança no Cognacare',
    description: 'Aprenda o passo a passo para preencher o perfil da criança e entender o painel.'
  },
  { 
    id: 3, 
    videoId: '2z6_TZaKQzo', 
    title: 'Gerando o seu primeiro PIF',
    description: 'Veja como a Inteligência Artificial cria o Plano de Intervenção Familiar.'
  },
  { 
    id: 4, 
    videoId: 'TIxwNJxKbFI', 
    title: 'Faça o monitoramento diário da criança com o Diário de Bordo',
    description: 'Registre os avanços e desafios da criança no dia a dia.'
  },
  { 
    id: 5, 
    videoId: 'rE4zvMB2sK4', 
    title: 'Como utilizar o Assistente PIF',
    description: 'Dicas para conversar com a IA e obter ideias rápidas de regulação emocional.'
  }
];

export default function Tutoriais() {
  const { t } = useTranslation();
  
  // Estado para guardar o vídeo selecionado no Autocomplete, tipado com a interface ou null
  const [videoSelecionado, setVideoSelecionado] = useState<IVideoTutorial | null>(VIDEO_LIST[0]);

  return (
    <Container maxWidth="lg" sx={{ py: 1 }}>
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" color="primary" gutterBottom>
          {t('tutorials.title') as string || 'Tutoriais em Vídeo'}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {t('tutorials.subtitle') as string || 'Aprenda a utilizar todos os recursos do Cognacare.'}
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2 }}>
        
        {/* Campo de Pesquisa com Autocomplete */}
        <Autocomplete
          id="pesquisa-tutoriais"
          options={VIDEO_LIST}
          getOptionLabel={(option: IVideoTutorial) => option.title}
          value={videoSelecionado}
          onChange={(event: React.SyntheticEvent, newValue: IVideoTutorial | null) => {
            setVideoSelecionado(newValue);
          }}
          isOptionEqualToValue={(option: IVideoTutorial, value: IVideoTutorial) => option.id === value?.id}
          renderInput={(params) => (
            <TextField 
              {...params} 
              label={t('tutorials.search_label') as string || 'Pesquisar tutorial...'} 
              variant="outlined" 
              fullWidth
            />
          )}
          renderOption={(props, option: IVideoTutorial) => {
            // Extração segura da 'key' para evitar warnings de React e TypeScript no MUI v5/v6
            const { key, ...otherProps } = props as any;
            return (
              <li key={key || option.id} {...otherProps}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                  <PlayCircleOutlineIcon color="primary" />
                  <Box>
                    <Typography variant="body1" fontWeight="bold">{option.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.description}
                    </Typography>
                  </Box>
                </Box>
              </li>
            );
          }}
          noOptionsText={t('tutorials.no_options') as string || 'Nenhum tutorial encontrado'}
          sx={{ mb: 4 }}
        />

        <Divider sx={{ mb: 2 }} />

        {/* Área de Exibição do Vídeo (Iframe) */}
        {videoSelecionado ? (
          <Box sx={{ width: '100%' }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom color="primary.dark">
              {videoSelecionado.title}
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {videoSelecionado.description}
            </Typography>
            
            {/* O Wrapper responsivo para o iframe manter a proporção 16:9 */}
            <Box 
              sx={{ 
                width: '100%', 
                aspectRatio: '16/9', 
                bgcolor: 'black', 
                borderRadius: 2, 
                overflow: 'hidden',
                boxShadow: 3
              }}
            >
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoSelecionado.videoId}?rel=0`}
                title={videoSelecionado.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ display: 'block' }}
              ></iframe>
            </Box>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <PlayCircleOutlineIcon sx={{ fontSize: 60, opacity: 0.3, mb: 2 }} />
            <Typography variant="h6">
              {t('tutorials.select_prompt') as string || 'Selecione um vídeo na lista acima para começar a assistir.'}
            </Typography>
          </Box>
        )}

      </Paper>
    </Container>
  );
}
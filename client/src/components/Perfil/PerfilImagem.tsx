import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Avatar, Button, Alert, CircularProgress, Stack, AlertColor } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import api from '../../api/axiosConfig';
import { useTranslation } from 'react-i18next';

// --- INTERFACES ---
interface UserSession {
  image?: string;
  name?: string;
  email?: string;
  [key: string]: any; // Permite propriedades extra que possam existir no objeto do utilizador
}

interface PerfilImagemProps {
  session?: {
    user?: UserSession;
  };
  onUpdateProfile?: (updatedUser: UserSession) => void;
}

interface AlertMessage {
  type: AlertColor;
  text: string;
}

const PerfilImagem: React.FC<PerfilImagemProps> = ({ session, onUpdateProfile }) => {
  const { t } = useTranslation();

  // BASE URL do servidor
  const API_URL: string = (import.meta.env.VITE_API_BASE_URL as string) || '';
  
  // A função está envolvida num useCallback para a estabilizar e evitar renderizações desnecessárias
  const getImageUrl = useCallback((imgData?: string | null): string => {
    if (!imgData) return '/profile.png';
    
    // Se for preview local (blob) ou já for uma URL completa (http), retorna direto
    if (imgData.startsWith('blob:') || imgData.startsWith('http')) {
        return imgData;
    }

    // Se vier só o nome do arquivo ou caminho relativo, monta a URL absoluta
    const cleanName = imgData.replace(/^\/|uploads\//g, '');
    
    // Remove o '/api' do final da BASE_URL se existir
    const baseUrlSemApi = API_URL.replace(/\/api$/, ''); 
    
    return `${baseUrlSemApi}/uploads/${cleanName}`;
  }, [API_URL]); 

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Inicializa o preview
  const [preview, setPreview] = useState<string>(getImageUrl(session?.user?.image));
  
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<AlertMessage | null>(null);

  useEffect(() => {
    setPreview(getImageUrl(session?.user?.image));
  }, [session?.user?.image, getImageUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Limite de 2MB
        setMessage({ type: 'error', text: t('profile.photo_error') });
        return;
      }
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file)); // Preview imediato local
      setMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('foto', selectedFile);

    setLoading(true);
    setMessage(null);

    try {
      const response = await api.post('/fernandasepe/usuario/foto-perfil', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Atualiza o contexto global do utilizador com a nova foto
      if (onUpdateProfile && session?.user) {
        onUpdateProfile({ 
            ...session.user, 
            image: response.data.foto_perfil 
        });
      }

      setMessage({ type: 'success', text: t('profile.photo_succcess') });
      setSelectedFile(null); 
      
      // Atualiza o preview final com a URL do servidor
      setPreview(getImageUrl(response.data.foto_perfil));

    } catch (error: any) {
      console.error('Erro no upload:', error);
      setMessage({ type: 'error', text: t('profile.photo_error2') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, p: 2 }}>
        <Box sx={{ position: 'relative' }}>
          <Avatar
            alt={session?.user?.name || "Usuário"}
            src={preview}
            sx={{ width: 240, height: 240, border: '4px solid white', boxShadow: 3 }}
            key={preview}
            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                e.currentTarget.onerror = null; 
                e.currentTarget.src = '/profile.png';
            }}
          />
          {loading && (
            <CircularProgress
              size={240}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                color: 'primary.main',
                zIndex: 1,
              }}
            />
          )}
        </Box>

        <Box sx={{ textAlign: 'center' }}>
           <Typography variant="h6">{session?.user?.name}</Typography>
           <Typography variant="body2" color="text.secondary">{session?.user?.email}</Typography>
        </Box>

        <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'center' }}>
            <Button
              component="label"
              variant="contained"
              startIcon={<CloudUploadIcon />}
              disabled={loading}
            >
              {t('profile.choose')}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleFileChange}
              />
            </Button>
        </Stack>

        {selectedFile && (
           <Button 
             variant="contained" 
             onClick={handleUpload} 
             disabled={loading}
             fullWidth
             color="primary"
           >
             {loading ? t('contact.sending') : t('common.save')}
           </Button>
        )}

        {message && (
          <Alert severity={message.type} sx={{ width: '100%' }}>
            {message.text}
          </Alert>
        )}
    </Box>
  );
};

export default PerfilImagem;
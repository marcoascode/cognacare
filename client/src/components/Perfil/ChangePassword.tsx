import React, { useState } from 'react';
import {
  Button,
  TextField,
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  Alert,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import api from '../../api/axiosConfig';
import { useTranslation } from 'react-i18next';

// --- INTERFACES ---
interface ChangePasswordProps {
  onClose?: () => void;
}

interface FormDataState {
  senhaAtual: string;
  novaSenha: string;
  confirmaSenha: string;
}

const ChangePassword: React.FC<ChangePasswordProps> = ({ onClose }) => {
  const { t } = useTranslation();

  const [formData, setFormData] = useState<FormDataState>({ 
    senhaAtual: '', 
    novaSenha: '', 
    confirmaSenha: '' 
  });
  
  // Tipamos dinamicamente com base nas chaves do FormDataState
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTogglePasswordVisibility = (field: keyof FormDataState) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (formData.novaSenha !== formData.confirmaSenha) {
      setError(t('errosenha') || 'As senhas não coincidem');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/fernandasepe/usuario/alterar-senha', {
        senhaAtual: formData.senhaAtual,
        novaSenha: formData.novaSenha,
      }); 
      setMessage(response.data.mensagem);
      setFormData({ senhaAtual: '', novaSenha: '', confirmaSenha: '' });
      
      // Fecha o modal após 2 segundos de sucesso
      setTimeout(() => {
        if (onClose) onClose();
      }, 2000);

    } catch (err: any) {
      setError(err.response?.data?.erro || t('errorpwdchange') || 'Erro ao alterar senha');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <TextField
        label={t('currentpwd') || 'Senha Atual'}
        name="senhaAtual"
        type={showPasswords.senhaAtual ? 'text' : 'password'}
        value={formData.senhaAtual}
        onChange={handleChange}
        fullWidth required
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => handleTogglePasswordVisibility('senhaAtual')}>
                {showPasswords.senhaAtual ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <TextField
        label={t('newpwd') || 'Nova Senha'}
        name="novaSenha"
        type={showPasswords.novaSenha ? 'text' : 'password'}
        value={formData.novaSenha}
        onChange={handleChange}
        fullWidth required
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => handleTogglePasswordVisibility('novaSenha')}>
                {showPasswords.novaSenha ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <TextField
        label={t('confirmnewpwd') || 'Confirmar Nova Senha'}
        name="confirmaSenha"
        type={showPasswords.confirmaSenha ? 'text' : 'password'}
        value={formData.confirmaSenha}
        onChange={handleChange}
        fullWidth required
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => handleTogglePasswordVisibility('confirmaSenha')}>
                {showPasswords.confirmaSenha ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      
      {error && <Alert severity="error">{error}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}
      
      <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading} sx={{ mt: 1 }}>
        {loading ? <CircularProgress size={24} color="inherit" /> : (t('savenewpwd') || 'Salvar Nova Senha')}
      </Button>
    </Box>
  );
};

export default ChangePassword;
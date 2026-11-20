import React, { useState } from 'react';
import {
  Container, Typography, Paper, Box, Button, Checkbox, FormControlLabel,
  List, ListItem, ListItemText, Alert, Divider, TextField, Link,
  Select, MenuItem, IconButton, Tooltip, Grid, SelectChangeEvent
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/axiosConfig'; 
import HandshakeIcon from '@mui/icons-material/Handshake';
import ConnectWithoutContactIcon from '@mui/icons-material/ConnectWithoutContact';
import FavoriteIcon from '@mui/icons-material/Favorite';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

// --- INTERFACES ---
interface AfiliadosTermosProps {
  onJoinSuccess?: () => void;
  readOnly?: boolean;
}

interface SocialNetwork {
  platform: string;
  username: string;
}

export default function AfiliadosTermos({ onJoinSuccess, readOnly = false }: AfiliadosTermosProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const razaoSocial = "Cognacare Tecnologia Ltda.";
  const cnpj = "65.640.760/0001-09";

  const plataformas: string[] = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'LinkedIn', 'X (Twitter)', t('affiliate_terms.other', 'Outro (Site/Blog)')];

  const [accepted, setAccepted] = useState<boolean>(false);
  const [relacaoCausa, setRelacaoCausa] = useState<string>('');
  const [redesSociais, setRedesSociais] = useState<SocialNetwork[]>([{ platform: 'Instagram', username: '' }]);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  const handleRedeChange = (index: number, field: keyof SocialNetwork, value: string) => {
      const novasRedes = [...redesSociais];
      novasRedes[index][field] = value;
      setRedesSociais(novasRedes);
      setError('');
  };

  const handleAddRede = () => setRedesSociais([...redesSociais, { platform: 'TikTok', username: '' }]);
  
  const handleRemoveRede = (index: number) => {
      if (redesSociais.length > 1) {
          setRedesSociais(redesSociais.filter((_, i) => i !== index));
      }
  };

  const handleJoin = async () => {
    if (!accepted) return;
    const redesValidas = redesSociais.filter(r => r.username.trim() !== '');

    if (redesValidas.length === 0 || !relacaoCausa.trim()) {
        setError(t('affiliate_terms.error'));
        return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/fernandasepe/parceiro/join', {
        redes_sociais: JSON.stringify(redesValidas),
        relacao_causa: relacaoCausa
      });
      setSuccess(true);
      if (onJoinSuccess) { 
          setTimeout(() => { onJoinSuccess(); }, 3000); 
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao enviar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  const effectiveDate = new Date().toLocaleDateString();

  return (
    <Container maxWidth='lg' sx={{ mt: 4, mb: 8 }}>
      <Paper elevation={readOnly ? 0 : 3} sx={{ p: { xs: 3, md: 5 }, borderTop: readOnly ? 'none' : '6px solid #1976d2' }}>
        
        {/* CABEÇALHO */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <HandshakeIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" component="h1" align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {t('affiliate_terms.title')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
            {t('affiliate_terms.last_updated', { date: effectiveDate })}
            </Typography>
        </Box>

        <Typography variant="body1" paragraph sx={{ fontStyle: 'italic', mb: 3, bgcolor: alpha(theme.palette.success.main, 0.1), color: 'primary.main', p: 2, borderRadius: 1 }}>
           {t('affiliate_terms.intro', { razaoSocial: razaoSocial, cnpj: cnpj })}
        </Typography>

        {/* CONTEÚDO JURÍDICO DINÂMICO (12 Seções) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'justify' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                <section key={num}>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                        {t(`affiliate_terms.section${num}_title`)}
                    </Typography>
                    
                    {/* A seção 4 possui uma introdução e uma lista */}
                    {num === 4 ? (
                        <>
                            <Typography variant="body2" gutterBottom>
                                {t('affiliate_terms.section4_intro')}
                            </Typography>
                            <List dense sx={{ listStyleType: 'disc', pl: 4 }}>
                                {[1, 2, 3, 4, 5].map((itemNum) => (
                                    <ListItem key={itemNum} sx={{ display: 'list-item', p: 0 }}>
                                        <ListItemText 
                                            primary={
                                                itemNum === 5 
                                                ? <Typography variant="body2" component="span" fontWeight="bold" color="error">{t(`affiliate_terms.section4_list.item${itemNum}`)}</Typography>
                                                : t(`affiliate_terms.section4_list.item${itemNum}`)
                                            } 
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </>
                    ) : (
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                            {t(`affiliate_terms.section${num}_text`)}
                        </Typography>
                    )}
                </section>
            ))}
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* FORMULÁRIO DE CANDIDATURA */}
        {!readOnly && !success && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Paper variant="outlined" sx={{ p: 3, bgcolor: alpha(theme.palette.info.main, 0.05), borderColor: 'info.main' }}>
                    <Typography variant="h6" gutterBottom fontWeight="bold" color="info.main" display="flex" alignItems="center" gap={1}>
                        <ConnectWithoutContactIcon /> {t('affiliate_terms.profile')}
                    </Typography>
                    
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                        <Grid size={12}>
                            <Typography variant="subtitle2" fontWeight="bold">
                                {t('affiliate_terms.form_social_title')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                {t('affiliate_terms.form_social_desc')}
                            </Typography>
                            <Typography variant="caption" color="primary" display="block" mb={2}>
                                {t('affiliate_terms.where_find')}
                            </Typography>
                            
                            {redesSociais.map((rede, index) => (
                                <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                                    <Select
                                        size="small"
                                        value={rede.platform}
                                        onChange={(e: SelectChangeEvent<string>) => handleRedeChange(index, 'platform', e.target.value)}
                                        sx={{ width: { xs: '100%', sm: 150 }, bgcolor: 'background.paper' }}
                                    >
                                        {plataformas.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                                    </Select>
                                    <TextField 
                                        size="small"
                                        fullWidth
                                        placeholder={rede.platform.includes('Outro') ? "https://seusite.com" : t('affiliate_terms.form_social_placeholder')}
                                        value={rede.username}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleRedeChange(index, 'username', e.target.value)}
                                        sx={{ bgcolor: 'background.paper' }}
                                    />
                                    <Tooltip title="Remover">
                                        <span>
                                            <IconButton color="error" onClick={() => handleRemoveRede(index)} disabled={redesSociais.length === 1}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </Box>
                            ))}
                            <Button size="small" startIcon={<AddCircleOutlineIcon />} onClick={handleAddRede} sx={{ mt: 1 }}>
                                +
                            </Button>
                        </Grid>

                        <Grid size={12}>
                            <Typography variant="subtitle2" fontWeight="bold" display="flex" alignItems="center" gap={0.5}>
                                <FavoriteIcon fontSize="small" color="error" /> {t('affiliate_terms.form_cause_title')}
                            </Typography>
                            <TextField 
                                fullWidth
                                multiline
                                rows={3}
                                value={relacaoCausa}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { setRelacaoCausa(e.target.value); setError(''); }}
                                placeholder={t('affiliate_terms.form_cause_placeholder')}
                                sx={{ mt: 1, bgcolor: 'background.paper' }}
                            />
                        </Grid>
                    </Grid>
                </Paper>

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <FormControlLabel
                        control={
                            <Checkbox 
                                checked={accepted} 
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccepted(e.target.checked)} 
                                color="primary" 
                            />
                        }
                        label={
                            <Typography variant="body1" fontWeight="bold">
                                {t('affiliate_terms.accept_a')}
                                <Link component={RouterLink} to="/termos-afiliados" target="_blank" sx={{ color: 'primary.main', textDecoration: 'underline', mx: 0.5 }}>
                                    {t('affiliate_terms.accept_b')}
                                </Link>.
                            </Typography>
                        }
                    />

                    {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}

                    <Button 
                        variant="contained" 
                        size="large" 
                        disabled={!accepted || loading}
                        onClick={handleJoin}
                        sx={{ px: 5, py: 1.5, fontSize: '1.1rem' }}
                    >
                        {loading ? t('affiliate_terms.processing') : t('affiliate_terms.join_button')}
                    </Button>
                </Box>
            </Box>
        )}

        {success && (
            <Alert severity="success" sx={{ mt: 3, fontSize: '1.1rem', display: 'flex', justifyContent: 'center' }}>
                {t('affiliate_terms.success_msg')}
            </Alert>
        )}

        {readOnly && (
             <Box sx={{ display: 'flex', justifyContent: 'center', pb: 4 }}>
                <Typography variant="caption" color="text.secondary">{t('affiliate_terms.public_doc')}</Typography>
            </Box>
        )}
      </Paper>
    </Container>
  );
}
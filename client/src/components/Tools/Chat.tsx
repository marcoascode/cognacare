import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Paper, Typography, TextField, IconButton, CircularProgress,
  Alert, FormControl, InputLabel, Select, MenuItem, Chip, Button,
  SelectChangeEvent
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import { useTranslation } from 'react-i18next';
import { ICrianca } from '../../../../Shared';

// --- INTERFACES ---
interface IMessage {
  id: number;
  remetente: 'usuario' | 'ia' | string;
  mensagem: string;
  criado_em?: string;
}

interface MessageProps {
  message: IMessage;
}

interface IChatUser {
  chat_mensagens_restantes?: number;
  [key: string]: any;
}

interface ChatProps {
  usuario: IChatUser;
  criancas?: ICrianca[];
}

// --- SUB-COMPONENTE: MESSAGE ---
const Message: React.FC<MessageProps> = ({ message }) => {
  const isUsuario = message.remetente === 'usuario';
  
  // Pegamos a função de tradução para usar no texto de carregamento (caso exista)
  const { t } = useTranslation(); 

  return (
    <Paper
      elevation={3}
      sx={{
        p: 1.5, mb: 1, maxWidth: '80%',
        alignSelf: isUsuario ? 'flex-end' : 'flex-start',
        bgcolor: isUsuario ? 'primary.main' : 'background.paper',
        color: isUsuario ? 'primary.contrastText' : 'text.primary',
        borderRadius: isUsuario ? '20px 4px 20px 20px' : '4px 20px 20px 20px',
        border: isUsuario ? '1px solid #595959ff' : '',
        // Regras para garantir a quebra de palavra e evitar transbordamento geral
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        '& h1, & h2, & h3': { typography: 'h6', mt: 1, mb: 1 },
        '& p': { typography: 'body1', mb: 0.5 },
        '& ul, & ol': { pl: 2.5, mb: 1 },
        '& li': { mb: 0.5 },
        // CORREÇÃO: Forçar a quebra de linha dentro das tags de código (<code> e <pre>)
        '& code': {
          whiteSpace: 'pre-wrap !important',
          wordBreak: 'break-word !important',
          overflowWrap: 'break-word !important',
          backgroundColor: isUsuario ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.04)',
          padding: '2px 4px',
          borderRadius: '4px',
          fontFamily: 'monospace',
        },
        '& pre': {
          whiteSpace: 'pre-wrap !important',
          wordBreak: 'break-word !important',
          overflowWrap: 'break-word !important',
          maxWidth: '100%',
          overflowX: 'auto', // Permite scroll horizontal apenas dentro do bloco de código, se necessário
          backgroundColor: isUsuario ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.04)',
          padding: '8px',
          borderRadius: '4px',
        }
      }}
    >
      {isUsuario ? (
        <Typography variant="body1">{message.mensagem}</Typography>
      ) : (
        /* Se a mensagem da IA estiver vazia, mostra a animação. Senão, mostra o texto. */
        message.mensagem === '' ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 0.5 }}>
            <CircularProgress size={16} color="inherit" />
            <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.8 }}>
              {t('typing') || 'Analisando o PIF e escrevendo...'}
            </Typography>
          </Box>
        ) : (
          <ReactMarkdown>{message.mensagem}</ReactMarkdown>
        )
      )}
    </Paper>
  );
};

// --- COMPONENTE PRINCIPAL: CHAT ---
export default function Chat({ usuario, criancas = [] }: ChatProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [selectedCriancaId, setSelectedCriancaId] = useState<number | string>('');
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isChatLocked, setIsChatLocked] = useState<boolean>(false);
  const [lockReason, setLockReason] = useState<string>('');
  const [chatSaldo, setChatSaldo] = useState<number>(usuario?.chat_mensagens_restantes || 0);

  const messageListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (usuario?.chat_mensagens_restantes !== undefined) {
      setChatSaldo(usuario.chat_mensagens_restantes);
    }
  }, [usuario]);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  const handleChildSelect = useCallback(async (event: SelectChangeEvent<number | string>) => {
    const criancaId = event.target.value;
    setSelectedCriancaId(criancaId);
    setMessages([]);
    setError('');
    setIsChatLocked(false);
    setLockReason('');

    if (!criancaId) return;
    setIsLoadingHistory(true);

    try {
      // 1. Verifica Validade do PIF
      let pifValido = false;
      try {
        const pifResponse = await api.get(`/fernandasepe/plano-familiar/ultimo/${criancaId}`);
        const ultimoPif = pifResponse.data;

        if (ultimoPif && ultimoPif.criado_em) {
          const dataPif = new Date(ultimoPif.criado_em);
          const hoje = new Date();
          const diffTime = Math.abs(hoje.getTime() - dataPif.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 90) {
            pifValido = true;
          } else {
            setLockReason(`${t('lastpif')}${diffDays}${t('piflimit')}`);
          }
        } else {
          setLockReason(t('kidnopif') as string);
        }
      } catch (err: any) {
        if (err.response && err.response.status === 404) {
          setLockReason(t('kidnopif') as string);
        } else {
          console.error(t('piferror'), err);
          setError(t('pifexperror') as string);
          setIsLoadingHistory(false);
          return;
        }
      }

      if (!pifValido) {
        setIsChatLocked(true);
        setIsLoadingHistory(false);
        return;
      }

      // 2. Busca Histórico
      const response = await api.get(`/chat/historico/${criancaId}`);
      setMessages(response.data);
    } catch (err: any) {
      setError(err.response?.data?.erro || t('histerror'));
    } finally {
      setIsLoadingHistory(false);
    }
  }, [t]);

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = currentMessage.trim();
    if (!trimmedMessage || isSendingMessage || !selectedCriancaId || isChatLocked) return;

    setIsSendingMessage(true);
    setError('');
    const token = localStorage.getItem('token'); 

    // 1. Adiciona mensagem do usuário na UI
    const userMsg: IMessage = { 
      id: Date.now(), 
      remetente: 'usuario', 
      mensagem: trimmedMessage, 
      criado_em: new Date().toISOString() 
    };
    setMessages((prev) => [...prev, userMsg]);
    setCurrentMessage('');

    // 2. Cria placeholder para mensagem da IA (Streaming)
    const iaMsgId = Date.now() + 1;
    setMessages((prev) => [...prev, { id: iaMsgId, remetente: 'ia', mensagem: '' }]);

    try {
      // Usamos fetch nativo para suportar stream
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_crianca: selectedCriancaId,
          mensagem: trimmedMessage,
        }),
      });

      if (!response.ok) {
        // Tenta ler o erro JSON, se houver
        let errorMsg = t('chaterror') as string;
        try {
          const errData = await response.json();
          errorMsg = errData.erro || errorMsg;
        } catch (e) {
          console.error(e);
        }
        throw new Error(errorMsg); 
      }

      if (!response.body) {
         throw new Error("Resposta de rede inválida (sem corpo).");
      }

      // Leitor de Stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
           const chunkValue = decoder.decode(value, { stream: true });
           fullText += chunkValue;
        }

        // Atualiza a última mensagem (IA) com o texto acumulado
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMsgIndex = newMessages.findIndex(m => m.id === iaMsgId);
          if (lastMsgIndex !== -1) {
            newMessages[lastMsgIndex] = { ...newMessages[lastMsgIndex], mensagem: fullText };
          }
          return newMessages;
        });
      }

      // Decrementa saldo visualmente ao final do sucesso
      setChatSaldo((prev) => Math.max(0, prev - 1));

    } catch (err: any) {
      setError(err.message || t('errormsg'));
      // Remove a mensagem da IA vazia em caso de erro
      setMessages((prev) => prev.filter(msg => msg.id !== iaMsgId));
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleRedirectToPif = () => {
    const url = selectedCriancaId ? `/pif/cadastro?id_crianca=${selectedCriancaId}` : '/pif/cadastro';
    navigate(url);
  };

  return (
    <Paper
      elevation={3}
      sx={{
        height: { xs: 'calc(100vh - 80px)', md: 'calc(100vh - 40px)' },
        width: '100%',
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          alignItems: 'center',
          bgcolor: 'background.default',
          border: '1px solid #595959ff',
        }}
      >
        <FormControl sx={{ minWidth: 300 }} size="small">
          <InputLabel id="select-child">{t('kidtotalk')}</InputLabel>
          <Select 
            labelId="select-child" 
            label={t('kidtotalk')} 
            value={selectedCriancaId} 
            onChange={handleChildSelect}
          >
            <MenuItem value=""><em>{t('choose')}</em></MenuItem>
            {criancas.map((c) => (<MenuItem key={c.id_crianca} value={c.id_crianca}>{c.nome}</MenuItem>))}
          </Select>
        </FormControl>
        <Chip label={`${t('remainingmsg')}${chatSaldo !== undefined ? chatSaldo : '...'}`} color={chatSaldo > 10 ? 'success' : 'warning'} size="small" variant="outlined" />
      </Box>

      <Box
        ref={messageListRef}
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {error && <Alert severity="error" sx={{ mx: 'auto', mb: 2 }}>{error}</Alert>}
        {isLoadingHistory && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />}
        {!selectedCriancaId && !isLoadingHistory && !error && <Typography color="text.secondary" align="center" sx={{ p: 4 }}>{t('startchat')}</Typography>}

        {selectedCriancaId && !isLoadingHistory && !error && !isChatLocked && messages.length === 0 && (
          <Box sx={{ textAlign: 'center', p: 4, opacity: 0.7 }}>
            <Typography variant="h6" gutterBottom color="primary">{t('hello')}</Typography>
            <Typography variant="body1">{t('readytotalk')}</Typography>
          </Box>
        )}

        {isChatLocked && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
            <Alert severity="warning" sx={{ mb: 3 }}><strong>{t('attention')}</strong> {lockReason}</Alert>
            <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={handleRedirectToPif}>{t('prodpif')}</Button>
          </Box>
        )}

        {!isChatLocked && !isLoadingHistory && messages.map((msg) => <Message key={msg.id} message={msg} />)}
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmitMessage}
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1
        }}
      >
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          placeholder={!selectedCriancaId ? t('choosekid') as string : isChatLocked ? t('chatblock') as string : t('typedoubt') as string}
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          disabled={!selectedCriancaId || isSendingMessage || isLoadingHistory || isChatLocked}
          inputProps={{ maxLength: 2000 }}
          helperText={selectedCriancaId && !isChatLocked ? `${currentMessage.length}/2000` : ''}
          FormHelperTextProps={{ sx: { textAlign: 'right', m: 0, pt: 0.5 } }}
        />
        <IconButton
          type="submit"
          color="primary"
          disabled={!selectedCriancaId || isSendingMessage || isLoadingHistory || !currentMessage.trim() || isChatLocked}
          sx={{ flexShrink: 0, mt: 0.5 }} 
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}
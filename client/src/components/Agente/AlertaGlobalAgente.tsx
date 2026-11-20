import React, { useEffect, useState } from 'react';
import { Snackbar, Alert, AlertTitle, Box, Typography, AlertColor } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useSocket } from '../../contexts/SocketContext'; // Ajuste para o caminho do seu contexto de Socket

// --- INTERFACES ---
interface IAlertaDetalhe {
    nivel_urgencia: 'alto' | 'medio' | 'baixo' | string;
    mensagem_acolhedora: string;
    risco_detectado: string;
    sugestao_acao_imediata: string;
}

interface IAgenteAlertaPayload {
    nome_crianca: string;
    alerta: IAlertaDetalhe;
}

export default function AlertaGlobalAgente() {
    const socket = useSocket();
    const [alerta, setAlerta] = useState<IAgenteAlertaPayload | null>(null);

    useEffect(() => {
        if (!socket) return;

        // Ouve a mensagem que o Node.js enviou do agentService.ts
        socket.on('alerta_agente', (dados: IAgenteAlertaPayload) => {
            console.log("Alerta recebido do Agente!", dados);
            setAlerta(dados);
        });

        return () => {
            socket.off('alerta_agente');
        };
    }, [socket]);

    const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setAlerta(null);
    };

    if (!alerta) return null;

    // Define a cor baseada no nível de urgência que o modelo (Claude/OpenAI) escolheu
    const corAlerta: AlertColor = 
        alerta.alerta.nivel_urgencia === 'alto' ? 'error' : 
        alerta.alerta.nivel_urgencia === 'medio' ? 'warning' : 'info';

    return (
        <Snackbar 
            open={!!alerta} 
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            // Adicionado autoHide para não bloquear a interface indefinidamente (opcional, pode remover se preferir fixo)
            autoHideDuration={8000} 
            onClose={handleClose}
        >
            <Alert 
                onClose={handleClose} 
                severity={corAlerta} 
                icon={<SmartToyIcon fontSize="inherit" />}
                sx={{ width: '100%', maxWidth: 400, boxShadow: 3, borderRadius: 2 }}
            >
                <AlertTitle sx={{ fontWeight: 'bold' }}>
                    Aviso do Agente: {alerta.nome_crianca}
                </AlertTitle>
                <Typography variant="body2" sx={{ mb: 1 }}>
                    {alerta.alerta.mensagem_acolhedora}
                </Typography>
                <Box sx={{ bgcolor: 'rgba(255,255,255,0.5)', p: 1, borderRadius: 1 }}>
                    <Typography variant="caption" fontWeight="bold" display="block">
                        Risco: {alerta.alerta.risco_detectado}
                    </Typography>
                    <Typography variant="caption" display="block">
                        💡 Sugestão: {alerta.alerta.sugestao_acao_imediata}
                    </Typography>
                </Box>
            </Alert>
        </Snackbar>
    );
}
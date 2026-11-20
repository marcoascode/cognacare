import React, { useState } from 'react';
import { 
    Box, Typography, TextField, Button, MenuItem, 
    CircularProgress, Alert, Paper, Link 
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

// --- INTERFACES ---
interface ICrianca {
    id_crianca: number | string;
    nome: string;
}

interface IVisualRoutineGeneratorProps {
    criancas: ICrianca[];
}

export default function VisualRoutineGenerator({ criancas }: IVisualRoutineGeneratorProps) {
    const [selectedCriancaId, setSelectedCriancaId] = useState<string | number>('');
    const [eventoGatilho, setEventoGatilho] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);

    const handleGenerate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setErro(null);
        setPdfUrl(null);

        if (!selectedCriancaId || !eventoGatilho) {
            setErro('Por favor, selecione uma criança e descreva o evento.');
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/fernandasepe/agente/historias/gerar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` || ''
                },
                body: JSON.stringify({
                    criancaId: selectedCriancaId,
                    eventoGatilho
                })
            });

            const data = await response.json();

            if (response.ok && data.sucesso) {
                setPdfUrl(`${import.meta.env.VITE_API_BASE_URL}${data.url_pdf}`);
            } else {
                setErro(data.erro || 'Erro ao gerar a história social.');
            }
        } catch (err) {
            console.error('Erro na requisição:', err);
            setErro('Erro de conexão ao servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 700, mx: 'auto' }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <AutoAwesomeIcon sx={{ fontSize: 40, color: '#8B7355', mb: 1 }} />
                    <Typography variant="h5" fontWeight="bold" color="#2C3E50">
                        Gerador de Histórias Sociais
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Crie sequências visuais previsíveis para reduzir a ansiedade em eventos novos.
                    </Typography>
                </Box>

                <form onSubmit={handleGenerate}>
                    <TextField
                        select
                        fullWidth
                        label="Selecionar Criança"
                        value={selectedCriancaId}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedCriancaId(e.target.value)}
                        sx={{ mb: 3 }}
                        required
                    >
                        {criancas.map((c) => (
                            <MenuItem key={c.id_crianca} value={c.id_crianca}>
                                {c.nome}
                            </MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        fullWidth
                        label="Qual o evento desafiador?"
                        placeholder="Ex: Ir ao Dentista, Cortar o Cabelo, Festa de Aniversário"
                        value={eventoGatilho}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEventoGatilho(e.target.value)}
                        sx={{ mb: 3 }}
                        required
                        helperText="O Agente usará o perfil sensorial da criança para adaptar os passos."
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={loading}
                        sx={{ 
                            bgcolor: '#8B7355', 
                            '&:hover': { bgcolor: '#6F5C44' },
                            py: 1.5,
                            fontWeight: 'bold'
                        }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Gerar Rotina Visual'}
                    </Button>
                </form>

                {erro && (
                    <Alert severity="error" sx={{ mt: 3 }}>{erro}</Alert>
                )}

                {pdfUrl && (
                    <Alert 
                        severity="success" 
                        icon={<PictureAsPdfIcon />}
                        sx={{ mt: 3, bgcolor: '#FDFCFB', border: '1px solid #8B7355' }}
                    >
                        <Typography variant="subtitle2" fontWeight="bold">
                            Rotina Visual Gerada com Sucesso!
                        </Typography>
                        <Link 
                            href={pdfUrl} 
                            target="_blank" 
                            rel="noopener"
                            sx={{ color: '#8B7355', fontWeight: 'bold', textDecoration: 'underline', mt: 1, display: 'inline-block' }}
                        >
                            Clique aqui para baixar ou imprimir o PDF
                        </Link>
                    </Alert>
                )}
            </Paper>
        </Box>
    );
}
import React, { useState, ReactNode } from 'react';
import {
    Dialog, DialogContent, Button, Typography, Grid, Box, CircularProgress, 
    IconButton, Paper, Slider, Chip, Stack
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PanToolIcon from '@mui/icons-material/PanTool';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import HealingIcon from '@mui/icons-material/Healing';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PlaceIcon from '@mui/icons-material/Place'; 
import FlashOnIcon from '@mui/icons-material/FlashOn'; 
import api from '../../api/axiosConfig';
import ReactMarkdown from 'react-markdown';

// --- INTERFACES ---
interface SOSCrisisModeProps {
    open: boolean;
    onClose: () => void;
    criancaId?: string | number;
    nomeCrianca?: string;
}

interface TipoCrise {
    id: string;
    label: string;
    icon: ReactNode;
    color: string;
    bgcolor: string;
    opcoes: string[];
}

interface ContextoState {
    local: string;
    gatilhoImediato: string;
}

interface DetalhesState {
    intensidade: number;
    comportamentos: string[];
}

export default function SOSCrisisMode({ open, onClose, criancaId, nomeCrianca }: SOSCrisisModeProps) {
    const [step, setStep] = useState<number>(0); // 0: Tipo, 1: Contexto, 2: Detalhes, 3: Resultado
    const [loading, setLoading] = useState<boolean>(false);
    const [instrucoes, setInstrucoes] = useState<string | null>(null);
    const [criseSelecionada, setCriseSelecionada] = useState<TipoCrise | null>(null);

    // Estado para Contexto 
    const [contexto, setContexto] = useState<ContextoState>({
        local: '',
        gatilhoImediato: ''
    });

    // Estado para detalhes
    const [detalhes, setDetalhes] = useState<DetalhesState>({
        intensidade: 50,
        comportamentos: []
    });

    const locais: string[] = ['Casa', 'Escola', 'Rua/Lugar Público', 'Carro/Transporte', 'Banho/Higiene'];
    const gatilhos: string[] = ['Teve item negado', 'Mudança de Rotina', 'Barulho/Luz (Sensorial)', 'Dor/Físico', 'Não sei/Do nada'];

    const tiposCrise: TipoCrise[] = [
        { id: 'agressividade', label: 'Agressividade', icon: <PanToolIcon fontSize="large" />, color: '#d32f2f', bgcolor: '#e2cdcdff', opcoes: ['Batendo', 'Mordendo', 'Jogando Objetos'] },
        { id: 'autolesao', label: 'Auto-lesão', icon: <HealingIcon fontSize="large" />, color: '#9c27b0', bgcolor: '#ddcde0ff', opcoes: ['Batendo cabeça', 'Se mordendo', 'Se cortando'] },
        { id: 'choro', label: 'Desregulação', icon: <SentimentVeryDissatisfiedIcon fontSize="large" />, color: '#ed6c02', bgcolor: '#dacdc3ff', opcoes: ['Gritos', 'Choro incontrolável', 'Vômito'] },
        { id: 'fuga', label: 'Fuga', icon: <DirectionsRunIcon fontSize="large" />, color: '#0288d1', bgcolor: '#c9d6ddff', opcoes: ['Correndo para rua', 'Escondido'] },
    ];

    const handleSelectType = (tipo: TipoCrise) => {
        setCriseSelecionada(tipo);
        setStep(1); // Vai para Contexto
    };

    const handleContextSubmit = () => {
        setStep(2); // Vai para Detalhes
    };

    const toggleComportamento = (item: string) => {
        const current = detalhes.comportamentos;
        if (current.includes(item)) {
            setDetalhes({ ...detalhes, comportamentos: current.filter(i => i !== item) });
        } else {
            setDetalhes({ ...detalhes, comportamentos: [...current, item] });
        }
    };

    const handleSubmitSOS = async () => {
        if (!criseSelecionada) return;

        setLoading(true);
        try {
            const response = await api.post('/fernandasepe/sos', {
                id_crianca: criancaId,
                tipo_crise: criseSelecionada.id,
                detalhes: detalhes.comportamentos,
                intensidade: detalhes.intensidade,
                contexto_local: contexto.local,
                contexto_gatilho: contexto.gatilhoImediato
            });
            setInstrucoes(response.data.instrucoes);
            setStep(3);
        } catch (error: any) {
            console.error(error);
            setInstrucoes("**ERRO.** \n\n1. Garanta segurança.\n2. Se risco de vida, ligue 192.");
            setStep(3);
        } finally {
            setLoading(false);
        }
    };

    const resetSOS = () => {
        setStep(0);
        setInstrucoes(null);
        setCriseSelecionada(null);
        setContexto({ local: '', gatilhoImediato: '' });
        setDetalhes({ intensidade: 50, comportamentos: [] });
    };

    return (
        <Dialog open={open} onClose={onClose} fullScreen>
            <Grid container sx={{ p: 2, borderBottom: '1px solid #ddd', alignItems: 'center' }}>
                <Grid size={11}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#d32f2f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <WarningAmberIcon sx={{ mr: 1 }} />  SOS: {nomeCrianca}
                    </Typography>
                </Grid>
                <Grid size={1}>
                     <IconButton onClick={onClose} sx={{float:'right'}}><CloseIcon /></IconButton>
                </Grid>
            </Grid>

            <DialogContent>
                {/* PASSO 0: TIPO */}
                {step === 0 && (
                    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
                        <Typography variant="h5" align="center" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>O QUE ESTÁ ACONTECENDO?</Typography>
                        <Grid container spacing={2}>
                            {tiposCrise.map((tipo) => (
                                <Grid size={{ xs: 12, md: 6 }} key={tipo.id}>
                                    <Button
                                        variant="outlined" fullWidth
                                        sx={{ height: '120px', display: 'flex', flexDirection: 'column', bgcolor: tipo.bgcolor, borderColor: tipo.color, color: tipo.color, borderWidth: 3, backgroundColor: 'white', fontSize: '1.1rem', '&:hover': { backgroundColor: tipo.color, color: '#fff' } }}
                                        onClick={() => handleSelectType(tipo)}
                                    >
                                        {tipo.icon} <span style={{ marginTop: 10 }}>{tipo.label}</span>
                                    </Button>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}

                {/* PASSO 1: CONTEXTO */}
                {step === 1 && (
                    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
                        <Typography variant="h6" align="center" color="primary" gutterBottom fontWeight="bold">CONTEXTO DA CRISE</Typography>
                        
                        <Paper sx={{ p: 2, mb: 2, border: '1px solid #ccc' }}>
                            <Typography variant="subtitle2" gutterBottom><PlaceIcon fontSize="small" /> Onde vocês estão?</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {locais.map(loc => (
                                    <Chip key={loc} label={loc} onClick={() => setContexto({...contexto, local: loc})} color={contexto.local === loc ? "primary" : "default"} variant={contexto.local === loc ? "filled" : "outlined"} clickable sx={{p:1}} />
                                ))}
                            </Box>
                        </Paper>

                        <Paper sx={{ p: 2, mb: 3, border: '1px solid #ccc' }}>
                            <Typography variant="subtitle2" gutterBottom><FlashOnIcon fontSize="small" /> O que disparou a crise?</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {gatilhos.map(gat => (
                                    <Chip key={gat} label={gat} onClick={() => setContexto({...contexto, gatilhoImediato: gat})} color={contexto.gatilhoImediato === gat ? "warning" : "default"} variant={contexto.gatilhoImediato === gat ? "filled" : "outlined"} clickable sx={{p:1}} />
                                ))}
                            </Box>
                        </Paper>

                        <Button variant="contained" fullWidth size="large" onClick={handleContextSubmit} disabled={!contexto.local} sx={{ height: 50 }}>
                            Continuar
                        </Button>
                        <Button onClick={() => setStep(0)} fullWidth sx={{ mt: 1 }}>Voltar</Button>
                    </Box>
                )}

                {/* PASSO 2: DETALHES E INTENSIDADE */}
                {step === 2 && (
                    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 2 }}>
                         <Typography variant="h6" align="center" color="error" gutterBottom>INTENSIDADE E DETALHES</Typography>
                         <Paper sx={{ p: 2, mb: 2, border: '2px solid #d32f2f' }}>
                            <Typography gutterBottom fontWeight="bold">Comportamentos:</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                                {criseSelecionada?.opcoes.map((op) => (
                                    <Chip key={op} label={op} clickable color={detalhes.comportamentos.includes(op) ? "error" : "default"} onClick={() => toggleComportamento(op)} />
                                ))}
                            </Box>
                            <Typography gutterBottom fontWeight="bold">Intensidade (0 a 100):</Typography>
                            <Slider 
                                value={detalhes.intensidade} 
                                onChange={(_event: Event, val: number | number[]) => setDetalhes({ ...detalhes, intensidade: val as number })} 
                                step={25} 
                                marks 
                                sx={{color: detalhes.intensidade > 75 ? 'red' : 'orange'}} 
                            />
                         </Paper>
                         <Button variant="contained" color="error" fullWidth size="large" onClick={handleSubmitSOS} disabled={loading} sx={{ height: 60, fontSize: '1.2rem', fontWeight: 'bold' }}>
                            {loading ? <CircularProgress color="inherit" /> : "GERAR SOLUÇÃO"}
                         </Button>
                         <Button onClick={() => setStep(1)} fullWidth sx={{ mt: 1 }}>Voltar</Button>
                    </Box>
                )}

                {/* PASSO 3: RESULTADO */}
                {step === 3 && (
                    <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
                        <Paper elevation={0} sx={{ p: 3, border: `2px solid ${criseSelecionada?.color || '#ccc'}` }}>
                            <Box sx={{ fontSize: '1.2rem', lineHeight: 1.6, '& h1, & h2': { color: '#d32f2f' }, '& strong': { backgroundColor: '#ffebee', padding: '0 4px' } }}>
                                <ReactMarkdown>{instrucoes || ''}</ReactMarkdown>
                            </Box>
                        </Paper>
                        <Stack direction="row" spacing={2} sx={{ mt: 4, justifyContent: 'center' }}>
                            <Button variant="contained" onClick={resetSOS}>Nova Situação</Button>
                            <Button variant="outlined" color="error" startIcon={<LocalHospitalIcon />}>SAMU (192)</Button>
                        </Stack>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
}
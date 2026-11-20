import React, { useState } from 'react';
import { 
    Box, Typography, Button, Paper, TextField, 
    CircularProgress, Alert, Grid, IconButton 
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import DeleteIcon from '@mui/icons-material/Delete';

// --- INTERFACES ---
interface IPrescriptionScannerProps {
    criancaId: string | number;
}

interface IMedicamento {
    nome: string;
    dosagem: string;
    frequencia_horas: string;
    instrucoes: string;
    efeitos_colaterais: string;
}

type StepType = 'upload' | 'review' | 'success';

export default function PrescriptionScanner({ criancaId }: IPrescriptionScannerProps) {
    // Estados de fluxo
    const [step, setStep] = useState<StepType>('upload');
    const [loading, setLoading] = useState<boolean>(false);
    const [erro, setErro] = useState<string | null>(null);
    
    // Dados extraídos (editáveis)
    const [medicamento, setMedicamento] = useState<IMedicamento>({
        nome: '',
        dosagem: '',
        frequencia_horas: '',
        instrucoes: '',
        efeitos_colaterais: ''
    });

    // 1. Manipulação do Upload e Chamada Vision
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setErro(null);

        const formData = new FormData();
        formData.append('receita', file);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/fernandasepe/agente/medicamentos/extrair`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` || '' },
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.sucesso) {
                setMedicamento(data.dadosExtraidos);
                setStep('review');
            } else {
                setErro(data.erro || 'Não foi possível ler a receita. Tente uma foto mais nítida.');
            }
        } catch (err) {
            setErro('Erro de conexão com o Agente Vision.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // 2. Salvamento Final (Pós-Validação Humana)
    const handleSave = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/fernandasepe/agente/medicamentos/salvar`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` || '' 
                },
                body: JSON.stringify({
                    criancaId,
                    medicamentoDados: medicamento
                })
            });

            if (response.ok) {
                setStep('success');
            } else {
                setErro('Erro ao salvar os dados validados.');
            }
        } catch (err) {
            setErro('Erro de comunicação com o servidor.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Renderização do Passo 1: Upload
    if (step === 'upload') {
        return (
            <Paper elevation={0} sx={{ p: 4, border: '2px dashed #E6E0D4', borderRadius: 4, textAlign: 'center', bgcolor: '#FDFBF7' }}>
                <MedicalServicesIcon sx={{ fontSize: 48, color: '#8B7355', mb: 2 }} />
                <Typography variant="h6" fontWeight="bold">Leitura Inteligente de Receita</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Tire uma foto da receita médica. O Agente extrairá nome, dose e explicará os cuidados.
                </Typography>
                
                <Button
                    variant="contained"
                    component="label"
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                    disabled={loading}
                    sx={{ bgcolor: '#8B7355', '&:hover': { bgcolor: '#6F5C44' } }}
                >
                    {loading ? 'Analisando Imagem...' : 'Carregar Foto da Receita'}
                    <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                </Button>

                {erro && <Alert severity="error" sx={{ mt: 2 }}>{erro}</Alert>}
            </Paper>
        );
    }

    // Renderização do Passo 2: Revisão dos Dados Extraídos
    if (step === 'review') {
        return (
            <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" fontWeight="bold" color="#8B7355">Validar Medicação</Typography>
                    <IconButton onClick={() => setStep('upload')}><DeleteIcon /></IconButton>
                </Box>
                <Alert severity="info" sx={{ mb: 3 }}>Confira os dados abaixo e ajuste se necessário.</Alert>

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField 
                            fullWidth label="Nome do Medicamento" 
                            value={medicamento.nome} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMedicamento({...medicamento, nome: e.target.value})}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField 
                            fullWidth label="Dosagem" 
                            value={medicamento.dosagem} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMedicamento({...medicamento, dosagem: e.target.value})}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <TextField 
                            fullWidth label="Instruções/Posologia" multiline rows={2}
                            value={medicamento.instrucoes} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMedicamento({...medicamento, instrucoes: e.target.value})}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <Typography variant="subtitle2" color="primary" gutterBottom>O que esperar (IA Insight):</Typography>
                        <TextField 
                            fullWidth multiline rows={3}
                            value={medicamento.efeitos_colaterais} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMedicamento({...medicamento, efeitos_colaterais: e.target.value})}
                            helperText="Estes efeitos são comuns no início. Se persistirem, consulte o médico."
                        />
                    </Grid>
                </Grid>

                <Button 
                    fullWidth variant="contained" 
                    onClick={handleSave}
                    disabled={loading}
                    sx={{ mt: 3, bgcolor: '#2C3E50', py: 1.5 }}
                >
                    {loading ? 'Salvando...' : 'Confirmar e Salvar no Prontuário'}
                </Button>
            </Paper>
        );
    }

    // Renderização do Passo 3: Sucesso
    return (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, bgcolor: '#F0F9F0' }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: '#4CAF50', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold">Medicação Registrada!</Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
                Os dados agora fazem parte do histórico e serão usados pelo Detetive de Padrões.
            </Typography>
            <Button variant="outlined" onClick={() => setStep('upload')}>Cadastrar Outra</Button>
        </Paper>
    );
}
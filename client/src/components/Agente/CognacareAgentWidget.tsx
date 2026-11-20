import React, { useState, useEffect } from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FavoriteIcon from '@mui/icons-material/Favorite';
import SearchIcon from '@mui/icons-material/Search';
import ExtensionIcon from '@mui/icons-material/Extension';
import CloseIcon from '@mui/icons-material/Close';

// --- INTERFACES ---
interface IInsight {
    tipo_padrao?: string;
    descricao_insight: string;
    precisao_confianca?: number;
    data_analise?: string;
}

interface ICuidadorStatus {
    nivel_estresse_inferido?: string;
    insight_apoio: string;
    data_avaliacao?: string;
}

interface IAlertaAgenda {
    id: number;
    risco_detectado: string;
    mensagem: string;
    sugestao_acao: string;
}

interface ICognacareAgentWidgetProps {
    criancaId?: string | number | null;
}

export default function CognacareAgentWidget({ criancaId }: ICognacareAgentWidgetProps) {
    const [insight, setInsight] = useState<IInsight | null>(null);
    const [cuidadorStatus, setCuidadorStatus] = useState<ICuidadorStatus | null>(null);
    const [alertaAgenda, setAlertaAgenda] = useState<IAlertaAgenda | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchDadosAgente = async () => {
            if (!criancaId) return;
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const headers = { 'Authorization': `Bearer ${token}` };

                // Fazemos as 3 requisições em paralelo
                const [resInsights, resCuidador, resAlerta] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_BASE_URL}/fernandasepe/agente/insights/${criancaId}`, { headers }),
                    fetch(`${import.meta.env.VITE_API_BASE_URL}/fernandasepe/agente/cuidador`, { headers }),
                    fetch(`${import.meta.env.VITE_API_BASE_URL}/fernandasepe/agente/alertas/${criancaId}`, { headers })
                ]);

                // Como o backend devolve null ou undefined quando não há dados (ex: length > 0 ? estado[0] : null)
                // Precisamos garantir que o response.json() trata esses casos adequadamente.
                const insightData = await resInsights.json();
                const cuidadorData = await resCuidador.json();
                const alertaData = await resAlerta.json();

                if (resInsights.ok && insightData) setInsight(insightData);
                if (resCuidador.ok && cuidadorData) setCuidadorStatus(cuidadorData);
                if (resAlerta.ok && alertaData) setAlertaAgenda(alertaData);
                
            } catch (error) {
                console.error("Erro ao carregar dados do Agente:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDadosAgente();
    }, [criancaId]);

    // Função para dispensar a sugestão da tela
    const marcarComoLido = async (alertaId: number) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${import.meta.env.VITE_API_BASE_URL}/fernandasepe/agente/alertas/${alertaId}/lido`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setAlertaAgenda(null); // Remove da tela
        } catch (error) {
            console.error("Erro ao dispensar alerta:", error);
        }
    };

    if (!loading && !insight && !cuidadorStatus && !alertaAgenda) return null;

    return (
        <div style={{
            background: 'linear-gradient(135deg, #FDFBF7 0%, #F4F1EA 100%)',
            border: '1px solid #E6E0D4',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '25px',
            boxShadow: '0 4px 15px rgba(139, 115, 85, 0.08)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', color: '#8B7355' }}>
                <AutoAwesomeIcon style={{ marginRight: '8px' }} />
                <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 'bold' }}>Cognacare Agent</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* WIDGET 0: Alerta de Agenda (Dinâmico / Prioridade Alta se existir) */}
                {alertaAgenda && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', background: '#FFFDF0', border: '1px solid #F0E68C', padding: '15px', borderRadius: '8px', position: 'relative' }}>
                        <div style={{ background: '#FFF9C4', padding: '8px', borderRadius: '50%', marginRight: '15px' }}>
                            <ExtensionIcon style={{ color: '#F57F17', fontSize: '20px' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: '14px', margin: '0 0 5px 0', color: '#555' }}>
                                Dica de Hoje ({alertaAgenda.risco_detectado}):
                            </h3>
                            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                                "{alertaAgenda.mensagem}"
                            </p>
                            <p style={{ margin: 0, fontSize: '15px', color: '#333', fontWeight: '500', lineHeight: '1.5' }}>
                                💡 {alertaAgenda.sugestao_acao}
                            </p>
                        </div>
                        <button 
                            onClick={() => marcarComoLido(alertaAgenda.id)}
                            style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
                            title="Dispensar sugestão"
                        >
                            <CloseIcon fontSize="small" />
                        </button>
                    </div>
                )}

                {/* WIDGET 1: Escudo de Sobrecarga */}
                {cuidadorStatus && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', background: 'white', padding: '15px', borderRadius: '8px' }}>
                        <div style={{ background: '#FFF0F0', padding: '8px', borderRadius: '50%', marginRight: '15px' }}>
                            <FavoriteIcon style={{ color: '#E57373', fontSize: '20px' }} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '14px', margin: '0 0 5px 0', color: '#555' }}>Para si:</h3>
                            <p style={{ margin: 0, fontSize: '15px', color: '#333', fontStyle: 'italic', lineHeight: '1.5' }}>
                                "{cuidadorStatus.insight_apoio}"
                            </p>
                        </div>
                    </div>
                )}

                {/* WIDGET 2: Detetive de Padrões */}
                {insight && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', background: 'white', padding: '15px', borderRadius: '8px' }}>
                        <div style={{ background: '#E3F2FD', padding: '8px', borderRadius: '50%', marginRight: '15px' }}>
                            <SearchIcon style={{ color: '#1976D2', fontSize: '20px' }} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '14px', margin: '0 0 5px 0', color: '#555' }}>Análise de Rotina:</h3>
                            <p style={{ margin: 0, fontSize: '15px', color: '#333', lineHeight: '1.5' }}>
                                {insight.descricao_insight}
                            </p>
                        </div>
                    </div>
                )}

                {loading && (
                    <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>O Agente está a analisar o ambiente...</p>
                )}
            </div>
        </div>
    );
}
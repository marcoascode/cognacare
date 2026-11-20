import React, { useState } from 'react';

// --- INTERFACES ---
interface ICrianca {
    id_crianca: number | string;
    nome: string;
}

interface IRelatorioGeradorProps {
    criancas: ICrianca[];
}

export default function RelatorioGerador({ criancas }: IRelatorioGeradorProps) {
    // 1. Estados do Componente
    const [selectedCriancaId, setSelectedCriancaId] = useState<string | number>('');
    const [dataInicio, setDataInicio] = useState<string>('');
    const [dataFim, setDataFim] = useState<string>('');
    const [tipoRelatorio, setTipoRelatorio] = useState<string>('mensal');
    const [loading, setLoading] = useState<boolean>(false);
    const [relatorioUrl, setRelatorioUrl] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);

    // 2. Função de Submissão
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setErro(null);
        setRelatorioUrl(null);

        if (!selectedCriancaId) {
            setErro('Por favor, selecione uma criança.');
            setLoading(false);
            return;
        }

        if (!dataInicio || !dataFim || new Date(dataInicio) > new Date(dataFim)) {
            setErro('A data de início não pode ser posterior à data de fim.');
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/fernandasepe/agente/relatorio/gerar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    criancaId: selectedCriancaId,
                    dataInicio,
                    dataFim,
                    tipoRelatorio
                })
            });

            const data = await response.json();

            if (response.ok && data.sucesso) {
                setRelatorioUrl(`${import.meta.env.VITE_API_BASE_URL}${data.url_pdf}`);
            } else {
                setErro(data.erro || 'Ocorreu um erro ao gerar o relatório.');
            }
        } catch (error) {
            console.error('❌ Erro na requisição:', error);
            setErro('Erro de conexão ao tentar gerar o relatório.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '40px auto', backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h1 style={{ color: '#2C3E50', textAlign: 'center', fontSize: '24px', marginBottom: '20px' }}>Relatório Pedagógico (Agente)</h1>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* Seleção da Criança */}
                <div>
                    <label htmlFor="criancaSelect" style={{ fontSize: '14px', color: '#555' }}>Selecionar Paciente/Criança</label>
                    <select 
                        id="criancaSelect" 
                        value={selectedCriancaId} 
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCriancaId(e.target.value)}
                        required
                        style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white' }}
                    >
                        <option value="" disabled>Escolha uma criança...</option>
                        {criancas && criancas.map((c) => (
                            <option key={c.id_crianca} value={c.id_crianca}>{c.nome}</option>
                        ))}
                    </select>
                </div>

                {/* Seleção de Datas */}
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ flex: 1 }}>
                        <label htmlFor="dataInicio" style={{ fontSize: '14px', color: '#555' }}>Data de Início</label>
                        <input 
                            type="date" 
                            id="dataInicio" 
                            value={dataInicio} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDataInicio(e.target.value)} 
                            required 
                            style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label htmlFor="dataFim" style={{ fontSize: '14px', color: '#555' }}>Data de Fim</label>
                        <input 
                            type="date" 
                            id="dataFim" 
                            value={dataFim} 
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDataFim(e.target.value)} 
                            required 
                            style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                    </div>
                </div>

                {/* Tipo de Relatório */}
                <div>
                    <label htmlFor="tipoRelatorio" style={{ fontSize: '14px', color: '#555' }}>Tipo de Relatório</label>
                    <select 
                        id="tipoRelatorio" 
                        value={tipoRelatorio} 
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTipoRelatorio(e.target.value)}
                        style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: 'white' }}
                    >
                        <option value="semanal">Semanal</option>
                        <option value="mensal">Mensal</option>
                        <option value="trimestral">Trimestral</option>
                    </select>
                </div>

                <button 
                    type="submit" 
                    disabled={loading || !selectedCriancaId} 
                    style={{ 
                        padding: '12px 15px', 
                        backgroundColor: '#8B7355', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px',
                        cursor: loading || !selectedCriancaId ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        transition: 'background-color 0.3s',
                        marginTop: '10px'
                    }}
                >
                    {loading ? 'Analisando Diários e Gerando PDF...' : 'Gerar Relatório'}
                </button>
            </form>

            {/* Área de Feedback */}
            <div style={{ marginTop: '25px', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                {erro && (
                    <div style={{ padding: '10px', backgroundColor: '#FFD7D7', color: '#CC0000', borderRadius: '4px', marginTop: '10px' }}>
                        ❌ {erro}
                    </div>
                )}
                
                {relatorioUrl && (
                    <div style={{ padding: '15px', border: '2px solid #8B7355', backgroundColor: '#FDFCFB', color: '#8B7355', borderRadius: '4px', marginTop: '10px' }}>
                        <p style={{ fontWeight: 'bold' }}>✅ Relatório gerado com sucesso!</p>
                        <p style={{ fontSize: '14px', color: '#777' }}>O documento também foi enviado para o seu e-mail.</p>
                        <a 
                            href={relatorioUrl} 
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ 
                                textDecoration: 'none', 
                                color: 'white', 
                                backgroundColor: '#2C3E50', 
                                padding: '10px 20px', 
                                display: 'inline-block',
                                marginTop: '15px',
                                borderRadius: '4px',
                                fontWeight: 'bold'
                            }}
                        >
                            Baixar Relatório (PDF)
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
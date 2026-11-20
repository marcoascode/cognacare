// import poolPromise from '../config/mysqlPoolPromise';
import poolPromise from '../config/pgPoolPromise';
import memoryService from '../services/memoryService';

// --- INTERFACES ---
interface IDiarioBordo {
    crianca_id: number | string;
    data: string;
    humor_dia: number;
    atividades_realizadas?: string | null;
    atividades_pif?: string | null;
    comportamento_geral?: string | null;
    alimentacao?: string | null;
    sono?: string | null;
    momentos_chave?: string | null;
}

export default async function processarFechamentoDiario(): Promise<void> {
    console.log('🌙 [CRON] Iniciando o Fechamento Diário de Bordo...');
    
    try {
        // Pega a data de "hoje" no formato YYYY-MM-DD
        // Em produção, certifique-se de que o fuso horário do Node.js está correto (America/Sao_Paulo)
        const hoje = new Date().toLocaleDateString('en-CA'); 

        // Busca TODOS os diários de bordo que foram preenchidos ou atualizados na data de hoje
        // const [rows]: any = await poolPromise.query(`
        //     SELECT * FROM fs_diario_bordo
        //     WHERE data = ?
        // `, [hoje]);
        
        const { rows } = await poolPromise.query(`
            SELECT * FROM fs_diario_bordo
            WHERE data = $1
        `, [hoje]);
        
        const diarios = rows as IDiarioBordo[];

        if (diarios.length === 0) {
            console.log('🌙 [CRON] Nenhum diário preenchido hoje. Finalizando operação.');
            return;
        }

        console.log(`🌙 [CRON] Encontrados ${diarios.length} diários para consolidar. Processando...`);

        // Processa cada diário individualmente
        for (const diario of diarios) {
            
            // 1. FILTRAGEM DE RELEVÂNCIA EXTREMA (O Filtro Anti-Desperdício)
            // Se a família não escreveu textos (apenas marcou um humor padrão), não há valor semântico para a IA.
            const temConteudoRelevante = 
                (diario.atividades_realizadas && diario.atividades_realizadas.length > 5) ||
                (diario.atividades_pif && diario.atividades_pif.length > 5) ||
                (diario.comportamento_geral && diario.comportamento_geral.length > 5) ||
                (diario.momentos_chave && diario.momentos_chave.length > 5);

            if (diario.humor_dia === 3 && !temConteudoRelevante) {
                console.log(`⏩ [CRON] Diário da criança ${diario.crianca_id} ignorado (Sem conteúdo relevante para memorizar).`);
                continue; 
            }

            // 2. CONSTRUÇÃO DO DOCUMENTO SINTÉTICO
            const resumoDia = `
                Rotina em ${diario.data}.
                Humor: ${diario.humor_dia}.
                Atividades: ${diario.atividades_realizadas || 'N/A'}.
                PIF: ${diario.atividades_pif || 'N/A'}.
                Comportamento: ${diario.comportamento_geral || 'N/A'}.
                Alimentação: ${diario.alimentacao || 'N/A'}.
                Sono: ${diario.sono || 'N/A'}.
                Destaques: ${diario.momentos_chave || 'N/A'}.
            `.replace(/\s+/g, ' ').trim(); // O .replace remove espaços duplos e quebras de linha

            // 3. ID DETERMINÍSTICO (Evita Duplicidade Absoluta)
            // Lembre-se: O evento de CRISE já foi salvo com o ID "crise_ID_DATA". 
            // Este aqui é a "rotina_diaria_ID_DATA". Eles coexistem na memória.
            const vetorId = `rotina_diaria_${diario.crianca_id}_${diario.data}`;

            // 4. CHAMA A OPENAI E SALVA NO PINECONE
            await memoryService.storeMemory(diario.crianca_id, resumoDia, { 
                tipo: 'resumo_rotina',
                humor: diario.humor_dia,
                data_relato: diario.data
            }, vetorId);

            console.log(`✅ [CRON] Diário da criança ${diario.crianca_id} salvo na memória de longo prazo.`);
        }

        console.log('🌙 [CRON] Fechamento Diário concluído com sucesso.');

    } catch (error) {
        console.error('❌ [CRON] Erro Crítico no Fechamento Diário:', error);
    }
}
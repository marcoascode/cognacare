// import poolPromise from '../config/mysqlPoolPromise';
import poolPromise from '../config/pgPoolPromise';
import { agentQueue } from '../queues/agentQueue';

// --- INTERFACES ---
interface ICriancaRow {
    id_crianca: number;
}

export default async function rodarDetetiveDePadroes(): Promise<void> {
    console.log('🕵️ [CRON] Acordando Detetive de Padrões...');

    // Pega o dia da semana atual (0 = Domingo, 1 = Segunda... 6 = Sábado)
    const diaDaSemana = new Date().getDay();

    try {
        // Encontra todas as crianças ativas no sistema
        // O MOD(id_crianca, 7) divide a sua base de dados em 7 fatias perfeitas.
        // As crianças com ID 7, 14, 21 serão analisadas ao Domingo.
        // As crianças com ID 1, 8, 15 serão analisadas à Segunda, etc.
        // const [criancas]: any = await poolPromise.query(`
        //     SELECT c.id_crianca 
        //     FROM fs_crianca c
        //     JOIN fs_usuarios u ON c.usuario_id = u.id
        //     WHERE c.ativo = 1 AND u.is_agent_active = 1 AND MOD(c.id_crianca, 7) = ?
        // `, [diaDaSemana]);
        const { rows: criancas } = await poolPromise.query(`
            SELECT c.id_crianca 
            FROM fs_crianca c
            JOIN fs_usuarios u ON c.usuario_id = u.id
            WHERE u.is_agent_active = '1' AND (c.id_crianca % 7) = $1
        `, [diaDaSemana]);

        // Casting seguro para o TypeScript
        const listaCriancas = criancas as ICriancaRow[];

        if (listaCriancas.length === 0) {
            console.log('🕵️ [CRON] Nenhuma criança para analisar hoje.');
            return;
        }

        console.log(`🕵️ [CRON] Colocando ${listaCriancas.length} crianças na fila de análise...`);

        // Adiciona cada criança à fila do BullMQ
        // Vamos usar um 'delay' incremental para não dar um pico de requisições simultâneas na API da IA
        let delayMs = 0;

        for (const c of listaCriancas) {
            // SPRINT 0: o nome do job precisa bater com o worker (antes era 'analisar-padroes'
            // e caía no ramo padrão, sem executar nada).
            await agentQueue.add('detetive_padroes', {
                criancaId: c.id_crianca
            }, {
                jobId: `detetive_${c.id_crianca}_${new Date().toISOString().slice(0, 10)}`, // idempotente no dia
                attempts: 2,
                backoff: { type: 'exponential', delay: 60000 },
                removeOnFail: 100,
                delay: delayMs, // Atrasa cada job em 5 segundos em relação ao anterior
                removeOnComplete: true
            });

            delayMs += 5000; // Incrementa 5 segundos para a próxima iteração
        }

        console.log('✅ [CRON] Todas as crianças agendadas com sucesso.');

    } catch (error) {
        console.error('❌ [CRON] Erro ao disparar o Detetive de Padrões:', error);
    }
}
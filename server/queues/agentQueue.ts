import { Queue, Worker, Job, ConnectionOptions } from 'bullmq';
import agentService from '../services/agentService';

// (Opcional) poolPromise foi removido dos imports porque não estava a ser utilizado neste ficheiro. 
// Caso precise no futuro, basta importar novamente:
// import poolPromise from '../config/mysqlPoolPromise';

// --- INTERFACES ---
export interface IAgentJobData {
    criancaId: string | number;
    agendaId?: string | number;
    motivo?: string;
    dataRelato?: string;
    detalhes?: string[];
    diasAnalisados?: number;
    usuarioId?: string | number;
    relato?: string;
}

// Configuração de conexão com o Redis (Memurai local ou Upstash)
const redisOptions: ConnectionOptions = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null, // OBRIGATÓRIO: O BullMQ exige esta configuração para não travar conexões
    // password: process.env.REDIS_PASSWORD // Descomente se usar Upstash/Nuvem
};

// 1. Criação da Fila
export const agentQueue = new Queue('cognacare-agent-queue', { connection: redisOptions });

// 2. O Worker (O "Operário" que executa o trabalho)
const agentWorker = new Worker('cognacare-agent-queue', async (job: Job<IAgentJobData>) => {
    try {
        console.log(`\n⚙️ [BullMQ Worker] Processando tarefa: ${job.name} | Criança ID: ${job.data.criancaId}`);
        
        // ROTEAMENTO DE TAREFAS
        // if (job.name === 'avaliar-cancelamento-agenda') {
        //     // O operador "!" garante ao TS que as variáveis estarão presentes nesta tarefa específica
        //     await agentService.avaliarCancelamento(
        //         job.data.criancaId, 
        //         job.data.agendaId!, 
        //         job.data.motivo!
        //     );
        // } 
        // else if (job.name === 'avaliar-crise-diario') {
        //     console.log(`[BullMQ Worker] Rota de crise acionada (Implementação futura)...`);
        //     // await agentService.avaliarCrise(job.data.criancaId, job.data.dataRelato, job.data.detalhes);
        // }
        // else if (job.name === 'analisar-padroes') {
        //     await agentService.analisarPadroesEvolutivos(
        //         job.data.criancaId, 
        //         job.data.diasAnalisados
        //     );
        // }
        // else {
        //     // Tarefa padrão: Avaliar rotina geral
        //     // Como este método não estava visível no agentService anterior, isolamo-lo com `any` para o TS não bloquear a compilação
        //     if (typeof (agentService as any).avaliarRotinaEAgir === 'function') {
        //         await (agentService as any).avaliarRotinaEAgir(job.data.criancaId);
        //     } else {
        //         console.warn(`[BullMQ Worker] Método 'avaliarRotinaEAgir' ainda não implementado no agentService.`);
        //     }
        // }
        if (job.name === 'avaliar_cancelamento_agenda') {
            if (!job.data.agendaId) throw new Error('Agenda ID ausente.');
            await agentService.avaliarCancelamento(
                job.data.criancaId,
                job.data.agendaId,
                job.data.motivo || 'Motivo não informado'
            );
        } 
        // SPRINT 0: 'analisar-padroes' mantido por compatibilidade com jobs já enfileirados no Redis.
        else if (job.name === 'detetive_padroes' || job.name === 'analisar-padroes') {
            // Detetive de 15 dias (prompt agent_detetive_padroes: diário + agenda + medicamentos)
            await agentService.rodarDetetiveDePadroes(job.data.criancaId);
        }
        else if (job.name === 'avaliar_sobrecarga_cuidador') {
            // SPRINT 0: antes executado de forma síncrona dentro do POST /diario/salvar.
            if (!job.data.usuarioId || !job.data.relato) throw new Error('Dados do relato ausentes.');
            await agentService.avaliarSobrecargaCuidador(job.data.usuarioId, job.data.relato);
        }
        else {
            // Ex.: 'avaliar-crise-diario' — handler ainda não implementado (ver roadmap).
            console.warn(`[BullMQ Worker] Job '${job.name}' sem handler implementado. Ignorado.`);
        }

    } catch (error: any) {
        console.error(`❌ [BullMQ Worker] Falha ao processar job ${job.name}:`, error.message);
        throw error;
    }
}, { connection: redisOptions });

// Eventos de Monitorização
agentWorker.on('completed', (job: Job) => {
    console.log(`✅ [BullMQ] Job ${job.id} (${job.name}) concluído com sucesso.`);
});

agentWorker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`❌ [BullMQ] O job ${job?.id} falhou com o erro:`, err.message);
});

// 3. Função para acordar o Agente Periodicamente (Se necessário)
export async function iniciarAgendamentos(): Promise<void> {
    console.log('✅ [BullMQ] Motor de Autonomia iniciado.');
    
    // Opcional: Se quiser que ele varra todas as crianças de X em X horas,
    // você pode adicionar um Job repetitivo aqui. Por enquanto, o Agente 
    // é reativo (Acordado pelas rotas da Agenda e Diário).
}
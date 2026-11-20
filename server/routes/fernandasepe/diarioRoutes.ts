import express, { Response } from 'express';
import authMiddleware from '../../middleware/authMiddleware';
// import poolPromise from '../../config/mysqlPoolPromise';
import poolPromise from '../../config/pgPoolPromise';
import { agentQueue } from '../../queues/agentQueue';
import { exigirCriancaPropria, flagAtiva } from '../../middleware/acessoCrianca';

const router = express.Router();

// --- INTERFACES ---
interface CustomRequest extends express.Request {
    user?: {
        id: number | string;
        [key: string]: any;
    };
}

// 1. OBTER RESUMO DO MÊS
router.get('/calendario/:criancaId', authMiddleware, exigirCriancaPropria('criancaId'), async (req: CustomRequest, res: Response) => {
    const { criancaId } = req.params;
    const { mes, ano } = req.query;

    try {
        // const [rows]: any = await poolPromise.query(
        //     `SELECT DATE_FORMAT(data, '%Y-%m-%d') as data, humor_dia 
        //      FROM fs_diario_bordo 
        //      WHERE crianca_id = ? 
        //      AND MONTH(data) = ? AND YEAR(data) = ?`,
        //     [criancaId, mes, ano]
        // );
        const { rows } = await poolPromise.query(
            `SELECT TO_CHAR(data, 'YYYY-MM-DD') as data, humor_dia 
             FROM fs_diario_bordo 
             WHERE crianca_id = $1 
             AND EXTRACT(MONTH FROM data) = $2 AND EXTRACT(YEAR FROM data) = $3`,
            [criancaId, mes, ano]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao buscar calendário.' });
    }
});

// 2. OBTER DIÁRIO DE UM DIA ESPECÍFICO
router.get('/dia/:criancaId', authMiddleware, exigirCriancaPropria('criancaId'), async (req: CustomRequest, res: Response) => {
    const { criancaId } = req.params;
    const data = req.query.data as string;

    try {
        // Garante formatação YYYY-MM-DD na leitura também
        const dataFormatada = data && data.includes('T') ? data.split('T')[0] : data;

        // const [rows]: any = await poolPromise.query(
        //     `SELECT * FROM fs_diario_bordo WHERE crianca_id = ? AND data = ?`,
        //     [criancaId, dataFormatada]
        // );
        const { rows } = await poolPromise.query(
            `SELECT * FROM fs_diario_bordo WHERE crianca_id = $1 AND data = $2`,
            [criancaId, dataFormatada]
        );

        if (rows && rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.json(null);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao buscar diário.' });
    }
});

// 3. SALVAR (UPSERT) - Salvar ou Atualizar Diário de Bordo
router.post('/salvar', authMiddleware, exigirCriancaPropria('crianca_id', 'body'), async (req: CustomRequest, res: Response) => {
    try {
        const {
            crianca_id, data, humor_dia, atividades_realizadas, atividades_pif,
            comportamento_geral, teve_crise, detalhes_crise, comunicacao,
            socializacao, aspectos_sensoriais, alimentacao, sono, uso_recursos,
            habilidades_motoras, habilidades_cognitivas, habilidades_adaptativas, momentos_chave
        } = req.body;

        // 1. Sanitização da Data (Garante o formato YYYY-MM-DD limpo para o MySQL)
        let dataLimpa = data as string;
        if (typeof data === 'string' && data.includes('T')) {
            dataLimpa = data.split('T')[0];
        }

        // 2. Validação de Segurança do Período de Edição (Apenas Hoje e Ontem)
        const dataAtualStr = new Date().toLocaleDateString('en-CA'); // Retorna YYYY-MM-DD local
        const ontemObj = new Date();
        ontemObj.setDate(ontemObj.getDate() - 1);
        const dataOntemStr = ontemObj.toLocaleDateString('en-CA');

        if (dataLimpa !== dataAtualStr && dataLimpa !== dataOntemStr) {
            return res.status(403).json({ erro: 'Bloqueio de segurança: Apenas os registros de hoje e de ontem podem ser salvos ou modificados.' });
        }

        const recursosJson = Array.isArray(uso_recursos) ? JSON.stringify(uso_recursos) : null;

        // await poolPromise.query(`
        //     INSERT INTO fs_diario_bordo (
        //         crianca_id, data, humor_dia, atividades_realizadas, atividades_pif,
        //         comportamento_geral, teve_crise, detalhes_crise, comunicacao,
        //         socializacao, aspectos_sensoriais, alimentacao, sono, uso_recursos,
        //         habilidades_motoras, habilidades_cognitivas, habilidades_adaptativas, momentos_chave
        //     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        //     ON DUPLICATE KEY UPDATE
        //         humor_dia = VALUES(humor_dia),
        //         atividades_realizadas = VALUES(atividades_realizadas),
        //         atividades_pif = VALUES(atividades_pif),
        //         comportamento_geral = VALUES(comportamento_geral),
        //         teve_crise = VALUES(teve_crise),
        //         detalhes_crise = VALUES(detalhes_crise),
        //         comunicacao = VALUES(comunicacao),
        //         socializacao = VALUES(socializacao),
        //         aspectos_sensoriais = VALUES(aspectos_sensoriais),
        //         alimentacao = VALUES(alimentacao),
        //         sono = VALUES(sono),
        //         uso_recursos = VALUES(uso_recursos),
        //         habilidades_motoras = VALUES(habilidades_motoras),
        //         habilidades_cognitivas = VALUES(habilidades_cognitivas),
        //         habilidades_adaptativas = VALUES(habilidades_adaptativas),
        //         momentos_chave = VALUES(momentos_chave)
        // `, [
        //     crianca_id, dataLimpa, humor_dia || 3, atividades_realizadas || '', atividades_pif || '',
        //     comportamento_geral || '', teve_crise ? 1 : 0, detalhes_crise || '', comunicacao || '',
        //     socializacao || '', aspectos_sensoriais || '', alimentacao || '', sono || '', recursosJson,
        //     habilidades_motoras || '', habilidades_cognitivas || '', habilidades_adaptativas || '', momentos_chave || ''
        // ]);
        await poolPromise.query(`
            INSERT INTO fs_diario_bordo (
                crianca_id, data, humor_dia, atividades_realizadas, atividades_pif,
                comportamento_geral, teve_crise, detalhes_crise, comunicacao,
                socializacao, aspectos_sensoriais, alimentacao, sono, uso_recursos,
                habilidades_motoras, habilidades_cognitivas, habilidades_adaptativas, momentos_chave
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            ON CONFLICT (crianca_id, data) DO UPDATE SET
                humor_dia = EXCLUDED.humor_dia,
                atividades_realizadas = EXCLUDED.atividades_realizadas,
                atividades_pif = EXCLUDED.atividades_pif,
                comportamento_geral = EXCLUDED.comportamento_geral,
                teve_crise = EXCLUDED.teve_crise,
                detalhes_crise = EXCLUDED.detalhes_crise,
                comunicacao = EXCLUDED.comunicacao,
                socializacao = EXCLUDED.socializacao,
                aspectos_sensoriais = EXCLUDED.aspectos_sensoriais,
                alimentacao = EXCLUDED.alimentacao,
                sono = EXCLUDED.sono,
                uso_recursos = EXCLUDED.uso_recursos,
                habilidades_motoras = EXCLUDED.habilidades_motoras,
                habilidades_cognitivas = EXCLUDED.habilidades_cognitivas,
                habilidades_adaptativas = EXCLUDED.habilidades_adaptativas,
                momentos_chave = EXCLUDED.momentos_chave
        `, [
            crianca_id, dataLimpa, humor_dia || 3, atividades_realizadas || '', atividades_pif || '',
            comportamento_geral || '', teve_crise ? 1 : 0, detalhes_crise || '', comunicacao || '',
            socializacao || '', aspectos_sensoriais || '', alimentacao || '', sono || '', recursosJson,
            habilidades_motoras || '', habilidades_cognitivas || '', habilidades_adaptativas || '', momentos_chave || ''
        ]);

        // FIREWALL DO COGNACARE AGENT
        // SPRINT 0: a consulta abaixo usava sintaxe MySQL ('?' e desestruturação [rows]),
        // o que fazia a rota responder 500 DEPOIS de já ter gravado o diário. Além disso,
        // o require() devolvia o módulo (sem .default) e a análise de burnout rodava de
        // forma síncrona dentro da requisição. Agora tudo vai para a fila BullMQ e uma
        // falha do agente nunca impede a confirmação do salvamento.
        try {
            const { rows: userCheck } = await poolPromise.query(
                'SELECT is_agent_active FROM fs_usuarios WHERE id = $1',
                [req.user?.id]
            );
            const isAgentActive = flagAtiva(userCheck[0]?.is_agent_active);

            if (isAgentActive) {
                // A. Escudo de Sobrecarga (Monitoramento do Cuidador)
                if (comportamento_geral && comportamento_geral.length > 10) {
                    await agentQueue.add('avaliar_sobrecarga_cuidador', {
                        criancaId: crianca_id,
                        usuarioId: req.user?.id,
                        relato: String(comportamento_geral).slice(0, 4000)
                    }, {
                        // No máximo 1 análise por cuidador por dia: o diário é um upsert e pode
                        // ser salvo várias vezes. O job fica retido 24h para o jobId deduplicar.
                        jobId: `sobrecarga_${req.user?.id}_${dataLimpa}`,
                        removeOnComplete: { age: 86400 },
                        removeOnFail: 100
                    });
                }

                // B. Via Rápida de Crise (handler ainda não implementado no worker)
                if (teve_crise) {
                    await agentQueue.add('avaliar-crise-diario', { 
                        criancaId: crianca_id, 
                        detalhes: detalhes_crise,
                        dataRelato: dataLimpa 
                    }, { priority: 1, removeOnComplete: true, removeOnFail: 100 });
                }
            }
        } catch (agentError) {
            console.error('⚠️ Diário salvo, mas falhou o disparo do Agente:', agentError);
        }

        res.json({ success: true, mensagem: 'Diário salvo com sucesso!' });

    } catch (error) {
        console.error('Erro ao salvar diário:', error);
        res.status(500).json({ erro: 'Erro interno ao salvar o diário de bordo.' });
    }
});

export default router;
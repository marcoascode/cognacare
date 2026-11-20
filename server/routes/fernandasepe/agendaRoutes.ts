import express, { Response } from 'express';
import { addWeeks, addDays, addMonths, isBefore, parseISO, endOfDay } from 'date-fns';

// Importações dos seus módulos internos (certifique-se de que suportam ES Modules ou use getRouter/importação correta no index.ts)
import authMiddleware from '../../middleware/authMiddleware';
// import poolPromise from '../../config/mysqlPoolPromise';
import poolPromise from '../../config/pgPoolPromise';
// import agentService from '../../services/agentService'; // Mantido comentado/importado conforme o seu uso atual

const router = express.Router();

// --- INTERFACES ---
// Interface para suportar o req.user injetado pelo authMiddleware
interface CustomRequest extends express.Request {
    user?: {
        id: number | string;
        [key: string]: any;
    };
}

// =========================================================================
// FUNÇÕES DE SEGURANÇA E CONVERSÃO DE DATAS
// =========================================================================

// Transforma a string do Frontend (com espaço) ou objeto do MySQL num Objeto Date válido
const parseSafe = (val: any): Date => {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    return new Date(val.toString().replace(' ', 'T'));
};

// Extrai apenas YYYY-MM-DD ignorando o fuso horário (Para comparar se mudou a data final)
const extractYMD = (val: any): string | null => {
    if (!val) return null;
    if (typeof val === 'string') return val.substring(0, 10);
    const dateVal = val as Date;
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, '0');
    const d = String(dateVal.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// Formata o Objeto Date de volta para a linguagem do MySQL (YYYY-MM-DD HH:mm:ss)
const formatToSQL = (d: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
};

// =========================================================================
// ROTAS AUXILIARES
// =========================================================================

// Listar categorias
router.get('/categorias', authMiddleware, async (req: CustomRequest, res: Response) => {
    try {
        // const [categorias]: any = await poolPromise.query('SELECT * FROM fs_categorias_terapia WHERE ativo = 1 ORDER BY nome ASC');
        const { rows: categorias } = await poolPromise.query('SELECT * FROM fs_categorias_terapia WHERE ativo = 1 ORDER BY nome ASC');
        res.json(categorias);
    } catch (e) { 
        res.status(500).json({ erro: 'Erro ao carregar categorias.' }); 
    }
});

// Listar marcas para o calendário (Badges)
router.get('/crianca/:criancaId/marcas', authMiddleware, async (req: CustomRequest, res: Response) => {
    try {
        const { criancaId } = req.params;
        const { mes, ano } = req.query;
        // const [rows]: any = await poolPromise.query(
        //     `SELECT DISTINCT DATE_FORMAT(data_hora_inicio, '%Y-%m-%d') as data 
        //      FROM fs_agenda_crianca 
        //      WHERE crianca_id = ? AND MONTH(data_hora_inicio) = ? AND YEAR(data_hora_inicio) = ?`,
        //     [criancaId, mes, ano]
        // );
        const { rows } = await poolPromise.query(
            `SELECT DISTINCT TO_CHAR(data_hora_inicio, 'YYYY-MM-DD') as data 
             FROM fs_agenda_crianca 
             WHERE crianca_id = $1 AND EXTRACT(MONTH FROM data_hora_inicio) = $2 AND EXTRACT(YEAR FROM data_hora_inicio) = $3`,
            [criancaId, mes, ano]
        );
        res.json(rows.map((r: any) => r.data));
    } catch (error) { 
        res.status(500).json({ erro: 'Erro ao buscar marcas.' }); 
    }
});

// Listar agenda do dia
router.get('/crianca/:criancaId', authMiddleware, async (req: CustomRequest, res: Response) => {
    try {
        const { criancaId } = req.params;
        const { start, end } = req.query;
        // const [agenda]: any = await poolPromise.query(`
        //     SELECT a.*, c.nome as categoria_nome, c.cor_hex 
        //     FROM fs_agenda_crianca a
        //     JOIN fs_categorias_terapia c ON a.categoria_id = c.id
        //     WHERE a.crianca_id = ? AND a.data_hora_inicio >= ? AND a.data_hora_fim <= ?
        //     ORDER BY a.data_hora_inicio ASC
        // `, [criancaId, start, end]);
        const { rows: agenda } = await poolPromise.query(`
            SELECT a.*, c.nome as categoria_nome, c.cor_hex 
            FROM fs_agenda_crianca a
            JOIN fs_categorias_terapia c ON a.categoria_id = c.id
            WHERE a.crianca_id = $1 AND a.data_hora_inicio >= $2 AND a.data_hora_fim <= $3
            ORDER BY a.data_hora_inicio ASC
        `, [criancaId, start, end]);
        res.json(agenda);
    } catch (error) { 
        res.status(500).json({ erro: 'Erro ao carregar agenda.' }); 
    }
});

// =========================================================================
// CRIAR EVENTO (POST) - GERAÇÃO DE RECORRÊNCIA BLINDADA
// =========================================================================
router.post('/', authMiddleware, async (req: CustomRequest, res: Response) => {
    // const connection = await poolPromise.getConnection();
    const connection = await poolPromise.connect();
    try {
    //     await connection.beginTransaction();
    //     const { 
    //         crianca_id, categoria_id, titulo, data_hora_inicio, data_hora_fim, 
    //         periodicidade = 'unico', data_fim_recorrencia, anotacoes = '' 
    //     } = req.body;

    //     // 1. Inserção do evento principal (Pai)
    //     const [result]: any = await connection.query(
    //         `INSERT INTO fs_agenda_crianca (crianca_id, categoria_id, titulo, data_hora_inicio, data_hora_fim, periodicidade, data_fim_recorrencia, anotacoes) 
    //          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    //         [crianca_id, categoria_id, titulo, data_hora_inicio, data_hora_fim, periodicidade, data_fim_recorrencia, anotacoes]
    //     );

    //     const parentId = result.insertId;

    //     // 2. Geração das ocorrências futuras (Filhos)
    //     if (periodicidade !== 'unico' && data_fim_recorrencia) {
    //         let proximaDataInicio = parseSafe(data_hora_inicio);
    //         let proximaDataFim = parseSafe(data_hora_fim);

    //         // Fim do dia da data limite garantido
    //         const dataLimite = new Date(`${extractYMD(data_fim_recorrencia)}T23:59:59`);

    //         const series: any[][] = [];
    //         while (true) {
    //             if (periodicidade === 'semanal') {
    //                 proximaDataInicio = addWeeks(proximaDataInicio, 1);
    //                 proximaDataFim = addWeeks(proximaDataFim, 1);
    //             } else if (periodicidade === 'quinzenal') {
    //                 proximaDataInicio = addDays(proximaDataInicio, 14);
    //                 proximaDataFim = addDays(proximaDataFim, 14);
    //             } else if (periodicidade === 'mensal') {
    //                 proximaDataInicio = addMonths(proximaDataInicio, 1);
    //                 proximaDataFim = addMonths(proximaDataFim, 1);
    //             }

    //             // Se a próxima data ultrapassar a data limite escolhida pela mãe, o loop pára
    //             if (proximaDataInicio > dataLimite) break;

    //             series.push([
    //                 crianca_id, categoria_id, titulo,
    //                 formatToSQL(proximaDataInicio), formatToSQL(proximaDataFim),
    //                 periodicidade, data_fim_recorrencia, anotacoes, parentId
    //             ]);
    //         }

    //         if (series.length > 0) {
    //             await connection.query(
    //                 `INSERT INTO fs_agenda_crianca (crianca_id, categoria_id, titulo, data_hora_inicio, data_hora_fim, periodicidade, data_fim_recorrencia, anotacoes, parent_id) VALUES ?`,
    //                 [series]
    //             );
    //         }
    //     }

    //     await connection.commit();
    //     res.status(201).json({ success: true });
    // } catch (error) {
    //     await connection.rollback();
    //     console.error("Erro no POST Agenda:", error);
    //     res.status(500).json({ erro: 'Erro ao processar série de eventos.' });
    await connection.query('BEGIN');
        const { 
            crianca_id, categoria_id, titulo, data_hora_inicio, data_hora_fim, 
            periodicidade = 'unico', data_fim_recorrencia, anotacoes = '' 
        } = req.body;

        // 1. Inserção do evento principal (Pai) - O PostgreSQL exige RETURNING id para devolver o ID criado
        const { rows: result } = await connection.query(
            `INSERT INTO fs_agenda_crianca (crianca_id, categoria_id, titulo, data_hora_inicio, data_hora_fim, periodicidade, data_fim_recorrencia, anotacoes) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [crianca_id, categoria_id, titulo, data_hora_inicio, data_hora_fim, periodicidade, data_fim_recorrencia, anotacoes]
        );

        const parentId = result[0].id;

        // 2. Geração das ocorrências futuras (Filhos)
        if (periodicidade !== 'unico' && data_fim_recorrencia) {
            let proximaDataInicio = parseSafe(data_hora_inicio);
            let proximaDataFim = parseSafe(data_hora_fim);

            // Fim do dia da data limite garantido
            const dataLimite = new Date(`${extractYMD(data_fim_recorrencia)}T23:59:59`);

            const series: any[][] = [];
            while (true) {
                if (periodicidade === 'semanal') {
                    proximaDataInicio = addWeeks(proximaDataInicio, 1);
                    proximaDataFim = addWeeks(proximaDataFim, 1);
                } else if (periodicidade === 'quinzenal') {
                    proximaDataInicio = addDays(proximaDataInicio, 14);
                    proximaDataFim = addDays(proximaDataFim, 14);
                } else if (periodicidade === 'mensal') {
                    proximaDataInicio = addMonths(proximaDataInicio, 1);
                    proximaDataFim = addMonths(proximaDataFim, 1);
                }

                // Se a próxima data ultrapassar a data limite escolhida pela mãe, o loop pára
                if (proximaDataInicio > dataLimite) break;

                series.push([
                    crianca_id, categoria_id, titulo,
                    formatToSQL(proximaDataInicio), formatToSQL(proximaDataFim),
                    periodicidade, data_fim_recorrencia, anotacoes, parentId
                ]);
            }

            // Lógica para Bulk Insert no PostgreSQL
            if (series.length > 0) {
                let placeholders = [];
                let flatValues = [];
                let index = 1;
                for (const row of series) {
                    const rowPlaceholders = [];
                    for (const val of row) {
                        rowPlaceholders.push(`$${index++}`);
                        flatValues.push(val);
                    }
                    placeholders.push(`(${rowPlaceholders.join(', ')})`);
                }

                await connection.query(
                    `INSERT INTO fs_agenda_crianca 
                    (crianca_id, categoria_id, titulo, data_hora_inicio, data_hora_fim, periodicidade, data_fim_recorrencia, anotacoes, parent_id) 
                    VALUES ${placeholders.join(', ')}`, flatValues
                );
            }
        }

        await connection.query('COMMIT');
        res.status(201).json({ success: true });
    } catch (error) {
        await connection.query('ROLLBACK');
        console.error("Erro no POST Agenda:", error);
        res.status(500).json({ erro: 'Erro ao processar série de eventos.' });
    } finally {
        connection.release();
    }
});

// =========================================================================
// EDITAR EVENTO (PUT) - LÓGICA "LIMPAR E RECRIAR"
// =========================================================================
router.put('/:id', authMiddleware, async (req: CustomRequest, res: Response) => {
    let connection: any;
    try {
    //     connection = await poolPromise.getConnection();
    //     await connection.beginTransaction();

    //     const { id } = req.params;
    //     const {
    //         titulo, categoria_id, data_hora_inicio, data_hora_fim,
    //         status, motivo_cancelamento, anotacoes,
    //         periodicidade, data_fim_recorrencia
    //     } = req.body;

    //     const userId = req.user?.id;

    //     // 1. Busca o estado atual do evento e do usuário
    //     const [existing]: any = await connection.query(
    //         `SELECT a.*, u.is_agent_active 
    //          FROM fs_agenda_crianca a 
    //          JOIN fs_usuarios u ON a.crianca_id = (SELECT id_crianca FROM fs_crianca WHERE usuario_id = u.id LIMIT 1)
    //          WHERE a.id = ? AND u.id = ?`,
    //         [id, userId]
    //     );

    //     if (existing.length === 0) {
    //         await connection.rollback();
    //         return res.status(404).json({ erro: 'Evento não encontrado.' });
    //     }
        
    //     const eventoOriginal = existing[0];
    //     // const isAgentActive = eventoOriginal.is_agent_active === 1;

    //     // 2. Atualiza a instância atual
    //     await connection.query(
    //         `UPDATE fs_agenda_crianca SET 
    //             titulo = COALESCE(?, titulo), 
    //             categoria_id = COALESCE(?, categoria_id),
    //             data_hora_inicio = COALESCE(?, data_hora_inicio), 
    //             data_hora_fim = COALESCE(?, data_hora_fim), 
    //             status = COALESCE(?, status), 
    //             motivo_cancelamento = COALESCE(?, motivo_cancelamento),
    //             anotacoes = COALESCE(?, anotacoes),
    //             periodicidade = COALESCE(?, periodicidade),
    //             data_fim_recorrencia = COALESCE(?, data_fim_recorrencia)
    //          WHERE id = ?`,
    //         [titulo, categoria_id, data_hora_inicio, data_hora_fim, status, motivo_cancelamento, anotacoes, periodicidade, data_fim_recorrencia, id]
    //     );

    //     // 3. Gestão de Recorrência (Limpar e Recriar série se necessário)
    //     const novaPeriodicidade = periodicidade || eventoOriginal.periodicidade;
    //     const novaDataFim = data_fim_recorrencia || eventoOriginal.data_fim_recorrencia;

    //     const mudouRegra = (novaPeriodicidade !== eventoOriginal.periodicidade) ||
    //         (extractYMD(novaDataFim) !== extractYMD(eventoOriginal.data_fim_recorrencia));

    //     if (mudouRegra && eventoOriginal.parent_id === null) {
    //         // Remove instâncias futuras 'agendadas' para manter o histórico das 'concluídas'
    //         await connection.query(
    //             `DELETE FROM fs_agenda_crianca WHERE parent_id = ? AND status = 'agendado'`,
    //             [id]
    //         );

    //         // Se ainda for recorrente, gera as novas datas
    //         if (novaPeriodicidade !== 'unico' && novaDataFim) {
    //             let proximaDataInicio = parseSafe(data_hora_inicio || eventoOriginal.data_hora_inicio);
    //             let proximaDataFim = parseSafe(data_hora_fim || eventoOriginal.data_hora_fim);
    //             const dataLimite = endOfDay(parseISO(novaDataFim));

    //             const series: any[][] = [];
    //             while (true) {
    //                 if (novaPeriodicidade === 'semanal') {
    //                     proximaDataInicio = addWeeks(proximaDataInicio, 1);
    //                     proximaDataFim = addWeeks(proximaDataFim, 1);
    //                 } else if (novaPeriodicidade === 'quinzenal') {
    //                     proximaDataInicio = addDays(proximaDataInicio, 14);
    //                     proximaDataFim = addDays(proximaDataFim, 14);
    //                 } else if (novaPeriodicidade === 'mensal') {
    //                     proximaDataInicio = addMonths(proximaDataInicio, 1);
    //                     proximaDataFim = addMonths(proximaDataFim, 1);
    //                 }

    //                 if (isBefore(dataLimite, proximaDataInicio)) break;

    //                 series.push([
    //                     eventoOriginal.crianca_id, categoria_id || eventoOriginal.categoria_id,
    //                     titulo || eventoOriginal.titulo, formatToSQL(proximaDataInicio), formatToSQL(proximaDataFim),
    //                     novaPeriodicidade, novaDataFim, anotacoes || eventoOriginal.anotacoes, id
    //                 ]);
    //             }

    //             if (series.length > 0) {
    //                 await connection.query(
    //                     `INSERT INTO fs_agenda_crianca 
    //                     (crianca_id, categoria_id, titulo, data_hora_inicio, data_hora_fim, periodicidade, data_fim_recorrencia, anotacoes, parent_id) 
    //                     VALUES ?`, [series]
    //                 );
    //             }
    //         }
    //     }

    //     await connection.commit();
    //     res.json({ success: true });

    // } catch (error) {
    //     if (connection) await connection.rollback();
    //     console.error('Erro ao atualizar agenda:', error);
    //     res.status(500).json({ erro: 'Erro ao processar atualização.' });
    connection = await poolPromise.connect();
        await connection.query('BEGIN');

        const { id } = req.params;
        const {
            titulo, categoria_id, data_hora_inicio, data_hora_fim,
            status, motivo_cancelamento, anotacoes,
            periodicidade, data_fim_recorrencia
        } = req.body;

        const userId = req.user?.id;

        // 1. Busca o estado atual do evento e do usuário
        const { rows: existing } = await connection.query(
            `SELECT a.*, u.is_agent_active 
             FROM fs_agenda_crianca a 
             JOIN fs_usuarios u ON a.crianca_id = (SELECT id_crianca FROM fs_crianca WHERE usuario_id = u.id LIMIT 1)
             WHERE a.id = $1 AND u.id = $2`,
            [id, userId]
        );

        if (existing.length === 0) {
            await connection.query('ROLLBACK');
            return res.status(404).json({ erro: 'Evento não encontrado.' });
        }
        
        const eventoOriginal = existing[0];

        // 2. Atualiza a instância atual
        await connection.query(
            `UPDATE fs_agenda_crianca SET 
                titulo = COALESCE($1, titulo), 
                categoria_id = COALESCE($2, categoria_id),
                data_hora_inicio = COALESCE($3, data_hora_inicio), 
                data_hora_fim = COALESCE($4, data_hora_fim), 
                status = COALESCE($5, status), 
                motivo_cancelamento = COALESCE($6, motivo_cancelamento),
                anotacoes = COALESCE($7, anotacoes),
                periodicidade = COALESCE($8, periodicidade),
                data_fim_recorrencia = COALESCE($9, data_fim_recorrencia)
             WHERE id = $10`,
            [titulo, categoria_id, data_hora_inicio, data_hora_fim, status, motivo_cancelamento, anotacoes, periodicidade, data_fim_recorrencia, id]
        );

        // 3. Gestão de Recorrência (Limpar e Recriar série se necessário)
        const novaPeriodicidade = periodicidade || eventoOriginal.periodicidade;
        const novaDataFim = data_fim_recorrencia || eventoOriginal.data_fim_recorrencia;

        const mudouRegra = (novaPeriodicidade !== eventoOriginal.periodicidade) ||
            (extractYMD(novaDataFim) !== extractYMD(eventoOriginal.data_fim_recorrencia));

        if (mudouRegra && eventoOriginal.parent_id === null) {
            // Remove instâncias futuras 'agendadas' para manter o histórico das 'concluídas'
            await connection.query(
                `DELETE FROM fs_agenda_crianca WHERE parent_id = $1 AND status = 'agendado'`,
                [id]
            );

            // Se ainda for recorrente, gera as novas datas
            if (novaPeriodicidade !== 'unico' && novaDataFim) {
                let proximaDataInicio = parseSafe(data_hora_inicio || eventoOriginal.data_hora_inicio);
                let proximaDataFim = parseSafe(data_hora_fim || eventoOriginal.data_hora_fim);
                const dataLimite = endOfDay(parseISO(novaDataFim));

                const series: any[][] = [];
                while (true) {
                    if (novaPeriodicidade === 'semanal') {
                        proximaDataInicio = addWeeks(proximaDataInicio, 1);
                        proximaDataFim = addWeeks(proximaDataFim, 1);
                    } else if (novaPeriodicidade === 'quinzenal') {
                        proximaDataInicio = addDays(proximaDataInicio, 14);
                        proximaDataFim = addDays(proximaDataFim, 14);
                    } else if (novaPeriodicidade === 'mensal') {
                        proximaDataInicio = addMonths(proximaDataInicio, 1);
                        proximaDataFim = addMonths(proximaDataFim, 1);
                    }

                    if (isBefore(dataLimite, proximaDataInicio)) break;

                    series.push([
                        eventoOriginal.crianca_id, categoria_id || eventoOriginal.categoria_id,
                        titulo || eventoOriginal.titulo, formatToSQL(proximaDataInicio), formatToSQL(proximaDataFim),
                        novaPeriodicidade, novaDataFim, anotacoes || eventoOriginal.anotacoes, id
                    ]);
                }

                // Bulk Insert Adaptado ao PG
                if (series.length > 0) {
                    let placeholders = [];
                    let flatValues = [];
                    let index = 1;
                    for (const row of series) {
                        const rowPlaceholders = [];
                        for (const val of row) {
                            rowPlaceholders.push(`$${index++}`);
                            flatValues.push(val);
                        }
                        placeholders.push(`(${rowPlaceholders.join(', ')})`);
                    }

                    await connection.query(
                        `INSERT INTO fs_agenda_crianca 
                        (crianca_id, categoria_id, titulo, data_hora_inicio, data_hora_fim, periodicidade, data_fim_recorrencia, anotacoes, parent_id) 
                        VALUES ${placeholders.join(', ')}`, flatValues
                    );
                }
            }
        }

        await connection.query('COMMIT');
        res.json({ success: true });

    } catch (error) {
        if (connection) await connection.query('ROLLBACK');
        console.error('Erro ao atualizar agenda:', error);
        res.status(500).json({ erro: 'Erro ao processar atualização.' });
    } finally {
        if (connection) connection.release();
    }
});

// =========================================================================
// DELETAR EVENTO (DELETE) - COM EXCLUSÃO EM CASCATA
// =========================================================================
router.delete('/:id', authMiddleware, async (req: CustomRequest, res: Response) => {
    try {
        // Se apagar o Pai (id), apaga também todos os Filhos (parent_id) simultaneamente
        // await poolPromise.query('DELETE FROM fs_agenda_crianca WHERE id = ? OR parent_id = ?', [req.params.id, req.params.id]);
        await poolPromise.query('DELETE FROM fs_agenda_crianca WHERE id = $1 OR parent_id = $2', [req.params.id, req.params.id]);
        res.json({ success: true });
    } catch (e) {
        console.error("Erro no DELETE Agenda:", e);
        res.status(500).json({ erro: 'Erro ao deletar.' });
    }
});

export default router;
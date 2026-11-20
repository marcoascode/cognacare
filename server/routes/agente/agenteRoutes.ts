import express, { Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import authMiddleware from '../../middleware/authMiddleware';
// import poolPromise from '../../config/mysqlPoolPromise';
import poolPromise from '../../config/pgPoolPromise';
import agentService from '../../services/agentService';

const router = express.Router();

// --- INTERFACES ---
interface CustomRequest extends express.Request {
    user?: {
        id: number | string;
        [key: string]: any;
    };
    file?: Express.Multer.File;
}

interface IMedicamentoDados {
    nome: string;
    dosagem: string;
    frequencia_horas?: string | number;
    instrucoes: string;
    efeitos_colaterais: string;
}

// Criamos uma interface para descrever a resposta do agentService.extrairDadosReceita
interface IResultadoVisao {
    sucesso: boolean;
    mensagem_erro?: string;
    medicamento?: IMedicamentoDados;
}

// Configuração de segurança do Multer: Apenas na Memória e Limite de 5MB
const uploadMemoria = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, 
    fileFilter: (req: express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas ficheiros de imagem (JPG, PNG, WEBP) são permitidos.'));
        }
    }
});

// =========================================================================
// WIDGETS E ALERTAS DO DASHBOARD DO AGENTE
// =========================================================================

router.get('/alertas', authMiddleware, async (req: CustomRequest, res: Response) => {
    try {
        const usuarioId = req.user?.id;

        // const [rows]: any = await poolPromise.query(
        //     `SELECT a.*, c.nome as nome_crianca 
        //      FROM fs_alertas_agente a
        //      JOIN fs_crianca c ON a.crianca_id = c.id_crianca
        //      WHERE a.usuario_id = ? AND a.lido = 0
        //      ORDER BY a.criado_em DESC`,
        //     [usuarioId]
        // );
        
      const { rows } = await poolPromise.query(
            `SELECT a.*, c.nome as nome_crianca 
             FROM fs_alertas_agente a
             JOIN fs_crianca c ON a.crianca_id = c.id_crianca
             WHERE a.usuario_id = $1 AND a.lido = false
             ORDER BY a.criado_em DESC`,
            [usuarioId]
        );
        
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar alertas do agente:', error);
        res.status(500).json({ erro: 'Erro ao carregar notificações.' });
    }
});

router.put('/alertas/:id/lido', authMiddleware, async (req: CustomRequest, res: Response) => {
    try {
        // await poolPromise.query(
        //     'UPDATE fs_alertas_agente SET lido = 1 WHERE id = ? AND usuario_id = ?', 
        //     [req.params.id, req.user?.id]
        // );

        await poolPromise.query(
            'UPDATE fs_alertas_agente SET lido = 1 WHERE id = $1 AND usuario_id = $2', 
            [req.params.id, req.user?.id]
        );
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao atualizar alerta.' });
    }
});

router.get('/alertas/:criancaId', authMiddleware, async (req: CustomRequest, res: Response) => {
    try {
        const { criancaId } = req.params;
        const usuarioId = req.user?.id;
        
        // const [alertas]: any = await poolPromise.query(`
        //     SELECT id, risco_detectado, mensagem, sugestao_acao 
        //     FROM fs_alertas_agente 
        //     WHERE usuario_id = ? AND crianca_id = ? AND lido = 0 AND criado_em >= NOW() - INTERVAL 24 HOUR
        //     ORDER BY criado_em DESC LIMIT 1
        // `, [usuarioId, criancaId]);
        const { rows: alertas } = await poolPromise.query(`
            SELECT id, risco_detectado, mensagem, sugestao_acao 
            FROM fs_alertas_agente 
            WHERE usuario_id = $1 AND crianca_id = $2 AND lido = 0 AND criado_em >= NOW() - INTERVAL '24 HOURS'
            ORDER BY criado_em DESC LIMIT 1
        `, [usuarioId, criancaId]);

        res.json(alertas.length > 0 ? alertas[0] : null);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar alertas.' });
    }
});

router.get('/insights/:criancaId', authMiddleware, async (req: CustomRequest, res: Response) => {
    try {
        const { criancaId } = req.params;
        
        // const [insights]: any = await poolPromise.query(`
        //     SELECT tipo_padrao, descricao_insight, precisao_confianca, data_analise 
        //     FROM fs_insights_agente 
        //     WHERE crianca_id = ? AND data_analise >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        //     ORDER BY data_analise DESC LIMIT 1
        // `, [criancaId]);
        const { rows: insights } = await poolPromise.query(`
            SELECT tipo_padrao, descricao_insight, precisao_confianca, data_analise 
            FROM fs_insights_agente 
            WHERE crianca_id = $1 AND data_analise >= CURRENT_DATE - INTERVAL '7 DAYS'
            ORDER BY data_analise DESC LIMIT 1
        `, [criancaId]);

        res.json(insights.length > 0 ? insights[0] : null);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar insights.' });
    }
});

router.get('/cuidador', authMiddleware, async (req: CustomRequest, res: Response) => {
    try {
        const usuarioId = req.user?.id;
        
        // const [estado]: any = await poolPromise.query(`
        //     SELECT nivel_estresse_inferido, insight_apoio, data_avaliacao 
        //     FROM fs_estado_cuidador 
        //     WHERE usuario_id = ? AND data_avaliacao >= DATE_SUB(CURDATE(), INTERVAL 3 DAY)
        //     ORDER BY data_avaliacao DESC LIMIT 1
        // `, [usuarioId]);
        const { rows: estado } = await poolPromise.query(`
            SELECT nivel_estresse_inferido, insight_apoio, data_avaliacao 
            FROM fs_estado_cuidador 
            WHERE usuario_id = $1 AND data_avaliacao >= CURRENT_DATE - INTERVAL '3 DAYS'
            ORDER BY data_avaliacao DESC LIMIT 1
        `, [usuarioId]);

        res.json(estado.length > 0 ? estado[0] : null);
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao buscar status do cuidador.' });
    }
});

// =========================================================================
// GERADORES DA IA (RELATÓRIOS, HISTÓRIAS E OCR DE RECEITAS)
// =========================================================================

router.post('/relatorio/gerar', authMiddleware, async (req: CustomRequest, res: Response): Promise<any> => {
    try {
        const { criancaId, dataInicio, dataFim, tipoRelatorio } = req.body;
        const usuarioIdGerador = req.user?.id;

        if (!usuarioIdGerador) {
            return res.status(401).json({ erro: 'Acesso negado. Utilizador não identificado.' });
        }

        if (!criancaId || !dataInicio || !dataFim) {
            return res.status(400).json({ erro: 'criancaId, dataInicio e dataFim são obrigatórios.' });
        }

        if (new Date(dataInicio) > new Date(dataFim)) {
            return res.status(400).json({ erro: 'A data de início não pode ser posterior à data de fim.' });
        }

        // Passamos o cast para garantir que o serviço recebe o formato correto
        const resultado = await agentService.compilarRelatorioPedagogico(
            criancaId,
            usuarioIdGerador as any, // Cast temporário enquanto o agentService não é migrado
            dataInicio,
            dataFim,
            tipoRelatorio
        );

        if (!resultado.sucesso) {
            return res.status(422).json({ erro: resultado.erro });
        }

        res.status(201).json(resultado);

    } catch (error) {
        console.error('Erro na rota /relatorio/gerar:', error);
        res.status(500).json({ erro: 'Erro interno ao processar a geração do relatório pela IA.' });
    }
});

router.post('/historias/gerar', authMiddleware, async (req: CustomRequest, res: Response): Promise<any> => {
    try {
        const { criancaId, eventoGatilho } = req.body;
        const usuarioIdGerador = req.user?.id;

        if (!usuarioIdGerador) {
            return res.status(401).json({ erro: 'Acesso negado. Utilizador não identificado.' });
        }

        if (!criancaId || !eventoGatilho) {
            return res.status(400).json({ erro: 'O ID da criança e o evento gatilho são obrigatórios.' });
        }

        const resultado = await agentService.gerarHistoriaSocial(
            criancaId, 
            usuarioIdGerador as any, // Cast temporário
            eventoGatilho
        );

        res.status(201).json(resultado);

    } catch (error) {
        console.error('Erro na rota /historias/gerar:', error);
        res.status(500).json({ erro: 'Erro interno ao gerar a história social visual.' });
    }
});

router.post('/medicamentos/extrair', authMiddleware, uploadMemoria.single('receita'), async (req: CustomRequest, res: Response): Promise<any> => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ erro: 'Nenhuma imagem foi enviada.' });
        }

        // Declaramos que a resposta do serviço respeita a nossa interface IResultadoVisao
        const resultadoIA = await agentService.extrairDadosReceita(file.buffer, file.mimetype) as IResultadoVisao;

        if (resultadoIA.sucesso === false) {
            return res.status(422).json({ 
                erro: resultadoIA.mensagem_erro || 'A imagem enviada não parece ser uma receita médica válida.' 
            });
        }

        res.status(200).json({
            sucesso: true,
            mensagem: 'Leitura concluída! Por favor, valide os dados antes de salvar.',
            dadosExtraidos: resultadoIA.medicamento
        });

    } catch (error: any) {
        console.error('Erro na rota /medicamentos/extrair:', error);
        
        if (error instanceof multer.MulterError) {
            return res.status(400).json({ erro: `Erro no upload da imagem: ${error.message}` });
        }

        res.status(500).json({ erro: error.message || 'Erro interno ao processar a receita.' });
    }
});

router.post('/medicamentos/salvar', authMiddleware, async (req: CustomRequest, res: Response): Promise<any> => {
    try {
        const { criancaId, medicamentoDados } = req.body as { criancaId: string | number, medicamentoDados: IMedicamentoDados };
        const usuarioId = req.user?.id;

        if (!criancaId || !medicamentoDados || !medicamentoDados.nome) {
            return res.status(400).json({ erro: 'Dados incompletos para salvar o medicamento.' });
        }

        // await poolPromise.query(`
        //     INSERT INTO fs_medicamentos_crianca 
        //     (crianca_id, usuario_id, nome_medicamento, dosagem, frequencia_horas, posologia_instrucoes, efeitos_colaterais_esperados, data_inicio) 
        //     VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())
        // `, [
        //     criancaId,
        //     usuarioId,
        //     medicamentoDados.nome,
        //     medicamentoDados.dosagem,
        //     medicamentoDados.frequencia_horas || null,
        //     medicamentoDados.instrucoes,
        //     medicamentoDados.efeitos_colaterais
        // ]);
        await poolPromise.query(`
            INSERT INTO fs_medicamentos_crianca 
            (crianca_id, usuario_id, nome_medicamento, dosagem, frequencia_horas, posologia_instrucoes, efeitos_colaterais_esperados, data_inicio) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
        `, [
            criancaId,
            usuarioId,
            medicamentoDados.nome,
            medicamentoDados.dosagem,
            medicamentoDados.frequencia_horas || null,
            medicamentoDados.instrucoes,
            medicamentoDados.efeitos_colaterais
        ]);

        res.status(201).json({ sucesso: true, mensagem: 'Medicamento registrado com sucesso!' });

    } catch (error) {
        console.error('Erro na rota /medicamentos/salvar:', error);
        res.status(500).json({ erro: 'Erro ao salvar o medicamento no banco de dados.' });
    }
});

export default router;
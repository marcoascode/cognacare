import express, { Request, Response, NextFunction } from 'express';
// import poolPromise from '../../config/mysqlPoolPromise';
import poolPromise from '../../config/pgPoolPromise';
import autenticarUsuario from '../../middleware/autenticarUsuario'; 

const router = express.Router();

// --- INTERFACES ---
interface AuthRequest extends Request {
    usuarioId?: number;
    afiliadoId?: number;
}

interface IAfiliadoRow {
    id: number;
    status: string;
    redes_sociais?: string;
}

interface IUsuarioRow {
    nome: string;
    email: string;
    chave_pix?: string;
    tipo_chave_pix?: string;
}

interface IDashboardRow {
    total_vendas: number | string;
    comissao_total: number | string;
    comissao_maturada: number | string;
    ja_pago: number | string;
}

interface ICupomRow {
    id: number;
    codigo: string;
    afiliado_id: number;
}

// Rota unificada: Protegida pelo middleware de Usuário comum
// O 'as any' previne conflitos com a tipagem estrita de Middlewares do Express
router.use(autenticarUsuario as any);

// ==========================================================
// MIDDLEWARE: GARANTE QUE O AFILIADO ESTÁ APROVADO
// ==========================================================
const garantirAfiliadoAprovado = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
    // try {
    //     const [rows]: any = await poolPromise.query(
    //         'SELECT id FROM fs_afiliados WHERE usuario_id = ? AND status = "aprovado"', 
    //         [req.usuarioId]
    //     );
        
    //     if (rows.length === 0) {
    //         return res.status(403).json({ error: 'Acesso negado. A conta de parceiro ainda está em análise ou foi rejeitada.' });
    //     }
        
    //     req.afiliadoId = rows[0].id; // Injeta o ID do afiliado na requisição
    //     next();
    try {
        const { rows } = await poolPromise.query(
            "SELECT id FROM fs_afiliados WHERE usuario_id = $1 AND status = 'aprovado'", 
            [req.usuarioId]
        );
        
        if (rows.length === 0) {
            return res.status(403).json({ error: 'Acesso negado. A conta de parceiro ainda está em análise ou foi rejeitada.' });
        }
        
        req.afiliadoId = rows[0].id;
        next();
    } catch (error) {
        return res.status(500).json({ error: 'Erro ao verificar afiliação' });
    }
};

// ==========================================================
// ROTAS PÚBLICAS DO AFILIADO (Não exigem aprovação)
// ==========================================================

// ROTA: Status da Candidatura (Usada na Landing Page)
router.get('/status-candidatura', async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        // const [rows]: any = await poolPromise.query(
        //     'SELECT status FROM fs_afiliados WHERE usuario_id = ? LIMIT 1', 
        //     [req.usuarioId]
        // );
        const { rows } = await poolPromise.query(
            'SELECT status FROM fs_afiliados WHERE usuario_id = $1 LIMIT 1', 
            [req.usuarioId]
        );
        
        if (rows.length > 0) {
            return res.json({ status: (rows[0] as IAfiliadoRow).status }); // 'pendente', 'aprovado' ou 'rejeitado'
        }
        return res.json({ status: 'none' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao verificar status.' });
    }
});

// ROTA: Enviar Candidatura (POST /join)
router.post('/join', async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const usuarioId = req.usuarioId; 
        const { redes_sociais, relacao_causa } = req.body; 

        if (!redes_sociais || !relacao_causa) {
            return res.status(400).json({ error: 'Preencha os campos de redes sociais e relação com a causa.' });
        }

        // Verifica se usuário já enviou solicitação
        // const [existing]: any = await poolPromise.query(
        //     'SELECT id FROM fs_afiliados WHERE usuario_id = ?', 
        //     [usuarioId]
        // );
        
        // if (existing.length > 0) return res.status(400).json({ error: 'Você já enviou uma solicitação de parceria.' });

        // // Busca dados básicos do usuário
        // const [userRows]: any = await poolPromise.query(
        //     'SELECT nome, email FROM fs_usuarios WHERE id = ?', 
        //     [usuarioId]
        // );
        
        // if(userRows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
        
        // const user = userRows[0] as IUsuarioRow;

        // // Insere com status PENDENTE (Nenhum cupom é gerado aqui!)
        // await poolPromise.query(
        //     `INSERT INTO fs_afiliados (nome, email, usuario_id, redes_sociais, relacao_causa, status, criado_em) 
        //      VALUES (?, ?, ?, ?, ?, 'pendente', NOW())`,
        //     [user.nome, user.email, usuarioId, redes_sociais, relacao_causa]
        // );
        // Verifica se usuário já enviou solicitação
        const { rows: existing } = await poolPromise.query(
            'SELECT id FROM fs_afiliados WHERE usuario_id = $1', 
            [usuarioId]
        );
        if (existing.length > 0) return res.status(400).json({ error: 'Você já enviou uma solicitação de parceria.' });

        // Busca dados básicos do usuário
        const { rows: userRows } = await poolPromise.query(
            'SELECT nome, email FROM fs_usuarios WHERE id = $1', 
            [usuarioId]
        );
        if(userRows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
        const user = userRows[0] as IUsuarioRow;

        // Insere com status PENDENTE
        await poolPromise.query(
            `INSERT INTO fs_afiliados (nome, email, usuario_id, redes_sociais, relacao_causa, status, criado_em) 
             VALUES ($1, $2, $3, $4, $5, 'pendente', CURRENT_TIMESTAMP)`,
            [user.nome, user.email, usuarioId, redes_sociais, relacao_causa]
        );

        res.json({ success: true, message: 'Solicitação enviada com sucesso!' });

    } catch (error) {
        console.error('Erro ao candidatar:', error);
        res.status(500).json({ error: 'Erro ao processar candidatura.' });
    }
});

// ==========================================================
// ROTAS PRIVADAS DO AFILIADO (Exigem status "aprovado")
// ==========================================================

// ROTA: Buscar redes sociais (Usada no Painel)
router.get('/redes-sociais', garantirAfiliadoAprovado as any, async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        // const [rows]: any = await poolPromise.query(
        //     'SELECT redes_sociais FROM fs_afiliados WHERE id = ?', 
        //     [req.afiliadoId]
        // );
        const { rows } = await poolPromise.query(
          'SELECT redes_sociais FROM fs_afiliados WHERE id = $1', 
          [req.afiliadoId]
        );
        res.json({ redes_sociais: rows[0]?.redes_sociais || '' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar redes sociais' });
    }
});

// ROTA: Atualizar redes sociais (Usada no Painel)
router.put('/redes-sociais', garantirAfiliadoAprovado as any, async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const { redes_sociais } = req.body;
        // await poolPromise.query(
        //     'UPDATE fs_afiliados SET redes_sociais = ? WHERE id = ?', 
        //     [redes_sociais, req.afiliadoId]
        // );
        await poolPromise.query(
          'UPDATE fs_afiliados SET redes_sociais = $1 WHERE id = $2', 
          [redes_sociais, req.afiliadoId]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar redes sociais' });
    }
});

// 1. DASHBOARD INTEGRADO
router.get('/dashboard', garantirAfiliadoAprovado as any, async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        const id = req.afiliadoId;

        // const [clientesRows]: any = await poolPromise.query(
        //     `SELECT COUNT(DISTINCT usuario_id) as total_clientes 
        //      FROM fs_pagamentos 
        //      WHERE afiliado_id = ? AND status = 'concluido'`,
        //     [id]
        // );
        
        // const totalClientesDistintos = Number(clientesRows[0].total_clientes) || 0;
        // const MINIMO_CLIENTES_PARA_SAQUE = 3; 
        // const TRAVA_ATIVA = totalClientesDistintos < MINIMO_CLIENTES_PARA_SAQUE;

        // const sql = `
        //     SELECT 
        //         (SELECT COUNT(*) FROM fs_pagamentos p WHERE p.afiliado_id = ? AND p.status = 'concluido') as total_vendas,
        //         (SELECT COALESCE(SUM(p.comissao_gerada), 0) FROM fs_pagamentos p WHERE p.afiliado_id = ? AND p.status = 'concluido') as comissao_total,
        //         (SELECT COALESCE(SUM(p.comissao_gerada), 0) FROM fs_pagamentos p WHERE p.afiliado_id = ? AND p.status = 'concluido' AND (
        //             (p.forma_pagamento = 'PIX' OR p.forma_pagamento = 'SISTEMA') OR 
        //             (p.forma_pagamento = 'STRIPE' AND p.data_pagamento <= DATE_SUB(NOW(), INTERVAL 30 DAY))
        //          )) as comissao_maturada,
        //         (SELECT total_saques FROM fs_afiliados WHERE id = ?) as ja_pago
        // `;

        // const [resumo]: any = await poolPromise.query(sql, [id, id, id, id]);
        // const dados = resumo[0] as IDashboardRow;
        
        // const [cupomRow]: any = await poolPromise.query(
        //     'SELECT codigo FROM fs_cupons WHERE afiliado_id = ? LIMIT 1', 
        //     [id]
        // );
        const { rows: clientesRows } = await poolPromise.query(
            `SELECT COUNT(DISTINCT usuario_id) as total_clientes 
             FROM fs_pagamentos 
             WHERE afiliado_id = $1 AND status = 'concluido'`,
            [id]
        );
        
        const totalClientesDistintos = Number(clientesRows[0].total_clientes) || 0;
        const MINIMO_CLIENTES_PARA_SAQUE = 3; 
        const TRAVA_ATIVA = totalClientesDistintos < MINIMO_CLIENTES_PARA_SAQUE;

        const sql = `
            SELECT 
                (SELECT COUNT(*) FROM fs_pagamentos p WHERE p.afiliado_id = $1 AND p.status = 'concluido') as total_vendas,
                (SELECT COALESCE(SUM(p.comissao_gerada), 0) FROM fs_pagamentos p WHERE p.afiliado_id = $2 AND p.status = 'concluido') as comissao_total,
                (SELECT COALESCE(SUM(p.comissao_gerada), 0) FROM fs_pagamentos p WHERE p.afiliado_id = $3 AND p.status = 'concluido' AND (
                    (p.forma_pagamento = 'PIX' OR p.forma_pagamento = 'SISTEMA') OR 
                    (p.forma_pagamento = 'STRIPE' AND p.data_pagamento <= CURRENT_DATE - INTERVAL '30 DAYS')
                 )) as comissao_maturada,
                (SELECT total_saques FROM fs_afiliados WHERE id = $4) as ja_pago
        `;

        const { rows: resumo } = await poolPromise.query(sql, [id, id, id, id]);
        const dados = resumo[0] as IDashboardRow;
        
        const { rows: cupomRow } = await poolPromise.query(
            'SELECT codigo FROM fs_cupons WHERE afiliado_id = $1 LIMIT 1', 
            [id]
        );
        
        // Conversão rigorosa para garantir os cálculos de saldo no dashboard
        const comissaoMaturada = parseFloat(String(dados.comissao_maturada)) || 0;
        const comissaoTotal = parseFloat(String(dados.comissao_total)) || 0;
        const jaPago = parseFloat(String(dados.ja_pago)) || 0;

        let saldoDisponivel = Math.max(0, comissaoMaturada - jaPago);
        const saldoPendente = comissaoTotal - comissaoMaturada;
        
        res.json({
            total_vendas: dados.total_vendas,
            saldo_disponivel: saldoDisponivel,
            saldo_pendente: saldoPendente,
            total_recebido: jaPago,
            meu_cupom: cupomRow.length > 0 ? cupomRow[0].codigo : null,
            trava_saque: {
                ativa: TRAVA_ATIVA,
                faltam: Math.max(0, MINIMO_CLIENTES_PARA_SAQUE - totalClientesDistintos),
                minimo: MINIMO_CLIENTES_PARA_SAQUE
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao carregar dashboard' });
    }
});

// 2. EXTRATO INTEGRADO
router.get('/extrato', garantirAfiliadoAprovado as any, async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        // const [rows]: any = await poolPromise.query(`
        //     SELECT p.data_pagamento, p.valor as valor_venda, p.comissao_gerada, p.forma_pagamento, p.status, u.nome as nome_cliente
        //     FROM fs_pagamentos p
        //     JOIN fs_usuarios u ON p.usuario_id = u.id
        //     WHERE p.afiliado_id = ?
        //     ORDER BY p.data_pagamento DESC
        //     LIMIT 100
        // `, [req.afiliadoId]);
        const { rows } = await poolPromise.query(`
            SELECT p.data_pagamento, p.valor as valor_venda, p.comissao_gerada, p.forma_pagamento, p.status, u.nome as nome_cliente
            FROM fs_pagamentos p
            JOIN fs_usuarios u ON p.usuario_id = u.id
            WHERE p.afiliado_id = $1
            ORDER BY p.data_pagamento DESC
            LIMIT 100
        `, [req.afiliadoId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar extrato' });
    }
});

// 3. ROTA: Buscar Chave PIX e Cupom (ConfiguracaoPix.jsx)
router.get('/configuracoes', garantirAfiliadoAprovado as any, async (req: AuthRequest, res: Response): Promise<any> => {
    try {
        // const [userRows]: any = await poolPromise.query(
        //     'SELECT chave_pix, tipo_chave_pix FROM fs_usuarios WHERE id = ?', 
        //     [req.usuarioId]
        // );
        // const [cupomRows]: any = await poolPromise.query(
        //     'SELECT codigo FROM fs_cupons WHERE afiliado_id = ? LIMIT 1', 
        //     [req.afiliadoId]
        // );
        const { rows: userRows } = await poolPromise.query(
            'SELECT chave_pix, tipo_chave_pix FROM fs_usuarios WHERE id = $1', 
            [req.usuarioId]
        );
        const { rows: cupomRows } = await poolPromise.query(
            'SELECT codigo FROM fs_cupons WHERE afiliado_id = $1 LIMIT 1', 
            [req.afiliadoId]
        );
        
        const user = userRows[0] as IUsuarioRow;

        res.json({
            chave_pix: user?.chave_pix || '',
            tipo_chave_pix: user?.tipo_chave_pix || 'email',
            cupom: cupomRows[0]?.codigo || ''
        });
    } catch (error) {
        console.error('Erro ao buscar configs:', error);
        res.status(500).json({ error: 'Erro ao buscar dados.' });
    }
});

// 4. ROTA: Salvar/Atualizar Cupom e Chave PIX
router.post('/configuracoes', garantirAfiliadoAprovado as any, async (req: AuthRequest, res: Response): Promise<any> => {
    const { chave_pix, tipo_chave_pix, cupom } = req.body;

    if (!chave_pix || !tipo_chave_pix || !cupom) {
        return res.status(400).json({ error: 'Preencha todos os campos.' });
    }

    if (cupom.length < 5) return res.status(400).json({ error: 'O cupom deve ter pelo menos 5 caracteres.' });

    const codigoCupom = String(cupom).toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (codigoCupom.includes('COGNACARE')) {
        return res.status(400).json({ error: 'O termo "COGNACARE" é reservado para uso oficial.' });
    }

    let connection: any;
    try {
    //     connection = await poolPromise.getConnection();
    //     await connection.beginTransaction();

    //     // Verifica se o cupom já existe e pertence a OUTRA pessoa
    //     const [cupomExistente]: any = await connection.query(
    //         'SELECT id, afiliado_id FROM fs_cupons WHERE codigo = ?', 
    //         [codigoCupom]
    //     );
        
    //     if (cupomExistente.length > 0 && cupomExistente[0].afiliado_id !== req.afiliadoId) {
    //         await connection.rollback();
    //         return res.status(400).json({ error: 'Este cupom já está em uso por outro parceiro.' });
    //     }

    //     // Atualiza PIX do Usuário
    //     await connection.query(
    //         'UPDATE fs_usuarios SET chave_pix = ?, tipo_chave_pix = ? WHERE id = ?',
    //         [chave_pix, tipo_chave_pix, req.usuarioId]
    //     );
        
    //     // Verifica se já tem cupom registrado. Se sim, atualiza. Se não, insere.
    //     const [meuCupom]: any = await connection.query(
    //         'SELECT id FROM fs_cupons WHERE afiliado_id = ?', 
    //         [req.afiliadoId]
    //     );
        
    //     if (meuCupom.length > 0) {
    //         await connection.query(
    //             'UPDATE fs_cupons SET codigo = ? WHERE afiliado_id = ?', 
    //             [codigoCupom, req.afiliadoId]
    //         );
    //     } else {
    //         await connection.query(
    //             `INSERT INTO fs_cupons (codigo, afiliado_id, percentual_desconto, percentual_comissao, ativo) VALUES (?, ?, 10, 20, 1)`,
    //             [codigoCupom, req.afiliadoId]
    //         );
    //     }

    //     await connection.commit();
    //     res.json({ success: true, message: 'Configurações atualizadas com sucesso!' });
    // } catch (error) {
    //     if (connection) await connection.rollback();
    //     console.error('Erro ao salvar configs:', error);
    //     res.status(500).json({ error: 'Erro ao salvar dados.' });
        connection = await poolPromise.connect(); // PG Connect
        await connection.query('BEGIN'); // PG Transaction Start

        // Verifica se o cupom já existe e pertence a OUTRA pessoa
        const { rows: cupomExistente } = await connection.query(
            'SELECT id, afiliado_id FROM fs_cupons WHERE codigo = $1', 
            [codigoCupom]
        );
        
        if (cupomExistente.length > 0 && cupomExistente[0].afiliado_id !== req.afiliadoId) {
            await connection.query('ROLLBACK');
            return res.status(400).json({ error: 'Este cupom já está em uso por outro parceiro.' });
        }

        // Atualiza PIX do Usuário
        await connection.query(
            'UPDATE fs_usuarios SET chave_pix = $1, tipo_chave_pix = $2 WHERE id = $3',
            [chave_pix, tipo_chave_pix, req.usuarioId]
        );
        
        // Verifica se já tem cupom registrado
        const { rows: meuCupom } = await connection.query(
            'SELECT id FROM fs_cupons WHERE afiliado_id = $1', 
            [req.afiliadoId]
        );
        
        if (meuCupom.length > 0) {
            await connection.query(
                'UPDATE fs_cupons SET codigo = $1 WHERE afiliado_id = $2', 
                [codigoCupom, req.afiliadoId]
            );
        } else {
            await connection.query(
                `INSERT INTO fs_cupons (codigo, afiliado_id, percentual_desconto, percentual_comissao, ativo) VALUES ($1, $2, 10, 20, 1)`,
                [codigoCupom, req.afiliadoId]
            );
        }

        await connection.query('COMMIT');
        res.json({ success: true, message: 'Configurações atualizadas com sucesso!' });
    } catch (error) {
        if (connection) await connection.query('ROLLBACK');
        console.error('Erro ao salvar configs:', error);
        res.status(500).json({ error: 'Erro ao salvar dados.' });
    } finally {
        if (connection) connection.release();
    }
});

export default router;
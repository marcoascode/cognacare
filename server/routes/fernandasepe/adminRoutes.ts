import express, { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import imap from 'imap-simple';
import { simpleParser } from 'mailparser';

// Certifique-se de que a exportação nestes ficheiros suporte importação ES6, 
// ou utilize "import * as poolPromise from ..." dependendo do seu tsconfig (esModuleInterop)
import autenticarAdmin from '../../middleware/autenticarAdmin';
// import poolPromise from '../../config/mysqlPoolPromise';
import poolPromise from '../../config/pgPoolPromise';

const router = express.Router();

const imapConfig: any = {
  imap: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASS,
    host: process.env.EMAIL_HOST,
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }, // Importante para o Poste.io no Docker
    authTimeout: 10000
  }
};

// =========================================================================
// ESTATÍSTICAS E DASHBOARD
// =========================================================================

router.get('/dashboard-stats', autenticarAdmin, async (req: Request, res: Response) => {
    try {
        const startDate = req.query.startDate as string | undefined;
        const endDate = req.query.endDate as string | undefined;
        
        // let dateFilter = '';
        // let dateFilterAnd = ''; 
        // let queryParams: string[] = [];

        // if (startDate && endDate) {
        //     dateFilter = ' WHERE criado_em BETWEEN ? AND ? ';
        //     dateFilterAnd = ' AND criado_em BETWEEN ? AND ? ';
        //     queryParams = [startDate + ' 00:00:00', endDate + ' 23:59:59'];
        // }

        // const connection = await poolPromise.getConnection();

        // // 1. TOTAIS GERAIS
        // const [users]: any = await connection.query(`SELECT COUNT(*) as total FROM fs_usuarios ${dateFilter}`, queryParams);
        // const [kids]: any = await connection.query(`SELECT COUNT(*) as total FROM fs_crianca ${dateFilter}`, queryParams);
        // const [pifs]: any = await connection.query(`SELECT COUNT(*) as total FROM fs_plano_familiar ${dateFilter}`, queryParams);
        // const [msgs]: any = await connection.query(`SELECT COUNT(*) as total FROM fs_chat_logs ${dateFilter}`, queryParams);
        // const [afiliados]: any = await connection.query(`SELECT COUNT(*) as total FROM fs_usuarios WHERE is_affiliate = 1 ${dateFilterAnd}`, queryParams);
        // const [bonus]: any = await connection.query(`SELECT COUNT(*) as total FROM fs_usuarios WHERE perfil_recompensado = 1 ${dateFilterAnd}`, queryParams);

        // let faturamentoFilter = '';
        // let fatParams: string[] = [];
        // if (startDate && endDate) {
        //     faturamentoFilter = ' AND data_pagamento BETWEEN ? AND ? ';
        //     fatParams = [startDate + ' 00:00:00', endDate + ' 23:59:59'];
        // }
        // const [faturamento]: any = await connection.query(`SELECT COALESCE(SUM(valor), 0) as total FROM fs_pagamentos WHERE status = 'concluido' ${faturamentoFilter}`, fatParams);

        // // 2. GRÁFICOS (Evolução Temporal)
        // const [dailyUsers]: any = await connection.query(`
        //     SELECT DATE_FORMAT(criado_em, '%Y-%m-%d') as data, COUNT(*) as count 
        //     FROM fs_usuarios 
        //     ${dateFilter ? dateFilter : 'WHERE criado_em >= DATE_SUB(NOW(), INTERVAL 30 DAY)'}
        //     GROUP BY DATE_FORMAT(criado_em, '%Y-%m-%d')
        //     ORDER BY data ASC
        // `, queryParams);

        // const [dailyPifs]: any = await connection.query(`
        //     SELECT DATE_FORMAT(criado_em, '%Y-%m-%d') as data, COUNT(*) as count 
        //     FROM fs_plano_familiar 
        //     ${dateFilter ? dateFilter : 'WHERE criado_em >= DATE_SUB(NOW(), INTERVAL 30 DAY)'}
        //     GROUP BY DATE_FORMAT(criado_em, '%Y-%m-%d')
        //     ORDER BY data ASC
        // `, queryParams);

        // // 3. ANÁLISE DE ENGAJAMENTO
        // const [formularios]: any = await connection.query(
        //     `SELECT dados_formulario FROM fs_plano_familiar WHERE resposta_ia IS NULL ${dateFilterAnd}`, 
        //     queryParams
        // );

        // const stepCounts: Record<string, number> = {
        //     'Disponibilidade': 0, 'Brincar': 0, 'Linguagem': 0, 'Cognição': 0,
        //     'Socioemocional': 0, 'Motor': 0, 'AVDs': 0
        // };

        // const hasDataInStep = (stepKey: string, currentFormData: any) => {
        //     if (!currentFormData) return false;
        //     const data = currentFormData[stepKey];
        //     if (!data) return false;
        //     if (stepKey === 'disponibilidade') return !!data.tem_tempo;
        //     return Object.values(data).some(val => val === true || (typeof val === 'string' && val.trim().length > 0));
        // };

        // formularios.forEach((row: any) => {
        //     let dados = row.dados_formulario;
        //     if (typeof dados === 'string') {
        //         try { dados = JSON.parse(dados); } catch (e) { dados = {}; }
        //     }
        //     if (!dados) return;

        //     if (hasDataInStep('disponibilidade', dados)) stepCounts['Disponibilidade']++;
        //     if (hasDataInStep('pif_steps.play', dados)) stepCounts['Brincar']++;
        //     if (hasDataInStep('pif_steps.language', dados)) stepCounts['Linguagem']++;
        //     if (hasDataInStep('pif_steps.cognition', dados)) stepCounts['Cognição']++;
        //     if (hasDataInStep('pif_steps.social_emotional', dados)) stepCounts['Socioemocional']++;
        //     if (hasDataInStep('pif_steps.motor', dados)) stepCounts['Motor']++;
        //     if (hasDataInStep('pif_steps.avd', dados)) stepCounts['AVDs']++;
        // });

        // const pifStepsChart = Object.keys(stepCounts).map(key => ({
        //     name: key,
        //     count: stepCounts[key]
        // }));

        // // 4. LISTA DETALHADA DE USUÁRIOS
        // const [usersList]: any = await connection.query(`
        //     SELECT 
        //         u.id, u.criado_em, u.nome, u.tipo_plano, u.creditos, u.chat_mensagens_restantes, u.is_affiliate,
        //         (SELECT COUNT(*) FROM fs_crianca c WHERE c.usuario_id = u.id) as total_criancas,
        //         (SELECT COUNT(*) FROM fs_plano_familiar p WHERE p.usuario_id = u.id AND p.resposta_ia IS NOT NULL) as total_pifs
        //     FROM fs_usuarios u
        //     ORDER BY u.criado_em DESC
        // `);

        // connection.release();

        // res.json({
        //     totals: {
        //         users: users[0].total,
        //         kids: kids[0].total,
        //         pifs: pifs[0].total,
        //         messages: msgs[0].total,
        //         afiliados: afiliados[0].total,
        //         faturamento: parseFloat(faturamento[0].total),
        //         bonusRecoveries: bonus[0].total || 0 
        //     },
        let dateFilter = '';
        let dateFilterAnd = ''; 
        let queryParams: string[] = [];

        if (startDate && endDate) {
            // Em Postgres usamos $1 e $2
            dateFilter = ' WHERE criado_em BETWEEN $1 AND $2 ';
            dateFilterAnd = ' AND criado_em BETWEEN $1 AND $2 ';
            queryParams = [startDate + ' 00:00:00', endDate + ' 23:59:59'];
        }

        const connection = await poolPromise.connect();

        // 1. TOTAIS GERAIS
        const { rows: users } = await connection.query(`SELECT COUNT(*) as total FROM fs_usuarios ${dateFilter}`, queryParams);
        const { rows: kids } = await connection.query(`SELECT COUNT(*) as total FROM fs_crianca ${dateFilter}`, queryParams);
        const { rows: pifs } = await connection.query(`SELECT COUNT(*) as total FROM fs_plano_familiar ${dateFilter}`, queryParams);
        const { rows: msgs } = await connection.query(`SELECT COUNT(*) as total FROM fs_chat_logs ${dateFilter}`, queryParams);
        const { rows: afiliados } = await connection.query(`SELECT COUNT(*) as total FROM fs_usuarios WHERE is_affiliate = 1 ${dateFilterAnd}`, queryParams);
        const { rows: bonus } = await connection.query(`SELECT COUNT(*) as total FROM fs_usuarios WHERE perfil_recompensado = 1 ${dateFilterAnd}`, queryParams);

        let faturamentoFilter = '';
        let fatParams: string[] = [];
        if (startDate && endDate) {
            faturamentoFilter = ' AND data_pagamento BETWEEN $1 AND $2 ';
            fatParams = [startDate + ' 00:00:00', endDate + ' 23:59:59'];
        }
        const { rows: faturamento } = await connection.query(`SELECT COALESCE(SUM(valor), 0) as total FROM fs_pagamentos WHERE status = 'concluido' ${faturamentoFilter}`, fatParams);

        // 2. GRÁFICOS (Evolução Temporal)
        const { rows: dailyUsers } = await connection.query(`
            SELECT TO_CHAR(criado_em, 'YYYY-MM-DD') as data, COUNT(*) as count 
            FROM fs_usuarios 
            ${dateFilter ? dateFilter : "WHERE criado_em >= CURRENT_DATE - INTERVAL '30 DAYS'"}
            GROUP BY TO_CHAR(criado_em, 'YYYY-MM-DD')
            ORDER BY data ASC
        `, queryParams);

        const { rows: dailyPifs } = await connection.query(`
            SELECT TO_CHAR(criado_em, 'YYYY-MM-DD') as data, COUNT(*) as count 
            FROM fs_plano_familiar 
            ${dateFilter ? dateFilter : "WHERE criado_em >= CURRENT_DATE - INTERVAL '30 DAYS'"}
            GROUP BY TO_CHAR(criado_em, 'YYYY-MM-DD')
            ORDER BY data ASC
        `, queryParams);

        // 3. ANÁLISE DE ENGAJAMENTO
        const { rows: formularios } = await connection.query(
            `SELECT dados_formulario FROM fs_plano_familiar WHERE resposta_ia IS NULL ${dateFilterAnd}`, 
            queryParams
        );
        
        const stepCounts: Record<string, number> = {
            'Disponibilidade': 0, 'Brincar': 0, 'Linguagem': 0, 'Cognição': 0,
            'Socioemocional': 0, 'Motor': 0, 'AVDs': 0
        };

        const hasDataInStep = (stepKey: string, currentFormData: any) => {
            if (!currentFormData) return false;
            const data = currentFormData[stepKey];
            if (!data) return false;
            if (stepKey === 'disponibilidade') return !!data.tem_tempo;
            return Object.values(data).some(val => val === true || (typeof val === 'string' && val.trim().length > 0));
        };

        formularios.forEach((row: any) => {
            let dados = row.dados_formulario;
            if (typeof dados === 'string') {
                try { dados = JSON.parse(dados); } catch (e) { dados = {}; }
            }
            if (!dados) return;

            if (hasDataInStep('disponibilidade', dados)) stepCounts['Disponibilidade']++;
            if (hasDataInStep('pif_steps.play', dados)) stepCounts['Brincar']++;
            if (hasDataInStep('pif_steps.language', dados)) stepCounts['Linguagem']++;
            if (hasDataInStep('pif_steps.cognition', dados)) stepCounts['Cognição']++;
            if (hasDataInStep('pif_steps.social_emotional', dados)) stepCounts['Socioemocional']++;
            if (hasDataInStep('pif_steps.motor', dados)) stepCounts['Motor']++;
            if (hasDataInStep('pif_steps.avd', dados)) stepCounts['AVDs']++;
        });

        const pifStepsChart = Object.keys(stepCounts).map(key => ({
            name: key,
            count: stepCounts[key]
        }));

        // 4. LISTA DETALHADA DE USUÁRIOS
        const { rows: usersList } = await connection.query(`
            SELECT 
                u.id, u.criado_em, u.nome, u.tipo_plano, u.creditos, u.chat_mensagens_restantes, u.is_affiliate,
                (SELECT COUNT(*) FROM fs_crianca c WHERE c.usuario_id = u.id) as total_criancas,
                (SELECT COUNT(*) FROM fs_plano_familiar p WHERE p.usuario_id = u.id AND p.resposta_ia IS NOT NULL) as total_pifs
            FROM fs_usuarios u
            ORDER BY u.criado_em DESC
        `);

        connection.release();

        res.json({
            totals: {
                users: Number(users[0].total),
                kids: Number(kids[0].total),
                pifs: Number(pifs[0].total),
                messages: Number(msgs[0].total),
                afiliados: Number(afiliados[0].total),
                faturamento: parseFloat(faturamento[0].total),
                bonusRecoveries: Number(bonus[0].total) || 0 
            },
            charts: { dailyUsers, dailyPifs, pifStepsChart },
            usersList
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao buscar estatísticas.' });
    }
});

router.get('/usuarios', autenticarAdmin, async (req: Request, res: Response) => {
    try {
        // const [rows]: any = await poolPromise.execute(
        //     'SELECT id, nome, email, creditos FROM fs_usuarios ORDER BY nome'
        // );
        const { rows } = await poolPromise.query(
            'SELECT id, nome, email, creditos FROM fs_usuarios ORDER BY nome'
        );
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});

// =========================================================================
// AFILIADOS E PAGAMENTOS
// =========================================================================

router.get('/afiliados', autenticarAdmin, async (req: Request, res: Response) => {
    try {
        // Regra de Negócio:
        // - PIX: Liberado se a venda foi feita antes do dia 01 deste mês (Mês fechado).
        // - CARTÃO: Liberado se a venda tem mais de 30 dias.
        // - STATUS: Apenas 'concluido' gera comissão. 'reembolsado'/'chargeback' não soma.
        // const sql = `
        //     SELECT 
        //         a.id, a.nome, a.email, a.chave_pix,
        //         a.status, a.redes_sociais, a.relacao_causa, a.criado_em,
        //         (SELECT COUNT(*) FROM fs_pagamentos p WHERE p.afiliado_id = a.id AND p.status = 'concluido') as total_vendas,
        //         (SELECT COALESCE(SUM(p.valor), 0) FROM fs_pagamentos p WHERE p.afiliado_id = a.id AND p.status = 'concluido') as valor_total_vendido,
        //         a.total_saques,
        //         (SELECT COALESCE(SUM(p.comissao_gerada), 0) FROM fs_pagamentos p WHERE p.afiliado_id = a.id AND p.status = 'concluido') as comissao_total_acumulada,
        //         (SELECT COALESCE(SUM(p.comissao_gerada), 0) 
        //          FROM fs_pagamentos p 
        //          WHERE p.afiliado_id = a.id 
        //          AND p.status = 'concluido'
        //          AND (
        //             (p.forma_pagamento = 'PIX' OR p.forma_pagamento = 'SISTEMA') 
        //             OR 
        //             (p.forma_pagamento = 'STRIPE' AND p.data_pagamento <= DATE_SUB(NOW(), INTERVAL 30 DAY))
        //          )
        //         ) as comissao_liberada
        //     FROM fs_afiliados a
        //     ORDER BY a.criado_em DESC
        // `;
        const sql = `
            SELECT 
                a.id, a.nome, a.email, a.chave_pix,
                a.status, a.redes_sociais, a.relacao_causa, a.criado_em,
                (SELECT COUNT(*) FROM fs_pagamentos p WHERE p.afiliado_id = a.id AND p.status = 'concluido') as total_vendas,
                (SELECT COALESCE(SUM(p.valor), 0) FROM fs_pagamentos p WHERE p.afiliado_id = a.id AND p.status = 'concluido') as valor_total_vendido,
                a.total_saques,
                (SELECT COALESCE(SUM(p.comissao_gerada), 0) FROM fs_pagamentos p WHERE p.afiliado_id = a.id AND p.status = 'concluido') as comissao_total_acumulada,
                (SELECT COALESCE(SUM(p.comissao_gerada), 0) 
                 FROM fs_pagamentos p 
                 WHERE p.afiliado_id = a.id 
                 AND p.status = 'concluido'
                 AND (
                    (p.forma_pagamento = 'PIX' OR p.forma_pagamento = 'SISTEMA') 
                    OR 
                    (p.forma_pagamento = 'STRIPE' AND p.data_pagamento <= CURRENT_DATE - INTERVAL '30 DAYS')
                 )
                ) as comissao_liberada
            FROM fs_afiliados a
            ORDER BY a.criado_em DESC
        `;

        // const [rows]: any = await poolPromise.query(sql);
        const { rows } = await poolPromise.query(sql);

        const afiliadosProcessados = rows.map((a: any) => {
            const comissaoTotal = parseFloat(a.comissao_total_acumulada);
            const comissaoLiberada = parseFloat(a.comissao_liberada);
            const jaPago = parseFloat(a.total_saques || 0);

            const saldoDisponivel = Math.max(0, comissaoLiberada - jaPago);
            const saldoPendente = comissaoTotal - comissaoLiberada;

            return {
                ...a,
                saldo_disponivel: saldoDisponivel.toFixed(2),
                saldo_pendente: saldoPendente.toFixed(2)
            };
        });

        res.json(afiliadosProcessados);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao listar afiliados' });
    }
});

router.post('/afiliados', async (req: Request, res: Response) => {
    const { nome, email, chave_pix } = req.body as { nome: string, email: string, chave_pix: string };
    try {
        // await poolPromise.query(
        //     'INSERT INTO fs_afiliados (nome, email, chave_pix) VALUES (?, ?, ?)',
        //     [nome, email, chave_pix]
        // );
        await poolPromise.query(
            'INSERT INTO fs_afiliados (nome, email, chave_pix) VALUES ($1, $2, $3)',
            [nome, email, chave_pix]
        );
        res.status(201).json({ message: 'Afiliado criado com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar afiliado (Email duplicado?)' });
    }
});

router.put('/afiliados/:id/aprovar', autenticarAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    let connection: any;
    try {
        // connection = await poolPromise.getConnection();
        // await connection.beginTransaction();

        // const [afiliadoRows]: any = await connection.query('SELECT usuario_id, nome, email FROM fs_afiliados WHERE id = ?', [id]);
        // if (afiliadoRows.length === 0) {
        //     await connection.rollback();
        //     return res.status(404).json({ error: 'Afiliado não encontrado' });
        // }
        // const afiliado = afiliadoRows[0];

        // await connection.query('UPDATE fs_afiliados SET status = "aprovado" WHERE id = ?', [id]);
        // await connection.query('UPDATE fs_usuarios SET is_affiliate = 1 WHERE id = ?', [afiliado.usuario_id]);

        // await connection.commit();
        connection = await poolPromise.connect();
        await connection.query('BEGIN');

        const { rows: afiliadoRows } = await connection.query('SELECT usuario_id, nome, email FROM fs_afiliados WHERE id = $1', [id]);
        if (afiliadoRows.length === 0) {
            await connection.query('ROLLBACK');
            return res.status(404).json({ error: 'Afiliado não encontrado' });
        }
        const afiliado = afiliadoRows[0];

        await connection.query('UPDATE fs_afiliados SET status = \'aprovado\' WHERE id = $1', [id]);
        await connection.query('UPDATE fs_usuarios SET is_affiliate = 1 WHERE id = $1', [afiliado.usuario_id]);

        await connection.query('COMMIT');

        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT),
            secure: process.env.EMAIL_PORT === '465',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
            tls: { rejectUnauthorized: false }
        });

        const mailOptions = {
            from: `"CognaCare" <${process.env.EMAIL_USER}>`,
            to: afiliado.email,
            subject: '🎉 Sua parceria com a Cognacare foi aprovada!',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto;">
                    <h2>Olá, ${afiliado.nome}!</h2>
                    <p>Temos uma ótima notícia: sua solicitação para o Programa de Parceiros da Cognacare foi analisada e <strong>aprovada</strong>!</p>
                    <p>Para começar a divulgar, ajudar outras famílias e ganhar suas comissões, acesse seu painel de parceiro para configurar seu <b>cupom de desconto exclusivo</b> e sua <b>chave PIX</b> de recebimentos.</p>
                    <p style="text-align: center; margin-top: 30px;">
                        <a href="https://pif.cognacare.com/painel-parceiro" style="padding: 12px 24px; background-color: #1976d2; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">Acessar Painel do Parceiro</a>
                    </p>
                    <br/>
                    <p>Bem-vindo(a) ao time!</p>
                    <p>Equipe Cognacare</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Afiliado aprovado com sucesso e e-mail enviado!' });

    } catch (error) {
        // if (connection) await connection.rollback();
        if (connection) await connection.query('ROLLBACK');
        console.error('Erro ao aprovar afiliado:', error);
        res.status(500).json({ error: 'Erro ao aprovar afiliado e enviar e-mail' });
    } finally {
        if (connection) connection.release();
    }
});

router.get('/afiliados/:id/extrato', autenticarAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // const [rows]: any = await poolPromise.query(`
        //     SELECT 
        //         p.id, p.data_pagamento, p.valor as valor_venda, p.comissao_gerada, p.forma_pagamento,
        //         p.status, p.cupom_utilizado, u.nome as nome_cliente
        //     FROM fs_pagamentos p
        //     JOIN fs_usuarios u ON p.usuario_id = u.id
        //     WHERE p.afiliado_id = ?
        //     ORDER BY p.data_pagamento DESC
        // `, [id]);
        
        const { rows } = await poolPromise.query(`
            SELECT p.id, p.data_pagamento, p.valor as valor_venda, p.comissao_gerada, p.forma_pagamento, p.status, p.cupom_utilizado, u.nome as nome_cliente
            FROM fs_pagamentos p
            JOIN fs_usuarios u ON p.usuario_id = u.id
            WHERE p.afiliado_id = $1
            ORDER BY p.data_pagamento DESC
        `, [id]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar extrato' });
    }
});

router.post('/afiliados/:id/pagar', autenticarAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { valor } = req.body; 

    let connection: any;
    try {
        // connection = await poolPromise.getConnection();
        // await connection.beginTransaction();

        // await connection.query('UPDATE fs_afiliados SET total_saques = total_saques + ? WHERE id = ?', [valor, id]);
        // await connection.query('INSERT INTO fs_afiliados_saques (afiliado_id, valor, data) VALUES (?, ?, NOW())', [id, valor]);

        // await connection.commit();
        connection = await poolPromise.connect();
        await connection.query('BEGIN');

        await connection.query('UPDATE fs_afiliados SET total_saques = total_saques + $1 WHERE id = $2', [valor, id]);
        await connection.query('INSERT INTO fs_afiliados_saques (afiliado_id, valor, data) VALUES ($1, $2, CURRENT_TIMESTAMP)', [id, valor]);

        await connection.query('COMMIT');
        res.json({ message: 'Pagamento registrado' });
    } catch (error) {
        // if (connection) await connection.rollback();
        if (connection) await connection.query('ROLLBACK');
        res.status(500).json({ error: 'Erro ao pagar' });
    } finally {
        if (connection) connection.release();
    }
});

// =========================================================================
// CUPONS E COBRANÇAS
// =========================================================================

router.get('/cupons', autenticarAdmin, async (req: Request, res: Response) => {
    try {
        // const [rows]: any = await poolPromise.query(`
        //     SELECT c.*, a.nome as nome_afiliado 
        //     FROM fs_cupons c
        //     JOIN fs_afiliados a ON c.afiliado_id = a.id
        //     ORDER BY c.criado_em DESC
        // `);
        const { rows } = await poolPromise.query(`
            SELECT c.*, a.nome as nome_afiliado FROM fs_cupons c JOIN fs_afiliados a ON c.afiliado_id = a.id ORDER BY c.criado_em DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao listar cupons' });
    }
});

router.post('/cupons', autenticarAdmin, async (req: Request, res: Response) => {
    const { codigo, afiliado_id, percentual_desconto, percentual_comissao } = req.body;
    try {
        // await poolPromise.query(
        //     'INSERT INTO fs_cupons (codigo, afiliado_id, percentual_desconto, percentual_comissao, ativo) VALUES (?, ?, ?, ?, 1)',
        //     [String(codigo).toUpperCase(), afiliado_id, percentual_desconto, percentual_comissao]
        // );
        await poolPromise.query(
            'INSERT INTO fs_cupons (codigo, afiliado_id, percentual_desconto, percentual_comissao, ativo) VALUES ($1, $2, $3, $4, 1)',
            [String(codigo).toUpperCase(), afiliado_id, percentual_desconto, percentual_comissao]
        );
        res.status(201).json({ message: 'Cupom criado com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar cupom (Código já existe?)' });
    }
});

router.patch('/cupons/:id/toggle', autenticarAdmin, async (req: Request, res: Response) => {
    try {
        // await poolPromise.query('UPDATE fs_cupons SET ativo = NOT ativo WHERE id = ?', [req.params.id]);
        await poolPromise.query('UPDATE fs_cupons SET ativo = NOT ativo WHERE id = $1', [req.params.id]);
        res.json({ message: 'Status atualizado' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar cupom' });
    }
});

router.get('/cobrancas', autenticarAdmin, async (req: Request, res: Response) => {
    try {
        const nomeFiltro = req.query.nome ? `%${req.query.nome}%` : '%';
        
        // CORREÇÃO: Utilizando poolPromise.execute ao invés de pool.execute
        // const [rows]: any = await poolPromise.execute(`
        //     SELECT 
        //     c.id, u.nome AS usuario_nome, c.tipo, c.criacao, c.txid, c.charge_id,
        //     c.description, c.status, c.chave, c.valor_total, c.parcelas
        //     FROM fs_cobrancas c
        //     INNER JOIN fs_usuarios u ON u.id = c.usuario_id
        //     WHERE u.nome LIKE ?
        //     ORDER BY c.criacao DESC
        // `, [nomeFiltro]);
        const { rows } = await poolPromise.query(`
            SELECT c.id, u.nome AS usuario_nome, c.tipo, c.criacao, c.txid, c.charge_id, c.description, c.status, c.chave, c.valor_total, c.parcelas
            FROM fs_cobrancas c
            INNER JOIN fs_usuarios u ON u.id = c.usuario_id
            WHERE u.nome LIKE $1
            ORDER BY c.criacao DESC
        `, [nomeFiltro]);

        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao consultar cobranças' });
    }
});

router.get('/pagamentos', autenticarAdmin, async (req: Request, res: Response) => {
    try {
        const startDate = req.query.startDate as string | undefined;
        const endDate = req.query.endDate as string | undefined;
        let dateFilter = '';
        let queryParams: string[] = [];

        // if (startDate && endDate) {
        //     dateFilter = ' WHERE p.data_pagamento BETWEEN ? AND ? ';
        //     queryParams = [startDate + ' 00:00:00', endDate + ' 23:59:59'];
        // }

        // const connection = await poolPromise.getConnection();

        // const [totais]: any = await connection.query(`
        //     SELECT 
        //         COUNT(*) as total_vendas,
        //         COALESCE(SUM(valor), 0) as faturamento,
        //         COALESCE(SUM(comissao_gerada), 0) as comissoes
        //     FROM fs_pagamentos p
        //     ${dateFilter ? dateFilter + " AND p.status = 'concluido'" : "WHERE p.status = 'concluido'"}
        // `, queryParams);

        // const [produtos]: any = await connection.query(`
        //     SELECT 
        //         COALESCE(descricao, 'Outros') as name, 
        //         COUNT(*) as count 
        //     FROM fs_pagamentos p
        //     ${dateFilter ? dateFilter + " AND p.status = 'concluido'" : "WHERE p.status = 'concluido'"}
        //     GROUP BY descricao
        //     ORDER BY count DESC
        // `, queryParams);

        // const [formasPagamento]: any = await connection.query(`
        //     SELECT 
        //         forma_pagamento as name, 
        //         COUNT(*) as count 
        //     FROM fs_pagamentos p
        //     ${dateFilter ? dateFilter + " AND p.status = 'concluido'" : "WHERE p.status = 'concluido'"}
        //     GROUP BY forma_pagamento
        //     ORDER BY count DESC
        // `, queryParams);

        // const [lista]: any = await connection.query(`
        //     SELECT 
        //         p.id, p.data_pagamento, p.forma_pagamento, p.valor, p.status, p.descricao,
        //         p.comissao_gerada, u.nome as usuario_nome
        //     FROM fs_pagamentos p
        //     JOIN fs_usuarios u ON p.usuario_id = u.id
        //     ${dateFilter}
        //     ORDER BY p.data_pagamento DESC
        // `, queryParams);

        // connection.release();

        // res.json({
        //     totals: {
        //         vendas: totais[0].total_vendas,
        //         faturamento: parseFloat(totais[0].faturamento),
        //         comissoes: parseFloat(totais[0].comissoes)
        //     },
        //     charts: { produtos, formasPagamento },
        //     lista
        // });
        if (startDate && endDate) {
            dateFilter = ' WHERE p.data_pagamento BETWEEN $1 AND $2 ';
            queryParams = [startDate + ' 00:00:00', endDate + ' 23:59:59'];
        }

        const connection = await poolPromise.connect();

        const { rows: totais } = await connection.query(`
            SELECT COUNT(*) as total_vendas, COALESCE(SUM(valor), 0) as faturamento, COALESCE(SUM(comissao_gerada), 0) as comissoes
            FROM fs_pagamentos p
            ${dateFilter ? dateFilter + " AND p.status = 'concluido'" : "WHERE p.status = 'concluido'"}
        `, queryParams);

        const { rows: produtos } = await connection.query(`
            SELECT COALESCE(descricao, 'Outros') as name, COUNT(*) as count 
            FROM fs_pagamentos p
            ${dateFilter ? dateFilter + " AND p.status = 'concluido'" : "WHERE p.status = 'concluido'"}
            GROUP BY descricao ORDER BY count DESC
        `, queryParams);

        const { rows: formasPagamento } = await connection.query(`
            SELECT forma_pagamento as name, COUNT(*) as count 
            FROM fs_pagamentos p
            ${dateFilter ? dateFilter + " AND p.status = 'concluido'" : "WHERE p.status = 'concluido'"}
            GROUP BY forma_pagamento ORDER BY count DESC
        `, queryParams);

        const { rows: lista } = await connection.query(`
            SELECT p.id, p.data_pagamento, p.forma_pagamento, p.valor, p.status, p.descricao, p.comissao_gerada, u.nome as usuario_nome
            FROM fs_pagamentos p
            JOIN fs_usuarios u ON p.usuario_id = u.id
            ${dateFilter}
            ORDER BY p.data_pagamento DESC
        `, queryParams);

        connection.release();

        res.json({
            totals: {
                vendas: Number(totais[0].total_vendas),
                faturamento: parseFloat(totais[0].faturamento),
                comissoes: parseFloat(totais[0].comissoes)
            },
            charts: { produtos, formasPagamento },
            lista
        });

    } catch (error) {
        console.error('Erro ao buscar dados financeiros:', error);
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});

// =========================================================================
// SISTEMA DE EMAILS (IMAP)
// =========================================================================

router.get('/emails', autenticarAdmin, async (req: Request, res: Response) => {
  let connection: any;
  try {
    connection = await imap.connect(imapConfig);
    await connection.openBox('INBOX');

    const searchCriteria = ['ALL'];
    const fetchOptions = { bodies: ['HEADER'], markSeen: false };

    const messages = await connection.search(searchCriteria, fetchOptions);

    const emails = messages.map((item: any) => {
      const headerPart = item.parts.find((part: any) => part.which === 'HEADER');
      const header = headerPart.body;

      return {
        id: item.attributes.uid, 
        seq: item.attributes.seq,
        from: header.from ? header.from[0] : 'Desconhecido',
        subject: header.subject ? header.subject[0] : '(Sem Assunto)',
        date: header.date ? header.date[0] : '',
        seen: item.attributes.flags.includes('\\Seen') 
      };
    });

    const sortedEmails = emails.reverse().slice(0, 30);
    res.json(sortedEmails);
  } catch (error) {
    console.error('Erro IMAP Listagem:', error);
    res.status(500).json({ erro: 'Erro ao listar e-mails.' });
  } finally {
    if (connection) {
      try { connection.end(); } catch (e) { }
    }
  }
});

router.get('/emails/:uid', autenticarAdmin, async (req: Request, res: Response) => {
  const { uid } = req.params;
  let connection: any;

  try {
    connection = await imap.connect(imapConfig);
    await connection.openBox('INBOX');

    const searchCriteria = [['UID', uid]];
    const fetchOptions = { bodies: [''], markSeen: true };

    const messages = await connection.search(searchCriteria, fetchOptions);

    if (messages.length === 0) {
      return res.status(404).json({ erro: 'E-mail não encontrado.' });
    }

    const message = messages[0];
    const allPart = message.parts.find((part: any) => part.which === ''); 

    const parsed = await simpleParser(allPart.body);

    const emailData = {
      id: message.attributes.uid,
      from: parsed.from?.text || 'Desconhecido',
      to: Array.isArray(parsed.to) 
        ? parsed.to.map(t => t.text).join(', ') 
        : parsed.to?.text || 'Mim',
      subject: parsed.subject,
      date: parsed.date,
      html: parsed.html || '', 
      text: parsed.text || '', 
      attachments: parsed.attachments ? parsed.attachments.map((att: any) => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
      })) : []
    };

    res.json(emailData);

  } catch (error) {
    console.error('Erro IMAP Leitura:', error);
    res.status(500).json({ erro: 'Erro ao ler o conteúdo do e-mail.' });
  } finally {
    if (connection) {
      try { connection.end(); } catch (e) { }
    }
  }
});

router.delete('/emails/:uid', autenticarAdmin, async (req: Request, res: Response) => {
  const { uid } = req.params;
  let connection: any;

  try {
    connection = await imap.connect(imapConfig);
    await connection.openBox('INBOX');
    await connection.addFlags(uid, '\\Deleted', { byUid: true });
    await connection.imap.expunge();

    res.json({ success: true, mensagem: 'E-mail excluído.' });
  } catch (error) {
    console.error('Erro IMAP Exclusão:', error);
    res.status(500).json({ erro: 'Erro ao excluir e-mail.' });
  } finally {
    if (connection) {
      try { connection.end(); } catch (e) { }
    }
  }
});

// =========================================================================
// GESTÃO DE PROMPTS DA IA E AUDITORIA (API USAGE)
// =========================================================================

router.get('/prompts', autenticarAdmin, async (req: Request, res: Response) => {
    try {
        // const [prompts]: any = await poolPromise.query('SELECT * FROM fs_prompts ORDER BY chave ASC');
        const { rows: prompts } = await poolPromise.query('SELECT * FROM fs_prompts ORDER BY chave ASC');
        res.json(prompts);
    } catch (error) {
        console.error('Erro ao buscar prompts:', error);
        res.status(500).json({ erro: 'Erro ao buscar prompts no banco de dados.' });
    }
});

router.post('/prompts', autenticarAdmin, async (req: Request, res: Response) => {
    try {
        const { chave, titulo, texto_prompt, modelo, temperatura, max_tokens } = req.body;

        if (!chave || !titulo || !texto_prompt) {
            return res.status(400).json({ erro: 'Chave, Título e Texto são obrigatórios.' });
        }

        // const query = `
        //     INSERT INTO fs_prompts (chave, titulo, texto_prompt, modelo, temperatura, max_tokens) 
        //     VALUES (?, ?, ?, ?, ?, ?)
        //     ON DUPLICATE KEY UPDATE 
        //     titulo = VALUES(titulo),
        //     texto_prompt = VALUES(texto_prompt),
        //     modelo = VALUES(modelo),
        //     temperatura = VALUES(temperatura),
        //     max_tokens = VALUES(max_tokens)
        // `;

        // await poolPromise.query(query, [
        //     chave, titulo, texto_prompt, 
        //     modelo || 'claude-3-5-sonnet-20241022', 
        //     temperatura || 0.5, 
        //     max_tokens || 4000
        // ]);
        const query = `
            INSERT INTO fs_prompts (chave, titulo, texto_prompt, modelo, temperatura, max_tokens) 
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (chave) DO UPDATE SET 
            titulo = EXCLUDED.titulo,
            texto_prompt = EXCLUDED.texto_prompt,
            modelo = EXCLUDED.modelo,
            temperatura = EXCLUDED.temperatura,
            max_tokens = EXCLUDED.max_tokens
        `;
        await poolPromise.query(query, [
            chave, titulo, texto_prompt,
            modelo || 'claude-3-5-sonnet-20241022',
            temperatura || 0.5,
            max_tokens || 4000
        ]);

        res.json({ success: true, mensagem: 'Prompt guardado com sucesso!' });
    } catch (error) {
        console.error('Erro ao salvar prompt:', error);
        res.status(500).json({ erro: 'Erro ao guardar prompt. Verifique se a chave é válida.' });
    }
});

router.put('/prompts/:chave', autenticarAdmin, async (req: Request, res: Response) => {
    try {
        const { chave } = req.params;
        const { texto_prompt, modelo, temperatura, max_tokens, repetition_penalty, titulo } = req.body;

        if (texto_prompt === undefined) {
            return res.status(400).json({ erro: 'O campo de texto do prompt é obrigatório.' });
        }

        // await poolPromise.query(
        //     `INSERT INTO fs_prompts 
        //         (chave, texto_prompt, modelo, temperatura, max_tokens, repetition_penalty, titulo) 
        //      VALUES (?, ?, ?, ?, ?, ?, ?)
        //      ON DUPLICATE KEY UPDATE 
        //         texto_prompt = VALUES(texto_prompt), 
        //         modelo = COALESCE(VALUES(modelo), modelo), 
        //         temperatura = COALESCE(VALUES(temperatura), temperatura), 
        //         max_tokens = COALESCE(VALUES(max_tokens), max_tokens), 
        //         repetition_penalty = COALESCE(VALUES(repetition_penalty), repetition_penalty),
        //         titulo = COALESCE(VALUES(titulo), titulo)`,
        //     [
        //         chave, 
        //         texto_prompt, 
        //         modelo || 'claude-3-5-sonnet-20241022', 
        //         temperatura || 0.7, 
        //         max_tokens || 1024, 
        //         repetition_penalty || 1.0, 
        //         titulo || chave
        //     ]
        // );
        await poolPromise.query(
            `INSERT INTO fs_prompts 
                (chave, texto_prompt, modelo, temperatura, max_tokens, repetition_penalty, titulo) 
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (chave) DO UPDATE SET 
                texto_prompt = EXCLUDED.texto_prompt, 
                modelo = COALESCE(EXCLUDED.modelo, fs_prompts.modelo), 
                temperatura = COALESCE(EXCLUDED.temperatura, fs_prompts.temperatura), 
                max_tokens = COALESCE(EXCLUDED.max_tokens, fs_prompts.max_tokens), 
                repetition_penalty = COALESCE(EXCLUDED.repetition_penalty, fs_prompts.repetition_penalty),
                titulo = COALESCE(EXCLUDED.titulo, fs_prompts.titulo)`,
            [
                chave,
                texto_prompt,
                modelo || 'claude-3-5-sonnet-20241022',
                temperatura || 0.7,
                max_tokens || 1024,
                repetition_penalty || 1.0,
                titulo || chave]
        );

        res.json({ success: true, mensagem: 'Prompt e configurações guardados com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar/criar prompt:', error);
        res.status(500).json({ erro: 'Erro ao guardar na base de dados.' });
    }
});

router.delete('/prompts/:id', autenticarAdmin, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // await poolPromise.query('DELETE FROM fs_prompts WHERE id = ?', [id]);
        await poolPromise.query('DELETE FROM fs_prompts WHERE id = $1', [id]);
        res.json({ success: true, mensagem: 'Prompt excluído com sucesso.' });
    } catch (error) {
        console.error('Erro ao excluir prompt:', error);
        res.status(500).json({ erro: 'Erro ao excluir o prompt.' });
    }
});

router.get('/financeiro/api-usage', autenticarAdmin, async (req: Request, res: Response) => {
    try {
        const { inicio, fim } = req.query;

        if (!inicio || !fim) {
            return res.status(400).json({ erro: 'As datas de início e fim são obrigatórias.' });
        }

        const dataInicioAjustada = `${inicio} 00:00:00`;
        const dataFimAjustada = `${fim} 23:59:59`;

        // const [logs]: any = await poolPromise.query(
        //     `SELECT * FROM fs_api_usage 
        //      WHERE criado_em BETWEEN ? AND ? 
        //      ORDER BY criado_em DESC`,
        //     [dataInicioAjustada, dataFimAjustada]
        // );

        const { rows: logs } = await poolPromise.query(
            `SELECT * FROM fs_api_usage WHERE criado_em BETWEEN $1 AND $2 ORDER BY criado_em DESC`, [dataInicioAjustada, dataFimAjustada]
        );
        res.status(200).json(logs);

    } catch (error) {
        console.error('Erro ao buscar o relatório financeiro da API:', error);
        res.status(500).json({ erro: 'Erro interno no servidor ao gerar o relatório.' });
    }
});

// ==================================================================
// ROTAS DO GLOSSÁRIO (CRUD AGRUPADO POR IDIOMA)
// ==================================================================

router.get('/glossario', autenticarAdmin, async (req: Request, res: Response) => {
    try {
        // const [rows]: any = await poolPromise.query('SELECT * FROM fs_glossario ORDER BY chave_grupo, idioma');
        const { rows } = await poolPromise.query('SELECT * FROM fs_glossario ORDER BY chave_grupo, idioma');
        
        const agrupado = rows.reduce((acc: any, row: any) => {
            const chave = row.chave_grupo;
            if (!chave) return acc; 
            
            if (!acc[chave]) {
                acc[chave] = { chave_grupo: chave, pt: {}, en: {}, es: {} };
            }
            acc[chave][row.idioma] = { termo: row.termo, definicao: row.definicao, tags: row.tags };
            return acc;
        }, {});

        res.json(Object.values(agrupado));
    } catch (error) {
        console.error('Erro ao buscar glossário admin:', error);
        res.status(500).json({ erro: 'Erro ao carregar o glossário.' });
    }
});

router.post('/glossario', autenticarAdmin, async (req: Request, res: Response) => {
    const { chave_grupo, pt, en, es } = req.body;

    if (!chave_grupo || !pt?.termo) {
        return res.status(400).json({ erro: 'A chave do grupo e o termo em Português são obrigatórios.' });
    }

    // const conn = await poolPromise.getConnection();
    // try {
    //     await conn.beginTransaction();

    //     await conn.query('DELETE FROM fs_glossario WHERE chave_grupo = ?', [chave_grupo]);
    const conn = await poolPromise.connect();
    try {
        await conn.query('BEGIN');
        await conn.query('DELETE FROM fs_glossario WHERE chave_grupo = $1', [chave_grupo]);

        const idiomas = [
            { lng: 'pt', data: pt },
            { lng: 'en', data: en },
            { lng: 'es', data: es }
        ];

        for (const item of idiomas) {
            if (item.data && item.data.termo) {
                // await conn.query(
                //     'INSERT INTO fs_glossario (chave_grupo, idioma, termo, definicao, tags) VALUES (?, ?, ?, ?, ?)',
                //     [chave_grupo, item.lng, item.data.termo, item.data.definicao || '', item.data.tags || '']
                // );
                await conn.query(
                    'INSERT INTO fs_glossario (chave_grupo, idioma, termo, definicao, tags) VALUES ($1, $2, $3, $4, $5)',
                    [chave_grupo, item.lng, item.data.termo, item.data.definicao || '', item.data.tags || '']
                );
            }
        }

    //     await conn.commit();
    //     res.json({ success: true, mensagem: 'Termo salvo nos 3 idiomas com sucesso!' });
    // } catch (error) {
    //     await conn.rollback();
    await conn.query('COMMIT');
    res.json({ success: true, mensagem: 'Termo salvo nos 3 idiomas com sucesso!' });
    } catch (error) {
        await conn.query('ROLLBACK');
        console.error('Erro ao salvar termo do glossário:', error);
        res.status(500).json({ erro: 'Erro ao guardar no banco de dados.' });
    } finally {
        conn.release();
    }
});

router.delete('/glossario/:chave', autenticarAdmin, async (req: Request, res: Response) => {
    try {
        const { chave } = req.params;
        // await poolPromise.query('DELETE FROM fs_glossario WHERE chave_grupo = ?', [chave]);
        await poolPromise.query('DELETE FROM fs_glossario WHERE chave_grupo = $1', [chave]);
        res.json({ success: true, mensagem: 'Conceito apagado em todos os idiomas.' });
    } catch (error) {
        console.error('Erro ao deletar termo:', error);
        res.status(500).json({ erro: 'Erro ao apagar termo.' });
    }
});

export default router;
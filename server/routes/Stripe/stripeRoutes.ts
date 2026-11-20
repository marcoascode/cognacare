import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import moment from 'moment';
// import poolPromise from '../../config/mysqlPoolPromise';
import poolPromise from '../../config/pgPoolPromise';
import autenticarUsuario from '../../middleware/autenticarUsuario';
import { notificarVendaAfiliado } from '../../utils/affiliateNotifier';

// --- INTERFACES ---
interface AuthRequest extends Request {
    usuarioId?: number;
    rawBody?: Buffer;
}

interface ICupomInfo {
    codigo: string;
    comissao: number;
    afiliado_id: number | null;
}

const router = express.Router();

// Inicialização segura do SDK do Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2025-11-17.clover' // A tipagem do Stripe recomenda fixar uma versão da API
});

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

// 1. Debitar Bônus
const processarDebitoBonus = async (connection: any, usuario_id: number, valor_bonus: number, descricao_compra: string): Promise<void> => {
    if (valor_bonus > 0) {
        // await connection.query(
        //     'UPDATE fs_usuarios SET saldo_bonus = GREATEST(0, saldo_bonus - ?) WHERE id = ?',
        //     [valor_bonus, usuario_id]
        // );
        // await connection.query(
        //     "INSERT INTO fs_bonus_historico (usuario_id, tipo, valor, descricao) VALUES (?, 'debito', ?, ?)",
        //     [usuario_id, valor_bonus, `Uso na compra (Stripe): ${descricao_compra}`]
        // );
        await connection.query(
            'UPDATE fs_usuarios SET saldo_bonus = GREATEST(0, saldo_bonus - $1) WHERE id = $2',
            [valor_bonus, usuario_id]
        );
        await connection.query(
            `NSERT INTO fs_bonus_historico (usuario_id, tipo, valor, descricao) VALUES ($1, 'debito', $2, $3)`,
            [usuario_id, valor_bonus, `Uso na compra (Stripe): ${descricao_compra}`]
        );
    }
};

// 2. Creditar Comissão ao Afiliado (NOVO)
const processarComissaoAfiliado = async (connection: any, cupomCodigo: string, valorPagoLiquido: number): Promise<{afiliado_id: number, comissao: number} | null> => {
    if (!cupomCodigo) return null;

    // Busca dados do cupom e afiliado
    // const [cupons]: any = await connection.query(
    //     `SELECT c.afiliado_id, c.percentual_comissao 
    //      FROM fs_cupons c 
    //      WHERE c.codigo = ?`, 
    //     [cupomCodigo]
    // );
    const {rows: cupons } = await connection.query(
        `SELECT c.afiliado_id, c.percentual_comissao 
         FROM fs_cupons c 
         WHERE c.codigo = $1`, 
        [cupomCodigo]
    );

    if (cupons.length > 0) {
        const { afiliado_id, percentual_comissao } = cupons[0];
        const comissao = (valorPagoLiquido * percentual_comissao) / 100;

        if (comissao > 0) {
            console.log(`[AFILIADOS] Creditando R$ ${comissao} para afiliado ID ${afiliado_id} (Cupom: ${cupomCodigo})`);
            
            // Atualiza saldo do afiliado
            // await connection.query(
            //     'UPDATE fs_afiliados SET saldo_disponivel = saldo_disponivel + ? WHERE id = ?',
            //     [comissao, afiliado_id]
            // );
            await connection.query(
                'UPDATE fs_afiliados SET saldo_disponivel = saldo_disponivel + $1 WHERE id = $2',
                [comissao, afiliado_id]
            );
            
            return { afiliado_id, comissao };
        }
    }
    return null;
};

// 3. Entrega Completa
const processarEntregaBeneficios = async (
    connection: any, 
    usuario_id: number, 
    descriptionClean: string, 
    charge_id: string, 
    valor_pago: number, 
    data_pagamento: string, 
    cupomInfo: ICupomInfo | null = null
): Promise<{pif: number, chat: number}> => {
    console.log(`[Stripe Logic] Processando entrega para User ${usuario_id}: ${descriptionClean}`);

    // A. Identificar Produto
    const matchCreditos = descriptionClean.match(/^(\d+)\s+crédito(s)?$/); 
    // const [produtoFixo]: any = await connection.query('SELECT * FROM fs_produtos_fixos WHERE description_cobranca = ?', [descriptionClean]);
    const { rows: produtoFixo } = await connection.query('SELECT * FROM fs_produtos_fixos WHERE description_cobranca = $1', [descriptionClean]);

    let pifParaAdicionar = 0; 
    let chatParaAdicionar = 0; 
    let diasParaAdicionar = 0;
    let mesesExpiracaoChat = 6; 
    let novoPlano: string | null = null; 
    let isFounder = false; 
    const isPlanoFundador = descriptionClean.toLowerCase().includes('fundador') || descriptionClean.toLowerCase().includes('founder');

    if (matchCreditos) { 
        pifParaAdicionar = parseInt(matchCreditos[1], 10); 
    } 
    else if (produtoFixo.length > 0) {
        const produto = produtoFixo[0];
        if (produto.product_key === 'chat_extra_50') { 
            chatParaAdicionar = 50; mesesExpiracaoChat = 6; 
        } 
        else if (produto.product_key.startsWith('plano_')) {
            novoPlano = 'assinatura';
            if (produto.product_key === 'plano_mensal') { pifParaAdicionar = 1; chatParaAdicionar = 100; diasParaAdicionar = 30; } 
            else if (produto.product_key === 'plano_semestral') { pifParaAdicionar = 6; chatParaAdicionar = 600; diasParaAdicionar = 180; } 
            else if (produto.product_key === 'plano_anual') { pifParaAdicionar = 12; chatParaAdicionar = 1200; diasParaAdicionar = 365; mesesExpiracaoChat = 12; }
        }
    } else if (isPlanoFundador) {
        pifParaAdicionar = 12; chatParaAdicionar = 1200; diasParaAdicionar = 365; mesesExpiracaoChat = 12;
        novoPlano = 'anual_founder'; isFounder = true;
    }

    // B. Atualizar Usuário
    // let sqlUpdateUser = `UPDATE fs_usuarios SET creditos = creditos + ?, chat_mensagens_restantes = chat_mensagens_restantes + ?`;
    let sqlUpdateUser = `UPDATE fs_usuarios SET creditos = creditos + $1, chat_mensagens_restantes = chat_mensagens_restantes + $2`;
    const paramsUser: any[] = [pifParaAdicionar, chatParaAdicionar];

    if (novoPlano && diasParaAdicionar > 0) {
        // sqlUpdateUser += `, plano_ativo = $3, tipo_plano = 'assinatura', assinatura_expira_em = DATE_ADD(IF(assinatura_expira_em > NOW(), assinatura_expira_em, NOW()), INTERVAL ? DAY)`;
        sqlUpdateUser += `, plano_ativo = $3, tipo_plano = 'assinatura', assinatura_expira_em = GREATEST(COALESCE(assinatura_expira_em, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP) + ($4 * INTERVAL '1 day')`;
        paramsUser.push(novoPlano, diasParaAdicionar);
        // if (isFounder) sqlUpdateUser += `, is_founder = 1`;
        if (isFounder) sqlUpdateUser += `, is_founder = true`;
    }
    
    // sqlUpdateUser += ` WHERE id = ?`;
    sqlUpdateUser += ` WHERE id = $${paramsUser.length + 1}`;
    paramsUser.push(usuario_id);
    await connection.query(sqlUpdateUser, paramsUser);

    // C. Registrar Pagamento
    // const [existePagamento]: any = await connection.query('SELECT id FROM fs_pagamentos WHERE charge_id = ?', [charge_id]);
    const { rows: existePagamento } = await connection.query('SELECT id FROM fs_pagamentos WHERE charge_id = $1', [charge_id]);
    let pagamentoId = null;

    const cupomUtilizado = cupomInfo ? cupomInfo.codigo : null;
    const comissaoGerada = cupomInfo ? cupomInfo.comissao : 0;
    const afiliadoId = cupomInfo ? cupomInfo.afiliado_id : null;

    if (existePagamento.length === 0) {
        // const [cobrancaRows]: any = await connection.query('SELECT id FROM fs_cobrancas WHERE charge_id = ?', [charge_id]);
        const { rows: cobrancaRows } = await connection.query('SELECT id FROM fs_cobrancas WHERE charge_id = $1', [charge_id]);
        const cobrancaId = cobrancaRows.length > 0 ? cobrancaRows[0].id : null;

        // const [resPagamento]: any = await connection.query(
        //   `INSERT INTO fs_pagamentos 
        //    (cobranca_id, usuario_id, forma_pagamento, charge_id, valor, creditos_pif, creditos_chat, data_pagamento, status, cupom_utilizado, comissao_gerada, afiliado_id) 
        //    VALUES (?, ?, 'STRIPE', ?, ?, ?, ?, ?, 'concluido', ?, ?, ?)`,
        //   [cobrancaId, usuario_id, charge_id, valor_pago, pifParaAdicionar, chatParaAdicionar, data_pagamento, cupomUtilizado, comissaoGerada, afiliadoId]
        // );
        const { rows: resPagamento } = await connection.query(
          `INSERT INTO fs_pagamentos 
           (cobranca_id, usuario_id, forma_pagamento, charge_id, valor, creditos_pif, creditos_chat, data_pagamento, status, cupom_utilizado, comissao_gerada, afiliado_id) 
           VALUES ($1, $2, 'STRIPE', $3, $4, $5, $6, $7, 'concluido', $8, $9, $10) RETURNING id`,
          [cobrancaId, usuario_id, charge_id, valor_pago, pifParaAdicionar, chatParaAdicionar, data_pagamento, cupomUtilizado, comissaoGerada, afiliadoId]
        );
        // pagamentoId = resPagamento.insertId;
        pagamentoId = resPagamento[0].id;
    } else {
        pagamentoId = existePagamento[0].id;
    }

    // D. Registrar Lote de Chat
    if (chatParaAdicionar > 0 && pagamentoId) {
        // const [loteExiste]: any = await connection.query('SELECT id FROM fs_creditos_chat_lotes WHERE pagamento_id = ?', [pagamentoId]);
        // if (loteExiste.length === 0) {
        //     const dataExpiracao = moment(data_pagamento).add(mesesExpiracaoChat, 'months').format('YYYY-MM-DD HH:mm:ss');
        //     await connection.query(
        //         `INSERT INTO fs_creditos_chat_lotes (usuario_id, pagamento_id, quantidade_inicial, quantidade_restante, data_compra, data_expiracao, status) VALUES (?, ?, ?, ?, ?, ?, 'ativo')`,
        //         [usuario_id, pagamentoId, chatParaAdicionar, chatParaAdicionar, data_pagamento, dataExpiracao]
        //     );
        // }
        const { rows: loteExiste } = await connection.query('SELECT id FROM fs_creditos_chat_lotes WHERE pagamento_id = $1', [pagamentoId]);
        if (loteExiste.length === 0) {
            const dataExpiracao = moment(data_pagamento).add(mesesExpiracaoChat, 'months').format('YYYY-MM-DD HH:mm:ss');
            await connection.query(
                `INSERT INTO fs_creditos_chat_lotes (usuario_id, pagamento_id, quantidade_inicial, quantidade_restante, data_compra, data_expiracao, status) VALUES ($1, $2, $3, $4, $5, $6, 'ativo')`,
                [usuario_id, pagamentoId, chatParaAdicionar, chatParaAdicionar, data_pagamento, dataExpiracao]
            );
        }
    }
    return { pif: pifParaAdicionar, chat: chatParaAdicionar };
};

// ============================================================================
// NOVA ROTA: VALIDAR CUPOM
// ============================================================================
router.post('/validate-coupon', autenticarUsuario, async (req: AuthRequest, res: Response): Promise<any> => {
    const { couponCode } = req.body;
    if (!couponCode) return res.status(400).json({ valid: false, message: 'Código vazio' });

    try {
        // const [rows]: any = await poolPromise.query(
        //     'SELECT codigo, percentual_desconto FROM fs_cupons WHERE codigo = ? AND ativo = 1', 
        //     [couponCode]
        // );
        const { rows } = await poolPromise.query(
            'SELECT codigo, percentual_desconto FROM fs_cupons WHERE codigo = $1 AND ativo = true', 
            [couponCode]
        );

        if (rows.length > 0) {
            res.json({ 
                valid: true, 
                discountPercent: rows[0].percentual_desconto, 
                code: rows[0].codigo 
            });
        } else {
            res.json({ valid: false, message: 'Cupom inválido ou expirado' });
        }
    } catch (error) {
        console.error('Erro ao validar cupom:', error);
        res.status(500).json({ valid: false, message: 'Erro no servidor' });
    }
});

// ============================================================================
// ROTA: WEBHOOK
// ============================================================================
router.post('/webhook', async (req: Request, res: Response): Promise<any> => {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
        // Casting de req para 'any' garante o acesso ao rawBody injetado via middleware no index.ts
        event = stripe.webhooks.constructEvent((req as any).rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET as string);
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 1. Caso de Cancelamento/Chargeback
    if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
        const charge = event.data.object as any;
        const paymentIntentId = charge.payment_intent;
        const novoStatus = event.type === 'charge.refunded' ? 'reembolsado' : 'chargeback';
        
        console.log(`[Webhook] Atualizando transação ${paymentIntentId} para: ${novoStatus}`);

        try {
            await poolPromise.query(
                // `UPDATE fs_pagamentos SET status = ? WHERE txid = ? OR charge_id = ?`,
                `UPDATE fs_pagamentos SET status = $1 WHERE txid = $2 OR charge_id = $3`,
                [novoStatus, paymentIntentId, charge.id]
            );
        } catch (dbError) {
            console.error('Erro ao atualizar banco via webhook:', dbError);
        }
    } 
    
    // 2. CASO DE SUCESSO (Pagamento Confirmado)
    else if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as any;
        console.log(`[Webhook] Pagamento confirmado: ${paymentIntent.id}`);

        // const { usuario_id, produto_descricao, valor_bonus_utilizado, coupon_code } = paymentIntent.metadata;
        // Conversão crucial: Metadados do Stripe chegam estritamente como strings
        const usuario_id = Number(paymentIntent.metadata.usuario_id);
        const produto_descricao = paymentIntent.metadata.produto_descricao || '';
        const coupon_code = paymentIntent.metadata.coupon_code;

        const valorTotal = paymentIntent.amount / 100; // Valor PAGO (já com desconto)
        
        // const bonusDebitar = parseFloat(valor_bonus_utilizado || 0);
        const bonusDebitar = parseFloat(paymentIntent.metadata.valor_bonus_utilizado || '0');

        // --- DEFINIÇÃO DE BENEFÍCIOS ---
        let creditosPifToAdd = 0;
        let msgsChatToAdd = 0;
        let diasParaAdicionar = 30;
        let tipoPlanoDb = 'avulso'; 
        let nomePlanoEnum = 'free'; 
        let isSubscription = false;

        const descUpper = produto_descricao.toUpperCase();

        if (descUpper.includes('CRÉDITO')) {
            const nums = descUpper.match(/\d+/);
            creditosPifToAdd = nums ? parseInt(nums[0]) : 1;
            tipoPlanoDb = 'avulso';
            isSubscription = false;
        } else if (descUpper.includes('CHAT')) {
            const nums = descUpper.match(/\d+/);
            msgsChatToAdd = nums ? parseInt(nums[0]) : 50;
            tipoPlanoDb = 'avulso';
            isSubscription = false;
        } else {
            isSubscription = true;
            tipoPlanoDb = 'assinatura';
            if (descUpper.includes('FUNDADOR') || descUpper.includes('ANUAL')) {
                creditosPifToAdd = 1; msgsChatToAdd = 100; diasParaAdicionar = 365; nomePlanoEnum = 'anual_founder';
            } else if (descUpper.includes('SEMESTRAL')) {
                creditosPifToAdd = 1; msgsChatToAdd = 100; diasParaAdicionar = 180; nomePlanoEnum = 'semestral';
            } else {
                creditosPifToAdd = 1; msgsChatToAdd = 100; diasParaAdicionar = 30; nomePlanoEnum = 'mensal';
            }
        }

        let connection: any;
        try {
            // connection = await poolPromise.getConnection();
            // await connection.beginTransaction();
            connection = await poolPromise.connect();
            await connection.query('BEGIN');

            let afiliadoId = null;
            let comissaoValor = 0;

            if (coupon_code) {
                // const [cupomRows]: any = await connection.query(
                //     'SELECT afiliado_id, percentual_comissao FROM fs_cupons WHERE codigo = ? LIMIT 1',
                //     [coupon_code]
                // );
                const { rows: cupomRows } = await connection.query(
                    'SELECT afiliado_id, percentual_comissao FROM fs_cupons WHERE codigo = $1 LIMIT 1',
                    [coupon_code]
                );

                if (cupomRows.length > 0) {
                    afiliadoId = cupomRows[0].afiliado_id;
                    const percentual = parseFloat(cupomRows[0].percentual_comissao || 20); 
                    comissaoValor = (valorTotal * percentual) / 100;
                    
                    console.log(`[Webhook] Cupom ${coupon_code} identificado. Afiliado: ${afiliadoId}. Comissão: R$ ${comissaoValor}`);
                }
            }

            await connection.query(
                // `INSERT INTO fs_pagamentos 
                // (usuario_id, afiliado_id, valor, comissao_gerada, forma_pagamento, status, data_pagamento, descricao, txid, cupom_utilizado, creditos_pif, creditos_chat) 
                // VALUES (?, ?, ?, ?, 'STRIPE', 'concluido', NOW(), ?, ?, ?, ?, ?)
                // ON DUPLICATE KEY UPDATE 
                //     status = 'concluido', 
                //     data_pagamento = NOW(),
                //     afiliado_id = VALUES(afiliado_id),
                //     comissao_gerada = VALUES(comissao_gerada)`,
                `INSERT INTO fs_pagamentos 
                (usuario_id, afiliado_id, valor, comissao_gerada, forma_pagamento, status, data_pagamento, descricao, txid, cupom_utilizado, creditos_pif, creditos_chat) 
                VALUES ($1, $2, $3, $4, 'STRIPE', 'concluido', CURRENT_TIMESTAMP, $5, $6, $7, $8, $9)
                ON CONFLICT (txid) DO UPDATE SET 
                    status = 'concluido', 
                    data_pagamento = CURRENT_TIMESTAMP,
                    afiliado_id = EXCLUDED.afiliado_id,
                    comissao_gerada = EXCLUDED.comissao_gerada`,
                [
                    usuario_id, 
                    afiliadoId,
                    valorTotal, 
                    comissaoValor,
                    produto_descricao, 
                    paymentIntent.id, 
                    coupon_code || null,
                    creditosPifToAdd,
                    msgsChatToAdd
                ]
            );

            if (isSubscription) {
                await connection.query(
                    // `UPDATE fs_usuarios SET 
                    //     creditos = creditos + ?,
                    //     chat_mensagens_restantes = chat_mensagens_restantes + ?,
                    //     status_assinatura = 'ativo', 
                    //     tipo_plano = ?,
                    //     plano_ativo = ?,
                    //     assinatura_expira_em = DATE_ADD(IF(assinatura_expira_em > NOW(), assinatura_expira_em, NOW()), INTERVAL ? DAY)
                    //  WHERE id = ?`,
                    `UPDATE fs_usuarios SET 
                        creditos = creditos + $1,
                        chat_mensagens_restantes = chat_mensagens_restantes + $2,
                        status_assinatura = 'ativo', 
                        tipo_plano = $3,
                        plano_ativo = $4,
                        assinatura_expira_em = GREATEST(COALESCE(assinatura_expira_em, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP) + ($5 * INTERVAL '1 day')
                     WHERE id = $6`,
                    [creditosPifToAdd, msgsChatToAdd, tipoPlanoDb, nomePlanoEnum, diasParaAdicionar, usuario_id]
                );
            } else {
                await connection.query(
                    // `UPDATE fs_usuarios SET 
                    //     creditos = creditos + ?,
                    //     chat_mensagens_restantes = chat_mensagens_restantes + ?
                    //  WHERE id = ?`,
                     `UPDATE fs_usuarios SET 
                        creditos = creditos + $1,
                        chat_mensagens_restantes = chat_mensagens_restantes + $2
                     WHERE id = $3`,
                    [creditosPifToAdd, msgsChatToAdd, usuario_id]
                );
            }

            if (bonusDebitar > 0) {
                await connection.query(
                    // 'UPDATE fs_usuarios SET saldo_bonus = GREATEST(0, saldo_bonus - ?) WHERE id = ?',
                    'UPDATE fs_usuarios SET saldo_bonus = GREATEST(0, saldo_bonus - $1) WHERE id = $2',
                    [bonusDebitar, usuario_id]
                );
                await connection.query(
                    // "INSERT INTO fs_bonus_historico (usuario_id, tipo, valor, descricao, data_uso) VALUES (?, 'debito', ?, ?, NOW())",
                    "INSERT INTO fs_bonus_historico (usuario_id, tipo, valor, descricao, data_uso) VALUES ($1, 'debito', $2, $3, CURRENT_TIMESTAMP)",
                    [usuario_id, bonusDebitar, `Abatimento em compra Stripe: ${produto_descricao}`]
                );
            }
            
            if (creditosPifToAdd > 0 || msgsChatToAdd > 0) {
                 await connection.query(
                    // `INSERT INTO fs_creditos_consumidos (usuario_id, data_consumo, creditos, tipo_credito, descricao) 
                    //  VALUES (?, NOW(), ?, 'COMPRA', ?)`,
                    `INSERT INTO fs_creditos_consumidos (usuario_id, data_consumo, creditos, tipo_credito, descricao) 
                     VALUES ($1, CURRENT_TIMESTAMP, $2, 'COMPRA', $3)`,
                    [usuario_id, creditosPifToAdd, `Compra Stripe: ${produto_descricao}`]
                );
            }

            // await connection.commit();
            await connection.query('COMMIT');
            console.log(`[Webhook] Processo finalizado. Afiliado ID: ${afiliadoId || 'Nenhum'}`);

            setTimeout(() => {
                notificarVendaAfiliado(paymentIntent.id, 'STRIPE');
            }, 2000);

        } catch (error) {
            // if (connection) await connection.rollback();
            if (connection) await connection.query('ROLLBACK');
            console.error('[Webhook] Erro ao processar entrega de benefícios:', error);
        } finally {
            if (connection) connection.release();
        }
    }

    res.json({received: true});
});

// ============================================================================
// ROTA: CRIAR INTENÇÃO
// ============================================================================
router.post('/create-payment-intent', autenticarUsuario, async (req: AuthRequest, res: Response): Promise<any> => {
    const { items_name, usarBonus, couponCode } = req.body;
    const usuario_id = req.usuarioId;

    if (!items_name) return res.status(400).send({ error: 'Produto não especificado' });

    try {
        const descriptionClean = items_name.trim();
        const isPlanoFundador = descriptionClean.toLowerCase().includes('fundador') || descriptionClean.toLowerCase().includes('founder');
        
        let valorBaseCentavos = 0;
        
        if (isPlanoFundador) {
            // const [rows]: any = await poolPromise.query('SELECT COUNT(id) as total FROM fs_usuarios WHERE is_founder = 1');
            const { rows } = await poolPromise.query('SELECT COUNT(id) as total FROM fs_usuarios WHERE is_founder = true');
            if (rows[0].total >= 100) return res.status(400).send({ error: 'As vagas para Membro Fundador estão esgotadas!' });
            valorBaseCentavos = 49700; 
        } else {
            const matchCreditos = descriptionClean.match(/^(\d+)\s+crédito(s)?$/);
            if (matchCreditos) {
                const qtd = parseInt(matchCreditos[1], 10);
                // const [prices]: any = await poolPromise.query('SELECT de, ate, preco FROM fs_precos ORDER BY de ASC');
                const { rows: prices } = await poolPromise.query('SELECT de, ate, preco FROM fs_precos ORDER BY de ASC');
                let precoUnitario = 0;
                for (const range of prices) {
                    if (qtd >= range.de && qtd <= range.ate) { precoUnitario = range.preco; break; }
                }
                valorBaseCentavos = Math.round((qtd * precoUnitario) * 100);
            } else {
                // const [produtos]: any = await poolPromise.query('SELECT preco FROM fs_produtos_fixos WHERE description_cobranca = ?', [descriptionClean]);
                const { rows: produtos } = await poolPromise.query('SELECT preco FROM fs_produtos_fixos WHERE description_cobranca = $1', [descriptionClean]);
                if (produtos.length > 0) valorBaseCentavos = Math.round(parseFloat(produtos[0].preco) * 100);
            }
        }

        if (valorBaseCentavos === 0) return res.status(400).send({ error: 'Produto não encontrado' });

        let valorComDesconto = valorBaseCentavos;
        let discountApplied = 0;

        if (couponCode) {
            // const [cupons]: any = await poolPromise.query('SELECT percentual_desconto FROM fs_cupons WHERE codigo = ? AND ativo = 1', [couponCode]);
            const { rows: cupons } = await poolPromise.query('SELECT percentual_desconto FROM fs_cupons WHERE codigo = $1 AND ativo = true', [couponCode]);
            if (cupons.length > 0) {
                const percentual = cupons[0].percentual_desconto;
                const descontoCentavos = Math.round(valorBaseCentavos * (percentual / 100));
                valorComDesconto = valorBaseCentavos - descontoCentavos;
                discountApplied = percentual;
            }
        }

        let bonusUtilizado = 0;
        let valorFinal = valorComDesconto;

        if (usarBonus) {
            // const [userRows]: any = await poolPromise.query('SELECT saldo_bonus FROM fs_usuarios WHERE id = ?', [usuario_id]);
            const { rows: userRows } = await poolPromise.query('SELECT saldo_bonus FROM fs_usuarios WHERE id = $1', [usuario_id]);
            const saldoBonusReais = parseFloat(userRows[0]?.saldo_bonus || 0);
            const saldoBonusCentavos = Math.round(saldoBonusReais * 100);

            if (saldoBonusCentavos > 0) {
                const descontoBonus = Math.min(saldoBonusCentavos, valorComDesconto);
                bonusUtilizado = descontoBonus / 100; 
                valorFinal = valorComDesconto - descontoBonus;
            }
        }

        // CENÁRIO A: 100% (Bônus + Cupom)
        if (valorFinal <= 0) {
            //  const connection = await poolPromise.getConnection();
            const connection = await poolPromise.connect();
            try {
                // await connection.beginTransaction();
                await connection.query('BEGIN');
                const dataHoje = moment().format('YYYY-MM-DD HH:mm:ss');
                const chargeIdFake = `BONUS_${Date.now()}`; 

                const cupomObj: ICupomInfo | null = couponCode ? { codigo: couponCode, comissao: 0, afiliado_id: null } : null;

                await connection.query(
                    // `INSERT INTO fs_cobrancas (tipo, usuario_id, criacao, charge_id, description, status, valor_total, valor_bonus_utilizado) 
                    //  VALUES ('SISTEMA', ?, ?, ?, ?, 'pago', 0, ?)`,
                    `INSERT INTO fs_cobrancas (tipo, usuario_id, criacao, charge_id, description, status, valor_total, valor_bonus_utilizado) 
                     VALUES ('SISTEMA', $1, $2, $3, $4, 'pago', 0, $5)`,
                    [usuario_id, dataHoje, chargeIdFake, descriptionClean, bonusUtilizado]
                );

                await processarEntregaBeneficios(connection, usuario_id as number, descriptionClean, chargeIdFake, 0, dataHoje, cupomObj);
                await processarDebitoBonus(connection, usuario_id as number, bonusUtilizado, descriptionClean);

                // await connection.commit();
                await connection.query('COMMIT');
                return res.send({ status: 'succeeded_with_bonus' }); 
            } catch (err) {
                if (connection) await connection.query('ROLLBACK');
                throw err;
            } finally {
                connection.release();
            }
        }

        // CENÁRIO B: Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: valorFinal, 
            currency: process.env.STRIPE_CURRENCY || 'brl',
            automatic_payment_methods: { enabled: true },
            payment_method_options: {
                card: {
                    installments: {
                        enabled: true 
                    }
                }
            },
            metadata: {
                usuario_id: usuario_id as any,
                produto_descricao: descriptionClean,
                valor_bonus_utilizado: bonusUtilizado,
                coupon_code: couponCode || '' 
            },
            description: descriptionClean,
        });

        res.send({ clientSecret: paymentIntent.client_secret, bonusUtilizado: bonusUtilizado });

    } catch (error) {
        console.error('Erro Stripe CreateIntent:', error);
        res.status(500).send({ error: 'Erro ao iniciar pagamento' });
    }
});

export default router;
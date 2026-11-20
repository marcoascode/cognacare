import https from 'https';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import express, { Request, Response } from 'express';
// @ts-ignore - Ignora falta de types nativos da SDK da Efí
import EfiPay from 'sdk-node-apis-efi';
import moment from 'moment';

import autenticarAdmin from '../../middleware/autenticarAdmin';
import autenticarUsuario from '../../middleware/autenticarUsuario';
// import pool from '../../config/mysqlPool';
// import poolPromise from '../../config/mysqlPoolPromise';
import pool from '../../config/pgPool';
import poolPromise from '../../config/pgPoolPromise';
import { notificarVendaAfiliado } from '../../utils/affiliateNotifier';

// --- INTERFACES ---
interface AuthRequest extends Request {
  usuarioId?: number;
}

const options = {
  // sandbox: process.env.EFI_SANDBOX,
  // sandbox: true, // dev
  sandbox: false, // prod
  client_id: process.env.EFI_FS_CLIENT_ID as string,
  client_secret: process.env.EFI_FS_CLIENT_SECRET as string,
  certificate: path.resolve(__dirname, 'certs', process.env.EFI_FS_CERT as string),
  cache: true
};

const efipay = new EfiPay(options);

export default function fsPagamentosRoutes(io: any) {
  const router = express.Router();

  // --- FUNÇÃO AUXILIAR PARA DESCONTAR BÔNUS ---
  // const processarDebitoBonus = async (connection: any, usuario_id: number, valor_bonus: number, descricao_compra: string) => {
  //   if (valor_bonus > 0) {
  //     const [user]: any = await connection.query('SELECT saldo_bonus FROM fs_usuarios WHERE id = ?', [usuario_id]);
  //     const saldoAtual = parseFloat(user[0]?.saldo_bonus || 0);

  //     if (saldoAtual >= valor_bonus) {
  //       await connection.query(
  //         'UPDATE fs_usuarios SET saldo_bonus = GREATEST(0, saldo_bonus - ?) WHERE id = ?',
  //         [valor_bonus, usuario_id]
  //       );
  //       await connection.query(
  //         "INSERT INTO fs_bonus_historico (usuario_id, tipo, valor, descricao) VALUES (?, 'debito', ?, ?)",
  //         [usuario_id, valor_bonus, `Uso na compra: ${descricao_compra}`]
  //       );
  //     } else {
  //       // Lógica de fallback (saldo insuficiente)
  //       console.warn(`[Bônus] Saldo insuficiente. Saldo atual: ${saldoAtual}`);
  //       if (saldoAtual > 0) {
  //         await connection.query('UPDATE fs_usuarios SET saldo_bonus = 0 WHERE id = ?', [usuario_id]);
  //         await connection.query("INSERT INTO fs_bonus_historico (usuario_id, tipo, valor, descricao) VALUES (?, 'debito', ?, ?)", [usuario_id, saldoAtual, `Uso parcial na compra: ${descricao_compra}`]);
  //       }
  //     }
  //   }
  // };
  const processarDebitoBonus = async (connection: any, usuario_id: number, valor_bonus: number, descricao_compra: string) => {
    if (valor_bonus > 0) {
      const { rows: user } = await connection.query('SELECT saldo_bonus FROM fs_usuarios WHERE id = $1', [usuario_id]);
      const saldoAtual = parseFloat(user[0]?.saldo_bonus || 0);

      if (saldoAtual >= valor_bonus) {
        await connection.query(
          'UPDATE fs_usuarios SET saldo_bonus = GREATEST(0, saldo_bonus - $1) WHERE id = $2',
          [valor_bonus, usuario_id]
        );
        await connection.query(
          "INSERT INTO fs_bonus_historico (usuario_id, tipo, valor, descricao) VALUES ($1, 'debito', $2, $3)",
          [usuario_id, valor_bonus, `Uso na compra: ${descricao_compra}`]
        );
      } else {
        console.warn(`[Bônus] Saldo insuficiente. Saldo atual: ${saldoAtual}`);
        if (saldoAtual > 0) {
          await connection.query('UPDATE fs_usuarios SET saldo_bonus = 0 WHERE id = $1', [usuario_id]);
          await connection.query("INSERT INTO fs_bonus_historico (usuario_id, tipo, valor, descricao) VALUES ($1, 'debito', $2, $3)", [usuario_id, saldoAtual, `Uso parcial na compra: ${descricao_compra}`]);
        }
      }
    }
  };

  const entregarBeneficiosUnicos = async (connection: any, usuario_id: number, description: string, charge_id: any, txid: any, valor_pago: number | string, data_pagamento: string, cupomCode: string | null = null) => {
    const descUpper = description.toUpperCase();
    let creditosPifToAdd = 0;
    let msgsChatToAdd = 0;
    let diasParaAdicionar = 30;
    let tipoPlanoDb = 'avulso';
    let nomePlanoEnum = 'free';
    let isSubscription = false;

    if (descUpper.includes('CRÉDITO') || descUpper.includes('CREDITO')) {
      const nums = descUpper.match(/\d+/);
      creditosPifToAdd = nums ? parseInt(nums[0]) : 1;
    } else if (descUpper.includes('CHAT')) {
      const nums = descUpper.match(/\d+/);
      msgsChatToAdd = nums ? parseInt(nums[0]) : 50;
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

    // let afiliadoId = null;
    // let comissaoValor = 0;

    // if (cupomCode) {
    //   const [cupomRows]: any = await connection.query('SELECT afiliado_id, percentual_comissao FROM fs_cupons WHERE codigo = ? LIMIT 1', [cupomCode]);
    //   if (cupomRows.length > 0) {
    //     afiliadoId = cupomRows[0].afiliado_id;
    //     comissaoValor = (parseFloat(String(valor_pago)) * parseFloat(cupomRows[0].percentual_comissao)) / 100;
    //   }
    // }

    // await connection.query(
    //   `INSERT INTO fs_pagamentos 
    //        (usuario_id, afiliado_id, valor, comissao_gerada, forma_pagamento, status, data_pagamento, descricao, txid, charge_id, cupom_utilizado, creditos_pif, creditos_chat) 
    //        VALUES (?, ?, ?, ?, 'CARTAO', 'concluido', ?, ?, ?, ?, ?, ?, ?)
    //        ON DUPLICATE KEY UPDATE status='concluido'`,
    //   [usuario_id, afiliadoId, valor_pago, comissaoValor, data_pagamento, description, txid, charge_id, cupomCode, creditosPifToAdd, msgsChatToAdd]
    // );

    // if (isSubscription) {
    //   await connection.query(
    //     `UPDATE fs_usuarios SET creditos = creditos + ?, chat_mensagens_restantes = chat_mensagens_restantes + ?, status_assinatura = 'ativo', tipo_plano = ?, plano_ativo = ?, assinatura_expira_em = DATE_ADD(IF(assinatura_expira_em > NOW(), assinatura_expira_em, NOW()), INTERVAL ? DAY) WHERE id = ?`,
    //     [creditosPifToAdd, msgsChatToAdd, tipoPlanoDb, nomePlanoEnum, diasParaAdicionar, usuario_id]
    //   );
    // } else {
    //   await connection.query(
    //     `UPDATE fs_usuarios SET creditos = creditos + ?, chat_mensagens_restantes = chat_mensagens_restantes + ? WHERE id = ?`,
    //     [creditosPifToAdd, msgsChatToAdd, usuario_id]
    //   );
    // }
    let afiliadoId = null;
    let comissaoValor = 0;

    if (cupomCode) {
      const { rows: cupomRows } = await connection.query('SELECT afiliado_id, percentual_comissao FROM fs_cupons WHERE codigo = $1 LIMIT 1', [cupomCode]);
      if (cupomRows.length > 0) {
        afiliadoId = cupomRows[0].afiliado_id;
        comissaoValor = (parseFloat(String(valor_pago)) * parseFloat(cupomRows[0].percentual_comissao)) / 100;
      }
    }

    await connection.query(
      `INSERT INTO fs_pagamentos 
           (usuario_id, afiliado_id, valor, comissao_gerada, forma_pagamento, status, data_pagamento, descricao, txid, charge_id, cupom_utilizado, creditos_pif, creditos_chat) 
           VALUES ($1, $2, $3, $4, 'CARTAO', 'concluido', $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (txid) DO UPDATE SET status='concluido'`,
      [usuario_id, afiliadoId, valor_pago, comissaoValor, data_pagamento, description, txid, charge_id, cupomCode, creditosPifToAdd, msgsChatToAdd]
    );

    if (isSubscription) {
      await connection.query(
        `UPDATE fs_usuarios SET 
            creditos = creditos + $1, 
            chat_mensagens_restantes = chat_mensagens_restantes + $2, 
            status_assinatura = 'ativo', 
            tipo_plano = $3, 
            plano_ativo = $4, 
            assinatura_expira_em = GREATEST(assinatura_expira_em, CURRENT_TIMESTAMP) + ($5 * INTERVAL '1 day') 
        WHERE id = $6`,
        [creditosPifToAdd, msgsChatToAdd, tipoPlanoDb, nomePlanoEnum, diasParaAdicionar, usuario_id]
      );
    } else {
      await connection.query(
        `UPDATE fs_usuarios SET creditos = creditos + $1, chat_mensagens_restantes = chat_mensagens_restantes + $2 WHERE id = $3`,
        [creditosPifToAdd, msgsChatToAdd, usuario_id]
      );
    }
  };

  //=====================================================================================================
  // PRECIFICAÇÃO
  //=====================================================================================================
  router.get('/precos', async (req: Request, res: Response): Promise<any> => {
    try {
      // const [rows] = await poolPromise.query('SELECT de, ate, preco FROM fs_precos ORDER BY de ASC');
      const { rows } = await poolPromise.query('SELECT de, ate, preco FROM fs_precos ORDER BY de ASC');
      res.status(200).json(rows);
    } catch (error) {
      console.error('Erro ao ler preços:', error);
      res.status(500).send({ error: 'Erro ao carregar preços' });
    }
  });

  router.post('/precos', autenticarAdmin, async (req: Request, res: Response): Promise<any> => {
    try {
      // const { prices } = req.body;

      // if (!prices || !Array.isArray(prices) || prices.length === 0) {
      //   return res.status(400).send({ error: 'A tabela de preços não pode estar vazia.' });
      // }

      // const values: any[] = [];
      // for (const price of prices) {
      //   const de = parseInt(price.de, 10);
      //   const ate = parseInt(price.ate, 10);
      //   const preco = parseFloat(price.preco);

      //   if (isNaN(de) || isNaN(ate) || isNaN(preco) || preco < 0 || de > ate) {
      //     return res.status(400).send({ error: 'Valores inválidos encontrados nas linhas de preço.' });
      //   }
      //   values.push([de, ate, preco]);
      // }

      // await poolPromise.query('TRUNCATE TABLE fs_precos');
      // const sql = 'INSERT INTO fs_precos (de, ate, preco) VALUES ?';
      // await poolPromise.query(sql, [values]);

      // res.status(200).send({ message: 'Preços salvos com sucesso' });
      const { prices } = req.body;

      if (!prices || !Array.isArray(prices) || prices.length === 0) {
        return res.status(400).send({ error: 'A tabela de preços não pode estar vazia.' });
      }

      let placeholders = [];
      let queryParams: any[] = [];
      let i = 1;

      for (const price of prices) {
        const de = parseInt(price.de, 10);
        const ate = parseInt(price.ate, 10);
        const preco = parseFloat(price.preco);

        if (isNaN(de) || isNaN(ate) || isNaN(preco) || preco < 0 || de > ate) {
          return res.status(400).send({ error: 'Valores inválidos encontrados nas linhas de preço.' });
        }

        placeholders.push(`($${i++}, $${i++}, $${i++})`);
        queryParams.push(de, ate, preco);
      }

      await poolPromise.query('TRUNCATE TABLE fs_precos');
      const sql = `INSERT INTO fs_precos (de, ate, preco) VALUES ${placeholders.join(', ')}`;
      await poolPromise.query(sql, queryParams);

      res.status(200).send({ message: 'Preços salvos com sucesso' });
    } catch (error) {
      console.error('Erro ao salvar preços do PIF:', error);
      res.status(500).send({ error: 'Erro interno ao salvar preços' });
    }
  });

  // router.get('/produtos-fixos', async (req: Request, res: Response): Promise<any> => {
  //   try {
  //     const [rows] = await poolPromise.query('SELECT product_key, nome_produto, description_cobranca, preco, tipo FROM fs_produtos_fixos');
  //     res.status(200).json(rows);
  //   } catch (error) {
  //     console.error('Erro ao ler produtos fixos:', error);
  //     res.status(500).send({ error: 'Erro ao carregar produtos' });
  //   }
  // });
  router.get('/produtos-fixos', async (req: Request, res: Response): Promise<any> => {
    try {
      const { rows } = await poolPromise.query('SELECT product_key, nome_produto, description_cobranca, preco, tipo FROM fs_produtos_fixos');
      res.status(200).json(rows);
    } catch (error) {
      console.error('Erro ao ler produtos fixos:', error);
      res.status(500).send({ error: 'Erro ao carregar produtos' });
    }
  });

  router.post('/produtos-fixos', autenticarAdmin, async (req: Request, res: Response): Promise<any> => {
    try {
      const { produtos } = req.body;
      if (!produtos || !Array.isArray(produtos)) {
        return res.status(400).send({ error: 'Formato de produtos inválido' });
      }

      // const connection = await poolPromise.getConnection();
      const connection = await poolPromise.connect();
      try {
        // await connection.beginTransaction();
        await connection.query('BEGIN');
        for (const prod of produtos) {
          await connection.query(
            'UPDATE fs_produtos_fixos SET preco = ?, description_cobranca = ? WHERE product_key = ?',
            [parseFloat(prod.preco), prod.description_cobranca, prod.product_key]
          );
        }
        // await connection.commit();
        await connection.query('COMMIT');
        res.status(200).send({ message: 'Produtos atualizados com sucesso' });
      } catch (err) {
        // await connection.rollback();
        await connection.query('ROLLBACK');
        throw err;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Erro ao salvar produtos fixos:', error);
      res.status(500).send({ error: 'Erro ao salvar produtos' });
    }
  });

  //=====================================================================================================
  // SISTEMA DE PAGAMENTO EFI
  //=====================================================================================================
  router.get('/gerar-token-efi', async (req: Request, res: Response) => {
    "use strict";
    var certificado = fs.readFileSync(path.resolve(__dirname, 'certs', process.env.EFI_FS_CERT as string));

    var credenciais = {
      client_id: process.env.EFI_FS_CLIENT_ID,
      client_secret: process.env.EFI_FS_CLIENT_SECRET,
    };

    var data = JSON.stringify({ grant_type: "client_credentials" });
    var data_credentials = credenciais.client_id + ":" + credenciais.client_secret;
    var auth = Buffer.from(data_credentials).toString("base64");

    const agent = new https.Agent({
      pfx: certificado,
      passphrase: "",
    });

    var config = {
      method: "POST",
      url: "https://pix.api.efipay.com.br/oauth/token",
      headers: {
        Authorization: "Basic " + auth,
        "Content-Type": "application/json",
      },
      httpsAgent: agent,
      data: data,
    };

    axios(config)
      .then(function (response) {
        console.log(JSON.stringify(response.data));
        res.json(response.data);
      })
      .catch(function (error) {
        console.log(error);
        res.status(500).json({ error: 'Erro' });
      });
  });

  /* =====================================================================================================
    ROTA: CHECKOUT PIX (Efí Bank) - Valor mínimo: R$ 0.01
  ===================================================================================================== */
  router.post('/checkout-pix', autenticarUsuario, async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { description, value, usarBonus, couponCode } = req.body;
      const usuario_id = req.usuarioId;

      if (!description || !value) return res.status(400).send({ error: 'Dados inválidos' });

      // --- VERIFICAÇÃO DE LIMITE FUNDADOR ---
      const descriptionClean = description.trim();
      const isPlanoFundador = descriptionClean.toLowerCase().includes('fundador') || descriptionClean.toLowerCase().includes('founder');

      if (isPlanoFundador) {
        const [rows]: any = await poolPromise.query('SELECT COUNT(id) as total FROM fs_usuarios WHERE is_founder = 1');
        if (rows[0].total >= 100) {
          return res.status(400).send({ error: 'As vagas para Membro Fundador estão esgotadas!' });
        }
      }

      const valorOriginal = value / 100;
      let valorBaseComDesconto = valorOriginal;
      let bonusUtilizado = 0;
      const price = value / 100;

      // --- LÓGICA DE CUPOM ---
      let cupomAplicado = null;
      if (couponCode) {
        const [cupons]: any = await poolPromise.query('SELECT codigo, percentual_desconto FROM fs_cupons WHERE codigo = ? AND ativo = 1', [couponCode]);
        if (cupons.length > 0) {
          const percentual = cupons[0].percentual_desconto;
          const descontoValor = valorOriginal * (percentual / 100);
          valorBaseComDesconto = valorOriginal - descontoValor;
          cupomAplicado = cupons[0].codigo;
        }
      }

      // --- LÓGICA DE BÔNUS ---
      if (usarBonus) {
        const [userRows]: any = await poolPromise.query('SELECT saldo_bonus FROM fs_usuarios WHERE id = ?', [usuario_id]);
        const saldoBonus = parseFloat(userRows[0]?.saldo_bonus || 0);
        if (saldoBonus > 0) {
          bonusUtilizado = Math.min(saldoBonus, valorBaseComDesconto);
        }
      }

      let valorFinal = valorBaseComDesconto - bonusUtilizado;
      valorFinal = Math.round(valorFinal * 100) / 100;

      // CASO: PAGAMENTO 100% (BÔNUS + CUPOM)
      if (valorFinal <= 0) {
        // const connection = await poolPromise.getConnection();
        const connection = await poolPromise.connect();
        try {
          // await connection.beginTransaction();
          await connection.query('BEGIN');
          const chargeIdFake = Math.floor(Date.now() / 1000);
          const dataHoje = moment().format('YYYY-MM-DD HH:mm:ss');

          await connection.query(
            `INSERT INTO fs_cobrancas (tipo, usuario_id, criacao, txid, charge_id, description, status, valor_total, valor_bonus_utilizado, cupom_utilizado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['SISTEMA', usuario_id, dataHoje, null, chargeIdFake, descriptionClean, 'pago', 0, bonusUtilizado, cupomAplicado]
          );

          await entregarBeneficiosUnicos(connection, usuario_id as number, descriptionClean, chargeIdFake, null, 0, dataHoje);
          await processarDebitoBonus(connection, usuario_id as number, bonusUtilizado, descriptionClean);

          // await connection.commit();
          await connection.query('COMMIT');
          return res.status(200).json({ status: 'paid_with_bonus' });
        } catch (e) {
          // await connection.rollback();
          await connection.query('ROLLBACK');
          throw e;
        } finally {
          connection.release();
        }
      }

      // Validação de Preço (Segurança)
      let precoValido = false;
      const matchCreditos = descriptionClean.match(/^(\d+)\s+crédito(s)?$/);

      if (isPlanoFundador) {
        if (Math.abs(price - 497.00) < 0.01) precoValido = true;
      } else if (matchCreditos) {
        const creditQuantity = parseInt(matchCreditos[1], 10);
        const [prices]: any = await poolPromise.query('SELECT de, ate, preco FROM fs_precos ORDER BY de ASC');
        let expectedPrice = 0;
        for (const range of prices) {
          if (creditQuantity >= range.de && creditQuantity <= range.ate) {
            expectedPrice = creditQuantity * range.preco; break;
          }
        }
        if (Math.abs(price - expectedPrice) < 0.01) precoValido = true;
      } else {
        const [produtosFixos]: any = await poolPromise.query('SELECT preco FROM fs_produtos_fixos WHERE description_cobranca = ?', [descriptionClean]);
        if (produtosFixos.length > 0) {
          const expectedPrice = parseFloat(produtosFixos[0].preco);
          if (Math.abs(price - expectedPrice) < 0.01) precoValido = true;
        }
      }

      if (!precoValido) return res.status(400).send({ error: 'Preço incorreto' });

      let body = {
        calendario: { expiracao: 3600 },
        valor: { original: valorFinal.toFixed(2) },
        chave: process.env.EFI_FS_CHAVE_PIX as string, // Tipagem forçada para string
        solicitacaoPagador: descriptionClean
      };

      const charge: any = await efipay.pixCreateImmediateCharge([], body); // Bypass na tipagem estrita do SDK
      if (!charge || !charge.loc) throw new Error('Falha na resposta Efí');

      // Proteção de fallback caso o SDK não devolva a data de criação
      const criacaoFormatada = moment(charge.loc.criacao || new Date()).format('YYYY-MM-DD HH:mm:ss');

      await poolPromise.query(
        `INSERT INTO fs_cobrancas (tipo, usuario_id, criacao, txid, description, status, chave, valor_total, valor_bonus_utilizado, cupom_utilizado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['PIX', usuario_id, criacaoFormatada, charge.txid, descriptionClean, 'pendente', process.env.EFI_FS_CHAVE_PIX, valorFinal, bonusUtilizado, cupomAplicado]
      );

      const qrCodeResponse = await efipay.pixGenerateQRCode({ id: charge.loc.id });
      res.status(200).send(qrCodeResponse);

    } catch (error: any) {
      console.error('Erro em /checkout-pix:', error);
      res.status(500).send({ error: 'Erro no servidor', details: error.message });
    }
  });

  /* =====================================================================================================
    ROTA: CHECKOUT CARTÃO DE CRÉDITO (Efí Bank) - Valor mínimo: R$ 3.00
  ===================================================================================================== */
  router.post('/checkout-cartao', autenticarUsuario, async (req: AuthRequest, res: Response): Promise<any> => {
    const usuario_id = req.usuarioId || req.body.usuario_id;
    const { payment_token, installments, items, cupom, payer } = req.body;

    if (!usuario_id || !payment_token || !items || items.length === 0) {
      return res.status(400).json({ error: 'Dados incompletos (Token ou Itens faltando).' });
    }

    let connection: any;
    try {
      // connection = await poolPromise.getConnection();
      connection = await poolPromise.connect();

      let valorTotal = 0;
      let produtoNome = '';
      items.forEach((item: any) => {
        valorTotal += (item.value * item.amount);
        produtoNome = item.name;
      });

      let valorComDesconto = valorTotal;
      let cupomValido = null;
      if (cupom) {
        const [rowsCupom]: any = await connection.query(
          'SELECT codigo FROM fs_cupons WHERE codigo = ? AND ativo = 1 LIMIT 1',
          [cupom]
        );
        if (rowsCupom.length > 0) cupomValido = rowsCupom[0].codigo;
      }

      const valorFinalCentavos = Math.round(valorComDesconto * 100);

      const [userRows]: any = await connection.query('SELECT nome, email FROM fs_usuarios WHERE id = ?', [usuario_id]);
      if (userRows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
      const dbUser = userRows[0];

      const cleanCpf = (payer?.cpf || '').replace(/\D/g, '');
      const cleanPhone = (payer?.phone || '').replace(/\D/g, '');

      const customerData = {
        name: payer?.name || dbUser.nome,
        email: dbUser.email,
        cpf: cleanCpf,
        phone_number: cleanPhone,
        birth: payer?.birth || '1990-01-01'
      };

      if (!customerData.cpf || !customerData.phone_number) {
        return res.status(400).json({ error: 'CPF e Telefone são obrigatórios.' });
      }

      const body = {
        items: [{
          name: produtoNome,
          value: valorFinalCentavos,
          amount: 1
        }],
        payment: {
          credit_card: {
            customer: customerData,
            installments: parseInt(installments),
            payment_token: payment_token,
            billing_address: {
              street: "Av. Paulista",
              number: "100",
              neighborhood: "Centro",
              zipcode: "01310000",
              city: "São Paulo",
              state: "SP"
            }
          }
        }
      };

      const cobranca = await efipay.createOneStepCharge({}, body);

      if (cobranca.data && cobranca.data.status) {
        const chargeId = cobranca.data.charge_id;
        const status = cobranca.data.status;
        const txid = `CARD-${chargeId}`;

        await connection.query(
          `INSERT INTO fs_cobrancas 
                (tipo, usuario_id, criacao, charge_id, txid, description, status, valor_total, parcelas, cupom_utilizado) 
                VALUES ('cartao', ?, NOW(), ?, ?, ?, ?, ?, ?, ?)`,
          [usuario_id, chargeId, txid, produtoNome, status, valorComDesconto, installments, cupomValido]
        );

        if (status === 'paid' || status === 'approved') {
          await entregarBeneficiosUnicos(
            connection, usuario_id, produtoNome, chargeId, txid, valorComDesconto, moment().format('YYYY-MM-DD HH:mm:ss'), cupomValido
          );
        }

        res.json({ success: true, status: status, charge_id: chargeId });
      } else {
        throw new Error('Resposta sem status da operadora.');
      }

    } catch (error: any) {
      console.error('Erro no checkout cartão:', error);

      let msg = 'Erro ao processar pagamento.';
      if (error.response?.data) {
        const data = error.response.data;
        if (data.error_description && data.error_description.message) {
          msg = `Erro Efí: ${data.error_description.message}`;
        } else if (data.error_description) {
          msg = `Erro Efí: ${data.error_description}`;
        }
      }

      res.status(500).json({ error: msg, details: error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  /* =====================================================================================================
    ROTA DE WEBHOOK PIX (EFI)
  ===================================================================================================== */
  router.post('/webhook-pix', async (req: Request, res: Response): Promise<any> => {
    const hmacRecebido = req.query.hmac;
    const hmacCorreto = process.env.HMAC_FERNANDASEPE;

    if (!hmacRecebido || hmacRecebido !== hmacCorreto) {
      console.error('🚨 [WEBHOOK] Bloqueado: HMAC inválido ou ausente.', { recebido: hmacRecebido });
      return res.status(403).json({ error: 'Acesso negado. Credenciais inválidas.' });
    }

    if (!req.body || !req.body.pix) {
      return res.status(200).send('OK');
    }

    res.status(200).send('OK');

    const pixPayments = req.body.pix;
    let connection: any;

    try {
      // connection = await poolPromise.getConnection();
      connection = await poolPromise.connect();

      for (const pix of pixPayments) {
        const txid = pix.txid;
        const valor = pix.valor;
        const horario = moment(pix.horario).format('YYYY-MM-DD HH:mm:ss');

        const [cobrancaRows]: any = await connection.query(
          `SELECT c.id, c.usuario_id, c.description, c.valor_total, c.valor_bonus_utilizado, c.status, c.cupom_utilizado, u.email 
                 FROM fs_cobrancas c 
                 JOIN fs_usuarios u ON c.usuario_id = u.id 
                 WHERE c.txid = ? FOR UPDATE`,
          [txid]
        );

        if (cobrancaRows.length > 0) {
          const cobranca = cobrancaRows[0];

          if (cobranca.status !== 'pago') {
            // await connection.beginTransaction();
            await connection.query('BEGIN');

            await connection.query('UPDATE fs_cobrancas SET status = ? WHERE id = ?', ['pago', cobranca.id]);

            await entregarBeneficiosUnicos(
              connection,
              cobranca.usuario_id,
              cobranca.description,
              null,
              txid,
              cobranca.valor_total,
              horario,
              cobranca.cupom_utilizado
            );

            const bonusUtilizado = parseFloat(cobranca.valor_bonus_utilizado || 0);
            if (bonusUtilizado > 0) {
              await processarDebitoBonus(connection, cobranca.usuario_id, bonusUtilizado, cobranca.description);
            }

            // await connection.commit();
            await connection.query('COMMIT');

            if (cobranca.email && io) {
              io.to(`user:${cobranca.email}`).emit('paymentConfirmed', { txid, status: 'pago' });
            }

            notificarVendaAfiliado(txid, 'PIX');
          } else {
            console.log(`[Webhook PIX] Pagamento ${txid} já estava processado.`);
          }
        } else {
          console.log(`[Webhook PIX] Cobrança não encontrada para TXID: ${txid}`);
        }
      }
    } catch (error) {
      // if (connection) await connection.rollback();
      if (connection) await connection.query('ROLLBACK');
      console.error('Erro processando webhook pix:', error);
    } finally {
      if (connection) connection.release();
    }
  });

  /* =====================================================================================================
   ROTA: CALLBACK / WEBHOOK
  ===================================================================================================== */
  router.post('/callback', async (req: Request, res: Response): Promise<any> => {
    const { notification } = req.body;
    res.status(200).send();

    if (!notification) return;

    let connection: any;
    try {
      const response = await efipay.getNotification({ token: notification });

      if (response.data && response.data.length > 0) {
        // connection = await poolPromise.getConnection();
        connection = await poolPromise.connect();
        const ultimo = response.data[response.data.length - 1];
        const status = ultimo.status.current;
        const chargeId = ultimo.identifiers.charge_id;

        console.log(`[Webhook] Charge ${chargeId} -> ${status}`);

        await connection.query('UPDATE fs_cobrancas SET status = ? WHERE charge_id = ?', [status, chargeId]);

        if (status === 'paid' || status === 'settled') {
          const [cobranca]: any = await connection.query('SELECT * FROM fs_cobrancas WHERE charge_id = ?', [chargeId]);
          if (cobranca.length > 0 && cobranca[0].status !== 'pago_sistema') {
            await connection.query("UPDATE fs_cobrancas SET status = 'pago_sistema' WHERE id = ?", [cobranca[0].id]);
            await entregarBeneficiosUnicos(
              connection,
              cobranca[0].usuario_id,
              cobranca[0].description,
              chargeId,
              cobranca[0].txid,
              cobranca[0].valor_total,
              moment().format('YYYY-MM-DD HH:mm:ss'),
              cobranca[0].cupom_utilizado
            );
            notificarVendaAfiliado(`EFI-${chargeId}`, 'CARTAO');
          }
        }
      }
    } catch (error) {
      console.error('Erro Webhook:', error);
    } finally {
      if (connection) connection.release();
    }
  });

  //=====================================================================================================
  router.get('/usuario/creditos-ativos', autenticarUsuario, async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const [userRows]: any = await poolPromise.query('SELECT creditos, chat_mensagens_restantes, saldo_bonus FROM fs_usuarios WHERE id = ?', [req.usuarioId]);
      if (userRows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
      res.json({ creditos_ativos: userRows[0].creditos, chat_mensagens_restantes: userRows[0].chat_mensagens_restantes, saldo_bonus: userRows[0].saldo_bonus });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao consultar créditos' });
    }
  });

  //=====================================================================================================
  router.get('/usuario/pagamentos', autenticarUsuario, async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const usuarioId = req.usuarioId;
      // const [rows]: any = await pool.execute(`
      //     SELECT 
      //       data_pagamento,
      //       DATE_ADD(data_pagamento, INTERVAL 6 MONTH) as data_vencimento,
      //       forma_pagamento,
      //       valor,
      //       creditos,
      //       status
      //     FROM fs_pagamentos
      //     WHERE usuario_id = ?
      //     ORDER BY data_pagamento DESC
      //   `, [usuarioId]);
      const { rows } = await poolPromise.query(`
          SELECT 
            data_pagamento,
            data_pagamento + INTERVAL '6 MONTHS' as data_vencimento,
            forma_pagamento,
            valor,
            creditos,
            status
          FROM fs_pagamentos
          WHERE usuario_id = $1
          ORDER BY data_pagamento DESC
        `, [usuarioId]);

      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao consultar pagamentos' });
    }
  });

  //=====================================================================================================
  router.get('/extrato', autenticarUsuario, async (req: AuthRequest, res: Response): Promise<any> => {
    const usuarioId = req.usuarioId;
    if (!usuarioId) return res.status(401).send('Não autenticado');

    let connection: any;
    try {
      // connection = await poolPromise.getConnection();
      connection = await poolPromise.connect();

      // // 1. Compras
      // const [entradas]: any = await connection.query(`
      //       SELECT 
      //           data_pagamento as data,
      //           'C' as tipo,
      //           valor,
      //           creditos_pif,
      //           creditos_chat,
      //           CASE 
      //               WHEN creditos_pif > 0 AND creditos_chat > 0 THEN 'Compra de Plano'
      //               WHEN creditos_chat > 0 THEN 'Compra Chat Extra'
      //               ELSE 'Compra Créditos PIF'
      //           END as descricao,
      //           forma_pagamento,
      //           IF(forma_pagamento='PIX', txid, charge_id) as transacao_id,
      //           0 as valor_bonus
      //       FROM fs_pagamentos
      //       WHERE usuario_id = ? AND status = 'concluido'
      //   `, [usuarioId]);

      // // 2. Consumos
      // const [saidas]: any = await connection.query(`
      //       SELECT 
      //           DATE(data_consumo) as data, 
      //           'D' as tipo,
      //           NULL as valor,
      //           SUM(CASE WHEN tipo_credito = 'PIF' THEN creditos ELSE 0 END) as creditos_pif,
      //           SUM(CASE WHEN tipo_credito = 'CHAT' THEN creditos ELSE 0 END) as creditos_chat,
      //           COALESCE(descricao, 'Consumo Diário') as descricao_agrupada,
      //           'SISTEMA' as forma_pagamento,
      //           MAX(CONCAT('USAGE-', DATE_FORMAT(DATE(data_consumo), '%Y%m%d'))) as transacao_id,
      //           0 as valor_bonus
      //       FROM fs_creditos_consumidos
      //       WHERE usuario_id = ?
      //       GROUP BY DATE(data_consumo), COALESCE(descricao, 'Consumo Diário')
      //   `, [usuarioId]);
      // 1. Compras
      const { rows: entradas } = await connection.query(`
            SELECT 
                data_pagamento as data,
                'C' as tipo,
                valor,
                creditos_pif,
                creditos_chat,
                CASE 
                    WHEN creditos_pif > 0 AND creditos_chat > 0 THEN 'Compra de Plano'
                    WHEN creditos_chat > 0 THEN 'Compra Chat Extra'
                    ELSE 'Compra Créditos PIF'
                END as descricao,
                forma_pagamento,
                CASE WHEN forma_pagamento='PIX' THEN txid ELSE charge_id END as transacao_id,
                0 as valor_bonus
            FROM fs_pagamentos
            WHERE usuario_id = $1 AND status = 'concluido'
        `, [usuarioId]);

      // 2. Consumos
      const { rows: saidas } = await connection.query(`
            SELECT 
                DATE(data_consumo) as data, 
                'D' as tipo,
                NULL as valor,
                SUM(CASE WHEN tipo_credito = 'PIF' THEN creditos ELSE 0 END) as creditos_pif,
                SUM(CASE WHEN tipo_credito = 'CHAT' THEN creditos ELSE 0 END) as creditos_chat,
                COALESCE(descricao, 'Consumo Diário') as descricao_agrupada,
                'SISTEMA' as forma_pagamento,
                MAX(CONCAT('USAGE-', to_char(data_consumo, 'YYYYMMDD'))) as transacao_id,
                0 as valor_bonus
            FROM fs_creditos_consumidos
            WHERE usuario_id = $1
            GROUP BY DATE(data_consumo), COALESCE(descricao, 'Consumo Diário')
        `, [usuarioId]);

      const saidasMapeadas = saidas.map((s: any) => ({
        ...s,
        descricao: s.descricao_agrupada
      }));

      // 3. Histórico de Bônus
      let bonusHist: any[] = [];
      try {
        // const [bonusRows]: any = await connection.query(`
        //         SELECT 
        //             data, 
        //             'B' as tipo, 
        //             NULL as valor, 
        //             0 as creditos_pif, 
        //             0 as creditos_chat, 
        //             descricao, 
        //             'BÔNUS' as forma_pagamento, 
        //             CONCAT('BONUS-', id) as transacao_id,
        //             CASE WHEN tipo = 'credito' THEN valor ELSE -valor END as valor_bonus
        //         FROM fs_bonus_historico 
        //         WHERE usuario_id = ?
        //     `, [usuarioId]);
        // bonusHist = bonusRows;
        const { rows: bonusRows } = await connection.query(`
                SELECT 
                    data, 
                    'B' as tipo, 
                    NULL as valor, 
                    0 as creditos_pif, 
                    0 as creditos_chat, 
                    descricao, 
                    'BÔNUS' as forma_pagamento, 
                    CONCAT('BONUS-', id) as transacao_id,
                    CASE WHEN tipo = 'credito' THEN valor ELSE -valor END as valor_bonus
                FROM fs_bonus_historico 
                WHERE usuario_id = $1
            `, [usuarioId]);
        bonusHist = bonusRows;
      } catch (err: any) {
        console.warn('Aviso: fs_bonus_historico pode não existir:', err.message);
      }

      const saidasFiltradas = saidasMapeadas.filter((s: any) => s.creditos_pif !== 0 || s.creditos_chat !== 0);
      const extrato = [...entradas, ...saidasFiltradas, ...bonusHist].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      const [user]: any = await connection.query('SELECT creditos, chat_mensagens_restantes, saldo_bonus FROM fs_usuarios WHERE id = ?', [usuarioId]);

      const saldoPif = user.length ? user[0].creditos : 0;
      const saldoChat = user.length ? user[0].chat_mensagens_restantes : 0;
      const saldoBonus = user.length ? user[0].saldo_bonus : 0;

      res.json({
        extrato,
        saldo_pif: saldoPif,
        saldo_chat: saldoChat,
        saldo_bonus: saldoBonus
      });

    } catch (error: any) {
      console.error('Erro na rota extrato:', error);
      res.status(500).send({ error: 'Erro ao carregar extrato', details: error.sqlMessage });
    } finally {
      if (connection) connection.release();
    }
  });

  //=====================================================================================================
  router.get('/verificar-elegibilidade-chat', autenticarUsuario, async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const usuarioId = req.usuarioId;
      if (!usuarioId) return res.status(401).json({ error: 'Usuário não autenticado.' });
      // const [rows]: any = await poolPromise.query(`SELECT 1 FROM fs_plano_familiar WHERE usuario_id = ? AND criado_em >= DATE_SUB(NOW(), INTERVAL 90 DAY) LIMIT 1`, [usuarioId]);
      const { rows } = await poolPromise.query(
        `SELECT 1 FROM fs_plano_familiar WHERE usuario_id = $1 AND criado_em >= NOW() - INTERVAL '90 DAYS' LIMIT 1`, 
        [usuarioId]
      );
      res.json({ eligible: rows.length > 0 });
    } catch (error) {
      console.error('Erro elegibilidade:', error);
      res.status(500).json({ error: 'Erro' });
    }
  });

  return router;
}
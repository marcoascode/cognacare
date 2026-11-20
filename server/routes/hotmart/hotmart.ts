// server/routes/hotmart/hotmart.ts
import * as dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto'; 
import nodemailer from 'nodemailer';
import axios from 'axios'; 

// --- MySQL ORIGINAL ---
// import poolPromise from '../../config/mysqlPoolPromise';

// --- POSTGRESQL CORRIGIDO ---
import poolPromise from '../../config/pgPoolPromise';
import { getValidAccessToken } from './hotmartAuth'; 

const router = express.Router();

// --- INTERFACES ---
interface IWebhookPayload {
  id: string;
  event: string;
  data: any;
}

interface IUsuarioRow {
  id: number;
}

// --- REQUISITO 2: Array de IDs de produtos permitidos ---
const allowedProductIds = [5947535, 6006799];

// --- FUNÇÕES AUXILIARES ---
// Gera uma senha aleatória de 8 caracteres
const generateRandomPassword = (): string => {
  return crypto.randomBytes(4).toString('hex'); 
};

const sendWelcomeEmail = async (userEmail: string, userName: string, plainPassword: string): Promise<void> => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: Number(process.env.EMAIL_PORT) === 465, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Instituto Fernanda Sepe" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: 'Seu acesso ao Instituto Fernanda Sepe (Sistema PIF) foi liberado!',
    html: `
      <h1>Olá, ${userName}!</h1>
      <p>Sua compra foi aprovada e seu acesso à nossa plataforma foi criado com sucesso.</p>
      <p>Utilize os dados abaixo para fazer seu primeiro login:</p>
      <ul>
        <li><strong>Link de Acesso:</strong> <a href="https://pif.fernandasepe.com">https://pif.fernandasepe.com</a></li>
        <li><strong>E-mail:</strong> ${userEmail}</li>
        <li><strong>Senha:</strong> ${plainPassword}</li>
      </ul>
      <p>Recomendamos que você altere sua senha após o primeiro acesso por uma de sua preferência.</p>
      <p>No menu principal (do lado esquerdo da tela), clique em <strong>Perfil > Alterar Senha</strong>, cole a senha fornecida acima em "Senha Atual" e crie uma senha da sua preferência nos dois campos seguintes.</p>
      <br>
      <p>Atenciosamente,</p>
      <p>Equipe Fernanda Sepe</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// --- MIDDLEWARE DE SEGURANÇA ---
const verifyHotmartSignature = (req: Request, res: Response, next: NextFunction): any => {
  const hottok = req.headers['x-hotmart-hottok'];

  if (hottok !== process.env.HOTMART_WEBHOOK_SECRET) {
    console.warn('Tentativa de acesso ao webhook da Hotmart com token inválido.');
    return res.status(401).send('Unauthorized');
  }
  next();
};

// --- ROTA QUE USA O TOKEN ---
router.get('/minhas-vendas', async (req: Request, res: Response) => {
  try {
    const token = await getValidAccessToken();

    const response = await axios.get('https://api-hotmart.com/vendas/historico', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    res.json({ data: response.data, message: "Token obtido com sucesso e pronto para ser usado!", token: token });

  } catch (error: any) {
    console.error("Erro na rota /minhas-vendas:", error.message);
    res.status(500).json({ erro: "Erro ao processar a requisição." });
  }
});

// --- ROTA PRINCIPAL DO WEBHOOK ---
router.post('/webhook', verifyHotmartSignature, async (req: Request, res: Response): Promise<any> => {
  const webhookPayload = req.body as IWebhookPayload;
  const { id: eventId, event: eventType, data } = webhookPayload;

  if (!webhookPayload || !eventId || !eventType || !data) {
    console.error('Payload do webhook inválido ou incompleto:', webhookPayload);
    return res.status(400).send('Bad Request: Invalid payload structure.');
  }

  // --- REQUISITO 2: Filtro de Produto ---
  const productId = data.product?.id || data.subscription?.product?.id || null;
  
  if (!productId || !allowedProductIds.includes(productId)) {
    console.log(`Evento [${eventId}] ignorado: Produto ${productId || 'N/A'} não está na lista permitida.`);
    return res.status(200).send('Evento ignorado (produto não permitido).');
  }

  try {
    // ===================================================================
    // PASSO 1: Extração segura de dados e salvamento do evento
    // ===================================================================
    let transactionId = data.purchase?.transaction || null;
    let buyerEmail = data.buyer?.email || data.user?.email || data.subscriber?.email || null;
    let purchaseStatus = data.purchase?.status || data.subscription?.status || null;
    let approvedDate = data.purchase?.approved_date 
      ? new Date(data.purchase.approved_date).toISOString().slice(0, 19).replace('T', ' ') 
      : null;

    // --- POSTGRESQL CORRIGIDO: Alterado para $1, $2, etc. ---
    const insertQuery = `
      INSERT INTO fs_hotmart_pedidos 
      (hotmart_event_id, event_type, transaction_id, buyer_email, product_id, status, approved_date, full_payload) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    await poolPromise.query(insertQuery, [
      eventId,
      eventType,
      transactionId,
      buyerEmail,
      productId,
      purchaseStatus,
      approvedDate,
      JSON.stringify(webhookPayload)
    ]);
    console.log(`Evento do webhook da Hotmart [${eventId} - ${eventType}] salvo na base de dados.`);

    // ===================================================================
    // PASSO 2: Lógica de criação/desativação de usuário
    // ===================================================================
    const activationEvents = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'SUBSCRIPTION_RENEWAL'];
    const deactivationEvents = ['PURCHASE_CANCELED', 'PURCHASE_REFUNDED', 'SUBSCRIPTION_CANCELLATION', 'PURCHASE_CHARGEBACK'];

    if (activationEvents.includes(eventType)) {
      const userName = data.buyer?.name || data.user?.name || data.subscriber?.name;
      if (!buyerEmail || !userName) {
        console.error('Webhook de ativação sem dados do comprador.', data);
        return res.status(400).send('Bad Request: Buyer data missing for user creation.');
      }

      const approvedDateObj = new Date(data.purchase.approved_date); 
      const expirationDate = new Date(approvedDateObj);
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      const formattedExpirationDate = expirationDate.toISOString().slice(0, 19).replace('T', ' ');

      // --- POSTGRESQL CORRIGIDO: Objeto { rows } e $1 ---
      const { rows: existingUsers } = await poolPromise.query('SELECT id FROM fs_usuarios WHERE email = $1', [buyerEmail]);
      const usuariosEncontrados = existingUsers as IUsuarioRow[];

      if (usuariosEncontrados.length > 0) {
        // --- ATUALIZADO: Usuário já existe ---
        const userId = usuariosEncontrados[0].id;
        
        // --- POSTGRESQL CORRIGIDO: Marcadores numericos ---
        await poolPromise.query(
          `UPDATE fs_usuarios SET 
             status_assinatura = 'ativo', 
             vencimento_assinatura = $1, 
             tipo_plano = 'assinatura', 
             assinatura_expira_em = $2, 
             chat_mensagens_restantes = 0, 
             creditos = creditos + 1 
           WHERE id = $3`,
          [formattedExpirationDate, formattedExpirationDate, userId]
        );
        console.log(`Assinatura do utilizador ${userName} (${buyerEmail}) renovada (1 PIF, 0 Chat).`);
      } else {
        // --- ATUALIZADO: Novo usuário ---
        const randomPassword = generateRandomPassword();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(randomPassword, salt);

        // --- POSTGRESQL CORRIGIDO: Aspas simples em 'assinatura' e $1, $2 ---
        const query = `
          INSERT INTO fs_usuarios 
          (nome, email, senha, email_verified, status_assinatura, vencimento_assinatura, 
           tipo_plano, assinatura_expira_em, chat_mensagens_restantes, creditos) 
          VALUES ($1, $2, $3, $4, 'ativo', $5, 'assinatura', $6, 0, 1)`; 
        
        await poolPromise.query(query, [userName, buyerEmail, hashedPassword, true, formattedExpirationDate, formattedExpirationDate]);
        
        console.log(`Novo utilizador criado via Hotmart: ${userName} (${buyerEmail}) com 1 PIF e 0 Chat.`);
        await sendWelcomeEmail(buyerEmail, userName, randomPassword);
      }

    } else if (deactivationEvents.includes(eventType)) {
      if (!buyerEmail) {
        console.error('Webhook de desativação sem e-mail do comprador.', data);
        return res.status(400).send('Bad Request: Buyer email missing for deactivation.');
      }
      
      let statusFinal = 'inativo';
      let creditosUpdateSql = "creditos = creditos";
      let planoUpdateSql = "tipo_plano = tipo_plano"; 
      
      if (['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK'].includes(eventType)) {
        statusFinal = 'reembolsado'; 
        creditosUpdateSql = "creditos = 0"; 
        planoUpdateSql = "tipo_plano = 'avulso'"; 
      }
      
      // --- POSTGRESQL CORRIGIDO: Retorno da rowCount em vez de affectedRows e marcadores numericos ---
      const { rowCount } = await poolPromise.query(
        `UPDATE fs_usuarios SET 
           status_assinatura = $1, 
           ${creditosUpdateSql}, 
           ${planoUpdateSql} 
         WHERE email = $2`,
        [statusFinal, buyerEmail]
      );
        
      if (rowCount !== null && rowCount > 0) {
        console.log(`Assinatura do utilizador com e-mail ${buyerEmail} foi desativada (e/ou créditos zerados) devido ao evento: ${eventType}.`);
      } else {
        console.log(`Recebido evento de desativação para ${buyerEmail}, mas o utilizador não foi encontrado.`);
      }
    }

    res.status(200).send('Webhook processed successfully');

  } catch (error: any) {
    // --- POSTGRESQL CORRIGIDO: O código de erro para duplicação no PG é 23505 (unique_violation) ---
    if (error.code === '23505') {
      console.warn(`Evento do webhook [${eventId}] já existe na base de dados. Ignorando.`);
      return res.status(200).send('Event already processed.');
    }
    console.error('Erro crítico ao processar webhook da Hotmart:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
import express, { Request, Response, NextFunction } from 'express';
import { ICrianca } from '../../../Shared/tiposCrianca';

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { marked } from 'marked';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk'; 
import sanitizeHtml from 'sanitize-html';

import authMiddleware from '../../middleware/authMiddleware';
import autenticarUsuario from '../../middleware/autenticarUsuario';
import verificarRecaptcha from '../../middleware/verificarRecaptcha';
// import poolPromise from '../../config/mysqlPoolPromise';
import poolPromise from '../../config/pgPoolPromise';
import { construirPrompt, obterConfigIA } from '../../utils/promptBuilder';
import calcularCustoIA from '../../utils/calcularCustoIA';

import { i18nEmails, getLanguage } from '../../utils/i18n';
import { upload, processarImagemSegura } from '../../utils/uploadSecure';

const router = express.Router();

// Estende a requisição padrão do Express para incluir os dados do seu middleware
interface AuthRequest extends Request {
  user?: {
    id: number;
    email?: string;
  };
  usuarioId?: number;
}

// Instâncias de API Híbrida (Roteamento Dinâmico)
// SPRINT 0: clientes centralizados (GROK_API_KEY separado de OPENAI_API_KEY).
import { grokClient, anthropicClient } from '../../config/llmClients';
import { exigirCriancaPropria } from '../../middleware/acessoCrianca';
import { assinarToken } from '../../utils/jwtTokens';

const escaparHtml = (valor: unknown): string =>
  String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

// ==================================================================
// FIREWALL COGNITIVO (ANTI-JAILBREAK E SANITIZAÇÃO)
// ==================================================================
const verificarInjecaoPrompt = (texto: string): boolean => {
  if (typeof texto !== 'string') return false;
  const textoLower = texto.toLowerCase();

  const caracteresProibidos = /[<>{}\[\]\\]/;
  if (caracteresProibidos.test(texto)) return true;

  const palavrasProibidas = [
    "ignore as instruções", "ignore o prompt", "esqueça tudo", "modo desenvolvedor",
    "system prompt", "instruções anteriores", "regras anteriores", "suas regras",
    "traduza seu", "traduza o prompt", "aja como", "prompt de sistema", "ignore o",
    "quais são as suas", "ignore all", "ignore previous", "forget previous", "forget all",
    "developer mode", "bypass", "jailbreak", "dan mode", "act as", "your rules",
    "translate your", "system message", "what are your", "ignora las", "olvida todo",
    "modo desarrollador", "actúa como", "tus reglas", "ignora todo", "instrucciones anteriores"
  ];

  for (let palavra of palavrasProibidas) {
    if (textoLower.includes(palavra)) return true;
  }
  return false;
};

// Varre recursivamente o objeto JSON
const validarObjetoContraInjecao = (obj: any): boolean => {
  if (typeof obj === 'string') return verificarInjecaoPrompt(obj);
  if (Array.isArray(obj)) {
    return obj.some(item => validarObjetoContraInjecao(item));
  }
  if (typeof obj === 'object' && obj !== null) {
    return Object.values(obj).some(val => validarObjetoContraInjecao(val));
  }
  return false;
};

// --- 2. CONFIGURAÇÃO DE E-MAIL GLOBAL ---
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false, // Geralmente false para 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false }
});

const calcularIdadeTexto = (dataNascimento: string | Date | null): string => {
  if (!dataNascimento) return 'Idade não informada';
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let anos = hoje.getFullYear() - nascimento.getFullYear();
  let meses = hoje.getMonth() - nascimento.getMonth();
  if (meses < 0 || (meses === 0 && hoje.getDate() < nascimento.getDate())) {
    anos--; meses += 12;
  }
  if (hoje.getDate() < nascimento.getDate()) {
    meses--;
    if (meses < 0) { meses += 12; anos--; }
  }
  return `${anos} anos${meses > 0 ? ` e ${meses} meses` : ''}`;
};

const UPLOADS_FOLDER = '/app/uploads';

// =========================================================================
// FUNÇÃO DE VALIDAÇÃO MATEMÁTICA DE CPF
// =========================================================================
const isValidCPF = (cpf: string): boolean => {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;

  let soma = 0; let resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;

  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;
  return true;
};

// ==================================================================
// ROTA GET: BUSCAR GLOSSÁRIO POR IDIOMA
// ==================================================================
router.get('/glossario', autenticarUsuario, async (req: AuthRequest, res: Response) => {
  try {
    const idioma = req.query.lng || 'pt';
    // const [termos] = await poolPromise.query('SELECT termo, definicao, tags FROM fs_glossario WHERE idioma = ? ORDER BY termo ASC', [idioma]);
    const { rows: termos } = await poolPromise.query('SELECT termo, definicao, tags FROM fs_glossario WHERE idioma = $1 ORDER BY termo ASC', [idioma]);
    // const termosFormatados = (termos as any[]).map(t => ({
    const termosFormatados = termos.map(t => ({
      termo: t.termo, definicao: t.definicao, tags: t.tags ? t.tags.split(',').map((tag: string) => tag.trim()) : []
    }));
    res.json(termosFormatados);
  } catch (error: any) {
    console.error('Erro ao buscar o glossário:', error);
    res.status(500).json({ erro: 'Erro ao carregar os termos.' });
  }
});

router.get('/csrf-token', /*csrfProtection,*/ (req: Request, res: Response) => {
  try {
    const csrfToken = (req as any).csrfToken();
    res.cookie('_csrf', csrfToken, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 3600 * 1000 });
    res.json({ csrfToken });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao gerar token CSRF' });
  }
});

// ==================================================================
// AUTENTICAÇÃO E CADASTRO
// ==================================================================
router.post('/cadastro', verificarRecaptcha, async (req: Request, res: Response) => {
  const { nome, email, senha, confirmaSenha } = req.body;
  let connection: any;
  const lang = getLanguage(req);
  const templates = i18nEmails[lang];

  if (!nome || !email || !senha || !confirmaSenha) return res.status(400).json({ success: false, erro: 'Preencha todos os campos' });
  if (senha !== confirmaSenha) return res.status(400).json({ success: false, erro: templates.pwdnotmatch });

  try {
    // --- MySQL ORIGINAL ---
    // connection = await poolPromise.getConnection();
    // const [existingUser] = await connection.query('SELECT email FROM fs_usuarios WHERE email = ?', [email]);
    
    // --- POSTGRESQL CORRIGIDO ---
    connection = await poolPromise.connect();
    const { rows: existingUser } = await connection.query('SELECT email FROM fs_usuarios WHERE email = $1', [email]);
    
    if (existingUser.length > 0) return res.status(400).json({ success: false, erro: templates.mailalready });

    const senhaCriptografada = await bcrypt.hash(senha, 10);
    
    // --- MySQL ORIGINAL ---
    // await connection.query(
    //   'INSERT INTO fs_usuarios (nome, email, senha, email_verified, tipo_plano, status_assinatura, assinatura_expira_em, vencimento_assinatura, creditos, plano_ativo) VALUES (?, ?, ?, ?, "assinatura", "ativo", "2055-12-31 00:00:00", "2055-12-31 00:00:00", 0, "mensal")',
    //   [nome, email, senhaCriptografada, 0]
    // );
    
    // --- POSTGRESQL CORRIGIDO ---
    // ATENÇÃO: PostgreSQL exige aspas simples ('') para strings em vez de aspas duplas ("")
    await connection.query(
      `INSERT INTO fs_usuarios (nome, email, senha, email_verified, tipo_plano, status_assinatura, assinatura_expira_em, vencimento_assinatura, creditos, plano_ativo) 
       VALUES ($1, $2, $3, $4, 'assinatura', 'ativo', '2055-12-31 00:00:00', '2055-12-31 00:00:00', 0, 'mensal')`,
      [nome, email, senhaCriptografada, 0]
    );

    // --- MySQL ORIGINAL ---
    // const [user] = await connection.query('SELECT id FROM fs_usuarios WHERE email = ?', [email]);
    
    // --- POSTGRESQL CORRIGIDO ---
    const { rows: user } = await connection.query('SELECT id FROM fs_usuarios WHERE email = $1', [email]);
    const usuarioId = user[0].id;
    
    const verificationToken = assinarToken({ id: usuarioId }, 'verify', '1d');

    // --- MySQL ORIGINAL ---
    // await connection.query('INSERT INTO fs_verification_tokens (usuario_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))', [usuarioId, verificationToken]);
    
    // --- POSTGRESQL CORRIGIDO ---
    // ATENÇÃO: Substituição de ?, ? por $1, $2 e DATE_ADD() pela sintaxe de data/hora do PostgreSQL
    await connection.query(
        `INSERT INTO fs_verification_tokens (usuario_id, token, expires_at) 
         VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '1 HOUR')`, 
        [usuarioId, verificationToken]
    );

    const verificationLink = `${process.env.FS_CLIENT_URL}/verify-email?token=${verificationToken}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER, to: email, subject: templates.verifySubject, text: templates.verifyText(nome, verificationLink),
    });

    res.json({ success: true, mensagem: templates.registrationSuccessful });
  } catch (error: any) {
    res.status(500).json({ success: false, erro: templates.registrationError });
  } finally {
    if (connection) connection.release();
  }
});

router.get('/verify-email', async (req: Request, res: Response) => {
  const token = req.query.token as string;
  let connection: any;
  const lang = getLanguage(req);
  const templates = i18nEmails[lang];

  try {
    // --- MySQL ORIGINAL ---
    // connection = await poolPromise.getConnection();
    // const [tokens] = await connection.query('SELECT * FROM fs_verification_tokens WHERE token = ? AND expires_at > NOW()', [token]);

    // --- POSTGRESQL CORRIGIDO ---
    connection = await poolPromise.connect();
    const { rows: tokens } = await connection.query('SELECT * FROM fs_verification_tokens WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP', [token]);

    if (tokens.length === 0) {
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
        
        // --- MySQL ORIGINAL ---
        // const [userCheck] = await connection.query('SELECT email_verified FROM fs_usuarios WHERE id = ?', [decoded.id]);
        
        // --- POSTGRESQL CORRIGIDO ---
        const { rows: userCheck } = await connection.query('SELECT email_verified FROM fs_usuarios WHERE id = $1', [decoded.id]);
        
        // Nota: O Postgres pode retornar booleanos como true/false ou 1/0 dependendo do tipo da coluna (boolean vs smallint). Protegemos ambos.
        if (userCheck.length > 0 && (userCheck[0].email_verified === 1 || userCheck[0].email_verified === true)) {
          return res.status(200).json({ mensagem: 'E-mail verificado com sucesso! Você pode fazer login agora.' });
        }
      } catch (err: any) {}
      return res.status(400).json({ erro: 'Link de verificação inválido ou expirado.' });
    }

    const verificationToken = tokens[0];
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
      if (decoded.id !== verificationToken.usuario_id) return res.status(400).json({ erro: templates.invalidToken });

      // --- MySQL ORIGINAL ---
      // await connection.beginTransaction();
      // const [updateResult] = await connection.query(`UPDATE fs_usuarios SET status_assinatura = 'ativo', email_verified = 1 WHERE id = ? AND email_verified = 0`, [verificationToken.usuario_id]);
      // if (updateResult.affectedRows === 0) {
      //   await connection.rollback();
      //   return res.status(400).json({ erro: templates.verifiedEmail });
      // }
      // await connection.query('DELETE FROM fs_verification_tokens WHERE token = ?', [token]);
      // await connection.commit();

      // --- POSTGRESQL CORRIGIDO ---
      // Transações no PostgreSQL são feitas via string na query
      await connection.query('BEGIN'); 
      
      // A biblioteca `pg` retorna diretamente o objeto do resultado no UPDATE/INSERT/DELETE, não é um array [rows, fields]
      const updateResult = await connection.query(
        `UPDATE fs_usuarios SET status_assinatura = 'ativo', email_verified = '1' WHERE id = $1 AND email_verified = '0'`, 
        [verificationToken.usuario_id]
      );
      
      // O PostgreSQL usa `rowCount` em vez de `affectedRows`
      if (updateResult.rowCount === 0) {
        await connection.query('ROLLBACK');
        return res.status(400).json({ erro: templates.verifiedEmail });
      }

      await connection.query('DELETE FROM fs_verification_tokens WHERE token = $1', [token]);
      await connection.query('COMMIT');
      
      res.status(200).json({ mensagem: templates.successVerified });
    } catch (jwtError: any) {
      return res.status(400).json({ erro: templates.invalidToken });
    }
  } catch (error: any) {
    // --- MySQL ORIGINAL ---
    // if (connection) await connection.rollback();
    
    // --- POSTGRESQL CORRIGIDO ---
    if (connection) await connection.query('ROLLBACK');
    
    res.status(500).json({ erro: templates.serverError });
  } finally {
    if (connection) connection.release();
  }
});

router.post('/resend-verification', async (req: Request, res: Response) => {
  const { email } = req.body;
  let connection: any;
  const lang = getLanguage(req);
  const templates = i18nEmails[lang];

  try {
    // --- MySQL ORIGINAL ---
    // connection = await poolPromise.getConnection();
    // const [results]: any = await connection.query('SELECT id, nome, email_verified FROM fs_usuarios WHERE email = ?', [email]);
    
    // --- POSTGRESQL CORRIGIDO ---
    connection = await poolPromise.connect();
    const { rows: results } = await connection.query('SELECT id, nome, email_verified FROM fs_usuarios WHERE email = $1', [email]);
    
    // SPRINT 0: resposta genérica para e-mail inexistente (evita enumeração de contas).
    if (results.length === 0) return res.json({ mensagem: templates.verificationEmailSent });

    const usuario = results[0];
    // Proteção dupla para lidar com tinyint (MySQL) vs boolean (PostgreSQL)
    if (usuario.email_verified === 1 || usuario.email_verified === true) {
      return res.status(400).json({ erro: templates.successVerified });
    }

    const verificationToken = assinarToken({ id: usuario.id }, 'verify', '1d');
    
    // --- MySQL ORIGINAL ---
    // await connection.query(
    //   `INSERT INTO fs_verification_tokens (usuario_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR)) ON DUPLICATE KEY UPDATE token = ?, expires_at = DATE_ADD(NOW(), INTERVAL 1 HOUR)`,
    //   [usuario.id, verificationToken, verificationToken]
    // );

    // --- POSTGRESQL CORRIGIDO ---
    // 1. Substituímos ON DUPLICATE KEY por ON CONFLICT (usuario_id)
    // 2. Usamos CURRENT_TIMESTAMP + INTERVAL '1 HOUR' em vez de DATE_ADD
    // 3. Usamos EXCLUDED.token e EXCLUDED.expires_at para reaproveitar os valores enviados, reduzindo o array de parâmetros
    await connection.query(
      `INSERT INTO fs_verification_tokens (usuario_id, token, expires_at) 
       VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '1 HOUR') 
       ON CONFLICT (usuario_id) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at`,
      [usuario.id, verificationToken]
    );

    const verificationLink = `${process.env.FS_CLIENT_URL}/verify-email?token=${verificationToken}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER, to: email, subject: templates.resendVerificationSubject, text: templates.resendVerificationText(usuario.nome, verificationLink),
    });
    res.json({ mensagem: templates.verificationEmailSent });
  } catch (error: any) {
    res.status(500).json({ erro: templates.serverError });
  } finally {
    if (connection) connection.release();
  }
});

router.post('/login', /*verificarRecaptcha,*/ async (req: Request, res: Response) => {
  const { email, senha, isMobile } = req.body;
  const lang = getLanguage(req);
  const templates = i18nEmails[lang];

  // console.log('/login')
  // console.log(email, senha, isMobile)
  try {
    // --- MySQL ORIGINAL ---
    // const [rows]: any = await poolPromise.query('SELECT * FROM fs_usuarios WHERE email = ?', [email]);
    
    // --- POSTGRESQL CORRIGIDO ---
    const { rows } = await poolPromise.query('SELECT * FROM fs_usuarios WHERE email = $1', [email]);
    // console.log(rows)
    
    if (rows.length === 0) return res.status(401).json({ erro: templates.errorCredentials });

    const usuario = rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) return res.status(401).json({ erro: templates.errorCredentials });
    if (!usuario.email_verified) return res.status(403).json({ erro: templates.errorVerifyEmail });

    const duracaoToken = isMobile ? '3650d' : '1d';
    const token = assinarToken({ id: usuario.id, email: usuario.email }, 'access', duracaoToken);

    res.json({ token, usuario: { nome: usuario.nome, email: usuario.email, status: usuario.status } });
  } catch (error: any) {
    console.error('❌ [ERRO CRÍTICO NO LOGIN]:', error.message || error);
    res.status(500).json({ erro: templates.errorServerLogin });
  }
});

router.post('/usuario/alterar-senha', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { senhaAtual, novaSenha } = req.body;
  const usuario_id = req.user?.id;
  const lang = getLanguage(req as any);
  const templates = i18nEmails[lang];

  if (!senhaAtual || !novaSenha) return res.status(400).json({ erro: templates.mandatoryFields });

  try {
    // --- MySQL ORIGINAL ---
    // const [userRows]: any = await poolPromise.query('SELECT senha FROM fs_usuarios WHERE id = ?', [usuario_id]);
    
    // --- POSTGRESQL CORRIGIDO ---
    const { rows: userRows } = await poolPromise.query('SELECT senha FROM fs_usuarios WHERE id = $1', [usuario_id]);
    
    if (userRows.length === 0) return res.status(404).json({ erro: templates.usrnotfound });
    
    const isMatch = await bcrypt.compare(senhaAtual, userRows[0].senha);
    if (!isMatch) return res.status(400).json({ erro: templates.pwdnotmatch });

    const salt = await bcrypt.genSalt(10);
    const hashNovaSenha = await bcrypt.hash(novaSenha, salt);
    
    // --- MySQL ORIGINAL ---
    // await poolPromise.query('UPDATE fs_usuarios SET senha = ? WHERE id = ?', [hashNovaSenha, usuario_id]);
    
    // --- POSTGRESQL CORRIGIDO ---
    await poolPromise.query('UPDATE fs_usuarios SET senha = $1 WHERE id = $2', [hashNovaSenha, usuario_id]);

    res.json({ mensagem: templates.pwdchanged });
  } catch (error: any) {
    res.status(500).json({ erro: templates.serverError });
  }
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  let connection: any;
  const lang = getLanguage(req);
  const templates = i18nEmails[lang];

  try {
    // --- MySQL ORIGINAL ---
    // connection = await poolPromise.getConnection();
    // const [results] = await connection.query('SELECT * FROM fs_usuarios WHERE email = ?', [email]);
    
    // --- POSTGRESQL CORRIGIDO ---
    connection = await poolPromise.connect();
    const { rows: results } = await connection.query('SELECT * FROM fs_usuarios WHERE email = $1', [email]);
    
    // SPRINT 0: resposta idêntica para e-mail existente ou não (evita enumeração de contas).
    if (results.length === 0) return res.json({ mensagem: templates.resetAlert });

    const usuario = results[0];
    const resetToken = assinarToken({ id: usuario.id }, 'reset', '1d');
    
    // --- MySQL ORIGINAL ---
    // await connection.query(
    //   `INSERT INTO fs_reset_tokens (usuario_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR)) ON DUPLICATE KEY UPDATE token = ?, expires_at = DATE_ADD(NOW(), INTERVAL 1 HOUR)`,
    //   [usuario.id, resetToken, resetToken]
    // );

    // --- POSTGRESQL CORRIGIDO ---
    // 1. Substituímos ON DUPLICATE KEY por ON CONFLICT (usuario_id)
    // 2. Usamos CURRENT_TIMESTAMP + INTERVAL '1 HOUR'
    // 3. Aproveitamos o EXCLUDED para reduzir o array de parâmetros (deixando apenas $1 e $2)
    await connection.query(
      `INSERT INTO fs_reset_tokens (usuario_id, token, expires_at) 
       VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '1 HOUR') 
       ON CONFLICT (usuario_id) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at`,
      [usuario.id, resetToken]
    );

    const resetLink = `${process.env.FS_CLIENT_URL}/reset-password?token=${resetToken}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER, to: email, subject: templates.resetSubject, text: templates.resetText(usuario.nome, resetLink),
    });
    res.json({ mensagem: templates.resetAlert });
  } catch (error: any) {
    res.status(500).json({ erro: templates.serverError });
  } finally {
    if (connection) connection.release();
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  const { token, senha } = req.body;
  let connection: any;
  const lang = getLanguage(req);
  const templates = i18nEmails[lang];

  try {
    // --- MySQL ORIGINAL ---
    // connection = await poolPromise.getConnection();
    // const [tokens] = await connection.query('SELECT * FROM fs_reset_tokens WHERE token = ? AND expires_at > NOW()', [token]);
    
    // --- POSTGRESQL CORRIGIDO ---
    connection = await poolPromise.connect();
    const { rows: tokens } = await connection.query('SELECT * FROM fs_reset_tokens WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP', [token]);
    
    if (tokens.length === 0) return res.status(400).json({ erro: templates.oldtoken });

    const usuarioId = tokens[0].usuario_id;
    const hashedPassword = await bcrypt.hash(senha, 10);
    
    // --- MySQL ORIGINAL ---
    // await connection.query('UPDATE fs_usuarios SET senha = ? WHERE id = ?', [hashedPassword, usuarioId]);
    // await connection.query('DELETE FROM fs_reset_tokens WHERE token = ?', [token]);

    // --- POSTGRESQL CORRIGIDO ---
    await connection.query('UPDATE fs_usuarios SET senha = $1 WHERE id = $2', [hashedPassword, usuarioId]);
    await connection.query('DELETE FROM fs_reset_tokens WHERE token = $1', [token]);

    res.json({ mensagem: templates.pwdnew });
  } catch (error: any) {
    res.status(500).json({ erro: templates.serverError });
  } finally {
    if (connection) connection.release();
  }
});

// =================================================================================
// PERFIL E IMAGEM
// =================================================================================
router.post('/usuario/foto-perfil', autenticarUsuario, upload.single('foto'), async (req: any, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Nenhuma imagem enviada.' });
    const novoNomeArquivo = await processarImagemSegura(req.file.buffer);

    // --- MySQL ORIGINAL ---
    // const [rows]: any = await poolPromise.execute('SELECT foto_perfil FROM fs_usuarios WHERE id = ?', [req.usuarioId]);
    
    // --- POSTGRESQL CORRIGIDO ---
    // Substituído .execute() por .query(), [rows] por { rows }, e ? por $1
    const { rows } = await poolPromise.query('SELECT foto_perfil FROM fs_usuarios WHERE id = $1', [req.usuarioId]);
    
    const fotoAntiga = rows[0]?.foto_perfil;

    if (fotoAntiga) {
      const caminhoFotoAntiga = path.join(UPLOADS_FOLDER, fotoAntiga);
      if (fs.existsSync(caminhoFotoAntiga)) {
        try { fs.unlinkSync(caminhoFotoAntiga); } catch (err: any) {}
      }
    }

    // --- MySQL ORIGINAL ---
    // await poolPromise.execute('UPDATE fs_usuarios SET foto_perfil = ? WHERE id = ?', [novoNomeArquivo, req.usuarioId]);
    
    // --- POSTGRESQL CORRIGIDO ---
    // Substituído .execute() por .query(), e ? por $1, $2
    await poolPromise.query('UPDATE fs_usuarios SET foto_perfil = $1 WHERE id = $2', [novoNomeArquivo, req.usuarioId]);
    
    res.json({ mensagem: 'Foto atualizada e protegida com sucesso!', foto_perfil: novoNomeArquivo });
  } catch (error: any) {
    res.status(400).json({ erro: error.message });
  }
});

router.get('/me', autenticarUsuario, async (req: AuthRequest, res: Response) => {
  try {
    // const [rows] = await poolPromise.execute(
    //   `SELECT nome, email, creditos, status, tipo_plano, assinatura_expira_em, chat_mensagens_restantes, 
    //    foto_perfil, is_affiliate, is_founder, is_agent_active, perfil_recompensado
    //    FROM fs_usuarios WHERE id = ?`, [req.usuarioId]
    // );
    
    const { rows } = await poolPromise.query(
      `SELECT nome, email, creditos, status, tipo_plano, assinatura_expira_em, chat_mensagens_restantes, 
       foto_perfil, is_affiliate, is_founder, is_agent_active, perfil_recompensado
       FROM fs_usuarios WHERE id = $1`, [req.usuarioId]
    );
    if ((rows as any[]).length === 0) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json({ usuario: (rows as any[])[0] });
  } catch (error: any) {
    res.status(500).json({ erro: 'Erro interno no servidor' });
  }
});

router.get('/protected', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ message: 'Rota protegida acessada', user: req.user });
});

// =================================================================================
// CRIANÇAS E PIF
// =================================================================================
router.get('/criancas', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // const [rows] = await poolPromise.query('SELECT * FROM fs_crianca WHERE usuario_id = ?', [req.user?.id]);
    const { rows } = await poolPromise.query('SELECT * FROM fs_crianca WHERE usuario_id = $1', [req.user?.id]);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

router.post('/criancas', authMiddleware, async (req: AuthRequest, res: Response) => {
  // ATENÇÃO AQUI: Tipamos e declaramos a constante!
  const dadosCrianca: ICrianca = req.body;
  
  try {
    await poolPromise.query(
      // `INSERT INTO fs_crianca (nome, idade, ano_escolar, alfabetizado, diagnostico, usuario_id, sexo, faz_terapia, terapias, frequenta_escola, tipo_fala, com_quem_vive, cuidador_principal, tem_animal, animal, interage_animal, dificuldade_cuidador, prioridade_desenvolvimento, hiperfoco, peso, altura, disturbio_alimentar, detalhes_disturbio, perfil_sensorial, estrategias_regulacao, gatilhos_comuns, info_adicional) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      `INSERT INTO fs_crianca (nome, idade, ano_escolar, alfabetizado, diagnostico, usuario_id, sexo, faz_terapia, terapias, frequenta_escola, tipo_fala, com_quem_vive, cuidador_principal, tem_animal, animal, interage_animal, dificuldade_cuidador, prioridade_desenvolvimento, hiperfoco, peso, altura, disturbio_alimentar, detalhes_disturbio, perfil_sensorial, estrategias_regulacao, gatilhos_comuns, info_adicional) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)`,
      [
        dadosCrianca.nome, 
        dadosCrianca.idade, 
        dadosCrianca.ano_escolar, 
        dadosCrianca.alfabetizado, 
        JSON.stringify(dadosCrianca.diagnostico), 
        req.user?.id, 
        dadosCrianca.sexo, 
        dadosCrianca.faz_terapia, 
        dadosCrianca.terapias, 
        dadosCrianca.frequenta_escola, 
        dadosCrianca.tipo_fala, 
        JSON.stringify(dadosCrianca.com_quem_vive), 
        dadosCrianca.cuidador_principal, 
        dadosCrianca.tem_animal, 
        dadosCrianca.animal, 
        dadosCrianca.interage_animal, 
        dadosCrianca.dificuldade_cuidador, 
        dadosCrianca.prioridade_desenvolvimento, 
        dadosCrianca.hiperfoco, 
        dadosCrianca.peso ? parseFloat(dadosCrianca.peso.toString()) : null, 
        dadosCrianca.altura ? parseFloat(dadosCrianca.altura.toString()) : null, 
        dadosCrianca.disturbio_alimentar, 
        dadosCrianca.detalhes_disturbio, 
        JSON.stringify(dadosCrianca.perfil_sensorial || []), 
        dadosCrianca.estrategias_regulacao, 
        dadosCrianca.gatilhos_comuns, 
        dadosCrianca.info_adicional
      ]
    );
    res.json({ success: true, crianca: { nome: dadosCrianca.nome } });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

router.put('/criancas/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const dadosCrianca: ICrianca = req.body; // ATENÇÃO: Tipamos para a atualização também!
  
  try {
    // --- MySQL ORIGINAL ---
    // await poolPromise.query(
    //   `UPDATE fs_crianca SET nome=?, idade=?, ano_escolar=?, alfabetizado=?, diagnostico=?, sexo=?, faz_terapia=?, terapias=?, frequenta_escola=?, tipo_fala=?, com_quem_vive=?, cuidador_principal=?, tem_animal=?, animal=?, interage_animal=?, dificuldade_cuidador=?, prioridade_desenvolvimento=?, hiperfoco=?, peso=?, altura=?, disturbio_alimentar=?, detalhes_disturbio=?, perfil_sensorial=?, estrategias_regulacao=?, gatilhos_comuns=?, info_adicional=? WHERE id_crianca = ? AND usuario_id = ?`,
    //   [
    //     // ... parâmetros ...
    //   ]
    // );

    // --- POSTGRESQL CORRIGIDO ---
    // Substituição de todos os 28 marcadores '?' pelos equivalentes '$1' a '$28'
    await poolPromise.query(
      `UPDATE fs_crianca SET nome=$1, idade=$2, ano_escolar=$3, alfabetizado=$4, diagnostico=$5, sexo=$6, faz_terapia=$7, terapias=$8, frequenta_escola=$9, tipo_fala=$10, com_quem_vive=$11, cuidador_principal=$12, tem_animal=$13, animal=$14, interage_animal=$15, dificuldade_cuidador=$16, prioridade_desenvolvimento=$17, hiperfoco=$18, peso=$19, altura=$20, disturbio_alimentar=$21, detalhes_disturbio=$22, perfil_sensorial=$23, estrategias_regulacao=$24, gatilhos_comuns=$25, info_adicional=$26 WHERE id_crianca = $27 AND usuario_id = $28`,
      [
        dadosCrianca.nome, 
        dadosCrianca.idade, 
        dadosCrianca.ano_escolar, 
        dadosCrianca.alfabetizado, 
        JSON.stringify(dadosCrianca.diagnostico), 
        dadosCrianca.sexo, 
        dadosCrianca.faz_terapia, 
        dadosCrianca.terapias, 
        dadosCrianca.frequenta_escola, 
        dadosCrianca.tipo_fala, 
        JSON.stringify(dadosCrianca.com_quem_vive), 
        dadosCrianca.cuidador_principal, 
        dadosCrianca.tem_animal, 
        dadosCrianca.animal, 
        dadosCrianca.interage_animal, 
        dadosCrianca.dificuldade_cuidador, 
        dadosCrianca.prioridade_desenvolvimento, 
        dadosCrianca.hiperfoco, 
        dadosCrianca.peso ? parseFloat(dadosCrianca.peso.toString()) : null, 
        dadosCrianca.altura ? parseFloat(dadosCrianca.altura.toString()) : null, 
        dadosCrianca.disturbio_alimentar, 
        dadosCrianca.detalhes_disturbio, 
        JSON.stringify(dadosCrianca.perfil_sensorial || []), 
        dadosCrianca.estrategias_regulacao, 
        dadosCrianca.gatilhos_comuns, 
        dadosCrianca.info_adicional, 
        id, 
        req.user?.id
      ]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

router.delete('/criancas/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  let connection: any;
  try {
    // --- MySQL ORIGINAL ---
    // connection = await poolPromise.getConnection();
    // await connection.beginTransaction();
    // const [crianca] = await connection.query('SELECT id_crianca FROM fs_crianca WHERE id_crianca = ? AND usuario_id = ?', [id, req.user?.id]);
    
    // --- POSTGRESQL CORRIGIDO ---
    connection = await poolPromise.connect();
    await connection.query('BEGIN');
    const { rows: crianca } = await connection.query('SELECT id_crianca FROM fs_crianca WHERE id_crianca = $1 AND usuario_id = $2', [id, req.user?.id]);
    
    if (crianca.length === 0) {
      // --- MySQL ORIGINAL ---
      // await connection.rollback();
      
      // --- POSTGRESQL CORRIGIDO ---
      await connection.query('ROLLBACK');
      return res.status(404).json({ erro: 'Acesso negado.' });
    }
    
    // --- MySQL ORIGINAL ---
    // await connection.query('DELETE FROM fs_diario_bordo WHERE crianca_id = ?', [id]);
    // await connection.query('DELETE FROM fs_plano_familiar WHERE id_crianca = ? AND usuario_id = ?', [id, req.user?.id]);
    // await connection.query('DELETE FROM fs_crianca WHERE id_crianca = ? AND usuario_id = ?', [id, req.user?.id]);
    // await connection.commit();
    
    // --- POSTGRESQL CORRIGIDO ---
    await connection.query('DELETE FROM fs_diario_bordo WHERE crianca_id = $1', [id]);
    await connection.query('DELETE FROM fs_plano_familiar WHERE id_crianca = $1 AND usuario_id = $2', [id, req.user?.id]);
    await connection.query('DELETE FROM fs_crianca WHERE id_crianca = $1 AND usuario_id = $2', [id, req.user?.id]);
    await connection.query('COMMIT');
    
    res.json({ success: true });
  } catch (error: any) {
    // --- MySQL ORIGINAL ---
    // if (connection) await connection.rollback();
    
    // --- POSTGRESQL CORRIGIDO ---
    if (connection) await connection.query('ROLLBACK');
    res.status(500).json({ erro: 'Erro no servidor' });
  } finally {
    if (connection) connection.release();
  }
});

// =====================================================================
// BUSCAR CONTAGEM DE DEPENDÊNCIAS PARA AVISO DE EXCLUSÃO
// =====================================================================
router.get('/criancas/:id/pif-count', authMiddleware, exigirCriancaPropria('id'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const usuario_id = req.user?.id;

  const lang = getLanguage(req as any);
  const templates = i18nEmails[lang];

  try {
    // --- MySQL ORIGINAL ---
    // const [pifRows]: any = await poolPromise.query(
    //   'SELECT COUNT(*) as count FROM fs_plano_familiar WHERE id_crianca = ? AND usuario_id = ?',
    //   [id, usuario_id]
    // );

    // --- POSTGRESQL CORRIGIDO ---
    const { rows: pifRows } = await poolPromise.query(
      'SELECT COUNT(*) as count FROM fs_plano_familiar WHERE id_crianca = $1 AND usuario_id = $2',
      [id, usuario_id]
    );

    // --- MySQL ORIGINAL ---
    // const [diarioRows]: any = await poolPromise.query(
    //   'SELECT COUNT(*) as count FROM fs_diario_bordo WHERE crianca_id = ?',
    //   [id]
    // );

    // --- POSTGRESQL CORRIGIDO ---
    const { rows: diarioRows } = await poolPromise.query(
      'SELECT COUNT(*) as count FROM fs_diario_bordo WHERE crianca_id = $1',
      [id]
    );

    // O PostgreSQL retorna COUNT() como string (bigint), aplicamos Number() para manter a compatibilidade
    res.json({
      pifCount: Number(pifRows[0].count),
      diarioCount: Number(diarioRows[0].count) // Enviando também a contagem do diário
    });
  } catch (error: any) {
    console.error('Erro ao buscar contagens da criança:', error);
    res.status(500).json({ erro: templates.serverError });
  }
});

router.get('/plano-familiar/ultimo/:id_crianca', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // const [rows] = await poolPromise.query(`SELECT dados_formulario, criado_em FROM fs_plano_familiar WHERE id_crianca = ? AND usuario_id = ? ORDER BY criado_em DESC LIMIT 1`, [req.params.id_crianca, req.user?.id]);
    const { rows } = await poolPromise.query(`SELECT dados_formulario, criado_em FROM fs_plano_familiar WHERE id_crianca = $1 AND usuario_id = $2 ORDER BY criado_em DESC LIMIT 1`, [req.params.id_crianca, req.user?.id]);
    if ((rows as any[]).length > 0) res.json((rows as any[])[0]);
    else res.status(404).json({ message: "Nenhum plano" });
  } catch (error: any) {
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// =================================================================================
// REATOR DO PIF (CLAUDE & GROK ROUTING + CHAINING XML)
// =================================================================================
router.post('/plano-familiar', authMiddleware, exigirCriancaPropria('id_crianca', 'body'), async (req: AuthRequest, res: Response) => {
  const { id_crianca, dados_formulario, dados_crianca } = req.body;
  const usuario_id = req.user?.id;
  const lang = getLanguage(req as any);
  const templates = i18nEmails[lang];

  if (!id_crianca || !dados_formulario || !dados_crianca) {
    return res.status(400).json({ erro: "Dados incompletos." });
  }

  if (validarObjetoContraInjecao(dados_formulario) || validarObjetoContraInjecao(dados_crianca)) {
    return res.status(400).json({ erro: 'Dados inválidos detectados. Comandos estruturais não são permitidos.' });
  }

  let connection: any;
  let creditoConsumido = false;

  try {
    // --- MySQL ORIGINAL ---
    // connection = await poolPromise.getConnection();
    // const [diarioRows] = await connection.query(
    //   `SELECT data, humor_dia, teve_crise, detalhes_crise, momentos_chave FROM fs_diario_bordo WHERE crianca_id = ? ORDER BY data DESC LIMIT 10`, [id_crianca]
    // );

    // --- POSTGRESQL CORRIGIDO ---
    connection = await poolPromise.connect();

    // 1. DADOS DO DIÁRIO
    const { rows: diarioRows } = await connection.query(
      `SELECT data, humor_dia, teve_crise, detalhes_crise, momentos_chave FROM fs_diario_bordo WHERE crianca_id = $1 ORDER BY data DESC LIMIT 10`, 
      [id_crianca]
    );

    let resumoDiario = "Não há registos recentes no Diário de Bordo.";
    if (diarioRows.length > 0) {
      resumoDiario = diarioRows.map((d: any) => {
        const crise = d.teve_crise ? `⚠️ TEVE CRISE (${d.detalhes_crise})` : 'Sem crises';
        return `- [${new Date(d.data).toLocaleDateString('pt-BR')}] Humor: ${d.humor_dia}/5 | ${crise} | Destaque: ${d.momentos_chave || 'N/A'}`;
      }).join('\n');
    }

    // --- MySQL ORIGINAL ---
    // await connection.beginTransaction();
    // const [userRows] = await connection.query('SELECT email, creditos FROM fs_usuarios WHERE id = ? FOR UPDATE', [usuario_id]);
    // ...
    // await connection.query('UPDATE fs_usuarios SET creditos = creditos - 1 WHERE id = ?', [usuario_id]);
    // await connection.query('INSERT INTO fs_creditos_consumidos (usuario_id, data_consumo, creditos, tipo_credito, descricao) VALUES (?, NOW(), -1, "PIF", "Geração de PIF")', [usuario_id]);
    // const [planoAnteriorRows] = await connection.query('SELECT dados_formulario FROM fs_plano_familiar WHERE id_crianca = ? AND usuario_id = ? ORDER BY criado_em DESC LIMIT 1', [id_crianca, usuario_id]);
    // ...
    // await connection.commit();

    // --- POSTGRESQL CORRIGIDO ---
    // 2. CRÉDITOS E DADOS ANTERIORES
    await connection.query('BEGIN');
    const { rows: userRows } = await connection.query('SELECT email, creditos FROM fs_usuarios WHERE id = $1 FOR UPDATE', [usuario_id]);
    
    if (userRows.length === 0) {
      await connection.query('ROLLBACK');
      return res.status(404).json({ erro: templates.usrnotfound });
    }
    if (userRows[0].creditos <= 0) {
      await connection.query('ROLLBACK');
      return res.status(403).json({ erro: templates.noCredits });
    }

    await connection.query('UPDATE fs_usuarios SET creditos = creditos - 1 WHERE id = $1', [usuario_id]);
    // Uso de aspas simples ('PIF', 'Geração de PIF') e CURRENT_TIMESTAMP
    await connection.query(
      `INSERT INTO fs_creditos_consumidos (usuario_id, data_consumo, creditos, tipo_credito, descricao) VALUES ($1, CURRENT_TIMESTAMP, -1, 'PIF', 'Geração de PIF')`, 
      [usuario_id]
    );

    const { rows: planoAnteriorRows } = await connection.query(
      'SELECT dados_formulario FROM fs_plano_familiar WHERE id_crianca = $1 AND usuario_id = $2 ORDER BY criado_em DESC LIMIT 1', 
      [id_crianca, usuario_id]
    );
    const dadosAnteriores = planoAnteriorRows.length > 0 ? planoAnteriorRows[0].dados_formulario : null;

    await connection.query('COMMIT');
    connection.release();
    connection = null;
    creditoConsumido = true;

    // 3. PREPARAÇÃO DO CONTEXTO DO PROMPT
    const idadeCalculada = calcularIdadeTexto(dados_crianca.idade);
    const nomeSeguro = dados_crianca.nome || 'Criança';
    const iniciaisNome = nomeSeguro.trim().split(/\s+/).map((p: string) => p[0].toUpperCase()).join('.') || 'N/A';
    
    let perfilSensorialTexto = "Não informado";
    if (dados_crianca.perfil_sensorial) {
      try {
        const perfil = Array.isArray(dados_crianca.perfil_sensorial) ? dados_crianca.perfil_sensorial : JSON.parse(dados_crianca.perfil_sensorial || '[]');
        perfilSensorialTexto = perfil.length > 0 ? perfil.join(', ') : "Não informado";
      } catch (e: any) { }
    }

    const disp = dados_formulario.disponibilidade || {};
    let promptDisponibilidade = disp.tem_tempo === 'Sim' 
      ? `- Disponibilidade Alta: ${disp.horas_dia || 1}h por dia no período da ${disp.periodo_dia || 'manhã'}.` 
      : `- Disponibilidade Crítica: Apenas ${disp.dias_semana || 1} dias por semana, ${disp.horas_dia || 1}h por dia. Seja realista.`;

    const variaveisPrompt = {
      perfilSensorialTexto, 
      infoBiometria: `Peso: ${dados_crianca.peso || '?'}kg`,
      infoAlimentar: dados_crianca.detalhes_disturbio || 'Nenhuma',
      resumoDiario, 
      promptDisponibilidade, 
      iniciaisNome, 
      idadeCalculada, 
      criancaSexo: dados_crianca.sexo,
      diagnosticoTratado: Array.isArray(dados_crianca.diagnostico) ? dados_crianca.diagnostico.join(', ') : (dados_crianca.diagnostico || 'Não informado'),
      hiperfocoTratado: dados_crianca.hiperfoco || 'Nenhum',
      regulacaoTratada: dados_crianca.estrategias_regulacao || 'Não informado',
      gatilhotratado: dados_crianca.gatilhos_comuns || 'Não informado',
      tipoFalaTratado: dados_crianca.tipo_fala || 'Não informado',
      dadosForm: JSON.stringify(dados_formulario, null, 2),
      dadosAnterioresTexto: dadosAnteriores ? `\n\n**DADOS DO PIF ANTERIOR:**\n${JSON.stringify(dadosAnteriores, null, 2)}` : ""
    };

    const systemPrompt = await construirPrompt('pif_system', variaveisPrompt);
    const userPt1 = await construirPrompt('pif_user_pt1', variaveisPrompt);
    const userPt2 = await construirPrompt('pif_user_pt2', variaveisPrompt);
    const userPt3 = await construirPrompt('pif_user_pt3', variaveisPrompt);
    const userPt4 = await construirPrompt('pif_user_pt4', variaveisPrompt);
    const userPt5 = await construirPrompt('pif_user_pt5', variaveisPrompt);

    // 4. CONFIGURAÇÃO DE ROTEAMENTO (CLAUDE vs GROK)
    const configIA: any = (await obterConfigIA('pif_system')) || {};
    const modeloIA = configIA.modelo || 'claude-sonnet-4-6';
    const isClaude = modeloIA.toLowerCase().includes('claude');

    const baseConfig: Record<string, any> = {
      model: modeloIA,
      max_tokens: parseInt(configIA.max_tokens) || 8000,
    };

    if (!isClaude) {
        if (configIA.temperatura !== null && configIA.temperatura !== undefined) {
            baseConfig.temperature = parseFloat(configIA.temperatura);
        }
        if (configIA.top_p !== null && configIA.top_p !== undefined) {
            baseConfig.top_p = parseFloat(configIA.top_p);
        }
    }

    // 5. MOTOR DE EXECUÇÃO DE CHAINING
    const reqOptions = { maxRetries: 3, timeout: 180 * 1000 };
    let combinedUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    const executarChamada = async (userPromptTexto: string, etapaNome: string, contextoAcumulado = "") => {
      console.log(`[PIF] -> A executar ${etapaNome}...`);
      
      let promptFinal = userPromptTexto;
      if (isClaude && contextoAcumulado) {
          promptFinal = `${userPromptTexto}\n\n<contexto_etapas_anteriores>\n${contextoAcumulado}\n</contexto_etapas_anteriores>\n\nSiga rigorosamente a continuação sem repetir as atividades acima.`;
      }

      let conteudoResposta = "";

      if (isClaude) {
          const resposta: any = await anthropicClient.messages.create({
              ...baseConfig as any,
              system: systemPrompt,
              messages: [{ role: 'user', content: promptFinal }]
          }, reqOptions);
          
          combinedUsage.prompt_tokens += resposta.usage.input_tokens || 0;
          combinedUsage.completion_tokens += resposta.usage.output_tokens || 0;
          conteudoResposta = resposta.content[0].text;
      } else {
          const resposta: any = await grokClient.chat.completions.create({
              ...baseConfig as any,
              messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: promptFinal }
              ]
          }, reqOptions);

          combinedUsage.prompt_tokens += resposta.usage?.prompt_tokens || 0;
          combinedUsage.completion_tokens += resposta.usage?.completion_tokens || 0;
          conteudoResposta = resposta.choices[0]?.message?.content || "";
      }

      return conteudoResposta;
    };

    const pt1 = await executarChamada(userPt1, "Etapa 1 (Visão e Linguagem)");
    const pt2 = await executarChamada(userPt2, "Etapa 2 (Cognição e Socioemocional)", pt1);
    const pt3 = await executarChamada(userPt3, "Etapa 3 (Motricidade e AVDs)", `${pt1}\n\n${pt2}`);
    const pt4 = await executarChamada(userPt4, "Etapa 4 (Fora de Casa e Recursos)", `${pt1}\n\n${pt2}\n\n${pt3}`);
    const pt5 = await executarChamada(userPt5, "Etapa 5 (Manejo e Fecho)", `${pt1}\n\n${pt2}\n\n${pt3}\n\n${pt4}`);

    combinedUsage.total_tokens = combinedUsage.prompt_tokens + combinedUsage.completion_tokens;
    const pifCompleto = `${pt1}\n\n${pt2}\n\n${pt3}\n\n${pt4}\n\n${pt5}`;

    // --- MySQL ORIGINAL ---
    // if (combinedUsage.total_tokens > 0) {
    //   const custoCalculado = await calcularCustoIA(baseConfig.model, combinedUsage);
    //   poolPromise.query(
    //     'INSERT INTO fs_api_usage (usuario_id, ferramenta, modelo, prompt_tokens, completion_tokens, total_tokens, custo_usd) VALUES (?, ?, ?, ?, ?, ?, ?)',
    //     [usuario_id, 'PIF_CHAINING_5', baseConfig.model, combinedUsage.prompt_tokens, combinedUsage.completion_tokens, combinedUsage.total_tokens, custoCalculado]
    //   ).catch((err: any) => console.error('Erro ao guardar auditoria:', err));
    // }

    // --- POSTGRESQL CORRIGIDO ---
    if (combinedUsage.total_tokens > 0) {
      const custoCalculado = await calcularCustoIA(baseConfig.model, combinedUsage);
      poolPromise.query(
        'INSERT INTO fs_api_usage (usuario_id, ferramenta, modelo, prompt_tokens, completion_tokens, total_tokens, custo_usd) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [usuario_id, 'PIF_CHAINING_5', baseConfig.model, combinedUsage.prompt_tokens, combinedUsage.completion_tokens, combinedUsage.total_tokens, custoCalculado]
      ).catch((err: any) => console.error('Erro ao guardar auditoria:', err));
    }

    // --- MySQL ORIGINAL ---
    // connection = await poolPromise.getConnection();
    // const [result] = await connection.query(`INSERT INTO fs_plano_familiar (usuario_id, id_crianca, dados_formulario, resposta_ia) VALUES (?, ?, ?, ?)`, [usuario_id, id_crianca, JSON.stringify(dados_formulario), pifCompleto]);
    // await connection.query('DELETE FROM fs_plano_familiar WHERE id_crianca = ? AND usuario_id = ? AND resposta_ia IS NULL', [id_crianca, usuario_id]);
    // connection.release();
    // res.status(200).json({ pifGrok: pifCompleto, newPifId: result.insertId });

    // --- POSTGRESQL CORRIGIDO ---
    // 6. GUARDAR NA BASE DE DADOS
    connection = await poolPromise.connect();
    const { rows: resultRows } = await connection.query(
      `INSERT INTO fs_plano_familiar (usuario_id, id_crianca, dados_formulario, resposta_ia) VALUES ($1, $2, $3, $4) RETURNING id_plano`, 
      [usuario_id, id_crianca, JSON.stringify(dados_formulario), pifCompleto]
    );
    await connection.query('DELETE FROM fs_plano_familiar WHERE id_crianca = $1 AND usuario_id = $2 AND resposta_ia IS NULL', [id_crianca, usuario_id]);
    connection.release();

    res.status(200).json({ pifGrok: pifCompleto, newPifId: resultRows[0].id_plano });

    // 7. BACKGROUND PDF E E-MAIL
    (async () => {
      try {
        const pdfPath = path.join(__dirname, `pif_${nomeSeguro.replace(/\s/g, '_')}_${Date.now()}.pdf`);
        const rawHtml = marked.parse(pifCompleto);
        const htmlContent = sanitizeHtml(rawHtml as string, { allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) });

        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--mute-audio'] });
        const page = await browser.newPage();
        await page.setContent(`<html><head><style>body{font-family:'Helvetica',sans-serif;line-height:1.6;color:#333;padding:40px;} h1{color:#2c3e50;border-bottom:2px solid #3498db;} h2{color:#2980b9;} strong{color:#2c3e50;}</style></head><body>${htmlContent}</body></html>`, { waitUntil: 'networkidle0' });
        await page.pdf({ path: pdfPath, format: 'A4', margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' }, printBackground: true });
        await browser.close();

        await transporter.sendMail({
          from: `"CognaCare" <${process.env.EMAIL_USER}>`, to: userRows[0].email, subject: templates.pifSubject(nomeSeguro), text: templates.pifText(nomeSeguro), attachments: [{ filename: `PIF_${nomeSeguro}.pdf`, path: pdfPath }],
        });
        fs.unlink(pdfPath, () => { });
      } catch (err: any) { console.error(`[PIF-BG] Erro na geração do PDF:`, err); }
    })();

  } catch (error: any) {
    if (creditoConsumido) {
      try {
        // --- MySQL ORIGINAL ---
        // const connEstorno = await poolPromise.getConnection();
        // await connEstorno.query('UPDATE fs_usuarios SET creditos = creditos + 1 WHERE id = ?', [usuario_id]);
        // await connEstorno.query('INSERT INTO fs_creditos_consumidos (usuario_id, data_consumo, creditos, tipo_credito, descricao) VALUES (?, NOW(), 1, "PIF", "Estorno - Erro")', [usuario_id]);
        
        // --- POSTGRESQL CORRIGIDO ---
        const connEstorno = await poolPromise.connect();
        await connEstorno.query('UPDATE fs_usuarios SET creditos = creditos + 1 WHERE id = $1', [usuario_id]);
        await connEstorno.query(
          `INSERT INTO fs_creditos_consumidos (usuario_id, data_consumo, creditos, tipo_credito, descricao) VALUES ($1, CURRENT_TIMESTAMP, 1, 'PIF', 'Estorno - Erro')`, 
          [usuario_id]
        );
        connEstorno.release();
      } catch (e: any) { }
    }
    if (connection) try { connection.release(); } catch (e: any) { }
    if (!res.headersSent) res.status(500).json({ erro: templates.serverErrorCredits || "Erro ao processar solicitação.", detalhes: error.message });
  }
});

// GET: Listar PIFs e rotas adicionais mantidas intactas
router.get('/planos-familiares', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // --- MySQL ORIGINAL ---
    // const [rows] = await poolPromise.query(`SELECT pf.id_plano, pf.id_crianca, pf.criado_em, c.nome as nome_crianca, (pf.resposta_ia IS NOT NULL AND LENGTH(pf.resposta_ia) > 0) as tem_resposta FROM fs_plano_familiar pf LEFT JOIN fs_crianca c ON pf.id_crianca = c.id_crianca WHERE pf.usuario_id = ? ORDER BY pf.criado_em DESC`, [req.user?.id]);
    
    // --- POSTGRESQL CORRIGIDO ---
    const { rows } = await poolPromise.query(
      `SELECT pf.id_plano, pf.id_crianca, pf.criado_em, c.nome as nome_crianca, (pf.resposta_ia IS NOT NULL AND LENGTH(pf.resposta_ia) > 0) as tem_resposta 
       FROM fs_plano_familiar pf 
       LEFT JOIN fs_crianca c ON pf.id_crianca = c.id_crianca 
       WHERE pf.usuario_id = $1 
       ORDER BY pf.criado_em DESC`, 
      [req.user?.id]
    );

    res.json(rows);
  } catch (error: any) { 
    res.status(500).json({ erro: 'Erro no servidor' }); 
  }
});

// GET: Buscar o conteúdo de um PIF específico
router.get('/plano-familiar/:id_plano', authMiddleware, async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req as any); // Detecta idioma
  const templates = i18nEmails[lang];
  try {
    const { id_plano } = req.params;
    
    // --- MySQL ORIGINAL ---
    // const query = 'SELECT resposta_ia FROM fs_plano_familiar WHERE id_plano = ? AND usuario_id = ?';
    // const [rows]: any = await poolPromise.query(query, [id_plano, req.user?.id]);

    // --- POSTGRESQL CORRIGIDO ---
    const query = 'SELECT resposta_ia FROM fs_plano_familiar WHERE id_plano = $1 AND usuario_id = $2';
    const { rows } = await poolPromise.query(query, [id_plano, req.user?.id]);

    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ erro: templates.planNotFound });
    }
  } catch (error: any) {
    console.error('Erro ao buscar PIF:', error);
    res.status(500).json({ erro: templates.planNotFound });
  }
});

// GET: Gerar e baixar o PDF de um PIF específico
router.get('/plano-familiar/download/:id_plano', authMiddleware, async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req as any); // Detecta idioma
  const templates = i18nEmails[lang];
  try {
    const { id_plano } = req.params;
    
    // --- MySQL ORIGINAL ---
    // const query = `
    //   SELECT
    //     pf.resposta_ia,
    //     c.nome AS nome_crianca
    //   FROM fs_plano_familiar AS pf
    //   JOIN fs_crianca AS c ON pf.id_crianca = c.id_crianca
    //   WHERE pf.id_plano = ? AND pf.usuario_id = ?`;
    // const [rows]: any = await poolPromise.query(query, [id_plano, req.user?.id]);

    // --- POSTGRESQL CORRIGIDO ---
    const query = `
      SELECT
        pf.resposta_ia,
        c.nome AS nome_crianca
      FROM fs_plano_familiar AS pf
      JOIN fs_crianca AS c ON pf.id_crianca = c.id_crianca
      WHERE pf.id_plano = $1 AND pf.usuario_id = $2`;

    const { rows } = await poolPromise.query(query, [id_plano, req.user?.id]);

    if (rows.length === 0) {
      return res.status(404).json({ erro: templates.planNotFound });
    }

    const { resposta_ia, nome_crianca } = rows[0];
    const pdfPath = path.join(__dirname, `pif_download_${id_plano}.pdf`);
    const rawHtml = marked.parse(resposta_ia);
    const htmlContent = sanitizeHtml(rawHtml as string, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
    });

    // Gera o arquivo PDF no servidor  COM PUPPETEER
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        // Essenciais para Docker
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',

        // Otimizações para Geração de PDF
        '--disable-gpu',
        '--disable-accelerated-2d-canvas',
        '--mute-audio',
        '--force-color-profile=srgb'
      ]
    });
    const page = await browser.newPage();

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '1in',
        right: '1in',
        bottom: '1in',
        left: '1in'
      }
    });

    await browser.close();

    // Envia o arquivo para download e o exclui depois
    const fileName = `PIF_${nome_crianca.replace(/\s/g, '_')}.pdf`;
    res.download(pdfPath, fileName, (err: any) => {
      if (err) {
        console.error('Erro ao enviar PDF para download:', err);
      }
      // Exclui o arquivo temporário do servidor
      fs.unlinkSync(pdfPath);
    });

  } catch (error: any) {
    console.error('Erro ao gerar PDF para download:', error);
    res.status(500).json({ erro: templates.serverError });
  }
});

// ROTA PARA SALVAR RASCUNHO (CORRIGIDA: Sincronizada com o GET)
router.post('/plano-familiar/rascunho', authMiddleware, exigirCriancaPropria('id_crianca', 'body'), async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req as any);
  const templates = i18nEmails[lang];
  const { id_crianca, dados_formulario } = req.body;
  const usuario_id = req.user?.id;

  if (!id_crianca || !dados_formulario) {
    return res.status(400).json({ erro: templates.noData });
  }

  try {
    // --- MySQL ORIGINAL ---
    // const [existingDraft]: any = await poolPromise.query(
    //   'SELECT id_plano FROM fs_plano_familiar WHERE id_crianca = ? AND usuario_id = ? AND resposta_ia IS NULL ORDER BY criado_em DESC LIMIT 1',
    //   [id_crianca, usuario_id]
    // );

    // --- POSTGRESQL CORRIGIDO ---
    // 1. Verifica se já existe um rascunho
    const { rows: existingDraft } = await poolPromise.query(
      'SELECT id_plano FROM fs_plano_familiar WHERE id_crianca = $1 AND usuario_id = $2 AND resposta_ia IS NULL ORDER BY criado_em DESC LIMIT 1',
      [id_crianca, usuario_id]
    );

    const dadosString = JSON.stringify(dados_formulario);

    if (existingDraft.length > 0) {
      // --- MySQL ORIGINAL ---
      // await poolPromise.query(
      //   'UPDATE fs_plano_familiar SET dados_formulario = ?, criado_em = NOW() WHERE id_plano = ?',
      //   [dadosString, existingDraft[0].id_plano]
      // );

      // --- POSTGRESQL CORRIGIDO ---
      // Atualiza o rascunho MAIS RECENTE encontrado (Substituído NOW() por CURRENT_TIMESTAMP e ? por $1, $2)
      await poolPromise.query(
        'UPDATE fs_plano_familiar SET dados_formulario = $1, criado_em = CURRENT_TIMESTAMP WHERE id_plano = $2',
        [dadosString, existingDraft[0].id_plano]
      );
    } else {
      // --- MySQL ORIGINAL ---
      // await poolPromise.query(
      //   'INSERT INTO fs_plano_familiar (usuario_id, id_crianca, dados_formulario, resposta_ia, criado_em) VALUES (?, ?, ?, NULL, NOW())',
      //   [usuario_id, id_crianca, dadosString]
      // );

      // --- POSTGRESQL CORRIGIDO ---
      // Cria um novo rascunho se não houver nenhum
      await poolPromise.query(
        'INSERT INTO fs_plano_familiar (usuario_id, id_crianca, dados_formulario, resposta_ia, criado_em) VALUES ($1, $2, $3, NULL, CURRENT_TIMESTAMP)',
        [usuario_id, id_crianca, dadosString]
      );
    }

    res.json({ success: true, message: templates.draftSaved });

  } catch (error: any) {
    console.error('Erro ao salvar rascunho:', error);
    res.status(500).json({ erro: templates.serverError });
  }
});

// ROTA PARA BUSCAR RASCUNHO (Pequeno ajuste de segurança no JSON)
router.get('/plano-familiar/rascunho/:id_crianca', authMiddleware, async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req as any);
  const templates = i18nEmails[lang];
  const { id_crianca } = req.params;
  const usuario_id = req.user?.id;

  try {
    // --- MySQL ORIGINAL ---
    // const [rows]: any = await poolPromise.query(
    //   'SELECT dados_formulario, criado_em FROM fs_plano_familiar WHERE id_crianca = ? AND usuario_id = ? AND resposta_ia IS NULL ORDER BY criado_em DESC LIMIT 1',
    //   [id_crianca, usuario_id]
    // );

    // --- POSTGRESQL CORRIGIDO ---
    const { rows } = await poolPromise.query(
      'SELECT dados_formulario, criado_em FROM fs_plano_familiar WHERE id_crianca = $1 AND usuario_id = $2 AND resposta_ia IS NULL ORDER BY criado_em DESC LIMIT 1',
      [id_crianca, usuario_id]
    );

    if (rows.length > 0) {
      res.json({ rascunho: rows[0] });
    } else {
      res.json({ rascunho: null });
    }
  } catch (error: any) {
    console.error('Erro ao buscar rascunho:', error);
    res.status(500).json({ erro: templates.serverError });
  }
});

router.get('/dashboard', authMiddleware, async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req as any); // Detecta idioma
  const templates = i18nEmails[lang];
  try {
    // --- MySQL ORIGINAL ---
    // const [user]: any = await poolPromise.query('SELECT nome, email FROM fs_usuarios WHERE id = ?', [req.user?.id]);
    
    // --- POSTGRESQL CORRIGIDO ---
    const { rows: user } = await poolPromise.query('SELECT nome, email FROM fs_usuarios WHERE id = $1', [req.user?.id]);
    
    res.json({ success: true, user });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ erro: templates.serverError });
  }
});

router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req as any);
  const templates = i18nEmails[lang];
  try {
    // const [rows]: any = await poolPromise.query(
    //   `SELECT nome, email, creditos, chat_mensagens_restantes, documento_nacional, telefone, 
    //       cep, endereco_logradouro, numero, complemento, cidade, estado_uf, pais, perfil_recompensado 
    //    FROM fs_usuarios WHERE id = ?`,
    //   [req.user?.id]
    // );
    const { rows } = await poolPromise.query(
      `SELECT nome, email, creditos, chat_mensagens_restantes, documento_nacional, telefone, 
          cep, endereco_logradouro, numero, complemento, cidade, estado_uf, pais, perfil_recompensado,
          escolaridade, relacao_crianca, relacao_crianca_outro 
       FROM fs_usuarios WHERE id = $1`,
      [req.user?.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    res.json({ success: true, user: rows[0] });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ erro: templates.serverError });
  }
});

router.put('/profile/completar', authMiddleware, async (req: AuthRequest, res: Response) => {
  let connection: any;
  try {
    // 1. Recebe o complemento do body
    const { documento_nacional, telefone, cep, endereco_logradouro, numero, complemento, cidade, estado_uf, pais, escolaridade, relacao_crianca, relacao_crianca_outro } = req.body;
    const usuarioId = req.user?.id;

    // Campos estritamente obrigatórios (complemento fica de fora aqui)
    if (!documento_nacional || !telefone || !cep || !endereco_logradouro || !numero || !cidade || !estado_uf || !pais || !escolaridade || !relacao_crianca) {
      return res.status(400).json({ erro: 'Todos os campos cadastrais são obrigatórios.' });
    }

    if (relacao_crianca === 'Outros' && !relacao_crianca_outro) {
      return res.status(400).json({ erro: 'Por favor, especifique a sua relação com a criança.' });
    }

    const docLimpo = documento_nacional.replace(/[\s.\-]/g, '').toUpperCase();
    const cepLimpo = cep.replace(/[\s.\-]/g, '');

    if (pais === 'Brasil') {
      if (isNaN(Number(docLimpo)) || !isValidCPF(docLimpo)) {
        return res.status(400).json({ erro: 'O CPF informado é inválido. Por favor, verifique o número.' });
      }
      if (cepLimpo.length !== 8) {
        return res.status(400).json({ erro: 'O CEP informado deve conter exatamente 8 dígitos.' });
      }
    }

    // --- MySQL ORIGINAL ---
    // connection = await poolPromise.getConnection();
    // await connection.beginTransaction();

    // --- POSTGRESQL CORRIGIDO ---
    connection = await poolPromise.connect();
    await connection.query('BEGIN');

    // --- MySQL ORIGINAL ---
    // const [docCheck]: any = await connection.query(
    //   'SELECT id FROM fs_usuarios WHERE documento_nacional = ? AND id != ?',
    //   [docLimpo, usuarioId]
    // );

    // --- POSTGRESQL CORRIGIDO ---
    const { rows: docCheck } = await connection.query(
      'SELECT id FROM fs_usuarios WHERE documento_nacional = $1 AND id != $2',
      [docLimpo, usuarioId]
    );

    if (docCheck.length > 0) {
      // --- MySQL ORIGINAL ---
      // await connection.rollback();

      // --- POSTGRESQL CORRIGIDO ---
      await connection.query('ROLLBACK');
      return res.status(422).json({
        erro: 'Este Documento (CPF/ID) já está registrado no sistema por outra conta. Os dados não foram salvos.'
      });
    }

    // --- MySQL ORIGINAL ---
    // const [userCheck]: any = await connection.query(
    //   'SELECT perfil_recompensado FROM fs_usuarios WHERE id = ?',
    //   [usuarioId]
    // );

    // --- POSTGRESQL CORRIGIDO ---
    const { rows: userCheck } = await connection.query(
      'SELECT perfil_recompensado FROM fs_usuarios WHERE id = $1',
      [usuarioId]
    );

    // Avalia true ou 1 dependendo se a coluna estiver como boolean ou numérico no PG
    const jaGanhouRecompensa = userCheck[0]?.perfil_recompensado === 1 || userCheck[0]?.perfil_recompensado === true;
    let concedeuCreditos = false;

    // 2. Query de atualização atualizada com o campo complemento
    // --- MySQL ORIGINAL ---
    // await connection.query(
    //   `UPDATE fs_usuarios 
    //      SET documento_nacional = ?, telefone = ?, cep = ?, endereco_logradouro = ?, numero = ?, complemento = ?, cidade = ?, estado_uf = ?, pais = ?
    //      WHERE id = ?`,
    //   [docLimpo, telefone, cepLimpo, endereco_logradouro, numero, complemento || null, cidade, estado_uf.toUpperCase(), pais, usuarioId]
    // );

    // --- POSTGRESQL CORRIGIDO ---
    await connection.query(
      `UPDATE fs_usuarios 
        SET documento_nacional = $1, telefone = $2, cep = $3, endereco_logradouro = $4, numero = $5, complemento = $6, cidade = $7, estado_uf = $8, pais = $9, escolaridade = $10, relacao_crianca = $11, relacao_crianca_outro = $12
        WHERE id = $13`,
      [docLimpo, telefone, cepLimpo, endereco_logradouro, numero, complemento || null, cidade, estado_uf.toUpperCase(), pais, escolaridade, relacao_crianca, relacao_crianca === 'Outros' ? relacao_crianca_outro : null, usuarioId]
    );

    if (!jaGanhouRecompensa) {
      // --- MySQL ORIGINAL ---
      // await connection.query(
      //   `UPDATE fs_usuarios 
      //        SET creditos = creditos + 1, 
      //            chat_mensagens_restantes = chat_mensagens_restantes + 1, 
      //            perfil_recompensado = 1 
      //        WHERE id = ?`,
      //   [usuarioId]
      // );
      // await connection.query(
      //   `INSERT INTO fs_creditos_consumidos (usuario_id, data_consumo, creditos, tipo_credito, descricao) 
      //        VALUES (?, NOW(), 1, "BÔNUS", "Bônus de Cadastro Completo")`,
      //   [usuarioId]
      // );

      // --- POSTGRESQL CORRIGIDO ---
      // Ajuste no $1, CURRENT_TIMESTAMP, e aspas simples nas strings 'BÔNUS', etc.
      await connection.query(
        `UPDATE fs_usuarios 
             SET creditos = creditos + 1, 
                 chat_mensagens_restantes = chat_mensagens_restantes + 1, 
                 perfil_recompensado = '1' 
             WHERE id = $1`,
        [usuarioId]
      );
      await connection.query(
        `INSERT INTO fs_creditos_consumidos (usuario_id, data_consumo, creditos, tipo_credito, descricao) 
             VALUES ($1, CURRENT_TIMESTAMP, 1, 'BÔNUS', 'Bônus de Cadastro Completo')`,
        [usuarioId]
      );
      
      concedeuCreditos = true;
    }

    // --- MySQL ORIGINAL ---
    // await connection.commit();

    // --- POSTGRESQL CORRIGIDO ---
    await connection.query('COMMIT');

    res.json({
      sucesso: true,
      mensagem: concedeuCreditos
        ? 'Perfil atualizado! Ganhou +1 Crédito PIF e +1 Crédito de Chat de bônus! 🎁'
        : 'Perfil atualizado com sucesso!',
      concedeuCreditos
    });

  } catch (error: any) {
    // --- MySQL ORIGINAL ---
    // if (connection) await connection.rollback();

    // --- POSTGRESQL CORRIGIDO ---
    if (connection) await connection.query('ROLLBACK');
    
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ erro: 'Erro interno ao processar a atualização cadastral.' });
  } finally {
    if (connection) connection.release();
  }
});

router.get('/plano-familiar/lista/:id_crianca', authMiddleware, async (req: AuthRequest, res: Response) => {
  const lang = getLanguage(req as any); // Detecta idioma
  const templates = i18nEmails[lang];
  const { id_crianca } = req.params;
  const usuario_id = req.user?.id;

  try {
    // const [rows]: any = await poolPromise.query(
    //   'SELECT id_plano, criado_em, dados_formulario FROM fs_plano_familiar WHERE id_crianca = ? AND usuario_id = ? ORDER BY criado_em ASC',
    //   [id_crianca, usuario_id]
    // );
    const { rows } = await poolPromise.query(
      'SELECT id_plano, criado_em, dados_formulario FROM fs_plano_familiar WHERE id_crianca = $1 AND usuario_id = $2 ORDER BY criado_em ASC',
      [id_crianca, usuario_id]
    );
    res.json(rows);
  } catch (error: any) {
    console.error('Erro ao buscar histórico de PIFs:', error);
    res.status(500).json({ erro: templates.serverError });
  }
});

router.post('/contato', async (req: Request, res: Response) => {
  const { name, email, subject, message } = req.body;

  // SPRINT 0: validação mínima e escape de HTML (antes, o conteúdo era injetado cru no
  // corpo HTML do e-mail). O rate limit desta rota é aplicado no index.ts.
  if (!name || !email || !message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Preencha nome, e-mail e mensagem.' });
  }
  if (String(message).length > 5000 || String(name).length > 200 || String(subject || '').length > 200) {
    return res.status(400).json({ error: 'Mensagem muito longa.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }

  const nomeLimpo = String(name).replace(/[\r\n"<>]/g, ' ').trim();
  const assuntoLimpo = String(subject || 'Sem assunto').replace(/[\r\n]/g, ' ').trim();

  try {
    const mailOptions = {
      from: `"${nomeLimpo} (Via Site)" <${process.env.EMAIL_USER}>`, // Remetente autenticado para não cair no SPAM
      replyTo: String(email), // Quando você clicar em "Responder" no seu cliente de email, irá para o usuário
      to: 'contact@cognacare.com', // O destino final
      subject: `[Contato Cognacare] ${assuntoLimpo}`,
      text: `Nome: ${nomeLimpo}\nE-mail: ${email}\n\nMensagem:\n${message}`,
      html: `
        <h3>Novo Contato via Site Cognacare</h3>
        <p><strong>Nome:</strong> ${escaparHtml(nomeLimpo)}</p>
        <p><strong>E-mail:</strong> ${escaparHtml(email)}</p>
        <hr>
        <p><strong>Mensagem:</strong></p>
        <p>${escaparHtml(message).replace(/\n/g, '<br>')}</p>
      `
    };
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true, message: 'Mensagem enviada com sucesso.' });
  } catch (error: any) { res.status(500).json({ error: 'Erro ao processar o envio.' }); }
});

export default router;
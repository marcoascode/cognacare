//-----------------------------------------------------------------------------
import dotenv from 'dotenv';
// SPRINT 0: em produção as variáveis são injetadas pelo docker-compose (env_file);
// o .env.dev só é carregado fora de produção. dotenv nunca sobrescreve variáveis já definidas.
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env' : '.env.dev' });

// Falha rápida: sem JWT_SECRET qualquer token poderia ser forjado.
if (!process.env.JWT_SECRET) {
  console.error('❌ [BOOT] JWT_SECRET não definido. Abortando o arranque por segurança.');
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️ [BOOT] JWT_SECRET com menos de 32 caracteres. Recomenda-se um segredo mais longo.');
}
// console.log(`[start:api]ENV: ${process.env.NODE_ENV}`)
//-----------------------------------------------------------------------------
// --- LOGS DE DIAGNÓSTICO (IMPORTANTE) ---
console.log('------------------------------------------------');
console.log(`🚀 Iniciando Servidor em modo: ${process.env.NODE_ENV}`);
console.log('------------------------------------------------');
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as jwt from 'jsonwebtoken';
import cron from 'node-cron';
import path from 'path';

// =========================================================================
// IMPORTAÇÕES DOS CRON JOBS E SERVIÇOS (MIGRADO PARA IMPORT)
// =========================================================================
import processarExpiracoes from './cron/processarExpiracao';
import processarFechamentoDiario from './cron/fechamentoDiario';
import rodarDetetiveDePadroesJob from './cron/detetivePadroes'; 
import agentService from './services/agentService';
// --- MySQL ORIGINAL ---
// import poolPromise from './config/mysqlPoolPromise'; 

// --- POSTGRESQL CORRIGIDO ---
import poolPromise from './config/pgPoolPromise';
import { iniciarAgendamentos } from './queues/agentQueue';
import { verificarTokenAcesso } from './utils/jwtTokens';
import { migrate } from './migrate';

// =========================================================================
// IMPORTAÇÕES DAS ROTAS
// =========================================================================
import fsPagamentos from './routes/EFI/fspagamentos';
import agenteRoutes from './routes/agente/agenteRoutes';
import fernandasepeRoutes from './routes/fernandasepe/fernandasepe';
import rotinaVisualRoutes from './routes/fernandasepe/rotinaVisualRoutes';
import diarioRoutes from './routes/fernandasepe/diarioRoutes';
import adminRoutes from './routes/fernandasepe/adminRoutes';
import affiliateRoutes from './routes/fernandasepe/affiliateRoutes';
import agendaRoutes from './routes/fernandasepe/agendaRoutes';
import sosRoutes from './routes/fernandasepe/sosRoutes';
import stripeRoutes from './routes/Stripe/stripeRoutes';
import hotmartRoutes from './routes/hotmart/hotmart';
import chatbotRoutes from './routes/chatbot/chatbot';

// =========================================================================
// DECLARAÇÕES GLOBAIS DE TIPOS
// =========================================================================
declare global {
  var io: any;
}

declare module 'express-serve-static-core' {
  interface Request {
    rawBody?: Buffer;
  }
}

interface CustomSocket extends Socket {
  decoded?: any;
}

const app = express();
const server = http.createServer(app);

// --- Configuração de CORS ---
const allowedOrigins = [
  'https://pif.cognacare.com',
  'http://localhost:5000', 
  'http://localhost:5173', 
  'http://127.0.0.1:5173',
  'http://192.168.99.114:5000',
  'http://localhost',            // <--- ORIGEM DO CAPACITOR ANDROID
  'https://localhost',           // <--- Alternativa iOS
  'capacitor://localhost'        // <--- Alternativa Apps Híbridos
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// --- Middlewares ---
app.set('trust proxy', 1);
app.use(helmet());

// 1. LIMITADOR GERAL (Para navegação normal - 50 req / 1 min)
const generalLimiter = rateLimit({ 
    windowMs: 1 * 60 * 1000, 
    max: 50,
    message: { error: 'Muitas requisições ao servidor. Aguarde alguns minutos.' } as any,
    standardHeaders: true, 
    legacyHeaders: false,
});

// Aplica o limitador geral em TODAS as rotas
app.use(generalLimiter); 

// 2. LIMITADOR ESTRITO (Para Bots e Força Bruta - 5 req / 15 min, por IP)
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Muitas tentativas. Por medida de segurança, aguarde 15 minutos.' } as any,
    standardHeaders: true,
    legacyHeaders: false,
});

// Chave por usuário autenticado (cai para o IP quando não há token válido).
// Evita que famílias atrás do mesmo IP (NAT/4G) disputem o mesmo balde.
const chavePorUsuario = (req: Request): string => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (token) {
    try {
      const decoded: any = verificarTokenAcesso(token);
      if (decoded?.id) return `u:${decoded.id}`;
    } catch (e) { /* token inválido: usa o IP */ }
  }
  return `ip:${req.ip}`;
};

// 3. GERAÇÃO DE PIF: cada geração dura minutos e consome crédito → 5 / 15 min por usuário
const pifLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: chavePorUsuario,
    message: { error: 'Muitas gerações de PIF em sequência. Aguarde alguns minutos.' } as any,
    standardHeaders: true,
    legacyHeaders: false,
});

// 4. CHAT: 10 mensagens / minuto por usuário (o saldo de mensagens já limita o volume)
const chatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    keyGenerator: chavePorUsuario,
    message: { error: 'Você está enviando mensagens muito rápido. Aguarde um instante.' } as any,
    standardHeaders: true,
    legacyHeaders: false,
});

// APLICANDO OS LIMITES NAS ROTAS SENSÍVEIS
// IMPORTANTE: Isso precisa vir ANTES do app.use(express.json()) e das definições de rotas.
// SPRINT 0: antes, app.use('/fernandasepe/plano-familiar') e app.use('/chat') limitavam
// TAMBÉM as rotas de leitura (listagem, download, rascunho, histórico) a 5 req/15 min.
app.use('/fernandasepe/login', strictLimiter);
app.use('/fernandasepe/cadastro', strictLimiter);
app.use('/fernandasepe/forgot-password', strictLimiter);
app.use('/fernandasepe/resend-verification', strictLimiter);
app.use('/fernandasepe/contato', strictLimiter);
app.post('/fernandasepe/plano-familiar', pifLimiter);
app.post('/chat', chatLimiter);

app.use(express.json({
  verify: (req: Request, res: Response, buf: Buffer) => {
    // Se a URL for do webhook, salva o buffer bruto em req.rawBody
    if (req.originalUrl.includes('/webhook')) {
      req.rawBody = buf;
    }
  }
}));

app.use(express.urlencoded({ extended: true }));

// Servir publicamente APENAS as fotos de perfil (UUID.webp gerado por processarImagemSegura).
// SPRINT 0: qualquer outro arquivo (relatórios, histórias sociais, documentos) não é
// servido estaticamente — dados clínicos não podem ficar acessíveis sem autenticação.
const FOTO_PERFIL_REGEX = /^\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i;
app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
  if (!FOTO_PERFIL_REGEX.test(req.path)) return res.status(404).end();
  next();
}, express.static('/app/uploads', { index: false, dotfiles: 'deny' }));

// --- Configuração do WebSocket ---
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// =========================================================================
// 2. TORNAR O SOCKET GLOBAL (Para o Agente Autônomo emitir alertas)
// =========================================================================
global.io = io;

io.use((socket: CustomSocket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error: Token not provided'));
  
  try {
    socket.decoded = verificarTokenAcesso(token);
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket: CustomSocket) => {
  // =========================================================================
  // 3. REGISTO AUTOMÁTICO NA SALA MULTI-PERFIL (Baseado no JWT decodificado)
  // =========================================================================
  const usuarioId = socket.decoded?.id;
  if (usuarioId) {
      socket.join(`user_${usuarioId}`);
      console.log(`📡 [Socket.io] Utilizador ${usuarioId} ligado e alocado na sala de alertas.`);
  }

  // SPRINT 0: o evento 'joinUserRoom' foi removido. Ele permitia que QUALQUER cliente
  // entrasse na sala de outro usuário informando apenas o e-mail. A sala do usuário
  // é definida exclusivamente pelo JWT (user_<id>) acima.
});

// --- Rotas ---
// REGISTO DA NOVA ROTA DO AGENTE AUTÔNOMO (Para o Sininho de Notificações)
app.use('/fernandasepe/agente', agenteRoutes);

app.use('/fernandasepe', fernandasepeRoutes);
app.use('/fernandasepe', rotinaVisualRoutes);
app.use('/fernandasepe/diario', diarioRoutes);
app.use('/fernandasepe/admin', adminRoutes);
app.use('/fernandasepe/parceiro', affiliateRoutes);
app.use('/fernandasepe/agenda', agendaRoutes);
app.use('/fernandasepe', sosRoutes);
app.use('/fernandasepe', fsPagamentos(io));
app.use('/stripe', stripeRoutes);
app.use('/hotmart', hotmartRoutes);
app.use('/chat', chatbotRoutes);

// --- Healthcheck ---
app.get('/', (req: Request, res: Response) => {
    res.status(200).send('Servidor PIF no ar.');
});
app.get('/health', (req: Request, res: Response) => {
    res.status(200).send('OK');
});

// --- Error Handler ---
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Erro no servidor:', err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// --- CRON JOBS ---
// Agendar para rodar todos os dias à meia-noite e dez (00:10)
cron.schedule('10 0 * * *', () => {
  console.log('🕒 Executando Cron Job: Processar Expirações...');
  processarExpiracoes();
  console.log('🕒 Cron Job Executado com sucesso!');
});

// COGNACARE AGENT
// Fechamento Diário do Cognacare Agent (23:59 todos os dias)
cron.schedule('59 23 * * *', () => {
  console.log('🕒 Executando Cron Job: Fechamento Diário de Bordo...');
  processarFechamentoDiario();
});

// Detetive de Padrões (03:00 todos os dias, fatiado por id_crianca % 7)
// SPRINT 0: antes havia DOIS jobs no domingo às 03:00 — um enfileirado (que nunca
// executava, pois o nome do job não batia com o worker) e uma varredura síncrona de
// todas as crianças dentro do processo da API. Agora há um único fluxo: o cron
// distribui as crianças pelos 7 dias da semana e o worker BullMQ processa em fila.
// Cada criança continua sendo analisada uma vez por semana.
cron.schedule('0 3 * * *', () => {
  console.log('🕒 Disparando Detetive de Padrões (fatia do dia)...');
  rodarDetetiveDePadroesJob();
});

// =========================================================================
// 4. ARRANQUE DO MOTOR AUTÓNOMO (BullMQ)
// =========================================================================
iniciarAgendamentos().catch((err: any) => {
    console.error('❌ Falha ao iniciar as filas do Agente Autônomo:', err);
});

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 5000;

// Aplica as migrations pendentes (server/migrations/*.sql) ANTES de aceitar requisições.
// Se uma migration falhar, o servidor não sobe: rodar com schema inconsistente é pior que parar.
migrate()
  .then(() => {
    server.listen(Number(PORT), HOST, () => {
      console.log(`✅ Servidor ouvindo na porta ${PORT}`);
    });
  })
  .catch((err: any) => {
    console.error('❌ [BOOT] Falha ao aplicar migrations. Servidor não iniciado.', err);
    process.exit(1);
  });
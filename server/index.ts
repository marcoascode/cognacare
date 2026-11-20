//-----------------------------------------------------------------------------
import dotenv from 'dotenv';
// dotenv.config({ path: '.env' }); // USAR APENAS PARA PRODUÇÃO!
dotenv.config({ path: '.env.dev' }); // USAR APENAS PARA DEV!
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

// 2. LIMITADOR ESTRITO (Para Bots e Força Bruta - 5 req / 15 min)
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Muitas tentativas. Por medida de segurança, aguarde 15 minutos.' } as any,
    standardHeaders: true,
    legacyHeaders: false,
});

// 3. APLICANDO O LIMITE ESTRITO NAS ROTAS SENSÍVEIS
// IMPORTANTE: Isso precisa vir ANTES do app.use(express.json()) e das definições de rotas.
app.use('/fernandasepe/login', strictLimiter);
app.use('/fernandasepe/cadastro', strictLimiter);
app.use('/fernandasepe/forgot-password', strictLimiter);
app.use('/fernandasepe/plano-familiar', strictLimiter); 
app.use('/chat', strictLimiter);

app.use(express.json({
  verify: (req: Request, res: Response, buf: Buffer) => {
    // Se a URL for do webhook, salva o buffer bruto em req.rawBody
    if (req.originalUrl.includes('/webhook')) {
      req.rawBody = buf;
    }
  }
}));

app.use(express.urlencoded({ extended: true }));

// Servir os arquivos estáticos, expondo a pasta uploads publicamente.
app.use('/uploads', express.static('/app/uploads'));

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
  
  jwt.verify(token, process.env.JWT_SECRET as string, (err: any, decoded: any) => {
    if (err) return next(new Error('Authentication error: Invalid token'));
    socket.decoded = decoded; 
    next();
  });
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

  // Mantém a compatibilidade com partes antigas do seu código
  socket.on('joinUserRoom', (data: { email: string }) => {
      if (data.email) socket.join(`user:${data.email}`);
  });
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

// Detetive de Padrões Fatiado (Domingo às 03:00)
cron.schedule('0 3 * * 0', () => {
  console.log('🕒 Disparando Detetive de Padrões (Semanal)...');
  rodarDetetiveDePadroesJob();
});

// Varredura Semanal Completa (Domingo às 03:00)
cron.schedule('0 3 * * 0', async () => {
    console.log('⏰ Iniciando Job Semanal do Detetive de Padrões...');
    try {
        // CORREÇÃO TS2488: O "any" blinda o TypeScript contra o erro de iteração do MySQL2
        // --- MySQL ORIGINAL ---
        // const [criancas]: any = await poolPromise.query(`
        //     SELECT c.id_crianca 
        //     FROM fs_crianca c
        //     JOIN fs_usuarios u ON c.usuario_id = u.id
        //     WHERE u.is_agent_active = 1
        // `);

        // --- POSTGRESQL CORRIGIDO ---
        const { rows: criancas } = await poolPromise.query(`
            SELECT c.id_crianca 
            FROM fs_crianca c
            JOIN fs_usuarios u ON c.usuario_id = u.id
            WHERE u.is_agent_active = 1
        `);

        // Processa uma criança de cada vez para não sobrecarregar a API da IA
        for (const c of criancas) {
            await agentService.rodarDetetiveDePadroes(c.id_crianca);
        }
        
        console.log('✅ Job Semanal Concluído!');
    } catch (error) {
        console.error('Erro no Job Semanal:', error);
    }
});

// =========================================================================
// 4. ARRANQUE DO MOTOR AUTÓNOMO (BullMQ)
// =========================================================================
iniciarAgendamentos().catch((err: any) => {
    console.error('❌ Falha ao iniciar as filas do Agente Autônomo:', err);
});

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 5000;

server.listen(Number(PORT), HOST, () => {
    console.log(`✅ Servidor ouvindo na porta ${PORT}`);
});
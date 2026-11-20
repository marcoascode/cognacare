import cors from 'cors';
// import pool from '../config/mysqlPoolPromise';
import pool from '../config/pgPoolPromise';

// --- INTERFACES ---
interface IWhitelistRow {
  url: string;
}

// Configuração do cache
let whitelistCache: string[] | null = null;
let lastFetched: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos em milissegundos

/**
 * Busca a lista de origens permitidas, utilizando um cache com tempo de expiração.
 */
const getWhitelist = async (): Promise<string[]> => {
  const now = Date.now();
  
  // Usa o cache se ele existir E não estiver expirado
  if (whitelistCache && (now - lastFetched < CACHE_DURATION)) {
    return whitelistCache;
  }

  try {
    console.log('Atualizando cache da whitelist a partir da base de dados...');
    
    // Utilizamos diretamente o execute do pool (faz o handle automático da conexão/release)
    // const [results]: any = await pool.execute('SELECT url FROM whitelist');
    // const dbOrigins = (results as IWhitelistRow[]).map(row => row.url);
    // Utilizamos diretamente a query da pool (faz o handle automático da conexão/release)
    const { rows } = await pool.query('SELECT url FROM whitelist');
    const dbOrigins = (rows as IWhitelistRow[]).map(row => row.url);

    // Define as origens padrão com base no ambiente
    const defaultOrigins = process.env.NODE_ENV === 'development'
      ? ['http://localhost:5000'] // Adicione outras origens de dev aqui se precisar
      : ['https://pif.cognacare.com'];

    // Combina as origens padrão com as do banco e remove duplicatas
    whitelistCache = [...new Set([...defaultOrigins, ...dbOrigins])];
    lastFetched = now; // Atualiza o timestamp do cache
    
    return whitelistCache;
  } catch (error) {
    console.error('ERRO CRÍTICO ao obter a whitelist da base de dados. Usando origens padrão como fallback.', error);
    // Em caso de falha, retorna apenas as origens padrão para manter o sistema a funcionar
    return process.env.NODE_ENV === 'development'
      ? ['http://localhost:5000']
      : ['https://pif.cognacare.com'];
  }
}

// Inicializa o cache assim que o módulo é carregado
getWhitelist();

const corsMiddleware = cors({
  /**
   * Função de origem dinâmica que valida o request contra a whitelist.
   */
  origin: async (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // 'origin' é undefined para requisições same-origin ou de servidor (ex: Postman)
    if (!origin) {
      return callback(null, true);
    }

    try {
      const whitelist = await getWhitelist();
      if (whitelist.includes(origin)) {
        callback(null, true); // Permite a origem
      } else {
        console.error('Origem não permitida por CORS:', origin);
        callback(new Error('Não permitido por CORS')); // Bloqueia a origem
      }
    } catch (err) {
      console.error('Erro ao processar a checagem de CORS:', err);
      callback(new Error('Erro na configuração de CORS'));
    }
  },
  credentials: true,
  methods: 'GET,POST,OPTIONS,PUT,DELETE,HEAD,PATCH',
  allowedHeaders: [
    'Accept',
    'Accept-Language',
    'Authorization',
    'Cache-Control',
    'Content-Language',
    'Content-Type',
    'Origin',
    'Pragma',
    'Special-Request-Header',
    'X-Auth-Token',
    'X-CSRF-Token',
    'X-PINGOTHER',
    'X-Requested-With',
  ],
});

export default corsMiddleware;
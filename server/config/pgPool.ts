import * as dotenv from 'dotenv';
dotenv.config(); // Carrega um arquivo .env padrão se não houver correspondência
//-----------------------------------------------------------------------------
import { Pool } from 'pg';

// Configuração do banco de dados PostgreSQL
const pool = new Pool({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT) || 5432, 
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  max: 10, // Equivalente ao connectionLimit do MySQL
  idleTimeoutMillis: 30000, 
  connectionTimeoutMillis: 20000, // 20 segundos para timeout de ligação
});

// Listener de segurança recomendado para evitar que erros na Pool derrubem o servidor
pool.on('error', (err, client) => {
  console.error('Erro inesperado no cliente PostgreSQL', err);
});

export default pool;
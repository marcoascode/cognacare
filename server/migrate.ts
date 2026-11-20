/**
 * Aplica migrations/*.sql em ordem alfabética, uma vez cada (tabela schema_migrations).
 * Roda no boot do servidor (index.ts) e via `npm run migrate` (ou `npm run migrate:dev`).
 *
 * Convenções:
 * - Arquivos em server/migrations/ com prefixo numérico: 001_xxx.sql, 002_yyy.sql ...
 * - Cada arquivo roda numa transação; se falhar, nada dele é aplicado.
 * - Nunca edite um arquivo já aplicado: crie uma nova migration.
 * - Scripts de reversão ficam em migrations/down/ e são executados manualmente
 *   (não são lidos por este runner, que só olha o nível superior da pasta).
 * - Não use comandos que não rodam dentro de transação (ex.: CREATE INDEX CONCURRENTLY).
 */
import fs from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';

// Mesmo critério do index.ts: .env.dev fora de produção. Não sobrescreve variáveis já definidas.
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env' : '.env.dev' });

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pool: import('pg').Pool = require('./config/pgPoolPromise').default;

const LOCK_ID = 727001; // evita duas instâncias migrando juntas

/**
 * Localiza a pasta migrations tanto ao rodar o .ts (tsx: __dirname = server/)
 * quanto o compilado (node: __dirname = server/dist/server/).
 */
function resolverPastaMigrations(): string {
    const candidatas = [
        path.resolve(__dirname, 'migrations'),
        path.resolve(__dirname, '..', '..', 'migrations'),
    ];
    const encontrada = candidatas.find((p) => fs.existsSync(p));
    if (!encontrada) throw new Error(`[migrate] pasta migrations não encontrada em: ${candidatas.join(', ')}`);
    return encontrada;
}

export async function migrate(): Promise<void> {
    const DIR = resolverPastaMigrations();
    const c = await pool.connect();
    try {
        await c.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
        await c.query(
            'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())'
        );
        const done = new Set(
            (await c.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((r) => r.name)
        );
        const files = (await readdir(DIR)).filter((f) => f.endsWith('.sql')).sort();

        let aplicadas = 0;
        for (const f of files) {
            if (done.has(f)) continue;
            const sql = await readFile(path.join(DIR, f), 'utf8');
            await c.query('BEGIN');
            try {
                await c.query(sql);
                await c.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
                await c.query('COMMIT');
                aplicadas++;
                console.log(`[migrate] aplicada ${f}`);
            } catch (e) {
                await c.query('ROLLBACK');
                throw new Error(`[migrate] falhou em ${f}: ${(e as Error).message}`);
            }
        }
        console.log(aplicadas === 0 ? '[migrate] banco já está atualizado.' : `[migrate] ${aplicadas} migration(s) aplicada(s).`);
    } finally {
        await c.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
        c.release();
    }
}

// Execução direta: `npm run migrate` / `npm run migrate:dev`
if (require.main === module) {
    migrate()
        .then(() => pool.end())
        .catch((e) => {
            console.error(e);
            process.exit(1);
        });
}

-- =============================================================================
-- Reverte migrations/001_fs_prompts_correcoes.sql a partir do backup criado nela.
-- Execução MANUAL (o migrate.ts não lê esta pasta):
--   psql -v ON_ERROR_STOP=1 -1 -f migrations/down/001_fs_prompts_correcoes.down.sql
-- Depois, para permitir reaplicar:  DELETE FROM schema_migrations WHERE name = '001_fs_prompts_correcoes.sql';
-- =============================================================================
UPDATE fs_prompts p
SET texto_prompt = b.texto_prompt,
    modelo       = b.modelo
FROM fs_prompts_backup_sprint0 b
WHERE p.chave = b.chave
  AND p.chave IN ('agent_relatorio_pedagogico', 'agent_reposicao_terapia', 'agent_job_padroes');

-- Opcional, após confirmar a reversão:
-- DROP TABLE fs_prompts_backup_sprint0;

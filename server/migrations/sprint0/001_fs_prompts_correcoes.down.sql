-- =============================================================================
-- Sprint 0 — Reverte 001_fs_prompts_correcoes.up.sql a partir do backup criado nele.
-- Executar: psql -v ON_ERROR_STOP=1 -1 -f <arquivo>
-- =============================================================================
UPDATE fs_prompts p
SET texto_prompt = b.texto_prompt,
    modelo       = b.modelo
FROM fs_prompts_backup_sprint0 b
WHERE p.chave = b.chave
  AND p.chave IN ('agent_relatorio_pedagogico', 'agent_reposicao_terapia', 'agent_job_padroes');

-- Opcional, após confirmar a reversão:
-- DROP TABLE fs_prompts_backup_sprint0;

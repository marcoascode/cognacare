-- =============================================================================
-- Sprint 0 — Correções mecânicas em fs_prompts (sem alteração de conteúdo clínico)
-- Aplicada automaticamente pelo migrate.ts (boot ou `npm run migrate`), em transação.
-- Idempotente. Reversão manual: migrations/down/001_fs_prompts_correcoes.down.sql
-- =============================================================================

-- Backup integral da tabela antes da alteração (permite comparar/restaurar).
CREATE TABLE IF NOT EXISTS fs_prompts_backup_sprint0 AS TABLE fs_prompts;

-- 1) agent_relatorio_pedagogico
--    a) Chaves JSON com espaços acidentais ("resumo_IA_ acolhedor" etc.). O código lia
--       "resumo_IA_acolhedor" e gravava NULL em fs_relatorios_gerados.resumo_ia.
--    b) Modelo claude-3-5-sonnet-20241022 foi APOSENTADO pela Anthropic em 28/10/2025
--       (toda chamada retorna erro). Migrado para o mesmo modelo dos demais prompts Claude.
UPDATE fs_prompts
SET texto_prompt = replace(replace(replace(texto_prompt,
        '"resumo_IA_ acolhedor"',      '"resumo_IA_acolhedor"'),
        '"analise_ ABA_ qualitativa"', '"analise_ABA_qualitativa"'),
        '"sugestoes_casa_ top_3"',     '"sugestoes_casa_top_3"'),
    modelo = 'claude-sonnet-4-6'
WHERE chave = 'agent_relatorio_pedagogico';

-- 2) agent_reposicao_terapia — mesmo modelo aposentado.
UPDATE fs_prompts
SET modelo = 'claude-sonnet-4-6'
WHERE chave = 'agent_reposicao_terapia' AND modelo = 'claude-3-5-sonnet-20241022';

-- 3) agent_job_padroes — o exemplo de saída continha um comentário "//" dentro do JSON,
--    o que induz o modelo a devolver JSON inválido.
UPDATE fs_prompts
SET texto_prompt = replace(texto_prompt,
        '"precisao_confianca": "alta" // ou "media", "baixa"',
        '"precisao_confianca": "alta | media | baixa"')
WHERE chave = 'agent_job_padroes';

-- Conferência
SELECT chave, modelo, temperatura, max_tokens FROM fs_prompts
WHERE chave IN ('agent_relatorio_pedagogico', 'agent_reposicao_terapia', 'agent_job_padroes');

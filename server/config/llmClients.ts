import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// =========================================================================
// CLIENTES LLM CENTRALIZADOS
// Única fonte de instâncias de Anthropic, xAI (Grok) e OpenAI (embeddings).
// =========================================================================

// --- xAI / Grok ---
// Antes, o Grok era chamado com OPENAI_API_KEY apontando para api.x.ai, o que
// mistura credenciais de dois provedores distintos. A chave correta é GROK_API_KEY
// (ou XAI_API_KEY). O fallback para OPENAI_API_KEY existe APENAS para não causar
// downtime até que a nova variável seja definida no .env de produção.
const grokApiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;
if (!grokApiKey && process.env.OPENAI_API_KEY) {
    console.warn('⚠️ [LLM] GROK_API_KEY não definida. Usando OPENAI_API_KEY como chave do xAI (legado). Defina GROK_API_KEY no .env.');
}

export const grokClient = new OpenAI({
    apiKey: grokApiKey || process.env.OPENAI_API_KEY,
    baseURL: 'https://api.x.ai/v1',
});

// --- Anthropic ---
export const anthropicClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

/** Indica se o modelo configurado em fs_prompts deve ser roteado para o xAI. */
export const isGrokModel = (modelo: string | null | undefined): boolean =>
    !!modelo && modelo.toLowerCase().startsWith('grok');

/** Indica se o modelo configurado em fs_prompts deve ser roteado para a Anthropic. */
export const isClaudeModel = (modelo: string | null | undefined): boolean =>
    !!modelo && modelo.toLowerCase().startsWith('claude');

/**
 * Converte a temperatura vinda do banco (pode ser NULL/string) num número válido
 * ou undefined. Enviar NaN/null para as APIs causa erro 400.
 */
export const parseTemperatura = (valor: unknown): number | undefined => {
    if (valor === null || valor === undefined || valor === '') return undefined;
    const n = parseFloat(String(valor));
    return Number.isFinite(n) ? n : undefined;
};

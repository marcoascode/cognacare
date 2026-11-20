import { Anthropic } from '@anthropic-ai/sdk';
// Importações futuras para as suas outras APIs:
// import OpenAI from 'openai';

// Inicializa o cliente da Anthropic (Claude)
export const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY as string, // O "as string" garante ao TS que a variável é válida
});

// Inicialização da OpenAI (Descomente quando precisar transferir a sua lógica de Embeddings para cá)
// export const openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY as string,
// });
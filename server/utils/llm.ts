import { anthropicClient, grokClient, isGrokModel, parseTemperatura } from '../config/llmClients';

// =========================================================================
// ROTEADOR MULTI-LLM (mínimo — Sprint 0)
// Despacha a chamada para o provedor correto de acordo com o modelo salvo em
// fs_prompts. Antes, todos os agentes chamavam a Anthropic diretamente, de modo
// que prompts configurados com "grok-4.3" falhavam sempre.
// =========================================================================

export interface ILlmImagem {
    base64: string;
    mimeType: string;
}

export interface ILlmRequest {
    model: string;
    max_tokens: number;
    temperature?: number | string | null;
    system?: string;
    prompt: string;
    imagem?: ILlmImagem;
}

export interface ILlmResponse {
    texto: string;
    usage: { prompt_tokens: number; completion_tokens: number };
    provedor: 'anthropic' | 'xai';
}

const MIME_IMAGEM_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function chamarLLM(req: ILlmRequest): Promise<ILlmResponse> {
    const temperature = parseTemperatura(req.temperature);

    if (req.imagem && !MIME_IMAGEM_PERMITIDOS.includes(req.imagem.mimeType)) {
        throw new Error(`Formato de imagem não suportado: ${req.imagem.mimeType}`);
    }

    if (isGrokModel(req.model)) {
        const userContent: any = req.imagem
            ? [
                { type: 'image_url', image_url: { url: `data:${req.imagem.mimeType};base64,${req.imagem.base64}` } },
                { type: 'text', text: req.prompt },
            ]
            : req.prompt;

        const messages: any[] = [];
        if (req.system) messages.push({ role: 'system', content: req.system });
        messages.push({ role: 'user', content: userContent });

        const resposta = await grokClient.chat.completions.create({
            model: req.model,
            max_tokens: req.max_tokens,
            ...(temperature !== undefined ? { temperature } : {}),
            messages,
        });

        return {
            texto: resposta.choices[0]?.message?.content || '',
            usage: {
                prompt_tokens: resposta.usage?.prompt_tokens || 0,
                completion_tokens: resposta.usage?.completion_tokens || 0,
            },
            provedor: 'xai',
        };
    }

    // Padrão: Anthropic (modelos claude-*)
    const content: any = req.imagem
        ? [
            { type: 'image', source: { type: 'base64', media_type: req.imagem.mimeType, data: req.imagem.base64 } },
            { type: 'text', text: req.prompt },
        ]
        : req.prompt;

    const resposta = await anthropicClient.messages.create({
        model: req.model,
        max_tokens: req.max_tokens,
        ...(temperature !== undefined ? { temperature } : {}),
        ...(req.system ? { system: req.system } : {}),
        messages: [{ role: 'user', content }],
    });

    if (resposta.stop_reason === 'refusal') {
        throw new Error('O modelo recusou a solicitação (stop_reason=refusal).');
    }

    const texto = resposta.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('');

    return {
        texto,
        usage: {
            prompt_tokens: resposta.usage?.input_tokens || 0,
            completion_tokens: resposta.usage?.output_tokens || 0,
        },
        provedor: 'anthropic',
    };
}

/**
 * Extrai um objeto/array JSON de uma resposta de LLM de forma tolerante:
 * remove cercas ```json, recorta do primeiro '{' (ou '[') ao último '}' (ou ']')
 * e normaliza chaves com espaços acidentais (ex.: "sugestoes_casa_ top_3").
 * Lança erro se não houver JSON válido. A validação de schema (Zod) chega no Sprint 3.
 */
export function extrairJSON<T = any>(texto: string): T {
    if (!texto || typeof texto !== 'string') throw new Error('Resposta vazia da IA.');

    let limpo = texto.replace(/```json/gi, '').replace(/```/g, '').trim();

    const iObj = limpo.indexOf('{');
    const iArr = limpo.indexOf('[');
    const usarArray = iArr !== -1 && (iObj === -1 || iArr < iObj);
    const inicio = usarArray ? iArr : iObj;
    const fim = usarArray ? limpo.lastIndexOf(']') : limpo.lastIndexOf('}');

    if (inicio === -1 || fim === -1 || fim < inicio) {
        throw new Error('A IA não retornou um JSON válido.');
    }

    limpo = limpo.substring(inicio, fim + 1);
    const parsed = JSON.parse(limpo);
    return normalizarChaves(parsed) as T;
}

function normalizarChaves(valor: any): any {
    if (Array.isArray(valor)) return valor.map(normalizarChaves);
    if (valor && typeof valor === 'object') {
        const saida: Record<string, any> = {};
        for (const [k, v] of Object.entries(valor)) {
            saida[k.replace(/\s+/g, '')] = normalizarChaves(v);
        }
        return saida;
    }
    return valor;
}

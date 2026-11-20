// --- MySQL ORIGINAL ---
// import poolPromise from '../config/mysqlPoolPromise';

// --- POSTGRESQL CORRIGIDO ---
import poolPromise from '../config/pgPoolPromise';

// --- INTERFACES ---
export interface IUsageDetails {
    cached_tokens?: number;
    [key: string]: any; // Permite propriedades adicionais futuras da API
}

export interface IUsage {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: IUsageDetails;
    [key: string]: any;
}

interface IApiPrecosRow {
    input_price: number | string;
    cached_input_price: number | string;
    output_price: number | string;
}

/**
 * Busca os preços na base de dados e calcula o custo exato da requisição com suporte a Cache de Contexto
 * @param modelo O nome do modelo utilizado
 * @param usage O objeto 'usage' devolvido pela API (Grok, Claude, OpenAI)
 */
export default async function calcularCustoIA(modelo: string, usage: IUsage): Promise<number> {
    try {
        // Busca os preços do modelo específico na base de dados
        // --- MySQL ORIGINAL ---
        // const [rows]: any = await poolPromise.query('SELECT * FROM fs_api_precos WHERE modelo = ?', [modelo]);

        // --- POSTGRESQL CORRIGIDO ---
        const { rows } = await poolPromise.query('SELECT * FROM fs_api_precos WHERE modelo = $1', [modelo]);

        let precos: IApiPrecosRow;

        if (rows.length > 0) {
            precos = rows[0] as IApiPrecosRow;
        } else {
            // Se o modelo não for encontrado, usa a linha 'default' por segurança
            // --- MySQL ORIGINAL ---
            // const [defaultRows]: any = await poolPromise.query('SELECT * FROM fs_api_precos WHERE modelo = "default"');

            // --- POSTGRESQL CORRIGIDO ---
            // Atenção: PostgreSQL exige aspas simples ('') para strings literais. Aspas duplas ("") são para nomes de colunas.
            const { rows: defaultRows } = await poolPromise.query("SELECT * FROM fs_api_precos WHERE modelo = 'default'");
            precos = defaultRows[0] || { input_price: 0.20, cached_input_price: 0.05, output_price: 0.50 };
        }

        const promptTokens = usage.prompt_tokens || 0;
        const completionTokens = usage.completion_tokens || 0;

        // Verifica se a API devolveu tokens cacheados
        const cachedTokens = (usage.prompt_tokens_details && usage.prompt_tokens_details.cached_tokens)
            ? usage.prompt_tokens_details.cached_tokens
            : 0;

        const uncachedTokens = promptTokens - cachedTokens;

        // Converte com segurança para Float (mesmo se o Postgres retornar numérico como string)
        const inputPrice = parseFloat(String(precos.input_price));
        const cachedInputPrice = parseFloat(String(precos.cached_input_price));
        const outputPrice = parseFloat(String(precos.output_price));

        // Divide por 1 milhão para encontrar o valor fracionário do token
        const custoUncachedInput = (inputPrice / 1000000) * uncachedTokens;
        const custoCachedInput = (cachedInputPrice / 1000000) * cachedTokens;
        const custoOutput = (outputPrice / 1000000) * completionTokens;

        return custoUncachedInput + custoCachedInput + custoOutput;

    } catch (error: any) {
        console.error('Erro ao calcular custo da IA via Banco de Dados:', error);
        return 0; // Em caso de falha de conexão, retorna 0 para não interromper a aplicação principal
    }
}
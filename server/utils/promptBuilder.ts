// --- MySQL ORIGINAL ---
// import poolPromise from '../config/mysqlPoolPromise';

// --- POSTGRESQL CORRIGIDO ---
import poolPromise from '../config/pgPoolPromise';

// --- INTERFACES ---
export interface IConfigIA {
    modelo: string;
    temperatura: number | string | null;
    max_tokens: number | string | null;
    repetition_penalty: number | string | null;
    [key: string]: any;
}

/**
 * Constrói um prompt dinâmico substituindo os marcadores {{variavel}} pelos valores reais.
 * @param chave - A chave única do prompt na base de dados (ex: 'pif_gerador').
 * @param variaveis - Um objeto com as chaves e os respetivos valores para substituição.
 * @returns O texto do prompt final, formatado e pronto para a IA.
 */
export async function construirPrompt(chave: string, variaveis: Record<string, any>): Promise<string> {
    try {
        // --- MySQL ORIGINAL ---
        // const [rows]: any = await poolPromise.query("SELECT texto_prompt FROM fs_prompts WHERE chave = ?", [chave]);
        
        // --- POSTGRESQL CORRIGIDO ---
        const { rows } = await poolPromise.query("SELECT texto_prompt FROM fs_prompts WHERE chave = $1", [chave]);
        
        if (!rows || rows.length === 0) {
            throw new Error(`[ERRO CRÍTICO] O prompt com a chave '${chave}' não foi encontrado na base de dados fs_prompts.`);
        }

        let promptFinal: string = rows[0].texto_prompt;

        // Substitui iterativamente todos os marcadores {{chave}} pelo valor correspondente
        for (const [key, value] of Object.entries(variaveis)) {
            // A flag 'g' garante que todas as ocorrências da mesma variável sejam substituídas
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            
            // Tratamento de segurança: se vier null ou undefined, coloca 'Não informado'
            // O 'String(value)' garante que números e booleanos sejam convertidos corretamente para o replace
            const valorSeguro = (value !== undefined && value !== null && value !== '') ? String(value) : 'Não informado';
            
            promptFinal = promptFinal.replace(regex, valorSeguro);
        }

        // Limpeza: remove qualquer marcador {{...}} que tenha ficado no texto
        // caso o frontend não tenha enviado a variável correspondente.
        promptFinal = promptFinal.replace(/\{\{.*?\}\}/g, 'Não informado');

        return promptFinal;

    } catch (error: any) {
        console.error(`Erro na construção do prompt '${chave}':`, error);
        throw error; // Lança o erro para que a rota que chamou possa devolver um 500 ao cliente
    }
}

/**
 * Busca as configurações da IA na base de dados
 * @param chave - A chave única do prompt na base de dados
 */
export async function obterConfigIA(chave: string): Promise<IConfigIA | null> {
    try {
        // --- MySQL ORIGINAL ---
        // const [rows]: any = await poolPromise.query(
        //     "SELECT modelo, temperatura, max_tokens, repetition_penalty FROM fs_prompts WHERE chave = ?", 
        //     [chave]
        // );

        // --- POSTGRESQL CORRIGIDO ---
        const { rows } = await poolPromise.query(
            "SELECT modelo, temperatura, max_tokens, repetition_penalty FROM fs_prompts WHERE chave = $1", 
            [chave]
        );
        
        if (!rows || rows.length === 0) return null;
        
        return rows[0] as IConfigIA;
    } catch (error: any) {
        console.error(`Erro ao buscar config da IA '${chave}':`, error);
        return null;
    }
}
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import * as dotenv from 'dotenv';

dotenv.config();

// --- INTERFACES ---
export interface IMemoryMatch {
    content: string;
    score?: number;
    date: string;
}

interface IMetadata extends Record<string, any> {
    childId?: string;
    content?: string;
    timestamp?: string;
}

// Inicialização dos Clientes
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY as string,
});

const indexName = process.env.PINECONE_INDEX_NAME as string;

const memoryService = {
    /**
     * Transforma texto num vetor numérico (Embedding)
     */
    async generateEmbedding(text: string): Promise<number[]> {
        try {
            const response = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: text,
                encoding_format: "float",
            });
            return response.data[0].embedding;
        } catch (error) {
            console.error("[Memory Service] Erro ao gerar embedding:", error);
            throw error;
        }
    },

    /**
     * Salva uma nova memória no Pinecone vinculada a uma criança
     * @param childId - Identificador único da criança
     * @param text - Texto a ser memorizado pelo Agente
     * @param metadata - Objeto com informações auxiliares (ex: tipo_memoria, data)
     * @param customId - Se fornecido, sobrescreve a memória existente (Evita duplicidade)
     */
    async storeMemory(
        childId: string | number, 
        text: string, 
        metadata: Record<string, any> = {}, 
        customId: string | null = null
    ): Promise<boolean> {
        try {
            const vector = await this.generateEmbedding(text);
            const index = pc.index(indexName);

            // Se um customId for fornecido, usa-o, caso contrário gera um ID aleatório
            const recordId = customId ? String(customId) : `mem_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            const record = {
                id: recordId,
                values: vector,
                metadata: {
                    childId: String(childId),
                    content: text,
                    timestamp: new Date().toISOString(),
                    ...metadata
                }
            };

            // O "as any" aqui blinda o código contra os conflitos de tipagem do SDK do Pinecone
            await index.upsert([record] as any);

            return true;
        } catch (error) {
            console.error("[Memory Service] Erro ao salvar no Pinecone:", error);
            throw error;
        }
    },

    /**
     * Recupera as memórias mais relevantes para um determinado contexto
     */
    async retrieveRelevantMemories(
        childId: string | number, 
        query: string, 
        limit: number = 5
    ): Promise<IMemoryMatch[]> {
        try {
            const queryVector = await this.generateEmbedding(query);
            const index = pc.index(indexName);

            const queryResponse = await index.query({
                vector: queryVector,
                topK: limit,
                includeMetadata: true,
                // Filtro crucial: garante que o agente só veja dados daquela criança
                filter: {
                    childId: { "$eq": String(childId) }
                }
            });

            return queryResponse.matches.map(match => {
                const meta = match.metadata as IMetadata;
                return {
                    content: meta?.content || '',
                    score: match.score,
                    date: meta?.timestamp || new Date().toISOString()
                };
            });
        } catch (error) {
            console.error("[Memory Service] Erro ao buscar no Pinecone:", error);
            throw error;
        }
    }
};

export default memoryService;
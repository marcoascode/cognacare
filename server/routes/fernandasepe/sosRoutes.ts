import express, { Response } from 'express';
import OpenAI from 'openai';
import authMiddleware from '../../middleware/authMiddleware';

// --- MySQL ORIGINAL ---
// import poolPromise from '../../config/mysqlPoolPromise';

// --- POSTGRESQL CORRIGIDO ---
import poolPromise from '../../config/pgPoolPromise';

// Certifique-se de que o arquivo i18n também suporta as importações / exportações corretas
import { i18nEmails, getLanguage } from '../../utils/i18n';

const router = express.Router();

// --- INTERFACES ---
interface CustomRequest extends express.Request {
    user?: {
        id: number | string;
        [key: string]: any;
    };
}

interface ISOSRequestBody {
    id_crianca: number | string;
    tipo_crise: string;
    detalhes: string[];
    intensidade: number;
    contexto_local?: string;
    contexto_gatilho?: string;
}

interface ICriancaPerfil {
    nome: string;
    idade: string | number;
    diagnostico: string;
    hiperfoco: string;
    peso: string | number;
    altura: string | number;
    disturbio_alimentar: string;
    detalhes_disturbio: string;
    perfil_sensorial: string | string[];
    estrategias_regulacao: string;
    gatilhos_comuns: string;
}

const grokClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

// Mapeamento de perfis de crise para orientar a IA
const crisisPrompts: Record<string, string> = {
    'agressividade': 'está apresentando comportamento agressivo (batendo, chutando, jogando objetos)',
    'choro': 'está com choro incontrolável e desregulação emocional intensa (meltdown)',
    'autolesao': 'está se machucando (batendo cabeça, se mordendo) - PRIORIDADE MÁXIMA SEGURANÇA',
    'paralisia': 'entrou em shutdown (paralisia, não responde, isolamento súbito)',
    'fuga': 'está tentando fugir do ambiente (elopement)'
};

router.post('/sos', authMiddleware, async (req: CustomRequest, res: Response): Promise<any> => {
    const { 
        id_crianca, tipo_crise, detalhes, intensidade, contexto_local, contexto_gatilho 
    } = req.body as ISOSRequestBody;
    
    const lang = getLanguage(req);
    // Utiliza uma asserção de tipo genérica caso a estrutura do i18nEmails seja dinâmica
    const templates = (i18nEmails as any)[lang];

    try {
        // --- MySQL ORIGINAL ---
        // const [rows]: any = await poolPromise.query(
        //     `SELECT nome, idade, diagnostico, hiperfoco, 
        //      peso, altura, disturbio_alimentar, detalhes_disturbio,
        //      perfil_sensorial, estrategias_regulacao, gatilhos_comuns
        //      FROM fs_crianca WHERE id_crianca = ? AND usuario_id = ?`,
        //     [id_crianca, req.user?.id]
        // );

        // --- POSTGRESQL CORRIGIDO ---
        // BUSCA DADOS RICOS (Incluindo os novos campos de perfil)
        const { rows } = await poolPromise.query(
            `SELECT nome, idade, diagnostico, hiperfoco, 
             peso, altura, disturbio_alimentar, detalhes_disturbio,
             perfil_sensorial, estrategias_regulacao, gatilhos_comuns
             FROM fs_crianca WHERE id_crianca = $1 AND usuario_id = $2`,
            [id_crianca, req.user?.id]
        );

        if (rows.length === 0) return res.status(404).json({ erro: 'Criança não encontrada.' });
        const crianca = rows[0] as ICriancaPerfil;

        // Processa Perfil Sensorial (JSON para Texto)
        let sensorial = "Não informado";
        if (crianca.perfil_sensorial) {
             // Se for string JSON vinda do banco, faz parse, senão usa direto
             const perfil = typeof crianca.perfil_sensorial === 'string' ? JSON.parse(crianca.perfil_sensorial) : crianca.perfil_sensorial;
             if (Array.isArray(perfil)) sensorial = perfil.join(', ');
        }

        // Lógica Condicional para o Prompt
        let alertaContexto = "";
        if (contexto_local && (contexto_local.includes('Rua') || contexto_local.includes('Público'))) {
            alertaContexto = "ALERTA: A criança está em LUGAR PÚBLICO. A prioridade nº 1 é SEGURANÇA e sair do ambiente exposto. Ignore ensino de comportamento agora.";
        }
        if (contexto_local && contexto_local.includes('Carro')) {
            alertaContexto = "ALERTA: Criança dentro de VEÍCULO. Perigo extremo de acidente. Instrua parar o carro imediatamente em local seguro.";
        }
        
        // Novo User Prompt
        const userPrompt = `
        ${templates?.aiInstruction || ''}
        
        ATUE COMO SUPERVISOR ABA EM GESTÃO DE CRISE.
        
        PERFIL DA CRIANÇA (CRUCIAL):
        - Sensorial: ${sensorial} (Use isso! Se tiver aversão ao toque, NÃO sugira abraço/contenção. Se buscar pressão, SUGIRA).
        - O que acalma (Regulação): ${crianca.estrategias_regulacao || 'Não informado'} (Tente usar isso).
        - Porte Físico: ${crianca.peso || '?'}kg / ${crianca.altura || '?'}m.
        - Restrições Alimentares: ${crianca.disturbio_alimentar || 'Nenhuma'}.
        
        CONTEXTO DA CRISE ATUAL:
        - Onde: ${contexto_local || 'Não informado'}
        - Gatilho Imediato: ${contexto_gatilho || 'Não informado'}
        - Tipo: ${tipo_crise?.toUpperCase() || 'DESCONHECIDO'} (${(detalhes || []).join(', ')})
        - Intensidade: ${intensidade}/100
        
        ${alertaContexto}
        
        INSTRUÇÕES:
        Dê 3 passos táticos e imediatos.
        1. Se o gatilho foi "Sensorial" e o perfil diz "Hipersensibilidade", a instrução deve ser REMOVER O ESTIMULO (ex: sair do barulho).
        2. Se o gatilho foi "Item negado", instrua a NÃO CEDER O ITEM (para não reforçar), mas oferecer alternativa baseada no Hiperfoco (${crianca.hiperfoco || 'interesse da criança'}).
        3. Se estiver em público, foque em contenção de danos e privacidade.
        `;

        const completion = await grokClient.chat.completions.create({
            model: 'grok-4',
            messages: [{ role: 'user', content: userPrompt }],
            temperature: 0.1, // Zero criatividade, pura técnica
            max_tokens: 500
        });

        const instrucoes = completion.choices[0].message?.content || 'Não foi possível gerar instruções.';

        try {
            // --- MySQL ORIGINAL ---
            // await poolPromise.query(
            //     `INSERT INTO fs_sos_logs (usuario_id, crianca_id, tipo_crise, intensidade) VALUES (?, ?, ?, ?)`,
            //     [req.user?.id, id_crianca, tipo_crise, intensidade]
            // );

            // --- POSTGRESQL CORRIGIDO ---
            await poolPromise.query(
                `INSERT INTO fs_sos_logs (usuario_id, crianca_id, tipo_crise, intensidade) VALUES ($1, $2, $3, $4)`,
                [req.user?.id, id_crianca, tipo_crise, intensidade]
            );
        } catch (e) { 
            console.error("Erro ao logar SOS:", e); 
        }

        res.json({ success: true, instrucoes });

    } catch (error) {
        console.error('Erro SOS:', error);
        res.status(500).json({ erro: 'Erro ao processar SOS.' });
    }
});

export default router;
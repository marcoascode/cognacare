const axios = require('axios');
const Fuse = require('fuse.js');

// Armazenamento em memória (Cache)
const searchIndexes = {};

// Configuração do Fuse.js (AJUSTADA)
const fuseOptions = {
    includeScore: true,
    // CORREÇÃO: Como "achatamos" os dados, a chave agora é apenas 'keywords'
    keys: ['keywords'], 
    threshold: 0.4, // Aumentei um pouco a tolerância para achar mais resultados
    ignoreLocation: true,
    minMatchCharLength: 3
};

const loadDatabase = async (lang) => {
    // Se já carregou, não baixa de novo
    if (searchIndexes[lang]) return;

    console.log(`[ARASAAC] Baixando banco de dados completo para: ${lang}...`);
    try {
        // Endpoint que traz TODOS os pictogramas
        const response = await axios.get(`https://api.arasaac.org/api/pictograms/all/${lang}`);
        const data = response.data;

        // Limpeza e Preparação (Flattening)
        // Transformamos [{keyword: 'casa', type: 1}, ...] em ['casa', 'lar', ...]
        const processedData = data.map(item => ({
            id: item._id,
            keywords: item.keywords ? item.keywords.map(k => k.keyword) : [] 
        }));

        // Cria o índice de busca com os dados processados
        searchIndexes[lang] = new Fuse(processedData, fuseOptions);
        
        console.log(`[ARASAAC] Banco ${lang} indexado com sucesso (${processedData.length} itens).`);
    } catch (error) {
        console.error(`[ARASAAC] Erro ao baixar banco ${lang}:`, error.message);
        throw error; // Lança o erro para o controller saber que falhou
    }
};

const searchBestMatch = async (description, lang) => {
    try {
        // Garante que o banco está carregado
        if (!searchIndexes[lang]) {
            await loadDatabase(lang);
        }

        const fuse = searchIndexes[lang];
        
        // Remove pontuação e palavras irrelevantes simples para ajudar a busca
        const cleanDescription = description.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");

        console.log(`[ARASAAC] Buscando localmente por: "${cleanDescription}"`);
        
        // Realiza a busca local
        const results = fuse.search(cleanDescription);

        if (results.length > 0) {
            // Pega o melhor resultado (menor score = melhor match)
            const bestMatch = results[0].item;
            console.log(`[ARASAAC] Match encontrado: ID ${bestMatch.id} (Score: ${results[0].score})`);
            return `https://static.arasaac.org/pictograms/${bestMatch.id}/${bestMatch.id}_300.png`;
        }

        console.warn(`[ARASAAC] Sem resultados locais para: "${description}"`);
        return null;

    } catch (err) {
        console.error("[ARASAAC] Erro no serviço de busca:", err.message);
        return null;
    }
};

module.exports = { searchBestMatch };
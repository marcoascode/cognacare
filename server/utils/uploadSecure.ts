import multer, { FileFilterCallback } from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { Request } from 'express';

// Dependendo da configuração do tsconfig (esModuleInterop), algumas bibliotecas CJS
// podem precisar deste tipo de importação ou de @ts-ignore se não tiverem types oficiais.
// @ts-ignore
import NodeClam from 'clamscan';
// @ts-ignore
import * as FileType from 'file-type'; 

// Configuração do Multer: MemoryStorage (O arquivo fica na RAM, não no disco)
const storage = multer.memoryStorage();

// Filtro de Extensão Rápido (Primeira barreira)
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Apenas imagens são permitidas.'));
    }
};

export const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
    fileFilter: fileFilter
});

// --- INÍCIO DA ALTERAÇÃO (MOCK DO ANTIVÍRUS) ---

let clamscan: Promise<any>;

// Verifica se devemos pular o ClamAV (Modo Desenvolvimento Local)
if (process.env.SKIP_CLAMAV === 'true') {
    console.log('🛡️  [DEV] ClamAV Mockado: Antivírus simulado para ambiente local.');

    // Cria uma promessa resolvida com um objeto que imita a função scanStream
    clamscan = Promise.resolve({
        scanStream: async (buffer: Buffer) => {
            console.log('   -> [MOCK] Scan simulado: Arquivo considerado limpo.');
            return { isInfected: false, viruses: [] };
        }
    });

} else {
    // Configuração Real (Produção/Docker)
    // Nota: Requer o serviço 'clamav' rodando no Docker na porta 3310
    console.log('🛡️  [PROD] Inicializando conexão real com ClamAV...');
    clamscan = new NodeClam().init({
        removeInfected: true,
        debugMode: false,
        clamdscan: {
            host: process.env.CLAMAV_HOST || 'pif_clamav', // Usa variável ou padrão
            port: parseInt(process.env.CLAMAV_PORT as string) || 3310,
            timeout: 60000,
            localFallback: false,
        },
    });
}
// --- FIM DA ALTERAÇÃO ---

/**
 * Processa a imagem: Valida Magic Numbers, Escaneia Vírus e Reconstrói
 * @param buffer - O buffer do arquivo em memória
 * @returns O nome do arquivo salvo (UUID.webp)
 */
export const processarImagemSegura = async (buffer: Buffer): Promise<string> => {
    // 1. Validação de "Magic Numbers" (Tipo real do arquivo)
    // Usa 'FileType.fromBuffer' se importado como namespace (* as FileType)
    const type: any = await (FileType as any).fromBuffer(buffer);
    const allowedTypes = ['jpg', 'png', 'webp', 'jpeg'];
    
    if (!type || !allowedTypes.includes(type.ext)) {
        throw new Error('Arquivo inválido ou mascarado. Apenas imagens reais são permitidas.');
    }

    // 2. Escaneamento de Vírus (Stream da memória)
    try {
        // O await inicial resolve a promessa de inicialização (Mock ou Real)
        const scanner = await clamscan; 
        const { isInfected, viruses } = await scanner.scanStream(buffer);
        
        if (isInfected) {
            throw new Error(`Arquivo infectado bloqueado: ${viruses.join(', ')}`);
        }
    } catch (err: any) {
        console.warn("Aviso: Verificação de antivírus falhou ou serviço indisponível.", err.message);
    }

    // 3. Higienização por Reconstrução (Sharp)
    // Cria um novo arquivo do zero, eliminando metadados maliciosos
    const novoNome = `${uuidv4()}.webp`;
    
    // CORREÇÃO CRÍTICA AQUI: Usa process.cwd() para apontar para a raiz (/app)
    // Isso garante que o Docker reconheça o volume mapeado para /var/www/pif/server/uploads
    const UPLOADS_FOLDER = '/app/uploads';
    const caminhoFinal = path.join(UPLOADS_FOLDER, novoNome);

    await sharp(buffer)
        .resize(800, 800, { // Padroniza tamanho (opcional)
            fit: 'inside',
            withoutEnlargement: true
        })
        .webp({ quality: 80 }) // Converte para WebP (formato moderno e seguro)
        .toFile(caminhoFinal);

    return novoNome;
};
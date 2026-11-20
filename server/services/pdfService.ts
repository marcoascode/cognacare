import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import puppeteer, { Browser } from 'puppeteer';
import nodemailer from 'nodemailer';

// --- MySQL ORIGINAL ---
// import poolPromise from '../config/mysqlPoolPromise';

// --- POSTGRESQL CORRIGIDO ---
import poolPromise from '../config/pgPoolPromise';
// import { i18nEmails } from '../utils/i18n'; // Ajuste o caminho se necessário

// --- INTERFACES ---
interface IContextoRelatorio {
    crianca: string;
    inicio: string;
    fim: string;
    tipo: string;
}

interface IDadosBrutos {
    diario: string;
    pif: string;
}

export interface IRelatorioDadosJson {
    contexto: IContextoRelatorio;
    dados_brutos_compilados: IDadosBrutos;
    sintese_IA: any; // O retorno do Claude pode ser Markdown puro ou um Objeto estruturado
}

interface IUsuarioRow {
    nome: string;
    email: string;
}

// Configuração do e-mail
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === '465', 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false }
});

class PdfService {
    /**
     * NÍVEL 1: Geração e Envio do Relatório Pedagógico
     * Transforma o JSON da IA em Markdown -> HTML -> PDF e envia por e-mail.
     */
    async gerarEEnviarRelatorio(
        dadosJson: IRelatorioDadosJson, 
        relatorioId: string | number, 
        usuarioId: string | number
    ): Promise<string> {
        let browser: Browser | null = null;
        
        try {
            // --- MySQL ORIGINAL ---
            // const [userRows]: any = await poolPromise.query(
            //     'SELECT nome, email FROM fs_usuarios WHERE id = ?', 
            //     [usuarioId]
            // );

            // --- POSTGRESQL CORRIGIDO ---
            // 1. Busca os dados do usuário (Profissional) para enviar o e-mail
            const { rows: userRows } = await poolPromise.query(
                'SELECT nome, email FROM fs_usuarios WHERE id = $1', 
                [usuarioId]
            );
            
            if (userRows.length === 0) {
                throw new Error('Usuário gerador não encontrado na base de dados.');
            }
            
            const profissional = userRows[0] as IUsuarioRow;

            // 2. Transforma Markdown em HTML
            // A IA pode ter devolvido uma string Markdown direta ou um JSON com uma propriedade específica
            let markdownContent = '';
            if (typeof dadosJson.sintese_IA === 'string') {
                markdownContent = dadosJson.sintese_IA;
            } else if (dadosJson.sintese_IA && dadosJson.sintese_IA.relatorio_markdown) {
                markdownContent = dadosJson.sintese_IA.relatorio_markdown;
            } else {
                // Fallback seguro caso seja um Objeto JSON puro
                markdownContent = "```json\n" + JSON.stringify(dadosJson.sintese_IA, null, 2) + "\n```";
            }

            const rawHtml = await marked.parse(markdownContent);
            
            // Limpa o HTML gerado para evitar injeções XSS não intencionais
            const safeHtml = sanitizeHtml(rawHtml, {
                allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img', 'h1', 'h2', 'h3', 'table', 'th', 'tr', 'td' ]),
                allowedAttributes: {
                    ...sanitizeHtml.defaults.allowedAttributes,
                    '*': ['style', 'class']
                }
            });

            const criancaNome = dadosJson.contexto?.crianca || 'Paciente';
            const periodoInicio = this.formatarData(dadosJson.contexto?.inicio);
            const periodoFim = this.formatarData(dadosJson.contexto?.fim);

            // 3. Constrói o HTML Final
            const htmlContent = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; padding: 20px; }
                    .header { text-align: center; border-bottom: 2px solid #8B7355; padding-bottom: 15px; margin-bottom: 30px; }
                    h1 { color: #2C3E50; margin: 0; }
                    .meta-info { color: #666; font-size: 14px; margin-top: 5px; }
                    .content { margin-top: 20px; }
                    .content h1, .content h2 { color: #8B7355; margin-top: 25px; border-bottom: 1px solid #EEE; padding-bottom: 5px; }
                    .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #999; border-top: 1px solid #EEE; padding-top: 15px; }
                    /* Ajustes para tabelas caso o Markdown as gere */
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f4f1ea; color: #8B7355; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Relatório Pedagógico Evolutivo</h1>
                    <div class="meta-info">
                        <strong>Paciente:</strong> ${criancaNome} <br/>
                        <strong>Período:</strong> ${periodoInicio} a ${periodoFim} <br/>
                        <strong>Gerado por:</strong> Cognacare Agent / ${profissional.nome}
                    </div>
                </div>
                <div class="content">
                    ${safeHtml}
                </div>
                <div class="footer">
                    Documento gerado automaticamente pelo Sistema Cognacare.<br/>
                    As informações contidas neste relatório são baseadas nos registros do Diário de Bordo e atividades do PIF.
                </div>
            </body>
            </html>
            `;

            // 4. Preparar Diretório e Arquivo
            const dirPath = path.join(__dirname, '../../uploads/relatorios');
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }

            const fileName = `Relatorio_${relatorioId}_${Date.now()}.pdf`;
            const pdfPath = path.join(dirPath, fileName);

            // 5. Renderizar o PDF com Puppeteer
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

            await page.pdf({ 
                path: pdfPath, 
                format: 'A4', 
                printBackground: true,
                margin: { top: '2cm', bottom: '2cm', right: '1.5cm', left: '2cm' } 
            });

            await browser.close();
            browser = null; // Previne tentativas de fechar novamente no catch

            // 6. Envio de E-mail
            // Usaremos um fallback para subject/text caso não existam chaves específicas de relatório no seu i18n
            const assuntoEmail = `Relatório Pedagógico - ${criancaNome}`;
            const textoEmail = `Olá ${profissional.nome},\n\nO Relatório Pedagógico gerado pelo Cognacare Agent para o(a) paciente ${criancaNome} está em anexo.\n\nAtenciosamente,\nEquipe Cognacare`;

            await transporter.sendMail({
                from: `"CognaCare Agent" <${process.env.EMAIL_USER}>`,
                to: profissional.email,
                subject: assuntoEmail,
                text: textoEmail,
                attachments: [{ filename: fileName, path: pdfPath }],
            });

            // 7. Retorna a URL pública para o frontend baixar imediatamente
            return `/uploads/relatorios/${fileName}`;

        } catch (error) {
            console.error('[PDF Service] Erro ao gerar/enviar relatório:', error);
            if (browser) await browser.close();
            throw error;
        }
    }

    /**
     * Auxiliar de formatação de datas YYYY-MM-DD para DD/MM/YYYY
     */
    formatarData(dataString: string | undefined): string {
        if (!dataString) return '';
        const parts = dataString.split('-');
        if (parts.length === 3) {
            const [ano, mes, dia] = parts;
            return `${dia}/${mes}/${ano}`;
        }
        return dataString;
    }
}

export default new PdfService();
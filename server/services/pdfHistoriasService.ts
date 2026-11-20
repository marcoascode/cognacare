import fs from 'fs';
import path from 'path';
import puppeteer, { Browser } from 'puppeteer';

// --- INTERFACES ---
export interface IPassoHistoria {
    ordem?: number | string;
    texto: string;
    emoji?: string;
}

export interface IConteudoHistoria {
    titulo: string;
    passos: IPassoHistoria[];
    mensagem_final?: string;
}

export interface IHistoriaSocialData {
    nome_crianca: string;
    conteudo_json: IConteudoHistoria;
}

class PdfHistoriasService {
    /**
     * Gera um PDF visual com pictogramas (Emojis) para Histórias Sociais
     */
    async gerarHistoriaSocialPdf(dadosJson: IHistoriaSocialData, historiaId: string | number): Promise<string> {
        return new Promise(async (resolve, reject) => {
            let browser: Browser | null = null;
            try {
                const historia = dadosJson.conteudo_json;
                const criancaNome = dadosJson.nome_crianca;

                // 1. Constrói o HTML com Layout em Grid (Cards Visuais)
                // Usamos fontes que garantem a renderização limpa dos emojis no Linux/Servidor
                let htmlContent = `
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;800&display=swap');
                            
                            body { 
                                font-family: 'Nunito', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif; 
                                background-color: #F8F9FA; 
                                margin: 0; 
                                padding: 40px; 
                                color: #333;
                            }
                            .header { text-align: center; margin-bottom: 40px; }
                            h1 { color: #2C3E50; font-size: 32px; margin-bottom: 10px; }
                            .subtitle { color: #8B7355; font-size: 20px; font-weight: 600; }
                            
                            .grid-container {
                                display: grid;
                                grid-template-columns: repeat(2, 1fr);
                                gap: 20px;
                                max-width: 1000px;
                                margin: 0 auto;
                            }
                            
                            .card {
                                background: white;
                                border-radius: 15px;
                                padding: 25px;
                                box-shadow: 0 4px 15px rgba(0,0,0,0.05);
                                border-left: 8px solid #8B7355;
                                display: flex;
                                align-items: center;
                                gap: 20px;
                                page-break-inside: avoid;
                            }
                            
                            .emoji-box {
                                font-size: 60px;
                                line-height: 1;
                                min-width: 80px;
                                text-align: center;
                            }
                            
                            .text-box {
                                font-size: 22px;
                                font-weight: 600;
                                line-height: 1.4;
                                color: #2C3E50;
                            }
                            
                            .footer {
                                text-align: center;
                                margin-top: 50px;
                                padding-top: 20px;
                                border-top: 2px dashed #DDD;
                                font-size: 24px;
                                color: #4CAF50;
                                font-weight: 800;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>${historia.titulo}</h1>
                            <div class="subtitle">Uma história para o(a) ${criancaNome}</div>
                        </div>
                        
                        <div class="grid-container">
                            ${historia.passos.map(passo => `
                                <div class="card">
                                    <div class="emoji-box">${passo.emoji || '✨'}</div>
                                    <div class="text-box">${passo.texto}</div>
                                </div>
                            `).join('')}
                        </div>
                        
                        ${historia.mensagem_final ? `
                            <div class="footer">
                                ✨ ${historia.mensagem_final} ✨
                            </div>
                        ` : ''}
                    </body>
                </html>
                `;

                // 3. Preparar diretório
                const dirPath = path.join(__dirname, '../../uploads/historias');
                if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

                const fileName = `Historia_${historiaId}_${Date.now()}.pdf`;
                const pdfPath = path.join(dirPath, fileName);

                // 4. Renderizar PDF com Puppeteer
                browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
                
                const page = await browser.newPage();
                await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
                
                // Formato Paisagem (Landscape) é melhor para cards de rotina
                await page.pdf({ 
                    path: pdfPath, 
                    format: 'A4', 
                    landscape: true, 
                    printBackground: true 
                });

                await browser.close();

                // 5. Retorna URL pública
                resolve(`/uploads/historias/${fileName}`);

            } catch (error) {
                console.error('[PDF Historias] Erro ao gerar:', error);
                if (browser) await browser.close();
                reject(error);
            }
        });
    }
}

export default new PdfHistoriasService();
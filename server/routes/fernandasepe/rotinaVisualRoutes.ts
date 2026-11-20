import express, { Response } from 'express';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import nodemailer from 'nodemailer';

import authMiddleware from '../../middleware/authMiddleware';
// Certifique-se de que o arasaacService exporta a função corretamente para ES Modules
import arasaacService from '../../services/arasaacService'; 

const router = express.Router();

// --- INTERFACES ---
interface CustomRequest extends express.Request {
    user?: {
        id: number | string;
        email: string;
        nome?: string;
        [key: string]: any;
    };
}

interface IPassoGerado {
    instruction: string;
    visual_search: string;
}

interface IItemRotina {
    tarefa: string;
    imagem: string;
}

// Inicializa o cliente LLM (Grok via OpenAI SDK)
const grokClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

// Configuração do Email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_PORT === '465', // true para 465, false para as restantes
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  tls: { rejectUnauthorized: false }
});

const languageNames: Record<string, string> = { 'pt': 'Portuguese', 'en': 'English', 'es': 'Spanish' };

router.post('/gerar-rotina', authMiddleware, async (req: CustomRequest, res: Response): Promise<any> => {
    const { titulo, tema, lang } = req.body; 
    const userEmail = req.user?.email; 
    const userName = req.user?.nome || 'Usuário';

    if (!tema) return res.status(400).json({ erro: 'Tema obrigatório.' });
    if (!userEmail) return res.status(400).json({ erro: 'E-mail do utilizador não encontrado no token.' });

    // Normaliza idioma (ARASAAC suporta pt, en, es)
    const langCode = lang ? String(lang).substring(0, 2) : 'pt';
    const cleanLang = ['pt', 'en', 'es'].includes(langCode) ? langCode : 'pt';
    const langName = languageNames[cleanLang];

    try {
        console.log(`[Rotina] Iniciando geração inteligente para: "${tema}" (${cleanLang})`);

        // 1. PROMPT: GROK COMO DESCRITOR VISUAL
        const prompt = `
        Act as an occupational therapist creating a visual schedule for a child with autism.
        Activity: "${tema}".
        
        INSTRUCTIONS:
        1. Break the activity down into 5 to 8 sequential steps.
        2. For each step, provide:
           - "instruction": Short text for the child (in ${langName}).
           - "visual_search": A detailed list of keywords (in ${langName}) that describe the IDEAL pictogram. Include the action, objects, and body parts.
        
        EXAMPLE (Language: Portuguese):
        Step: "Secar o corpo".
        Output: { "instruction": "Secar o corpo", "visual_search": "menino toalha secar corpo" }
        (Note: "menino toalha secar corpo" is much better for fuzzy search than just "secar")

        Generate JSON Array only:
        [
          { "instruction": "...", "visual_search": "..." }
        ]
        `;

        const completion = await grokClient.chat.completions.create({
            model: 'grok-4', // Verifique se o nome do modelo está correto para a sua conta
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2
        });

        let passosGerados: IPassoGerado[];
        try {
            const content = completion.choices[0].message?.content || '[]';
            const rawContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
            passosGerados = JSON.parse(rawContent);
        } catch (e) {
            console.error("Erro parse JSON:", e);
            return res.status(500).json({ erro: 'Erro na inteligência da rotina.' });
        }

        // 2. BUSCA LOCAL NO BANCO COMPLETO (ARASAAC SERVICE)
        const itensRotina: IItemRotina[] = await Promise.all(passosGerados.map(async (passo) => {
            // Fusão perfeita: Fuse.js procura na lista completa de 15k itens do ARASAAC
            const urlImagem = await arasaacService.searchBestMatch(passo.visual_search, cleanLang);
            
            return {
                tarefa: passo.instruction, 
                imagem: urlImagem || 'https://via.placeholder.com/300x300.png?text=404'
            };
        }));

        // 3. GERAÇÃO PDF
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] 
        });
        const page = await browser.newPage();

        const htmlContent = `
        <!DOCTYPE html>
        <html lang="${cleanLang}">
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Verdana', sans-serif; padding: 20px; background-color: #fff; }
                .header { text-align: center; border-bottom: 4px solid #2c3e50; padding-bottom: 10px; margin-bottom: 20px; }
                h1 { color: #2c3e50; text-transform: uppercase; font-size: 24px; margin: 0; }
                
                .container { 
                    display: flex; 
                    flex-wrap: wrap; 
                    justify-content: center; 
                    gap: 15px; 
                }
                
                .card { 
                    width: 160px;
                    border: 4px solid #000; 
                    border-radius: 12px; 
                    padding: 8px; 
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    page-break-inside: avoid;
                    background-color: #fff;
                }
                
                .step-number {
                    background-color: #000;
                    color: #fff;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    text-align: center;
                    font-weight: bold;
                    margin-bottom: 5px;
                    align-self: flex-start;
                }

                .card img { 
                    width: 130px; 
                    height: 130px; 
                    object-fit: contain; 
                    margin-bottom: 5px; 
                }

                .card p { 
                    font-size: 14px; 
                    font-weight: 800;
                    text-align: center;
                    color: #000; 
                    text-transform: uppercase; 
                    margin: 0;
                    min-height: 35px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    line-height: 1.1;
                }
                
                .check-circle {
                    width: 25px;
                    height: 25px;
                    border: 3px solid #000;
                    border-radius: 50%;
                    margin-top: 8px;
                }

                .footer { margin-top: 30px; text-align: center; font-size: 9px; color: #aaa; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${titulo || tema}</h1>
            </div>
            
            <div class="container">
                ${itensRotina.map((item, index) => `
                    <div class="card">
                        <div class="step-number">${index + 1}</div>
                        <img src="${item.imagem}" alt="Pictograma" />
                        <p>${item.tarefa}</p>
                        <div class="check-circle"></div>
                    </div>
                `).join('')}
            </div>
            
            <div class="footer">Cognacare AI • Pictograms: ARASAAC (CC BY-NC-SA)</div>
        </body>
        </html>
        `;

        await page.setContent(htmlContent);
        const pdfPath = path.join(__dirname, `rotina_${Date.now()}.pdf`);
        await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
        await browser.close();

        // 4. Envio Email (Background)
        (async () => {
            try {
                await transporter.sendMail({
                    from: `"CognaCare" <${process.env.EMAIL_USER}>`,
                    to: userEmail,
                    subject: `Rotina Visual: ${titulo || tema}`,
                    text: `Olá ${userName},\n\nSua rotina visual para "${tema}" está pronta.\n\nAtenciosamente,\nEquipe Cognacare`,
                    attachments: [{ filename: `Rotina.pdf`, path: pdfPath }]
                });
            } catch (err: any) { 
                console.error("Erro email:", err.message); 
            }
        })();

        // 5. Download
        res.download(pdfPath, `Rotina.pdf`, (err: Error | null) => {
            if (err) console.error("Erro download:", err);
            try { fs.unlinkSync(pdfPath); } catch(e) {}
        });

    } catch (error) {
        console.error('Erro crítico rotina:', error);
        res.status(500).json({ erro: 'Erro ao gerar rotina visual.' });
    }
});

export default router;
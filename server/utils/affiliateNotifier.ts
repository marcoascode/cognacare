// --- MySQL ORIGINAL ---
// import poolPromise from '../config/mysqlPoolPromise';

// --- POSTGRESQL CORRIGIDO ---
import poolPromise from '../config/pgPoolPromise';
import nodemailer from 'nodemailer';
import moment from 'moment';

// --- INTERFACES ---
interface IVendaAfiliadoRow {
    valor: number | string;
    comissao_gerada: number | string;
    data_pagamento: Date | string;
    nome_afiliado: string;
    email_afiliado: string;
    nome_cliente: string;
}

// Configuração do transporte de e-mail
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST as string,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: Number(process.env.EMAIL_PORT) === 465, // true para 465, false para as restantes
  auth: {
    user: process.env.EMAIL_USER as string,
    pass: process.env.EMAIL_PASS as string,
  },
  // CRÍTICO: Permite certificados auto-assinados (Poste.io no Docker)
  tls: {
    rejectUnauthorized: false
  }
});

export async function notificarVendaAfiliado(paymentId: string, metodoPagamento: string): Promise<void> {
    try {
        // 1. Buscar detalhes da venda, do afiliado e da comissão
        // --- POSTGRESQL CORRIGIDO: Uso de $1 e $2 em vez de ? ---
        const query = `
            SELECT 
                p.valor, 
                p.comissao_gerada, 
                p.data_pagamento,
                a.nome as nome_afiliado, 
                a.email as email_afiliado,
                u.nome as nome_cliente
            FROM fs_pagamentos p
            JOIN fs_afiliados a ON p.afiliado_id = a.id
            JOIN fs_usuarios u ON p.usuario_id = u.id
            WHERE p.txid = $1 OR p.charge_id = $2 
            LIMIT 1
        `;

        // --- MySQL ORIGINAL ---
        // const [rows]: any = await poolPromise.query(query, [paymentId, paymentId]);

        // --- POSTGRESQL CORRIGIDO ---
        const { rows } = await poolPromise.query(query, [paymentId, paymentId]);

        if (rows.length === 0) {
            console.log(`[AffiliateNotifier] Venda ${paymentId} não encontrada ou não possui afiliado.`);
            return;
        }

        const dados = rows[0] as IVendaAfiliadoRow;

        // 2. Calcular Previsão de Saque (Baseado nos Termos)
        let previsaoSaque: string;
        if (metodoPagamento === 'PIX') {
            // Dia 1 do mês seguinte
            previsaoSaque = moment().add(1, 'months').startOf('month').format('DD/MM/YYYY');
        } else {
            // Cartão (Stripe) D+30
            previsaoSaque = moment().add(30, 'days').format('DD/MM/YYYY');
        }

        // Prepara os valores numéricos com segurança antes de injetar no HTML
        const valorVendaStr = parseFloat(String(dados.valor)).toFixed(2);
        const comissaoStr = parseFloat(String(dados.comissao_gerada)).toFixed(2);
        const nomeClienteCurto = dados.nome_cliente ? dados.nome_cliente.split(' ')[0] : 'Cliente';

        // 3. Montar o E-mail (HTML)
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1976d2;">Parabéns, ${dados.nome_afiliado}! 🚀</h2>
                <p>Você acabou de realizar uma nova venda através do seu link/cupom.</p>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Valor da Venda:</strong> R$ ${valorVendaStr}</p>
                    <p style="margin: 5px 0; font-size: 18px; color: #2e7d32;"><strong>Sua Comissão: R$ ${comissaoStr}</strong></p>
                    <p style="margin: 5px 0;"><strong>Cliente:</strong> ${nomeClienteCurto}***</p>
                </div>

                <p style="font-size: 12px; color: #666;">
                    * Esta comissão está pendente e será liberada para saque em <strong>${previsaoSaque}</strong>, 
                    desde que a compra não seja cancelada ou contestada (chargeback).
                </p>

                <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.FRONTEND_URL}/afiliados" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                        Acessar Painel do Parceiro
                    </a>
                </div>
            </div>
        `;

        // 4. Enviar
        await transporter.sendMail({
            from: `"Cognacare Parceiros" <${process.env.EMAIL_USER}>`,
            to: dados.email_afiliado,
            subject: `💰 Nova Comissão: R$ ${comissaoStr}!`,
            html: htmlContent
        });

        console.log(`[AffiliateNotifier] E-mail enviado para ${dados.email_afiliado}`);

    } catch (error: any) {
        console.error('[AffiliateNotifier] Erro ao enviar notificação:', error);
    }
}
// import poolPromise from '../config/mysqlPoolPromise';
import poolPromise from '../config/pgPoolPromise';

// --- INTERFACES ---
interface ILoteExpirado {
    id: number;
    usuario_id: number;
    quantidade_restante: number;
}

export default async function processarExpiracoes(): Promise<void> {
    // let connection: any;
    // try {
    //     connection = await poolPromise.getConnection();
    //     // console.log('--- [CRON] Verificando expirações ---');

    //     const [rows]: any = await connection.query(`
    //         SELECT id, usuario_id, quantidade_restante 
    //         FROM fs_creditos_chat_lotes 
    //         WHERE status = 'ativo' AND data_expiracao <= NOW() AND quantidade_restante > 0
    //     `);

    //     const lotesVencidos = rows as ILoteExpirado[];

    //     if (lotesVencidos.length === 0) return;
    let connection: any;
    try {
        connection = await poolPromise.connect(); // Obtém um cliente dedicado da pool

        const { rows: lotesVencidos } = await connection.query(`
            SELECT id, usuario_id, quantidade_restante 
            FROM fs_creditos_chat_lotes 
            WHERE status = 'ativo' AND data_expiracao <= NOW() AND quantidade_restante > 0
        `);

        if (lotesVencidos.length === 0) {
            connection.release();
            return;
        }

        console.log(`[CRON] Processando ${lotesVencidos.length} lotes vencidos.`);

        // Converte a variável de ambiente para número com segurança para evitar NaN nos cálculos
        const bonusMultiplier = Number(process.env.BONUS_CREDITO_EXPIRADO) || 0;

        for (const lote of lotesVencidos) {
            // await connection.beginTransaction();

            // const valorBonus = (lote.quantidade_restante * bonusMultiplier).toFixed(2);

            // // 1. Marca lote como expirado
            // await connection.query(
            //     "UPDATE fs_creditos_chat_lotes SET status = 'expirado' WHERE id = ?", 
            //     [lote.id]
            // );

            // // 2. Debita os créditos do usuário (Registro de Saída)
            // await connection.query(
            //     "UPDATE fs_usuarios SET chat_mensagens_restantes = GREATEST(0, chat_mensagens_restantes - ?), saldo_bonus = saldo_bonus + ? WHERE id = ?",
            //     [lote.quantidade_restante, valorBonus, lote.usuario_id]
            // );

            // // 3. Registra a "Perda" dos créditos no histórico de consumo
            // await connection.query(
            //     "INSERT INTO fs_creditos_consumidos (usuario_id, data_consumo, creditos, tipo_credito, descricao) VALUES (?, NOW(), ?, 'CHAT', 'Créditos expirados')",
            //     [lote.usuario_id, -lote.quantidade_restante]
            // );

            // // 4. Registra o "Ganho" do bônus no histórico de bônus
            // await connection.query(
            //     "INSERT INTO fs_bonus_historico (usuario_id, tipo, valor, descricao) VALUES (?, 'credito', ?, 'Bônus gerados')",
            //     [lote.usuario_id, valorBonus]
            // );
            
            // await connection.commit();

            await connection.query('BEGIN');

            const valorBonus = (lote.quantidade_restante * bonusMultiplier).toFixed(2);

            // 1. Marca lote como expirado
            await connection.query("UPDATE fs_creditos_chat_lotes SET status = 'expirado' WHERE id = $1", [lote.id]);

            // 2. Debita os créditos do usuário (GREATEST funciona nativamente no Postgres)
            await connection.query(
                "UPDATE fs_usuarios SET chat_mensagens_restantes = GREATEST(0, chat_mensagens_restantes - $1), saldo_bonus = saldo_bonus + $2 WHERE id = $3",
                [lote.quantidade_restante, valorBonus, lote.usuario_id]
            );

            // 3. Registra a \"Perda\"
            await connection.query(
                "INSERT INTO fs_creditos_consumidos (usuario_id, data_consumo, creditos, tipo_credito, descricao) VALUES ($1, NOW(), $2, 'CHAT', 'Créditos expirados')",
                [lote.usuario_id, -lote.quantidade_restante]
            );

            // 4. Registra o \"Ganho\"
            await connection.query(
                "INSERT INTO fs_bonus_historico (usuario_id, tipo, valor, descricao) VALUES ($1, 'credito', $2, 'Bônus gerados')",
                [lote.usuario_id, valorBonus]
            );

            await connection.query('COMMIT');
            console.log(`[CRON] Lote ${lote.id}: ${lote.quantidade_restante} msgs expiradas -> R$ ${valorBonus} bônus.`);
        }

    // } catch (error) {
    //     if (connection) await connection.rollback();
    //     console.error('[CRON] Erro ao processar expirações:', error);
    // } finally {
    //     if (connection) connection.release();
    // }
    } catch (error) {
        if (connection) await connection.query('ROLLBACK');
        console.error('[CRON] Erro Crítico no Processador de Expirações:', error);
    } finally {
        if (connection) connection.release(); // Libera o cliente de volta para a pool
    }
}
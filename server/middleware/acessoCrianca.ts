import { Request, Response, NextFunction } from 'express';
import poolPromise from '../config/pgPoolPromise';

// =========================================================================
// CONTROLE DE ACESSO POR CRIANÇA E POR TIER (Sprint 0 — correção de IDOR)
// Deve ser usado SEMPRE depois de um middleware de autenticação
// (authMiddleware ou autenticarUsuario), que preenche req.user / req.usuarioId.
// =========================================================================

type OrigemId = 'params' | 'body' | 'query';

const obterUsuarioId = (req: Request): number | undefined => {
    const r = req as any;
    const id = r.user?.id ?? r.usuarioId;
    const n = Number(id);
    return Number.isInteger(n) && n > 0 ? n : undefined;
};

/** Converte flags que podem vir do Postgres como boolean, smallint ou string. */
export const flagAtiva = (valor: unknown): boolean =>
    valor === true || valor === 1 || valor === '1' || valor === 't' || valor === 'true';

/**
 * Verifica se a criança pertence ao usuário. Retorna false para IDs inválidos.
 */
export async function criancaPertenceAoUsuario(criancaId: unknown, usuarioId: unknown): Promise<boolean> {
    const cid = Number(criancaId);
    const uid = Number(usuarioId);
    if (!Number.isInteger(cid) || cid <= 0 || !Number.isInteger(uid) || uid <= 0) return false;

    const { rows } = await poolPromise.query(
        'SELECT 1 FROM fs_crianca WHERE id_crianca = $1 AND usuario_id = $2 LIMIT 1',
        [cid, uid]
    );
    return rows.length > 0;
}

/**
 * Middleware: exige que a criança indicada (em params, body ou query) pertença
 * ao usuário autenticado. Responde 404 (não 403) para não revelar a existência
 * do registro de outra família.
 *
 * @param campo Nome do campo que contém o ID da criança (ex.: 'criancaId', 'id_crianca').
 * @param origem Onde procurar o campo. Padrão: params.
 */
export const exigirCriancaPropria = (campo: string, origem: OrigemId = 'params') =>
    async (req: Request, res: Response, next: NextFunction): Promise<any> => {
        try {
            const usuarioId = obterUsuarioId(req);
            const fonte: any = (req as any)[origem] || {};
            const criancaId = fonte[campo];

            if (!usuarioId) return res.status(401).json({ erro: 'Usuário não autenticado.' });
            if (criancaId === undefined || criancaId === null || criancaId === '') {
                return res.status(400).json({ erro: 'Identificador da criança não informado.' });
            }

            if (!(await criancaPertenceAoUsuario(criancaId, usuarioId))) {
                return res.status(404).json({ erro: 'Criança não encontrada.' });
            }
            next();
        } catch (error) {
            console.error('Erro ao validar acesso à criança:', error);
            res.status(500).json({ erro: 'Erro ao validar permissões.' });
        }
    };

/**
 * Middleware: exige que o usuário tenha o tier Cognacare Agent ativo
 * (fs_usuarios.is_agent_active). Administradores são liberados.
 * Antes, este bloqueio existia apenas no frontend.
 */
export const exigirAgenteAtivo = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const usuarioId = obterUsuarioId(req);
        if (!usuarioId) return res.status(401).json({ erro: 'Usuário não autenticado.' });

        const { rows } = await poolPromise.query(
            'SELECT is_agent_active, status FROM fs_usuarios WHERE id = $1',
            [usuarioId]
        );
        if (rows.length === 0) return res.status(401).json({ erro: 'Usuário não encontrado.' });

        const usuario = rows[0];
        if (!flagAtiva(usuario.is_agent_active) && usuario.status !== 'admin') {
            return res.status(403).json({ erro: 'Este recurso faz parte do plano Cognacare Agent.' });
        }
        next();
    } catch (error) {
        console.error('Erro ao validar tier do Agente:', error);
        res.status(500).json({ erro: 'Erro ao validar permissões.' });
    }
};

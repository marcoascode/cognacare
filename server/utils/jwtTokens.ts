import * as jwt from 'jsonwebtoken';

// =========================================================================
// TOKENS JWT COM FINALIDADE (Sprint 0)
// Antes, os links de verificação de e-mail e de redefinição de senha carregavam
// um JWT {id} assinado com o MESMO segredo da sessão — ou seja, o link enviado
// por e-mail funcionava como token de login. Agora cada token leva o claim "typ"
// e os middlewares de autenticação recusam tokens que não sejam de acesso.
//
// Compatibilidade: tokens de sessão emitidos antes desta versão não têm "typ" e
// continuam aceitos (inclusive os de longa duração do app mobile).
// =========================================================================

export type TipoToken = 'access' | 'verify' | 'reset';

export const assinarToken = (payload: Record<string, any>, tipo: TipoToken, expiresIn: string): string =>
    jwt.sign({ ...payload, typ: tipo }, process.env.JWT_SECRET as string, { expiresIn } as jwt.SignOptions);

/** Verifica um token de SESSÃO. Lança erro se for inválido ou de outra finalidade. */
export const verificarTokenAcesso = (token: string): jwt.JwtPayload & { id: number; email?: string } => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    if (decoded && decoded.typ !== undefined && decoded.typ !== 'access') {
        throw new jwt.JsonWebTokenError('Token não é de acesso.');
    }
    return decoded;
};

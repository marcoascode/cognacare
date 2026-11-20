import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { verificarTokenAcesso } from '../utils/jwtTokens';

// Estende a interface Request do Express para incluir o usuarioId
// Exportamos esta interface para que possa ser reutilizada noutros ficheiros de rotas!
export interface AuthRequest extends Request {
  usuarioId?: number;
}

// Interface para descrever a estrutura do token decodificado
interface IDecodedToken extends jwt.JwtPayload {
  id: number;
}

const autenticarUsuario = (req: AuthRequest, res: Response, next: NextFunction): any => {
  const token = req.headers['authorization']?.split(' ')[1]; // Espera "Bearer <token>"
  
  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  // --- MELHORIA DE SEGURANÇA ---
  if (!process.env.JWT_SECRET) {
    console.error('Erro crítico de configuração: JWT_SECRET não está definido.');
    return res.status(500).json({ erro: 'Erro de configuração do servidor.' });
  }

  try {
    // O cast 'as IDecodedToken' assegura ao TS que o payload contém o ID do utilizador
    const decoded = verificarTokenAcesso(token) as IDecodedToken;
    req.usuarioId = decoded.id;
    (req as any).user = { id: decoded.id, email: (decoded as any).email };
    
    next();
  } catch (error) {
    console.error('Erro no autenticarUsuario:', error);
    res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
};

export default autenticarUsuario;
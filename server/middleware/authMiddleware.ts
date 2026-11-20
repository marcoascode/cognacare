import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { verificarTokenAcesso } from '../utils/jwtTokens';

// Estende a interface Request do Express para incluir o objeto user
export interface AuthRequest extends Request {
  user?: string | jwt.JwtPayload | any;
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): any => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ erro: 'Acesso negado' });
  }
  
  try {
    // SPRINT 0: removido o fallback 'seu-segredo' (permitia forjar tokens sem JWT_SECRET).
    if (!process.env.JWT_SECRET) {
      console.error('Erro crítico de configuração: JWT_SECRET não está definido.');
      return res.status(500).json({ erro: 'Erro de configuração do servidor.' });
    }
    const decoded: any = verificarTokenAcesso(token);
    req.user = decoded;
    (req as any).usuarioId = decoded.id;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Sessão expirada' });
    }
    console.error('Erro ao validar token:', error);
    res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
};

export default authMiddleware;
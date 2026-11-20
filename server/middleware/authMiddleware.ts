import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu-segredo');
    req.user = decoded;
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
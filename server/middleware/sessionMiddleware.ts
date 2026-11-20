import { Request, Response, NextFunction } from 'express';

// Estende a interface Request do Express para incluir session e user
export interface SessionRequest extends Request {
  session?: any;
  user?: any;
}

const sessionMiddleware = (req: SessionRequest, res: Response, next: NextFunction): any => {
  // O operador '?.' garante que não ocorre um erro fatal se req.session for undefined
  if (!req.session?.user) {
    return res.status(401).json({ erro: 'Não autenticado' });
  }
  
  req.user = req.session.user; // Passa os dados do usuário para as rotas
  next();
};

export default sessionMiddleware;
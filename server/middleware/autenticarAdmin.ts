import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { verificarTokenAcesso } from '../utils/jwtTokens';
// import poolPromise from '../config/mysqlPoolPromise';
import poolPromise from '../config/pgPoolPromise';

// Estende a interface Request do Express para incluir o usuarioId
export interface AuthRequest extends Request {
  usuarioId?: number;
}

// Interface para descrever a estrutura do token decodificado
interface IDecodedToken extends jwt.JwtPayload {
  id: number;
}

// Interface para mapear a resposta da consulta à base de dados
interface IUsuarioStatusRow {
  status: string;
}

const autenticarAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
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
    
    // O ": any" aqui previne o erro de Symbol.iterator no retorno do mysql2/promise
    // const [rows]: any = await poolPromise.execute(
    //   'SELECT status FROM fs_usuarios WHERE id = ?', 
    //   [decoded.id]
    // );
    const { rows } = await poolPromise.query(
      'SELECT status FROM fs_usuarios WHERE id = $1', 
      [decoded.id]
    );

    if (rows.length === 0 || (rows[0] as IUsuarioStatusRow).status !== 'admin') {
      return res.status(403).json({ erro: 'Acesso negado: apenas administradores' });
    }
    
    req.usuarioId = decoded.id;
    next();
  } catch (error) {
    console.error('Erro no autenticarAdmin:', error);
    res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
};

export default autenticarAdmin;
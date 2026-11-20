import axios from 'axios';
import { Request, Response, NextFunction } from 'express';

// Interface que descreve a resposta esperada da API do Google reCAPTCHA
interface IRecaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

const verificarRecaptcha = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { recaptchaToken } = req.body;

  if (!recaptchaToken) {
    return res.status(400).json({ erro: 'Token do reCAPTCHA não fornecido' });
  }

  // Prevenção de erro: Garante que a chave secreta foi configurada no .env
  if (!process.env.RECAPTCHA_SECRET_KEY) {
    console.error('Erro de configuração: RECAPTCHA_SECRET_KEY não está definido.');
    return res.status(500).json({ erro: 'Erro interno de configuração do servidor.' });
  }

  try {
    const response = await axios.post<IRecaptchaResponse>(
      'https://www.google.com/recaptcha/api/siteverify', 
      null, 
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY as string,
          response: recaptchaToken,
          remoteip: req.ip, // Opcional: IP do cliente
        },
      }
    );

    const { success } = response.data;

    if (!success) {
      return res.status(400).json({ erro: 'Falha na verificação do reCAPTCHA' });
    }

    next();
  } catch (error: any) {
    console.error('Erro ao verificar reCAPTCHA:', error.message || error);
    res.status(500).json({ erro: 'Erro ao verificar reCAPTCHA' });
  }
};

export default verificarRecaptcha;
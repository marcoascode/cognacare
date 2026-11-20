import * as dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

const projectRoot = path.resolve(__dirname, '../../');
// dotenv.config({ path: path.join(projectRoot, '.env.dev') });
dotenv.config({ path: path.join(projectRoot, '.env') });

//------------------------------------------------------------------
// CÓDIGO EXECUTÁVEL E FUNCIONAL

// var https = require('follow-redirects').https;
// var fs = require('fs');
// const clientId = process.env.HOTMART_CLIEND_ID;
// const clientSecret = process.env.HOTMART_CLIEND_SECRET;
// const basicToken =  process.env.HOTMART_BASIC_TOKEN;

// var options = {
//   'method': 'POST',
//   'hostname': 'api-sec-vlc.hotmart.com',
//   'path': `/security/oauth/token?grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
//   'headers': {
//     'Content-Type': 'application/json',
//     'Authorization': `Basic ${basicToken}`
//   },
//   'maxRedirects': 20
// };

// var req = https.request(options, function (res) {
//   var chunks = [];
//   res.on("data", function (chunk) {
//     chunks.push(chunk);
//   });
//   res.on("end", function (chunk) {
//     var body = Buffer.concat(chunks);
//     console.log(body.toString());
//   });
//   res.on("error", function (error) {
//     console.error(error);
//   });
// });
// req.end();
//-----------------------------------------------------------------------

// --- INTERFACES ---
interface IHotmartTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  jti?: string;
}

// Variáveis para armazenar o token e sua data de expiração em memória.
let accessToken: string | null = null;
let tokenExpiresAt: number | null = null;

const clientId = process.env.HOTMART_CLIENT_ID as string;
const clientSecret = process.env.HOTMART_CLIENT_SECRET as string;
const basicToken = process.env.HOTMART_BASIC_TOKEN as string;

/**
 * Busca um novo access token da API da Hotmart.
 * Esta função é chamada internamente quando o token atual expira.
 */
const fetchNewToken = async (): Promise<string> => {
  console.log('Solicitando novo token de acesso da Hotmart...');
  try {
    const response = await axios.post<IHotmartTokenResponse>(
      `https://api-sec-vlc.hotmart.com/security/oauth/token`,
      null, // O corpo da requisição é vazio
      {
        params: {
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicToken}`
        }
      }
    );

    const tokenData = response.data;
    accessToken = tokenData.access_token;
    
    // Calcula a data de expiração e armazena em milissegundos
    // Adiciona um buffer de 5 minutos (300 segundos) para segurança
    const expiresInSeconds = tokenData.expires_in - 300;
    tokenExpiresAt = Date.now() + (expiresInSeconds * 1000);

    console.log('Novo token da Hotmart obtido com sucesso.');
    return accessToken;

  } catch (error: any) {
    console.error('Erro crítico ao obter token da Hotmart:', error.response ? error.response.data : error.message);
    // Limpa as variáveis em caso de erro para forçar uma nova tentativa na próxima vez
    accessToken = null;
    tokenExpiresAt = null;
    throw new Error('Não foi possível obter o token de acesso da Hotmart.');
  }
};

/**
 * Função principal exportada. Verifica o token atual e busca um novo se necessário.
 * return {Promise<string>} O access token válido.
 */
export const getValidAccessToken = async (): Promise<string> => {
  // Se o token não existe ou já expirou, busca um novo
  if (!accessToken || !tokenExpiresAt || Date.now() >= tokenExpiresAt) {
    return await fetchNewToken();
  }
  // Se o token atual ainda for válido, retorna-o
  return accessToken;
};
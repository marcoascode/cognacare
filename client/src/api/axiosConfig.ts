import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Interceptor de Requisição (Request Interceptor)
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    
    // CORREÇÃO: Adiciona o cabeçalho APENAS se o token for uma string válida.
    // Isso previne o envio de "Bearer null" ou "Bearer undefined".
    if (token && typeof token === 'string' && token !== 'null' && token !== 'undefined') {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Interceptor de Resposta (Response Interceptor)
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Se a resposta for bem-sucedida, apenas a retorne
    return response;
  },
  (error: AxiosError) => {
    // Se a resposta for um erro de autenticação (401)
    if (error.response && error.response.status === 401) {
      // Limpa os dados de autenticação do usuário para evitar loops de erro
      localStorage.removeItem('token');
      localStorage.removeItem('email');

      // Evita múltiplos alertas. Redireciona apenas se não estiver já na página de login.
      if (window.location.pathname !== '/login') {
        alert('Your session has expired. Please log in again.');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
// src/utils/api.ts
import axios, { AxiosInstance } from 'axios';

export const getApiClient = (): AxiosInstance => {
  return axios.create({
    baseURL: 'https://api.efipay.com.br',
    headers: {
      'Content-Type': 'application/json',
      // Adicione outras configurações ou cabeçalhos necessários aqui
    },
  });
};
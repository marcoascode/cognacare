// src/services/paymentService.ts
import { getApiClient } from '../utils/api';

// --- INTERFACES ---
export interface PaymentCardData {
  number?: string;
  cvv?: string;
  expirationMonth?: string | number;
  expirationYear?: string | number;
  brand?: string;
  [key: string]: any; // Permite propriedades adicionais que a sua API possa exigir
}

export interface PaymentTokenResponse {
  payment_token?: string;
  [key: string]: any;
}

export interface CardMaskResponse {
  card_mask?: string;
  [key: string]: any;
}

export const generatePaymentToken = async (cardData: PaymentCardData): Promise<PaymentTokenResponse> => {
  const apiClient = getApiClient();
  const response = await apiClient.post<PaymentTokenResponse>('/payment_token', cardData);
  return response.data;
};

export const generateCardMask = async (cardData: PaymentCardData): Promise<CardMaskResponse> => {
  const apiClient = getApiClient();
  const response = await apiClient.post<CardMaskResponse>('/card_mask', cardData);
  return response.data;
};
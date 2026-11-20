// 1. Isso ensina ao TypeScript todas as mágicas nativas do Vite (incluindo o import.meta.env)
/// <reference types="vite/client" />

// 2. Isso ensina ao TypeScript QUAIS variáveis existem no seu .env
interface ImportMetaEnv {
  readonly GENERATE_SOURCEMAP: string;

  readonly VITE_API_INICIO: string;
  readonly VITE_API_SITE: string;

  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_SOCKET: string;

  readonly VITE_API_SUCCESS_URL: string;
  readonly VITE_API_EFI_ENVIRONMENT: string;
  readonly VITE_API_EFI_ACCOUNT_ID: string;
  
  readonly VITE_STRIPE_PUBLIC_KEY: string;

  readonly VITE_RECAPTCHA_SITE_KEY: string;
  
  readonly VITE_CASHBACK_VALUE: string;
  
  // Adicione aqui outras variáveis que comecem com VITE_ no futuro
  // readonly VITE_OUTRA_VARIAVEL: string;
}

// 3. Sobrescreve o ImportMeta nativo
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
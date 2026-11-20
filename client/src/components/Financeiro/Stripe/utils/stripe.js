import { loadStripe } from '@stripe/stripe-js';

// Carrega a chave pública do .env (VITE_)
// Certifique-se de ter adicionado VITE_STRIPE_PUBLIC_KEY no .env.prod
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
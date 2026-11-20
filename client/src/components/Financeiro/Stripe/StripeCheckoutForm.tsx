import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Box, Button, Alert, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// --- INTERFACES ---
interface StripeCheckoutFormProps {
  valorFinal: string | number;
}

export default function StripeCheckoutForm({ valorFinal }: StripeCheckoutFormProps) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href, 
      },
      redirect: 'if_required', 
    });

    if (error) {
      if (error.type === "card_error" || error.type === "validation_error") {
        // Fallback genérico caso a mensagem específica venha indefinida
        setMessage(error.message || t('payment.modal.error_unexpected'));
      } else {
        setMessage(t('payment.modal.error_unexpected'));
      }
    } else {
      setMessage(t('payment.modal.success'));
      setTimeout(() => {
         window.location.reload(); 
      }, 2000);
    }

    setIsLoading(false);
  };

  // Avalia se a mensagem é de sucesso para estilizar o Alert corretamente
  const isSuccessMessage = message?.includes("sucesso") || message?.includes("success") || message?.includes("éxito");

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ mb: 2 }}>
        <PaymentElement id="payment-element" />
      </Box>
      
      {message && (
        <Alert 
            severity={isSuccessMessage ? "success" : "error"} 
            sx={{ mb: 2 }}
            icon={isSuccessMessage ? <CheckCircleIcon /> : undefined}
        >
            {message}
        </Alert>
      )}

      <Button
        disabled={isLoading || !stripe || !elements}
        id="submit"
        type="submit"
        variant="contained"
        fullWidth
        size="large"
        sx={{ mt: 1 }}
      >
        {isLoading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          `${t('payment.modal.pay_btn')} R$ ${valorFinal}`
        )}
      </Button>
    </form>
  );
}
import React from 'react';
import Countdown from 'react-countdown';
import { Typography, Box } from '@mui/material';
import { Navigate } from 'react-router-dom';

// Corrigido de 3 para 3000 para representar 3 segundos reais em milissegundos
const tempo: number = 3000;

// Interface para as propriedades do renderer do react-countdown
interface CountdownRendererProps {
    seconds: number;
    completed: boolean;
}

const Success: React.FC = () => {
    // Componente de redirecionamento quando o tempo acaba
    const Completionist: React.FC = () => <Navigate to="/login" />;
    
    // Função de renderização tipada
    const renderer = ({ seconds, completed }: CountdownRendererProps) => {
        if (completed) {
            return <Completionist />;
        } else {
            return <Typography textAlign="center">{seconds}</Typography>;
        }
    };

    return (
        <Box>
            <Typography sx={{ mt: '5px' }} textAlign="center">
                Créditos adquiridos com sucesso!
            </Typography>
            <Typography textAlign="center">
                {`Você será redirecionado para a página de "LOG IN" em ${tempo / 1000} segundos...`}
            </Typography>
            
            <Countdown date={Date.now() + tempo} renderer={renderer} />
        </Box>
    );
};

export default Success;
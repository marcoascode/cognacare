import React from 'react';
import Countdown from 'react-countdown';
import { Typography, Box } from '@mui/material';
import { Navigate } from 'react-router-dom';

const tempo: number = 3000;

// Interface para as propriedades do renderer do react-countdown
interface CountdownRendererProps {
    seconds: number;
    completed: boolean;
}

const Cancel: React.FC = () => {
    // Componente de redirecionamento quando o tempo acaba
    const Completionist: React.FC = () => <Navigate to="/creditos" />;
    
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
            <Typography sx={{ mt: '20%' }} textAlign="center">
                Processo de compra interrompido.
            </Typography>
            <Typography textAlign="center">
                {`Você será redirecionado em ${tempo / 1000} segundos...`}
            </Typography>
            
            <Countdown date={Date.now() + tempo} renderer={renderer} />
        </Box>
    );
};

export default Cancel;
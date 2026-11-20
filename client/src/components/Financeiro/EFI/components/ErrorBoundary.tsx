import React from 'react';
import { Button, Typography, Box } from '@mui/material';

// --- INTERFACES ---
interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    // Inicialização tipada do estado
    state: ErrorBoundaryState = { 
        hasError: false, 
        error: null, 
        errorInfo: null 
    };

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        // Atualiza o estado para que a próxima renderização mostre a UI de fallback.
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Aqui também poderia registar o erro num serviço de monitorização (ex: Sentry)
        console.error('ErrorBoundary: Erro capturado:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = (): void => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="h6" color="error">
                        Ocorreu um erro inesperado
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 2 }}>
                        Tente recarregar a página ou contate o suporte.
                    </Typography>
                    
                    {this.state.error && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                            Detalhes: {this.state.error.message}
                        </Typography>
                    )}
                    
                    {this.state.errorInfo && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Stack: {this.state.errorInfo.componentStack}
                        </Typography>
                    )}
                    
                    <Button variant="contained" color="primary" onClick={this.handleReload} sx={{ mt: 2 }}>
                        Recarregar Página
                    </Button>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
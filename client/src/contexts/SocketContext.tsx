import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

// Cria o contexto aceitando a tipagem do Socket.io ou nulo
const SocketContext = createContext<Socket | null>(null);

// Substitui o prop-types nativamente com TypeScript
interface SocketProviderProps {
    children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        // Busca a URL do seu backend das variáveis de ambiente do Vite
        const socketUrl = import.meta.env.VITE_API_SOCKET || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3077';

        // Inicializa a conexão com o servidor Node.js
        const newSocket: Socket = io(socketUrl, {
            transports: ['websocket'], // Força o uso direto de WebSocket para melhor performance
            autoConnect: true,
            auth: {
                token: localStorage.getItem('token')
            }
        });

        // Atualiza o estado para que os componentes filhos possam usar
        setSocket(newSocket);

        // Logs úteis para debugar no console do navegador
        newSocket.on('connect', () => {
            console.log('🟢 [Socket.io] Conectado com sucesso! ID:', newSocket.id);
        });

        newSocket.on('disconnect', (reason: string) => {
            console.warn('🟡 [Socket.io] Desconectado. Motivo:', reason);
        });

        newSocket.on('connect_error', (error: Error) => {
            console.error('🔴 [Socket.io] Erro de conexão:', error.message);
        });

        // Cleanup
        return () => {
            newSocket.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

// Resolução do erro 2 (Fast Refresh)
// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = (): Socket | null => {
    return useContext(SocketContext);
};
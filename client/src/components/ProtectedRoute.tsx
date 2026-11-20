import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

// --- INTERFACES ---
interface ProtectedRouteProps {
  session?: any | null; // Tipado de forma genérica para aceitar o objeto do utilizador ou null
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ session, children }) => {
  // Se a sessão existir, renderiza o componente filho. 
  // Caso contrário, redireciona para login e substitui o histórico de navegação (replace)
  return session ? <>{children}</> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
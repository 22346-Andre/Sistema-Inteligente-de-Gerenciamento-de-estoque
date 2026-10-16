import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../contexts/auth-context';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  // Aguarda a validação da sessão HttpOnly pelo backend.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Sem sessão válida, redireciona para autenticação.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // A sessão validada libera a rota protegida.
  return <Outlet />;
}
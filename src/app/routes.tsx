import { createBrowserRouter, Navigate } from 'react-router';
import { DashboardLayout } from './layouts/dashboard-layout';
import Login from './pages/login';
import Cadastro from './pages/cadastro';
import EsqueciSenha from './pages/EsqueciSenha';
import RedefinirSenha from './pages/RedefinirSenha';
import Dashboard from './pages/dashboard';
import Produtos from './pages/produtos';
import ProdutoDetalhes from './pages/produto-detalhes';
import Fornecedores from './pages/fornecedores';
import Importacao from './pages/importacao';
import Scanner from './pages/scanner';
import Configuracoes from './pages/configuracoes';
import Webhooks from './pages/webhooks';
import SugestoesCompra from './pages/sugestoes-compra';
import Relatorios from './pages/relatorios';
import Perfil from './pages/Perfil';
import Fiados from './pages/Fiados';


import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  // ==========================================
  // 🔓 ROTAS PÚBLICAS
  // ==========================================
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/cadastro',
    element: <Cadastro />
  },
  {
    path: '/esqueci-senha',
    element: <EsqueciSenha />
  },
  {
    path: '/redefinir-senha',
    element: <RedefinirSenha />
  },
  
  // ==========================================
  // 🔐 ROTAS PRIVADAS (A Catraca do Sistema)
  // ==========================================
  {
    path: '/', 
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />, 
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />
          },
          {
            path: 'dashboard',
            element: <Dashboard />
          },
          {
            path: 'produtos',
            element: <Produtos />
          },
          {
            path: 'produtos/:id',
            element: <ProdutoDetalhes />
          },
          {
            path: 'fornecedores',
            element: <Fornecedores />
          },
          {
            path: 'importacao',
            element: <Importacao />
          },
          {
            path: 'scanner',
            element: <Scanner />
          },
          {
            path: 'sugestoes-compra',
            element: <SugestoesCompra />
          },
          {
            path: 'relatorios',
            element: <Relatorios />
          },
          {
            path: 'configuracoes',
            element: <Configuracoes />
          },
          
          {
            path: 'webhooks',
            element: <Webhooks />
          },
          // 🚨 A nova rota de Perfil adicionada à catraca!
          {
            path: 'perfil',
            element: <Perfil />
          },

          
          { path: 'fiados', element: <Fiados /> }
        ]
      }
    ]
  },

  // ==========================================
  // 🚫 ROTA DE ERRO (404 - Página não encontrada)
  // ==========================================
  {
    path: '*',
    element: (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4 text-blue-500">404</h1>
          <p className="text-gray-400 mb-8 text-xl">Oops! Esta página não existe.</p>
          <a href="/" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors">
            Voltar para a Segurança
          </a>
        </div>
      </div>
    )
  }
]);
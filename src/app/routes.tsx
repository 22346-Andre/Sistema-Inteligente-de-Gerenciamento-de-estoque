import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { DashboardLayout } from './layouts/dashboard-layout';
import { ProtectedRoute } from './components/ProtectedRoute';

const Login = lazy(() => import('./pages/login'));
const Cadastro = lazy(() => import('./pages/cadastro'));
const EsqueciSenha = lazy(() => import('./pages/EsqueciSenha'));
const RedefinirSenha = lazy(() => import('./pages/RedefinirSenha'));
const Dashboard = lazy(() => import('./pages/dashboard'));
const Produtos = lazy(() => import('./pages/produtos'));
const ProdutoDetalhes = lazy(() => import('./pages/produto-detalhes'));
const Fornecedores = lazy(() => import('./pages/fornecedores'));
const Importacao = lazy(() => import('./pages/importacao'));
const Scanner = lazy(() => import('./pages/scanner'));
const Configuracoes = lazy(() => import('./pages/configuracoes'));
const Webhooks = lazy(() => import('./pages/webhooks'));
const SugestoesCompra = lazy(() => import('./pages/sugestoes-compra'));
const Relatorios = lazy(() => import('./pages/relatorios'));
const Perfil = lazy(() => import('./pages/Perfil'));
const Fiados = lazy(() => import('./pages/Fiados'));
const Despesas = lazy(() => import('./pages/Despesas'));
const Caixa = lazy(() => import('./pages/Caixa'));
const Vencimentos = lazy(() => import('./pages/Vencimentos'));

const carregarPagina = (Pagina: LazyExoticComponent<ComponentType>) => (
  <Suspense fallback={
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground" role="status">
      Carregando página...
    </div>
  }>
    <Pagina />
  </Suspense>
);

export const router = createBrowserRouter([
  // ==========================================
  // 🔓 ROTAS PÚBLICAS
  // ==========================================
  {
    path: '/login',
    element: carregarPagina(Login)
  },
  {
    path: '/cadastro',
    element: carregarPagina(Cadastro)
  },
  {
    path: '/esqueci-senha',
    element: carregarPagina(EsqueciSenha)
  },
  {
    path: '/redefinir-senha',
    element: carregarPagina(RedefinirSenha)
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
            element: carregarPagina(Dashboard)
          },
          {
            path: 'produtos',
            element: carregarPagina(Produtos)
          },
          {
            path: 'produtos/:id',
            element: carregarPagina(ProdutoDetalhes)
          },
          {
            path: 'fornecedores',
            element: carregarPagina(Fornecedores)
          },
          {
            path: 'importacao',
            element: carregarPagina(Importacao)
          },
          {
            path: 'scanner',
            element: carregarPagina(Scanner)
          },
          {
            path: 'sugestoes-compra',
            element: carregarPagina(SugestoesCompra)
          },
          {
            path: 'relatorios',
            element: carregarPagina(Relatorios)
          },
          {
            path: 'configuracoes',
            element: carregarPagina(Configuracoes)
          },
          
          {
            path: 'webhooks',
            element: carregarPagina(Webhooks)
          },
          // 🚨 A nova rota de Perfil adicionada à catraca!
          {
            path: 'perfil',
            element: carregarPagina(Perfil)
          },

          
          { path: 'fiados', element: carregarPagina(Fiados) },
          { path: 'despesas', element: carregarPagina(Despesas) },
          { path: 'caixa', element: carregarPagina(Caixa) },
          { path: 'vencimentos', element: carregarPagina(Vencimentos) }
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
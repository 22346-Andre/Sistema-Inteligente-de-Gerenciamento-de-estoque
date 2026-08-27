import { LayoutDashboard, Package, TrendingUp, Users, Upload, Scan, X, ShoppingCart, FileText, Settings, Wallet, Webhook, Receipt } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { Button } from '../components/ui/button';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/scanner', icon: Scan, label: 'Scanner/PDV' },
  { path: '/fiados', icon: Wallet, label: 'Contas a Receber' },
  { path: '/despesas', icon: Receipt, label: 'Despesas (Contas a Pagar)' },
  { path: '/produtos', icon: Package, label: 'Catálogo de Produtos' },
  { path: '/fornecedores', icon: Users, label: 'Fornecedores' },
  { path: '/sugestoes-compra', icon: ShoppingCart, label: 'Sugestões de Compra' },
  { path: '/importacao', icon: Upload, label: 'Importação CSV' },
  { path: '/relatorios', icon: FileText, label: 'Relatórios' },
  { path: '/configuracoes', icon: Settings, label: 'Configurações' },
  { path: '/webhooks', icon: Webhook, label: 'Webhooks' },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-gray-900 text-white z-50 transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-400" />
            <span className="font-bold text-lg">EstoqueMax</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden text-white hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* 🟢 2. ADICIONEI O flex-1 E overflow-y-auto PARA PERMITIR SCROLL SE O MENU CRESCER */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="text-xs text-gray-400 text-center">
            <p>EstoqueMax SaaS</p>
            <p>Versão 1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
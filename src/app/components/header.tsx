import { useState, useEffect } from 'react';
import { Bell, Menu, LogOut, Mic, AlertTriangle, Store, User, Moon, Sun, Palette } from 'lucide-react'; // 🟢 Ícones importados
import { Link } from 'react-router'; 
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { useAuth } from '../contexts/auth-context';
import { useTheme } from '../contexts/theme-context'; // 
import { VoiceCommandsHelp } from './voice-commands-help';
import { useVoiceCommand } from '../hooks/useVoiceCommand';
import { produtoService, Produto } from '../services/produto.service';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme(); // 🟢 Usa o tema atual
  const { toggleListening, isListening, isSupported } = useVoiceCommand();
  
  const [alertas, setAlertas] = useState<Produto[]>([]);
  const [erroAlertas, setErroAlertas] = useState(false);

  useEffect(() => {
    carregarAlertas();
  }, []);

  const carregarAlertas = async () => {
    try {
      const data = await produtoService.listarCriticos();
      setAlertas(data);
      setErroAlertas(false);
    } catch (error) {
      setErroAlertas(true);
      console.error("Erro ao carregar alertas de estoque", error);
    }
  };

  return (
    <header className="h-16 border-b bg-card border-border px-4 flex items-center justify-between sticky top-0 z-40">
      <div className="flex min-w-0 items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden text-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        {/* LOGO */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 bg-primary p-2 rounded-xl shadow-sm flex items-center justify-center">
            <Store className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="hidden min-w-0 max-w-[min(32vw,20rem)] flex-col md:flex">
            <h2 className="truncate font-extrabold text-xl text-foreground leading-none" title={user?.nomeFantasia || 'EstoqueMax'}>
              {user?.nomeFantasia || 'EstoqueMax'}
            </h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
              Gestão de Estoque
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        
        {/* BOTÃO DE MICROFONE */}
        {isSupported && (
          <button
            onClick={toggleListening}
            className={`relative hidden sm:flex items-center justify-center h-9 px-4 rounded-full text-sm font-semibold transition-all duration-300 shadow-sm ${
              isListening 
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground ring-4 ring-destructive/30 shadow-destructive/50' 
                : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20' 
            }`}
            title="Assistente Virtual J.A.R.V.I.S"
          >
            <Mic className={`h-4 w-4 mr-2 ${isListening ? 'animate-pulse' : ''}`} />
            {isListening ? 'Ouvindo...' : 'Falar'}
          </button>
        )}

        <div className="hidden lg:block">
          <VoiceCommandsHelp />
        </div>

        <div className="h-6 w-px bg-border hidden sm:block mx-1"></div>

        {/* 🟢 SELETOR DE TEMAS */}
        <div className="hidden sm:flex bg-muted rounded-full p-1 border border-border">
          <button onClick={() => setTheme('light')} className={`p-1.5 rounded-full transition-colors ${theme === 'light' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} title="Tema Claro">
            <Sun className="h-4 w-4" />
          </button>
          <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-full transition-colors ${theme === 'dark' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} title="Tema Escuro">
            <Moon className="h-4 w-4" />
          </button>
          <button onClick={() => setTheme('dracula')} className={`p-1.5 rounded-full transition-colors ${theme === 'dracula' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} title="Tema Dracula">
            <Palette className="h-4 w-4" />
          </button>
        </div>

        {/* SININHO DINÂMICO */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative hover:bg-accent text-foreground rounded-full">
              <Bell className="h-5 w-5" />
              {alertas.length > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full border border-background animate-pulse" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-popover text-popover-foreground border-border">
            <DropdownMenuLabel>
              {erroAlertas ? 'Notificações (indisponíveis)' : `Notificações (${alertas.length})`}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <div className="max-h-96 overflow-y-auto">
              {erroAlertas ? (
                <div className="p-4 text-center">
                  <p role="alert" className="text-sm text-muted-foreground">Não foi possível verificar os alertas de estoque.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={carregarAlertas}>Tentar novamente</Button>
                </div>
              ) : alertas.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm font-medium text-green-500">Tudo em dia! ✅</p>
                  <p className="text-xs text-muted-foreground mt-1">Nenhum produto com estoque crítico.</p>
                </div>
              ) : (
                alertas.map((produto) => (
                  <DropdownMenuItem key={produto.id} className="p-3 cursor-default hover:bg-accent">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-1 flex-shrink-0" />
                      <div className="flex flex-col gap-1">
                        <p className="max-w-[240px] break-words text-sm font-medium text-foreground" title={produto.nome}>Atenção: {produto.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Restam apenas <span className="font-bold text-destructive">{produto.quantidade}</span> no estoque!
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* MENU MINHA CONTA */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 hover:bg-accent rounded-full">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shadow-inner">
                {user?.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="hidden max-w-[140px] truncate font-medium text-foreground md:inline" title={user?.nome}>{user?.nome}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover text-popover-foreground border-border">
            <DropdownMenuLabel className="text-muted-foreground text-xs uppercase tracking-wider">Ações da Conta</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link to="/perfil" className="cursor-pointer flex items-center w-full font-medium hover:bg-accent">
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                Meu Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer font-medium hover:bg-destructive/10">
              <LogOut className="mr-2 h-4 w-4" />
              Sair do Sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
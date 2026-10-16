import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, LoginRequest, RegistroEmpresaDTO } from '../services/auth.service';

interface User {
  id: string;
  nome: string;
  email: string;
  nomeFantasia: string;
  role?: string; 
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, senha: string) => Promise<void>;
  // 🚨 1. Adicionamos a função do Google na interface
  loginComGoogle: (googleToken: string) => Promise<void>; 
  cadastrar: (data: CadastroData) => Promise<void>;
  // etapa 2 do cadastro — confirma o código e, se válido, já loga o usuário
  confirmarCadastro: (email: string, codigo: string, senha: string) => Promise<void>;
  reenviarCodigoCadastro: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  atualizarUsuarioNoContexto: (novoNome: string) => void; 
}

interface CadastroData {
  nomeDono: string;
  email: string;
  senha: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  celular: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function clearLegacyAuthStorage() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('session');
}

async function carregarUsuarioAutenticado(): Promise<User> {
  const dadosReais = await authService.getMe();
  return {
    id: String(dadosReais.id),
    nome: dadosReais.nome,
    email: dadosReais.email,
    nomeFantasia: dadosReais.empresa?.nomeFantasia || 'Minha Empresa',
    role: dadosReais.perfil || 'USER',
  };
}

// 👇 OLHA O AuthProvider AQUI! Tudo o que rege o login fica dentro dele.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🔄 Recupera a sessão ao atualizar a página (F5)
  useEffect(() => {
    let mounted = true;
    clearLegacyAuthStorage();

    const bootstrapSession = async () => {
      try {
        const userReal = await carregarUsuarioAutenticado();
        if (mounted) setUser(userReal);
      } catch {
        clearLegacyAuthStorage();
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void bootstrapSession();

    return () => {
      mounted = false;
    };
  }, []);

  // 🔐 Função de Login Normal
  const login = async (email: string, senha: string) => {
    setIsLoading(true);
    try {
      const loginRequest: LoginRequest = { email, senha };
      
      await authService.login(loginRequest);
      const userReal = await carregarUsuarioAutenticado();
      setUser(userReal);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 🚨 2. NOVA FUNÇÃO: Login com Google (Criada dentro do AuthProvider)
  const loginComGoogle = async (googleToken: string) => {
    setIsLoading(true);
    try {
      await authService.loginComGoogle(googleToken);
      const userReal = await carregarUsuarioAutenticado();
      setUser(userReal);
      
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 🏢 Função de Registo de Nova Empresa
  const cadastrar = async (data: CadastroData) => {
    setIsLoading(true);
    try {
      
      const registroData: RegistroEmpresaDTO = {
        nomeDono: data.nomeDono,           
        email: data.email,             
        senha: data.senha,             
        cnpj: data.cnpj,                   
        razaoSocial: data.razaoSocial,      
        emailContato: data.email,          
        telefoneAdmin: data.celular,
        nomeFantasia: data.nomeFantasia,
        telefoneEmpresa: data.celular
      };
      
      
      await authService.registrarEmpresa(registroData);
      
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  
  const confirmarCadastro = async (email: string, codigo: string, senha: string) => {
    setIsLoading(true);
    try {
      await authService.confirmarCadastro(email, codigo);
      await login(email, senha);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const reenviarCodigoCadastro = async (email: string) => {
    await authService.reenviarCodigoCadastro(email);
  };


  // 🚪 Função de Logout
  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      clearLegacyAuthStorage();
      setUser(null);
    }
  };

  // ==========================================
  // ATUALIZAR NOME NA HORA
  // ==========================================
  const atualizarUsuarioNoContexto = (novoNome: string) => {
    if (user) {
      const usuarioAtualizado = { ...user, nome: novoNome };
      setUser(usuarioAtualizado);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      login, 
      loginComGoogle, // 🚨 3. Repassando a função para as telas poderem usar
      cadastrar, 
      confirmarCadastro,
      reenviarCodigoCadastro,
      logout, 
      isLoading,
      atualizarUsuarioNoContexto 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar o contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
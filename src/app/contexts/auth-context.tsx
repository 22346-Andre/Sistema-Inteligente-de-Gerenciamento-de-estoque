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
  logout: () => void;
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

// 👇 OLHA O AuthProvider AQUI! Tudo o que rege o login fica dentro dele.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🔄 Recupera a sessão ao atualizar a página (F5)
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  // 🔐 Função de Login Normal
  const login = async (email: string, senha: string) => {
    setIsLoading(true);
    try {
      const loginRequest: LoginRequest = { email, senha };
      
      const response = await authService.login(loginRequest);
      const token = response.accessToken;
      localStorage.setItem('token', token);
      
      const dadosReais = await authService.getMe();
      
      const userReal: User = {
        id: String(dadosReais.id),
        nome: dadosReais.nome,
        email: dadosReais.email,
        nomeFantasia: dadosReais.empresa?.nomeFantasia || 'Minha Empresa',
        role: dadosReais.perfil || 'USER' 
      };
      
      setUser(userReal);
      localStorage.setItem('user', JSON.stringify(userReal));
      
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
      // 1. Manda o token do Google para o nosso Java e pega o nosso Token
      const response = await authService.loginComGoogle(googleToken);
      const token = response.accessToken;
      localStorage.setItem('token', token);
      
      // 2. Busca os dados reais de quem acabou de logar
      const dadosReais = await authService.getMe();
      
      const userReal: User = {
        id: String(dadosReais.id),
        nome: dadosReais.nome,
        email: dadosReais.email,
        nomeFantasia: dadosReais.empresa?.nomeFantasia || 'Minha Empresa',
        role: dadosReais.perfil || 'USER'
      };
      
      setUser(userReal);
      localStorage.setItem('user', JSON.stringify(userReal));
      
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
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // ==========================================
  // ATUALIZAR NOME NA HORA
  // ==========================================
  const atualizarUsuarioNoContexto = (novoNome: string) => {
    if (user) {
      const usuarioAtualizado = { ...user, nome: novoNome };
      setUser(usuarioAtualizado);
      localStorage.setItem('user', JSON.stringify(usuarioAtualizado));
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
import api from './api';

export interface LoginRequest {
  email: string;
  senha: string;
}


export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
}

export interface RegistroEmpresaDTO {
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  emailContato?: string;
  telefoneEmpresa?: string;
  nomeDono: string;
  email: string;
  senha: string;
  telefoneAdmin?: string;
}

export const authService = {
  async login(data: LoginRequest): Promise<void> {
    await api.post<LoginResponse>('/auth/login', data);
  },

  async loginComGoogle(googleToken: string): Promise<void> {
    await api.post<LoginResponse>('/auth/login/google', { token: googleToken });
  },

  async registrarEmpresa(data: RegistroEmpresaDTO): Promise<string> {
    const response = await api.post('/auth/registrar-empresa', data);
    return response.data;
  },

  
  async confirmarCadastro(email: string, codigo: string): Promise<string> {
    const response = await api.post('/auth/confirmar-cadastro', { email, codigo });
    return response.data;
  },

  async reenviarCodigoCadastro(email: string): Promise<string> {
    const response = await api.post('/auth/reenviar-codigo-cadastro', { email });
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post<void>('/auth/logout');
  },

  async getMe() {
    const response = await api.get('/usuarios/me');
    return response.data;
  },
};
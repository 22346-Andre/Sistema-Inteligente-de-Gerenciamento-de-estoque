import api from './api';


export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  telefone?: string;
  dono: boolean;
}

export interface UsuarioDTO {
  nome: string;
  email: string;
  senha?: string; // opcional pra não obrigar reenvio de senha ao atualizar
  perfil: string;
  telefone?: string;
}

export const usuarioService = {
  async listarTodos(): Promise<Usuario[]> {
    const response = await api.get('/usuarios');
    return response.data;
  },

  async buscarPorId(id: number): Promise<Usuario> {
    const response = await api.get(`/usuarios/${id}`);
    return response.data;
  },

  async criar(usuario: UsuarioDTO): Promise<Usuario> {
    const response = await api.post('/usuarios', usuario);
    return response.data;
  },

  async atualizar(id: number, usuario: UsuarioDTO): Promise<Usuario> {
    const response = await api.put(`/usuarios/${id}`, usuario);
    return response.data;
  },

  async deletar(id: number): Promise<void> {
    await api.delete(`/usuarios/${id}`);
  },

  async atualizarPerfil(dados: { nome: string }): Promise<string> {
    const response = await api.put('/usuarios/perfil/dados', dados);
    return response.data;
  },

  async alterarSenha(dados: { senhaAtual: string; novaSenha: string }): Promise<string> {
    const response = await api.put('/usuarios/perfil/senha', dados);
    return response.data;
  }
};
import api from './api';


export interface Fornecedor {
  id: number;
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  prazoEntregaDias?: number;
  categoriasFornecidas?: string;
}

export interface FornecedorDTO {
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  prazoEntregaDias?: number;
  categoriasFornecidas?: string;
}

export const fornecedorService = {
  async listarTodos(): Promise<Fornecedor[]> {
    const response = await api.get('/fornecedores');
    return response.data;
  },

  async criar(fornecedor: FornecedorDTO): Promise<Fornecedor> {
    const response = await api.post('/fornecedores', fornecedor);
    return response.data;
  },

  async atualizar(id: number, fornecedor: FornecedorDTO): Promise<Fornecedor> {
    const response = await api.put(`/fornecedores/${id}`, fornecedor);
    return response.data;
  },

  async deletar(id: number): Promise<void> {
    await api.delete(`/fornecedores/${id}`);
  },
};
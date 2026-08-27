import api from './api';

export interface Despesa {
  id: number;
  descricao: string;
  categoria: string;
  valor: number;
  dataVencimento: string;
  dataPagamento: string | null;
  fornecedorId?: number;
  fornecedorNome?: string;
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO';
  dataCriacao: string;
}

export interface DespesaDTO {
  descricao: string;
  categoria: string;
  valor: number;
  dataVencimento: string;
  fornecedorId?: number;
}

export const despesaService = {
  // Registra uma nova despesa/conta a pagar
  async registrar(dados: DespesaDTO): Promise<Despesa> {
    const response = await api.post('/despesas', dados);
    return response.data;
  },

  // Lista todas as despesas da empresa, ordenadas por vencimento
  async listar(): Promise<Despesa[]> {
    const response = await api.get('/despesas');
    return response.data;
  },

  // Só as que ainda estão em aberto (Passivo Circulante)
  async listarEmAberto(): Promise<Despesa[]> {
    const response = await api.get('/despesas/em-aberto');
    return response.data;
  },

  async marcarComoPaga(id: number): Promise<Despesa> {
    const response = await api.put(`/despesas/${id}/pagar`);
    return response.data;
  },

  async atualizar(id: number, dados: DespesaDTO): Promise<Despesa> {
    const response = await api.put(`/despesas/${id}`, dados);
    return response.data;
  },

  async excluir(id: number): Promise<void> {
    await api.delete(`/despesas/${id}`);
  },
};

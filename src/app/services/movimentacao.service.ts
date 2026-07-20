import api from './api';


export interface Movimentacao {
  id: number;
  tipo: 'ENTRADA' | 'SAIDA' | 'DEVOLUCAO' | 'QUEBRA_PERDA' | 'AJUSTE_INVENTARIO';
  quantidade: number;
  produto: {
    id: number;
    nome: string;
    precoCusto: number;
  };
  dataMovimentacao: string;
  motivo?: string;
  chaveNotaFiscal?: string;
}

export const movimentacaoService = {
  async listarTodas(): Promise<Movimentacao[]> {
    const response = await api.get('/movimentacoes');
    return response.data;
  },

  async listarPorProduto(produtoId: number): Promise<Movimentacao[]> {
    const response = await api.get(`/movimentacoes/produto/${produtoId}`);
    return response.data;
  },
};
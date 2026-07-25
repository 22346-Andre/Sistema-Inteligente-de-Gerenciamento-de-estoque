import api from './api';

export const dashboardService = {
  
  async obterResumoGeral() {
    const response = await api.get('/dashboard/resumo');
    // DashboardDTO: { totalProdutos, estoqueBaixo, totalFornecedores, valorEmEstoque, movimentacoesRecentes }
    return {
      totalProdutos: response.data.totalProdutos || 0,
      produtosCriticos: response.data.estoqueBaixo || 0,
      totalFornecedores: response.data.totalFornecedores || 0,
      valorEmEstoque: response.data.valorEmEstoque || 0,
    };
  },

  
  async obterEstatisticasFinanceiras() {
    const response = await api.get('/estatisticas');
    return {
      capitalImobilizado: response.data.capitalImobilizado || 0,
      giroEstoque: response.data.giroEstoque || 0,
      curvaABC: response.data.curvaABC || [],
    };
  },

  
  async obterGraficoMovimentacoes() {
    const response = await api.get('/dashboard/grafico');
    return response.data as { data: string; entradas: number; saidas: number }[];
  },

  
  async obterCurvaABC(criterio: 'faturamento' | 'lucratividade' | 'giro' = 'faturamento', dias: number = 90) {
    const response = await api.get('/estatisticas/curva-abc', { params: { criterio, dias } });
    return response.data as {
      produtoId: number;
      nomeProduto: string;
      quantidade: number;
      valorTotal: number;
      percentualAcumulado: number;
      classe: 'A' | 'B' | 'C';
    }[];
  },
};
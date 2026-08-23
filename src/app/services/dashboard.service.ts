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

  
  async obterCurvaABC(criterio: 'faturamento' | 'lucratividade' | 'capital-imobilizado' = 'faturamento', dias: number = 90) {
    const response = await api.get('/estatisticas/curva-abc', { params: { criterio, dias } });
    return response.data as {
      produtoId: number;
      nomeProduto: string;
      quantidade: number;
      valorTotal: number;
      percentualAcumulado: number;
      percentualItensAcumulado: number;
      classe: 'A' | 'B' | 'C';
    }[];
  },

  // Giro de Estoque por produto — relatório separado da Curva ABC (mede
  // velocidade, não valor). Ver GiroEstoqueService no backend.
  async obterGiroEstoque(dias: number = 90) {
    const response = await api.get('/estatisticas/giro-estoque', { params: { dias } });
    return response.data as {
      produtoId: number;
      nomeProduto: string;
      estoqueAtual: number;
      unidadesVendidasNoPeriodo: number;
      giro: number;
      classificacao: 'ALTO' | 'MEDIO' | 'BAIXO';
    }[];
  },

  // Matriz Faturamento × Lucratividade ("Produto Engana-Bobo") — cruza as
  // duas curvas de valor no mesmo produto. Ver CurvaAbcService no backend.
  async obterMatrizAbc(dias: number = 90) {
    const response = await api.get('/estatisticas/matriz-abc', { params: { dias } });
    return response.data as {
      produtoId: number;
      nomeProduto: string;
      classeFaturamento: 'A' | 'B' | 'C';
      classeLucratividade: 'A' | 'B' | 'C';
      quadrante: 'ALINHADO' | 'CAMPEAO_DE_VENDAS' | 'MOTOR_DE_LUCRO' | 'MISTO';
    }[];
  },
};
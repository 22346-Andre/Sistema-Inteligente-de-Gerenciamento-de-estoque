import api from './api';

export const relatorioService = {
  // 🟢 PDFs Originais (já existiam)
  async downloadBalancoPdf(dataInicio?: string, dataFim?: string): Promise<void> {
    const response = await api.get('/relatorios/balanco/pdf', {
      params: { dataInicio, dataFim },
      responseType: 'blob',
    });
    this.downloadArquivo(response.data, 'balanco_estoque.pdf');
  },

  async downloadMovimentacoesPdf(dataInicio?: string, dataFim?: string): Promise<void> {
    const response = await api.get('/relatorios/movimentacoes/pdf', {
      params: { dataInicio, dataFim },
      responseType: 'blob',
    });
    this.downloadArquivo(response.data, 'movimentacoes.pdf');
  },

  async downloadInventarioPdf(dataInicio?: string, dataFim?: string): Promise<void> {
    const response = await api.get('/relatorios/inventario/pdf', {
      params: { dataInicio, dataFim },
      responseType: 'blob',
    });
    this.downloadArquivo(response.data, 'inventario_fiscal.pdf');
  },

  // DRE simplificado: Receita Bruta - CMV = Lucro Bruto - Perdas = Resultado
  // Aproximado. Não é um DRE contábil oficial completo (sem despesas
  // administrativas/financeiras/tributos, que o sistema não rastreia) — o
  // próprio PDF deixa isso explícito no rodapé.
  async downloadContabilPdf(dataInicio?: string, dataFim?: string): Promise<void> {
    const response = await api.get('/relatorios/contabil/pdf', {
      params: { dataInicio, dataFim },
      responseType: 'blob',
    });
    this.downloadArquivo(response.data, 'relatorio_contabil.pdf');
  },

  // DFC simplificada: saldo inicial, entradas/saídas do período por origem,
  // saldo final. Vem do livro-caixa (CaixaService), não de estimativa.
  async downloadFluxoCaixaPdf(dataInicio?: string, dataFim?: string): Promise<void> {
    const response = await api.get('/relatorios/fluxo-caixa/pdf', {
      params: { dataInicio, dataFim },
      responseType: 'blob',
    });
    this.downloadArquivo(response.data, 'fluxo_caixa.pdf');
  },

  // Balanço Patrimonial é sempre uma fotografia de agora — sem parâmetros
  // de data, diferente dos outros relatórios.
  async downloadBalancoPatrimonialPdf(): Promise<void> {
    const response = await api.get('/relatorios/balanco-patrimonial/pdf', {
      responseType: 'blob',
    });
    this.downloadArquivo(response.data, 'balanco_patrimonial.pdf');
  },

  async downloadPerdasPdf(dataInicio?: string, dataFim?: string): Promise<void> {
    const response = await api.get('/relatorios/perdas/pdf', {
      params: { dataInicio, dataFim },
      responseType: 'blob',
    });
    this.downloadArquivo(response.data, 'relatorio_perdas.pdf');
  },

  // 🟢 Novos PDFs (Para os relatórios dos gráficos)
  async downloadProdutosMaisMovimentadosPdf(dataInicio?: string, dataFim?: string): Promise<void> {
    const response = await api.get('/relatorios/produtos-movimentados/pdf', {
      params: { dataInicio, dataFim },
      responseType: 'blob',
    });
    this.downloadArquivo(response.data, 'produtos_mais_movimentados.pdf');
  },

  async downloadEstoqueCategoriaPdf(dataInicio?: string, dataFim?: string): Promise<void> {
    const response = await api.get('/relatorios/estoque-categoria/pdf', {
      params: { dataInicio, dataFim },
      responseType: 'blob',
    });
    this.downloadArquivo(response.data, 'estoque_categoria.pdf');
  },

  // 🟢 Requisições JSON para alimentar os Gráficos na tela (Substitui os Mocks)
  async getProdutosMaisMovimentados(dataInicio?: string, dataFim?: string) {
    const response = await api.get('/relatorios/produtos-movimentados/dados', {
      params: { dataInicio, dataFim }
    });
    return response.data;
  },

  async getEstoqueCategoria(dataInicio?: string, dataFim?: string) {
    const response = await api.get('/relatorios/estoque-categoria/dados', {
      params: { dataInicio, dataFim }
    });
    return response.data;
  },

  // Função auxiliar de download (mantida como original)
  downloadArquivo(data: any, nomeArquivo: string) {
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', nomeArquivo);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};
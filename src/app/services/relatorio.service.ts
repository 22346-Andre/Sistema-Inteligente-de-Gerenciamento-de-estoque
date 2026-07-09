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
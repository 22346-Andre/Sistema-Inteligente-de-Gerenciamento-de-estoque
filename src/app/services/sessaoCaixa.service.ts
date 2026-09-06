import api from './api';

export interface SessaoCaixa {
  id: number;
  usuarioAberturaId: number;
  usuarioAberturaNome: string;
  dataAbertura: string;
  valorAbertura?: number | null;
  dataFechamento?: string | null;
  usuarioFechamentoId?: number | null;
  usuarioFechamentoNome?: string | null;
  valorFechamentoInformado?: number | null;
  // 🆕 Calculado no fechamento: fundo de troco + vendas em espécie do turno.
  valorEsperado?: number | null;
  observacao?: string | null;
}

export const sessaoCaixaService = {
  // null = o operador logado não tem nenhum caixa aberto agora.
  async buscarAtual(): Promise<SessaoCaixa | null> {
    const response = await api.get('/sessoes-caixa/atual');
    return response.data;
  },

  async abrir(dados?: { valorAbertura?: number; observacao?: string }): Promise<SessaoCaixa> {
    const response = await api.post('/sessoes-caixa/abrir', dados || {});
    return response.data;
  },

  async fechar(dados?: { valorFechamentoInformado?: number; observacao?: string }): Promise<SessaoCaixa> {
    const response = await api.post('/sessoes-caixa/fechar', dados || {});
    return response.data;
  },

  // Histórico da empresa toda — só ADMIN/SUPER_ADMIN (o backend barra os demais).
  async listarHistorico(): Promise<SessaoCaixa[]> {
    const response = await api.get('/sessoes-caixa');
    return response.data;
  },
};

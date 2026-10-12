import api from './api';


export interface SugestaoCompraDTO {
  produtoId: number;
  urgencia: string;          // "URGENTE" ou "ATENCAO"
  grauUrgencia: number;      // 0 a 100 — score de prioridade calculado pelo backend
  nomeProduto: string;
  nomeFornecedor: string;
  telefoneFornecedor: string;
  quantidadeAtual: number;
  estoqueMinimo: number;
  quantidadeSugerida: number;
  valorUnitario: number;
  valorTotal: number;
  urgenciaOrigem?: 'RUPTURA' | 'FUZZY'; // RUPTURA = botão de pânico (estoque zerado de item classe A/B)
  classeAbc?: string | null;
  consumoDiarioMedio?: number;          // un./dia, média dos últimos 30 dias
  quantidadeSugeridaMotivo?: string;    // explica de onde veio a quantidade sugerida
}

export const compraService = {
  async obterSugestoes(): Promise<SugestaoCompraDTO[]> {
    const response = await api.get('/sugestoes-compra');
    return response.data;
  },

  async baixarPlanilha(): Promise<Blob> {
    const response = await api.get('/sugestoes-compra/planilha', { responseType: 'blob' });
    return response.data;
  },

  async enviarEmail(emailDestino: string): Promise<void> {
    await api.post(`/sugestoes-compra/enviar-email?emailDestino=${encodeURIComponent(emailDestino)}`);
  },
};
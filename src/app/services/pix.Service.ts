import api from './api';

export const pixService = {
  // POST /pix/gerar — cobrança avulsa (ex.: valor do carrinho no PDV)
  async gerarCobranca(valor: number, identificador?: string): Promise<string> {
    const response = await api.post('/pix/gerar', { valor, identificador });
    return response.data.copiaECola as string;
  },

  // GET /fiados/{id}/pix — cobrança do valor exato de um fiado
  async gerarCobrancaFiado(fiadoId: number): Promise<string> {
    const response = await api.get(`/fiados/${fiadoId}/pix`);
    return response.data.copiaECola as string;
  },
};

import api from './api';

export type TipoMovimentoCaixa = 'ENTRADA' | 'SAIDA';
export type OrigemCaixa = 'VENDA_PDV' | 'RECEBIMENTO_FIADO' | 'PAGAMENTO_DESPESA' | 'APORTE_SOCIO' | 'RETIRADA_SOCIO' | 'COMPRA_MERCADORIA' | 'OUTRO';

export interface MovimentoCaixa {
  id: number;
  tipo: TipoMovimentoCaixa;
  origem: OrigemCaixa;
  valor: number;
  descricao: string | null;
  dataMovimento: string;
  // 🆕 Rastreabilidade: quem lançou/gerou esse movimento (snapshot; pode vir
  // nulo em lançamentos automáticos disparados por webhook, ex.: PIX pago).
  usuarioId?: number | null;
  usuarioNome?: string | null;
}

export interface LancamentoCaixaDTO {
  tipo: TipoMovimentoCaixa;
  origem: 'APORTE_SOCIO' | 'RETIRADA_SOCIO' | 'OUTRO'; // as demais origens são só automáticas
  valor: number;
  descricao?: string;
}

export const caixaService = {
  async listarExtrato(): Promise<MovimentoCaixa[]> {
    const response = await api.get('/caixa/extrato');
    return response.data;
  },

  async obterSaldo(): Promise<number> {
    const response = await api.get('/caixa/saldo');
    return response.data.saldo;
  },

  // Só pra Aporte de Sócio / Retirada de Sócio / Outro — vendas, fiado e
  // despesas pagas geram lançamento sozinhas, não passam por aqui.
  async registrarLancamentoManual(dados: LancamentoCaixaDTO): Promise<MovimentoCaixa> {
    const response = await api.post('/caixa/lancamento', dados);
    return response.data;
  },
};

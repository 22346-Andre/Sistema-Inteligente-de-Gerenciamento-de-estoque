import api from './api';

export interface Imposto {
  sigla: string;
  esfera: string;
  aliquota: number;
}

// Isso é o que a API DEVOLVE (GET /produtos, GET /produtos/:id) — reflete a
// entidade Produto do backend, cujo campo se chama "estoqueMinimo".
export interface Produto {
  id: number;
  nome: string;
  codigoBarras: string;
  categoria: string;
  precoCusto: number;
  precoVenda: number;
  quantidade: number;
  estoqueMinimo: number;
  fornecedorId: number;
  fornecedorNome?: string;
  classificacaoABC?: string;
  unidade?: string;

  ncm?: string;
  cfop?: string;
  finalidadeEstoque?: string;
  impostos?: Imposto[];
}


export interface ProdutoDTO {
  nome: string;
  codigoBarras: string;
  categoria: string;
  precoCusto: number;
  precoVenda: number;
  quantidadeMinima: number;
  fornecedorId: number;
  unidade?: string;

  ncm?: string;
  cfop?: string;
  finalidadeEstoque?: string;
  impostos?: Imposto[];
}

export interface LoteDTO {
  numeroLote?: string;
  quantidade: number;
  dataValidade?: string;
  novoPrecoCompra?: number;
  chaveNotaFiscal?: string;
  // true -> baixa direto do Caixa agora (compra à vista).
  // false/omitido -> cria uma Despesa PENDENTE (Contas a Pagar), que só
  // afeta o Caixa quando for marcada como paga.
  pagamentoImediato?: boolean;
  fornecedorId?: number;
  dataVencimento?: string;
  categoria?: string;
}

export type FormaPagamento = 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'PIX' | 'ESPECIE' | 'FIADO';

export interface SaidaDTO {
  quantidadeDesejada: number;
  tipo?: string;
  motivo?: string;
  chaveNotaFiscal?: string;
  formaPagamento?: FormaPagamento; // 🆕
}

export const produtoService = {
  async listarTodos(): Promise<Produto[]> {
    const response = await api.get('/produtos');
    return response.data;
  },

  async buscarPorId(id: number): Promise<Produto> {
    const response = await api.get(`/produtos/${id}`);
    return response.data;
  },

  async listarCriticos(): Promise<Produto[]> {
    const response = await api.get('/produtos/criticos');
    return response.data;
  },

  
  async listarPaginado(page: number, size: number, busca?: string, categoria?: string): Promise<{
    content: Produto[];
    totalPages: number;
    totalElements: number;
    number: number;
  }> {
    const response = await api.get('/produtos/paginado', {
      params: { page, size, busca: busca || undefined, categoria: categoria || undefined }
    });
    return response.data;
  },

  // 🟢 NOVO: categorias já cadastradas, pra popular o filtro
  async listarCategorias(): Promise<string[]> {
    const response = await api.get('/produtos/categorias');
    return response.data;
  },

  async buscarAvancada(params: {
    categoria?: string;
    precoMin?: number;
    precoMax?: number;
    dataInicio?: string;
  }): Promise<Produto[]> {
    const response = await api.get('/produtos/busca-avancada', { params });
    return response.data;
  },

  async criar(produto: ProdutoDTO): Promise<Produto> {
    const response = await api.post('/produtos', produto);
    return response.data;
  },

  async atualizar(id: number, produto: ProdutoDTO): Promise<Produto> {
    const response = await api.put(`/produtos/${id}`, produto);
    return response.data;
  },

  async deletar(id: number): Promise<void> {
    await api.delete(`/produtos/${id}`);
  },

  async adicionarLote(id: number, lote: LoteDTO): Promise<Produto> {
    const response = await api.post(`/produtos/${id}/lotes`, lote);
    return response.data;
  },

  async registrarSaida(id: number, saida: SaidaDTO): Promise<any> {
    const response = await api.post(`/produtos/${id}/saida`, saida);
    return response.data;
  }
};
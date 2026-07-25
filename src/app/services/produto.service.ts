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

  ncm?: string;
  cfop?: string;
  finalidadeEstoque?: string;
  impostos?: Imposto[];
}

// Isso é o que você ENVIA pra criar/editar (POST/PUT /produtos) — o
// ProdutoDTO do backend espera "quantidadeMinima" nesse payload (nomes
// diferentes de propósito: um é a entidade salva, o outro é o formulário de
// entrada). Ver ProdutoService.salvar()/atualizar() no backend.
export interface ProdutoDTO {
  nome: string;
  codigoBarras: string;
  categoria: string;
  precoCusto: number;
  precoVenda: number;
  quantidadeMinima: number;
  fornecedorId: number;

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
}

export interface SaidaDTO {
  quantidadeDesejada: number;
  tipo?: string;
  motivo?: string;
  chaveNotaFiscal?: string;
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

  
  async listarPaginado(page: number, size: number, busca?: string): Promise<{
    content: Produto[];
    totalPages: number;
    totalElements: number;
    number: number;
  }> {
    const response = await api.get('/produtos/paginado', { params: { page, size, busca: busca || undefined } });
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
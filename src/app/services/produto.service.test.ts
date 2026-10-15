import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import { produtoService } from './produto.service';

vi.mock('./api', () => ({
  default: { post: vi.fn() },
}));

describe('produtoService operações de estoque', () => {
  beforeEach(() => vi.clearAllMocks());

  it('registra entrada de estoque como lote', async () => {
    const lote = { quantidade: 24, novoPrecoCompra: 8.5 };
    const produto = { id: 12, quantidade: 40 };
    vi.mocked(api.post).mockResolvedValue({ data: produto } as never);

    await expect(produtoService.adicionarLote(12, lote)).resolves.toEqual(produto);

    expect(api.post).toHaveBeenCalledWith('/produtos/12/lotes', lote);
  });

  it('registra saída de estoque com os dados da operação', async () => {
    const saida = { quantidadeDesejada: 3, tipo: 'VENDA', formaPagamento: 'PIX' as const };
    const resultado = { quantidadeRestante: 7 };
    vi.mocked(api.post).mockResolvedValue({ data: resultado } as never);

    await expect(produtoService.registrarSaida(12, saida)).resolves.toEqual(resultado);

    expect(api.post).toHaveBeenCalledWith('/produtos/12/saida', saida);
  });
});
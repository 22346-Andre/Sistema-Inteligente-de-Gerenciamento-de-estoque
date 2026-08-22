import { useEffect, useState } from 'react';

// Curva ABC é classificação por VALOR — os três critérios do mesmo seletor
// (usado no Dashboard e em Produtos): Faturamento e Lucratividade olham pra
// vendas de um período; Capital Imobilizado ("Curva ABC de Estoque") olha
// pro estoque parado agora (quantidade × custo), sem depender de período.
// Giro de Estoque é um indicador diferente (velocidade, não valor) e tem
// tipo/estado próprio (TipoCurva em produtos.tsx) — não faz parte deste hook.
export type CriterioAbc = 'faturamento' | 'lucratividade' | 'capital-imobilizado';

const CHAVE_LOCALSTORAGE = 'smartstock:criterioAbc';

const EH_CRITERIO_VALIDO = (valor: string | null): valor is CriterioAbc =>
  valor === 'faturamento' || valor === 'lucratividade' || valor === 'capital-imobilizado';

export function useCriterioAbc(): [CriterioAbc, (novo: CriterioAbc) => void] {
  const [criterio, setCriterioState] = useState<CriterioAbc>(() => {
    const salvo = localStorage.getItem(CHAVE_LOCALSTORAGE);
    return EH_CRITERIO_VALIDO(salvo) ? salvo : 'faturamento';
  });

  const setCriterio = (novo: CriterioAbc) => {
    localStorage.setItem(CHAVE_LOCALSTORAGE, novo);
    setCriterioState(novo);
  };

  // Se o usuário trocar o critério numa aba/tela e voltar pra essa depois,
  // sincroniza também (cobre o caso de duas abas abertas ao mesmo tempo).
  useEffect(() => {
    const aoMudarStorage = (e: StorageEvent) => {
      if (e.key === CHAVE_LOCALSTORAGE && EH_CRITERIO_VALIDO(e.newValue)) {
        setCriterioState(e.newValue);
      }
    };
    window.addEventListener('storage', aoMudarStorage);
    return () => window.removeEventListener('storage', aoMudarStorage);
  }, []);

  return [criterio, setCriterio];
}

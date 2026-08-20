import { useEffect, useState } from 'react';

// Curva ABC é classificação por VALOR — o seletor principal (usado no
// Dashboard e em Produtos pra trocar QUAL classificação cada produto
// carrega) fica só com Faturamento e Lucratividade, que são os dois
// critérios calculados sobre um período de vendas. Capital Imobilizado
// ("Curva ABC de Estoque") é conceitualmente diferente — não depende de
// período, reflete o estoque parado agora — por isso não entra nesse
// seletor compartilhado; tem card próprio e fixo no Dashboard.
export type CriterioAbc = 'faturamento' | 'lucratividade';

const CHAVE_LOCALSTORAGE = 'smartstock:criterioAbc';


export function useCriterioAbc(): [CriterioAbc, (novo: CriterioAbc) => void] {
  const [criterio, setCriterioState] = useState<CriterioAbc>(() => {
    const salvo = localStorage.getItem(CHAVE_LOCALSTORAGE);
    return (salvo === 'faturamento' || salvo === 'lucratividade') ? salvo : 'faturamento';
  });

  const setCriterio = (novo: CriterioAbc) => {
    localStorage.setItem(CHAVE_LOCALSTORAGE, novo);
    setCriterioState(novo);
  };

  // Se o usuário trocar o critério numa aba/tela e voltar pra essa depois,
  // sincroniza também (cobre o caso de duas abas abertas ao mesmo tempo).
  useEffect(() => {
    const aoMudarStorage = (e: StorageEvent) => {
      if (e.key === CHAVE_LOCALSTORAGE && e.newValue) {
        const valor = e.newValue as CriterioAbc;
        if (valor === 'faturamento' || valor === 'lucratividade') {
          setCriterioState(valor);
        }
      }
    };
    window.addEventListener('storage', aoMudarStorage);
    return () => window.removeEventListener('storage', aoMudarStorage);
  }, []);

  return [criterio, setCriterio];
}

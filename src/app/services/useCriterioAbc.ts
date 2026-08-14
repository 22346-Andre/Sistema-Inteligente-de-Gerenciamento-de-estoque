import { useEffect, useState } from 'react';

// Curva ABC é classificação por VALOR — só Faturamento e Lucratividade cabem
// aqui. Giro de estoque virou relatório próprio (ver GiroEstoqueService no
// backend e a tela de Giro de Estoque no frontend).
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

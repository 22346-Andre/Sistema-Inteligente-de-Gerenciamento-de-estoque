import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL precisa estar configurada para iniciar a aplicação.');
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Utilitário único — reaproveite em todas as páginas em vez de reimplementar
export function extrairMensagemErro(error: any, fallback = 'Erro ao processar requisição.'): string {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data; // ex: alterarSenha
  if (data && typeof data === 'object') {
    if (data.detalhes && typeof data.detalhes === 'object') {
      const msgs = Object.values(data.detalhes).filter(Boolean);
      if (msgs.length) return msgs.join(' | ');
    }
    if (typeof data.erro === 'string' && data.erro) return data.erro;     // formato padrão do TratadorDeErros
    if (typeof data.message === 'string' && data.message) return data.message; // MovimentacaoController
  }
  if (error?.message === 'Network Error') {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
  }
  return fallback;
}

api.interceptors.request.use((config) => {
  config.headers.delete('Authorization');

  const method = config.method?.toLowerCase();
  if (method && !['get', 'head', 'options'].includes(method)) {
    return api.get<string>('/auth/csrf').then(({ data: csrfToken }) => {
      if (typeof csrfToken !== 'string' || !csrfToken.trim()) {
        throw new Error('O servidor não retornou um token CSRF válido.');
      }

      config.headers.set('X-XSRF-TOKEN', csrfToken.trim());
      return config;
    });
  }

  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    // Checagem de sessão: 401 aqui só significa "ainda não logou", não "sessão expirada"
    if (url.includes('/usuarios/me') && error.response?.status === 401) {
      return Promise.reject(error);
    }

    const isRotaRestrita = url.includes('/estatisticas') || url.includes('/usuarios');
    const isAcessoNegado = error.response && (error.response.status === 400 || error.response.status === 403);
    if (isRotaRestrita && isAcessoNegado) return Promise.reject(error);

    
    const isFormularioComTratamentoProprio =
      url.includes('/auth/registrar-empresa') ||
      url.includes('/auth/login') ||
      url.includes('/auth/confirmar-cadastro') ||
      url.includes('/auth/reenviar-codigo-cadastro');
    if (isFormularioComTratamentoProprio) return Promise.reject(error);

    if (error.response) {
      switch (error.response.status) {
        case 401:
          if (window.location.pathname !== '/login') {
            toast.error('Sessão expirada. Faça login novamente.');
            window.location.href = '/login';
          }
          break;
        case 403:
          toast.error('Você não tem permissão para realizar esta ação.');
          break;
        case 404:
          toast.error('Recurso não encontrado.');
          break;
        case 409: //  estoque insuficiente / violação de integridade
          toast.error(extrairMensagemErro(error, 'Conflito ao processar a requisição.'));
          break;
        case 400: // validação / regra de negócio
          toast.error(extrairMensagemErro(error, 'Dados inválidos.'));
          break;
        case 500:
          toast.error('Erro no servidor. Tente novamente mais tarde.');
          break;
        default:
          toast.error(extrairMensagemErro(error));
      }
    } else if (error.request) {
      toast.error('Não foi possível conectar ao servidor. Verifique sua conexão.');
    }
    return Promise.reject(error);
  }
);

export default api;
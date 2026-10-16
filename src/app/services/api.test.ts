import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import { authService } from './auth.service';

describe('API autenticação por cookie', () => {
  const originalAdapter = api.defaults.adapter;
  const requests: InternalAxiosRequestConfig[] = [];

  beforeEach(() => {
    requests.length = 0;
    localStorage.clear();
    localStorage.setItem('token', 'jwt-legado-expirado');
    api.defaults.headers.common.Authorization = 'Bearer jwt-legado-expirado';

    const adapter: AxiosAdapter = async (config) => {
      requests.push(config);
      return {
        data: config.url === '/auth/csrf'
          ? 'csrf-token-de-teste'
          : { accessToken: 'jwt-retornado-que-deve-ser-ignorado', expiresIn: 3600 },
        status: config.url === '/auth/logout' ? 204 : 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };
    api.defaults.adapter = vi.fn(adapter);
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    delete api.defaults.headers.common.Authorization;
    localStorage.clear();
  });

  it.each([
    ['login normal', () => authService.login({ email: 'ana@example.com', senha: 'senha' }), '/auth/login'],
    ['login Google', () => authService.loginComGoogle('google-id-token'), '/auth/login/google'],
    ['requisição protegida', () => api.post('/produtos', {}), '/produtos'],
    ['logout', () => authService.logout(), '/auth/logout'],
  ])('%s busca CSRF, envia o header e nunca envia o bearer legado', async (_name, action, endpoint) => {
    const result = await action();

    if (endpoint !== '/produtos') expect(result).toBeUndefined();
    expect(requests.map(({ url }) => url)).toEqual(['/auth/csrf', endpoint]);
    expect(requests.every(({ withCredentials }) => withCredentials)).toBe(true);
    expect(requests.every(({ headers }) => headers.get('Authorization') === undefined)).toBe(true);
    expect(requests[0].headers.get('X-XSRF-TOKEN')).toBeUndefined();
    expect(requests[1].headers.get('X-XSRF-TOKEN')).toBe('csrf-token-de-teste');
  });
});

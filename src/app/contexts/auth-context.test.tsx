import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './auth-context';
import { authService } from '../services/auth.service';

vi.mock('../services/auth.service', () => ({
  authService: {
    login: vi.fn(),
    loginComGoogle: vi.fn(),
    registrarEmpresa: vi.fn(),
    confirmarCadastro: vi.fn(),
    reenviarCodigoCadastro: vi.fn(),
    getMe: vi.fn(),
  },
}));

const wrapper = ({ children }: PropsWithChildren) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('limpa uma sessão corrompida e encerra o carregamento', async () => {
    localStorage.setItem('token', 'jwt-corrompido');
    localStorage.setItem('user', '{json inválido');

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('persiste e disponibiliza o usuário após login', async () => {
    vi.mocked(authService.login).mockResolvedValue({ accessToken: 'jwt-valido', expiresIn: 3600 });
    vi.mocked(authService.getMe).mockResolvedValue({
      id: 12,
      nome: 'Ana',
      email: 'ana@example.com',
      empresa: { nomeFantasia: 'Mercado Central' },
      perfil: 'ADMIN',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => result.current.login('ana@example.com', 'senha-segura'));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toMatchObject({
      id: '12',
      nome: 'Ana',
      email: 'ana@example.com',
      nomeFantasia: 'Mercado Central',
      role: 'ADMIN',
    });
    expect(localStorage.getItem('token')).toBe('jwt-valido');
  });

  it('habilita sessão autenticada pelo cookie mesmo sem token em localStorage', async () => {
    vi.mocked(authService.getMe).mockResolvedValue({
      id: 21,
      nome: 'Bruno',
      email: 'bruno@example.com',
      empresa: { nomeFantasia: 'Loja do Bruno' },
      perfil: 'USER',
    });

    document.cookie = 'access_token=jwt-cookie; path=/';

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user).toMatchObject({
      id: '21',
      nome: 'Bruno',
      email: 'bruno@example.com',
      nomeFantasia: 'Loja do Bruno',
      role: 'USER',
    });

    document.cookie = 'access_token=; Max-Age=0; path=/';
  });
});
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
    logout: vi.fn(),
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
    vi.mocked(authService.getMe).mockRejectedValue(new Error('Sem sessão'));
    vi.mocked(authService.logout).mockResolvedValue();
  });

  it('remove a autenticação legada e encerra o carregamento sem sessão', async () => {
    localStorage.setItem('token', 'jwt-legado');
    localStorage.setItem('user', JSON.stringify({ id: '12' }));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(authService.getMe).toHaveBeenCalledOnce();
  });

  it('disponibiliza o usuário após login sem persistir o JWT retornado pelo backend', async () => {
    vi.mocked(authService.login).mockResolvedValue();
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
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('recupera a sessão do cookie HttpOnly pelo endpoint de perfil após recarregar', async () => {
    localStorage.setItem('token', 'jwt-legado');
    localStorage.setItem('user', JSON.stringify({
      id: 'antigo',
      nome: 'Usuário antigo',
      email: 'antigo@example.com',
      nomeFantasia: 'Empresa antiga',
    }));

    vi.mocked(authService.getMe).mockResolvedValue({
      id: 21,
      nome: 'Bruno',
      email: 'bruno@example.com',
      empresa: { nomeFantasia: 'Loja do Bruno' },
      perfil: 'USER',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user).toMatchObject({
      id: '21',
      nome: 'Bruno',
      email: 'bruno@example.com',
      nomeFantasia: 'Loja do Bruno',
      role: 'USER',
    });
    expect(authService.getMe).toHaveBeenCalledOnce();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('revoga a sessão no backend e limpa o estado local ao sair', async () => {
    vi.mocked(authService.getMe).mockResolvedValue({
      id: 21,
      nome: 'Bruno',
      email: 'bruno@example.com',
      empresa: { nomeFantasia: 'Loja do Bruno' },
      perfil: 'USER',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => result.current.logout());

    expect(authService.logout).toHaveBeenCalledOnce();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AuthProvider } from '../contexts/auth-context';
import { authService } from '../services/auth.service';
import { ProtectedRoute } from './ProtectedRoute';

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

function renderProtectedRoute() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/privado']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/privado" element={<p>Conteúdo privado</p>} />
          </Route>
          <Route path="/login" element={<p>Tela de login</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(authService.getMe).mockRejectedValue(new Error('Sem sessão'));
  });

  it('redireciona para login sem sessão', async () => {
    renderProtectedRoute();

    expect(await screen.findByText('Tela de login')).toBeTruthy();
    expect(screen.queryByText('Conteúdo privado')).toBeNull();
  });

  it('permite acesso com sessão válida', async () => {
    vi.mocked(authService.getMe).mockResolvedValue({
      id: 12,
      nome: 'Ana',
      email: 'ana@example.com',
      empresa: { nomeFantasia: 'Mercado Central' },
      perfil: 'ADMIN',
    });

    renderProtectedRoute();

    expect(await screen.findByText('Conteúdo privado')).toBeTruthy();
    expect(authService.getMe).toHaveBeenCalledOnce();
  });
});
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AuthProvider } from '../contexts/auth-context';
import { ProtectedRoute } from './ProtectedRoute';

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
  beforeEach(() => localStorage.clear());

  it('redireciona para login sem sessão', async () => {
    renderProtectedRoute();

    expect(await screen.findByText('Tela de login')).toBeTruthy();
    expect(screen.queryByText('Conteúdo privado')).toBeNull();
  });

  it('permite acesso com sessão válida', async () => {
    localStorage.setItem('token', 'jwt-valido');
    localStorage.setItem('user', JSON.stringify({
      id: '12',
      nome: 'Ana',
      email: 'ana@example.com',
      nomeFantasia: 'Mercado Central',
      role: 'ADMIN',
    }));

    renderProtectedRoute();

    expect(await screen.findByText('Conteúdo privado')).toBeTruthy();
  });
});
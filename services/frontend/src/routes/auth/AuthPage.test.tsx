import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthPage } from './AuthPage';
import { signIn, signUp } from './auth-api';

vi.mock('wouter', () => ({
  useLocation: () => ['/auth', vi.fn()],
}));

vi.mock('./auth-hooks', () => ({
  useAuthSession: () => ({
    session: null,
    isPending: false,
  }),
}));

vi.mock('./auth-api', () => ({
  signIn: { email: vi.fn().mockResolvedValue({}) },
  signUp: { email: vi.fn().mockResolvedValue({}) },
}));

describe('AuthPage', () => {
  beforeEach(() => {
    vi.mocked(signIn.email).mockResolvedValue({} as never);
    vi.mocked(signUp.email).mockResolvedValue({} as never);
  });

  it('submits the sign in flow', async () => {
    render(<AuthPage />);

    const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement | null;
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement | null;

    if (!emailInput || !passwordInput) {
      throw new Error('Expected auth inputs to render');
    }

    fireEvent.change(emailInput, { target: { value: 'ada@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(signIn.email).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'password123',
    });
  });
});
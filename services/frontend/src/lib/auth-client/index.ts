import { createAuthClient } from 'better-auth/react';

const normalizeBaseUrl = (value: string) => value.replace(/\/$/, '');

const getAuthBaseUrl = () => {
  const explicitAuthUrl = import.meta.env.VITE_AUTH_BASE_URL;

  if (explicitAuthUrl) {
    return normalizeBaseUrl(explicitAuthUrl);
  }

  const apiUrl = import.meta.env.VITE_API_URL;

  if (apiUrl) {
    return `${normalizeBaseUrl(apiUrl)}/api/auth`;
  }

  if (typeof window !== 'undefined') {
    return `${normalizeBaseUrl(window.location.origin)}/api/auth`;
  }

  return 'http://localhost:5173/api/auth';
};

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  fetchOptions: {
    credentials: 'include',
  },
});

export const { signIn, signUp, signOut, useSession } = authClient;
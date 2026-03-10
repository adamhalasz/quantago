import { createAuthClient } from 'better-auth/react';

const normalizeBaseUrl = (value: string) => value.replace(/\/$/, '');

export const getApiBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (apiUrl) {
    return normalizeBaseUrl(apiUrl);
  }

  if (typeof window !== 'undefined') {
    return normalizeBaseUrl(window.location.origin);
  }

  return 'http://localhost:8787';
};

const getAuthBaseUrl = () => {
  const explicitAuthUrl = import.meta.env.VITE_AUTH_BASE_URL;

  if (explicitAuthUrl) {
    return normalizeBaseUrl(explicitAuthUrl);
  }

  return `${getApiBaseUrl()}/api/auth`;
};

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  fetchOptions: {
    credentials: 'include',
  },
});

export const { useSession, signIn, signOut } = authClient;

// JWT Token 관리 서비스

const TOKEN_KEY = 'zerosum_token';

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

// URL에서 토큰 추출 (OAuth 콜백 후)
export const extractTokenFromUrl = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  if (token) {
    // URL에서 토큰 파라미터 제거
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    window.history.replaceState({}, '', url.pathname + url.search);
  }
  return token;
};

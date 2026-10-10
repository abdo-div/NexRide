const TOKEN_KEY = "nexride.jwt";

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage unavailable (private mode / quota); the session still works for
    // the lifetime of the current tab because the token stays in memory.
  }
};

export const clearToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to do - the in-memory copy is dropped by the auth provider.
  }
};

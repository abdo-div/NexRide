import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isUnauthorized } from "../lib/apiClient";
import { authApi } from "../lib/authApi";
import { clearToken, getToken, setToken } from "../lib/tokenStorage";
import type { AuthUser, SignInInput, SignUpInput } from "../types/auth";
import { AuthContext, type AuthContextValue } from "./auth-context";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Seeded from storage so a visitor with no token never triggers a render pass.
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitialising, setIsInitialising] = useState(() => Boolean(getToken()));

  // Restore the session on boot: a stored token is only trusted once /users/me
  // confirms it is still valid (the API invalidates it after a password change).
  useEffect(() => {
    if (!getToken()) return;

    let cancelled = false;

    authApi
      .me()
      .then(({ data }) => {
        if (!cancelled) setUser(data.user);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (isUnauthorized(error) || (error as { status?: number })?.status === 0) {
          clearToken();
        }
      })
      .finally(() => {
        if (!cancelled) setIsInitialising(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async ({ identifier, password }: SignInInput) => {
    const { token, data } = await authApi.signIn({ identifier, password });
    setToken(token);
    setUser(data.user);
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const { token, data } = await authApi.signUp(input);
    setToken(token);
    setUser(data.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.signOut();
    } catch {
      // The local session is cleared regardless of the network outcome.
    } finally {
      clearToken();
      setUser(null);
    }
  }, []);

  const adoptSession = useCallback((token: string, nextUser: AuthUser) => {
    setToken(token);
    setUser(nextUser);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitialising,
      isAuthenticated: Boolean(user),
      signIn,
      signUp,
      signOut,
      adoptSession,
    }),
    [user, isInitialising, signIn, signUp, signOut, adoptSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;

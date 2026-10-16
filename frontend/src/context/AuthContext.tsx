import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isUnauthorized } from "../lib/apiClient";
import { authApi } from "../lib/authApi";
import type { AuthUser, GoogleSignInInput, SignInInput, SignUpInput } from "../types/auth";
import { AuthContext, type AuthContextValue } from "./auth-context";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitialising, setIsInitialising] = useState(true);

  // The JWT is intentionally inaccessible to JavaScript. Restore the session
  // by asking the API to validate the browser's HTTP-only cookie.
  useEffect(() => {
    // One-time migration cleanup for sessions created by older frontend builds.
    // New builds never write authentication material to Web Storage.
    try {
      localStorage.removeItem("nexride.jwt");
    } catch {
      // Storage can be unavailable in hardened/private browser contexts.
    }

    let cancelled = false;

    authApi
      .me()
      .then(({ data }) => {
        if (!cancelled) setUser(data.user);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (!isUnauthorized(error) && (error as { status?: number })?.status !== 0) {
          console.error("Unable to restore the authenticated session", error);
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
    const { data } = await authApi.signIn({ identifier, password });
    setUser(data.user);
    return data.user;
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const { data } = await authApi.signUp(input);
    setUser(data.user);
  }, []);

  const googleSignIn = useCallback(async (input: GoogleSignInInput) => {
    const { data } = await authApi.googleSignIn(input);
    setUser(data.user);
    return data.user;
  }, []);

  const signOut = useCallback(async () => {
    await authApi.signOut();
    setUser(null);
  }, []);

  const adoptSession = useCallback((nextUser: AuthUser) => {
    setUser(nextUser);
  }, []);

  const updateUser = useCallback((nextUser: AuthUser) => {
    setUser(nextUser);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitialising,
      isAuthenticated: Boolean(user),
      signIn,
      googleSignIn,
      signUp,
      signOut,
      adoptSession,
      updateUser,
    }),
    [user, isInitialising, signIn, googleSignIn, signUp, signOut, adoptSession, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;

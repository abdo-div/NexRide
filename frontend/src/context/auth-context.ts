import { createContext } from "react";
import type { AuthUser, SignInInput, SignUpInput } from "../types/auth";

export interface AuthContextValue {
  user: AuthUser | null;
  /** True while the stored token is being exchanged for a session on boot. */
  isInitialising: boolean;
  isAuthenticated: boolean;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** Adopts a token + user pair issued outside sign-in/sign-up (password reset). */
  adoptSession: (token: string, user: AuthUser) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

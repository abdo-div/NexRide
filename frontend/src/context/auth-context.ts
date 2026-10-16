import { createContext } from "react";
import type { AuthUser, GoogleSignInInput, SignInInput, SignUpInput } from "../types/auth";

export interface AuthContextValue {
  user: AuthUser | null;
  /** True while the HTTP-only cookie is being verified on boot. */
  isInitialising: boolean;
  isAuthenticated: boolean;
  signIn: (input: SignInInput) => Promise<AuthUser>;
  googleSignIn: (input: GoogleSignInInput) => Promise<AuthUser>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** Adopts a cookie-backed session issued outside sign-in/sign-up. */
  adoptSession: (user: AuthUser) => void;
  /** Replaces the cached account after an authenticated profile mutation. */
  updateUser: (user: AuthUser) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

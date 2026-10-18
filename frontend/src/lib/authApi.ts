import { request } from "./apiClient";
import type {
  AuthUser,
  ForgotPasswordInput,
  GoogleSignInInput,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
} from "../types/auth";

interface SessionResponse {
  status: string;
  data: { user: AuthUser };
}

interface MeResponse {
  status: string;
  data: { user: AuthUser };
}

export const authApi = {
  signIn: ({ identifier, password }: SignInInput) =>
    request<SessionResponse>("/users/login", {
      method: "POST",
      body: { identifier, password },
    }),

  signUp: (input: SignUpInput) =>
    request<SessionResponse>("/users/signup", {
      method: "POST",
      body: input,
    }),

  googleSignIn: ({ idToken }: GoogleSignInInput) =>
    request<SessionResponse>("/auth/google", {
      method: "POST",
      body: { idToken },
    }),

  signOut: () =>
    request<{ status: string }>("/users/logout", { method: "POST" }),

  requestPasswordReset: ({ identifier }: ForgotPasswordInput) =>
    request<{ status: string; message: string }>("/users/forgot-password", {
      method: "POST",
      body: { identifier },
    }),

  resetPassword: ({ token, password, passwordConfirm }: ResetPasswordInput) =>
    request<SessionResponse>(`/users/reset-password/${encodeURIComponent(token)}`, {
      method: "PATCH",
      body: { password, passwordConfirm },
    }),

  me: () => request<MeResponse>("/users/me"),

  updateProfile: (profile: FormData) =>
    request<MeResponse>("/users/update-me", {
      method: "PATCH",
      body: profile,
    }),

  updatePassword: (input: {
    passwordCurrent: string;
    password: string;
    passwordConfirm: string;
  }) =>
    request<SessionResponse>("/users/update-my-password", {
      method: "PATCH",
      body: input,
    }),
};

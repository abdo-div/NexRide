import { request } from "./apiClient";
import type {
  AuthUser,
  ForgotPasswordInput,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
} from "../types/auth";

interface SessionResponse {
  status: string;
  token: string;
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
      auth: false,
      body: { identifier, password },
    }),

  signUp: (input: SignUpInput) =>
    request<SessionResponse>("/users/signup", {
      method: "POST",
      auth: false,
      body: input,
    }),

  signOut: () =>
    request<{ status: string }>("/users/logout", { method: "POST" }),

  requestPasswordReset: ({ identifier }: ForgotPasswordInput) =>
    request<{ status: string; message: string }>("/users/forgot-password", {
      method: "POST",
      auth: false,
      body: { identifier },
    }),

  resetPassword: ({ token, password, passwordConfirm }: ResetPasswordInput) =>
    request<SessionResponse>(`/users/reset-password/${encodeURIComponent(token)}`, {
      method: "PATCH",
      auth: false,
      body: { password, passwordConfirm },
    }),

  me: () => request<MeResponse>("/users/me"),
};

export type UserRole = "customer" | "company" | "admin";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  photo: string;
  role: UserRole;
  company: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface SignUpInput {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
  passwordConfirm: string;
  role: Extract<UserRole, "customer" | "company">;
}

export interface SignInInput {
  identifier: string;
  password: string;
}

export interface ForgotPasswordInput {
  identifier: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
  passwordConfirm: string;
}
